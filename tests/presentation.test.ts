import assert from 'node:assert/strict';
import test from 'node:test';
import { actorForBeat, actorInCast } from '../src/actors';
import { compileScene, currentBeat, enterScene, newGame, newProfile, sceneById } from '../src/engine';
import { slotPresentation } from '../src/savePresentation';
import { loadStory } from '../src/story.ts';

await loadStory();

const profile = newProfile();
test('a dream bookmark uses the saved page location instead of the scene default', () => {
  const state = newGame(profile);
  const beat = currentBeat(state, profile);
  const card = slotPresentation(state, profile);
  assert.equal(card.background, beat.background);
  assert.equal(card.background, 'dream-boat');
  assert.equal(card.title, '夜梦 · 船底的敲击');
  assert.ok(beat.kind === 'text' && beat.text.startsWith(card.excerpt.replace(/…$/, '')));
  const awake = { ...state, beatId: '0-1:11:0' };
  assert.equal(slotPresentation(awake, profile).background, 'bedroom');
  assert.equal(slotPresentation({ ...state, beatId: 'obsolete' }, profile).background, sceneById(state.sceneId).background);
  assert.equal(slotPresentation({ ...state, beatId: 'obsolete' }, profile).excerpt, '');
});

test('borrowed-body presentation follows the return line even with separately compiled beats', () => {
  for (const sceneId of ['1-1', 'A-4', 'B-1', '终-1']) {
    const scene = sceneById(sceneId);
    const state = enterScene(newGame(profile), profile, sceneId);
    const beats = compileScene(sceneId, profile, state);
    const returnIndex = beats.findIndex(b => b.kind === 'text' && b.text.includes('虎口白疤却留在戌'));
    for (const [index, beat] of beats.entries()) {
      if (beat.kind !== 'text' || beat.speaker !== '沈辞') continue;
      const selected = currentBeat({ ...state, beatId: beat.id }, profile);
      const actor = actorForBeat(selected, scene, beats)!;
      const borrowed = sceneId !== '终-1' || returnIndex < 0 || index <= returnIndex;
      assert.equal(actor.character.key, borrowed ? 'xu' : 'shen', beat.id);
      assert.equal(actor.label, borrowed ? '戌（沈辞）' : '沈辞', beat.id);
      assert.equal(actorInCast(actor, ['shen']), true);
      assert.equal(actorInCast(actor, ['amao']), false);
    }
  }
});
