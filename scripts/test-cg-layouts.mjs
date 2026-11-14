import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { compileScene, enterScene, loadStory, newGame, newProfile, SCENES } from '../src/engine.ts';
import { cgForBeat } from '../src/data/cgs.ts';
import { BACKGROUNDS, CHARACTERS, ENDINGS } from '../src/data/world.ts';

await loadStory();
const base = process.env.VN_TEST_URL || 'http://127.0.0.1:4179';
const folder = new URL('../artifacts/art-direction-1/browser/', import.meta.url);
await mkdir(folder, { recursive: true });
const ids = ['e1-blade', 's06-snow-hands', 's08-farewell', 's02-first-crossing', 's04-old-names', 's05-mi-flute', 'e6-home'];
const profile = { ...newProfile(), visited: SCENES.map(s => s.id), met: CHARACTERS.map(c => c.key), art: Object.keys(BACKGROUNDS), oldNames: true, endings: Object.keys(ENDINGS) };
const checkpoints = new Map();
for (const scene of SCENES) {
  const state = enterScene(newGame(profile), profile, scene.id);
  state.inventory = ['jadeTail', 'jadeHead', 'jadeBody', 'map', 'birds', 'box', 'bone', 'coat', 'flute', 'names'];
  state.choices = { breakfast: 'B' };
  for (const beat of compileScene(scene.id, profile, state)) {
    profile.read.push(beat.id);
    const cg = cgForBeat(beat, scene.id);
    if (cg && ids.includes(cg.id) && !checkpoints.has(cg.id)) checkpoints.set(cg.id, { cg, beat, state: { ...state, beatId: beat.id } });
  }
}
assert.equal(checkpoints.size, ids.length);
const browser = await chromium.launch({ headless: true });
const errors = [], results = [];
async function open(id, viewport, route) {
  const checkpoint = checkpoints.get(id);
  const context = await browser.newContext({ viewport, serviceWorkers: 'block', deviceScaleFactor: 1 });
  await context.addInitScript(({ profile, state }) => {
    localStorage.setItem('heterotopia.v1.profile', JSON.stringify(profile));
    localStorage.setItem('heterotopia.v1.autosave', JSON.stringify(state));
    localStorage.setItem('heterotopia.v1.settings', JSON.stringify({ textSpeed: 0, reducedMotion: true, muted: true }));
    localStorage.setItem('heterotopia.v1.readingHint', 'true');
  }, { profile, state: checkpoint.state });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await route?.(page);
  await page.goto(base);
  await page.getByRole('button', { name: /^续梦/ }).click();
  await page.locator('.app--play').waitFor();
  const intro = page.getByRole('button', { name: '进入故事', exact: true });
  if (await intro.count()) await intro.click();
  return { context, page, checkpoint };
}
async function displayed(page, name, suffix) {
  await page.waitForFunction(({ name, suffix }) => {
    const stage = document.querySelector('.scene-image--current');
    return stage?.dataset.art === name && new RegExp(suffix).test(stage.style.backgroundImage);
  }, { name, suffix });
  return page.locator('.scene-image--current').evaluate(async stage => {
    const url = stage.style.backgroundImage.match(/url\(["']?([^"')]+)/)?.[1];
    const image = new Image(); image.src = url; await image.decode();
    return { url, width: image.naturalWidth, height: image.naturalHeight };
  });
}
const snapshot = (page, name) => page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, folder)) });
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 360, height: 740 }, { width: 844, height: 390 }, { width: 820, height: 1180 }]) {
    for (const id of ids) {
      const { page, context, checkpoint } = await open(id, viewport);
      const mobile = viewport.width / viewport.height <= .75;
      const source = await displayed(page, checkpoint.cg.file, `${mobile ? '-m' : id}\\.(avif|webp)`);
      assert.equal(source.height > source.width, mobile);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.evaluate(() => document.fonts.ready);
      const prefix = `${id}-${viewport.width}x${viewport.height}`;
      await snapshot(page, prefix);
      if (checkpoint.beat.kind === 'ending') {
        const before = await page.evaluate(() => localStorage.getItem('heterotopia.v1.autosave'));
        await page.getByRole('button', { name: '静看此景', exact: true }).click();
        await page.getByRole('button', { name: '返回结局', exact: true }).waitFor();
        await page.waitForFunction(() => getComputedStyle(document.querySelector('.ending-content')).visibility === 'hidden'
          && getComputedStyle(document.querySelector('.scene-shade')).opacity === '0');
        await snapshot(page, `${prefix}-clean`);
        await page.keyboard.press('h');
        await page.getByRole('button', { name: '静看此景', exact: true }).waitFor();
        assert.equal(await page.evaluate(() => localStorage.getItem('heterotopia.v1.autosave')), before);
      }
      results.push({ id, viewport, source });
      if (id === 's06-snow-hands' && viewport.width === 390) {
        await page.setViewportSize({ width: 844, height: 390 });
        await displayed(page, checkpoint.cg.file, `${id}\\.(avif|webp)`);
        await page.setViewportSize(viewport);
        await displayed(page, checkpoint.cg.file, '-m\\.(avif|webp)');
        await page.keyboard.press('Escape');
        await page.getByRole('button', { name: /浮生绘卷/ }).click();
        await page.getByRole('tab', { name: '留影 · CG', exact: true }).click();
        await page.locator('.gallery-card:enabled').filter({ hasText: '不松' }).click();
        const full = page.locator('.gallery-full');
        await full.evaluate(image => image.decode());
        assert.match(await full.evaluate(image => image.currentSrc), /cg-s06-snow-hands\.(avif|webp)$/);
      }
      await context.close();
    }
  }
  for (const missing of ['avif', 'both', 'all']) {
    const { page, context, checkpoint } = await open('s06-snow-hands', { width: 390, height: 844 }, page =>
      page.route('**/art/cg-s06-snow-hands*', route => {
        const url = route.request().url();
        const fail = missing === 'all' || (url.includes('-m.') && (missing === 'both' || url.endsWith('.avif')));
        return fail ? route.fulfill({ status: 404, body: 'Synthetic missing CG format' }) : route.continue();
      }));
    const source = await displayed(page, missing === 'all' ? checkpoint.beat.background : checkpoint.cg.file,
      missing === 'avif' ? '-m\\.webp' : missing === 'both' ? 'snow-hands\\.webp' : '\\.(avif|webp)');
    results.push({ fallback: missing, source });
    await context.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(new URL('results.json', folder), JSON.stringify({ results, errors }, null, 2));
  console.log(JSON.stringify({ checks: results.length, errors, screenshots: fileURLToPath(folder) }));
} finally { await browser.close(); }
