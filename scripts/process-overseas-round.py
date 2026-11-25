"""Export the reviewed overseas art and grade existing scenes by the chosen complexion."""
from argparse import ArgumentParser
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
from pathlib import Path
import json

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
MASTERS = ROOT / 'resources/art-src/overseas-round'
MANIFEST = ROOT / 'src/data/art-manifest.json'
FONT = ROOT / 'resources/fonts/NotoSerifSC-Variable.ttf'

# Chroma-keying only. Every head, neck, pose and outfit comes from one complete drawing.
PORTRAITS = {
    'portrait-linyue-trail': 'trail-neutral',
    'portrait-linyue-trail-smile': 'trail-smile-matched',
    'portrait-linyue-overseas-light': 'appearance-light',
    'portrait-linyue-overseas-deep': 'appearance-deep',
    'portrait-shen-summit': 'shen-summit-empty',
    'portrait-tang-summit': 'tang-summit-empty',
    'portrait-song-summit': 'song-summit',
}
SCENES = {
    'cg-modern-summit-r4-m': 'summit-mobile-insert',
    'cg-modern-porridge-plaque-m': 'porridge-mobile',
    'cg-modern-porridge-plaque': 'porridge-board-landscape',
    'cg-modern-cold-porridge': 'porridge-bowl-wide',
    'cg-modern-porridge-offering': 'porridge-handoff-one-arm',
    'cg-modern-quiet-shoal-six': 'six-at-shoal-left',
    'cg-modern-shoal-cord': 'old-stake',
    'modern-herb-eaves': 'herb-eaves',
    'modern-office-video': 'office-video',
    'modern-night-river': 'riverside-night',
    'modern-minister-hall': 'minister-hall',
    'modern-minister-ancestor': 'minister-ancestor',
    'modern-minister-veteran': 'minister-veteran',
    'modern-minister-orange': 'minister-orange',
    'modern-minister-inlaw': 'minister-inlaw',
}

# Coordinates are percentages of the image width and height. Only Lin Yue's
# visible areas are marked, with colour protection at hair, eyes, clothing and props.
DORM = [[(32,78),(36,68),(38,53),(44,45),(50,42),(52,46),(49,51),(46,55),(45,59),(54,59),(55,66),(51,70),(47,75),(44,86),(39,84)]]
NOTEBOOK = [[(62,55),(68,45),(72,40),(81,41),(87,47),(89,58),(93,67),(85,77),(75,69),(70,59)]]
CG_MASKS = {
    'cg-modern-word-stall-r3': [[(26,25),(37,22),(38,29),(36,37),(33,43),(28,40),(27,33)]],
    'cg-modern-word-stall-r3-m': [[(15,27),(27,23),(30,27),(30,35),(28,43),(24,47),(19,41),(15,35)]],
    'cg-modern-jade-palm-r2': [[(16,28),(29,24),(39,27),(50,34),(52,45),(47,48),(43,43),(41,55),(44,64),(51,63),(59,62),(61,66),(60,72),(56,76),(47,77),(39,74),(35,66),(29,57),(26,46),(17,47)]],
    'cg-modern-jade-palm-r2-m': [[(3,31),(17,25),(28,24),(45,28),(57,35),(62,42),(60,47),(49,48),(46,51),(48,61),(58,63),(71,59),(76,63),(75,70),(67,75),(54,77),(40,74),(29,69),(20,59),(18,50),(9,52),(5,48)]],
    'cg-modern-dorm-unease-r2': DORM,
    'cg-modern-dorm-carving-r2': DORM,
    'cg-modern-dorm-dark-r2': DORM,
    'cg-modern-jade-light-r2': DORM,
    'cg-modern-dorm-unease-r2-m': [[(10,64),(14,55),(19,49),(30,46),(35,43),(40,43),(40,46),(31,52),(28,61),(36,63),(46,63),(48,69),(46,72),(36,77),(28,86),(21,91),(14,85),(10,79)]],
    'cg-modern-dorm-carving-r2-m': [[(0,55),(4,48),(12,45),(18,42),(24,44),(23,47),(17,49),(13,56),(12,61),(20,64),(27,63),(29,67),(26,72),(19,77),(7,80),(0,77)]],
    'cg-modern-dorm-dark-r2-m': [[(0,54),(4,47),(16,43),(24,42),(25,47),(17,51),(10,61),(18,64),(27,63),(28,68),(23,74),(12,80),(0,79)]],
    'cg-modern-jade-light-r2-m': [[(24,71),(25,57),(29,49),(38,43),(44,43),(45,47),(37,53),(34,61),(34,66),(42,67),(50,63),(53,67),(51,72),(41,78),(35,85),(29,90),(23,83)]],
    'cg-modern-noodles': [[(19,29),(33,27),(36,33),(36,39),(32,50),(25,48),(21,41)],[(31,66),(36,62),(39,64),(40,69),(42,73),(42,78),(37,79),(32,76),(30,72)]],
    'cg-modern-notebook-open': NOTEBOOK,
    'cg-modern-translation-r3': NOTEBOOK,
    'cg-modern-notebook-open-m': [[(65,53),(69,44),(72,38),(78,40),(86,46),(89,57),(94,71),(88,82),(80,78),(71,69),(68,62)]],
    'cg-modern-translation-r3-m': [[(64,52),(69,43),(73,38),(79,40),(88,46),(91,60),(95,72),(87,82),(79,76),(71,67),(67,61)]],
    'cg-modern-paper': [[(19,27),(29,21),(31,26),(32,33),(29,41),(25,47),(19,44)],[(31,71),(37,69),(40,73),(41,79),(37,83),(31,80)]],
    'cg-modern-paper-note': [[(7,43),(20,39),(27,39),(28,44),(24,52),(23,61),(20,68),(17,79),(11,74),(7,63),(2,57)]],
    'cg-modern-paper-note-m': [[(0,43),(10,40),(15,40),(17,45),(15,52),(12,58),(11,69),(8,77),(3,74),(0,68)]],
    'cg-modern-glance-r4': [[(27,23),(36,23),(40,29),(40,36),(37,46),(32,48),(29,41),(29,35)],[(21,70),(28,72),(30,79),(30,86),(29,93),(23,96),(19,91)],[(42,79),(45,81),(46,90),(44,94),(42,90)]],
    'cg-modern-summit-r4': [[(10,33),(18,33),(20,38),(20,45),(18,53),(15,55),(11,50),(9,45)],[(0,74),(6,76),(10,78),(14,75),(20,74),(22,77),(22,85),(17,90),(10,84),(0,91)]],
    'cg-modern-photo-r4': [
        [(25.6,44.4),(27.1,43.6),(30.1,42),(32.9,39.8),(34.8,42.7),(36.1,45.7),(35.6,50.5),(34.6,53.8),(33.2,56.2),(31.3,58.3),(30.5,61.5),(30.6,64),(28.7,64.8),(26,62),(24.9,58.6),(25.2,56.3),(26.3,54.6),(26.7,50.7),(25.7,49.9),(25.4,47.9)],
        [(16.2,81.5),(17.8,80.1),(19.7,80.4),(21.8,81.9),(22.6,83.1),(22.3,86),(20.1,84.5),(17,83.6)],
        [(21,100),(22.8,96.3),(24.5,96.3),(25.6,100)],
        [(32.5,83.5),(33.6,83.5),(33.6,100),(31.7,100),(31.8,93.8)],
    ],
    'modern-street-arrival-r3': [[(35.8,36),(41.2,36),(41.2,30),(40,28),(37,30)]],
}

def load(path):
    with Image.open(path) as image:
        return image.copy().convert('RGBA' if image.mode == 'RGBA' else 'RGB')


def chroma_portrait(image):
    rgb = np.asarray(image.convert('RGB')).astype(np.float32)
    r, g, b = rgb.transpose(2, 0, 1)
    excess = np.minimum(r, b) - g
    alpha = np.clip((75 - excess) / 54, 0, 1)
    mask = np.uint8(alpha > .1)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
    assert count > 1
    alpha[labels != 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])] = 0
    spill = np.maximum(0, excess - 7) * np.clip((1 - alpha) * 2.3, 0, 1)
    rgb[:, :, 0] -= .93 * spill
    rgb[:, :, 2] -= .93 * spill
    rgb[alpha == 0] = 0
    return Image.fromarray(np.dstack([np.uint8(np.clip(rgb, 0, 255)), np.uint8(alpha * 255 + .5)]))


def balance_deep_portrait(image):
    rgba = np.asarray(image)
    srgb = np.float32(rgba[:, :, :3]) / 255
    h, s, v = cv2.cvtColor(srgb, cv2.COLOR_RGB2HSV).transpose(2, 0, 1)
    warm = np.clip(np.minimum((h - 7) / 12, (56 - h) / 15), 0, 1)
    pigment = warm * np.clip((s - .27) / .34, 0, 1) * np.clip((v - .065) / .18, 0, 1)
    lab = cv2.cvtColor(srgb, cv2.COLOR_RGB2LAB)
    lab[:, :, 0] += 7.5 * pigment
    lab[:, :, 1] *= 1 - .09 * pigment
    lab[:, :, 2] *= 1 - .21 * pigment
    rgb = np.uint8(np.clip(cv2.cvtColor(lab, cv2.COLOR_LAB2RGB) * 255 + .5, 0, 255))
    rgb[rgba[:, :, 3] == 0] = 0
    return Image.fromarray(np.dstack([rgb, rgba[:, :, 3]]))


def grade(image, regions, tone):
    rgba = np.asarray(image.convert('RGBA'))
    pixels = rgba[:, :, :3].astype(np.float32) / 255
    hsv = cv2.cvtColor(pixels, cv2.COLOR_RGB2HSV)
    h, s, v = hsv.transpose(2, 0, 1)
    # Protect the bone-white paper, jade green, charcoal hair and nearly
    # black shadows. This affects colour alone and preserves the pixels' geometry.
    warm = np.clip(np.minimum((h - 4) / 14, (64 - h) / 20), 0, 1)
    strength = warm * np.clip((s - .07) / .10, 0, 1) * np.clip((v - .045) / .18, 0, 1)
    stencil = Image.new('L', image.size, 0)
    draw = ImageDraw.Draw(stencil)
    for region in regions:
        draw.polygon([(round(x * image.width / 100), round(y * image.height / 100)) for x, y in region],fill=255)
    feather = max(2, min(image.size) * .006)
    alpha = np.asarray(stencil.filter(ImageFilter.GaussianBlur(feather)),dtype=np.float32) / 255 * strength * (rgba[:, :, 3] / 255)
    lab = cv2.cvtColor(pixels,cv2.COLOR_RGB2LAB)
    if tone == 'deep':
        lab[:, :, 0] = np.clip(lab[:, :, 0] * .77 - 3, 0, 100)
        lab[:, :, 1] *= .99
        lab[:, :, 2] *= .91
    else:
        lab[:, :, 0] += (100 - lab[:, :, 0]) * .27
        lab[:, :, 1] *= .78
        lab[:, :, 2] *= .63
    tinted = cv2.cvtColor(lab,cv2.COLOR_LAB2RGB)
    mixed = np.uint8(np.clip((pixels + (tinted - pixels) * alpha[:, :, None]) * 255 + .5, 0, 255))
    return Image.fromarray(np.dstack([mixed, rgba[:, :, 3]]) if image.mode == 'RGBA' else mixed)


def carved_plaque(image):
    # Follow the plank's perspective. The grain patch contributes its texture
    # while the wood underneath supplies the local colour and illumination.
    original = np.asarray(image, dtype=np.float32)
    grain = cv2.remap(original, *np.meshgrid(
        np.arange(image.width, dtype=np.float32) - 59,
        np.arange(image.height, dtype=np.float32),
    ), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    wood = cv2.GaussianBlur(original, (0, 0), 13)
    patch = wood + grain - cv2.GaussianBlur(grain, (0, 0), 13)
    matte = Image.new('L', image.size, 0)
    ImageDraw.Draw(matte).polygon([(505,112),(580,116),(565,304),(554,472),(551,582),(482,582),(493,359)], fill=255)
    image.paste(Image.fromarray(np.uint8(np.clip(patch, 0, 255))), mask=matte.filter(ImageFilter.GaussianBlur(6)))
    return engrave(image, [
        (540,155,53,5),(535,238,48,-5),(529,313,43,7),
        (525,384,40,-8),(521,445,37,5),
    ], [(519,496),(510,510),(523,511),(525,521)])


def engrave(image, positions, last_mark):
    # The surviving names shrink down the board. The last character is broken.
    for name,(x,y,size,angle) in zip('雩芈沅媭荼', positions):
        mark=Image.new('L',(90,90),0)
        ImageDraw.Draw(mark).text((45,44),name,font=ImageFont.truetype(str(FONT),size),anchor='mm',fill=212)
        mark=mark.rotate(angle,resample=Image.Resampling.BICUBIC)
        image.paste((139,118,94),(x-44,y-44),mark)
        image.paste((34,27,20),(x-45,y-45),mark)
    draw=ImageDraw.Draw(image)
    draw.line([(x+1,y+1) for x,y in last_mark],fill=(101,85,65),width=2)
    draw.line(last_mark,fill=(39,32,23),width=2)
    return image


def landscape_plaque(image):
    # Remove the stray yellow grain and use the same names as the 3:4 insert.
    mask = np.zeros((image.height, image.width), dtype=np.uint8)
    cv2.ellipse(mask, (550,580), (19,9), -15, 0, 360, 255, -1)
    image = Image.fromarray(cv2.inpaint(np.asarray(image), mask, 5, cv2.INPAINT_TELEA))
    return engrave(image, [
        (1039,127,58,5),(1027,223,53,-5),(1013,313,48,7),
        (1002,394,44,-8),(991,470,41,5),
    ], [(986,527),(975,543),(986,545),(989,555)])


def shoal_relics(image):
    source = np.array(image)
    mask = np.zeros(source.shape[:2], dtype=np.uint8)
    cv2.ellipse(mask, (1041, 283), (10, 10), 0, 0, 360, 255, -1)
    cv2.ellipse(mask, (109, 377), (8, 7), 0, 0, 360, 255, -1)
    cv2.ellipse(mask, (1137, 622), (14, 15), 12, 0, 360, 255, -1)
    cleaned = cv2.inpaint(source, mask, 3, cv2.INPAINT_TELEA)
    # Move only the translucent pigment of the birthmark to her own left cheek.
    yy, xx = np.mgrid[-11:12, -11:12]
    weight = np.clip((10.5 - np.hypot(xx, yy)) / 3.5, 0, 1)[..., None]
    area = np.s_[272:295, 1030:1053]
    pigment = (source[area].astype(np.float32) - cleaned[area]) * weight
    area = np.s_[276:299, 1099:1122]
    cleaned[area] = np.uint8(np.clip(cleaned[area] + pigment[:, ::-1] * .88, 0, 255))
    image = Image.fromarray(cleaned)
    draw = ImageDraw.Draw(image, 'RGBA')
    # The soaked sugar-paper boat is tethered to the surviving knot.
    draw.line([(111,369),(110,374),(108,377)], fill=(118,39,29,230), width=2)
    draw.polygon([(94,377),(103,380),(110,373),(117,380),(125,378),(119,385),(101,386)], fill=(102,83,63,130))
    draw.polygon([(93,375),(103,379),(110,371),(117,378),(125,376),(118,383),(100,384)], fill=(210,205,180,247))
    draw.polygon([(103,379),(110,371),(112,382)], fill=(234,229,207,249))
    draw.line([(95,376),(110,381),(123,377)], fill=(127,119,100,195))
    draw.line([(102,384),(99,385),(98,383)], fill=(226,220,204,207))
    # One ear on the sketch was left unfinished, and is shorter than the other.
    draw.line([(1125,615),(1130,612),(1135,614),(1135,618),(1131,622)], fill=(73,66,54,170), width=2)
    draw.line([(1128,626),(1126,630)], fill=(90,80,62,105), width=1)
    # The loose grass braid and its unfinished strands lie by Mi's hand.
    for line in (
        [(228,638),(241,649),(258,651),(274,648),(284,652),(293,667)],
        [(233,635),(248,647),(259,647),(272,651),(284,654),(299,662)],
        [(234,639),(248,652),(261,650),(273,651),(278,657),(280,670)],
    ):
        draw.line([(x+1,y+1) for x,y in line], fill=(78,62,39,91), width=2)
        draw.line(line, fill=(163,142,90,192), width=1)
    # A collar and folded lapels identify the small garment in Yuan's arms.
    collar = [(751,561),(769,572),(792,599),(811,587),(843,552)]
    draw.line(collar, fill=(115,99,79,115), width=2)
    draw.line([(x,y-2) for x,y in collar], fill=(203,190,166,126), width=2)
    draw.line([(765,562),(784,582),(804,606),(829,588),(847,568)], fill=(133,113,90,88), width=2)
    return image


def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument('generated', type=Path, help='Directory containing the accepted ComfyUI output files')
    parser.add_argument('--jobs',type=Path,help='Qwen workflow records produced for this round')
    args = parser.parse_args()
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    for path in (MASTERS, ROOT / 'public/art', ROOT / 'public/art-original'):
        path.mkdir(parents=True,exist_ok=True)
    records = []
    images = {}

    def source(name):
        existing = images.get(name)
        if existing:
            return existing[0].copy()
        path = ROOT / manifest['masters'].get(name, f'public/art-original/{manifest["originals"].get(name, name + ".webp")}')
        return load(path)

    def register(name, image, derived_from, save_master=True, thumb=False, original=True):
        images[name] = (image, thumb, original)
        if save_master:
            path = MASTERS / f'{name}.png'
            image.save(path)
            manifest['masters'][name] = path.relative_to(ROOT).as_posix()
        records.append({'asset': name, 'source': derived_from, 'size': list(image.size)})

    def generated(key):
        path = args.generated / f'{key}_00001_.png'
        return load(path).convert('RGB')

    def mobile(name, image, origin, already_framed=False):
        if not already_framed:
            image = ImageOps.contain(image,(640,960),Image.Resampling.LANCZOS)
        register(f'{name}-m',image,origin,save_master=already_framed)
        manifest['mobile'] = sorted(set(manifest['mobile']) | {name})
        manifest['mobileOriginals'][name] = f'{name}-m.webp'

    for name,key in PORTRAITS.items():
        image = chroma_portrait(generated(key))
        if key == 'appearance-deep':
            image = balance_deep_portrait(image)
        register(name,image,key)
        mobile(name,image,name)

    for name,key in SCENES.items():
        image = generated(key)
        if name == 'cg-modern-porridge-plaque-m':
            image = carved_plaque(image)
        if name == 'cg-modern-porridge-plaque':
            image = landscape_plaque(image)
        if name == 'cg-modern-quiet-shoal-six':
            image = shoal_relics(image)
        if name.endswith('-m'):
            mobile(name[:-2],image,key,already_framed=True)
        else:
            register(name,image,key,thumb=True)

    for name,regions in CG_MASKS.items():
        base = source(name)
        is_mobile = name.endswith('-m')
        base_name = name[:-2] if is_mobile else name
        for tone in ('light','deep'):
            graded = grade(base,regions,tone)
            variant = f'{base_name}-overseas-{tone}'
            if is_mobile:
                mobile(variant,graded,name,already_framed=True)
            else:
                has_gallery_thumb = name.startswith('cg-') and f'{name}-thumb' in manifest['avif']
                register(variant,graded,name,save_master=False,thumb=has_gallery_thumb)

    # The mobile summit is a close insert of Tang Jin and Shen Ci only.
    for tone in ('light','deep'):
        base_name = f'cg-modern-summit-r4-overseas-{tone}'
        mobile(base_name,source('cg-modern-summit-r4-m'),'cg-modern-summit-r4-m',already_framed=True)

    for name in (
        'portrait-linyue-modern-thoughtful','portrait-linyue-modern-puzzled','portrait-linyue-modern-smile',
        'portrait-linyue-trail','portrait-linyue-trail-smile',
    ):
        base = source(name)
        for tone in ('light','deep'):
            regions = [[(15,0),(79,0),(78,32),(69,40),(62,46),(59,100),(7,100),(8,38)]]
            graded = grade(base,regions,tone)
            variant = f'{name}-overseas-{tone}'
            register(variant,graded,name,save_master=False)
            mobile(variant,graded,name)

    def write(name,item):
        image,thumb,original = item
        file = ROOT / f'public/art-original/{name}.webp'
        if original:
            image.save(file,'WEBP',lossless=True,exact=True,method=4)
            assert load(file).tobytes() == image.tobytes(), name
        variants = {name:image}
        if thumb:
            variants[f'{name}-thumb'] = ImageOps.contain(image,(480,270),Image.Resampling.LANCZOS)
        for key,variant in variants.items():
            variant.save(ROOT / f'public/art/{key}.webp','WEBP',quality=86 if key.endswith('-thumb') else 92,method=4)
            variant.save(ROOT / f'public/art/{key}.avif','AVIF',quality=58 if key.endswith('-thumb') else 67,speed=7,max_threads=2)
        return name, file.name if original else None, list(variants), sha256(file.read_bytes()).hexdigest() if original else None

    avif = set(manifest['avif'])
    hashes = {}
    with ThreadPoolExecutor(max_workers=4) as executor:
        items = dict(executor.map(lambda pair: (pair[0],write(*pair)),images.items()))
    for name,filename,formats,digest in items.values():
        avif.update(formats)
        if filename:
            manifest['originals'][name] = filename
            hashes[name] = digest
    manifest['avif'] = sorted(avif)
    MANIFEST.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    for record in records:
        record['losslessSha256'] = hashes.get(record['asset'])
    jobs = json.loads(args.jobs.read_text(encoding='utf-8')) if args.jobs else []
    used = set(PORTRAITS.values()) | set(SCENES.values())
    for job in jobs:
        if job['id'] in used:
            job['outputSha256'] = sha256((args.generated/f"{job['id']}_00001_.png").read_bytes()).hexdigest()
    index = {'engine':'Local ComfyUI / Qwen-Image 2.1','date':'2026-11-25','jobs':[job for job in jobs if job['id'] in used],'assets':records}
    (ROOT/'docs/art/overseas-round-20261125.json').write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(f'Exported {len(images)} image variants with verified lossless WebP masters.')


if __name__ == '__main__':
    main()
