"""Process reviewed ComfyUI CG and supporting portrait exports."""
from __future__ import annotations

import json
import shutil
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
EXPORTS = ROOT / 'artifacts/ui-fix-3/cg-exports'
ART = ROOT / 'public/art'
MASTERS = ROOT / 'resources/art-src'
MANIFEST = ROOT / 'src/data/art-manifest.json'
CG_SOURCES = {
    'e1-blade': 'multiref_00015_.png',
    'e2-mercy': 'multiref_00001_.png',
    'e3-leave': 'multiref_00003_.png',
    'e4-names': 'multiref_00004_.png',
    'e5-kunlun': 'multiref_00005_.png',
    'e6-home': 'multiref_00016_.png',
    's01-dream-boat': 'multiref_00007_.png',
    's02-first-crossing': 'multiref_00008_.png',
    's03-ritual': 'multiref_00009_.png',
    's04-old-names': 'multiref_00010_.png',
    's05-mi-flute': 'multiref_00011_.png',
    's06-snow-hands': 'multiref_00012_.png',
    's07-light-river': 'multiref_00013_.png',
    's08-farewell': 'multiref_00014_.png',
}
EXTRA_SOURCES = {
    'mother': 'txt2img_00043_.png',
    'gouzi': 'txt2img_00044_.png',
    'zhou': 'txt2img_00045_.png',
    'daoist': 'txt2img_00046_.png',
    'aheng': 'txt2img_00047_.png',
}


def green_key(source: Path) -> Image.Image:
    rgba = np.array(Image.open(source).convert('RGB'), dtype=np.uint8)
    red, green, blue = rgba[..., 0], rgba[..., 1], rgba[..., 2]
    dominance = green.astype(np.int16) - np.maximum(red, blue).astype(np.int16)
    key = (green > 65) & (dominance > 18)
    alpha = np.full(green.shape, 255, dtype=np.uint8)
    alpha[key] = np.clip(255 * (1 - (dominance[key] - 18) / 45), 0, 255).astype(np.uint8)
    spill = key & (alpha > 0)
    green[spill] = np.minimum(green[spill], np.maximum(red[spill], blue[spill]) + 10)
    output = np.dstack((rgba, alpha))
    return Image.fromarray(output, 'RGBA')


def save_portrait(key: str, source: Path) -> dict:
    image = green_key(source)
    master = MASTERS / 'extras' / f'portrait-{key}.png'
    master.parent.mkdir(parents=True, exist_ok=True)
    image.save(master)
    base = f'portrait-{key}'
    image.save(ART / f'{base}.webp', 'WEBP', quality=91, method=6)
    image.save(ART / f'{base}.avif', 'AVIF', quality=62, speed=6, max_threads=2)
    mobile = image.copy()
    mobile.thumbnail((640, 960), Image.Resampling.LANCZOS)
    mobile.save(ART / f'{base}-m.webp', 'WEBP', quality=85, method=6)
    mobile.save(ART / f'{base}-m.avif', 'AVIF', quality=55, speed=6, max_threads=2)
    alpha = image.getchannel('A').point(lambda value: 255 if value > 40 else 0)
    top = alpha.getbbox()[1]
    band = alpha.crop((0, top, image.width, top + int(image.height * .12))).getbbox()
    center = (band[0] + band[2]) // 2
    crop_w, crop_h = int(image.width * .44), int(image.width * .44 * 1.25)
    x0 = max(0, min(image.width - crop_w, center - crop_w // 2))
    y0 = max(0, top - int(crop_h * .08))
    face = image.crop((x0, y0, x0 + crop_w, y0 + crop_h)).resize((160, 200), Image.Resampling.LANCZOS)
    face.save(ART / f'{base}-face.webp', 'WEBP', quality=82, method=6)
    return {'key': key, 'source': str(source.relative_to(ROOT)), 'master': str(master.relative_to(ROOT)),
            'webp': (ART / f'{base}.webp').stat().st_size,
            'avif': (ART / f'{base}.avif').stat().st_size,
            'alpha_fraction': round(1 - float(np.array(image.getchannel('A')).mean()) / 255, 4)}


def save_cg(cg_id: str, source: Path) -> dict:
    master = MASTERS / 'cgs' / f'{cg_id}.png'
    master.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, master)
    image = Image.open(master).convert('RGB')
    name = f'cg-{cg_id}'
    image.save(ART / f'{name}.webp', 'WEBP', quality=91, method=6)
    image.save(ART / f'{name}.avif', 'AVIF', quality=62, speed=6, max_threads=2)
    thumb = ImageOps.fit(image, (480, 270), Image.Resampling.LANCZOS)
    thumb.save(ART / f'{name}-thumb.webp', 'WEBP', quality=82, method=6)
    thumb.save(ART / f'{name}-thumb.avif', 'AVIF', quality=55, speed=6, max_threads=2)
    return {'id': cg_id, 'source': str(source.relative_to(ROOT)), 'master': str(master.relative_to(ROOT)),
            'width': image.width, 'height': image.height,
            'webp': (ART / f'{name}.webp').stat().st_size}


def main() -> None:
    ART.mkdir(parents=True, exist_ok=True)
    result = {'portraits': [], 'cgs': []}
    for key, filename in EXTRA_SOURCES.items():
        source = EXPORTS / filename
        if not source.is_file():
            raise FileNotFoundError(source)
        result['portraits'].append(save_portrait(key, source))
    for cg_id, filename in CG_SOURCES.items():
        source = EXPORTS / filename
        if not source.is_file():
            raise FileNotFoundError(source)
        result['cgs'].append(save_cg(cg_id, source))

    manifest = json.loads(MANIFEST.read_text(encoding='utf-8-sig'))
    manifest['avif'] = sorted(set(manifest.get('avif', [])) | {
        *(f'portrait-{key}' for key in EXTRA_SOURCES),
        *(f'cg-{cg_id}' for cg_id in CG_SOURCES),
        *(f'cg-{cg_id}-thumb' for cg_id in CG_SOURCES),
    })
    manifest['mobile'] = sorted(set(manifest.get('mobile', [])) | {f'portrait-{key}' for key in EXTRA_SOURCES})
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    report = ROOT / 'artifacts/ui-fix-3/processed-art.json'
    report.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({
        'portraits': len(result['portraits']), 'cgs': len(result['cgs']),
        'portrait_webp_bytes': sum(row['webp'] for row in result['portraits']),
        'cg_webp_bytes': sum(row['webp'] for row in result['cgs']),
        'cg_master_bytes': sum((MASTERS / 'cgs' / f"{row['id']}.png").stat().st_size for row in result['cgs']),
    }, indent=2))


if __name__ == '__main__':
    main()
