import assert from 'node:assert/strict';
import test from 'node:test';
import { Soundscape } from '../src/audio';
import { CHAPTER_EFFECTS, ENDING_EFFECTS, MUSIC_ALTERNATES, MUSIC_IDS, UI_EFFECTS, chapterSoundEvent, musicSegment, scoreFrame, trackById } from '../src/score';
import type { Settings } from '../src/types';

const settings = { muted: false, musicVolume: 45, ambienceVolume: 38, sfxVolume: 55 } as Settings;
const settle = () => new Promise(resolve => setTimeout(resolve, 0));

function backend() {
  const starts: { file: string; loop: boolean }[] = [];
  const downloads: string[] = [];
  let blocked = false;
  const parameter = () => ({ value: 0, setTargetAtTime(value: number) { this.value = value; }, setValueAtTime(value: number) { this.value = value; }, cancelScheduledValues() {}, linearRampToValueAtTime(value: number) { this.value = value; } });
  const gain = () => ({ gain: parameter(), connect() {}, disconnect() {} });
  class Context {
    state = 'suspended'; currentTime = 0; destination = {};
    createGain = gain;
    createDynamicsCompressor = () => ({ threshold: parameter(), knee: parameter(), ratio: parameter(), attack: parameter(), release: parameter(), connect() {} });
    resume = () => { if (blocked) return Promise.reject(new Error('Synthetic autoplay rejection')); this.state = 'running'; return Promise.resolve(); };
    suspend = () => { this.state = 'suspended'; return Promise.resolve(); };
    close = () => { this.state = 'closed'; return Promise.resolve(); };
    decodeAudioData = async (bytes: ArrayBuffer) => ({ file: new TextDecoder().decode(bytes), duration: 1, length: 44100, numberOfChannels: 2 });
    createBufferSource = () => {
      const source = { buffer: null as { file: string } | null, loop: false, loopStart: 0, loopEnd: 0, onended: null as (() => void) | null, connect() {}, disconnect() {}, stop() {}, start() { starts.push({ file: this.buffer!.file, loop: this.loop }); } };
      return source;
    };
  }
  const documentMock = { hidden: false, addEventListener() {}, removeEventListener() {} };
  const replacements = {
    window: { AudioContext: Context, setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout },
    document: documentMock,
    fetch: async (url: string) => { downloads.push(url); return new Response(url); },
  };
  const descriptors = Object.fromEntries(Object.keys(replacements).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(replacements)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  return { starts, downloads, documentMock, block: (value: boolean) => { blocked = value; }, restore: () => {
    for (const key of Object.keys(replacements)) {
      const descriptor = descriptors[key];
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  } };
}

test('unlock notifications reflect a running context and retry a rejected gesture', async () => {
  const mock = backend(), sound = new Soundscape();
  let changes = 0;
  const unsubscribe = sound.subscribe(() => { changes++; });
  try {
    mock.block(true);
    await sound.unlock(settings);
    assert.equal(sound.getSnapshot().unlocked, false);
    mock.block(false);
    await sound.unlock(settings);
    assert.equal(sound.getSnapshot().unlocked, true);
    assert.ok(changes > 0);
    await settle();
  } finally { unsubscribe(); sound.dispose(); mock.restore(); }
});

test('a prepared stamp plays from cache; interface sounds respect mute, volume, visibility and skipping', async () => {
  const mock = backend(), sound = new Soundscape();
  const effects = () => mock.starts.filter(start => !start.loop);
  try {
    sound.click('preview');
    assert.equal(mock.downloads.length, 0, 'UI must not fetch before a gesture');
    await sound.unlock(settings);
    sound.prepareUi('stamp');
    await settle();
    const beforeStamp = mock.downloads.length;
    sound.click('stamp'); await settle();
    assert.ok(effects().at(-1)?.file.endsWith('/sfx-wood-latch.mp3'));
    assert.equal(mock.downloads.length, beforeStamp, 'A timed stamp must not await its first network request');
    sound.click('open'); await settle();
    const opening = effects().at(-1)!.file;
    sound.click('close'); await settle();
    assert.notEqual(effects().at(-1)!.file, opening, 'Opening and closing should be distinguishable');
    sound.click('save'); await settle();
    assert.ok(effects().at(-1)?.file.endsWith('/sfx-bookmark.mp3'));
    const count = effects().length;
    sound.update({ ...settings, muted: true }); sound.click('preview'); await settle();
    assert.equal(effects().length, count);
    sound.update({ ...settings, sfxVolume: 0 }); sound.click('preview'); await settle();
    assert.equal(effects().length, count);
    sound.update(settings); mock.documentMock.hidden = true; sound.click('preview'); await settle();
    assert.equal(effects().length, count);
    mock.documentMock.hidden = false;
    sound.direct(scoreFrame('', null), { skipping: true }); sound.click('preview'); await settle();
    assert.equal(effects().length, count);
    sound.direct(scoreFrame('', null)); sound.click('preview'); await settle();
    assert.equal(effects().length, count + 1);
  } finally { sound.dispose(); mock.restore(); }
});

test('UI mappings use shipped files and future chapter, ending and alternate hooks stay silent', () => {
  assert.equal(UI_EFFECTS.stamp.id, 'wood-latch');
  assert.notEqual(UI_EFFECTS.open.id, UI_EFFECTS.close.id);
  assert.notEqual(UI_EFFECTS.bell.id, UI_EFFECTS.save.id);
  assert.deepEqual(CHAPTER_EFFECTS, {});
  assert.deepEqual(ENDING_EFFECTS, {});
  assert.deepEqual(MUSIC_ALTERNATES, {});
  assert.equal(chapterSoundEvent('0-1'), null);
  for (const id of MUSIC_IDS) {
    assert.equal(musicSegment(id, 0).file, trackById(id).file);
    assert.equal(musicSegment(id, 1).file, trackById(id).file);
  }
});
