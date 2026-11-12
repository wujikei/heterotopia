"""Crop small head-and-shoulders thumbnails (portrait-<key>-face.webp) for 人物志 cards.

Run from the repo root: python scripts/make_faces.py
"""
from pathlib import Path
from PIL import Image

ART = Path(__file__).resolve().parents[1] / "public" / "art"
KEYS = ['shen', 'tang', 'song', 'xu', 'amao', 'elder', 'quheng', 'chang', 'yu', 'mi', 'xua', 'yuan', 'tu', 'wuyang']


def source(key: str) -> Path:
    suffix = '-v2' if key == 'tu' else '-v3' if key == 'xua' else ''
    return ART / f"portrait-{key}{suffix}.webp"


for key in KEYS:
    image = Image.open(source(key)).convert('RGBA')
    width, height = image.size
    solid = image.getchannel('A').point(lambda a: 255 if a > 40 else 0)
    top = solid.getbbox()[1]
    band = solid.crop((0, top, width, top + int(height * 0.12))).getbbox()
    center = (band[0] + band[2]) // 2
    crop_w = int(width * 0.44)
    crop_h = int(crop_w * 1.25)
    x0 = max(0, min(width - crop_w, center - crop_w // 2))
    y0 = max(0, top - int(crop_h * 0.08))
    face = image.crop((x0, y0, x0 + crop_w, y0 + crop_h)).resize((160, 200), Image.LANCZOS)
    face.save(ART / f"portrait-{key}-face.webp", quality=82, method=6)
    print(f"portrait-{key}-face.webp")
