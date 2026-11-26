"""Curated crops from the user's contact pairs; never modify the supplied originals."""
import argparse,hashlib,json
from pathlib import Path
from PIL import Image, ImageOps, ImageEnhance
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'resources/art-src/shenci-r2'; OUT.mkdir(exist_ok=True)
RECIPE={
 'shenci-reeds-dawn':(13,'upper',.51,1.02), 'shenci-valley-dawn':(13,'lower',.50,1.0),
 'shenci-underwater-eaves':(3,'lower',.54,1.08), 'shenci-sky-opening':(4,'upper',.50,1.00),
 'shenci-sky-golden':(4,'lower',.51,1.03),
 'shenci-night-mooring':(7,'full',.50,1.07),
 'shenci-ritual-steps':(9,'full',.52,1.04), 'shenci-curtain-altar':(10,'full',.52,1.06),
 'shenci-wuyang-departure':(11,'upper',.51,1.04), 'shenci-wuyang-procession':(11,'lower',.51,1.04),
 'shenci-displaced-road':(12,'full',.51,1.00),
}
def main():
 p=argparse.ArgumentParser();p.add_argument('refs',type=Path);args=p.parse_args(); refs=sorted(f for f in args.refs.glob('01a21873*') if f.suffix.lower() in ('.png','.jpg'));assert len(refs)==13
 manifest_path=ROOT/'src/data/art-manifest.json';manifest=json.loads(manifest_path.read_text(encoding='utf-8')); records={}
 for key,(i,mode,center,gain) in RECIPE.items():
  f=refs[i-1];im=ImageOps.exif_transpose(Image.open(f)).convert('RGB');w,h=im.size
  # Remove the scanline at the seam. Never show a stacked sheet as one scene.
  if mode=='upper': im=im.crop((0,0,w,h//2-3))
  elif mode=='lower': im=im.crop((0,h//2+3,w,h))
  # Wide artwork remains wide: no stretched texture or invented hard-edged fill.
  if im.width/im.height > 2.4:
   aspect=2.4
  else:aspect=16/9
  width=min(im.width,1536);height=round(width/aspect)
  framed=ImageOps.fit(im,(width,height),Image.Resampling.LANCZOS,centering=(center,.51))
  framed=ImageEnhance.Brightness(framed).enhance(gain)
  master=OUT/(key+'.png');framed.save(master,optimize=True)
  framed.save(ROOT/'public/art-original'/(key+'.webp'),'WEBP',lossless=True,method=6)
  for item,img in [(key,framed),(key+'-thumb',ImageOps.fit(framed,(480,270),Image.Resampling.LANCZOS))]:
   img.save(ROOT/'public/art'/(item+'.webp'),'WEBP',quality=90 if item==key else 80,method=6)
   img.save(ROOT/'public/art'/(item+'.avif'),'AVIF',quality=63 if item==key else 53,speed=7,max_threads=2)
   manifest['avif'].append(item)
  manifest['originals'][key]=key+'.webp';manifest['masters'][key]=master.relative_to(ROOT).as_posix()
  records[key]={'attachment':f.name,'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'panel':mode,'size':list(framed.size),'brightness':gain}
 manifest['avif']=sorted(set(manifest['avif']));manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
 (ROOT/'docs/art/shenci-r2-source.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
if __name__=='__main__':main()
