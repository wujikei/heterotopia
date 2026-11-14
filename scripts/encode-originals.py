"""Store visually original artwork as pixel-identical lossless WebP."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
FOLDER = ROOT / 'public/art-original'
MANIFEST = ROOT / 'src/data/art-manifest.json'


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8-sig'))
    all_originals = manifest.get('originals', {})
    backgrounds = {name: filename for name, filename in all_originals.items() if not name.startswith('cg-')}
    retired = [filename for name, filename in all_originals.items() if name.startswith('cg-')]
    replacements: dict[str, str] = {}
    converted_pixel_verified = 0
    skipped_existing_webp = 0
    for name, filename in backgrounds.items():
        source = FOLDER / filename
        if source.suffix.lower() == '.webp':
            replacements[name] = filename
            skipped_existing_webp += 1
            continue
        destination = source.with_suffix('.webp')
        with Image.open(source) as original:
            pixels = original.copy()
            pixels.save(destination, 'WEBP', lossless=True, exact=True, method=6)
        with Image.open(destination) as result:
            pixel_exact = result.size == pixels.size and result.mode == pixels.mode and result.tobytes() == pixels.tobytes()
        if not pixel_exact:
            destination.unlink(missing_ok=True)
            raise RuntimeError(f'Lossless pixel verification failed: {name}')
        converted_pixel_verified += 1
        replacements[name] = destination.name

    manifest['originals'] = replacements
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    for filename in set(replacements.values()) | set(retired):
        source = FOLDER / Path(filename).with_suffix('.png').name
        if source.name != filename:
            source.unlink(missing_ok=True)
    total = sum((FOLDER / filename).stat().st_size for filename in replacements.values())
    for filename in retired:
        (FOLDER / filename).unlink(missing_ok=True)
        (FOLDER / Path(filename).with_suffix('.png').name).unlink(missing_ok=True)
    print(json.dumps({'originals': len(replacements), 'converted_pixel_verified': converted_pixel_verified,
                      'skipped_existing_webp': skipped_existing_webp,
                      'bytes': total, 'files': replacements}, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
