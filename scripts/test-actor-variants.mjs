import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';
import { compileScene, enterScene, newGame, newProfile } from '../src/engine.ts';
import { loadStory } from '../src/story.ts';

await loadStory();
const base = process.env.VN_TEST_URL || 'http://127.0.0.1:4179';
const engine = process.env.VN_TEST_BROWSER || 'chromium';
const browser = await { chromium, webkit }[engine].launch();
const output = new URL(`../artifacts/art-direction-2/${engine}/`, import.meta.url);
await mkdir(output, { recursive: true });
const results = [], errors = [];
const profile = newProfile();
const at = (sceneId, beatId) => ({ ...enterScene(newGame(profile), profile, sceneId), choices: { breakfast: 'B' }, beatId });
const path = file => fileURLToPath(new URL(file, output));

async function open(state, viewport = { width: 390, height: 844 }, setup) {
  const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
  await context.addInitScript(({ state, profile }) => {
    if (sessionStorage.getItem('actor-variant-fixture')) return;
    localStorage.setItem('heterotopia.v1.autosave', JSON.stringify(state));
    localStorage.setItem('heterotopia.v1.profile', JSON.stringify(profile));
    localStorage.setItem('heterotopia.v1.settings', JSON.stringify({ textSpeed: 0, reducedMotion: true, muted: true, showSprites: true }));
    localStorage.setItem('heterotopia.v1.readingHint', 'true');
    sessionStorage.setItem('actor-variant-fixture', 'true');
  }, { state, profile: { ...profile, read: compileScene(state.sceneId, profile, state).map(b => b.id) } });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push(error.message));
  await setup?.(page);
  await page.goto(base);
  await page.getByRole('button', { name: /^续梦/ }).click();
  await page.locator('.game-screen').waitFor();
  return { context, page };
}

async function visible(page, portrait) {
  await page.waitForFunction(name => {
    const el = document.querySelector(`.actor--active[data-portrait="${name}"]`);
    const img = el?.querySelector('.actor-portrait:not(.actor-portrait--outgoing)');
    return img?.complete && img.naturalWidth > 0 && Number(getComputedStyle(el).opacity) >= .95;
  }, portrait);
  const actor = page.locator('.actor--active');
  const source = await actor.locator('.actor-portrait:not(.actor-portrait--outgoing)').evaluate(img => img.currentSrc);
  assert.match(source, new RegExp(`/${portrait}(?:-m)?\\.(?:avif|webp)$`));
  assert.equal(await actor.count(), 1);
  return actor;
}

async function turn(page, beatId) {
  await page.waitForTimeout(190);
  await page.locator('.dialogue-advance').click();
  if (beatId) await page.waitForFunction(id => JSON.parse(localStorage.getItem('heterotopia.v1.autosave'))?.beatId === id, beatId);
}

try {
  const checkpoints = [
    ['waking', '0-1', '0-1:15:0', 'portrait-shen-home-surprised', '沈辞'],
    ['breakfast', '0-2', '0-2:6:0', 'portrait-tang-dining', '唐瑾'],
    ['school', '0-4', '0-4:7:0', 'portrait-shen-school', '沈辞'],
    ['home-again', '终-4', '终-4:13:0', 'portrait-shen-home-smile', '沈辞'],
    ['winter', 'B-12-1', 'B-12-1:5:0', 'portrait-xu-winter', '戌（沈辞）'],
    ['winter-sad', 'A-E2-4', 'A-E2-4:6:0', 'portrait-xu-winter-sad', '戌（沈辞）'],
    ['mi-listening', 'B-2', 'B-2:12:6', 'portrait-mi-listening', '芈'],
    ['mi-palm', 'B-2', 'B-2:12:2', 'portrait-mi-palm', '芈'],
    ['mi-tired', 'B-12-1', 'B-12-1:16:3', 'portrait-mi-tired', '芈'],
  ];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 360, height: 740 }, { width: 844, height: 390 }, { width: 820, height: 1180 }]) {
    for (const [label, sceneId, beatId, portrait, actorLabel] of checkpoints) {
      const { context, page } = await open(at(sceneId, beatId), viewport);
      try {
        const actor = await visible(page, portrait);
        assert.equal(await actor.locator('.actor-vertical-name').innerText(), actorLabel);
        if (sceneId === '终-4') {
          assert.equal(await page.locator('.scene-image--current').getAttribute('data-art'), 'bedroom');
          assert.equal(await page.locator('.location-name').innerText(), '沈家卧室 · 数日后傍晚');
        }
        const geometry = await actor.evaluate(el => {
          const img = el.querySelector('.actor-portrait:not(.actor-portrait--outgoing)');
          const rect = img.getBoundingClientRect();
          const scale = Math.min(rect.width / img.naturalWidth, rect.height / img.naturalHeight);
          const width = img.naturalWidth * scale, height = img.naturalHeight * scale;
          const left = rect.left + (getComputedStyle(img).objectPosition.startsWith('100%') ? rect.width - width : (rect.width - width) / 2);
          const top = rect.bottom - height;
          const text = document.querySelector('.dialogue-body').getBoundingClientRect();
          return { face: { x: left + width * .5, y: top + height * .24 }, hands: { x: left + width * .5, y: top + height * .72 }, text: { top: text.top, right: text.right }, overflow: document.documentElement.scrollWidth > innerWidth };
        });
        assert.equal(geometry.overflow, false);
        for (const point of [geometry.face, ...(label === 'mi-palm' ? [geometry.hands] : [])]) {
          assert.ok(point.x > 0 && point.x < viewport.width && point.y > 0 && point.y < viewport.height, JSON.stringify(geometry));
        }
        if (viewport.width === 820) assert.ok(geometry.face.y < viewport.height * .55, 'tablet face stays above the reading area');
        if (label === 'mi-palm') assert.ok(geometry.hands.y < geometry.text.top || geometry.hands.x > geometry.text.right + 12, 'palm gesture stays clear of text');
        await page.screenshot({ path: path(`${label}-${viewport.width}.png`) });
        results.push({ label, viewport, portrait, geometry, passed: true });
      } finally { await context.close(); }
    }
    console.log(`PASS ${engine} costumes and poses at ${viewport.width}×${viewport.height}`);
  }

  // Initial staging must wait for the correct outfit rather than flashing one.
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const delayed = await open(at('0-1', '0-1:15:0'), undefined, async page => {
    await page.route(/\/art\/portrait-shen-home-surprised(?:-m)?\.(?:avif|webp)$/, async route => { await gate; await route.continue().catch(() => {}); });
  });
  try {
    await delayed.page.locator('.actor--shen.actor--pending').waitFor();
    assert.equal(await delayed.page.locator('.actor--shen').evaluate(el => Number(getComputedStyle(el).opacity)), 0);
    assert.equal(await delayed.page.locator('.actor img').count(), 0, 'no flash of canonical school clothes');
    release();
    const actor = await visible(delayed.page, 'portrait-shen-home-surprised');
    const node = await actor.elementHandle();
    await turn(delayed.page, '0-1:16:0');
    await visible(delayed.page, 'portrait-mother');
    await turn(delayed.page, '0-1:17:0');
    await visible(delayed.page, 'portrait-shen-home');
    results.push({ label: 'initial costume waits for decode and subsequent expression returns correctly', passed: true, initialNodeDetached: !await node.evaluate(el => el.isConnected) });
  } finally { release(); await delayed.context.close(); }

  const expressionFallback = await open(at('0-1', '0-1:15:0'), undefined, page => page.route(/\/art\/portrait-shen-home-surprised(?:-m)?\.(?:avif|webp)$/, route => route.abort()));
  try {
    await visible(expressionFallback.page, 'portrait-shen-home');
    results.push({ label: 'missing expression falls back to the same T-shirt', passed: true });
  } finally { await expressionFallback.context.close(); }

  const outfitFallback = await open(at('0-1', '0-1:15:0'), undefined, page => page.route(/\/art\/portrait-shen-home(?:-surprised)?(?:-m)?\.(?:avif|webp)$/, route => route.abort()));
  try {
    await visible(outfitFallback.page, 'portrait-shen-surprised');
    assert.equal(await outfitFallback.page.locator('.actor-vertical-name').innerText(), '沈辞');
    results.push({ label: 'missing costume falls back to a decoded canonical expression', passed: true });
  } finally { await outfitFallback.context.close(); }

  // A silent actor changes pose without remounting or changing the original text.
  const changing = await open(at('B-2', 'B-2:12:2'));
  try {
    const node = await (await visible(changing.page, 'portrait-mi-palm')).elementHandle();
    for (const id of ['B-2:12:3', 'B-2:12:4', 'B-2:12:5', 'B-2:12:6']) await turn(changing.page, id);
    const actor = await visible(changing.page, 'portrait-mi-listening');
    assert.ok(await node.evaluate(el => el.isConnected && el === document.querySelector('.actor--mi')));
    assert.equal(await actor.locator('.actor-vertical-name').innerText(), '芈');
    results.push({ label: 'Mi changes from palm gesture to listening on the same stage node', passed: true });
  } finally { await changing.context.close(); }
  assert.deepEqual(errors, []);
  console.log(`PASS ${results.length} ${engine} actor variant checks`);
} catch (error) {
  results.push({ passed: false, error: String(error) });
  throw error;
} finally {
  await writeFile(new URL('results.json', output), JSON.stringify({ results, errors }, null, 2));
  await browser.close();
}
