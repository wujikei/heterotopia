import assert from 'node:assert/strict';
import test from 'node:test';
import { Soundscape } from '../src/audio';
import { scoreFrame } from '../src/score';
import type { ScoreFrame } from '../src/score';
import type { Settings } from '../src/types';

const settings: Settings = { language: 'zh', muted: false, musicVolume: 45, ambienceVolume: 38, sfxVolume: 55, textSpeed: 32, autoDelay: 4, fontSize: 22, reducedMotion: false, showSprites: true, lightweight: false, autoAfterChoice: true };
const settle = () => new Promise(resolve => setTimeout(resolve, 0));

/** Only browser policy/clock/device boundaries are simulated; Soundscape is real. */
function device(native = false, initiallyBlocked = false, pendingResume = false, blockMusicOnly = false) {
  const pending: (() => void)[] = [];
  let blocked = initiallyBlocked;
  const starts: { key: string; offset: number; stopped: boolean }[] = [];
  const downloads: string[] = [];
  const held = new Map<string, (response: Response) => void>();
  const contexts: Context[] = [];
  const media: Media[] = [];
  const document = Object.assign(new EventTarget(), { hidden: false });
  const parameter = () => ({ value: 0, setTargetAtTime(value: number) { this.value = value; }, setValueAtTime(value: number) { this.value = value; }, cancelScheduledValues() {}, linearRampToValueAtTime(value: number) { this.value = value; } });
  const gain = () => ({ gain: parameter(), connect() {}, disconnect() {} });
  class Context extends EventTarget {
    state = 'suspended'; currentTime = 0; destination = {};
    constructor() { super(); contexts.push(this); }
    createGain = gain;
    createDynamicsCompressor = () => ({ threshold: parameter(), knee: parameter(), ratio: parameter(), attack: parameter(), release: parameter(), connect() {} });
    resume = async () => {
      if (blocked) {
        if (pendingResume) return new Promise<void>(resolve => pending.push(resolve));
        throw new DOMException('Gesture required', 'NotAllowedError');
      }
      this.state = 'running'; this.dispatchEvent(new Event('statechange'));
      pending.splice(0).forEach(resolve => resolve());
    };
    suspend = async () => { this.state = 'suspended'; this.dispatchEvent(new Event('statechange')); };
    close = async () => { this.state = 'closed'; this.dispatchEvent(new Event('statechange')); };
    decodeAudioData = async (bytes: ArrayBuffer) => ({ file: new TextDecoder().decode(bytes), duration: 57, length: 44100, numberOfChannels: 2 });
    createBufferSource = () => {
      let record: (typeof starts)[number] | undefined;
      return { buffer: null as { file: string } | null, loop: false, loopStart: 0, loopEnd: 0, onended: null as (() => void) | null,
        connect() {}, disconnect() {}, stop() { if (record) record.stopped = true; },
        start(_at: number, offset: number) { record = { key: this.buffer!.file, offset, stopped: false }; starts.push(record); },
      };
    };
  }
  class Media extends EventTarget {
    paused = true; ended = false; currentTime = 0; duration = 57; volume = 0; dataset: Record<string, string> = {}; loop = false; preload = '';
    constructor(public src = '') { super(); media.push(this); }
    canPlayType() { return 'probably'; }
    async play() {
      if (blocked && (!blockMusicOnly || this.src.includes('music-'))) throw new DOMException('Gesture required', 'NotAllowedError');
      const file = this.src.split('/').at(-1)!;
      if (held.has(file)) await new Promise<Response>(resolve => held.set(file, resolve));
      this.paused = false; this.dispatchEvent(new Event('playing'));
    }
    pause() { this.paused = true; this.dispatchEvent(new Event('pause')); }
    removeAttribute() { this.src = ''; }
    load() {}
  }
  const replacements = {
    window: { AudioContext: native ? undefined : Context, setTimeout, clearTimeout, setInterval, clearInterval },
    document, Audio: Media,
    fetch: async (url: string) => {
      downloads.push(url);
      const key = url.split('/').at(-1)!;
      if (held.has(key)) return new Promise<Response>(resolve => held.set(key, resolve));
      return new Response(url);
    },
  };
  const descriptors = Object.fromEntries(Object.keys(replacements).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(replacements)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  return { starts, downloads, contexts, media, document,
    hold: (file: string) => held.set(file, () => {}),
    release: (file: string) => { held.get(file)?.(new Response(file)); held.delete(file); },
    allow: () => { blocked = false; }, restore() {
    for (const key of Object.keys(replacements)) {
      const descriptor = descriptors[key];
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key);
    }
  } };
}

for (const native of [false, true]) test(`${native ? 'native media' : 'Web Audio'}: blocked startup stays truthful and first gesture starts the title once`, async () => {
  const mock = device(native, true), sound = new Soundscape();
  try {
    await sound.unlock(settings); await settle();
    assert.equal(sound.getSnapshot().playing, false);
    assert.equal(sound.getSnapshot().unlocked, false);
    assert.equal(sound.getSnapshot().needsGesture, true);
    assert.equal(sound.getSnapshot().available, true, 'Autoplay policy is not a codec failure');
    mock.allow(); await sound.unlock(settings); await settle();
    assert.equal(sound.getSnapshot().track, 'river-home');
    assert.equal(sound.getSnapshot().playing, true);
    assert.equal(sound.getSnapshot().needsGesture, false);
    await sound.unlock(settings); sound.direct(scoreFrame('', null), { blocked: true }); await settle();
    if (native) assert.equal(mock.media.filter(item => item.src.endsWith('music-river-home.mp3') && !item.paused).length, 1);
    else assert.equal(mock.starts.filter(item => item.key.endsWith('music-river-home.mp3')).length, 1);
  } finally { sound.dispose(); mock.restore(); }
});

test('allowed autoplay starts title music; a persisted mute does not even create a device', async () => {
  const mock = device(), sound = new Soundscape();
  try {
    await sound.unlock({ ...settings, muted: true }); await settle();
    assert.equal(mock.contexts.length, 0); assert.equal(mock.downloads.length, 0);
    assert.equal(sound.getSnapshot().playing, false); assert.equal(sound.getSnapshot().needsGesture, false);
    await sound.unlock(settings); await settle();
    assert.equal(sound.getSnapshot().playing, true); assert.equal(sound.getSnapshot().track, 'river-home');
    sound.update({ ...settings, muted: true }); assert.equal(sound.getSnapshot().playing, false);
    sound.update(settings); assert.equal(sound.getSnapshot().playing, true);
  } finally { sound.dispose(); mock.restore(); }
});

for (const native of [false, true]) test(`${native ? 'native media' : 'Web Audio'}: room shares the scene transport, pauses once, seeks, resumes and exits`, async () => {
  const mock = device(native), sound = new Soundscape();
  try {
    await sound.unlock(settings); await settle();
    const titleStarts = () => mock.starts.filter(item => item.key.endsWith('music-river-home.mp3')).length;
    if (native) mock.media.filter(item => item.src.endsWith('music-river-home.mp3')).forEach(item => { item.currentTime = 12; });
    else mock.contexts[0].currentTime = 12;
    const before = sound.position('river-home');
    assert.ok(before > 11);
    // Enter/leave without choosing a track must not start a second title source.
    sound.direct(scoreFrame('', null), { blocked: true }); sound.endPreview(); await settle();
    if (!native) assert.equal(titleStarts(), 1);
    assert.equal(sound.getSnapshot().preview, null);
    assert.equal(sound.getSnapshot().playing, true);
    sound.togglePreview('river-home');
    assert.equal(sound.getSnapshot().previewPaused, true);
    assert.equal(sound.getSnapshot().playing, false);
    assert.equal(sound.position('river-home'), before);
    sound.seek('river-home', 20);
    assert.equal(sound.position('river-home'), 20); assert.equal(sound.getSnapshot().playing, false);
    sound.togglePreview('river-home', true); await settle();
    assert.equal(sound.getSnapshot().playing, true);
    if (!native) assert.equal(mock.starts.at(-1)?.offset, 20);
    sound.seek('river-home', 30); await settle();
    assert.equal(sound.getSnapshot().playing, true);
    if (!native) assert.equal(mock.starts.at(-1)?.offset, 30);
    const count = titleStarts();
    sound.endPreview(); await settle();
    assert.equal(sound.getSnapshot().preview, null); assert.equal(sound.getSnapshot().playing, true);
    if (!native) assert.equal(titleStarts(), count, 'Closing the room must adopt the already-playing title');
    // Context interruption/native pause cannot leave a phantom pause icon.
    if (native) mock.media.filter(item => item.src.endsWith('music-river-home.mp3')).forEach(item => item.pause());
    else await mock.contexts[0].suspend();
    assert.equal(sound.getSnapshot().playing, false);
    await sound.unlock(settings); await settle();
    assert.equal(sound.getSnapshot().playing, true);
  } finally { sound.dispose(); mock.restore(); }
});

test('switching tracks and returning to story never resurrects a superseded request', async () => {
  const mock = device(), sound = new Soundscape();
  try {
    await sound.unlock(settings); await settle();
    sound.togglePreview('paper-note', true);
    sound.togglePreview('old-jade', true);
    await settle();
    assert.equal(sound.getSnapshot().track, 'old-jade');
    assert.equal(sound.getSnapshot().loading, false);
    sound.endPreview(); await settle();
    assert.equal(sound.getSnapshot().track, 'river-home');
    assert.equal(mock.starts.filter(item => item.key.endsWith('music-paper-note.mp3')).length, 0);
  } finally { sound.dispose(); mock.restore(); }
});

test('a realm change retires the outgoing cue before the new file resolves', async () => {
  const mock = device(), sound = new Soundscape();
  const title = scoreFrame('', null);
  const dorm: ScoreFrame = { ...title, scene: 'modern-o-0-2', music: 'modern-question', releaseBeforeLoad: false };
  const chu: ScoreFrame = { ...title, scene: 'modern-o-0-3', music: 'ritual', transition: .75 };
  const ritualFile = 'music-ritual.mp3';
  try {
    sound.direct(dorm);
    await sound.unlock(settings); await settle();
    assert.equal(sound.getSnapshot().track, 'modern-question');
    mock.hold(ritualFile);
    sound.direct(chu);
    assert.equal(sound.getSnapshot().sceneTrack, 'ritual');
    assert.equal(sound.getSnapshot().track, null);
    assert.equal(sound.getSnapshot().loadingTrack, 'ritual');
    assert.ok(mock.starts.find(start => start.key.endsWith('music-modern-question.mp3'))?.stopped);
    assert.ok(!mock.starts.some(start => start.key.endsWith(ritualFile)));
    sound.direct({ ...chu, cue: 'same-ritual-next-page' });
    mock.release(ritualFile); await settle();
    assert.equal(sound.getSnapshot().track, 'ritual');
    assert.equal(mock.starts.filter(start => start.key.endsWith(ritualFile)).length, 1);
    assert.equal(sound.getSnapshot().playing, true);
  } finally { mock.release(ritualFile); sound.dispose(); mock.restore(); }
});

test('native playback preserves an incoming cue when another page arrives before it can play', async () => {
  const mock = device(true), sound = new Soundscape();
  const chu: ScoreFrame = { ...scoreFrame('', null), scene: 'modern-o-0-3', music: 'ritual', transition: .75, ambience: [] };
  const file = 'music-ritual.mp3';
  try {
    await sound.unlock(settings); await settle();
    mock.hold(file);
    sound.direct(chu);
    sound.direct({ ...chu, cue: 'next-page' }, { blocked: true });
    assert.equal(sound.getSnapshot().track, null);
    assert.equal(sound.getSnapshot().loadingTrack, 'ritual');
    mock.release(file); await settle();
    assert.equal(sound.getSnapshot().track, 'ritual');
    assert.equal(mock.media.filter(item => item.src.endsWith(file) && !item.paused).length, 1);
  } finally { mock.release(file); sound.dispose(); mock.restore(); }
});

test('fast-forward cannot carry a modern cue across the cut and leaving a preview restores silence', async () => {
  const mock = device(), sound = new Soundscape();
  const title = scoreFrame('', null);
  const dorm: ScoreFrame = { ...title, scene: 'modern-o-0-2', music: 'modern-question', releaseBeforeLoad: false };
  const chu: ScoreFrame = { ...title, scene: 'modern-o-0-3', music: 'ritual', transition: .75 };
  try {
    sound.direct(dorm);
    await sound.unlock(settings); await settle();
    sound.direct(chu, { skipping: true }); await settle();
    assert.equal(sound.getSnapshot().track, null);
    assert.ok(!mock.downloads.some(file => file.endsWith('music-ritual.mp3')), 'skipping must not fetch the passing score');
    sound.direct(chu); await settle();
    assert.equal(sound.getSnapshot().track, 'ritual');
    const quiet: ScoreFrame = { ...chu, scene: 'modern-k-G-1', music: null, ambience: [] };
    sound.direct(quiet);
    sound.togglePreview('paper-note', true); await settle();
    assert.equal(sound.getSnapshot().track, 'paper-note');
    assert.equal(sound.getSnapshot().sceneTrack, null);
    sound.endPreview(); await settle();
    assert.equal(sound.getSnapshot().track, null);
    assert.equal(sound.getSnapshot().playing, false);
    assert.ok(mock.starts.find(start => start.key.endsWith('music-paper-note.mp3'))?.stopped);
  } finally { sound.dispose(); mock.restore(); }
});


test('a pending browser resume publishes blocked state immediately and a later gesture resolves it', async () => {
  const mock = device(false, true, true), sound = new Soundscape();
  try {
    const startup = sound.unlock(settings);
    await settle();
    assert.equal(sound.getSnapshot().needsGesture, true);
    assert.equal(sound.getSnapshot().playing, false);
    assert.equal(mock.starts.length, 0);
    mock.allow(); await sound.unlock(settings); await startup; await settle();
    assert.equal(sound.getSnapshot().playing, true);
    assert.equal(mock.starts.filter(item => item.key.endsWith('music-river-home.mp3')).length, 1);
  } finally { sound.dispose(); mock.restore(); }
});


test('native ambience success cannot hide a music-specific autoplay rejection', async () => {
  const mock = device(true, true, false, true), sound = new Soundscape();
  try {
    await sound.unlock(settings); await settle();
    assert.ok(mock.media.some(item => item.src.includes('amb-') && !item.paused));
    assert.equal(sound.getSnapshot().playing, false);
    assert.equal(sound.getSnapshot().unlocked, false);
    assert.equal(sound.getSnapshot().needsGesture, true);
    mock.allow(); await sound.unlock(settings); await settle();
    assert.equal(sound.getSnapshot().playing, true);
  } finally { sound.dispose(); mock.restore(); }
});
