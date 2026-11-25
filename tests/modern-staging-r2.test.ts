import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { asset, assetSources } from '../src/assets';
import { cgForBeat, cgUnlocked, CGS } from '../src/data/cgs';
import { actorForBeat } from '../src/actors';
import { actorPortraitName } from '../src/data/actorVariants';
import { compileScene, currentBeat, enterScene, newGame, newProfile, sceneById } from '../src/engine';
import { MODERN_GLANCE_ART, MODERN_PHOTO_ART, MODERN_SUMMIT_ART } from '../src/modern';
import { scoreFrame } from '../src/score';
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

test('ancient locations and CGs survive dialogue and narrated comparisons', () => {
  const expected = {
    'modern-r-A-6': 'tomb',
    'modern-r-A-6a': 'study',
    'modern-r-B-12': 'modern-chu-courtyard',
    'modern-r-D-11': 'palace',
    'modern-k-A-1': 'hut',
    'modern-k-D-2': 'modern-river-aboard',
    'modern-k-D-3': 'modern-river-aboard',
    'modern-k-D-5': 'cg-modern-storm',
    'modern-k-D-6': 'cg-modern-storm',
    'modern-k-E-1': 'cg-modern-cloud-lord',
    'modern-k-E-5': 'cg-modern-siming',
    'modern-k-E-6': 'cg-modern-shaosiming',
    'modern-k-F-1': 'cg-modern-kunlun-light',
  };
  for (const [sceneId, background] of Object.entries(expected)) {
    const beats = pages(sceneId);
    assert.ok(beats.length, sceneId);
    for (const beat of beats) assert.equal(beat.background, background, beat.id);
  }
  const houses = pages('modern-r-C-1a');
  for (const background of ['study', 'palace', 'modern-chu-courtyard', 'modern-minister-hall', 'modern-minister-ancestor', 'modern-minister-veteran', 'modern-minister-orange', 'modern-minister-inlaw']) {
    assert.ok(houses.some(b => b.background === background), background);
  }
  assert.ok(houses.every(b => b.background !== 'ruins'));
  const briefMemory = pages('modern-k-E-7');
  assert.deepEqual(briefMemory.filter(beat => beat.background === 'modern-dorm').map(beat => beat.id), ['modern-k-E-7:5:0']);
  assert.equal(briefMemory.find(beat => beat.id === 'modern-k-E-7:6:0')?.background, 'light-river');
});

test('return and finale images appear after their scripted actions and old gallery unlocks survive', () => {
  for (const [id, background, sourceAnchor] of [
    ['modern-o-4-1:11:0', 'modern-library', /翻原典/],
    ['modern-o-4-1:12:0', 'modern-dorm-quiet-r2', /不懂在哪/],
    ['modern-o-4-1:14:0', 'modern-classroom', /课堂上第一次举手/],
    ['modern-o-4-1:19:0', 'modern-dorm-quiet-r2', /夜里，室友/],
    ['modern-o-4-1:25:0', 'modern-dorm-quiet-r2', /电脑前/],
    ['modern-o-2-1:2:0', 'modern-night-river', /第一夜/],
    ['modern-o-5-2:2:0', 'modern-office', /导师顺口问起/],
    ['modern-o-5-2:4:0', 'modern-office-video', /给家里视频/],
    ['modern-o-5-5:4:0', MODERN_GLANCE_ART, /亮黄外套/],
    ['modern-o-5-5:9:0', 'modern-mountain-path', /消失不见/],
    ['modern-o-5-6:4:0', 'modern-sunset', /沈辞！/],
    ['modern-o-5-6:9:0', MODERN_SUMMIT_ART, /笔记递过去/],
    ['modern-o-5-7:15:0', 'modern-sunset', /拍照啦/],
    ['modern-o-5-7:17:0', MODERN_PHOTO_ART, /按下快门/],
    ['modern-k-C-3:2:0', 'cg-modern-porridge-offering', /把碗塞给媭/],
    ['modern-k-C-3:7:0', 'village', /戴上面具/],
    ['modern-k-F-2:1:0', 'modern-herb-eaves', /药草/],
    ['modern-k-G-1:1:0', 'river', /舟很轻/],
    ['modern-k-G-1:2:0', 'cg-modern-quiet-shoal-six', /蜷着/],
    ['modern-k-G-2:1:0', 'cg-modern-cold-porridge', /一碗粥/],
    ['modern-k-G-2:3:0', 'cg-modern-porridge-plaque', /一块木牌/],
    ['modern-k-G-3:14:0', 'cg-modern-porridge-plaque', /他们听不见了/],
    ['modern-k-G-4:1:0', 'cg-modern-shoal-cord', /红绳的另一头/],
    ['modern-k-G-4:4:0', 'river', /人去舟空/],
  ] as const) {
    const beat = pages(id.split(':')[0]).find(item => item.id === id);
    assert.ok(beat?.kind === 'text', id);
    assert.match(beat.text, sourceAnchor, id);
    assert.equal(beat.background, background, id);
  }
  const trail = pages('modern-o-5-4');
  const actor = actorForBeat(trail.find(beat => beat.id === 'modern-o-5-4:14:0')!, sceneById('modern-o-5-4'), trail);
  assert.ok(actor);
  assert.equal(actorPortraitName(actor), 'portrait-linyue-trail-smile');
  const photo = CGS.find(cg => cg.id === 'modern-photo')!;
  assert.equal(cgUnlocked(photo, { ...profile, art: ['cg-modern-photo'] }), true);
  const quiet = scoreFrame('modern-k-G-1', pages('modern-k-G-1')[0]);
  assert.equal(quiet.music, null);
  assert.deepEqual(quiet.ambience, []);
});

test('reviewed r2 crops load in original quality on portrait screens and survive rotation', () => {
  const previous = globalThis.matchMedia;
  const mobile = (query: string): MediaQueryList => ({
    matches: query.includes('aspect-ratio'), media: query, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true,
  });
  globalThis.matchMedia = mobile;
  try {
    for (const name of ['cg-modern-word-stall-r3', 'cg-modern-jade-palm-r2', 'cg-modern-dorm-unease-r2', 'cg-modern-dorm-carving-r2', 'cg-modern-dorm-dark-r2', 'cg-modern-jade-light-r2', 'cg-modern-notebook-open', 'cg-modern-translation-r3', 'cg-modern-paper-note', 'cg-modern-summit-r4', 'cg-modern-porridge-plaque']) {
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
