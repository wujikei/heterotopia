"""Bundle locally served, SIL-OFL Chinese fonts for offline play.

- Noto Serif SC: story text and UI (story-serif-*.woff2)
- LXGW WenKai (霞鹜文楷): inner monologue and handwritten accents (story-hand-regular.woff2).
  Subset to WOFF2 solely for web delivery, as allowed by its OFL additional permission.
"""
from __future__ import annotations
import urllib.request
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "resources" / "fonts"
CACHE.mkdir(parents=True, exist_ok=True)
DEST = ROOT / "public" / "fonts"
DEST.mkdir(parents=True, exist_ok=True)
SOURCE = CACHE / "NotoSerifSC-Variable.ttf"
URL = "https://raw.githubusercontent.com/google/fonts/main/ofl/notoserifsc/NotoSerifSC%5Bwght%5D.ttf"
if not SOURCE.exists():
    print("Downloading Noto Serif SC (SIL Open Font License).", flush=True)
    urllib.request.urlretrieve(URL, SOURCE)
license_dest = DEST / "NotoSerifSC-OFL.txt"
if not license_dest.exists():
    urllib.request.urlretrieve("https://raw.githubusercontent.com/google/fonts/main/ofl/notoserifsc/OFL.txt", license_dest)

HAND_SOURCE = CACHE / "LXGWWenKai-Regular.ttf"
HAND_URL = "https://github.com/lxgw/LxgwWenKai/releases/download/v1.520/LXGWWenKai-Regular.ttf"
if not HAND_SOURCE.exists():
    print("Downloading LXGW WenKai (SIL Open Font License).", flush=True)
    urllib.request.urlretrieve(HAND_URL, HAND_SOURCE)
hand_license = DEST / "LXGWWenKai-OFL.txt"
if not hand_license.exists():
    urllib.request.urlretrieve("https://raw.githubusercontent.com/lxgw/LxgwWenKai/main/OFL.txt", hand_license)

text = (ROOT / "public" / "原著剧本-V6.txt").read_text(encoding="utf-8")
for path in (ROOT / "src").rglob("*"):
    if path.suffix in {".ts", ".tsx", ".css"}:
        text += path.read_text(encoding="utf-8")
text += "".join(chr(n) for n in range(32, 127))
text += "〇一二三四五六七八九十百千万序章启程续梦异托邦绘卷人物志手记存档读档归来回溯设置正在载入魂兮归来阅尽终"

for weight, name in [(400, "regular"), (600, "semibold")]:
    font = TTFont(SOURCE)
    font = instantiateVariableFont(font, {"wght": weight}, inplace=True)
    options = subset.Options()
    options.flavor = "woff2"
    options.desubroutinize = True
    options.hinting = False
    worker = subset.Subsetter(options=options)
    worker.populate(text=text)
    worker.subset(font)
    font.flavor = "woff2"
    path = DEST / f"story-serif-{name}.woff2"
    font.save(path)
    print(f"Saved {path.name}: {path.stat().st_size // 1024} KB", flush=True)

hand = TTFont(HAND_SOURCE)
options = subset.Options()
options.flavor = "woff2"
options.desubroutinize = True
options.hinting = False
options.layout_features = ["*"]
worker = subset.Subsetter(options=options)
worker.populate(text=text)
worker.subset(hand)
hand.flavor = "woff2"
path = DEST / "story-hand-regular.woff2"
hand.save(path)
print(f"Saved {path.name}: {path.stat().st_size // 1024} KB", flush=True)
