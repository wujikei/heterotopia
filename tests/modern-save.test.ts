import assert from 'node:assert/strict';
import test from 'node:test';
import { newGame, newProfile, currentBeat } from '../src/engine';
import { loadStory } from '../src/story';
import { restoreModernState } from '../src/modern';

await loadStory('overseas');
await loadStory('original');
const values = new Map<string, string>();
Object.defineProperty(globalThis, 'window', { configurable: true, value: { matchMedia: () => ({ matches: false }) } });
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, value); },
} });
const { loadAutosave, loadSlots, persist, validState } = await import('../src/storage');

test('existing modern auto/manual saves keep their position, history and choices while removing the stray map', () => {
  values.clear();
  const profile = newProfile('overseas');
  const old = { ...newGame(profile), sceneId: 'modern-o-4-1', beatId: 'modern-o-4-1:7:0', inventory: ['map','questionJade'], choices: { 'modern-o-2-6:0': '3' }, history: [{ id:'old-page', sceneId:'modern-o-0-2', speaker:'林越', text:'何。', kind:'text' as const }], cycle: 2 };
  assert.ok(validState(old, 'overseas'));
  persist('autosave', old, 'overseas');
  persist('slots', [{ version:1, savedAt:'2026-11-23T14:00:00Z', state:old }], 'overseas');
  for (const state of [loadAutosave('overseas'), loadSlots('overseas')[0]?.state]) {
    assert.ok(state);
    assert.deepEqual(state, { ...old, inventory:['questionJade'] });
    assert.equal(currentBeat(state, profile).id, old.beatId);
  }
  assert.equal(loadAutosave(), null, 'modern progress must not appear in the original campaign');
});

test('original saves are unchanged; ancient modern saves never invent modern objects', () => {
  const original = newGame(newProfile());
  assert.strictEqual(restoreModernState(original), original);
  persist('autosave', original);
  assert.deepEqual(loadAutosave(), original);
  const modern = { ...newGame(newProfile('overseas')), sceneId: 'modern-k-B-3', inventory:['map','questionJade','jadeTail','birds','box','bone'] };
  assert.deepEqual(restoreModernState(modern).inventory, ['jadeTail','birds','box','bone']);
});
