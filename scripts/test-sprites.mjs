import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';
import { advance, compileScene, currentBeat, enterScene, newGame, newProfile } from '../src/engine.ts';

const base = process.env.VN_TEST_URL || 'http://127.0.0.1:4179';
const name = process.env.VN_TEST_BROWSER || 'chromium';
const output = new URL(`../artifacts/ui-fix-2/${name}/`, import.meta.url);
await mkdir(output, { recursive: true });
const browser = await ({ chromium, firefox, webkit }[name]).launch();
const results = [], errors = [];
const profile = newProfile();
const at = (sceneId, beatId) => ({ ...enterScene(newGame(profile), profile, sceneId), beatId });
const stored = page => page.evaluate(() => JSON.parse(localStorage.getItem('heterotopia.v1.autosave')));
const path = file => fileURLToPath(new URL(file, output));
const active = (page, key) => page.locator(`.actor--${key}[data-actor-state="active"]`);
const full = (page, key) => page.waitForFunction(key => {
  const actor = document.querySelector(`.actor--${key}[data-actor-state="active"]`);
  return actor && actor.querySelector('img').complete && Number(getComputedStyle(actor).opacity) >= .95;
}, key);
async function turn(page, beatId) {
  // Real input respects the app's 180ms double-click guard.
  await page.waitForTimeout(190);
  await page.locator('.dialogue-advance').click();
  if (beatId) await page.waitForFunction(id => JSON.parse(localStorage.getItem('heterotopia.v1.autosave'))?.beatId === id, beatId);
}

// Browser-frame timing excludes Playwright/OS scheduling and assertion overhead.
async function armTiming(page, key) {
  await page.evaluate(key => {
    window.__actorTiming = new Promise((resolve, reject) => {
      let start;
      document.addEventListener('click', () => { start = performance.now(); }, { once: true, capture: true });
      const frame = () => {
        if (start !== undefined) {
          const el = document.querySelector(`.actor--${key}[data-actor-state="active"]`);
          if (el && !el.classList.contains('actor--idle') && Number(getComputedStyle(el).opacity) >= .95) { resolve(Math.round(performance.now() - start)); return; }
          if (performance.now() - start > 5000) { reject(new Error('Actor transition timed out')); return; }
        }
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  }, key);
}

async function check(label, state, run, options = {}) {
  const context = await browser.newContext({ viewport: options.viewport ?? { width: 1280, height: 800 } });
  await context.addInitScript(({ state, profile, reduced, saveData }) => {
    if (!sessionStorage.getItem('synthetic-sprite-test')) {
      localStorage.setItem('heterotopia.v1.autosave', JSON.stringify(state));
      localStorage.setItem('heterotopia.v1.profile', JSON.stringify(profile));
      localStorage.setItem('heterotopia.v1.settings', JSON.stringify({ textSpeed: 0, muted: true, reducedMotion: reduced }));
      localStorage.setItem('heterotopia.v1.readingHint', 'true');
      sessionStorage.setItem('synthetic-sprite-test', 'true');
    }
    if (saveData) Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true } });
  }, { state, profile: { ...profile, read: compileScene(state.sceneId, profile, state).map(b => b.id) }, reduced: options.reduced ?? false, saveData: options.saveData ?? false });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(`${label}: ${error.message}`));
  try {
    await options.setup?.(page);
    await page.goto(base);
    await page.evaluate(() => document.fonts.ready);
    await options.home?.(page);
    await page.getByRole('button', { name: /^续梦/ }).click();
    await run(page);
    results.push({ label, passed: true }); console.log(`PASS ${label}`);
  } catch (error) {
    const screenshot = `failure-${results.length + 1}.png`;
    await page.screenshot({ path: path(screenshot) }).catch(() => {});
    results.push({ label, passed: false, error: String(error), screenshot }); console.error(`FAIL ${label}: ${error}`);
  } finally { await context.close(); }
}

try {
  await check('The title screen requests no portraits; Save-Data skips unrelated idle art', at('0-1', '0-1:11:0'), async page => {
    await turn(page, '0-1:12:0'); await full(page, 'shen');
    await page.waitForTimeout(500);
    const portraits = await page.evaluate(() => performance.getEntriesByType('resource').map(e => e.name).filter(url => /\/portrait-/.test(url)));
    assert.ok(portraits.length > 0);
    assert.ok(portraits.every(url => /portrait-(shen|tang)\.webp/.test(url)), portraits.join('\n'));
  }, { saveData: true, home: async page => {
    assert.equal(await page.evaluate(() => performance.getEntriesByType('resource').filter(e => /\/portrait-/.test(e.name)).length), 0);
  } });

  await check('Narration retains the exact actor node with a short speaking transition', at('0-2', '0-2:6:0'), async page => {
    const actor = page.locator('.actor').last();
    await actor.waitFor(); const key = await actor.evaluate(el => el.className.match(/actor--(shen|tang)/)[1]);
    await full(page, key); const node = await active(page, key).elementHandle();
    await turn(page, '0-2:8:0');
    await page.waitForFunction(() => document.querySelector('.actor--idle') && Math.abs(Number(getComputedStyle(document.querySelector('.actor--idle')).opacity) - .55) < .01);
    assert.ok(await node.evaluate(el => el.isConnected));
    await page.waitForTimeout(190);
    await armTiming(page, key); await page.locator('.dialogue-advance').click();
    const elapsed = await page.evaluate(() => window.__actorTiming);
    // The brief's frame-time budgets use Chromium. Record other engines too;
    // software rendering can miss frames, while the CSS duration stays bounded.
    if (name === 'chromium') assert.ok(elapsed <= 250, `Speaking transition exceeded budget: ${elapsed}ms`);
    assert.ok(await active(page, key).evaluate(el => parseFloat(getComputedStyle(el).transitionDuration) <= .22));
    assert.ok(await node.evaluate(el => el === document.querySelector('.actor')));
    await page.screenshot({ path: path('narration-return.png') });
    results.push({ metric: 'narrationReturnMs', value: elapsed });
  });

  await check('Cached speaker changes crossfade with at most two layers', at('0-4', '0-4:7:0'), async page => {
    await full(page, 'shen');
    await page.evaluate(async () => { const img = new Image(); img.src = './art/portrait-song.webp'; await img.decode(); });
    const old = await active(page, 'shen').elementHandle();
    await armTiming(page, 'song'); await page.locator('.dialogue-advance').click();
    await page.locator('.actor--song.actor--active').waitFor();
    assert.ok(await old.evaluate(el => el.isConnected && el.classList.contains('actor--exit')));
    assert.ok(await page.locator('.actor').count() <= 2);
    const elapsed = await page.evaluate(() => window.__actorTiming);
    if (name === 'chromium') assert.ok(elapsed <= 300, `Cached crossfade exceeded budget: ${elapsed}ms`);
    assert.ok(await active(page, 'song').evaluate(el => parseFloat(getComputedStyle(el).transitionDuration) <= .22));
    await page.waitForFunction(() => document.querySelectorAll('.actor').length === 1);
    results.push({ metric: 'cachedSwitchMs', value: elapsed });
  });

  let releaseSlow;
  await check('A delayed image stays invisible until decoded, then fades in', at('0-4', '0-4:7:0'), async page => {
    await page.locator('.actor--shen.actor--pending').waitFor();
    assert.equal(await page.locator('.actor--shen').evaluate(el => Number(getComputedStyle(el).opacity)), 0);
    await page.waitForTimeout(650); releaseSlow();
    await page.waitForFunction(() => {
      const el = document.querySelector('.actor--shen');
      return el?.dataset.actorState === 'active' && Number(getComputedStyle(el).opacity) > 0 && Number(getComputedStyle(el).opacity) < .9;
    });
    await full(page, 'shen');
  }, { setup: async page => {
    const gate = new Promise(resolve => { releaseSlow = resolve; });
    await page.route('**/art/portrait-shen.webp', async route => { await gate; await route.continue().catch(() => {}); });
  } });

  let releaseStale;
  await check('Late decoding cannot revive an old speaker after advancing', at('0-4', '0-4:7:0'), async page => {
    await page.locator('.actor--shen.actor--pending').waitFor();
    await turn(page, '0-4:8:0'); await full(page, 'song');
    releaseStale(); await page.waitForTimeout(500);
    assert.equal(await page.locator('.actor--shen').count(), 0);
    assert.equal(await active(page, 'song').count(), 1);
  }, { setup: async page => {
    const gate = new Promise(resolve => { releaseStale = resolve; });
    await page.route('**/art/portrait-shen.webp', async route => { await gate; await route.continue().catch(() => {}); });
  } });

  await check('A failed portrait leaves the story readable and later speakers working', at('0-4', '0-4:7:0'), async page => {
    await page.waitForFunction(() => document.querySelectorAll('.actor--shen').length === 0);
    assert.equal(await page.locator('.actor--shen').count(), 0);
    assert.equal(await page.getByTestId('dialogue-text').getAttribute('aria-label'), currentBeat(at('0-4', '0-4:7:0'), profile).text);
    await turn(page, '0-4:8:0'); await full(page, 'song');
  }, { setup: page => page.route('**/art/portrait-shen.webp', route => route.abort()) });

  await check('A scene change clears the previous actor; choices do not retain it', at('0-4', '0-4:24:1'), async page => {
    await full(page, 'shen'); const old = await active(page, 'shen').elementHandle();
    await turn(page);
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('heterotopia.v1.autosave')).sceneId === '0-5');
    assert.equal(await old.evaluate(el => el.isConnected), false);
    assert.equal(await page.locator('.actor').count(), 0);
  }, { reduced: true });

  const breakfast = compileScene('0-2', profile, { inventory: [], choices: {} });
  const beforeChoice = breakfast[breakfast.findIndex(b => b.kind === 'choice') - 1];
  await check('A choice finishes the actor departure with reduced motion', at('0-2', beforeChoice.id), async page => {
    await turn(page);
    await page.getByRole('region', { name: '命运选择' }).waitFor();
    await page.waitForFunction(() => document.querySelectorAll('.actor').length === 0);
  }, { reduced: true });

  await check('Fast-forward uses decoded, opaque replacements without accumulating layers', at('0-4', '0-4:7:0'), async page => {
    await full(page, 'shen');
    await page.evaluate(async () => {
      await Promise.all(['shen', 'song', 'tang'].map(async key => { const img = new Image(); img.src = `./art/portrait-${key}.webp`; await img.decode(); }));
      window.__skipSamples = [];
      window.__skipTimer = setInterval(() => {
        const button = document.querySelector('.reading-controls button[title^="仅跳过"]');
        if (button?.getAttribute('aria-pressed') === 'true') window.__skipSamples.push([...document.querySelectorAll('.actor')].map(el => ({ phase: el.dataset.actorState, opacity: Number(getComputedStyle(el).opacity) })));
      }, 16);
    });
    await page.keyboard.down('Control'); await page.waitForTimeout(950); await page.keyboard.up('Control');
    const samples = await page.evaluate(() => { clearInterval(window.__skipTimer); return window.__skipSamples; });
    assert.ok(samples.length >= 10);
    assert.ok(samples.every(layers => layers.length <= 2 && layers.filter(l => l.phase === 'active').every(l => l.opacity >= .95)), JSON.stringify(samples));
    assert.notEqual((await stored(page)).beatId, '0-4:7:0');
  });

  await check('Mobile composition and both control rows fit 360/390/430px screens', at('A-4', 'A-4:4:0'), async page => {
    await full(page, 'quheng');
    for (const [width, height] of [[360, 780], [390, 844], [430, 932]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
      const bounds = await active(page, 'quheng').boundingBox();
      assert.ok(bounds.width <= width * 1.08 && bounds.y >= 60 && bounds.height <= height * .63, JSON.stringify(bounds));
      const row1 = await page.locator('.reading-controls > button').evaluateAll(buttons => buttons.map(el => { const r = el.getBoundingClientRect(); return { x: r.x, width: r.width, height: r.height }; }));
      assert.equal(await page.locator('.reading-more').evaluate(el => el.getBoundingClientRect().width), 0);
      const gaps = row1.slice(1).map((b, i) => b.x - row1[i].x - row1[i].width);
      assert.ok(Math.max(...gaps) - Math.min(...gaps) <= 4);
      await page.screenshot({ path: path(`palace-${width}-closed.png`) });
      await page.getByRole('button', { name: '更多', exact: true }).click();
      const row2 = await page.locator('.reading-more > button').evaluateAll(buttons => buttons.map(el => { const r = el.getBoundingClientRect(); return { x: r.x, width: r.width, height: r.height }; }));
      row1.forEach((b, i) => { assert.ok(Math.abs(b.x - row2[i].x) <= 2 && Math.abs(b.width - row2[i].width) <= 2); });
      assert.ok([...row1, ...row2].every(b => b.width >= 44 && b.height >= 44));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: path(`palace-${width}-open.png`) });
      await page.getByRole('button', { name: '收起', exact: true }).click();
    }
  }, { viewport: { width: 390, height: 844 } });

  await check('A dream bookmark thumbnail, location, excerpt and reload agree', newGame(profile), async page => {
    const location = await page.locator('.location-name').innerText();
    await page.keyboard.press('s'); await page.locator('.save-slot-main').first().click();
    const card = page.locator('.save-slot--filled').first();
    assert.equal(await card.locator('.save-slot-info > strong').innerText(), location);
    assert.match(await card.locator('img').getAttribute('src'), /dream-boat-thumb\.webp$/);
    assert.equal(await card.locator('.save-slot-excerpt').innerText(), '船底下有东西在敲。');
    await page.screenshot({ path: path('dream-bookmark.png') });
    await page.getByRole('button', { name: '重续旧梦', exact: true }).click();
    assert.ok((await page.locator('.autosave-row').innerText()).includes(location));
    await card.locator('.save-slot-main').click();
    assert.equal(await page.locator('.location-name').innerText(), location);
  }, { viewport: { width: 390, height: 844 } });
} finally {
  await browser.close();
  await writeFile(new URL('results.json', output), JSON.stringify({ testedAt: new Date().toISOString(), browser: name, results, errors }, null, 2));
}
assert.equal(errors.length, 0, errors.join('\n'));
const failures = results.filter(r => r.passed === false);
assert.equal(failures.length, 0, `${failures.length} sprite checks failed; see ${fileURLToPath(output)}`);
console.log(`${name}: ${results.filter(r => r.passed).length} sprite checks passed.`);
