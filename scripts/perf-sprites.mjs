import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { compileScene, enterScene, newGame, newProfile, SCENES } from '../src/engine.ts';
import { characterFor } from '../src/data/world.ts';
import { loadStory } from '../src/story.ts';

await loadStory();

// Run with node --import tsx. Use the same build server before and after a change.
const base = process.env.VN_TEST_URL || 'http://127.0.0.1:4179';
const batch = process.argv[2] || 'ui-fix-2';
if (!/^[\w-]+$/.test(batch)) throw new Error('Invalid measurement label');
const folder = new URL(`../artifacts/perf/${batch}/`, import.meta.url);
await mkdir(folder, { recursive: true });
const profile = newProfile();
const stateAt = (sceneId, beatId) => ({ ...enterScene(newGame(profile), profile, sceneId), beatId });
const opening = stateAt('0-1', '0-1:11:0');
const networks = {
  unlimited: { latency: 0, downloadThroughput: -1, uploadThroughput: -1 },
  '4G': { latency: 85, downloadThroughput: 9e6 / 8, uploadThroughput: 1.5e6 / 8 },
  Fast3G: { latency: 562, downloadThroughput: 1.6e6 / 8 * .9, uploadThroughput: .68e6 / 8 },
};
const browser = await chromium.launch();
const measurements = [];

async function seed(context, state) {
  await context.addInitScript(({ state, profile }) => {
    localStorage.setItem('heterotopia.v1.autosave', JSON.stringify(state));
    localStorage.setItem('heterotopia.v1.profile', JSON.stringify(profile));
    localStorage.setItem('heterotopia.v1.settings', JSON.stringify({ textSpeed: 0, muted: true }));
    localStorage.setItem('heterotopia.v1.readingHint', 'true');
  }, { state, profile });
}

async function probeClick(page, key) {
  await page.evaluate(key => {
    window.__spriteProbe = new Promise(resolve => {
      const result = { mountedMs: null, imageReadyMs: null, halfMs: null, fullMs: null, decodedAnimationMs: null };
      let start, ready;
      const click = event => {
        if (event.target.closest('.dialogue-advance')) { start = performance.now(); document.removeEventListener('click', click, true); }
      };
      document.addEventListener('click', click, true);
      const tick = () => {
        if (start !== undefined) {
          const elapsed = performance.now() - start;
          const actor = [...document.querySelectorAll(`.actor--${key}`)].find(el => !el.classList.contains('actor--exit'));
          if (actor) {
            result.mountedMs ??= elapsed;
            const img = actor.querySelector('img');
            if (img.complete && img.naturalWidth > 0) {
              result.imageReadyMs ??= elapsed;
              ready ??= performance.now();
              const opacity = Number(getComputedStyle(actor).opacity);
              if (opacity >= .5) result.halfMs ??= elapsed;
              if (opacity >= .95) { result.fullMs ??= elapsed; result.decodedAnimationMs = performance.now() - ready; }
            }
          }
          if (result.fullMs !== null || elapsed > 15000) { resolve(result); return; }
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, key);
  await page.locator('.dialogue-advance').click();
  const result = await page.evaluate(() => window.__spriteProbe);
  assert.notEqual(result.fullMs, null, `Sprite ${key} never became visible`);
  return Object.fromEntries(Object.entries(result).map(([k, v]) => [k, v === null ? null : Math.round(v)]));
}

try {
  for (const [network, conditions] of Object.entries(networks)) {
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 800 } });
    await seed(context, opening);
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, ...conditions });
    let bytes = 0, requests = 0;
    let measuringHome = true;
    cdp.on('Network.requestWillBeSent', event => { if (measuringHome && /^https?:/.test(event.request.url)) requests++; });
    cdp.on('Network.loadingFinished', e => { if (measuringHome) bytes += e.encodedDataLength; });
    const start = performance.now();
    await page.goto(base, { waitUntil: 'load' });
    const loadMs = Math.round(performance.now() - start);
    await page.getByRole('heading', { name: '异托邦' }).waitFor();
    const interactiveMs = Math.round(performance.now() - start);
    await page.evaluate(() => document.fonts.ready);
    const fontsReadyMs = Math.round(performance.now() - start);
    measuringHome = false;
    const resources = await page.evaluate(() => performance.getEntriesByType('resource').filter(entry => /^https?:/.test(entry.name)).map(entry => ({ name: new URL(entry.name).pathname, start: Math.round(entry.startTime), duration: Math.round(entry.duration), bytes: entry.encodedBodySize })));
    await page.evaluate(() => document.querySelector('.continue-button').addEventListener('click', () => { window.__resumeStarted = performance.now(); }, { once: true }));
    await page.getByRole('button', { name: /^续梦/ }).click();
    await page.locator('.dialogue-advance').waitFor();
    const resumeReadyMs = await page.evaluate(() => Math.round(performance.now() - window.__resumeStarted));
    // No artificial prefetch wait. Report the new explicit reading preparation
    // separately so a shorter sprite animation never hides a shifted delay.
    const cachedBeforeClick = await page.evaluate(() => performance.getEntriesByType('resource').some(entry => /\/art\/portrait-shen-school(?:-m)?\.(avif|webp)$/.test(entry.name) && entry.responseEnd > 0));
    const first = await probeClick(page, 'shen');
    const resumeToFirstFullMs = await page.evaluate(() => Math.round(performance.now() - window.__resumeStarted));
    measurements.push({ network, home: { loadMs, interactiveMs, fontsReadyMs, requests, bytes, resources }, resumeReadyMs, resumeToFirstFullMs, cachedBeforeClick, first });
    const summary = measurements.at(-1);
    console.log(JSON.stringify({ ...summary, home: { ...summary.home, resources: undefined } }));
    await context.close();
  }

  // A real same-speaker/narration/return sequence with an explicit cast list.
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 800 } });
  await seed(context, stateAt('0-2', '0-2:6:0'));
  const page = await context.newPage();
  await page.goto(base);
  await page.getByRole('button', { name: /^续梦/ }).click();
  await page.waitForFunction(() => {
    const actor = document.querySelector('.actor');
    return actor && actor.querySelector('img').complete && Number(getComputedStyle(actor).opacity) >= .95;
  });
  const key = await page.locator('.actor').evaluate(el => [...el.classList].find(c => /^actor--(shen|tang|song)$/.test(c)).slice(7));
  await page.locator('.actor').evaluate(el => { window.__originalActor = el; });
  await page.locator('.dialogue-advance').click();
  await page.waitForTimeout(250); // one complete idle transition, not a prefetch delay
  const retainedDuringNarration = await page.evaluate(() => window.__originalActor.isConnected);
  const narrationReturn = await probeClick(page, key);
  const sameNodeOnReturn = await page.evaluate(() => window.__originalActor === document.querySelector('.actor'));
  await context.close();

  // Authored opportunities, not browser measurements. Report them separately.
  let portraitLines = 0, legacyMounts = 0, retainedOpportunities = 0;
  for (const scene of SCENES) {
    let previous, last, interrupted = false;
    for (const beat of compileScene(scene.id, profile, { inventory: [], choices: {} })) {
      let key = beat.kind === 'text' ? characterFor(beat.speaker)?.key : undefined;
      if (key === 'shen' && ['common', 'royal', 'kunlun'].includes(scene.route)) key = 'xu';
      if (key) {
        portraitLines++;
        if (key !== previous) legacyMounts++;
        if (interrupted && key === last && beat.cast.includes(key)) retainedOpportunities++;
        last = key; interrupted = false;
      } else interrupted = true;
      previous = key;
    }
  }

  // Stable before/after compositions. No generated assets or save modifications.
  for (const [name, sceneId, beatId] of [['classroom', '0-4', '0-4:7:0'], ['hut', '1-1', '1-1:4:0'], ['palace', 'A-4', 'A-4:4:0']]) {
    for (const [device, width, height] of [['desktop', 1280, 800], ['mobile', 390, 844]]) {
      const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height } });
      await seed(context, stateAt(sceneId, beatId));
      const page = await context.newPage();
      await page.goto(base);
      await page.getByRole('button', { name: /^续梦/ }).click();
      await page.evaluate(() => document.fonts.ready);
      await page.locator('.actor img').evaluate(img => img.decode());
      await page.waitForTimeout(1200);
      await page.screenshot({ path: fileURLToPath(new URL(`${device}-${name}.png`, folder)) });
      await context.close();
    }
  }
  const report = { measuredAt: new Date().toISOString(), base, batch, measurements, narration: { retainedDuringNarration, sameNodeOnReturn, ...narrationReturn }, authored: { portraitLines, legacyMounts, retainedOpportunities } };
  await writeFile(new URL(`../artifacts/perf/${batch}.json`, import.meta.url), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.narration));
} finally { await browser.close(); }
