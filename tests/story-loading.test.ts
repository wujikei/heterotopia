import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { compileScene, newProfile, sceneById } from '../src/engine';
import { isStoryReady, loadStory, SCENES } from '../src/story';

test('scene metadata supports the homepage before a shared, lossless story download', async () => {
  assert.equal(isStoryReady(), false);
  assert.equal(SCENES.length, 81);
  assert.equal(sceneById('0-1').title, '清晨·沈家卧室');
  assert.ok(SCENES.every(scene => scene.blocks.length === 0));
  assert.throws(() => compileScene('0-1', newProfile(), { inventory: [], choices: {} }), /剧情尚未载入/);
  const first = loadStory();
  assert.equal(loadStory(), first);
  await first;
  assert.equal(isStoryReady(), true);
  const original = JSON.parse(await readFile(new URL('../src/data/story.json', import.meta.url), 'utf8'));
  assert.deepEqual(SCENES, original.scenes);
  assert.ok(compileScene('0-1', newProfile(), { inventory: [], choices: {} }).length > 0);
});
