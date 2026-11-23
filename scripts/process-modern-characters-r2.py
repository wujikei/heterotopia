from pathlib import Path
from PIL import Image,ImageDraw,ImageFilter
import cv2,numpy as np,json
ROOT=Path(__file__).resolve().parents[1]
R=ROOT/'resources/art-src/modern-characters-r2'
STATES=['neutral','thoughtful','warm','puzzled','alert','startled']
EYES={'base':[(328,183),(378,176)],'thoughtful':[(297.5,475.5),(422,451)],'warm':[(290,421),(414.5,399.5)],'puzzled':[(292,415),(418,396)],'alert':[(323,414),(454.5,390.5)],'startled':[(294.5,418.5),(423,399)]}

def matte(rgb, gap_limit=None):
    b=np.median(np.concatenate([rgb[:12].reshape(-1,3),rgb[-12:].reshape(-1,3)]),axis=0)
    near=(np.max(abs(rgb.astype(float)-b),axis=2)<36).astype('uint8')
    if gap_limit is not None:
        yy,xx=np.indices(near.shape)
        cavity=(rgb.min(axis=2)>170)&((rgb.max(axis=2).astype(int)-rgb.min(axis=2))<32)&(xx<gap_limit)&(yy<rgb.shape[0]*.31)
        near[cavity]=1
    n,labels,stats,cent=cv2.connectedComponentsWithStats(near,8)
    outer=set(np.unique(np.r_[labels[0],labels[-1],labels[:,0],labels[:,-1]]));outer.discard(0)
    outer.update(i for i in range(1,n) if stats[i,cv2.CC_STAT_AREA]>16 and stats[i,cv2.CC_STAT_TOP]+stats[i,cv2.CC_STAT_HEIGHT]<rgb.shape[0]*(.8 if rgb.shape[0]==rgb.shape[1] else .31))
    mask=(~np.isin(labels,list(outer))).astype('uint8')
    kernel=np.ones((3,3),np.uint8)
    mask=cv2.erode(mask,kernel,iterations=1)
    # One character is one connected foreground; remove detached matting flecks.
    n,components,stats,_=cv2.connectedComponentsWithStats(mask,8)
    if n>1: mask=(components==(1+np.argmax(stats[1:,cv2.CC_STAT_AREA]))).astype('uint8')
    sure=cv2.erode(mask,kernel,iterations=4)
    _,indices=cv2.distanceTransformWithLabels(1-sure,cv2.DIST_L2,5,labelType=cv2.DIST_LABEL_PIXEL)
    fg=rgb[sure.astype(bool)].astype(float)
    nearest=fg[np.maximum(0,indices-1)]
    a=mask.astype(float)
    band=(cv2.dilate(mask,kernel,iterations=2)-sure)>0
    delta=nearest-b;pixel=rgb.astype(float)-b
    projection=np.sum(pixel*delta,axis=2)/np.maximum(1,np.sum(delta*delta,axis=2))
    a[band]=np.clip(projection[band],0,1)
    a[a<.025]=0
    color=(rgb.astype(float)-(1-a[...,None])*b)/np.maximum(.025,a[...,None])
    color[band]=nearest[band]
    color[a==0]=0
    return np.dstack([np.uint8(np.clip(color,0,255)),np.uint8(a*255)])

def rigid_eyes(source,target):
    a=np.array(source,float);b=np.array(target,float)
    v=a[1]-a[0];w=b[1]-b[0]
    scale=np.linalg.norm(w)/np.linalg.norm(v)
    theta=np.arctan2(w[1],w[0])-np.arctan2(v[1],v[0])
    rot=scale*np.array([[np.cos(theta),-np.sin(theta)],[np.sin(theta),np.cos(theta)]])
    shift=b[0]-rot@a[0]
    return np.column_stack([rot,shift])

def run_character(key, states, eyes, eye_shape, mouth, skin, crop):
    base=np.array(Image.open(R/f'generated/{key}-base.jpg').convert('RGB'));h,w=base.shape[:2]
    rgba=matte(base, eyes['base'][0][0]-20)
    base=rgba[:,:,:3].copy()
    Image.fromarray(rgba).save(R/f'source-layers/{key}-body-base.png')
    mask=Image.new('L',(w,h));d=ImageDraw.Draw(mask)
    # Anatomical face contour, neck/hair/body stay the common identity plate.
    # Whole-face replacement was rejected: aligned eyes do not align the generated jaw silhouette.
    # Keep the identity contour and use two feathered anatomical expression areas.
    d.polygon(eye_shape,fill=255)
    d.ellipse(mouth,fill=255)
    mask=np.array(mask.filter(ImageFilter.GaussianBlur(2)))
    mask[rgba[:,:,3]<255]=0
    Image.fromarray(mask).save(R/f'source-layers/{key}-expression-mask.png')
    metrics={}
    for state in states:
        final=base.copy()
        if state!='neutral':
            source=np.array(Image.open(R/f'generated/{key}-{state}.jpg').convert('RGB'))
            m=rigid_eyes(eyes[state],eyes['base'])
            source_rgba=matte(source)
            warped_alpha=cv2.warpAffine(source_rgba[:,:,3],m,(w,h),flags=cv2.INTER_LANCZOS4)
            source_color=cv2.warpAffine(source_rgba[:,:,:3],m,(w,h),flags=cv2.INTER_LANCZOS4)
            adjustment=np.median(base[skin[1]:skin[3],skin[0]:skin[2]].reshape(-1,3),axis=0)-np.median(source_color[skin[1]:skin[3],skin[0]:skin[2]].reshape(-1,3),axis=0)
            source_color=np.uint8(np.clip(source_color.astype(float)+adjustment,0,255))
            interior=cv2.distanceTransform((warped_alpha>250).astype('uint8'),cv2.DIST_L2,5)
            base_interior=cv2.distanceTransform((rgba[:,:,3]>250).astype('uint8'),cv2.DIST_L2,5)
            a=mask.astype(float)/255*np.clip((interior-1)/3,0,1)*np.clip((base_interior-2)/3,0,1)
            layer=np.dstack([source_color,np.uint8(a*255)]);layer[layer[:,:,3]==0,:3]=0
            Image.fromarray(layer).save(R/f'source-layers/{key}-{state}-expression.png')
            final=np.array(Image.alpha_composite(Image.fromarray(rgba),Image.fromarray(layer)))[:,:,:3]
            metrics[state]={'source':f'generated/{key}-{state}.jpg','eyeAnchors':eyes[state],'matrix':m.tolist(),'changedPixels':int(np.any(final!=base,axis=2).sum())}
        final=np.dstack([final,rgba[:,:,3]])
        # The common, decontaminated outer edge is used in every state.
        edge=rgba[:,:,3]<250;final[edge,:3]=rgba[edge,:3]
        Image.fromarray(final).save(R/f'runtime/portrait-{key}-r2-{state}.png')
    (R/f'qa/{key}-registration.json').write_text(json.dumps(metrics,indent=2))
run_character('linyue',STATES,EYES,[(304,159),(321,140),(375,130),(422,144),(435,176),(417,201),(367,207),(326,209),(305,192)],(331,216,402,269),(383,209,407,222),(240,75,485,320))
run_character('roommate',['neutral','focused','warm','puzzled','concerned','startled'],{'base':[(300,199),(347.5,190.5)],'focused':[(255,480),(373,445)],'warm':[(252,478),(361,446)],'puzzled':[(279,447),(398,412)],'concerned':[(283,455),(402,417)],'startled':[(286,433),(400,401)]},[(285,178),(300,162),(355,145),(391,164),(405,191),(384,216),(340,224),(302,223),(290,205)],(308,237,381,290),(369,223,387,238),(250,80,495,325))

# Transparent delivery exports. The original project sprites remain intact.
manifest_path=ROOT/'src/data/art-manifest.json'
manifest=json.loads(manifest_path.read_text())
state_names={'neutral':'default','thoughtful':'thoughtful','warm':'smile','puzzled':'puzzled','alert':'alert','focused':'focused','concerned':'concerned','startled':'surprised'}
records=[]
for key,states in {'linyue':STATES,'roommate':['neutral','focused','warm','puzzled','concerned','startled']}.items():
 for state in states:
  expression=state_names[state]
  name=f'portrait-{key}-modern'+(f'-{expression}' if expression!='default' else '')
  path=R/f'runtime/portrait-{key}-r2-{state}.png';im=Image.open(path)
  for suffix,image in [('',im),('-m',im.resize((576,768),Image.Resampling.LANCZOS))]:
   image.save(ROOT/f'public/art/{name}{suffix}.webp','WEBP',lossless=True,exact=True,method=6)
   image.save(ROOT/f'public/art/{name}{suffix}.avif','AVIF',quality=75,speed=6,max_threads=2)
   manifest['avif']=sorted(set(manifest['avif'])|{name+suffix})
  manifest['masters'][name]=path.relative_to(ROOT).as_posix()
  manifest['mobile']=sorted(set(manifest['mobile'])|{name})
  records.append({'character':key,'state':state,'expression':expression,'asset':name,'master':path.relative_to(ROOT).as_posix(),'eyeAnchors':(EYES['base'] if key=='linyue' else [(300,199),(347.5,190.5)])})
 # The character-library thumbnail keeps the existing face-name contract.
 if key=='roommate':
  im=Image.open(R/'runtime/portrait-roommate-r2-neutral.png').crop((250,75,495,320)).resize((256,256),Image.Resampling.LANCZOS)
  im.save(ROOT/'public/art/portrait-roommate-face.webp','WEBP',lossless=True,exact=True,method=6)
  im.save(ROOT/'public/art/portrait-roommate-face.avif','AVIF',quality=75,speed=6,max_threads=2)
  manifest['avif']=sorted(set(manifest['avif'])|{'portrait-roommate-face'})
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(ROOT/'docs/art/modern-characters-r2-exports.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
print('Exported 2 shared transparent bodies, 10 irregular expression layers, 12 runtime states; neutral states use their bodies.')
