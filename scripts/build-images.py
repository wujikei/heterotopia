"""Build lightweight variants from masters without changing the masters."""
from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]


def build_images(root: Path = ROOT, plan_only: bool = False, only: set[str] | None = None) -> dict:
    art = root / 'public/art'
    manifest_file = root / 'src/data/art-manifest.json'
    manifest = json.loads(manifest_file.read_text(encoding='utf-8-sig'))
    originals = manifest.get('originals', {})
    masters = manifest.get('masters', {})
    mobile_masters = manifest.get('mobileMasters', {})
    # Include delivered CGs and expressions, but never treat derived copies as
    # masters. Original mappings and other delivery metadata are preserved.
    names = sorted({path.stem for path in art.glob('*.webp')
                    if not path.stem.endswith(('-m', '-thumb', '-face'))} | set(originals) | set(masters))
    if only:
        unknown = only - set(names)
        if unknown:
            raise ValueError(f'Unknown art names: {sorted(unknown)}')
        names = [name for name in names if name in only]
    portraits = [name for name in names if name.startswith('portrait-')]
    report = []
    for name in names:
        source = art / f'{name}.webp'
        original = originals.get(name)
        master = root / 'public/art-original' / original if original else source
        cg_master = root / 'resources/art-src/cgs' / f'{name.removeprefix("cg-")}.png'
        if name in masters:
            master = root / masters[name]
        elif name.startswith('cg-') and cg_master.is_file():
            master = cg_master
        if original and not master.is_file():
            raise FileNotFoundError(f'Registered original missing: {master}')
        if name in masters and not master.is_file():
            raise FileNotFoundError(f'Registered master missing: {master}')
        if not original and name not in portraits and master == source:
            master = root / 'resources/art-src/backgrounds' / source.name
            if not master.exists():
                if not source.is_file():
                    raise FileNotFoundError(source)
                if not plan_only:
                    master.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(source, master)
                else:
                    master = source
        mobile_master = root / mobile_masters[name] if name in mobile_masters else None
        if mobile_master and not mobile_master.is_file():
            raise FileNotFoundError(f'Registered mobile master missing: {mobile_master}')
        if plan_only:
            report.append({'name': name, 'master': str(master.relative_to(root)),
                           'original': original, 'mobile': bool(mobile_master) or name in portraits,
                           'mobile_master': str(mobile_master.relative_to(root)) if mobile_master else None})
            continue
        with Image.open(master) as image:
            destination = art / f'{name}.avif'
            is_cg = name.startswith('cg-')
            image.save(destination, 'AVIF', quality=62 if is_cg else 55, speed=6, max_threads=2)
            # Existing portrait WebPs without a master retain their pixel data.
            if original or name not in portraits or name in masters:
                image.save(source, 'WEBP', quality=91 if is_cg else 85 if name in portraits else 80, method=6)
            entry = {'name': name, 'master': str(master.relative_to(root)),
                     'master_bytes': master.stat().st_size,
                     'webp': source.stat().st_size, 'avif': destination.stat().st_size}
            if is_cg:
                thumb = ImageOps.fit(image, (480, 270), Image.Resampling.LANCZOS)
                thumb.save(art / f'{name}-thumb.webp', 'WEBP', quality=82, method=6)
                thumb.save(art / f'{name}-thumb.avif', 'AVIF', quality=55, speed=6, max_threads=2)
            if name in portraits or mobile_master:
                if mobile_master:
                    with Image.open(mobile_master) as authored:
                        mobile = authored.convert('RGB')
                    entry['mobile_master'] = str(mobile_master.relative_to(root))
                else:
                    mobile = image.copy()
                    mobile.thumbnail((640, 960), Image.Resampling.LANCZOS)
                for extension, settings, budget in [
                    ('avif', {'quality': 55, 'speed': 6, 'max_threads': 2}, 40 * 1024),
                    ('webp', {'quality': 85, 'method': 6}, 60 * 1024),
                ]:
                    output = art / f'{name}-m.{extension}'
                    if mobile_master:
                        settings['quality'] = 62 if extension == 'avif' else 91
                    while True:
                        mobile.save(output, extension.upper(), **settings)
                        if mobile_master or output.stat().st_size <= budget or settings['quality'] <= (43 if extension == 'avif' else 73):
                            break
                        settings['quality'] -= 3
                    entry[f'mobile_{extension}'] = output.stat().st_size
            report.append(entry)
            print(json.dumps(entry), flush=True)

    if not plan_only:
        manifest['avif'] = sorted(set(manifest.get('avif', [])) | set(names))
        manifest['mobile'] = sorted(set(manifest.get('mobile', [])) | set(portraits) | set(mobile_masters))
        manifest_file.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
        output = root / 'artifacts/perf/images.json'
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(report, indent=2), encoding='utf-8')
    return {'images': report, 'preserved_fields': sorted(key for key in manifest if key not in ['avif', 'mobile'])}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--plan', action='store_true', help='Validate sources and print the plan without writing assets or manifest')
    parser.add_argument('--only', nargs='+', help='Rebuild only these art names')
    arguments = parser.parse_args()
    result = build_images(plan_only=arguments.plan, only=set(arguments.only) if arguments.only else None)
    print(json.dumps(result if arguments.plan else {'images': len(result['images']), 'preserved_fields': result['preserved_fields']}, indent=2))
