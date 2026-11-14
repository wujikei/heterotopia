"""Export the reviewed Qwen time variants, retaining every original RGB pixel."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import subprocess
import sys

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    jobs = json.loads((ROOT / 'docs/art/art-direction-4-jobs.json').read_text('utf-8'))
    manifest_path = ROOT / 'src/data/art-manifest.json'
    manifest = json.loads(manifest_path.read_text('utf-8-sig'))
    report = []
    for job in jobs:
        if not job['accepted']:
            raise ValueError(f"Unreviewed background: {job['name']}")
        name = job['name']
        source = ROOT / job['source']
        if hashlib.sha256(source.read_bytes()).hexdigest() != job['sha256']:
            raise ValueError(f'Source changed: {source}')
        destination = ROOT / 'public/art-original' / f'{name}.webp'
        with Image.open(source) as image:
            pixels = image.convert('RGB')
            pixels.save(destination, 'WEBP', lossless=True, exact=True, method=6)
            thumb = ImageOps.fit(pixels, (480, 270), Image.Resampling.LANCZOS)
            thumb.save(ROOT / 'public/art' / f'{name}-thumb.webp', 'WEBP', quality=82, method=6)
            thumb.save(ROOT / 'public/art' / f'{name}-thumb.avif', 'AVIF', quality=55, speed=6, max_threads=2)
        with Image.open(destination) as decoded:
            assert decoded.size == pixels.size and decoded.convert('RGB').tobytes() == pixels.tobytes(), name
        manifest['originals'][name] = destination.name
        manifest.setdefault('masters', {})[name] = job['source']
        manifest['avif'] = sorted(set(manifest['avif']) | {name, f'{name}-thumb'})
        report.append({'name': name, 'pixelExact': True, 'dimensions': list(pixels.size),
                       'sourceSHA256': job['sha256'], 'originalBytes': destination.stat().st_size})
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', 'utf-8')
    subprocess.run([sys.executable, str(ROOT / 'scripts/build-images.py'), '--only',
                    *[job['name'] for job in jobs]], check=True, cwd=ROOT)
    report_path = ROOT / 'docs/art/art-direction-4-backgrounds.json'
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', 'utf-8')
    print(json.dumps({'pixelVerified': len(report), 'originals': len(manifest['originals'])}))


if __name__ == '__main__':
    main()
