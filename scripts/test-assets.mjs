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
async function open(viewport = { width: 1280, height: 800 }, setup, settings = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.width < 760 ? 3 : 1, serviceWorkers: 'block' });
  await context.addInitScript(({ state, settings }) => {
    if (sessionStorage.getItem('synthetic-asset-test')) return;
    localStorage.setItem('heterotopia.v1.autosave', JSON.stringify(state));
    localStorage.setItem('heterotopia.v1.settings', JSON.stringify({ textSpeed: 0, muted: true, reducedMotion: true, lightweight: true, ...settings }));
    localStorage.setItem('heterotopia.v1.readingHint', 'true');
    sessionStorage.setItem('synthetic-asset-test', 'true');
  }, { state, settings });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await setup?.(page);
  await page.goto(base);
  await page.getByRole('heading', { name: '异托邦' }).waitFor();
  return { context, page };
}
try {
  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    const { context, page } = await open(viewport);
    const failures = [];
    page.on('response', response => { if (response.status() >= 400) failures.push(response.url()); });
    await page.getByRole('button', { name: /^续梦/ }).click();
    await page.locator('.actor img').waitFor();
    await page.locator('.actor img').evaluate(image => image.decode());
    const source = await page.locator('.actor img').evaluate(image => image.currentSrc);
    assert.match(source, viewport.width < 760 ? /portrait-shen-m\.(avif|webp)$/ : /portrait-shen\.(avif|webp)$/);
    const requested = await page.evaluate(() => performance.getEntriesByType('resource').map(entry => entry.name).filter(url => /portrait-shen(?:-m)?\.(avif|webp)$/.test(url)));
    assert.equal(new Set(requested).size, 1, `Prefetch and picture disagreed: ${requested}`);
    assert.deepEqual(failures, []);
    await page.screenshot({ path: fileURLToPath(new URL(viewport.width < 760 ? 'mobile-dpr3.png' : 'desktop.png', folder)) });
    results.push({ check: viewport.width < 760 ? 'mobile, DPR3' : 'desktop', source, noDuplicateFormat: true });
    const supported = source.endsWith('.avif');
    const resized = viewport.width < 760 ? { width: 1280, height: 800 } : { width: 390, height: 844 };
    await page.setViewportSize(resized);
    await page.waitForFunction(mobile => {
      const image = document.querySelector('.actor img');
      return image?.complete && image.naturalWidth > 0 && (mobile ? /-m\.(avif|webp)$/.test(image.currentSrc) : /portrait-shen\.(avif|webp)$/.test(image.currentSrc));
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
    const { context, page } = await open(undefined, page => page.route('**/assets/story-*.js', route => route.abort()));
    await page.getByRole('button', { name: /^(重新)?启程$/ }).click();
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
