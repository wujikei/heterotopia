"""Build local OFL fonts covering every translated glyph; no runtime font CDN."""
from pathlib import Path
from urllib.request import urlretrieve
import hashlib
import json
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
FONT_URL = 'https://raw.githubusercontent.com/notofonts/noto-cjk/main/Serif/OTF/Japanese/NotoSerifCJKjp-Regular.otf'
CACHE = ROOT / 'artifacts/i18n/fonts/NotoSerifCJKjp-Regular.otf'
DEST = ROOT / 'public/fonts'
report = {}

def build(source, codes, filename):
    font = TTFont(source)
    font.recalcTimestamp = False
    missing = codes - set(font.getBestCmap())
    # Whitespace and zero-width typographic controls need no drawn glyph.
    missing -= {9, 10, 13, 0x200b, 0x200d, 0xfe0f}
    if missing:
        raise ValueError(f'{filename} lacks {"".join(map(chr, sorted(missing)))}')
    options = subset.Options()
    options.flavor = 'woff2'
    options.hinting = False
    options.layout_features = ['*']
    worker = subset.Subsetter(options=options)
    worker.populate(unicodes=codes)
    worker.subset(font)
    font.flavor = 'woff2'
    font.save(DEST / filename)
    data = (DEST / filename).read_bytes()
    report[filename] = {'glyphs': len(codes), 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest()}

def text(language):
    return ''.join(''.join(json.loads((ROOT / f'src/data/locales/{language}/{part}.json').read_text('utf-8')).values()) for part in ['ui', 'story'])

if not CACHE.exists():
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    urlretrieve(FONT_URL, CACHE)
latin = set(map(ord, text('en') + text('de')))
latin = {code for code in latin if code < 0x3000} | set(range(32, 127))
build(ROOT / 'resources/fonts/NotoSerifSC-Variable.ttf', latin, 'story-latin.woff2')
japanese = set(map(ord, text('ja') + '中文日本語语言异托邦戌媭雩芈沈辞唐瑾屈衡阿媪')) | set(range(32, 127))
build(CACHE, japanese, 'story-japanese.woff2')
(DEST / 'locales-manifest.json').write_text(json.dumps({'japaneseSource': FONT_URL, 'license': 'SIL Open Font License 1.1', 'fonts': report}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report, indent=2))
