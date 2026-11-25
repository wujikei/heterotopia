import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';

const base = process.env.VN_TEST_URL || 'http://127.0.0.1:4179';
const name = process.env.VN_TEST_BROWSER || 'chromium';
const browser = await { chromium, firefox, webkit }[name].launch();
const folder = new URL(`../artifacts/perf/assets/${name}/`, import.meta.url);
await mkdir(folder, { recursive: true });
const manifest = JSON.parse(await readFile(new URL('../src/data/art-manifest.json', import.meta.url), 'utf8'));
const results = [];
const errors = [];
const state = { version: 1, sceneId: '0-4', beatId: '0-4:7:0', inventory: [], choices: {}, history: [], cycle: 1 };
async function open(viewport = { width: 1280, height: 800 }, setup, settings = {}, seed = state) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.width < 760 ? 3 : 1, serviceWorkers: 'block' });
  await context.addInitScript(({ seed, settings }) => {
    if (sessionStorage.getItem('synthetic-asset-test')) return;
    localStorage.setItem('heterotopia.v1.campaign', JSON.stringify(seed.campaign || 'original'));
    localStorage.setItem(seed.campaign === 'overseas' ? 'heterotopia.v1.overseas.autosave' : 'heterotopia.v1.autosave', JSON.stringify(seed));
    localStorage.setItem('heterotopia.v1.settings', JSON.stringify({ textSpeed: 0, muted: true, reducedMotion: true, lightweight: true, ...settings }));
    localStorage.setItem('heterotopia.v1.readingHint', 'true');
    sessionStorage.setItem('synthetic-asset-test', 'true');
  }, { seed, settings });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await setup?.(page);
  await page.goto(base);
  await page.getByRole('heading', { name: '异托邦' }).waitFor();
  return { context, page };
}
try {
  for (const scenario of [
    { campaign: 'original', lightweight: false, expected: /\/art-original\/hero\.webp$/ },
    { campaign: 'overseas', lightweight: false, expected: /\/art-original\/modern-sunset\.webp$/ },
    { campaign: 'overseas', lightweight: true, expected: /\/art\/modern-sunset\.webp$/ },
  ]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
    await context.addInitScript(({ campaign, lightweight }) => {
      localStorage.setItem('heterotopia.v1.campaign', JSON.stringify(campaign));
      localStorage.setItem('heterotopia.v1.settings', JSON.stringify({ muted: true, lightweight }));
      const decode = HTMLImageElement.prototype.decode;
      HTMLImageElement.prototype.decode = function(...args) {
        if (this.src.startsWith('data:image/avif')) {
          window.__avifProbeStillPending = true;
          return new Promise(() => {});
        }
        return decode.apply(this, args);
      };
    }, scenario);
    const page = await context.newPage();
    const failures = [];
    page.on('response', response => { if (response.status() >= 400) failures.push(response.url()); });
    const titleRequest = page.waitForRequest(request => scenario.expected.test(request.url()));
    let unlockScript;
    const entryGate = new Promise(resolve => { unlockScript = resolve; });
    if (!scenario.lightweight) {
      await page.route('**/assets/index-*.js', async route => { await entryGate; await route.continue(); });
    }
    const navigation = page.goto(base);
    try {
      await titleRequest;
    } finally { unlockScript(); }
    await navigation;
    await page.getByRole('heading', { name: '异托邦' }).waitFor();
    assert.equal(await page.evaluate(() => window.__avifProbeStillPending === true), true, 'The title must render without waiting for AVIF support detection');
    const bodyFonts = await page.evaluate(async () => {
      await document.fonts.ready;
      return performance.getEntriesByType('resource').filter(entry => /\/story-serif-(?:regular|semibold)\.woff2$/.test(entry.name)).map(entry => entry.name);
    });
    assert.deepEqual(bodyFonts, [], 'Title glyphs must not pull down the story font');
    assert.deepEqual(failures, []);
    results.push({ check: `${scenario.campaign} title and artwork start while the AVIF probe is pending`, lightweight: scenario.lightweight, passed: true });
    await context.close();
  }

  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    const { context, page } = await open(viewport);
    const failures = [];
    page.on('response', response => { if (response.status() >= 400) failures.push(response.url()); });
    await page.getByRole('button', { name: /^续梦/ }).click();
    await page.locator('.actor img').waitFor();
    await page.locator('.actor img').evaluate(image => image.decode());
    const source = await page.locator('.actor img').evaluate(image => image.currentSrc);
    assert.match(source, viewport.width < 760 ? /portrait-shen-school-m\.(avif|webp)$/ : /portrait-shen-school\.(avif|webp)$/);
    const requested = await page.evaluate(() => performance.getEntriesByType('resource').map(entry => entry.name).filter(url => /portrait-shen-school(?:-m)?\.(avif|webp)$/.test(url)));
    assert.equal(new Set(requested).size, 1, `Prefetch and picture disagreed: ${requested}`);
    assert.deepEqual(failures, []);
    await page.screenshot({ path: fileURLToPath(new URL(viewport.width < 760 ? 'mobile-dpr3.png' : 'desktop.png', folder)) });
    results.push({ check: viewport.width < 760 ? 'mobile, DPR3' : 'desktop', source, noDuplicateFormat: true });
    const supported = source.endsWith('.avif');
    const resized = viewport.width < 760 ? { width: 1280, height: 800 } : { width: 390, height: 844 };
    await page.setViewportSize(resized);
    await page.waitForFunction(mobile => {
      const image = document.querySelector('.actor img');
      return image?.complete && image.naturalWidth > 0 && (mobile ? /-m\.(avif|webp)$/.test(image.currentSrc) : /portrait-shen-school\.(avif|webp)$/.test(image.currentSrc));
    }, resized.width < 760);
    results.push({ check: viewport.width < 760 ? 'mobile to desktop responsive source' : 'desktop to mobile responsive source', source: await page.locator('.actor img').evaluate(image => image.currentSrc), passed: true });
    if (supported && viewport.width >= 760) {
      const decoded = await page.evaluate(async names => {
        const failures = [];
        for (const item of names) {
          const image = new Image(); image.src = `./art/${item}.avif`;
          try { await image.decode(); } catch { failures.push(item); }
        }
        return failures;
      }, manifest.avif);
      assert.deepEqual(decoded, []);
      const alpha = await page.evaluate(async () => {
        const image = new Image(); image.src = './art/portrait-elder.avif'; await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
        const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let transparent = 0, opaque = 0, edge = 0;
        for (let i = 3; i < pixels.length; i += 4) {
          if (pixels[i] === 0) transparent++;
          else if (pixels[i] === 255) opaque++;
          else edge++;
        }
        return { transparent, opaque, edge };
      });
      assert.ok(alpha.transparent > 10000 && alpha.opaque > 10000 && alpha.edge > 100);
      results.push({ check: 'all desktop AVIF files decode; transparent portrait edges survive', count: manifest.avif.length, alpha });
    }
    await context.close();
  }
  {
    const { context, page } = await open(undefined, page => page.route('**/art/*.avif', route => route.fulfill({ status: 404, body: 'Synthetic missing AVIF' })));
    await page.getByRole('button', { name: /^续梦/ }).click();
    await page.locator('.actor img').waitFor();
    await page.waitForFunction(() => document.querySelector('.actor img')?.currentSrc.endsWith('.webp'));
    await page.locator('.actor img').evaluate(image => image.decode());
    await page.waitForFunction(() => {
      const background = document.querySelector('.scene-image--current')?.style.backgroundImage || '';
      return background.includes('.webp') && !background.includes('.avif');
    });
    results.push({ check: 'missing AVIF falls back to WebP for backgrounds and portraits', passed: true });
    await context.close();
  }
  {
    const { context, page } = await open();
    assert.equal(await page.evaluate(() => performance.getEntriesByType('resource').filter(entry => entry.name.includes('/art-original/')).length), 0, 'Lightweight startup must not fetch originals');
    await page.getByRole('button', { name: '阅读设置', exact: true }).click();
    const toggle = page.getByRole('switch', { name: '轻量模式', exact: true });
    await toggle.click();
    await page.waitForFunction(() => document.querySelector('.scene-image--current')?.style.backgroundImage.includes('/art-original/hero.webp'));
    await page.reload();
    await page.waitForFunction(() => document.querySelector('.scene-image--current')?.style.backgroundImage.includes('/art-original/hero.webp'));
    await page.getByRole('button', { name: '阅读设置', exact: true }).click();
    assert.equal(await toggle.getAttribute('aria-checked'), 'false');
    await toggle.click();
    await page.waitForFunction(() => /\/art\/hero\.(avif|webp)/.test(document.querySelector('.scene-image--current')?.style.backgroundImage || ''));
    results.push({ check: 'quality switch changes the live background, persists across reload, and lightweight startup skips originals', passed: true });
    await context.close();
  }
  {
    const { context, page } = await open(undefined, page => page.route('**/art-original/*.webp', route => route.fulfill({ status: 404, body: 'Synthetic missing original' })), { lightweight: false });
    await page.waitForFunction(() => /\/art\/hero\.(avif|webp)/.test(document.querySelector('.scene-image--current')?.style.backgroundImage || ''));
    results.push({ check: 'missing original falls back to a lightweight background', passed: true });
    await context.close();
  }
  {
    const seed = { ...state, campaign: 'overseas', sceneId: 'modern-o-0-1', beatId: 'modern-o-0-1:7:0' };
    const { context, page } = await open({ width: 390, height: 844 }, page =>
      page.route('**/art-original/cg-modern-word-stall-r3-m.webp', route => route.fulfill({ status: 404 })), { lightweight: false }, seed);
    await page.getByRole('button', { name: /^续梦/ }).click();
    await page.waitForFunction(() => document.querySelector('.scene-image--current')?.style.backgroundImage.includes('/art-original/cg-modern-word-stall-r3.webp'));
    results.push({ check: 'missing mobile master uses desktop lossless CG', passed: true });
    await context.close();
  }
  for (const missing of [false, true]) {
    const seed = { ...state, campaign: 'overseas', sceneId: 'modern-o-0-1', beatId: 'modern-o-0-1:4:0' };
    let release;
    const hold = new Promise(resolve => { release = resolve; });
    const { context, page } = await open(undefined, page => page.route(/\/cg-modern-word-stall-r3\.(?:webp|avif)$/, async route => {
      if (missing) await route.fulfill({ status: 404 });
      else { await hold; await route.continue(); }
    }), { lightweight: false }, seed);
    await page.getByRole('button', { name: /^续梦/ }).click();
    const arrived = page.locator('.scene-image--current[data-art="modern-street-arrival-r3"]');
    await arrived.waitFor();
    assert.equal(await arrived.evaluate(image => getComputedStyle(image).animationName), 'none', 'Reduced motion never starts the reveal from a hidden first frame');
    assert.equal(await page.locator('.scene-image--previous').isVisible(), false, 'Reduced motion never flashes the title behind story art');
    await page.keyboard.press('Enter');
    await page.locator('.dialogue-text[data-beat-id="modern-o-0-1:5:0"]').waitFor();
    await page.locator('.scene-image--current[data-art="modern-street-arrival-r3"]').waitFor({ state: 'detached' });
    if (missing) {
      await page.locator('.scene-image--current').waitFor({ state: 'detached' });
      assert.match(await page.locator('.dialogue-text').getAttribute('aria-label'), /手写的招牌/);
    } else {
      release();
      await page.waitForFunction(() => document.querySelector('.scene-image--current')?.style.backgroundImage.includes('/art-original/cg-modern-word-stall-r3.webp'));
    }
    results.push({ check: missing ? 'missing CG leaves readable text over a neutral stage' : 'slow original paints when ready without leaving the old scene in place', passed: true });
    await context.close();
  }
  {
    const seed = { ...state, campaign: 'overseas', sceneId: 'modern-o-0-2', beatId: 'modern-o-0-2:28:0' };
    const { context, page } = await open(undefined, undefined, { lightweight: false }, seed);
    await page.getByRole('button', { name: /^续梦/ }).click();
    await page.locator('.scene-image--current[data-art="cg-modern-jade-light-r2"]').waitFor();
    await page.keyboard.press('ArrowRight');
    const blackout = page.locator('.scene-art[data-art="blackout"]');
    await blackout.waitFor();
    await page.waitForFunction(() => {
      const layer = document.querySelector('.scene-art[data-art="blackout"]');
      return layer && getComputedStyle(layer).backgroundColor === 'rgb(0, 0, 0)';
    });
    assert.equal(await page.locator('.scene-image, .actor').count(), 0);
    assert.match(await page.locator('.dialogue-text').getAttribute('aria-label'), /切黑/);
    results.push({ check: 'the scripted blackout clears background and portraits while preserving the saved page', passed: true });
    await context.close();
  }
  {
    const { context, page } = await open(undefined, page => page.route('**/assets/story-*.js', route => route.abort()));
    const start = page.locator('.start-button');
    await start.click();
    await page.getByRole('button', { name: /再点一次，重新启程/ }).click();
    await page.getByRole('button', { name: '刷新重试', exact: true }).waitFor();
    await page.getByRole('button', { name: '阅读设置', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('heterotopia.v1.autosave')).beatId), state.beatId);
    results.push({ check: 'failed story chunk leaves settings usable and prior save intact', passed: true });
    await context.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(new URL('results.json', folder), JSON.stringify({ browser: name, results, errors }, null, 2));
  console.log(JSON.stringify({ browser: name, results, errors }));
} finally { await browser.close(); }
