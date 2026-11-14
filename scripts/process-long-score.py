"""Master only the three long ACE-Step themes; leave the other 48 files intact.

Requires the recorded local FLACs in artifacts/audio-masters, numpy and FFmpeg.
Historical short-theme prompts remain in audio-prompts.json.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np

from produce_audio import ROOT, SR, WORK, encode, run, write_wave


def main() -> None:
    jobs_path = ROOT / 'docs/art/art-direction-4-music-jobs.json'
    jobs = json.loads(jobs_path.read_text('utf-8'))
    catalog_path = ROOT / 'src/data/soundtrack.json'
    manifest_path = ROOT / 'public/audio/manifest.json'
    catalog = json.loads(catalog_path.read_text('utf-8'))
    manifest = json.loads(manifest_path.read_text('utf-8'))
    WORK.mkdir(parents=True, exist_ok=True)
    reports = []
    for job in jobs:
        master = ROOT / job['master']
        if hashlib.sha256(master.read_bytes()).hexdigest() != job['sha256']:
            raise ValueError(f'Source changed: {master}')
        data = run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', str(master),
                    '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-']).stdout
        samples = np.frombuffer(data, dtype='<f4').reshape(-1, 2).astype(np.float64)
        if not np.isfinite(samples).all() or not 149 <= len(samples) / SR <= 151:
            raise ValueError(f'Incomplete or invalid master: {master}')
        overlap = round(4 * 60 / job['bpm'] * SR)
        theta = np.linspace(0, np.pi / 2, overlap, endpoint=False)[:, None]
        blend = samples[-overlap:] * np.cos(theta) + samples[:overlap] * np.sin(theta)
        loop = np.concatenate([samples[overlap:-overlap], blend])
        duration = len(loop) / SR
        wav = WORK / f"{job['id']}-long-loop.wav"
        write_wave(wav, loop)
        track = next(track for track in catalog if track['id'] == job['id'])
        info = encode(wav, track['file'], track['title'], 'music', True, duration=duration)
        decoded = run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', str(ROOT / 'public/audio' / track['file']),
                       '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-']).stdout
        checked = np.frombuffer(decoded, dtype='<f4').reshape(-1, 2)
        seam = float(np.max(np.abs(checked[-1] - checked[0])))
        if seam > .025 or abs(len(checked) / SR - duration) > .1:
            raise ValueError(f'Loop discontinuity or duration mismatch: {track["file"]}')
        seconds = round(duration, 5)
        track['seconds'] = seconds
        previous = next(i for i, item in enumerate(manifest['files']) if item['file'] == track['file'])
        manifest['files'][previous] = info
        report = {**info, 'id': job['id'], 'sourceSeconds': len(samples) / SR,
                  'overlapSeconds': overlap / SR, 'loopSeamAmplitude': seam,
                  'sourceSHA256': job['sha256'],
                  'sha256': hashlib.sha256((ROOT / 'public/audio' / track['file']).read_bytes()).hexdigest()}
        reports.append(report)
        job['accepted'] = True
        job['runtime'] = f"public/audio/{track['file']}"
        job['runtimeSeconds'] = seconds
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', 'utf-8')
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', 'utf-8')
    jobs_path.write_text(json.dumps(jobs, ensure_ascii=False, indent=2) + '\n', 'utf-8')
    (ROOT / 'docs/art/art-direction-4-audio.json').write_text(json.dumps(reports, ensure_ascii=False, indent=2) + '\n', 'utf-8')


if __name__ == '__main__':
    main()
