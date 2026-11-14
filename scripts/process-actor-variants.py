"""Rebuild reviewed costume/pose sprites and face-only expression composites.

Generated PNGs are immutable sources. Delivery annotations live next to the
review in docs/art/art-direction-2-sources.json. No local ComfyUI path is needed
to reproduce the transparent masters and browser formats.
"""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('compose', ROOT / 'scripts/compose-expressions.py')
COMPOSE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(COMPOSE)


def cutout(source: Path) -> Image.Image:
    rgb = np.array(Image.open(source).convert('RGB'), dtype=np.uint8)
    red, green, blue = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    dominance = green.astype(np.int16) - np.maximum(red, blue).astype(np.int16)
    keyed = (green > 35) & (dominance > 6)
    alpha = np.full(green.shape, 255, dtype=np.uint8)
    alpha[keyed] = np.clip(255 * (1 - (dominance[keyed] - 6) / 50), 0, 255).astype(np.uint8)
    spill = keyed & (alpha > 0)
    green[spill] = np.minimum(green[spill], np.maximum(red[spill], blue[spill]) + 2)
    rgb[alpha == 0] = 0
    return Image.fromarray(np.dstack((rgb, alpha))).resize((768, 1152), Image.Resampling.LANCZOS)


def expression(base: Image.Image, state: str, key: str) -> tuple[Image.Image, dict]:
    # Both delivered Shen poses keep his canonical head height and scale.
    # Register unchanged hair, then copy only the reviewed inner-face polygon.
    box = (192, 16, 576, 400) if key == 'xu' else (208, 28, 560, 380)
    crop = base.crop(box)
    canonical = Image.open(ROOT / f'resources/art-src/expressions/portrait-{key}-{state}.png').convert('RGBA').crop(box)
    template = COMPOSE.composite_reference(crop)
    hard = Image.new('L', crop.size)
    scale = crop.width / 352
    ImageDraw.Draw(hard).polygon([(round(x * scale), round(y * scale)) for x, y in COMPOSE.FACE_MASKS[key]], fill=255)
    mask = np.array(hard.filter(ImageFilter.GaussianBlur(6 * scale)), dtype=float) / 255
    mask[np.array(hard) == 0] = 0
    aligned, metrics = COMPOSE.register(template, COMPOSE.composite_reference(canonical), mask)
    ring = (mask > .15) & (mask < .55) & (template.min(axis=2) > 80)
    if ring.sum() > 10:
        shift = np.median(template[ring].astype(float) - aligned[ring].astype(float), axis=0)
        aligned = np.clip(aligned.astype(float) + np.clip(shift, -18, 18), 0, 255)
    blended = np.round(template * (1 - mask[..., None]) + aligned * mask[..., None]).astype(np.uint8)
    pixels = np.array(crop)
    pixels[..., :3][mask > 0] = blended[mask > 0]
    result = base.copy()
    result.paste(Image.fromarray(pixels), box[:2])
    before, after = np.array(base), np.array(result)
    changed = np.any(before[..., :3] != after[..., :3], axis=2)
    allowed = np.zeros(changed.shape, dtype=bool)
    allowed[box[1]:box[3], box[0]:box[2]] = mask > 0
    metrics.update(alpha_identical=bool(np.array_equal(before[..., 3], after[..., 3])),
                   changed_outside_face=int((changed & ~allowed).sum()), changed_pixels=int(changed.sum()))
    if not metrics['alpha_identical'] or metrics['changed_outside_face'] or not metrics['changed_pixels']:
        raise RuntimeError(f'Unsafe expression composite: {state}: {metrics}')
    return result, metrics


def main() -> None:
    spec = json.loads((ROOT / 'docs/art/art-direction-2-sources.json').read_text('utf-8-sig'))
    manifest_path = ROOT / 'src/data/art-manifest.json'
    manifest = json.loads(manifest_path.read_text('utf-8-sig'))
    master_folder = ROOT / 'resources/art-src/variants'
    master_folder.mkdir(parents=True, exist_ok=True)
    report = []
    for item in spec['sprites']:
        image = cutout(ROOT / item['source'])
        for state in ['default', *item.get('expressions', [])]:
            name = item['name'] + (f'-{state}' if state != 'default' else '')
            result, metrics = (image, {}) if state == 'default' else expression(image, state, item['name'].split('-')[1])
            master = master_folder / f'{name}.png'
            result.save(master)
            result.save(ROOT / f'public/art/{name}.webp', 'WEBP', quality=91, method=6)
            manifest.setdefault('masters', {})[name] = master.relative_to(ROOT).as_posix()
            report.append({'name': name, 'source': item['source'], 'metrics': metrics})
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', 'utf-8')
    output = ROOT / 'artifacts/art-direction-2'
    output.mkdir(parents=True, exist_ok=True)
    (output / 'compositing.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), 'utf-8')
    print(json.dumps({'sprites': len(report), 'expressions': [r for r in report if r['metrics']]}, indent=2))


if __name__ == '__main__':
    main()
