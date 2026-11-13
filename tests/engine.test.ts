import assert from 'node:assert/strict';
import test from 'node:test';
import { advance, canReturn, choose, compileScene, completeEnding, continueEnding, currentBeat, enterScene, hasKunlun, hasRoyal, newGame, newProfile, recordProgress, revisitScene, SCENES } from '../src/engine';
import type { EndingId, Profile } from '../src/types';
import { loadStory } from '../src/story.ts';

await loadStory();

// These are isolated synthetic engine fixtures. They never touch player saves.
function journey(choices: Record<string, string>, state = newGame(newProfile()), profile = newProfile()) {
  let steps = 0;
  while (steps++ < 3000) {
    profile = recordProgress(state, profile);
    const beat = currentBeat(state, profile);
    if (beat.kind === 'ending') return { state, profile: completeEnding(state, profile), ending: beat.ending, steps };
    if (beat.kind === 'choice') {
      const key = choices[state.sceneId];
      assert.ok(key, `Missing choice for ${state.sceneId}`);
      const next = choose(state, profile, key);
      assert.notEqual(next, state, `Choice ${key} was blocked in ${state.sceneId}`);
      state = next;
    } else state = advance(state, profile);
  }
  assert.fail('Journey failed to terminate within 3000 pages');
}

test('all 81 scenes are compiled and original narrative paragraphs are lossless', () => {
  assert.equal(SCENES.length, 81);
  assert.equal(new Set(SCENES.map(s => s.id)).size, 81);
  for (const scene of SCENES) {
    assert.ok(compileScene(scene.id, newProfile(), { inventory: [], choices: {} }).length > 0, scene.id);
    for (const block of scene.blocks) {
      if (block.pages) assert.equal(block.pages.join(''), block.lines.join(''), `Text altered in ${scene.id} / ${block.tag}`);
    }
  }
});

test('the breakfast choice shows only its selected local branch and rejoins common text', () => {
  const profile = newProfile();
  let state = enterScene(newGame(profile), profile, '0-2', true);
  assert.equal(currentBeat(state, profile).kind, 'choice');
  state = choose(state, profile, 'A');
  assert.equal(currentBeat(state, profile).kind === 'text' && currentBeat(state, profile).id.includes('0-2:'), true);
  const lines = compileScene('0-2', profile, state).filter(b => b.kind === 'text').map(b => b.kind === 'text' ? b.text : '').join('');
  assert.ok(lines.includes('我吃好了，先下去。'));
  assert.ok(!lines.includes('阿姨，沈辞其实'));
  assert.ok(lines.includes('没有人提上周的事。'));
  state = enterScene(newGame(profile), profile, '0-2', true);
  state = choose(state, profile, 'B');
  const other = compileScene('0-2', profile, state).filter(b => b.kind === 'text').map(b => b.kind === 'text' ? b.text : '').join('');
  assert.ok(other.includes('阿姨，沈辞其实'));
  assert.ok(!other.includes('我吃好了，先下去。'));
});

for (const [key, expected] of [['A', 'blade'], ['B', 'mercy'], ['C', 'leave'], ['D', 'names']] as [string, EndingId][]) {
  test(`royal choice ${key} reaches only its own ending (${expected})`, () => {
    const result = journey({ '0-2': 'A', '1-12': 'A', 'A-6': key === 'D' ? 'A' : 'B', 'A-9': key });
    assert.equal(result.ending, expected);
    assert.ok(hasRoyal(result.profile));
    assert.ok(!hasKunlun(result.profile));
    assert.ok(!canReturn(result.profile));
    const returned = continueEnding(result.state, result.profile);
    assert.equal(returned.sceneId, '1-12');
    assert.equal(currentBeat(returned, result.profile).kind, 'choice', 'Loop must land directly on the choice');
    assert.equal(returned.cycle, 2);
    assert.deepEqual([...returned.inventory].sort(), ['jadeTail', 'birds', 'box', 'bone', 'coat'].sort());
    assert.ok(!returned.inventory.includes('jadeHead'));
    assert.ok(!returned.inventory.includes('jadeBody'));
  });
}

test('hidden names are persistent, but the three jade fragments must be collected in this run', () => {
  const result = journey({ '0-2': 'B', '1-12': 'A', 'A-6': 'A', 'A-9': 'B' });
  assert.equal(result.profile.oldNames, true);
  let state = continueEnding(result.state, result.profile);
  state = enterScene(state, result.profile, 'A-9', true);
  const blocked = currentBeat(state, result.profile);
  assert.ok(blocked.kind === 'choice');
  assert.equal(blocked.choices.find(c => c.key === 'D')?.disabled, true);
  assert.equal(choose(state, result.profile, 'D'), state);
  state = { ...state, inventory: [...state.inventory, 'jadeHead', 'jadeBody'] };
  const unlocked = currentBeat(state, result.profile);
  assert.ok(unlocked.kind === 'choice');
  assert.equal(unlocked.choices.find(c => c.key === 'D')?.disabled, false);
  assert.equal(choose(state, result.profile, 'D').sceneId, 'A-H-1');
});

test('royal then Kunlun opens the complete return chapter', () => {
  const royal = journey({ '0-2': 'A', '1-12': 'A', 'A-6': 'A', 'A-9': 'D' });
  const secondStart = continueEnding(royal.state, royal.profile);
  const kunlun = journey({ '1-12': 'B' }, secondStart, royal.profile);
  assert.equal(kunlun.ending, 'kunlun');
  assert.ok(canReturn(kunlun.profile));
  const returning = continueEnding(kunlun.state, kunlun.profile);
  assert.equal(returning.sceneId, '终-1');
  const final = journey({}, returning, kunlun.profile);
  assert.equal(final.ending, 'home');
  assert.equal(final.state.sceneId, '终-5');
  assert.ok(final.profile.endings.includes('home'));
});

test('Kunlun then royal also loops correctly and opens the same return chapter', () => {
  const kunlun = journey({ '0-2': 'B', '1-12': 'B' });
  assert.equal(kunlun.ending, 'kunlun');
  assert.ok(!canReturn(kunlun.profile));
  const secondStart = continueEnding(kunlun.state, kunlun.profile);
  assert.equal(currentBeat(secondStart, kunlun.profile).kind, 'choice');
  const royal = journey({ '1-12': 'A', 'A-6': 'B', 'A-9': 'B' }, secondStart, kunlun.profile);
  assert.equal(royal.ending, 'mercy');
  assert.ok(canReturn(royal.profile));
  assert.equal(continueEnding(royal.state, royal.profile).sceneId, '终-1');
});

test('conditional memories in the cave and light river obey the route history', () => {
  const fresh = newProfile();
  const remembered = { ...newProfile(), endings: ['mercy' as const] };
  const sceneText = (id: string, profile: Profile) => compileScene(id, profile, { inventory: [], choices: {} }).filter(b => b.kind === 'text').map(b => b.kind === 'text' ? b.text : '').join('');
  assert.ok(sceneText('B-10-2', fresh).includes('一个未见过的孩子'));
  assert.ok(!sceneText('B-10-2', fresh).includes('屈衡扶灯、翻简'));
  assert.ok(sceneText('B-10-2', remembered).includes('屈衡扶灯、翻简'));
  assert.ok(!sceneText('B-10-2', remembered).includes('一个未见过的孩子'));
  assert.ok(sceneText('B-13', remembered).includes('后来写了谏书'));
  assert.ok(!sceneText('B-13', fresh).includes('后来写了谏书'));
});

test('chapter revisits preserve memory while rebuilding timeline-appropriate objects', () => {
  const result = journey({ '0-2': 'A', '1-12': 'A', 'A-6': 'A', 'A-9': 'D' });
  const morning = revisitScene(result.state, result.profile, '0-2');
  assert.deepEqual(morning.inventory, []);
  const village = revisitScene(result.state, result.profile, '1-12');
  assert.ok(village.inventory.includes('jadeTail'));
  assert.ok(!village.inventory.includes('jadeHead'));
  const guarded = revisitScene(result.state, result.profile, '终-1');
  assert.equal(guarded, result.state);
  const unvisited = revisitScene(result.state, result.profile, 'B-12-2');
  assert.equal(unvisited, result.state);
});
