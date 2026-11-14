import assert from 'node:assert/strict';
import test from 'node:test';
import { actorForBeat } from '../src/actors';
import { CGS, cgForBeat, cgForEnding, cgUnlocked } from '../src/data/cgs';
import { AVAILABLE, BEAT_OVERRIDES, availableExpression, expressionForBeat, inferExpression, portraitNameFor } from '../src/data/expressions';
import { AVAILABLE_EXTRAS, extraFor } from '../src/data/extras';
import { presenceForBeat } from '../src/data/presence';
import { compileScene, newGame, newProfile, SCENES } from '../src/engine';
import type { Beat, Scene } from '../src/types';
import { loadStory } from '../src/story.ts';

await loadStory();

const textBeat = (id: string, mood = '', speaker = '戌'): Beat => ({
  id, kind: 'text', speaker, mood, text: '正文', background: 'hut', cast: [], atmosphere: '', audioCueId: '', direction: '',
});

test('expression annotations override conservative mood inference', () => {
  assert.equal(expressionForBeat(textBeat('0-1:15:0', '平静')), 'surprised');
  assert.equal(inferExpression('轻声说，垂眼，咬住药包绳头'), 'default');
  assert.equal(inferExpression('苦笑着说'), 'sad');
  assert.equal(inferExpression('闭上眼'), 'closed');
  assert.equal(inferExpression('怒而咬牙'), 'angry');
  assert.equal(inferExpression('笑了一下'), 'smile');
});

test('delivered expressions resolve while undelivered names fall back to real portrait variants', () => {
  assert.deepEqual(AVAILABLE.shen, ['default', 'smile', 'surprised', 'angry', 'sad', 'closed']);
  assert.equal(availableExpression('shen', 'smile'), 'smile');
  assert.equal(availableExpression('song', 'smile'), 'default');
  assert.equal(portraitNameFor('tu', 'smile'), 'portrait-tu-v2');
  assert.equal(portraitNameFor('xua', 'angry'), 'portrait-xua-v3');
});

test('every expression override reaches a compiled speaking page with a delivered visible expression', () => {
  const found = new Set<string>();
  const visible = new Map<string, Set<string>>();
  for (const endings of [[], ['mercy', 'kunlun'], ['blade', 'names', 'kunlun']] as const) {
    const profile = { ...newProfile(), endings: [...endings], oldNames: endings.length > 0 };
    for (const breakfast of ['A', 'B']) for (const scene of SCENES) {
      const beats = compileScene(scene.id, profile, { choices: { breakfast }, inventory: ['jadeHead', 'jadeBody', 'jadeTail', 'names'] });
      for (const beat of beats) {
        const expression = BEAT_OVERRIDES[beat.id];
        if (!expression) continue;
        found.add(beat.id);
        assert.equal(beat.kind, 'text', `${beat.id}: dialogue page`);
        const actor = actorForBeat(beat, scene, beats);
        assert.ok(actor, `${beat.id}: actual stage actor`);
        assert.equal(actor.expression, expression, `${beat.id}: annotated expression`);
        assert.ok(AVAILABLE[actor.character.key]?.includes(expression), `${beat.id}: ${actor.character.key} has ${expression}`);
        assert.equal(availableExpression(actor.character.key, expression), expression, `${beat.id}: no portrait fallback`);
        assert.equal(cgForBeat(beat, scene.id), undefined, `${beat.id}: portrait is not covered by a CG`);
        const pages = visible.get(actor.character.key) ?? new Set<string>();
        pages.add(beat.id);
        visible.set(actor.character.key, pages);
      }
    }
  }
  assert.deepEqual([...found].sort(), Object.keys(BEAT_OVERRIDES).sort());
  const priorityActors = ['shen', 'xu', 'tang', 'amao', 'quheng', 'yu', 'xua', 'yuan'];
  for (const key of priorityActors) assert.ok((visible.get(key)?.size ?? 0) >= 2, `${key}: at least two supported visible pages`);
});

test('only registered side portraits stage; explicit silent presence is narrow', () => {
  assert.equal(AVAILABLE_EXTRAS.size, 5);
  assert.equal(extraFor('周老师')?.key, 'zhou');
  assert.equal(extraFor('邋遢道士')?.key, 'daoist');
  assert.equal(extraFor('提到周老师'), undefined);
  assert.deepEqual(presenceForBeat('B-13:8:2'), ['mi']);
  const scene = { id: 'B-13', route: 'kunlun' } as Scene;
  const silent = actorForBeat(textBeat('B-13:8:2', '', '旁白'), scene, []);
  assert.equal(silent?.character.key, 'mi');
  assert.equal(actorForBeat(textBeat('B-13:8:3', '', '旁白'), scene, []), undefined);
  assert.equal(actorForBeat(textBeat('0-1:15:0', '', '沈辞在记忆中提到芈'), scene, []), undefined);
});

test('reviewed CGs match their exact story interval and unlock only after reading', () => {
  assert.equal(CGS.filter(cg => !!cg.file).length, 14);
  const beatIds = new Set<string>();
  for (const scene of SCENES) {
    for (const breakfast of ['A', 'B']) {
      for (const beat of compileScene(scene.id, newProfile(), { choices: { breakfast }, inventory: ['jadeHead', 'jadeBody', 'jadeTail', 'names'] })) beatIds.add(beat.id);
    }
  }
  for (const cg of CGS) {
    if ('beatIds' in cg.trigger) for (const id of cg.trigger.beatIds) assert.ok(beatIds.has(id), `${cg.id}: ${id}`);
    if ('fromBeat' in cg.trigger && cg.trigger.fromBeat) assert.ok(beatIds.has(cg.trigger.fromBeat), `${cg.id}: ${cg.trigger.fromBeat}`);
    if ('toBeat' in cg.trigger && cg.trigger.toBeat) assert.ok(beatIds.has(cg.trigger.toBeat), `${cg.id}: ${cg.trigger.toBeat}`);
  }
  assert.equal(cgForBeat(textBeat('B-13:8:2'), 'B-13')?.id, 's05-mi-flute');
  assert.equal(cgForBeat(textBeat('B-13:8:3'), 'B-13'), undefined);
  assert.equal(cgForBeat(textBeat('B-1:21:0'), 'B-1')?.id, 's02-first-crossing');
  assert.equal(cgForBeat(textBeat('B-1:22:3'), 'B-1')?.id, 's02-first-crossing');
  assert.equal(cgForBeat(textBeat('B-1:23:0'), 'B-1'), undefined);
  assert.equal(cgForBeat(textBeat('B-13:3:3'), 'B-13')?.id, 's07-light-river');
  assert.equal(cgForBeat(textBeat('B-13:3:4'), 'B-13'), undefined);
  const profile = newProfile();
  profile.endings = ['home'];
  assert.equal(cgForEnding('home')?.file, 'cg-e6-home');
  assert.equal(cgUnlocked(CGS.find(cg => cg.id === 'e6-home')!, profile), true);
  assert.equal(cgUnlocked(CGS.find(cg => cg.id === 's01-dream-boat')!, newProfile()), false);
  profile.read = ['0-1:3:0'];
  assert.equal(cgUnlocked(CGS.find(cg => cg.id === 's01-dream-boat')!, profile), true);
  assert.equal(cgUnlocked(CGS.find(cg => cg.id === 's02-first-crossing')!, profile), false);
  assert.ok(newGame(profile));
});
