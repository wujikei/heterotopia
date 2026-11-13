import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';
import { compileScene, newGame, newProfile, SCENES } from '../src/engine.ts';

const base = process.env.VN_TEST_URL || 'http://127.0.0.1:4173/heterotopia/';
const name = process.env.VN_TEST_BROWSER || 'chromium';
const browser = await ({ chromium, firefox, webkit }[name]).launch({ headless: true, ...(name === 'chromium' && /^https:/.test(base) ? { args: ['--no-proxy-server'] } : {}) });
const output = new URL(`../artifacts/audio-${name}/`, import.meta.url);
await mkdir(output, { recursive: true });
const contexts = [], errors = [], checks = [];
const screenshot = file => fileURLToPath(new URL(file, output));

// Tests use fresh, disposable profiles and explicitly synthetic story progress.
// Observers are injected only into these test pages, never into the shipped game.
async function open(fixture, forceMedia = false) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  contexts.push(context);
  await context.addInitScript(({ fixture: data, forceMedia }) => {
    if (!sessionStorage.getItem('synthetic-audio-test')) {
      localStorage.setItem('heterotopia.v1.settings', JSON.stringify({ textSpeed: 0, reducedMotion: true, muted: false, musicVolume: 45, ambienceVolume: 38, sfxVolume: 55 }));
      if (data) {
        localStorage.setItem('heterotopia.v1.profile', JSON.stringify(data.profile));
        localStorage.setItem('heterotopia.v1.autosave', JSON.stringify(data.state));
      }
      sessionStorage.setItem('synthetic-audio-test', 'true');
    }
    if (forceMedia) {
      Object.defineProperty(window, 'AudioContext', { configurable: true, value: undefined });
      Object.defineProperty(window, 'webkitAudioContext', { configurable: true, value: undefined });
    }
    const trace = window.__audioTest = { requests: [], starts: [], stops: [], gains: [], contexts: [], buffers: [], media: [], mediaElements: [] };
    const files = new WeakMap(), decoded = new WeakMap();
    const fetchOriginal = window.fetch;
    window.fetch = async (...args) => {
      const url = String(args[0]);
      if (url.includes('.mp3')) trace.requests.push(url.split('/').at(-1));
      const response = await fetchOriginal(...args), original = response.arrayBuffer.bind(response);
      response.arrayBuffer = async () => { const bytes = await original(); files.set(bytes, url.split('/').at(-1)); return bytes; };
      return response;
    };
    const Context = window.AudioContext ?? window.webkitAudioContext;
    if (Context) {
      const proto = Context.prototype;
      const decode = proto.decodeAudioData, createSource = proto.createBufferSource, createGain = proto.createGain;
      proto.decodeAudioData = function(bytes) {
        if (!trace.contexts.includes(this)) trace.contexts.push(this);
        const file = files.get(bytes);
        return decode.call(this, bytes).then(buffer => {
          decoded.set(buffer, file);
          trace.buffers.push({ file, seconds: buffer.duration, bytes: buffer.length * buffer.numberOfChannels * 4 });
          return buffer;
        });
      };
      proto.createGain = function() { const gain = createGain.call(this); trace.gains.push(gain); return gain; };
      proto.createBufferSource = function() {
        const source = createSource.call(this), start = source.start.bind(source), stop = source.stop.bind(source), context = this;
        let record;
        source.start = (...args) => {
          record = { file: decoded.get(source.buffer), loop: source.loop, at: context.currentTime, when: args[0] ?? 0, offset: args[1] ?? 0, ended: false };
          trace.starts.push(record); return start(...args);
        };
        source.stop = (...args) => { trace.stops.push({ file: decoded.get(source.buffer), at: context.currentTime, when: args[0] ?? 0 }); return stop(...args); };
        source.addEventListener('ended', () => { if (record) record.ended = true; });
        return source;
      };
    }
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function() {
      trace.media.push(this.src);
      if (!trace.mediaElements.includes(this)) trace.mediaElements.push(this);
      return play.call(this);
    };
  }, { fixture, forceMedia });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400 && !response.url().includes('favicon.ico')) errors.push(`${response.status()} ${response.url()}`); });
  await page.goto(base);
  await page.evaluate(() => document.fonts.ready);
  return page;
}

const count = (page, file) => page.evaluate(file => window.__audioTest.starts.filter(item => item.file === file).length, file);
const waitFor = (page, file) => page.waitForFunction(file => window.__audioTest.starts.some(item => item.file === file), file);
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem('heterotopia.v1.autosave')));
async function closeIntro(page) { if (await page.getByTestId('chapter-intro').count()) await page.getByTestId('chapter-intro').click(); }
async function turnPage(page) {
  // Model deliberate reading; repeated inputs within 180ms are now ignored.
  await page.waitForTimeout(200);
  const before = (await saved(page)).beatId;
  await page.getByRole('button', { name: '继续', exact: true }).click();
  await page.waitForFunction(before => JSON.parse(localStorage.getItem('heterotopia.v1.autosave')).beatId !== before, before);
}

try {
  const page = await open();
  assert.equal(await page.evaluate(() => window.__audioTest.requests.length), 0, 'No audio fetch before a user gesture');
  await page.getByRole('button', { name: '启程', exact: true }).click();
  await closeIntro(page);
  const webAudio = await page.evaluate(() => !!(window.AudioContext ?? window.webkitAudioContext));
  if (webAudio) {
    await waitFor(page, 'music-under-current.mp3');
    await waitFor(page, 'sfx-hull.mp3');
    const opening = await count(page, 'sfx-hull.mp3');
    await turnPage(page);
    await turnPage(page);
    assert.equal(await count(page, 'sfx-hull.mp3'), opening, 'Paragraphs must not replay their sound cue');
    for (let i = 0; i < 25 && Number((await saved(page)).beatId.split(':')[1]) < 6; i++) await turnPage(page);
    await waitFor(page, 'sfx-alarm.mp3');
    await waitFor(page, 'music-paper-note.mp3');
    const alarmCount = await count(page, 'sfx-alarm.mp3');
    await turnPage(page);
    await page.waitForTimeout(200);
    assert.equal(await count(page, 'sfx-alarm.mp3'), alarmCount);
    assert.ok(await page.evaluate(() => window.__audioTest.stops.some(item => item.file === 'music-under-current.mp3')));
    checks.push('Gesture unlock, stable paragraph cues, alarm cutoff and score change');

    await page.getByRole('button', { name: '静音', exact: true }).click();
    // Idle Web Audio nodes can expose the last processed AudioParam value.
    // A tiny, isolated DC probe keeps all buses rendering during this assertion.
    await page.evaluate(() => {
      const trace = window.__audioTest, probe = trace.contexts[0].createConstantSource();
      probe.offset.value = .00001;
      trace.gains.slice(0, 3).forEach(gain => probe.connect(gain));
      probe.start(); trace.muteProbe = probe;
    });
    await page.waitForFunction(() => window.__audioTest.gains.slice(0, 3).every(gain => gain.gain.value < .002), undefined, { timeout: 5000 });
    const muted = await page.evaluate(() => window.__audioTest.gains.slice(0, 3).map(gain => gain.gain.value));
    await page.evaluate(() => { window.__audioTest.muteProbe.stop(); window.__audioTest.muteProbe.disconnect(); });
    assert.ok(muted.every(value => value < .002), `All three buses must mute: ${muted}`);
    await page.getByRole('button', { name: '开启声音', exact: true }).click();
    checks.push('Global mute controls music, ambience and effects');
  }

  await page.getByRole('button', { name: '打开菜单', exact: true }).click();
  await page.getByRole('button', { name: '阅读设置', exact: true }).click();
  await page.getByRole('slider', { name: '音效音量', exact: true }).fill('17');
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  const snapshot = await saved(page);
  await page.reload();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('heterotopia.v1.settings')).sfxVolume), 17);
  await page.getByRole('button', { name: /^续梦/ }).click();
  if (webAudio) { await waitFor(page, 'music-paper-note.mp3'); assert.equal(await count(page, 'sfx-alarm.mp3'), 0, 'Loading a save must not replay its alarm'); }
  assert.equal((await saved(page)).beatId, snapshot.beatId);
  checks.push('Separate SFX volume persists; save loading suppresses action sounds');

  await page.getByRole('button', { name: '打开菜单' }).click();
  await page.getByRole('button', { name: /回到标题/ }).click();
  await page.getByRole('button', { name: /再点一次，回到标题/ }).click();
  await page.getByRole('button', { name: '听水集', exact: true }).click();
  await page.getByRole('button', { name: '试听《循水归来》', exact: true }).click();
  if (webAudio) {
    await waitFor(page, 'music-river-home.mp3');
    await page.getByRole('button', { name: '暂停试听', exact: true }).waitFor();
    await page.waitForTimeout(800);
    const beforePause = await page.getByRole('progressbar', { name: '试听进度' }).getAttribute('value');
    await page.getByRole('button', { name: '暂停试听', exact: true }).click();
    await page.waitForTimeout(500);
    const paused = Number(await page.getByRole('progressbar', { name: '试听进度' }).getAttribute('value'));
    await page.waitForTimeout(400);
    assert.equal(Number(await page.getByRole('progressbar', { name: '试听进度' }).getAttribute('value')), paused);
    assert.ok(paused >= Number(beforePause));
    await page.getByRole('button', { name: '播放《循水归来》', exact: true }).click();
    await page.waitForFunction(paused => Number(document.querySelector('progress[aria-label="试听进度"]')?.getAttribute('value')) > paused, paused, { timeout: 5000 });
  }
  const downloading = page.waitForEvent('download');
  await page.getByRole('link', { name: '收藏此曲' }).click();
  const download = await downloading;
  assert.ok(download.suggestedFilename().endsWith('循水归来.mp3'));
  assert.equal(await download.failure(), null);
  await page.screenshot({ path: screenshot('01-listening-room-desktop.png') });
  for (const [label, width, height] of [['mobile', 390, 844], ['small-phone', 320, 700], ['landscape', 844, 390], ['tablet', 820, 1180]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(200);
    const bounds = await page.evaluate(() => {
      const player = document.querySelector('.music-player').getBoundingClientRect();
      return { overflow: document.documentElement.scrollWidth > innerWidth, top: player.top, bottom: player.bottom, height: innerHeight, width: innerWidth };
    });
    assert.equal(bounds.overflow, false, JSON.stringify(bounds));
    assert.ok(bounds.top >= 0 && bounds.bottom <= height + 1, JSON.stringify(bounds));
    assert.equal(await page.locator('.music-play').isVisible(), true);
    await page.screenshot({ path: screenshot(`02-listening-room-${label}.png`) });
  }
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  checks.push('Listening room play/pause/resume, MP3 download and responsive controls');

  if (webAudio) {
    const syntheticProfile = { ...newProfile(), visited: SCENES.map(item => item.id), endings: ['blade', 'mercy', 'leave', 'names', 'kunlun', 'home'], oldNames: true };
    const syntheticState = newGame(syntheticProfile);
    syntheticProfile.read = SCENES.flatMap(scene => compileScene(scene.id, syntheticProfile, syntheticState).map(beat => beat.id));
    const race = await open({ state: syntheticState, profile: syntheticProfile });
    await race.route('**/audio/music-hearth.mp3', async route => { await new Promise(resolve => setTimeout(resolve, 1100)); await route.continue(); });
    await race.getByRole('button', { name: '听水集', exact: true }).click();
    await race.getByRole('button', { name: '试听《灶火未凉》', exact: true }).click();
    await race.getByRole('button', { name: '试听《把船撑向远方》', exact: true }).click();
    await waitFor(race, 'music-river-journey.mp3');
    await race.waitForTimeout(1500);
    assert.equal(await count(race, 'music-hearth.mp3'), 0, 'A late decoded track must not replace the newer selection');
    await race.getByRole('button', { name: '关闭', exact: true }).click();
    await race.getByRole('button', { name: /^续梦/ }).click();
    await closeIntro(race);
    await waitFor(race, 'music-under-current.mp3');
    const start = await race.evaluate(() => window.__audioTest.starts.length);
    await race.getByRole('button', { name: '快进', exact: true }).click();
    await race.waitForTimeout(900);
    const during = await race.evaluate(start => window.__audioTest.starts.slice(start).filter(item => item.file?.startsWith('sfx-')), start);
    assert.deepEqual(during, [], 'Read-skip must suppress narrative and page sounds');
    await race.getByRole('button', { name: '快进', exact: true }).click();
    await race.waitForTimeout(5200);
    const loops = await race.evaluate(() => window.__audioTest.starts.filter(item => item.loop && !item.ended));
    assert.ok(loops.filter(item => item.file?.startsWith('music-')).length <= 1, JSON.stringify(loops));
    assert.ok(loops.filter(item => item.file?.startsWith('amb-')).length <= 2, JSON.stringify(loops));
    checks.push('Delayed-load cancellation, fast-forward silence and retired-loop cleanup');
    if (name === 'chromium') {
      const media = await open(undefined, true);
      await media.evaluate(() => {
        const original = HTMLMediaElement.prototype.play;
        window.__syntheticMediaBlocked = true;
        HTMLMediaElement.prototype.play = function() {
          if (window.__syntheticMediaBlocked && this.src.includes('music-')) {
            return Promise.reject(new DOMException('Isolated synthetic autoplay block', 'NotAllowedError'));
          }
          return original.call(this);
        };
      });
      await media.getByRole('button', { name: '听水集', exact: true }).click();
      await media.getByText('点击播放，开启声音。', { exact: true }).waitFor();
      await media.evaluate(() => { window.__syntheticMediaBlocked = false; });
      await media.getByRole('button', { name: '试听《循水归来》', exact: true }).click();
      await media.waitForFunction(() => window.__audioTest.mediaElements.some(element => element.src.includes('music-river-home.mp3') && !element.paused && element.currentTime > .2 && element.volume > 0));
      await media.getByRole('button', { name: '暂停试听', exact: true }).click();
      await media.waitForTimeout(850);
      assert.ok(await media.evaluate(() => window.__audioTest.mediaElements.filter(element => element.src.includes('music-river-home.mp3')).every(element => element.paused)));
      await media.getByRole('button', { name: '播放《循水归来》', exact: true }).click();
      await media.waitForFunction(() => window.__audioTest.mediaElements.some(element => element.src.includes('music-river-home.mp3') && !element.paused && element.currentTime > .3 && element.volume > 0));
      await media.getByRole('button', { name: '静音试听', exact: true }).click();
      await media.waitForTimeout(100);
      const mutedMedia = await media.evaluate(() => window.__audioTest.mediaElements.filter(element => !element.paused).map(element => element.volume));
      assert.ok(mutedMedia.length > 0);
      assert.ok(mutedMedia.every(volume => volume === 0), JSON.stringify(mutedMedia));
      await media.getByRole('button', { name: '开启试听声音', exact: true }).click();
      await media.getByRole('button', { name: '关闭', exact: true }).click();
      await media.locator('.home-title').waitFor();
      checks.push('Native media fallback actually plays, pauses, resumes and mutes when Web Audio is absent');
    }
  } else {
    checks.push('No Web Audio: media fallback or graceful silent reading, with functional settings and listening-room download');
  }
  assert.deepEqual(errors, []);
  console.log(`${name} audio checks passed: ${checks.join('; ')}.`);
} catch (error) {
  const pages = contexts.flatMap(context => context.pages());
  const details = [];
  for (let i = 0; i < pages.length; i++) {
    await pages[i].screenshot({ path: screenshot(`failure-${i}.png`) }).catch(() => {});
    details.push({ body: (await pages[i].locator('body').innerText()).slice(0, 6000), state: await saved(pages[i]), dialogs: await pages[i].getByRole('dialog').allTextContents() });
  }
  await writeFile(new URL('failure.json', output), JSON.stringify({ error: String(error), errors, details }, null, 2));
  throw error;
} finally {
  await writeFile(new URL('results.json', output), JSON.stringify({ testedAt: new Date().toISOString(), browser: name, url: base, checks, errors }, null, 2));
  await Promise.all(contexts.map(context => context.close()));
  await browser.close();
}
