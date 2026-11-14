"""Record delivered CG generations from PNG metadata and preserve their exact inputs."""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
REFERENCES = ROOT / 'resources/art-src/references/art-direction-1'


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def record(name: str, variant: str, master_file: str, reference_input: Path | None) -> dict:
    master = ROOT / master_file
    with Image.open(master) as image:
        graph = json.loads(image.info['prompt'])
        nodes = list(graph.values())
        sampler = next(n['inputs'] for n in nodes if n['class_type'] == 'KSampler')
        encoder = next(n['inputs'] for n in nodes if n['class_type'] == 'TextEncodeQwenImage21')
        references = []
        for node in nodes:
            if node['class_type'] != 'LoadImage':
                continue
            filename = node['inputs']['image']
            destination = REFERENCES / filename
            if not destination.exists():
                if not reference_input:
                    raise FileNotFoundError(f'Missing exact generation reference: {destination}')
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(reference_input / filename, destination)
            references.append({'comfyName': filename, 'file': destination.relative_to(ROOT).as_posix(), 'sha256': digest(destination)})
        return {
            'name': name, 'variant': variant, 'master': master_file, 'sha256': digest(master),
            'width': image.width, 'height': image.height, 'references': references,
            'seed': sampler['seed'], 'steps': sampler['steps'], 'cfg': sampler['cfg'],
            'sampler': sampler['sampler_name'], 'scheduler': sampler['scheduler'],
            'models': {field: n['inputs'][field] for n in nodes for field in ['unet_name', 'clip_name', 'vae_name'] if field in n['inputs']},
            'prompt': encoder['prompt'], 'negativePrompt': encoder.get('negative_prompt', ''),
        }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reference-input', type=Path, help='Actual ComfyUI input directory, only needed for first import')
    args = parser.parse_args()
    manifest = json.loads((ROOT / 'src/data/art-manifest.json').read_text(encoding='utf-8'))
    jobs = json.loads((ROOT / 'docs/art/art-direction-1-jobs.json').read_text(encoding='utf-8'))
    accepted = {(j['name'], j['variant']): j for j in jobs if j['accepted']}
    records = []
    for field, variant in [('masters', 'landscape'), ('mobileMasters', 'portrait')]:
        for name, file in manifest[field].items():
            item = record(name, variant, file, args.reference_input)
            receipt = accepted[(name, variant)]
            item.update({key: receipt[key] for key in ['promptId', 'output', 'workflow']})
            records.append(item)
    result = {
        'batch': 'art-direction-1', 'tool': 'Local ComfyUI / Qwen-Image 2.1',
        'authority': 'Actual PNG prompt metadata and exact uploaded reference bytes; historical records are retained separately.',
        'reproduceRecord': 'python scripts/record-cg-sources.py',
        'buildDelivery': 'python scripts/build-images.py --only ' + ' '.join(manifest['mobileMasters']),
        'images': records,
    }
    (ROOT / 'docs/art/art-direction-1-sources.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'accepted': len(records), 'references': len(list(REFERENCES.glob('*')))}))


if __name__ == '__main__':
    main()
