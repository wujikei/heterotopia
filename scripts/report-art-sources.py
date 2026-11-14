"""Snapshot original ComfyUI PNG provenance without rewriting generation history."""
from __future__ import annotations

import ast
import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = Path('D:/Comfy-Desktop/ComfyUI-Shared/output/Qwen2.1/Codex')
OUTPUT = ROOT / 'docs/art/source-manifest.json'
EXPRESSION_SHEETS = {
    'shen': 'edit_00002_.png', 'xu': 'edit_00003_.png',
    'quheng': 'edit_00004_.png', 'xua': 'edit_00005_.png',
    'yu': 'edit_00006_.png', 'amao': 'edit_00007_.png',
    'tang': 'edit_00008_.png', 'yuan': 'edit_00009_.png',
}


def processor_maps() -> dict:
    tree = ast.parse((ROOT / 'scripts/process-ui3-art.py').read_text(encoding='utf-8-sig'))
    return {
        node.targets[0].id: ast.literal_eval(node.value)
        for node in tree.body
        if isinstance(node, ast.Assign) and isinstance(node.targets[0], ast.Name)
        and node.targets[0].id in {'CG_SOURCES', 'EXTRA_SOURCES'}
    }


def source_record(filename: str) -> dict:
    source = SOURCE_ROOT / filename
    with Image.open(source) as image:
        graph = json.loads(image.info['prompt'])
        nodes = list(graph.values())
        sampler = next(node['inputs'] for node in nodes if node['class_type'] == 'KSampler')
        encoder = next(node['inputs'] for node in nodes if node['class_type'] == 'TextEncodeQwenImage21')
        models = {
            field: node['inputs'][field]
            for node in nodes for field in ['unet_name', 'clip_name', 'vae_name']
            if field in node['inputs']
        }
        return {
            'source': source.as_posix(), 'sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
            'width': image.width, 'height': image.height,
            'workflow': 'edit' if filename.startswith('edit_') else 'multiref' if filename.startswith('multiref_') else 'txt2img',
            'seed': sampler['seed'], 'steps': sampler['steps'], 'cfg': sampler['cfg'],
            'sampler': sampler['sampler_name'], 'scheduler': sampler['scheduler'],
            'models': models,
            'references': [node['inputs']['image'] for node in nodes if node['class_type'] == 'LoadImage'],
            'prompt': encoder['prompt'], 'negativePrompt': encoder.get('negative_prompt', ''),
        }


def main() -> None:
    maps = processor_maps()
    expressions = []
    for key, filename in EXPRESSION_SHEETS.items():
        proof_path = ROOT / f'artifacts/ui-fix-3/proofs/{key}-composition.json'
        proof = json.loads(proof_path.read_text(encoding='utf-8-sig'))
        if Path(proof['sheet']).name != filename:
            raise ValueError(f'Expression source drift: {key}')
        expressions.append({
            'character': key, **source_record(filename),
            'originalPortrait': proof['source'],
            'proof': proof_path.relative_to(ROOT).as_posix(),
            'states': list(proof['states']),
            'faceOnly': proof['face_only'],
            'alphaIdentical': all(value['alpha_identical'] for value in proof['states'].values()),
            'changedOutsideFace': sum(value['changed_outside_face'] for value in proof['states'].values()),
        })
    report = {
        'sourceRoot': SOURCE_ROOT.as_posix(),
        'metadataAuthority': 'Original PNG prompt metadata; exact historical prompts and seeds, not the revised planning prompts.',
        'reproduce': 'python scripts/report-art-sources.py; node --import tsx scripts/report-expressions.mjs',
        'processors': ['scripts/compose-expressions.py', 'scripts/process-ui3-art.py'],
        'historicalPromptNotes': [
            {'id': 's06-snow-hands', 'note': 'The source PNG used the old phrase 三个楚地少年 and also explicitly 蒙眼少女. Current art constraint is 三个孩子; 雩 remains a girl with her blindfold intact.'},
            {'id': 'daoist', 'note': 'The source PNG used an invented age 40–50. The revised planning prompt removes that number; the script calls him 老人. Do not treat the historical prompt age as story canon.'},
        ],
        'expressions': expressions,
        'cgs': [{'id': key, **source_record(filename)} for key, filename in maps['CG_SOURCES'].items()],
        'extras': [{'character': key, **source_record(filename)} for key, filename in maps['EXTRA_SOURCES'].items()],
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'expressionSheets': len(expressions), 'newExpressions': sum(len(row['states']) for row in expressions), 'cgs': len(report['cgs']), 'extras': len(report['extras'])}))


if __name__ == '__main__':
    main()
