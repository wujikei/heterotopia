import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium, firefox, webkit } from 'playwright';

// A separate, disposable profile and a real subpath server. No player data.
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'artifacts/perf/cache');
await mkdir(output, { recursive: true });
const profile = await mkdtemp(path.join(output, 'profile-'));
const name = process.env.VN_TEST_BROWSER || 'chromium';
const browserType = { chromium, firefox, webkit }[name];
if (!browserType) throw new Error(`Unsupported browser: ${name}`);
let version = 1;
let recovery = false;
const hits = [];
const errors = [];
const contentTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.avif': 'image/avif', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' };
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (!url.pathname.startsWith('/heterotopia/')) { response.writeHead(404).end(); return; }
    let relative = decodeURIComponent(url.pathname.slice('/heterotopia/'.length)) || 'index.html';
    const file = path.resolve(root, 'dist', relative);
    if (!file.startsWith(path.resolve(root, 'dist') + path.sep)) { response.writeHead(403).end(); return; }
    let data = await readFile(file);
    if (relative === 'sw.js' && version > 1) data = Buffer.from(data.toString().replace(/const BUILD_VERSION = "([^"]+)";/, `const BUILD_VERSION = "$1-test${version}";`));
    if (relative === 'sw.js' && recovery) data = Buffer.from(`
      self.addEventListener('install', () => self.skipWaiting());
      self.addEventListener('activate', event => event.waitUntil((async () => {
        const prefix = 'heterotopia-' + encodeURIComponent(new URL(self.registration.scope).pathname) + '-';
        await self.clients.claim();
        await Promise.all((await caches.keys()).filter(key => key.startsWith(prefix)).map(key => caches.delete(key)));
        await self.registration.unregister();
      })()));
    `);
    hits.push(relative);
    if (process.env.VN_DEBUG_CACHE && relative === 'index.html') console.log(JSON.stringify({ navigation: hits.length, headers: request.headers }));
    response.writeHead(200, { 'Content-Type': contentTypes[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'max-age=0, must-revalidate', 'Content-Length': data.length });
    response.end(data);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/heterotopia/`;
let context;
async function launch() {
  context = await browserType.launchPersistentContext(profile, { headless: true, viewport: { width: 390, height: 844 } });
  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(45000);
  page.on('pageerror', error => errors.push(error.message));
  return page;
}
const results = [];
async function waitForAsync(predicate, argument) {
  const deadline = Date.now() + 45000;
  while (!await context.pages()[0].evaluate(predicate, argument)) {
    if (Date.now() >= deadline) throw new Error('Asynchronous cache state did not settle within 45 seconds');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
try {
  let page = await launch();
  await page.goto(base);
  await page.getByRole('heading', { name: '异托邦' }).waitFor();
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 45000 });
  const registrations = await page.evaluate(() => navigator.serviceWorker.getRegistrations().then(items => items.map(item => item.scope)));
  assert.deepEqual(registrations, [base]);
  await page.evaluate(() => {
    localStorage.setItem('heterotopia.v1.autosave', JSON.stringify({ version: 1, sceneId: '0-1', beatId: '0-1:11:0', inventory: [], choices: {}, history: [], cycle: 1 }));
    localStorage.setItem('heterotopia.v1.settings', JSON.stringify({ textSpeed: 0, muted: true }));
    localStorage.setItem('heterotopia.v1.readingHint', 'true');
  });
  await page.reload();
  await page.getByRole('button', { name: /^续梦/ }).click();
  await page.locator('.dialogue-advance').waitFor();
  await page.locator('.dialogue-advance').click();
  await page.waitForFunction(() => {
    const actor = document.querySelector('.actor');
    return actor && Number(getComputedStyle(actor).opacity) >= .95;
  });
  const saved = await page.evaluate(() => localStorage.getItem('heterotopia.v1.autosave'));
  await context.close(); context = null;
  page = await launch();
  const responses = [];
  page.on('response', response => responses.push({ url: response.url(), serviceWorker: response.fromServiceWorker(), status: response.status() }));
  if (name === 'chromium') {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 562, downloadThroughput: 1.6e6 / 8 * .9, uploadThroughput: .68e6 / 8 });
  }
  const mark = hits.length;
  const began = performance.now();
  await page.goto(base);
  await page.getByRole('heading', { name: '异托邦' }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  const fontsReadyMs = Math.round(performance.now() - began);
  const foreground = hits.slice(mark).filter(file => file !== 'sw.js');
  if (process.env.VN_DEBUG_CACHE) console.log(JSON.stringify({ foreground, responses }));
  assert.ok(foreground.every(file => file === 'index.html'), JSON.stringify(foreground));
  assert.ok(foreground.length <= (name === 'webkit' ? 2 : 1), JSON.stringify(foreground));
  assert.ok(responses.filter(item => /\/(assets|fonts|art|art-original)\//.test(item.url)).every(item => item.serviceWorker));
  results.push({ check: 'persistent cold restart, expired HTTP cache, Fast3G on Chromium', networkRequests: foreground.length, fontsReadyMs, responses: [...responses] });
  console.log(`${name}: persistent restart uses ${foreground.length} HTML request(s), all assets from service worker.`);

  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: /^续梦/ }).click();
  await page.locator('.dialogue-advance').waitFor();
  await page.locator('.actor img').first().evaluate(image => image.decode());
  assert.equal(await page.evaluate(() => localStorage.getItem('heterotopia.v1.autosave')), saved);
  results.push({ check: 'offline navigation, lazy story, portrait and previous save', passed: true });
  console.log(`${name}: offline story and saved portrait passed.`);
  await context.setOffline(false);

  const audio = JSON.parse(await readFile(path.join(root, 'public/audio/manifest.json'), 'utf8')).files.find(item => item.file.includes('page'));
  const expectedAudio = await readFile(path.join(root, 'public/audio', audio.file));
  await page.evaluate(async file => { await (await fetch(`./audio/${file}`)).arrayBuffer(); }, audio.file);
  await waitForAsync(async file => {
    for (const key of await caches.keys()) if (await (await caches.open(key)).match(new URL(`./audio/${file}`, location.href).href)) return true;
    return false;
  }, audio.file);
  await context.setOffline(true);
  const ranges = await page.evaluate(async file => {
    const request = async range => {
      const response = await fetch(`./audio/${file}`, { headers: { Range: range } });
      return { status: response.status, contentRange: response.headers.get('Content-Range'), bytes: [...new Uint8Array(await response.arrayBuffer())] };
    };
    return Promise.all(['bytes=0-127', 'bytes=-64', 'bytes=999999999-'].map(request));
  }, audio.file);
  assert.equal(ranges[0].status, 206);
  assert.deepEqual(ranges[0].bytes, [...expectedAudio.subarray(0, 128)]);
  assert.equal(ranges[1].status, 206);
  assert.deepEqual(ranges[1].bytes, [...expectedAudio.subarray(-64)]);
  assert.equal(ranges[2].status, 416);
  results.push({ check: 'cached audio: byte range, suffix range, invalid range; offline', passed: true });
  console.log(`${name}: offline audio ranges passed.`);
  await context.setOffline(false);

  if (name === 'chromium') {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  }
  for (version = 2; version <= 3; version++) {
    await page.evaluate(async () => {
      window.__noAutoReload = 'reading-kept';
      const registration = await navigator.serviceWorker.getRegistration();
      await registration.update();
    });
    await page.getByRole('button', { name: '刷新', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__noAutoReload), 'reading-kept');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'load' }),
      page.getByRole('button', { name: '刷新', exact: true }).click(),
    ]);
    await page.getByRole('heading', { name: '异托邦' }).waitFor();
    assert.equal(await page.evaluate(() => localStorage.getItem('heterotopia.v1.autosave')), saved);
    const cachesKept = await page.evaluate(() => caches.keys());
    assert.equal(cachesKept.length, 2);
    console.log(`${name}: update ${version} preserved the save and kept only two cache generations.`);
  }
  results.push({ check: 'two explicit updates, no forced reload, save preserved, old cache cleanup', passed: true });
  recovery = true;
  await page.evaluate(async () => {
    await caches.open('unrelated-site-cache');
    window.__noAutoReload = 'reading-kept';
    const registration = await navigator.serviceWorker.getRegistration();
    try { await registration.update(); }
    catch (error) { if ((await navigator.serviceWorker.getRegistrations()).length) throw error; }
  });
  await waitForAsync(async () => (await navigator.serviceWorker.getRegistrations()).length === 0
    && (await caches.keys()).every(key => key === 'unrelated-site-cache'));
  assert.equal(await page.evaluate(() => window.__noAutoReload), 'reading-kept');
  assert.deepEqual(await page.evaluate(() => caches.keys()), ['unrelated-site-cache']);
  assert.equal(await page.evaluate(() => localStorage.getItem('heterotopia.v1.autosave')), saved);
  results.push({ check: 'emergency worker unregisters only this game; save and other caches survive', passed: true });
  assert.deepEqual(errors, []);
  await writeFile(path.join(output, `${name}.json`), JSON.stringify({ browser: name, base, results, errors }, null, 2));
  console.log(JSON.stringify({ browser: name, results: results.map(({ responses, ...result }) => result), errors }));
} catch (error) {
  const diagnostics = await context?.pages()[0]?.evaluate(async () => ({
    controller: navigator.serviceWorker.controller?.scriptURL,
    registrations: (await navigator.serviceWorker.getRegistrations()).map(item => ({ scope: item.scope, active: item.active?.state, waiting: item.waiting?.state, installing: item.installing?.state })),
    caches: await Promise.all((await caches.keys()).map(async key => ({ key, urls: (await (await caches.open(key)).keys()).map(item => item.url) }))),
  })).catch(() => null);
  await writeFile(path.join(output, `${name}-failure.json`), JSON.stringify({ error: String(error), hits, responses: results, diagnostics, errors }, null, 2));
  console.error(JSON.stringify({ diagnostics, hits }));
  throw error;
} finally {
  await context?.close();
  await new Promise(resolve => server.close(resolve));
}
