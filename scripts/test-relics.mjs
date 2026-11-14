import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';
import { compileScene, enterScene, newGame, newProfile } from '../src/engine.ts';
import { RELICS } from '../src/data/relics.ts';
import { loadStory } from '../src/story.ts';

await loadStory();
const engine = process.env.VN_TEST_BROWSER || 'chromium';
const browser = await { chromium, webkit }[engine].launch();
const base = process.env.VN_TEST_URL || 'http://127.0.0.1:4179';
const output = new URL(`../artifacts/art-direction-3/${engine}/`, import.meta.url);
await mkdir(output, { recursive: true });
const file = name => fileURLToPath(new URL(name, output));
const results = [], errors = [];
const allRead = RELICS.flatMap(relic => relic.reveal);
const full = { ...newProfile(), read: allRead, endings: ['blade', 'kunlun'] };
async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {})));
  });
}

async function open(sceneId, beatId, profile = full, viewport = { width: 390, height: 844 }, setup) {
  const state = { ...enterScene(newGame(profile), profile, sceneId), beatId };
  if (sceneId === 'A-6') state.inventory = ['jadeTail', 'jadeHead', 'jadeBody', 'birds', 'bone', 'coat'];
  assert.ok(compileScene(sceneId, profile, state).some(beat => beat.id === beatId), beatId);
  const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
  await context.addInitScript(({ state, profile }) => {
    localStorage.setItem('heterotopia.v1.autosave', JSON.stringify(state));
    localStorage.setItem('heterotopia.v1.profile', JSON.stringify(profile));
    localStorage.setItem('heterotopia.v1.settings', JSON.stringify({ textSpeed: 0, reducedMotion: true, muted: true, autoDelay: 300, showSprites: true }));
    localStorage.setItem('heterotopia.v1.readingHint', 'true');
  }, { state, profile });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push(error.message));
  await setup?.(page);
  await page.goto(base);
  await page.getByRole('button', { name: /^续梦/ }).click();
  await page.locator('.game-screen').waitFor();
  return { context, page, state };
}

async function drawing(page, id) {
  await page.locator(`[data-relic-study="${id}"]`).waitFor();
  await page.locator('.relic-study-plate img').evaluate(img => img.decode());
  await settle(page);
  const geometry = await page.locator('.relic-study').evaluate(element => {
    const art = element.querySelector('.relic-study-plate').getBoundingClientRect();
    const copy = element.querySelector('.relic-study-copy').getBoundingClientRect();
    return { width: innerWidth, art: { x: art.x, y: art.y, width: art.width, height: art.height }, separate: copy.top >= art.bottom - 1 || copy.left >= art.right - 1, overflow: document.documentElement.scrollWidth > innerWidth || element.scrollWidth > element.clientWidth + 1 };
  });
  assert.equal(geometry.overflow, false, JSON.stringify(geometry));
  assert.equal(geometry.separate, true, 'copy never covers the drawing');
  assert.ok(geometry.art.width > 140, 'the object remains large enough to study');
  const navigation = await page.evaluate(() => ({ back: document.querySelector('.relic-study-toolbar').getBoundingClientRect().top, header: document.querySelector('.modal-header').getBoundingClientRect().bottom }));
  assert.ok(navigation.back >= navigation.header - 1, 'a newly opened study starts with its back control visible');
  assert.equal(await page.locator('.relic-study-copy h3').evaluate(el => el === document.activeElement), true);
  return geometry;
}

try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 360, height: 740 }, { width: 844, height: 390 }, { width: 820, height: 1180 }]) {
    const { context, page } = await open('A-6', 'A-6:25:0', full, viewport);
    try {
      const before = await page.evaluate(() => localStorage.getItem('heterotopia.v1.autosave'));
      await page.locator('.relic-cue').click();
      const geometry = await drawing(page, 'jade-joined');
      assert.equal(await page.locator('.relic-versions button').count(), 4);
      await page.screenshot({ path: file(`jade-${viewport.width}.png`) });
      await page.getByRole('button', { name: '返回手记', exact: true }).click();
      await page.getByRole('tab', { name: '途中物笺' }).click();
      assert.equal(await page.locator('.relic-card').count(), 7);
      await page.locator('.relic-card img').evaluateAll(images => Promise.all(images.map(img => img.decode())));
      await settle(page);
      await page.screenshot({ path: file(`index-${viewport.width}.png`) });
      await page.getByRole('button', { name: '细看十根旧队名简', exact: true }).click();
      await drawing(page, 'names');
      await page.screenshot({ path: file(`names-${viewport.width}.png`) });
      assert.equal(await page.evaluate(() => localStorage.getItem('heterotopia.v1.autosave')), before, 'studying never advances or rewrites the story');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.relic-study').count(), 0);
      assert.equal(await page.getByRole('dialog').count(), 1);
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({ state: 'detached' });
      await page.waitForFunction(() => document.querySelector('.dialogue-advance') === document.activeElement);
      results.push({ test: 'jade, archive, names, Escape and unchanged progress', viewport, geometry, passed: true });
      console.log(`PASS ${engine} object studies at ${viewport.width}×${viewport.height}`);
    } finally { await context.close(); }
  }

  // A scene-level inventory flag must not expose a future drawing or request it.
  {
    const profile = newProfile();
    const state = enterScene(newGame(profile), profile, '1-5');
    const requests = [];
    const { context, page } = await open('1-5', state.beatId, profile, undefined, page => page.on('request', request => { if (/\/prop-/.test(request.url())) requests.push(request.url()); }));
    try {
      await page.getByRole('button', { name: '打开旅人手记' }).click();
      assert.equal(await page.locator('[data-inventory-item]').count(), 0);
      await page.getByRole('tab', { name: '途中物笺' }).click();
      assert.equal(await page.locator('.relic-card').count(), 0);
      assert.equal(await page.getByRole('heading', { name: '三玉相合' }).count(), 0);
      assert.deepEqual(requests, []);
      results.push({ test: 'unread props neither shown nor fetched', passed: true });
    } finally { await context.close(); }
  }
  {
    const profile = { ...newProfile(), read: ['1-5:13:0'] };
    const { context, page } = await open('1-5', '1-5:13:0', profile);
    try {
      await page.getByRole('button', { name: '自动', exact: true }).click();
      await page.locator('.relic-cue').click();
      await drawing(page, 'jade-tail');
      assert.equal(await page.locator('.relic-versions').count(), 0);
      await page.waitForTimeout(1100);
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('heterotopia.v1.autosave')).beatId), '1-5:13:0');
      await page.getByRole('button', { name: '关闭', exact: true }).click();
      assert.equal(await page.getByRole('button', { name: '自动', exact: true }).getAttribute('aria-pressed'), 'true');
      await page.getByRole('button', { name: '自动', exact: true }).click();
      results.push({ test: 'first fragment reveals no future forms; automatic reading pauses and resumes', passed: true });
    } finally { await context.close(); }
  }

  for (const endings of [[], ['blade'], ['kunlun'], ['blade', 'kunlun']]) {
    const { context, page } = await open('1-8', '1-8:11:0', { ...newProfile(), endings });
    try {
      await page.locator('.relic-cue').click();
      await drawing(page, 'bone');
      await page.locator('.relic-bone-light').waitFor();
      await page.waitForFunction(count => document.querySelectorAll('.relic-bone-light .is-lit').length === count, endings.length);
      await page.screenshot({ path: file(`bone-${endings.join('-') || 'unlit'}.png`) });
      results.push({ test: 'bone route memory', endings, passed: true });
    } finally { await context.close(); }
  }
  {
    const { context, page } = await open('B-12-1', 'B-12-1:3:2');
    try {
      await page.locator('.relic-cue').click();
      await drawing(page, 'flute-mi-broken');
      assert.equal(await page.locator('.relic-versions button').count(), 2);
      assert.equal(await page.locator('.relic-versions').getByRole('button', { name: '旧箱里的骨笛' }).count(), 0);
      await page.screenshot({ path: file('mi-broken-mobile.png') });
      await page.getByRole('button', { name: '芈的骨笛', exact: true }).click();
      await drawing(page, 'flute-mi');
      results.push({ test: 'same flute before and after damage; the old-box flute remains separate', passed: true });
    } finally { await context.close(); }
  }
  for (const missingBoth of [false, true]) {
    const attempts = [];
    const { context, page } = await open('0-9', '0-9:10:0', full, undefined, async page => {
      await page.route('**/prop-map.*', async route => {
        attempts.push(route.request().url());
        if (missingBoth || route.request().url().endsWith('.avif')) await route.abort();
        else await route.continue();
      });
    });
    try {
      await page.locator('.relic-cue').click();
      if (missingBoth) {
        await page.locator('.relic-art--missing').waitFor();
        assert.equal(await page.locator('.relic-study-plate img').count(), 0);
        assert.ok(await page.getByRole('heading', { name: '古图', exact: true }).isVisible());
        const stable = attempts.length;
        await page.waitForTimeout(350);
        assert.equal(attempts.length, stable, 'a missing optional prop does not retry indefinitely');
        await page.screenshot({ path: file('missing-prop.png') });
      } else {
        await drawing(page, 'map');
        assert.match(await page.locator('.relic-study-plate img').evaluate(img => img.currentSrc), /prop-map\.webp$/);
      }
      results.push({ test: missingBoth ? 'missing drawing preserves text and navigation' : 'AVIF falls back to decoded WebP', attempts, passed: true });
    } finally { await context.close(); }
  }
  assert.deepEqual(errors, []);
  await writeFile(new URL('results.json', output), JSON.stringify({ engine, results, errors }, null, 2));
  console.log(`PASS ${results.length} ${engine} object-study checks`);
} catch (error) {
  await writeFile(new URL('results.json', output), JSON.stringify({ engine, results, errors, failure: String(error) }, null, 2));
  throw error;
} finally { await browser.close(); }
