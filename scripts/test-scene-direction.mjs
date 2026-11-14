import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';
import { compileScene, enterScene, newGame, newProfile } from '../src/engine.ts';
import { loadStory } from '../src/story.ts';
import { autoDelayFor } from '../src/autoReading.ts';

await loadStory();
const engine = process.env.VN_TEST_BROWSER || 'chromium';
const recordTimings = process.env.VN_TEST_TIMINGS === 'record';
const browser = await { chromium, webkit }[engine].launch();
const base = process.env.VN_TEST_URL || 'http://127.0.0.1:4179';
const output = new URL(`../artifacts/art-direction-4/${engine}/`, import.meta.url);
await mkdir(output, { recursive: true });
const artifact = file => fileURLToPath(new URL(file, output));
const errors = [], results = [], contexts = [];
const profile = newProfile();

async function open(id, viewport = { width: 390, height: 844 }, setup) {
  const sceneId = id.split(':')[0];
  const state = { ...enterScene(newGame(profile), profile, sceneId), beatId: id, choices: { breakfast: 'B' } };
  const beat = compileScene(sceneId, profile, state).find(beat => beat.id === id);
  assert.ok(beat, id);
  const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
  contexts.push(context);
  await context.addInitScript(({ state, profile }) => {
    if (localStorage.getItem('heterotopia.v1.settings')) return;
    localStorage.setItem('heterotopia.v1.autosave', JSON.stringify(state));
    localStorage.setItem('heterotopia.v1.profile', JSON.stringify(profile));
    localStorage.setItem('heterotopia.v1.settings', JSON.stringify({ textSpeed: 0, autoDelay: 2, reducedMotion: true, muted: true, showSprites: true }));
    localStorage.setItem('heterotopia.v1.readingHint', 'true');
  }, { state, profile });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push(error.message));
  await setup?.(page);
  await page.goto(base);
  await page.getByRole('button', { name: /^续梦/ }).click();
  await page.getByTestId('dialogue-text').waitFor();
  return { page, context, beat };
}

async function stage(page, name, original = true) {
  await page.waitForFunction(({ name, original }) => {
    const layer = document.querySelector('.scene-image--current');
    const url = layer?.style.backgroundImage ?? '';
    return layer?.getAttribute('data-art') === name && Number(getComputedStyle(layer).opacity) > .99
      && (original ? url.includes(`/art-original/${name}.webp`) : url.includes(`/art/${name}.`));
  }, { name, original });
}

async function actor(page, name, label) {
  await page.waitForFunction(name => {
    const el = document.querySelector(`.actor--active[data-portrait="${name}"]`);
    const img = el?.querySelector('.actor-portrait:not(.actor-portrait--outgoing)');
    return img?.complete && img.naturalWidth > 0 && Number(getComputedStyle(el).opacity) >= .95;
  }, name);
  if (label) assert.equal(await page.locator('.actor--active .actor-vertical-name').innerText(), label);
}

async function turn(page, id) {
  await page.waitForTimeout(200);
  await page.locator('.dialogue-advance').click();
  await page.waitForFunction(id => JSON.parse(localStorage.getItem('heterotopia.v1.autosave'))?.beatId === id, id);
}

try {
  const checkpoints = [
    ['predawn', '0-1:8:0', 'bedroom', 'portrait-shen-home-surprised', '沈辞'],
    ['morning', '0-1:15:0', 'bedroom-morning', 'portrait-shen-home-surprised', '沈辞'],
    ['breakfast', '0-2:6:0', 'home-morning', 'portrait-tang-dining', '唐瑾'],
    ['classroom', '0-8:4:0', 'classroom-day', 'portrait-song', '宋嘉树'],
    ['canteen', '0-8:7:0', 'canteen-day', 'portrait-song', '宋嘉树'],
    ['evening', '终-4:13:0', 'bedroom-evening', 'portrait-shen-home-smile', '沈辞'],
    ['sendoff', 'B-1:20:2', 'river', 'portrait-amao', '阿媪'],
    ['snow-laughter', 'B-12-1:3:1', 'snow', 'portrait-yu-smile', '雩'],
    ['embers', 'B-12-1:18:1', 'snow-night', 'portrait-xu-winter-sad', '戌（沈辞）'],
    ['snow-night', 'B-12-2:3:0', 'snow-night', 'portrait-xu-winter-sad', '戌（沈辞）'],
    ['wood-birds', '终-1:8:2', 'light-river', 'portrait-xu-smile', '戌'],
    ['farewell', '终-1:27:0', 'light-river', 'portrait-yu-smile', '雩'],
  ];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    for (const [label, id, background, portrait, name] of checkpoints) {
      const { page, context } = await open(id, viewport);
      try {
        await stage(page, background);
        await actor(page, portrait, name);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: artifact(`${label}-${viewport.width}.png`) });
        results.push({ id, viewport, background, portrait, label: name });
      } finally { await context.close(); }
    }
  }
  // Cross the two actual screenplay boundaries with ordinary page turns.
  const opening = await open('0-1:8:1');
  await turn(opening.page, '0-1:8:2');
  await turn(opening.page, '0-1:11:0');
  await stage(opening.page, 'bedroom-morning');
  assert.equal(await opening.page.locator('.location-name').innerText(), '07:12 · 沈家卧室');
  await opening.context.close();
  const snow = await open('B-12-1:18:0');
  await stage(snow.page, 'snow');
  await turn(snow.page, 'B-12-1:18:1');
  await stage(snow.page, 'snow-night');
  await actor(snow.page, 'portrait-xu-winter-sad');
  await snow.context.close();
  // A failed original falls back to the delivered lightweight painting.
  const fallback = await open('0-8:7:0', undefined, page => page.route('**/art-original/canteen-day.webp', route => route.abort()));
  await stage(fallback.page, 'canteen-day', false);
  await fallback.context.close();
  // The pause is automatic only: the same page still accepts manual advance.
  const automatic = await open('0-1:8:1');
  const auto = automatic.page.getByRole('button', { name: '自动', exact: true });
  await auto.evaluate(button => button.addEventListener('click', () => { window.__sceneAutoStart = performance.now(); }, { once: true }));
  await auto.click();
  await automatic.page.waitForFunction(() => JSON.parse(localStorage.getItem('heterotopia.v1.autosave'))?.beatId === '0-1:8:2');
  const elapsed = await automatic.page.evaluate(() => performance.now() - window.__sceneAutoStart);
  const expected = autoDelayFor(automatic.beat.text, 2, automatic.beat.id);
  assert.ok(elapsed >= expected - 250, JSON.stringify({ elapsed, expected }));
  if (!recordTimings) assert.ok(elapsed < expected + 4000, JSON.stringify({ elapsed, expected }));
  await automatic.context.close();
  const manual = await open('B-12-2:4:0');
  const manualStart = Date.now();
  await manual.page.locator('.dialogue-advance').click();
  await manual.page.waitForFunction(() => JSON.parse(localStorage.getItem('heterotopia.v1.autosave'))?.beatId === 'B-12-2:5:0');
  const manualElapsed = Date.now() - manualStart;
  if (!recordTimings) assert.ok(manualElapsed < 1500);
  await manual.context.close();
  assert.deepEqual(errors, []);
  await writeFile(new URL('results.json', output), JSON.stringify({ browser: engine, results, automatic: { elapsed, expected }, manualElapsed, timingGate: !recordTimings, errors }, null, 2));
  console.log(`${engine}: ${results.length} scene compositions, live time transitions, original fallback and automatic/manual timing passed.`);
} catch (error) {
  for (const [i, page] of contexts.flatMap(context => context.pages()).entries()) {
    await page.screenshot({ path: artifact(`failure-${i}.png`) }).catch(() => {});
  }
  await writeFile(new URL('failure.json', output), JSON.stringify({ error: String(error), errors, results }, null, 2));
  throw error;
} finally { await Promise.all(contexts.map(context => context.close())); await browser.close(); }
