"""Rebuild the reviewed prop masters from immutable local Qwen PNGs.

Only extraction, matched jade cuts, and bamboo-slip typesetting are composed.
The first nine unknown names are never invented; only 衡 is readable.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageEnhance, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'resources/art-src/props'


def cutout(source: Path) -> Image.Image:
    rgb = np.array(Image.open(source).convert('RGB'), dtype=np.float32)
    red, green, blue = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    dominance = np.minimum(red, blue) - green
    # Magenta keying preserves celadon jade, bone highlights and brown wood.
    alpha = np.clip((32 - dominance) / 22, 0, 1)
    spill = np.maximum(dominance - 3, 0) * alpha
    rgb[..., 0] -= spill
    rgb[..., 2] -= spill
    if source.stem == 'jade':
        # The key is warmer than pure magenta. Its red component can remain
        # on nearly opaque celadon edge pixels after ordinary chroma removal.
        edge = (cv2.distanceTransform((alpha > .6).astype('uint8'), cv2.DIST_L2, 3) <= 3) & (alpha > 0)
        rgb[..., 0][edge] = np.minimum(rgb[..., 0][edge], rgb[..., 1][edge] + 16)
        rgb[..., 2][edge] = np.minimum(rgb[..., 2][edge], rgb[..., 1][edge] + 16)
    rgba = np.dstack([np.clip(rgb, 0, 255), alpha * 255]).astype('uint8')
    return Image.fromarray(rgba)


def centered(image: Image.Image, extent: int = 820) -> Image.Image:
    content = image.crop(image.getbbox())
    content = ImageOps.contain(content, (extent, extent), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (1024, 1024))
    canvas.alpha_composite(content, ((1024 - content.width) // 2, (1024 - content.height) // 2))
    return canvas


def jade_parts(jade: Image.Image) -> dict[str, Image.Image]:
    assert jade.size == (1024, 1024)
    rgba = np.array(jade)
    y, x = np.mgrid[:1024, :1024]
    tail_cut = 350 + (y - 512) * .10
    head_cut = 730 - (y - 512) * .10
    masks = {
        'tail': x < tail_cut - 3,
        'body': (x > tail_cut + 3) & (x < head_cut - 3),
        'head': x > head_cut + 3,
    }
    parts = {}
    joined = Image.new('RGBA', jade.size)
    for name, mask in masks.items():
        part = rgba.copy()
        part[..., 3] = np.where(mask, part[..., 3], 0)
        image = Image.fromarray(part)
        joined.alpha_composite(image)
        parts[f'prop-jade-{name}'] = centered(image)
    parts['prop-jade-joined'] = joined
    return parts


def name_slips(source: Image.Image) -> Image.Image:
    strip = source.crop(source.getbbox()).resize((66, 670), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (1024, 1024))
    # A shipped OFL font, independent of the machine's installed Chinese fonts.
    font = ImageFont.truetype(str(ROOT / 'resources/fonts/NotoSerifSC-Variable.ttf'), 52)
    angles = [-1.2, .8, -.4, 1.1, -.6, .6, -1, .3, 1, -.5]
    for index, angle in enumerate(angles):
        item = ImageEnhance.Brightness(strip).enhance(.77 + index * .024)
        marks = Image.new('RGBA', item.size)
        draw = ImageDraw.Draw(marks)
        if index == 9:
            # This is a name and a separate added stroke, never a strikeout.
            draw.text((33, 161), '衡', font=font, anchor='mt', fill=(54, 42, 25, 220), stroke_width=0)
            draw.line([(48, 225), (62, 225)], fill=(61, 42, 25, 220), width=2)
            draw.ellipse((60, 223, 64, 228), fill=(45, 34, 23, 215))
        else:
            # Worn incisions, no legible invented character names.
            for row in range(3):
                y = 160 + row * 70 + (index % 3) * 4
                x = 22 + (index * 7 + row * 3) % 18
                draw.line([(x, y), (x + 3, y + 17), (x - 2, y + 32)], fill=(68, 52, 31, 110), width=2)
                draw.line([(x - 8, y + 10), (x + 9, y + 9)], fill=(68, 52, 31, 80), width=1)
        item = Image.alpha_composite(item.convert('RGBA'), marks)
        item = item.rotate(angle, Image.Resampling.BICUBIC, expand=True)
        x = 65 + index * 83 + (45 if index >= 5 else 0)
        y = 168 + [0, 9, -6, 3, 12, 5, -4, 8, 1, -7][index]
        canvas.alpha_composite(item, (x, y))
    return canvas


def bone_cracks(bone: Image.Image) -> Image.Image:
    """Retouch one incidental model fissure into two stable memory branches."""
    rgb = np.array(bone.convert('RGB'))
    alpha = np.array(bone.getchannel('A'))
    mask = Image.new('L', bone.size)
    # Remove only the generated central fissure; preserve the silhouette,
    # polished edges and all the surrounding painted bone texture.
    ImageDraw.Draw(mask).line([(532, 270), (538, 320), (535, 350), (537, 380), (524, 420), (526, 446), (518, 485), (519, 539), (513, 573), (511, 592), (516, 612), (522, 631), (525, 669), (520, 708), (519, 741), (510, 774), (511, 815), (516, 855)], fill=255, width=52)
    mask = np.where(alpha > 240, np.array(mask), 0).astype('uint8')
    # Borrow nearby painted grain, then blend gradients into the bone. The
    # opacity check keeps the magenta key out of the narrowing bottom tip.
    donor = rgb.copy()
    for shift in [-35, 55]:
        valid = np.roll(alpha, -shift, axis=1) > 250
        donor[valid] = np.roll(rgb, -shift, axis=1)[valid]
    x, y, width, height = cv2.boundingRect(mask)
    repaired = Image.fromarray(cv2.seamlessClone(
        donor, rgb, mask, (x + width // 2, y + height // 2), cv2.NORMAL_CLONE,
    )).convert('RGBA')
    repaired.putalpha(bone.getchannel('A'))
    marks = Image.new('RGBA', bone.size)
    draw = ImageDraw.Draw(marks)
    branches = [
        [(515, 573), (490, 533), (466, 506), (474, 480), (440, 444), (432, 411), (403, 390)],
        [(515, 573), (548, 608), (540, 641), (565, 675), (550, 715), (560, 744)],
    ]
    for path in branches:
        draw.line([(x + 1, y) for x, y in path], fill=(255, 244, 208, 140), width=3, joint='curve')
        draw.line(path, fill=(103, 78, 48, 150), width=2, joint='curve')
    return Image.alpha_composite(repaired, marks)


def build() -> dict:
    spec = json.loads((ROOT / 'docs/art/art-direction-3-sources.json').read_text('utf-8'))
    sources = {}
    for entry in spec['sources']:
        file = ROOT / entry['source']
        assert hashlib.sha256(file.read_bytes()).hexdigest() == entry['sha256'], file
        sources[entry['id']] = cutout(file)
    images = {f'prop-{name}': sources[name] for name in ['map', 'birds', 'bone', 'flute-old', 'flute-mi', 'flute-mi-broken']}
    images['prop-bone'] = bone_cracks(sources['bone'])
    images.update(jade_parts(sources['jade']))
    images['prop-names'] = name_slips(sources['bamboo-slip'])
    DEST.mkdir(parents=True, exist_ok=True)
    report = {}
    for name, image in images.items():
        file = DEST / f'{name}.png'
        image.save(file, optimize=True)
        alpha = np.array(image.getchannel('A'))
        assert np.count_nonzero(alpha == 0) > 100000, name
        assert not np.any(alpha[0]) and not np.any(alpha[-1]), f'{name}: touches a canvas edge'
        report[name] = {'master': str(file.relative_to(ROOT)).replace('\\', '/'), 'size': image.size,
                        'sha256': hashlib.sha256(file.read_bytes()).hexdigest(), 'bytes': file.stat().st_size}
    return report


if __name__ == '__main__':
    report = build()
    output = ROOT / 'artifacts/art-direction-3/masters.json'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2), 'utf-8')
    print(json.dumps(report, indent=2))
