"""Rebuild the reviewed r2 exports; generated sources and existing art stay intact.

Requires Pillow and numpy. It exports reviewed generated sources and explicit
action-focused mobile crops.
Dark-room and jade-light files are lighting variants, not new generated CGs.
"""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
MASTERS = ROOT / 'resources/art-src/modern-r2'
GENERATED = MASTERS / 'generated'
ART = ROOT / 'public/art'
ORIGINALS = ROOT / 'public/art-original'
MANIFEST = ROOT / 'src/data/art-manifest.json'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def source(name):
    return Image.open(GENERATED / f'{name}.jpg').convert('RGB')


def night_variant(image, jade_light=False):
    w, h = image.size
    light = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(light)
    d.polygon([(w*.632,h*.132),(w*.917,h*.049),(w*.915,h*.613),(w*.632,h*.543)], fill=255)
    light = light.filter(ImageFilter.GaussianBlur(4))
    illumination = .12 + .88 * np.asarray(light, dtype=float) / 255
    rgb = np.array(image).astype(float) * illumination[...,None]
    if jade_light:
        yy, xx = np.mgrid[:h,:w]
        radius = ((xx-w*.546)**2/(w*.055)**2 + (yy-h*.558)**2/(h*.07)**2)
        halo = np.exp(-radius*1.5)[...,None]
        original=np.array(image).astype(float)
        rgb = rgb + original * halo * .85 + halo * np.array([10,18,5])
    return Image.fromarray(np.uint8(np.clip(rgb,0,255)))


def arrival():
    # Reframe the generated establishing shot around its street and shoe shop.
    image=source('street-arrival')
    return image.crop((round(image.width*.24),0,image.width,image.height))



def main():
    manifest=json.loads(MANIFEST.read_text())
    carving=source('dorm-carving')
    images={
        'modern-street-arrival-r2': arrival(),
        'modern-dorm-quiet-r2': source('dorm-quiet'),
        'cg-modern-jade-palm-r2': source('jade-palm'),
        'cg-modern-dorm-unease-r2': source('dorm-unease'),
        'cg-modern-dorm-carving-r2': carving,
        'cg-modern-dorm-dark-r2': night_variant(carving),
        'cg-modern-jade-light-r2': night_variant(carving, True),
    }
    mobile_crops={
        'cg-modern-jade-palm-r2': (.12,0,.78,1),
        'cg-modern-dorm-unease-r2': (.26,0,.86,1),
        'cg-modern-dorm-carving-r2': (.40,0,1,1),
        'cg-modern-dorm-dark-r2': (.40,0,1,1),
        'cg-modern-jade-light-r2': (.26,0,.86,1),
    }
    records=[]
    for name,image in images.items():
        master=MASTERS / f'{name}.png'
        image.save(master)
        image.save(ORIGINALS/f'{name}.webp','WEBP',lossless=True,method=6)
        image.save(ART/f'{name}.webp','WEBP',quality=91,method=6)
        image.save(ART/f'{name}.avif','AVIF',quality=65,speed=6,max_threads=2)
        thumb=image.resize((480,270),Image.Resampling.LANCZOS)
        thumb.save(ART/f'{name}-thumb.webp','WEBP',quality=85,method=6)
        thumb.save(ART/f'{name}-thumb.avif','AVIF',quality=55,speed=6,max_threads=2)
        manifest['originals'][name]=f'{name}.webp'
        manifest.setdefault('masters',{})[name]=master.relative_to(ROOT).as_posix()
        manifest['avif']=sorted(set(manifest['avif']) | {name,f'{name}-thumb'})
        record={'asset':name,'master':master.relative_to(ROOT).as_posix(),'size':list(image.size),'sha256':digest(master)}
        if name in mobile_crops:
            fractions=mobile_crops[name]
            crop=tuple(round(v*(image.width if i%2==0 else image.height)) for i,v in enumerate(fractions))
            mobile=image.crop(crop)
            mobile.save(ORIGINALS/f'{name}-m.webp','WEBP',lossless=True,method=6)
            mobile.save(ART/f'{name}-m.webp','WEBP',quality=92,method=6)
            mobile.save(ART/f'{name}-m.avif','AVIF',quality=65,speed=6,max_threads=2)
            manifest['originals'][f'{name}-m']=f'{name}-m.webp'
            manifest.setdefault('mobileOriginals',{})[name]=f'{name}-m.webp'
            manifest['mobile']=sorted(set(manifest['mobile'])|{name})
            record.update(mobileCrop=list(fractions),mobileSize=list(mobile.size))
        records.append(record)
    MANIFEST.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    raw=[{'file':p.relative_to(ROOT).as_posix(),'size':list(Image.open(p).size),'sha256':digest(p)} for p in sorted(GENERATED.glob('*.jpg'))]
    (ROOT/'docs/art/modern-r2-exports.json').write_text(json.dumps({'generatedSources':raw,'exports':records,'notes':['Three generated narrative CGs and two generated continuity backgrounds.','Night/light are derived lighting variants, not extra generated CGs.','Quiet room is a reviewed generated clean plate from the same original room; the old source stays intact.','Establishing shot is a documented crop of its retained generated source.']},ensure_ascii=False,indent=2)+'\n')
    print(f'Exported {len(images)} reviewed images, including {len(mobile_crops)} action-focused mobile crops.')

if __name__=='__main__':main()
