"""Re-encode existing art without changing its composition or source masters."""
from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'public' / 'art'
world = (ROOT / 'src/data/world.ts').read_text(encoding='utf-8')
characters = world.split('export const CHARACTERS:')[1].split('export const BACKGROUNDS:')[0]
keys = re.findall(r"key: '([^']+)'", characters)
portraits = [f"portrait-{key}{'-v2' if key == 'tu' else '-v3' if key == 'xua' else ''}" for key in keys]
backgrounds = sorted(p.stem for p in ART.glob('*.webp') if not p.stem.startswith('portrait-') and not p.stem.endswith('-thumb'))
report = []
for name in backgrounds + portraits:
    source = ART / f'{name}.webp'
    master = source
    if name in backgrounds:
        master = ROOT / 'resources/art-src/backgrounds' / source.name
        master.parent.mkdir(parents=True, exist_ok=True)
        if not master.exists():
            shutil.copy2(source, master)
    image = Image.open(master)
    destination = ART / f'{name}.avif'
    image.save(destination, 'AVIF', quality=55, speed=6, max_threads=2)
    if name in backgrounds:
        image.save(source, 'WEBP', quality=80, method=6)
    entry = {'name': name, 'source_webp': master.stat().st_size, 'webp': source.stat().st_size, 'avif': destination.stat().st_size}
    if name in portraits:
        mobile = image.resize((640, 960), Image.Resampling.LANCZOS)
        for extension, settings, budget in [
            ('avif', {'quality': 55, 'speed': 6, 'max_threads': 2}, 40 * 1024),
            ('webp', {'quality': 85, 'method': 6}, 60 * 1024),
        ]:
            output = ART / f'{name}-m.{extension}'
            while True:
                mobile.save(output, extension.upper(), **settings)
                if output.stat().st_size <= budget or settings['quality'] <= (43 if extension == 'avif' else 73):
                    break
                settings['quality'] -= 3
            entry[f'mobile_{extension}'] = output.stat().st_size
    report.append(entry)
    print(json.dumps(entry), flush=True)

manifest = {'avif': backgrounds + portraits, 'mobile': portraits}
(ROOT / 'src/data/art-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
output = ROOT / 'artifacts/perf/images.json'
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(report, indent=2), encoding='utf-8')
for category, names in [('backgrounds', backgrounds), ('portraits', portraits)]:
    group = [entry for entry in report if entry['name'] in names]
    print(category, {key: sum(entry.get(key, 0) for entry in group) for key in ['webp', 'avif', 'mobile_webp', 'mobile_avif']})
