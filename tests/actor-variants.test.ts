import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import test from 'node:test';
import { actorForBeat } from '../src/actors';
import { ACTOR_VARIANTS, POSE_BEATS, actorPortraitCandidates, actorPortraitName } from '../src/data/actorVariants';
import { cgForBeat } from '../src/data/cgs';
import { BEAT_OVERRIDES } from '../src/data/expressions';
import { compileScene, newGame, newProfile, SCENES } from '../src/engine';
import { loadStory } from '../src/story';
import { locationForBeat } from '../src/scenePresentation';
import { slotPresentation } from '../src/savePresentation';

await loadStory();
const profile = newProfile();
function at(sceneId: string, id: string) {
  const scene = SCENES.find(scene => scene.id === sceneId)!;
  const beats = compileScene(sceneId, profile, { choices: { breakfast: 'B' }, inventory: ['jadeHead', 'jadeBody', 'jadeTail', 'names'] });
  const beat = beats.find(beat => beat.id === id)!;
  assert.ok(beat, `${id}: actual compiled page`);
  return { beat, actor: actorForBeat(beat, scene, beats)!, scene };
}

test('waking, breakfast, school and returning home stage the appropriate costume', () => {
  for (const [scene, id, portrait] of [
    ['0-1', '0-1:8:0', 'portrait-shen-home'],
    ['0-1', '0-1:15:0', 'portrait-shen-home-surprised'],
    ['0-2', '0-2:4:0', 'portrait-shen-school'],
    ['0-2', '0-2:6:0', 'portrait-tang-dining'],
    ['0-7', '0-7:5:0', 'portrait-shen-school'],
    ['终-4', '终-4:13:0', 'portrait-shen-home-smile'],
    ['终-5', '终-5:4:0', 'portrait-tang-dining'],
    ['终-5', '终-5:5:0', 'portrait-shen-home'],
  ]) assert.equal(actorPortraitName(at(scene, id).actor), portrait, id);
});

test('cold scenes dress the borrowed body while retaining its original speaker label', () => {
  const actor = at('B-12-1', 'B-12-1:5:0').actor;
  assert.equal(actor.character.key, 'xu');
  assert.equal(actor.label, '戌（沈辞）');
  assert.equal(actorPortraitName(actor), 'portrait-xu-winter');
  const silent = at('B-11', 'B-11:3:0').actor;
  assert.equal(actorPortraitName(silent), 'portrait-xu-winter');
  assert.equal(silent.label, '戌（沈辞）');
  assert.equal(silent.castKey, 'shen');
  assert.equal(at('1-12', '1-12:7:0').actor.variant, 'default', 'winter coat is still being sewn and packed');
  assert.equal(at('终-1', '终-1:9:0').actor.variant, 'default', 'the actual Xu wears his white robe on the light river');
});

test('returning from the alley switches the background at the original paragraph boundary', () => {
  assert.equal(at('终-4', '终-4:12:3').beat.background, 'alley');
  const returned = at('终-4', '终-4:12:4');
  assert.equal(returned.beat.background, 'bedroom');
  assert.equal(actorPortraitName(returned.actor), 'portrait-shen-home');
  assert.equal(at('终-4', '终-4:13:0').beat.background, 'bedroom');
  assert.equal(locationForBeat(returned.scene, returned.beat), '沈家卧室 · 数日后傍晚');
  assert.equal(slotPresentation({ ...newGame(profile), sceneId: '终-4', beatId: returned.beat.id }, profile).title, '沈家卧室 · 数日后傍晚');
  const waking = at('0-1', '0-1:15:0');
  assert.equal(locationForBeat(waking.scene, waking.beat), '05:41 · 沈家卧室');
});

test('each delivered costume or pose appears on an actual page outside a CG', () => {
  const found = new Set<string>();
  for (const scene of SCENES) {
    const beats = compileScene(scene.id, profile, { choices: { breakfast: 'B' }, inventory: ['jadeHead', 'jadeBody', 'jadeTail', 'names'] });
    for (const beat of beats) {
      const actor = actorForBeat(beat, scene, beats);
      if (actor && !cgForBeat(beat, scene.id)) found.add(`${actor.character.key}/${actor.variant}`);
    }
  }
  for (const [key, variants] of Object.entries(ACTOR_VARIANTS)) {
    for (const variant of Object.keys(variants)) assert.ok(found.has(`${key}/${variant}`), `${key}/${variant}: visible narrative use`);
  }
  for (const [id, pose] of Object.entries(POSE_BEATS)) {
    const { actor, beat, scene } = at(id.split(':')[0], id);
    assert.equal(actor.character.key, 'mi', id);
    assert.equal(actor.variant, pose, id);
    assert.equal(cgForBeat(beat, scene.id), undefined, `${id}: not hidden by a CG`);
  }
});

test('a missing expression falls back within its costume before the canonical portrait', () => {
  const actor = { ...at('0-1', '0-1:15:0').actor, expression: 'angry' as const };
  assert.deepEqual(actorPortraitCandidates(actor), ['portrait-shen-home', 'portrait-shen-angry', 'portrait-shen']);
  assert.deepEqual(actorPortraitCandidates(at('0-1', '0-1:15:0').actor),
    ['portrait-shen-home-surprised', 'portrait-shen-home', 'portrait-shen-surprised', 'portrait-shen']);
});

test('every registered variant and inherited expression has transparent masters and both browser sizes', async () => {
  for (const [key, variants] of Object.entries(ACTOR_VARIANTS)) for (const [variant, expressions] of Object.entries(variants)) {
    for (const expression of expressions!) {
      const name = actorPortraitName({ character: { key }, variant: variant as keyof typeof variants, expression });
      await access(new URL(`../resources/art-src/variants/${name}.png`, import.meta.url));
      for (const suffix of ['.webp', '.avif', '-m.webp', '-m.avif']) await access(new URL(`../public/art/${name}${suffix}`, import.meta.url));
    }
  }
  for (const [id, expression] of Object.entries(BEAT_OVERRIDES)) {
    const actor = at(id.split(':')[0], id).actor;
    if (actor.variant !== 'default') assert.ok(actorPortraitName(actor).endsWith(`-${expression}`), `${id}: preserve authored acting in new clothes`);
  }
});
