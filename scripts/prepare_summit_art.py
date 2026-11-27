"""Finish the reviewed Qwen summit shots and reframe the approved group photos."""

from argparse import ArgumentParser
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageOps

ROOT = Path(__file__).resolve().parents[1]
MASTERS = ROOT / 'resources/art-src/summit'
MANIFEST = ROOT / 'src/data/art-manifest.json'
SHOTS = {
    'tang': ('tang-handoff', .57, .8),
    'terrace': ('terrace', .43, .8),
    'rail': ('bottle-rail', .55, 1.0),
    'pickup': ('bottle-pickup-clear', .51, .8),
    'return': ('yellow-jacket', .48, .8),
    'invitation': ('yellow-invitation', .46, .8),
    'held': ('bottle-held', .50, .8),
    'lookback': ('yellow-lookback', .46, .8),
}
PHOTOS = {
    'cg-modern-photo-user': .52,
    'cg-modern-photo-r4-overseas-light': .49,
    'cg-modern-photo-r4-overseas-deep': .49,
}


def finish_prop(shot, image):
    if shot == 'terrace':
        return ImageEnhance.Color(image).enhance(.84)
    if shot == 'tang':
        # Restore the painted background outside the small cap and tamper ring.
        mask = Image.new('L', image.size)
        draw = ImageDraw.Draw(mask)
        draw.polygon([(525, 300), (526, 305), (529, 311), (523, 315), (506, 316), (506, 304)], fill=255)
        draw.polygon([(593, 295), (603, 297), (604, 304), (635, 307), (642, 312),
                      (643, 325), (615, 322), (597, 315), (591, 311), (595, 304)], fill=255)
        return Image.fromarray(cv2.inpaint(np.asarray(image), np.asarray(mask), 4, cv2.INPAINT_TELEA))
    if shot == 'return':
        # Keep the diagonal abrasion visible through the girl's grip.
        marks = Image.new('RGBA', image.size)
        draw = ImageDraw.Draw(marks)
        draw.line([(675, 569), (687, 556), (698, 539)], fill=(246, 238, 220, 191), width=2)
        draw.line([(680, 573), (688, 561), (696, 549)], fill=(224, 217, 198, 121), width=1)
        draw.line([(681, 566), (685, 562), (691, 553)], fill=(255, 248, 229, 202))
        return Image.alpha_composite(image.convert('RGBA'), marks).convert('RGB')
    if shot == 'rail':
        # Match the cool sky-blue cap in the other shots, preserving its ridges.
        mask = Image.new('L', image.size)
        ImageDraw.Draw(mask).polygon([(295,447), (309,430), (352,431), (374,440), (370,505), (335,523), (296,514)], fill=255)
        pixels = np.asarray(image)
        red, green, blue = pixels.astype(np.int16).transpose(2, 0, 1)
        amount = np.clip((blue - red - 20) / 75, 0, 1) * (np.asarray(mask) / 255)
        balanced = pixels * (1 - .40 * amount[:, :, None]) + np.array([159, 193, 221]) * .40 * amount[:, :, None]
        return Image.fromarray(np.uint8(np.round(balanced)))
    return image


def cropped(image, center, ratio):
    width = round(image.height * ratio)
    left = round(image.width * center - width / 2)
    return image.crop((left, 0, left + width, image.height))


def export(name, image, thumb):
    master = MASTERS / f'{name}.png'
    master.parent.mkdir(parents=True, exist_ok=True)
    image.save(master)
    original = ROOT / 'public/art-original' / f'{name}.webp'
    image.save(original, 'WEBP', lossless=True, method=6)
    with Image.open(original) as encoded:
        if ImageChops.difference(image, encoded.convert(image.mode)).getbbox():
            raise ValueError(f'Lossless verification failed: {name}')
    files = [(name, image, 90, 65)]
    if thumb:
        files.append((f'{name}-thumb', ImageOps.fit(image, (480, 270), Image.Resampling.LANCZOS), 83, 53))
    for key, artwork, web_quality, avif_quality in files:
        artwork.save(ROOT / 'public/art' / f'{key}.webp', quality=web_quality, method=6)
        artwork.save(ROOT / 'public/art' / f'{key}.avif', quality=avif_quality, speed=7, max_threads=2)
    return image.size


def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path, help='ComfyUI folder with the approved PNGs')
    args = parser.parse_args()
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    jobs = []
    records = []

    def queue(name, image, thumb=False):
        jobs.append((name, image, thumb))
        manifest['masters'][name] = (MASTERS / f'{name}.png').relative_to(ROOT).as_posix()
        manifest['originals'][name] = f'{name}.webp'
        manifest['avif'].append(name)
        if thumb:
            manifest['avif'].append(f'{name}-thumb')

    def queue_mobile(base, image, center, ratio):
        queue(f'{base}-m', cropped(image, center, ratio))
        manifest['mobile'].append(base)
        manifest['mobileOriginals'][base] = f'{base}-m.webp'

    for shot, (filename, center, ratio) in SHOTS.items():
        source = args.output / f'{filename}_00001_.png'
        name = f'cg-modern-hike-{shot}'
        with Image.open(source) as generated:
            image = finish_prop(shot, generated.convert('RGB'))
            prompt = json.loads(generated.info['prompt'])
        records.append({
            'asset': name, 'comfyFile': source.name, 'sha256': sha256(source.read_bytes()).hexdigest(),
            'model': prompt['1']['inputs']['unet_name'], 'seed': prompt['7']['inputs']['seed'],
            'prompt': prompt['5']['inputs']['prompt'], 'mobileCenter': center, 'mobileAspect': ratio,
            'referenceInputs': [node['inputs']['image'] for node in prompt.values() if node['class_type'] == 'LoadImage'],
        })
        queue(name, image, thumb=True)
        queue_mobile(name, image, center, ratio)
    for name, center in PHOTOS.items():
        source = ROOT / 'public/art-original' / manifest['originals'][name]
        with Image.open(source) as photo:
            queue_mobile(name, photo.convert('RGB'), center, 1.0)
        records.append({'asset': f'{name}-m', 'source': source.relative_to(ROOT).as_posix(),
                        'sha256': sha256(source.read_bytes()).hexdigest(), 'mobileCenter': center, 'mobileAspect': 1.0})
    with ThreadPoolExecutor(max_workers=3) as pool:
        exports = [pool.submit(export, *job) for job in jobs]
        for (name, _, _), result in zip(jobs, exports, strict=True):
            print(name, result.result())
    for key in ('avif', 'mobile'):
        manifest[key] = sorted(set(manifest[key]))
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    (ROOT / 'docs/art/summit-art-source.json').write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')


if __name__ == '__main__':
    main()
