import assert from 'node:assert/strict';
import test from 'node:test';
import { compileScene, newProfile, sceneById } from '../src/engine';
import { loadStory } from '../src/story';
import { actorForBeat } from '../src/actors';
import { actorPortraitName } from '../src/data/actorVariants';
import { READING_HOLDS } from '../src/data/performance';
import { autoDelayFor } from '../src/autoReading';
import { locationForBeat } from '../src/scenePresentation';
import { scoreFrame, trackById } from '../src/score';

await loadStory();
const profile = newProfile();
const state = { choices: { breakfast: 'B' }, inventory: [] };
function at(id: string) {
  const sceneId = id.split(':')[0];
  const beats = compileScene(sceneId, profile, state);
  const beat = beats.find(beat => beat.id === id)!;
  assert.ok(beat, id);
  return { beat, beats, scene: sceneById(sceneId) };
}

test('the opening distinguishes the two wakings and breakfast, including save location', () => {
  const early = at('0-1:8:0');
  assert.equal(early.beat.background, 'bedroom');
  assert.equal(locationForBeat(early.scene, early.beat), '05:41 · 沈家卧室');
  const later = at('0-1:11:0');
  assert.equal(later.beat.background, 'bedroom-morning');
  assert.equal(locationForBeat(later.scene, later.beat), '07:12 · 沈家卧室');
  for (const beat of compileScene('0-2', profile, state)) assert.equal(beat.background, 'home-morning', beat.id);
});

test('returning from the dream and moving from canteen to dinner respect the original boundaries', () => {
  const dream = at('0-7:5:0'), awake = at('0-7:11:0');
  assert.equal(dream.beat.background, 'shrine');
  const predawn = at('0-7:11:1');
  assert.ok(predawn.beat.kind === 'text' && predawn.beat.text.includes('天没亮'));
  assert.equal(awake.beat.background, 'bedroom');
  assert.equal(locationForBeat(awake.scene, awake.beat), '沈家卧室 · 黎明前');
  const lunch = compileScene('0-8', profile, state).filter(beat => {
    const block = Number(beat.id.split(':')[1]); return block >= 6 && block < 18;
  });
  assert.ok(lunch.length > 1);
  assert.ok(lunch.every(beat => beat.background === 'canteen-day'));
  const dinner = compileScene('0-8', profile, state).find(beat => Number(beat.id.split(':')[1]) > 18)!;
  assert.equal(dinner.background, 'home');
});

test('late return keeps the home costume, while the snow fire recedes on its own page', () => {
  assert.equal(at('终-4:12:3').beat.background, 'alley');
  const home = at('终-4:12:4');
  assert.equal(home.beat.background, 'bedroom-evening');
  assert.equal(actorForBeat(home.beat, home.scene, home.beats)?.variant, 'home');
  assert.equal(at('B-12-1:18:0').beat.background, 'snow');
  const night = at('B-12-1:18:1');
  assert.ok(night.beat.kind === 'text' && night.beat.text.startsWith('火光低下去'));
  assert.equal(night.beat.background, 'snow-night');
  assert.ok(scoreFrame(night.scene.id, night.beat).ambience.find(([id, gain]) => id === 'hearth' && gain < .1));
  assert.equal(at('B-12-2:3:0').beat.background, 'snow-night');
  assert.equal(at('B-12-2:9:7').beat.background, 'snow');
});

test('a silent reaction needs explicit presence and retains delivered clothes and expressions', () => {
  for (const [id, portrait, label] of [
    ['0-1:8:0', 'portrait-shen-home-surprised', '沈辞'],
    ['B-1:17:0', 'portrait-xu-smile', '戌（沈辞）'],
    ['B-1:22:4', 'portrait-xu-sad', '戌（沈辞）'],
    ['B-12-1:3:1', 'portrait-yu-smile', '雩'],
    ['B-12-1:18:1', 'portrait-xu-winter-sad', '戌（沈辞）'],
    ['终-1:8:2', 'portrait-xu-smile', '戌'],
    ['终-1:27:0', 'portrait-yu-smile', '雩'],
  ]) {
    const { beat, beats, scene } = at(id);
    const actor = actorForBeat(beat, scene, beats)!;
    assert.equal(actorPortraitName(actor), portrait, id);
    assert.equal(actor.label, label, id);
  }
  const memory = at('B-12-1:16:1');
  assert.equal(actorForBeat(memory.beat, memory.scene, memory.beats), undefined, 'remembering mother does not summon her');
});

test('authored pauses use actual text pages and three long themes retain their original identities', () => {
  for (const [id, hold] of Object.entries(READING_HOLDS)) {
    const { beat } = at(id);
    assert.equal(beat.kind, 'text');
    if (beat.kind !== 'text') continue;
    assert.ok(hold >= 450 && hold <= 1400);
    assert.ok(autoDelayFor(beat.text, 4, id) >= autoDelayFor(beat.text, 4));
    assert.ok(autoDelayFor(beat.text, 4, id) <= 9000);
  }
  assert.equal(autoDelayFor('不……松。', 4, 'B-12-2:4:0') - autoDelayFor('不……松。', 4), 1000);
  for (const id of ['river-journey', 'last-flute', 'river-of-names'] as const) {
    const track = trackById(id);
    assert.ok(track.seconds > 140 && track.seconds < 150, id);
    assert.equal(track.file, `music-${id}.mp3`);
  }
});
