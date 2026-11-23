"""Verify real transparent exports and layer registration; produce labelled QA boards."""
from pathlib import Path
import json,hashlib,os
import numpy as np
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1];R=ROOT/'resources/art-src/modern-characters-r2';Q=R/'qa'
fontfile=os.environ.get('VN_QA_FONT','DejaVuSans.ttf');f=ImageFont.truetype(fontfile,28);small=ImageFont.truetype(fontfile,22)
characters={'linyue':['neutral','thoughtful','warm','puzzled','alert','startled'],'roommate':['neutral','focused','warm','puzzled','concerned','startled']}
labels={'neutral':'平静','thoughtful':'思考','warm':'微笑','puzzled':'困惑','alert':'警觉','startled':'惊愕','focused':'专注','concerned':'关切'}
report=[]
for key,states in characters.items():
 base=Image.open(R/f'source-layers/{key}-body-base.png').convert('RGBA');baseline=np.array(base);mask=np.array(Image.open(R/f'source-layers/{key}-expression-mask.png'))
 for state in states:
  path=R/f'runtime/portrait-{key}-r2-{state}.png';im=Image.open(path).convert('RGBA');a=np.array(im)
  assert im.size==(864,1152)
  assert np.array_equal(a[:,:,3],baseline[:,:,3]),f'{key}/{state}: silhouette moved'
  assert np.array_equal(a[mask==0],baseline[mask==0]),f'{key}/{state}: shared body changed'
  assert not np.any(a[a[:,:,3]==0,:3]),f'{key}/{state}: hidden edge RGB'
  if state!='neutral':
   layer=Image.open(R/f'source-layers/{key}-{state}-expression.png').convert('RGBA')
   assert np.array_equal(np.array(Image.alpha_composite(base,layer)),a),f'{key}/{state}: layers do not reconstruct'
  else: assert np.array_equal(a,baseline)
  assert not np.any(a[:10,:,3]),f'{key}: missing headroom'
  report.append({'character':key,'state':state,'alphaBBox':im.getbbox(),'sharedBodyIdentical':True,'layerReconstructsExactly':True,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
 # Same actual exports, inspected over contrasting backgrounds.
 board=Image.new('RGB',(1200,960),(236,232,222));d=ImageDraw.Draw(board)
 d.text((22,8),('Lin Yue' if key=='linyue' else 'Roommate')+' | six exported expressions',font=f,fill='#142226')
 crop=(240,75,485,320) if key=='linyue' else (250,80,495,325)
 for i,state in enumerate(states):
  x=i%3*400+20;y=i//3*440+60;pic=Image.open(R/f'runtime/portrait-{key}-r2-{state}.png').crop(crop).resize((360,360),Image.Resampling.LANCZOS)
  tile=Image.new('RGBA',(360,360),(30,44,48,255));tile.alpha_composite(pic);board.paste(tile.convert('RGB'),(x,y));d.text((x,y+367),state,font=small,fill='#142226')
 board.save(Q/f'{key}-six-expressions.jpg',quality=96)
# Full-body identity and edge board: a compositing inspection, not a game screenshot.
board=Image.new('RGB',(1120,1000),(236,232,222));d=ImageDraw.Draw(board);d.text((28,20),'Shared body / alpha-edge inspection',font=f,fill='#142226')
for i,key in enumerate(characters):
 for j,color in enumerate([(27,43,48,255),(236,232,222,255)]):
  x=i*560+j*270+20;y=90;im=Image.open(R/f'runtime/portrait-{key}-r2-neutral.png');tile=Image.new('RGBA',(260,780),color);pic=im.resize((260,347),Image.Resampling.LANCZOS);tile.alpha_composite(pic,(0,20))
  face=im.crop((240,75,485,320) if key=='linyue' else (250,80,495,325)).resize((245,245),Image.Resampling.LANCZOS);tile.alpha_composite(face,(8,445));board.paste(tile.convert('RGB'),(x,y));d.text((x,y+790),('Lin Yue' if key=='linyue' else 'Roommate')+(' | dark' if j==0 else ' | light'),font=small,fill='#142226')
d.text((26,950),'Contact sheet and enlarged edge check. Not an in-game screenshot.',font=small,fill='#142226');board.save(Q/'identity-and-alpha-overview.jpg',quality=96)
(Q/'registration-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('PASS: 12 transparent states; identical per-character silhouette/body; all 10 expression layers reconstruct bit-exactly.')
