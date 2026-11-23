"""Export reviewed local Qwen work non-destructively for the modern campaign."""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
NEW = Path(r'D:\Comfy-Desktop\ComfyUI-Shared\output\Qwen2.1\Heterotopia\ModernLine-2026-11-23')
PREVIOUS = ROOT/'artifacts/StoryExpansion-2026-11-23/deliverable/Assets'
ART, ORIGINALS, MASTERS = ROOT/'public/art', ROOT/'public/art-original', ROOT/'resources/art-src/modern'
MAPPING = {
    'modern-dorm': NEW/'modern-dorm_00001_.png',
    'modern-library': NEW/'modern-library-v2_00001_.png',
    'modern-office': NEW/'modern-office_00001_.png',
    'modern-projection': NEW/'modern-projection_00001_.png',
    'modern-mountain-path': NEW/'modern-mountain-path_00001_.png',
    'modern-sunset': NEW/'modern-sunset_00001_.png',
    'cg-modern-word-stall': PREVIOUS/'Modern/01b-word-stall.png',
    'cg-modern-friends': PREVIOUS/'Modern/01-campus-friends.png',
    'cg-modern-noodles': PREVIOUS/'Modern/01e-dorm-noodles.png',
    'cg-modern-translation': PREVIOUS/'Modern/01h-tianwen-translation.png',
    'cg-modern-glance': NEW/'modern-one-glance_00001_.png',
    'cg-modern-photo': NEW/'modern-final-photo_00001_.png',
    'cg-modern-summit': NEW/'modern-summit-reunion_00001_.png',
    'cg-modern-paper': NEW/'modern-office-conversation_00001_.png',
    'cg-modern-projection': NEW/'modern-projection_00001_.png',
    'cg-modern-selection': PREVIOUS/'Common/13-ritual-selection.png',
    'cg-modern-fork': PREVIOUS/'Common/12-carriage-choice.png',
    'cg-modern-storm': PREVIOUS/'Kunlun/02-storm-boat.png',
    'cg-modern-cloud-lord': PREVIOUS/'Kunlun/03a-cloud-lord.png',
    'cg-modern-xiangjun': PREVIOUS/'Kunlun/03b-xiangjun.png',
    'cg-modern-xiangfuren': PREVIOUS/'Kunlun/03c-xiangfuren.png',
    'cg-modern-siming': PREVIOUS/'Kunlun/04-siming-afterwater.png',
    'cg-modern-shaosiming': PREVIOUS/'Kunlun/03d-shaosiming.png',
    'cg-modern-dongjun': PREVIOUS/'Kunlun/03e-dongjun.png',
    'cg-modern-mountain-spirit': PREVIOUS/'Kunlun/03f-mountain-spirit.png',
    'cg-modern-river-lord': PREVIOUS/'Kunlun/03g-river-lord.png',
    'cg-modern-gods-rite': PREVIOUS/'Kunlun/03i-gods-rite.png',
    'cg-modern-kunlun-light': PREVIOUS/'Kunlun/05-kunlun-light.png',
    'cg-modern-donghuang': PREVIOUS/'Kunlun/03h-donghuang.png',
    'cg-modern-reed-boat': PREVIOUS/'Kunlun/06-reed-boat-found.png',
    'cg-modern-battle': PREVIOUS/'Royal/07-ink-battle.png',
    'cg-modern-city': PREVIOUS/'Royal/08-city-fighting.png',
    'cg-modern-last-geese': PREVIOUS/'Royal/09-xu-last-seven-geese.png',
    'cg-modern-feast': PREVIOUS/'Royal/10-corrupt-feast.png',
    'cg-modern-ritual': PREVIOUS/'Royal/11-royal-ritual.png',
}


def main():
    manifest_path = ROOT/'src/data/art-manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    MASTERS.mkdir(parents=True, exist_ok=True)
    records = []
    for name, source in MAPPING.items():
        image = Image.open(source).convert('RGB')
        assert image.size == (1536,864), (name,image.size)
        master = MASTERS/f'{name}.png'
        image.save(master)
        image.save(ORIGINALS/f'{name}.webp', 'WEBP', lossless=True, method=6)
        image.save(ART/f'{name}.webp', 'WEBP', quality=91, method=6)
        image.save(ART/f'{name}.avif', 'AVIF', quality=62, speed=6, max_threads=2)
        thumb = image.resize((480,270),Image.Resampling.LANCZOS)
        thumb.save(ART/f'{name}-thumb.webp','WEBP',quality=82,method=6)
        thumb.save(ART/f'{name}-thumb.avif','AVIF',quality=55,speed=6,max_threads=2)
        manifest['originals'][name] = f'{name}.webp'
        manifest.setdefault('masters',{})[name] = master.relative_to(ROOT).as_posix()
        manifest['avif'] = sorted(set(manifest['avif']) | {name,f'{name}-thumb'})
        records.append({'asset':name,'source':str(source),'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'master':str(master.relative_to(ROOT)), 'size':list(image.size)})
    # Magenta keying retains the green canvas backpack. Never use a green key.
    source = NEW/'portrait-linyue_00001_.png'
    rgb = np.asarray(Image.open(source).convert('RGB')).astype(np.float32)
    dominance = np.minimum(rgb[...,0],rgb[...,2])-rgb[...,1]
    alpha = np.clip((35-dominance)/25,0,1)
    spill = np.maximum(dominance-5,0)*alpha
    rgb[...,0] -= spill*.7
    rgb[...,2] -= spill*.7
    rgba = np.dstack([np.clip(rgb,0,255),alpha*255]).astype(np.uint8)
    rgba[alpha==0,:3] = 0
    portrait = Image.fromarray(rgba).resize((768,1152),Image.Resampling.LANCZOS)
    name='portrait-linyue'
    portrait.save(MASTERS/f'{name}.png')
    portrait.save(ART/f'{name}.webp','WEBP',quality=92,method=6)
    portrait.save(ART/f'{name}.avif','AVIF',quality=68,speed=6,max_threads=2)
    mobile=portrait.resize((640,960),Image.Resampling.LANCZOS)
    mobile.save(ART/f'{name}-m.webp','WEBP',quality=85,method=6)
    mobile.save(ART/f'{name}-m.avif','AVIF',quality=55,speed=6,max_threads=2)
    face=portrait.crop((225,65,520,390)).resize((240,264),Image.Resampling.LANCZOS)
    face.save(ART/f'{name}-face.webp','WEBP',quality=90,method=6)
    manifest.setdefault('masters',{})[name]=(MASTERS/f'{name}.png').relative_to(ROOT).as_posix()
    manifest['avif']=sorted(set(manifest['avif'])|{name})
    manifest['mobile']=sorted(set(manifest['mobile'])|{name})
    records.append({'asset':name,'source':str(source),'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'matte':'magenta; preserve green backpack','size':list(portrait.size)})
    manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    out=ROOT/'docs/art/modern-line-assets.json'
    out.write_text(json.dumps({'date':'2026-11-23','engine':'ComfyUI / Qwen-Image 2.1','assets':records},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Exported {len(records)} modern-campaign assets, originals and fallbacks.')


if __name__=='__main__': main()
