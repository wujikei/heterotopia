import assert from 'node:assert/strict';
import test from 'node:test';
import { compileScene, continueEnding, newGame, newProfile } from '../src/engine';
import { RELICS, relicById, relicForBeat, relicForItem, relicHeld, seenRelics } from '../src/data/relics';
import { ITEMS } from '../src/data/world';
import { loadStory } from '../src/story';

await loadStory();

test('object drawings unlock on existing authored pages, never merely on entering a scene', () => {
  const profile = { ...newProfile(), visited: ['0-9', '1-5', 'A-6', 'A-6a', 'B-12-1'], oldNames: true };
  const state = { ...newGame(profile), inventory: ['map', 'jadeTail', 'jadeHead', 'jadeBody', 'birds', 'names'] };
  assert.deepEqual(seenRelics(profile), []);
  for (const item of state.inventory) assert.equal(relicForItem(item, profile), undefined);
  const ids = new Set<string>();
  const terms: Record<string, RegExp> = { map: /古图/, jade: /玉|鸟眼|断口/, birds: /木鸟|两只鸟/, bone: /卜骨/, 'flute-old': /骨笛|旧箱/, 'flute-mi': /笛/, names: /名简|衡/ };
  for (const relic of RELICS) for (const id of relic.reveal) {
    assert.ok(!ids.has(id), `Conflicting object shortcut: ${id}`); ids.add(id);
    const sceneId = id.slice(0, id.indexOf(':'));
    const page = compileScene(sceneId, profile, state).find(beat => beat.id === id);
    assert.equal(page?.kind, 'text', `${relic.id}: nonexistent narrative page ${id}`);
    if (page?.kind === 'text') assert.match(page.text, terms[relic.group], `${id}: drawing is unrelated to the current paragraph`);
  }
});

test('the three jade fragments remain separate studies until the assembly is read', () => {
  const profile = { ...newProfile(), read: ['1-5:13:0'] };
  assert.deepEqual(seenRelics(profile).map(item => item.id), ['jade-tail']);
  assert.equal(relicForItem('jadeHead', profile), undefined);
  profile.read.push('A-2:7:1', 'A-6:15:0');
  assert.deepEqual(seenRelics(profile).map(item => item.id), ['jade-body']);
  assert.equal(seenRelics(profile).some(item => item.id === 'jade-joined'), false);
  profile.read.push('A-6:25:0');
  assert.equal(seenRelics(profile)[0].id, 'jade-joined');
});

test('seen objects persist across routes while the current jade inventory resets', () => {
  const profile = { ...newProfile(), endings: ['blade' as const], read: ['1-5:13:0', '1-5:13:1', '1-8:11:0', 'A-2:7:1', 'A-6:15:0', 'A-6:25:0', 'A-5:13:3'] };
  const state = { ...newGame(profile), inventory: ['jadeTail', 'jadeHead', 'jadeBody', 'birds', 'bone', 'names'] };
  const next = continueEnding(state, profile);
  assert.equal(relicHeld(relicById('jade-joined')!, next), false);
  assert.equal(relicHeld(relicById('jade-tail')!, next), true);
  assert.equal(relicHeld(relicById('names')!, next), false);
  assert.ok(seenRelics(profile).some(item => item.id === 'jade-joined'));
  assert.ok(seenRelics(profile).some(item => item.id === 'names'));
});

test('Mi owns his flute: seeing it does not add it to the traveller bag', () => {
  const profile = { ...newProfile(), read: ['A-5:13:2', 'B-2:12:4'] };
  const state = newGame(profile);
  assert.deepEqual(seenRelics(profile).map(item => item.id), ['flute-old', 'flute-mi']);
  assert.equal(relicHeld(relicById('flute-mi')!, state), false);
  assert.equal(relicForBeat('B-12-1:3:2')?.id, 'flute-mi-broken');
  assert.ok(!seenRelics(profile).some(item => item.id === 'flute-mi-broken'));
  profile.read.push('B-12-1:3:2');
  assert.deepEqual(seenRelics(profile).map(item => item.id), ['flute-old', 'flute-mi-broken']);
  assert.deepEqual(state.inventory, []);
});

test('wood-bird copy preserves both distinct imperfections from V6', () => {
  assert.ok(ITEMS.birds.detail.includes('尾歪') && ITEMS.birds.detail.includes('缺翅'));
  assert.ok(!ITEMS.birds.detail.includes('完好'));
});
