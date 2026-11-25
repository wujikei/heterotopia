"""Master local ACE-Step cues using the game's existing audio pipeline."""
from argparse import ArgumentParser
from hashlib import sha256
import json
from pathlib import Path

import numpy as np

from produce_audio import DEST, ROOT, SR, encode, run, write_wave

ART_DOCS = ROOT / 'docs/art'


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def write(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')


def decode(path):
    raw = run(['ffmpeg', '-v', 'error', '-i', str(path), '-ar', str(SR), '-ac', '2', '-f', 'f32le', '-']).stdout
    return np.frombuffer(raw, dtype='<f4').reshape(-1, 2)


def main(plan_path, report_path):
    jobs = read(plan_path)['music']['jobs']
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
        start = job.get('startAtSeconds', 0)
        stop = job['trimAtSeconds']
        if not 0 <= start < stop <= len(samples) / SR or (stop - start) * SR <= 2 * overlap:
            raise ValueError(f'Invalid loop bounds: {source}')
        trimmed = samples[round(start * SR):round(stop * SR)]
        theta = np.linspace(0, np.pi / 2, overlap, endpoint=False)[:, None]
        blend = trimmed[-overlap:] * np.cos(theta) + trimmed[:overlap] * np.sin(theta)
        loop = np.concatenate([trimmed[overlap:-overlap], blend])
        search = round(job.get('seamSearchSeconds', 0) * SR)
        if search:
            # Start the encoded loop at a quiet stereo crossing near the downbeat.
            peaks = np.abs(loop[:search + 1]).max(axis=1)
            offset = int(np.argmin(np.maximum(peaks[:-1], peaks[1:]))) + 1
            loop = np.roll(loop, -offset, axis=0)
        duration = len(loop) / SR
        wav = source.with_name(f'{id}-loop.wav')
        write_wave(wav, loop)
        file = f'music-{id}.mp3'
        entry = encode(wav, file, job['title'], 'music', loop=True, peak=-2.5, duration=duration)
        runtime = DEST / file
        decoded = decode(runtime)
        seam = float(np.max(np.abs(decoded[-1] - decoded[0])))
        if seam > .025 or abs(len(decoded) / SR - duration) > .1 or entry['truePeakDB'] > -2:
            raise ValueError(f'Loop {file}: seam {seam:.4f}, decoded {len(decoded) / SR:.3f}s, peak {entry["truePeakDB"]} dBTP')
        track = {'id': id, 'title': job['title'], 'subtitle': job['subtitle'], 'bpm': settings['bpm'],
                 'keyscale': settings['keyscale'], 'file': file, 'seconds': entry['seconds']}
        for entries, key, replacement in ((catalog, 'id', track), (manifest['files'], 'file', entry)):
            index = next((i for i, item in enumerate(entries) if item[key] == replacement[key]), len(entries))
            entries[index:index + 1] = [replacement]
        evidence.append({
            **entry, 'sourceSHA256': source_hash,
            'wavSHA256': sha256(wav.read_bytes()).hexdigest(), 'sha256': sha256(runtime.read_bytes()).hexdigest(),
            **({'trimStartSeconds': start} if start else {}),
            'sourceSeconds': len(samples) / SR, 'trimAtSeconds': job['trimAtSeconds'],
            'overlapSeconds': overlap / SR, 'loopSeamAmplitude': seam, 'sampleRate': SR,
        })
    write(catalog_path, catalog)
    write(manifest_path, manifest)
    write(report_path, evidence)


if __name__ == '__main__':
    parser = ArgumentParser(description=__doc__)
    parser.add_argument('--plan', type=Path, default=ART_DOCS / 'modern-polish-generation.json')
    parser.add_argument('--report', type=Path, default=ART_DOCS / 'modern-polish-audio.json')
    args = parser.parse_args()
    main(args.plan, args.report)
