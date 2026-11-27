import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { compileScene, newProfile, sceneById } from '../src/engine';
import { isSceneReady, isStoryReady, loadSceneStory, loadStory, MODERN_SCENES, SCENES } from '../src/story';
import { tracksForVisit } from '../src/score';

test('scene indexes keep the homepage ready and load only the selected narrative volume', async () => {
  assert.equal(isStoryReady(), false);
  assert.equal(isStoryReady('overseas'), false);
  assert.equal(SCENES.length, 81);
  assert.ok(MODERN_SCENES.length > 100);
  assert.equal(sceneById('0-1').title, '清晨·沈家卧室');
  assert.ok(SCENES.every(scene => scene.blocks.length === 0));
  assert.throws(() => compileScene('0-1', newProfile(), { inventory: [], choices: {} }), /剧情尚未载入/);
  const first = loadStory();
  assert.equal(loadStory(), first);
  await first;
  assert.equal(isStoryReady(), true);
  assert.equal(isStoryReady('overseas'), false, 'the original edition does not fetch the modern volume');
  const original = JSON.parse(await readFile(new URL('../src/data/story.json', import.meta.url), 'utf8'));
  assert.deepEqual(SCENES, original.scenes);
  assert.ok(compileScene('0-1', newProfile(), { inventory: [], choices: {} }).length > 0);
  assert.throws(() => compileScene('modern-o-0-1', newProfile('overseas'), { inventory: [], choices: {} }), /剧情尚未载入/);
  const modernLoad = loadStory('overseas');
  assert.equal(loadStory('overseas'), modernLoad);
  await modernLoad;
  assert.equal(isStoryReady('overseas'), true);
  assert.ok(compileScene('modern-o-0-1', newProfile('overseas'), { inventory: [], choices: {} }).length > 0);
  assert.deepEqual(SCENES, original.scenes);
});

test('Shenci opens with only the prologue and loads music availability from the index', async () => {
  const start = 'shenci-d-0-1', firstChuScene = 'shenci-d-1-2';
  const profile = newProfile('shenci');
  const state = { inventory: [], choices: {} };
  const opening = loadSceneStory('shenci', start);
  assert.equal(loadSceneStory('shenci', 'shenci-d-0-11'), opening);
  await opening;
  assert.equal(isStoryReady('shenci'), false);
  assert.equal(isSceneReady('shenci', start), true);
  assert.equal(isSceneReady('shenci', firstChuScene), false);
  assert.ok(compileScene(start, profile, state).length > 0);
  assert.throws(() => compileScene(firstChuScene, profile, state), /剧情尚未载入/);
  assert.ok(tracksForVisit('shenci-k-D-5').includes('chu-storm'));

  const remainder = loadSceneStory('shenci', firstChuScene);
  assert.equal(loadStory('shenci'), remainder);
  await remainder;
  assert.equal(isSceneReady('shenci', firstChuScene), true);
  assert.ok(compileScene(firstChuScene, profile, state).length > 0);
  assert.ok(compileScene(start, profile, state).length > 0);
});
