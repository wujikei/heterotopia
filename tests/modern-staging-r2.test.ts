import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { asset, assetSources } from '../src/assets';
import { cgForBeat } from '../src/data/cgs';
import { compileScene, currentBeat, enterScene, newGame, newProfile } from '../src/engine';
import { loadStory } from '../src/story';

await loadStory('overseas');
const profile = newProfile('overseas');
const pages = (id: string) => compileScene(id, profile, { choices: {}, inventory: [] });

test('opening art follows the actual taking, third voice, carving and blackout pages', () => {
  const street = pages('modern-o-0-1');
  const dorm = pages('modern-o-0-2');
  const checks = [
    [street, 'modern-o-0-1:7:0', 'cg-modern-word-stall', /蹲了下去/],
    [street, 'modern-o-0-1:18:0', 'cg-modern-jade-palm-r2', /顺手拿起/],
    [street, 'modern-o-0-1:27:0', 'cg-modern-jade-palm-r2', /塞进你手里/],
    [street, 'modern-o-0-1:35:0', 'modern-street-arrival-r2', /揣进口袋/],
    [dorm, 'modern-o-0-2:8:0', 'modern-dorm-quiet-r2', /口袋里摸出/],
    [dorm, 'modern-o-0-2:15:0', 'cg-modern-dorm-unease-r2', /声音变了/],
    [dorm, 'modern-o-0-2:16:0', 'cg-modern-dorm-unease-r2', /抬头/],
    [dorm, 'modern-o-0-2:17:0', 'cg-modern-dorm-carving-r2', /小刀/],
    [dorm, 'modern-o-0-2:21:0', 'cg-modern-dorm-dark-r2', /灯灭了/],
    [dorm, 'modern-o-0-2:28:0', 'cg-modern-jade-light-r2', /亮了一下/],
  ] as const;
  for (const [beats, id, background, text] of checks) {
    const beat = beats.find(item => item.id === id);
    assert.ok(beat && beat.kind === 'text', id);
    assert.match(beat.text, text, id);
    assert.equal(beat.background, background, id);
    assert.equal(cgForBeat(beat, id.split(':')[0])?.file, background.startsWith('cg-') ? background : undefined);
  }
  const start = street.find(beat => beat.kind === 'text');
  assert.ok(start);
  assert.equal(start.background, 'modern-street-arrival-r2');
  assert.equal(cgForBeat(start, 'modern-o-0-1'), undefined, 'whole-scene gallery trigger must not override the establishing shot');
});

test('an existing page bookmark restores the same text and deterministic new staging', () => {
  const entered = enterScene(newGame(profile), profile, 'modern-o-0-2');
  const old = { ...entered, beatId: 'modern-o-0-2:17:0' };
  const first = currentBeat(old, profile);
  assert.equal(first.id, old.beatId);
  assert.equal(first.background, 'cg-modern-dorm-carving-r2');
  assert.deepEqual(currentBeat(old, profile), first, 'replay and skipped compilation have no mutable staging cursor');
  assert.deepEqual(old.choices, entered.choices);
});

test('reviewed r2 crops load in original quality on portrait screens and survive rotation', () => {
  const previous = globalThis.matchMedia;
  const mobile = (query: string): MediaQueryList => ({
    matches: query.includes('aspect-ratio'), media: query, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true,
  });
  globalThis.matchMedia = mobile;
  try {
    for (const name of ['cg-modern-jade-palm-r2', 'cg-modern-dorm-unease-r2', 'cg-modern-dorm-carving-r2', 'cg-modern-dorm-dark-r2', 'cg-modern-jade-light-r2']) {
      assert.match(assetSources(name).webp, /art-original\//);
      assert.match(asset(name), new RegExp(`${name}-m\\.webp$`));
      assert.ok(existsSync(new URL(`../public/art-original/${name}-m.webp`, import.meta.url)));
    }
    globalThis.matchMedia = (query: string) => ({ ...mobile(query), matches: false });
    assert.match(asset('cg-modern-dorm-carving-r2'), /cg-modern-dorm-carving-r2\.webp$/);
  } finally { globalThis.matchMedia = previous; }
});

test('three real narrative CG sources are retained and every derived export has a master', () => {
  for (const name of ['jade-palm', 'dorm-unease', 'dorm-carving']) {
    const source = new URL(`../resources/art-src/modern-r2/generated/${name}.jpg`, import.meta.url);
    assert.ok(readFileSync(source).length > 20_000, name);
  }
  for (const name of ['modern-street-arrival-r2', 'modern-dorm-quiet-r2', 'cg-modern-jade-palm-r2', 'cg-modern-dorm-unease-r2', 'cg-modern-dorm-carving-r2', 'cg-modern-dorm-dark-r2', 'cg-modern-jade-light-r2']) {
    assert.ok(existsSync(new URL(`../resources/art-src/modern-r2/${name}.png`, import.meta.url)));
  }
});
