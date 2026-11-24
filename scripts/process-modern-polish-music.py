"""Master the two local ACE-Step cues using the existing audio pipeline."""
from hashlib import sha256
import json
from pathlib import Path

import numpy as np

from produce_audio import DEST, ROOT, SR, encode, run, write_wave

OUTPUT = ROOT / 'artifacts/modern-polish/music'


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def write(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')


def decode(path):
    raw = run(['ffmpeg', '-v', 'error', '-i', str(path), '-ar', str(SR), '-ac', '2', '-f', 'f32le', '-']).stdout
    return np.frombuffer(raw, dtype='<f4').reshape(-1, 2)


def main():
    jobs = read(ROOT / 'docs/art/modern-polish-generation.json')['music']['jobs']
    catalog_path = ROOT / 'src/data/soundtrack.json'
    manifest_path = DEST / 'manifest.json'
    catalog, manifest = read(catalog_path), read(manifest_path)
    evidence = []
    for job in jobs:
        if 'id' not in job:
            continue
        id = job['id']
        settings = job['settings']
        source = ROOT / job['source']
        source_hash = sha256(source.read_bytes()).hexdigest()
        if source_hash != job['sourceSHA256']:
            raise ValueError(f'Source changed: {source}')
        samples = decode(source)
        if not np.isfinite(samples).all() or abs(len(samples) / SR - settings['duration']) > .2:
            raise ValueError(f'Incomplete audio: {source}')
        overlap = round(4 * 60 / settings['bpm'] * SR)
        trimmed = samples[:round(job['trimAtSeconds'] * SR)]
        theta = np.linspace(0, np.pi / 2, overlap, endpoint=False)[:, None]
        blend = trimmed[-overlap:] * np.cos(theta) + trimmed[:overlap] * np.sin(theta)
        loop = np.concatenate([trimmed[overlap:-overlap], blend])
        duration = len(loop) / SR
        wav = OUTPUT / f'{id}-loop.wav'
        write_wave(wav, loop)
        file = f'music-{id}.mp3'
        entry = encode(wav, file, job['title'], 'music', loop=True, peak=-2.5, duration=duration)
        runtime = DEST / file
        decoded = decode(runtime)
        seam = float(np.max(np.abs(decoded[-1] - decoded[0])))
        if seam > .025 or abs(len(decoded) / SR - duration) > .1 or entry['truePeakDB'] > -2:
            raise ValueError(f'Loop seam, duration or peak is outside spec: {file}')
        track = {'id': id, 'title': job['title'], 'subtitle': job['subtitle'], 'bpm': settings['bpm'],
                 'keyscale': settings['keyscale'], 'file': file, 'seconds': entry['seconds']}
        catalog = [item for item in catalog if item['id'] != id] + [track]
        manifest['files'] = [item for item in manifest['files'] if item['file'] != file] + [entry]
        evidence.append({
            **entry, 'sourceSHA256': source_hash,
            'wavSHA256': sha256(wav.read_bytes()).hexdigest(), 'sha256': sha256(runtime.read_bytes()).hexdigest(),
            'sourceSeconds': len(samples) / SR, 'trimAtSeconds': job['trimAtSeconds'],
            'overlapSeconds': overlap / SR, 'loopSeamAmplitude': seam, 'sampleRate': SR,
        })
    write(catalog_path, catalog)
    write(manifest_path, manifest)
    write(ROOT / 'docs/art/modern-polish-audio.json', evidence)


if __name__ == '__main__':
    main()
