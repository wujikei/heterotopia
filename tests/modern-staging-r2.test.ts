import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { asset, assetSources } from '../src/assets';
import { cgForBeat, cgUnlocked, CGS } from '../src/data/cgs';
import { compileScene, currentBeat, enterScene, newGame, newProfile } from '../src/engine';
import { loadStory } from '../src/story';

await loadStory('overseas');
const profile = newProfile('overseas');
const pages = (id: string) => compileScene(id, profile, { choices: {}, inventory: [] });

test('opening art follows the actual taking, third voice, carving and blackout pages', () => {
  const street = pages('modern-o-0-1');
  const dorm = pages('modern-o-0-2');
  const checks = [
    [street, 'modern-o-0-1:5:0', 'cg-modern-word-stall-r3', /手写的招牌/],
    [street, 'modern-o-0-1:7:0', 'cg-modern-word-stall-r3', /蹲了下去/],
    [street, 'modern-o-0-1:18:0', 'cg-modern-jade-palm-r2', /顺手拿起/],
    [street, 'modern-o-0-1:19:0', 'cg-modern-word-stall-r3', /到底问什么/],
    [street, 'modern-o-0-1:27:0', 'cg-modern-jade-palm-r2', /塞进你手里/],
    [street, 'modern-o-0-1:35:0', 'modern-street-arrival-r3', /揣进口袋/],
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
  assert.equal(start.background, 'modern-street-arrival-r3');
  assert.equal(cgForBeat(start, 'modern-o-0-1'), undefined, 'whole-scene gallery trigger must not override the establishing shot');
  const stall = CGS.find(cg => cg.id === 'modern-word-stall')!;
  assert.equal(cgUnlocked(stall, { ...profile, visited: ['modern-o-0-1'] }), false);
  assert.equal(cgUnlocked(stall, { ...profile, art: ['cg-modern-word-stall'] }), true, 'history still opens the replacement CG');
});

test('existing ancient CGs appear with their action and the last geese remain at the actual ending', () => {
  for (const [id, background] of [
    ['modern-c-1-13:2:0', 'village'],
    ['modern-c-1-13:18:0', 'cg-modern-fork'],
    ['modern-r-A-4:1:0', 'cg-modern-feast'],
    ['modern-r-C-11:1:0', 'cg-modern-battle'],
    ['modern-r-C-11:8:0', 'ruins'],
    ['modern-k-F-5:1:0', 'light-river'],
    ['modern-k-F-5:3:0', 'cg-modern-donghuang'],
    ['modern-r-D-1:1:0', 'modern-royal-wall-night'],
    ['modern-r-D-1:6:0', 'modern-royal-wall-night'],
    ['modern-r-E1-6:1:0', 'cg-modern-last-geese'],
  ]) {
    const sceneId = id.split(':')[0];
    const beat = pages(sceneId).find(item => item.id === id);
    assert.equal(beat?.background, background, id);
    assert.equal(cgForBeat(beat!, sceneId)?.file, background.startsWith('cg-') ? background : undefined, id);
  }
});

test('the notebook and manuscript only reveal their inscriptions on the authored pages', () => {
  for (const [id, image] of [
    ['modern-o-4-2:7:0', 'modern-library'],
    ['modern-o-4-2:8:0', 'cg-modern-notebook-open'],
    ['modern-o-4-2:9:0', 'cg-modern-notebook-open'],
    ['modern-o-4-2:10:0', 'cg-modern-translation-r3'],
    ['modern-o-4-2:12:0', 'modern-dorm-quiet-r2'],
    ['modern-o-5-1:8:0', 'cg-modern-paper'],
    ['modern-o-5-1:10:0', 'cg-modern-paper-note'],
    ['modern-o-5-1:11:0', 'cg-modern-paper-note'],
    ['modern-o-5-1:12:0', 'cg-modern-paper'],
  ]) {
    const scene = id.split(':')[0];
    const beat = pages(scene).find(item => item.id === id);
    assert.equal(beat?.background, image, id);
    assert.equal(cgForBeat(beat!, scene)?.file, image.startsWith('cg-') ? image : undefined, id);
  }
  const gallery = CGS.find(cg => cg.id === 'modern-translation')!;
  assert.equal(cgUnlocked(gallery, { ...profile, art: ['cg-modern-notebook-open'] }), false);
  assert.equal(cgUnlocked(gallery, { ...profile, art: ['cg-modern-translation'] }), true);
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
    for (const name of ['cg-modern-word-stall-r3', 'cg-modern-jade-palm-r2', 'cg-modern-dorm-unease-r2', 'cg-modern-dorm-carving-r2', 'cg-modern-dorm-dark-r2', 'cg-modern-jade-light-r2', 'cg-modern-notebook-open', 'cg-modern-translation-r3', 'cg-modern-paper-note']) {
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
