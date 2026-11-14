"""Build landscape composition and identity references for local ComfyUI CGs."""
import json
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts/ui-fix-3/cg-references'
OUT.mkdir(parents=True, exist_ok=True)
CAST = {
    'e1-blade': ('palace', ['xu', 'xua']),
    'e2-mercy': ('ruins', ['xu']),
    'e3-leave': ('river', ['xu']),
    'e4-names': ('ritual', ['xu', 'yu', 'quheng']),
    'e5-kunlun': ('light-river', ['xu', 'yu', 'tu', 'yuan', 'xua']),
    'e6-home': ('home', ['shen', 'tang']),
    's01-dream-boat': ('dream-boat', ['xu']),
    's02-first-crossing': ('river', ['xu', 'amao']),
    's03-ritual': ('ritual', ['xu', 'quheng']),
    's04-old-names': ('study', ['xu', 'quheng']),
    's05-mi-flute': ('light-river', ['mi', 'yu']),
    's06-snow-hands': ('cave', ['xu', 'yu', 'mi']),
    's07-light-river': ('light-river', ['xu', 'yuan']),
    's08-farewell': ('light-river', ['mi', 'shen', 'xu', 'yu']),
}
manifest = json.loads((ROOT / 'src/data/art-manifest.json').read_text(encoding='utf-8-sig'))
originals = manifest.get('originals', {})
records = []
for ident, (background, characters) in CAST.items():
    landscape = ImageOps.fit(Image.open(ROOT / f"public/art-original/{originals[background]}").convert('RGB'), (1408, 792), Image.Resampling.LANCZOS)
    landscape.save(OUT / f'{ident}-scene.png')
    count = len(characters)
    board = Image.new('RGB', (max(2, count) * 360, 720), '#e6e0d4')
    for i, key in enumerate(characters):
        suffix = '-v2' if key == 'tu' else '-v3' if key == 'xua' else ''
        im = Image.open(ROOT / f'public/art/portrait-{key}{suffix}.webp').convert('RGBA')
        im = im.crop((0, 0, im.width, round(im.height * .72)))
        im.thumbnail((360, 700), Image.Resampling.LANCZOS)
        board.paste(im, (i * 360 + (360-im.width)//2, 720-im.height), im)
    board.save(OUT / f'{ident}-cast.png')
    records.append({'cgId': ident, 'background': background, 'characters': characters,
                    'references': [str(OUT / f'{ident}-scene.png'), str(OUT / f'{ident}-cast.png')]})
(OUT / 'references.json').write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(records, ensure_ascii=False))
