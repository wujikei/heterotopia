import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import type { Scene } from '../src/types';

const root = fileURLToPath(new URL('..', import.meta.url));
const sha = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const fixed = {
  'src/data/story.json': 'd7220df13a44fd56e1e476ff76a233b6b8758060d7342e7bf7d0b21af3fb97e4',
  'src/data/scene-index.json': '3e1da55a637fe4e4a8987dbd4b6401f13218f1bf976e55b0c9b5dc4e7a8daa0f',
  '最新/异托邦_完整剧情_人称标注版.txt': 'e340adcdec0b772f42bc6faff7ce47d18ff3fffecd29f005231c661d48b878d4',
  '最新/异托邦_海外版现代线_独立卷.txt': '994f6b31a669fe529e40e97ea479f8c77c59bcbdd2a7898e8dadc4b74524686c',
};

test('round-one adaptations preserve the supplied manuscripts, V6 and every existing branch/bookmark', () => {
  for (const [path, hash] of Object.entries(fixed)) assert.equal(sha(readFileSync(join(root, path))), hash, path);
  const data: { scenes: Scene[] } = JSON.parse(readFileSync(join(root, 'src/data/modern-story.json'), 'utf8'));
  const contract = data.scenes.map(scene => ({ id: scene.id, next: scene.next ?? null, ending: scene.ending ?? null, route: scene.route,
    blocks: scene.blocks.map(block => ({ tag: block.tag, pages: block.pages?.length ?? 0, options: block.options ?? null, when: block.when ?? null, domesticOnly: block.domesticOnly ?? null })) }));
  assert.equal(sha(JSON.stringify(contract)), '00e7a986f910cbba1875762f56e09270a63bbf9323fa5c3d5a3034bb370c8749');
});

test('modern import is deterministic, matches delivered data and refuses a drifting source anchor', () => {
  const temp = mkdtempSync(join(tmpdir(), 'heterotopia-modern-import-'));
  try {
    for (const directory of ['scripts', 'src/data', 'public', '最新']) mkdirSync(join(temp, directory), { recursive: true });
    for (const path of [...Object.keys(fixed), 'scripts/import_modern.py', 'scripts/modern-adaptations.json']) cpSync(join(root, path), join(temp, path));
    const python = process.env.PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3');
    const run = () => spawnSync(python, ['scripts/import_modern.py'], { cwd: temp, encoding: 'utf8' });
    const outputs = ['src/data/modern-story.json', 'src/data/modern-index.json', 'public/原著剧本-海外现代线.txt', 'public/原著剧本-剧情增补.txt'];
    for (let n = 0; n < 2; n++) {
      const result = run();
      assert.equal(result.status, 0, result.stderr);
      for (const path of outputs) assert.equal(sha(readFileSync(join(temp, path))), sha(readFileSync(join(root, path))), `run ${n}: ${path}`);
      for (const [path, hash] of Object.entries(fixed)) assert.equal(sha(readFileSync(join(temp, path))), hash, path);
    }
    const manifest: { source: string }[] = JSON.parse(readFileSync(join(temp, 'scripts/modern-adaptations.json'), 'utf8'));
    manifest[0].source += 'source drift';
    writeFileSync(join(temp, 'scripts/modern-adaptations.json'), JSON.stringify(manifest));
    const rejected = run();
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /Adaptation source changed/);
    for (const path of outputs) assert.equal(sha(readFileSync(join(temp, path))), sha(readFileSync(join(root, path))), 'a rejected adaptation must not write partial data');
  } finally { rmSync(temp, { recursive: true, force: true }); }
});
