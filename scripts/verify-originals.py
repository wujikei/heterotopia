"""Rebuild background pixels from retained ComfyUI sources without editing images."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageEnhance, __version__ as pillow_version

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCES = ROOT / 'docs/art/background-sources.json'
DEFAULT_REPORT = ROOT / 'docs/art/original-pixel-verification.json'


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def reconstruct(source: Path, steps: list[dict]) -> Image.Image:
    with Image.open(source) as original:
        pixels = original.copy()
    for step in steps:
        operation = step['operation']
        if operation == 'convert':
            pixels = pixels.convert(step['mode'])
        elif operation == 'brightness':
            pixels = ImageEnhance.Brightness(pixels).enhance(step['factor'])
        elif operation == 'color':
            pixels = ImageEnhance.Color(pixels).enhance(step['factor'])
        elif operation == 'blend':
            warm = Image.new(pixels.mode, pixels.size, tuple(step['color']))
            pixels = Image.blend(pixels, warm, step['alpha'])
        else:
            raise ValueError(f'Unsupported reconstruction operation: {operation}')
    return pixels


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sources', type=Path, default=DEFAULT_SOURCES)
    parser.add_argument('--source-dir', type=Path, help='Override the retained ComfyUI PNG directory')
    parser.add_argument('--report', type=Path, default=DEFAULT_REPORT)
    args = parser.parse_args()
    sources = json.loads(args.sources.read_text(encoding='utf-8-sig'))
    source_dir = args.source_dir or Path(sources['sourceDirectory'])
    manifest = json.loads((ROOT / 'src/data/art-manifest.json').read_text(encoding='utf-8-sig'))
    registered = {key: f'public/art-original/{value}' for key, value in manifest['originals'].items()}
    listed = {item['key']: item['published'] for item in sources['backgrounds']}
    coverage_matches = listed == registered and len(listed) == len(sources['backgrounds'])
    rows = []
    unique_sources = {}
    for item in sources['backgrounds']:
        row = {key: item[key] for key in ('key', 'sourceKey', 'source', 'steps', 'published')}
        source = source_dir / item['source']
        published = ROOT / item['published']
        try:
            row['sourceSha256'] = sha256(source)
            row['publishedSha256'] = sha256(published)
            row['sourceHashMatches'] = row['sourceSha256'] == item['sourceSha256']
            row['publishedHashMatches'] = row['publishedSha256'] == item['publishedSha256']
            expected = reconstruct(source, item['steps'])
            with Image.open(published) as result:
                row['size'] = list(result.size)
                row['mode'] = result.mode
                row['pixelIdentical'] = (result.size == expected.size and result.mode == expected.mode
                                         and result.tobytes() == expected.tobytes())
            row['publishedBytes'] = published.stat().st_size
            unique_sources[item['source']] = source.stat().st_size
            row['verified'] = all(row[key] for key in ('sourceHashMatches', 'publishedHashMatches', 'pixelIdentical'))
        except (OSError, ValueError, KeyError) as error:
            row['verified'] = False
            row['error'] = str(error)
        rows.append(row)
    report = {
        'sources': args.sources.resolve().relative_to(ROOT).as_posix(),
        'method': 'Pillow decode; reconstruct documented steps; compare mode, dimensions, full pixel buffers, and source/published SHA-256',
        'pillowVersion': pillow_version,
        'registeredCoverageMatches': coverage_matches,
        'checked': len(rows),
        'pixelIdentical': sum(row.get('pixelIdentical', False) for row in rows),
        'verified': sum(row['verified'] for row in rows),
        'directBackgrounds': sum(not row['steps'] for row in rows),
        'derivedBackgrounds': sum(bool(row['steps']) for row in rows),
        'uniqueSourcePngs': len(unique_sources),
        'uniqueSourcePngBytes': sum(unique_sources.values()),
        'publishedWebpBytes': sum(row.get('publishedBytes', 0) for row in rows),
        'rows': rows,
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(json.dumps({key: value for key, value in report.items() if key != 'rows'}, indent=2, ensure_ascii=False))
    if not coverage_matches or report['verified'] != report['checked']:
        raise SystemExit('Original background verification failed; inspect the report.')


if __name__ == '__main__':
    main()
