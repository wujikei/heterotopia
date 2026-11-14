"""Supply four UI glyphs absent from the original font subsets, offline."""
from pathlib import Path
import shutil
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
CHARS = '式笺赭较'
hand = ROOT / 'resources/fonts/LXGWWenKai-Regular.ttf'
hand_master = ROOT / 'resources/fonts/web-masters/relic-hand-source.woff2'
for source, output in [
    (ROOT / 'resources/fonts/NotoSerifSC-Variable.ttf', 'story-relics-serif.woff2'),
    (hand_master if hand_master.exists() else hand, 'story-relics-hand.woff2'),
]:
    font = TTFont(source)
    font.recalcTimestamp = False
    assert set(map(ord, CHARS)) <= set(font.getBestCmap())
    options = subset.Options()
    options.flavor = 'woff2'
    options.hinting = False
    worker = subset.Subsetter(options=options)
    worker.populate(text=CHARS)
    worker.subset(font)
    font.flavor = 'woff2'
    destination = ROOT / 'public/fonts' / output
    font.save(destination)
    print(output, destination.stat().st_size)
    if output.endswith('hand.woff2') and not hand_master.exists():
        shutil.copy2(destination, hand_master)
