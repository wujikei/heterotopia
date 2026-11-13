import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import test from 'node:test';
import { compileScene, newGame, newProfile, SCENES } from '../src/engine';
import { AMBIENCE_IDS, CUE_EFFECTS, EFFECT_IDS, MUSIC_BY_SCENE, MUSIC_IDS, scoreFrame, SOUNDTRACK, unlockedTracks } from '../src/score';
import { loadStory } from '../src/story.ts';

await loadStory();

const profile = { ...newProfile(), oldNames: true, endings: ['mercy', 'names', 'kunlun'] as const };
const progress = { ...profile, endings: [...profile.endings] };
const state = { ...newGame(progress), inventory: ['jadeHead', 'jadeBody', 'jadeTail'], choices: { breakfast: 'B' } };
const beat = (scene: string, id: string) => {
  const result = compileScene(scene, progress, state).find(item => item.id === id);
  assert.ok(result, `Unknown fixture ${id}`);
  return result;
};

test('all scenes have authored music, valid environmental layers and stable screenplay cues', () => {
  assert.deepEqual(Object.keys(MUSIC_BY_SCENE).sort(), SCENES.map(scene => scene.id).sort());
  for (const scene of SCENES) {
    const beats = compileScene(scene.id, progress, state);
    for (const item of beats) {
      const frame = scoreFrame(scene.id, item);
      assert.ok(frame.music === null || MUSIC_IDS.includes(frame.music));
      assert.ok(frame.ambience.length <= 2);
      frame.ambience.forEach(([id, level]) => { assert.ok(AMBIENCE_IDS.includes(id)); assert.ok(level >= 0 && level <= 1); });
      const block = Number(item.audioCueId.split(':')[1]);
      assert.equal(scene.blocks[block].tag.split('·')[0], '音效');
      frame.events.forEach(event => event.effects.forEach(effect => assert.ok(EFFECT_IDS.includes(effect.id))));
    }
  }
  for (const id of Object.keys(CUE_EFFECTS)) {
    const [scene, index] = id.split(':');
    assert.equal(SCENES.find(item => item.id === scene)?.blocks[Number(index)].tag.split('·')[0], '音效');
  }
});

test('paragraphs share their cue, while the alarm cuts the dream and changes the score', () => {
  const first = scoreFrame('0-1', beat('0-1', '0-1:3:0'));
  const next = scoreFrame('0-1', beat('0-1', '0-1:3:1'));
  assert.equal(first.cue, next.cue);
  assert.equal(first.events[0].id, next.events[0].id);
  const alarm = compileScene('0-1', progress, state).find(item => item.audioCueId === '0-1:6')!;
  const changed = scoreFrame('0-1', alarm);
  assert.equal(changed.music, 'paper-note');
  assert.ok(changed.transition < .3);
  assert.equal(changed.events[0].effects[0].id, 'alarm');
});

test('three farewells remove the music at their exact narrative pages', () => {
  assert.equal(scoreFrame('B-5-5', beat('B-5-5', 'B-5-5:8:2')).music, 'small-goodbyes');
  const tu = scoreFrame('B-5-5', beat('B-5-5', 'B-5-5:8:3'));
  assert.equal(tu.music, null); assert.deepEqual(tu.ambience, [['river', .12]]);
  assert.equal(scoreFrame('B-10-4', beat('B-10-4', 'B-10-4:11:1')).music, 'small-goodbyes');
  assert.equal(scoreFrame('B-10-4', beat('B-10-4', 'B-10-4:11:2')).music, null);
  const last = scoreFrame('B-12-2', beat('B-12-2', 'B-12-2:9:4'));
  assert.equal(last.music, null); assert.deepEqual(last.ambience, []);
  const water = scoreFrame('B-12-2', beat('B-12-2', 'B-12-2:9:6'));
  assert.equal(water.music, null); assert.deepEqual(water.ambience, [['river', .1]]);
  assert.equal(scoreFrame('B-13', compileScene('B-13', progress, state)[0]).music, 'river-of-names');
});

test('the listening room unlocks music from visited scenes without exposing future track names', () => {
  assert.deepEqual(unlockedTracks(newProfile()), ['river-home']);
  assert.deepEqual(unlockedTracks({ visited: ['0-1', '0-2', '1-1'] }), ['river-home', 'under-current', 'paper-note', 'hearth']);
  assert.deepEqual(unlockedTracks({ visited: SCENES.map(scene => scene.id) }).sort(), [...MUSIC_IDS].sort());
});

test('every shipped audio asset has provenance, duration, peak headroom and a matching file', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/audio/manifest.json', import.meta.url), 'utf8'));
  const names = [...SOUNDTRACK.map(track => track.file), ...AMBIENCE_IDS.map(id => `amb-${id}.mp3`), ...EFFECT_IDS.map(id => `sfx-${id}.mp3`)];
  assert.equal(names.length, 51);
  assert.deepEqual(manifest.files.map((file: { file: string }) => file.file).sort(), names.sort());
  for (const file of manifest.files) {
    assert.ok(existsSync(new URL(`../public/audio/${file.file}`, import.meta.url)));
    assert.ok(file.seconds > 0 && file.bytes > 1000);
    assert.ok(file.truePeakDB <= -1);
    if (file.kind === 'music') { assert.ok(file.integratedLUFS >= -20 && file.integratedLUFS <= -17); assert.ok(file.seconds > 55); }
    assert.ok(file.source.length > 10);
  }
});

test('old settings keep existing volumes and receive a separate effect volume', async () => {
  // Isolated synthetic storage only; no player profile or real browser is used.
  let raw = JSON.stringify({ musicVolume: 30, ambienceVolume: 38, muted: false });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { matchMedia: () => ({ matches: false }) } });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => raw } });
  const { loadSettings, DEFAULT_SETTINGS } = await import('../src/storage');
  const loaded = loadSettings();
  assert.equal(loaded.musicVolume, 30); assert.equal(loaded.ambienceVolume, 38); assert.equal(loaded.sfxVolume, DEFAULT_SETTINGS.sfxVolume);
  raw = JSON.stringify({ sfxVolume: 1000 }); assert.equal(loadSettings().sfxVolume, 100);
  raw = JSON.stringify({ sfxVolume: 'broken' }); assert.equal(loadSettings().sfxVolume, 55);
});
