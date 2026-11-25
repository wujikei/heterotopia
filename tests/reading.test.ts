import assert from 'node:assert/strict';
import test from 'node:test';
import { advance, choose, compileScene, currentBeat, enterScene, newGame, newProfile, restoreEditorialBookmark, sceneById } from '../src/engine';
import { historyTargets, replayHistory } from '../src/reading';
import { loadStory } from '../src/story.ts';
import { choiceText, storyText } from '../src/localeText';
import { slotPresentation } from '../src/savePresentation';
import type { GameState, Profile } from '../src/types';

await loadStory();
await loadStory('overseas');

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

test('modern manuscript references are presented consistently in the story and legacy bookmarks', () => {
  const profile = newProfile('overseas');
  const sceneId = 'modern-k-G-2';
  const state = { ...enterScene(newGame(profile), profile, sceneId), beatId: `${sceneId}:2:0` };
  const beat = currentBeat(state, profile);
  assert.equal(beat.kind, 'text');
  assert.match(beat.text, /C-3/);
  assert.equal(storyText(beat.id, beat.text), '（就是临行那天，老妇人送来的那碗粥。没有人喝。）');
  assert.equal(slotPresentation(state, profile, storyText, 50).excerpt, storyText(beat.id, beat.text));
  const hand = currentBeat({ ...state, sceneId: 'modern-k-C-3', beatId: 'modern-k-C-3:8:0' }, profile);
  assert.equal(hand.kind, 'text');
  assert.equal(storyText(hand.id, hand.text), '（粥很烫。媭隔着袖口托住碗底。）');
  for (const key of ['1', '2']) {
    const launch = { ...state, sceneId: 'modern-k-C-4', beatId: 'modern-k-C-4:9:0', choices: { 'modern-k-C-3:10': key } };
    const porridge = currentBeat(launch, profile);
    assert.equal(porridge.kind, 'text');
    assert.match(storyText(porridge.id, porridge.text), /岸边的石头上。没有人把它带上船/);
  }
});

test('modern directions and adjacent duplicate prose skip forward and old notes resume at the next readable page', () => {
  const profile = newProfile('overseas');
  const opening = newGame(profile);
  const cases = [
    { sceneId: 'modern-k-F-3', before: '10:0', omitted: '11:0', after: 'modern-k-F-3:12:0' },
    { sceneId: 'modern-k-D-13', before: '15:1', omitted: '16:0', after: 'modern-k-E-1:1:0' },
    { sceneId: 'modern-r-E1-7', before: '10:0', omitted: '11:0', after: 'modern-r-E1-7:ending' },
    { sceneId: 'modern-k-G-4', before: '5:1', omitted: '6:0', after: 'modern-k-G-4:7:0' },
  ];
  for (const { sceneId, before, omitted, after } of cases) {
    const state = enterScene(opening, profile, sceneId);
    const omittedId = `${sceneId}:${omitted}`;
    const legacyState = { ...state, beatId: omittedId };
    assert.equal(restoreEditorialBookmark(legacyState, profile).beatId, after);
    assert.ok(!compileScene(sceneId, profile, state).some(beat => beat.id === omittedId));
    assert.equal(advance({ ...state, beatId: `${sceneId}:${before}` }, profile).beatId, after);
  }
});

test('legacy duplicate and reflection history keep their original replay indices', () => {
  const profile = newProfile('overseas');
  const sceneId = 'modern-k-F-3';
  const state = { ...enterScene(newGame(profile), profile, sceneId), beatId: `${sceneId}:12:0` };
  const text = sceneById(sceneId).blocks[10].pages![0];
  const history: GameState['history'] = [10, 11].map(block => ({ id: `${sceneId}:${block}:0`, sceneId, text, speaker: '', kind: 'text' }));
  assert.deepEqual([...historyTargets({ ...state, history }, profile)], [[0, `${sceneId}:10:0`]]);
  assert.equal(replayHistory({ ...state, history }, profile, 0).beatId, `${sceneId}:10:0`);

  const reflectionId = 'modern-o-2-6';
  const reflection = { ...enterScene(state, profile, reflectionId), beatId: `${reflectionId}:25:0` };
  const entry = { id: `${reflectionId}:24:0`, sceneId: reflectionId, text: sceneById(reflectionId).blocks[24].pages![0], speaker: '', kind: 'text' as const };
  assert.ok(historyTargets({ ...reflection, history: [entry] }, profile).has(0));
  assert.equal(historyTargets({ ...reflection, history: [{ ...entry, text: 'forged legacy text' }] }, profile).size, 0);
});

test('royal choices hide route labels and retain all authored destinations', () => {
  const profile = newProfile('overseas');
  const state = enterScene(newGame(profile), profile, 'modern-r-D-11', true);
  const beat = currentBeat(state, profile);
  assert.equal(beat.kind, 'choice');
  assert.deepEqual(beat.choices.map(choice => choiceText(`${beat.id}:${choice.key}`, choice.title)), ['守城', '去西渡口', '独自去求索']);
  assert.deepEqual(beat.choices.map(choice => choose(state, profile, choice.key).sceneId), ['modern-r-D-12', 'modern-r-E2-1', 'modern-r-L-1']);
  assert.equal(choose(state, profile, '2').history.at(-1)?.text, '去西渡口');
});

test('modern return bookmarks and the final return choice show player-facing descriptions', () => {
  const profile: Profile = { ...newProfile('overseas'), endings: ['modern-royal-g1', 'modern-kunlun'] };
  const state = enterScene(newGame(profile), profile, 'modern-o-4-1', true);
  assert.equal(slotPresentation(state, profile).chapter, '归来 这边的日子');
  const beat = currentBeat(state, profile);
  assert.equal(beat.kind, 'choice');
  assert.equal(beat.choices[0].detail, '去导师办公室。');
  assert.equal(choose(state, profile, 'return').sceneId, 'modern-o-5-1');
});
