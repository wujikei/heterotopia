import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import test from 'node:test';
import { compileScene, newGame, newProfile, SCENES } from '../src/engine';
import { AMBIENCE_IDS, CUE_EFFECTS, EFFECT_IDS, MUSIC_BY_SCENE, MUSIC_IDS, ORIGINAL_MUSIC_IDS, scoreFrame, SOUNDTRACK, unlockedTracks } from '../src/score';
import { loadStory } from '../src/story.ts';

await loadStory();
await loadStory('overseas');

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

test('the overseas opening crossfades into its own theme and keeps it through the projection', () => {
  const profile = newProfile('overseas');
  const frame = (sceneId: string, beatId: string) => scoreFrame(sceneId,
    compileScene(sceneId, profile, { choices: {}, inventory: [] }).find(item => item.id === beatId)!);
  const street = frame('modern-o-0-1', 'modern-o-0-1:2:0');
  const quiet = frame('modern-o-0-2', 'modern-o-0-2:14:0');
  const carving = frame('modern-o-0-2', 'modern-o-0-2:17:0');
  const blackout = frame('modern-o-0-2', 'modern-o-0-2:21:0');
  assert.equal(street.music, 'modern-street');
  assert.deepEqual(street.ambience.map(([id]) => id), ['street']);
  assert.equal(quiet.music, 'modern-question');
  assert.equal(carving.music, quiet.music);
  assert.equal(blackout.music, quiet.music);
  assert.ok(carving.musicGain < quiet.musicGain);
});

test('the overseas return and finale cues follow the notebook, climb and shutter', () => {
  const frame = (id: string) => {
    const scene = id.split(':')[0];
    return scoreFrame(scene, beat(scene, id));
  };
  const bowl = frame('modern-o-4-1:24:0');
  const beforeBowl = frame('modern-o-4-1:23:0');
  const afterBowl = frame('modern-o-4-1:25:0');
  assert.equal(bowl.music, 'modern-return');
  assert.equal(beforeBowl.music, bowl.music);
  assert.equal(afterBowl.music, bowl.music);
  assert.deepEqual(beforeBowl.prepareEffects, ['dorm-bowl']);
  assert.equal(bowl.events.at(-1)?.effects[0]?.id, 'dorm-bowl');
  assert.equal(bowl.cue, 'modern-o-4-1:24:0');
  assert.ok(bowl.musicFade! < .06 + bowl.events.at(-1)!.effects[0].at!);
  assert.ok(bowl.musicGain < beforeBowl.musicGain && beforeBowl.musicGain === afterBowl.musicGain);
  assert.ok(bowl.ambience[0][1] < beforeBowl.ambience[0][1]);
  const pause = frame('modern-o-4-2:10:0');
  const before = frame('modern-o-4-2:7:0');
  const office = frame('modern-o-5-1:10:0');
  assert.equal(pause.music, 'modern-untranslated');
  assert.equal(office.music, pause.music);
  assert.ok(pause.musicGain < before.musicGain);
  assert.ok(office.musicGain > pause.musicGain);
  const ascent = frame('modern-o-5-3:2:0');
  const summit = frame('modern-o-5-6:4:0');
  assert.equal(ascent.music, 'modern-ascent');
  assert.equal(summit.music, ascent.music);
  const notebook = frame('modern-o-5-6:9:0');
  assert.equal(notebook.events.at(-1)?.effects[0]?.id, 'cloth');
  assert.equal(notebook.cue, 'modern-o-5-6:9:0');
  const calm = frame('modern-o-5-7:5:0');
  assert.ok(calm.ambience.every(([id]) => id !== 'wind'));
  const shutterBefore = frame('modern-o-5-7:16:0');
  const shutter = frame('modern-o-5-7:17:0');
  const shutterAfter = frame('modern-o-5-7:18:0');
  const ending = frame('modern-o-5-7:ending');
  assert.equal(shutter.music, 'modern-afterglow');
  assert.equal(ending.music, shutter.music);
  assert.deepEqual(shutterBefore.prepareEffects, ['camera-shutter']);
  assert.equal(shutter.events.at(-1)?.effects[0]?.id, 'camera-shutter');
  assert.equal(shutterBefore.events.flatMap(event => event.effects).length, 0);
  assert.equal(shutterAfter.events.flatMap(event => event.effects).length, 0);
  assert.equal(shutter.cue, shutterAfter.cue);
  assert.ok(shutter.musicFade! < .06 + shutter.events.at(-1)!.effects[0].at!);
  assert.ok(shutter.musicGain < ending.musicGain);
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
  assert.deepEqual(unlockedTracks({ visited: SCENES.map(scene => scene.id) }).sort(), [...ORIGINAL_MUSIC_IDS].sort());
  assert.deepEqual(unlockedTracks({ visited: ['modern-o-0-1'] }), ['river-home', 'modern-street']);
  assert.deepEqual(unlockedTracks({ visited: ['modern-o-0-1', 'modern-o-0-2'] }), ['river-home', 'modern-street', 'modern-question']);
  assert.deepEqual(unlockedTracks({ visited: ['modern-o-4-1', 'modern-o-4-2', 'modern-o-5-1', 'modern-o-5-3', 'modern-o-5-6', 'modern-o-5-7'] }),
    ['river-home', 'modern-return', 'small-goodbyes', 'modern-untranslated', 'modern-ascent', 'modern-afterglow', 'light-in-kitchen']);
});

test('every shipped audio asset has provenance, duration, peak headroom and a matching file', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/audio/manifest.json', import.meta.url), 'utf8'));
  const names = [...SOUNDTRACK.map(track => track.file), ...AMBIENCE_IDS.map(id => `amb-${id}.mp3`), ...EFFECT_IDS.map(id => `sfx-${id}.mp3`)];
  assert.deepEqual(SOUNDTRACK.map(track => track.id), [...MUSIC_IDS]);
  assert.equal(new Set(names).size, names.length);
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
  assert.equal(loaded.language, 'zh');
  raw = JSON.stringify({ language: 'de', musicVolume: 30 }); assert.equal(loadSettings().language, 'de');
  raw = JSON.stringify({ language: 'fr' }); assert.equal(loadSettings().language, 'zh');
  raw = JSON.stringify({ sfxVolume: 1000 }); assert.equal(loadSettings().sfxVolume, 100);
  raw = JSON.stringify({ sfxVolume: 'broken' }); assert.equal(loadSettings().sfxVolume, 55);
});
