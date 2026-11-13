import assert from 'node:assert/strict';
import test from 'node:test';
import { advance, choose, compileScene, currentBeat, enterScene, newGame, newProfile } from '../src/engine';
import { historyTargets, replayHistory } from '../src/reading';
import { loadStory } from '../src/story.ts';

await loadStory();

test('re-reading a sentence keeps this run and logs it once when advancing again', () => {
  const profile = newProfile();
  let state = newGame(profile);
  for (let i = 0; i < 4; i++) state = advance(state, profile);
  const snapshot = structuredClone(state);
  const reread = replayHistory(state, profile, 1);
  assert.equal(reread.beatId, state.history[1].id);
  assert.deepEqual(reread.history, state.history.slice(0, 1));
  assert.equal(reread.inventory, state.inventory);
  assert.equal(reread.choices, state.choices);
  assert.equal(reread.cycle, state.cycle);
  assert.deepEqual(state, snapshot);
  const forward = advance(reread, profile);
  assert.equal(forward.history.length, 2);
  assert.equal(forward.history.at(-1)?.id, reread.beatId);
});

test('a taken breakfast choice is a boundary, while its selected dialogue can be re-read', () => {
  const profile = newProfile();
  let state = enterScene(newGame(profile), profile, '0-2');
  while (currentBeat(state, profile).kind === 'text') state = advance(state, profile);
  const beforeChoice = state.history.length;
  assert.ok(historyTargets(state, profile).size);
  state = choose(state, profile, 'A');
  for (let i = 0; i < 2; i++) state = advance(state, profile);
  const targets = historyTargets(state, profile);
  assert.ok(targets.size);
  assert.ok([...targets.keys()].every(index => index > beforeChoice));
  for (let i = 0; i <= beforeChoice; i++) assert.equal(replayHistory(state, profile, i), state);
  const reread = replayHistory(state, profile, beforeChoice + 1);
  assert.equal(reread.choices.breakfast, 'A');
  assert.equal(reread.inventory, state.inventory);
  assert.ok(compileScene(reread.sceneId, profile, reread).every(beat => beat.kind !== 'text' || !beat.text.includes('阿姨，沈辞其实')));
});

test('old visits, future pages and forged log text cannot become replay targets', () => {
  const profile = newProfile();
  let state = newGame(profile);
  for (let i = 0; i < 3; i++) state = advance(state, profile);
  const oldVisit = state.history;
  state = enterScene(state, profile, '0-2');
  state = advance(state, profile);
  assert.deepEqual([...historyTargets(state, profile).keys()], [oldVisit.length]);
  assert.equal(replayHistory(state, profile, 0), state);
  assert.equal(replayHistory(state, profile, -1), state);
  assert.equal(replayHistory(state, profile, 999), state);
  const forged = { ...state, history: state.history.map(entry => ({ ...entry, text: 'not the original sentence' })) };
  assert.equal(historyTargets(forged, profile).size, 0);
  const revisited = enterScene({ ...state, history: oldVisit }, profile, '0-1');
  assert.equal(historyTargets(revisited, profile).size, 0);
});

test('re-reading within a route never reconstructs items or changes persistent memories', () => {
  const profile = { ...newProfile(), visited: ['A-6a'], oldNames: true };
  let state = enterScene({ ...newGame(profile), inventory: ['jadeTail', 'jadeHead', 'jadeBody', 'names'], cycle: 3 }, profile, 'A-9');
  for (let i = 0; i < 3; i++) state = advance(state, profile);
  const before = structuredClone({ state, profile });
  const reread = replayHistory(state, profile, 0);
  assert.notEqual(reread, state);
  assert.deepEqual(reread.inventory, before.state.inventory);
  assert.deepEqual(reread.choices, before.state.choices);
  assert.equal(reread.cycle, 3);
  assert.deepEqual(profile, before.profile);
  assert.equal(historyTargets({ ...state, beatId: 'missing-page' }, profile).size, 0);
});

test('revisiting the same scene does not offer log entries from its earlier visit', () => {
  const profile = newProfile();
  let state = newGame(profile);
  for (let i = 0; i < 6; i++) state = advance(state, profile);
  const priorLength = state.history.length;
  state = enterScene(state, profile, state.sceneId);
  for (let i = 0; i < 2; i++) state = advance(state, profile);
  assert.deepEqual([...historyTargets(state, profile).keys()].sort(), [priorLength, priorLength + 1]);
  assert.equal(replayHistory(state, profile, 0), state);
});
