import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, firefox, webkit } from 'playwright';
import { compileScene, enterScene, loadStory, newGame, newProfile } from '../src/engine.ts';

await loadStory();
const base = process.env.VN_TEST_URL || 'http://127.0.0.1:4179';
const name = process.env.VN_TEST_BROWSER || 'chromium';
const recordTimings = process.env.VN_TEST_TIMINGS === 'record' || name !== 'chromium';
const browser = await { chromium, firefox, webkit }[name].launch();
const folder = new URL('../artifacts/ui-fix-3-audio/', import.meta.url);
await mkdir(folder, { recursive: true });
const profile = newProfile(), contexts = [], errors = [], results = [];
const short = { ...newGame(profile), beatId: '0-1:3:1' };
const breakfast = enterScene(newGame(profile), profile, '0-2');
const breakfastBeats = compileScene('0-2', profile, breakfast);
const beforeChoice = { ...breakfast, beatId: breakfastBeats[breakfastBeats.findIndex(item => item.kind === 'choice') - 1].id };

async function open(state, settings) {
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 800 } });
  contexts.push(context);
  await context.addInitScript(({ state, profile, settings }) => {
    localStorage.setItem('heterotopia.v1.autosave', JSON.stringify(state));
    localStorage.setItem('heterotopia.v1.profile', JSON.stringify(profile));
    localStorage.setItem('heterotopia.v1.settings', JSON.stringify({ textSpeed: 0, autoDelay: 4, muted: true, reducedMotion: true, ...settings }));
    localStorage.setItem('heterotopia.v1.readingHint', 'true');
    const trace = window.__readingAudioProbe = { sources: [], decoded: [], stampStarted: null };
    document.addEventListener('animationstart', event => { if (event.animationName === 'stamp-down') trace.stampStarted = performance.now(); }, true);
    const Context = window.AudioContext ?? window.webkitAudioContext;
    if (!Context) return;
    const bytesToFile = new WeakMap(), bufferToFile = new WeakMap();
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (!String(args[0]).includes('.mp3')) return response;
      const arrayBuffer = response.arrayBuffer.bind(response);
      response.arrayBuffer = async () => { const bytes = await arrayBuffer(); bytesToFile.set(bytes, String(args[0]).split('/').at(-1)); return bytes; };
      return response;
    };
    const decode = Context.prototype.decodeAudioData, create = Context.prototype.createBufferSource;
    Context.prototype.decodeAudioData = function(bytes) {
      const file = bytesToFile.get(bytes);
      return decode.call(this, bytes).then(buffer => { bufferToFile.set(buffer, file); trace.decoded.push(file); return buffer; });
    };
    Context.prototype.createBufferSource = function() {
      const source = create.call(this), start = source.start.bind(source), context = this;
      source.start = (...args) => {
        trace.sources.push({ file: bufferToFile.get(source.buffer), at: performance.now() + Math.max(0, (args[0] ?? 0) - context.currentTime) * 1000 });
        return start(...args);
      };
      return source;
    };
  }, { state, profile, settings });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base);
  await page.getByRole('button', { name: /^续梦/ }).click();
  await page.locator('.game-screen').waitFor();
  return { context, page };
}
const savedBeat = page => page.evaluate(() => JSON.parse(localStorage.getItem('heterotopia.v1.autosave')).beatId);
try {
  {
    const { context, page } = await open(short, {});
    const auto = page.getByRole('button', { name: '自动', exact: true });
    await auto.evaluate(button => button.addEventListener('click', () => { window.__autoReadingStarted = performance.now(); }, { once: true }));
    await auto.click();
    await page.waitForFunction(id => JSON.parse(localStorage.getItem('heterotopia.v1.autosave')).beatId !== id, short.beatId);
    const elapsed = await page.evaluate(() => performance.now() - window.__autoReadingStarted);
    if (!recordTimings) assert.ok(elapsed >= 1600 && elapsed <= 2200, `Short line auto delay ${elapsed}ms`);
    results.push({ check: 'short sentence advances after its reading pause', elapsedMs: Math.round(elapsed), timingGate: !recordTimings });
    await context.close();
  }
  for (const autoAfterChoice of [true, false]) {
    const { context, page } = await open(beforeChoice, { autoAfterChoice, reducedMotion: false, muted: false });
    await page.getByRole('button', { name: '自动', exact: true }).click();
    await page.locator('.dialogue-advance').click();
    await page.locator('.choice-option').first().waitFor();
    const hasWebAudio = await page.evaluate(() => !!(window.AudioContext ?? window.webkitAudioContext));
    if (hasWebAudio) await page.waitForFunction(() => window.__readingAudioProbe.decoded.includes('sfx-wood-latch.mp3'));
    await page.locator('.choice-option').first().click();
    await page.waitForFunction(id => JSON.parse(localStorage.getItem('heterotopia.v1.autosave')).beatId !== id, breakfastBeats.find(item => item.kind === 'choice').id);
    const auto = page.getByRole('button', { name: '自动', exact: true });
    assert.equal(await auto.getAttribute('aria-pressed'), String(autoAfterChoice));
    if (hasWebAudio) {
      const timing = await page.evaluate(() => {
        const trace = window.__readingAudioProbe;
        const stamps = trace.sources.filter(item => item.file === 'sfx-wood-latch.mp3' && item.at >= trace.stampStarted);
        return { count: stamps.length, elapsed: stamps[0]?.at - trace.stampStarted };
      });
      assert.equal(timing.count, 1, 'One choice must produce one stamp, without a second choice click');
      if (!recordTimings) assert.ok(timing.elapsed >= 250 && timing.elapsed <= 320, `Stamp onset is ${timing.elapsed}ms from its animation`);
      results.push({ check: 'decoded stamp starts near the animation contact, once', autoAfterChoice, onsetMs: Math.round(timing.elapsed), timingGate: !recordTimings });
    }
    results.push({ check: 'choice respects auto-after-choice setting', autoAfterChoice, beatId: await savedBeat(page), passed: true });
    await context.close();
  }
  assert.deepEqual(errors, []);
  const report = { testedAt: new Date().toISOString(), browser: name, results, errors };
  await writeFile(new URL(`${name}.json`, folder), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally { await Promise.all(contexts.map(context => context.close())); await browser.close(); }
