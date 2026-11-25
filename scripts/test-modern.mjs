import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { enterScene, newGame, newProfile } from '../src/engine.ts';
import { loadStory } from '../src/story.ts';

const base = process.env.VN_TEST_URL || 'http://127.0.0.1:4179';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
await context.addInitScript(() => localStorage.setItem('heterotopia.v1.settings', JSON.stringify({ textSpeed: 0, reducedMotion: true, muted: true, showSprites: true })));
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400 && !response.url().includes('favicon.ico')) errors.push(`${response.status()} ${response.url()}`); });
try {
  await page.goto(base);
  await page.getByRole('button', { name: /林越.*现代新卷/ }).click();
  await page.getByRole('button', { name: /关于此梦/ }).click();
  const aboutText = await page.locator('.about-content').innerText();
  assert.match(aboutText, /两条古代旅程/);
  assert.doesNotMatch(aboutText, /81场故事|异托邦 V6 完整剧本/);
  assert.match(await page.locator('.about-source').getAttribute('href'), /原著剧本-海外现代线\.txt/);
  await page.keyboard.press('Escape');
  await page.locator('.about-content').waitFor({ state: 'detached' });
  for (const viewport of [{ width: 1366, height: 650 }, { width: 1024, height: 528 }, { width: 662, height: 375 }]) {
    await page.setViewportSize(viewport);
    await page.waitForFunction(() => {
      const controls = document.querySelectorAll('.campaign-selector button, .home-main-menu button, .home-library button, .home-footer button');
      return controls.length > 0 && [...controls].every(button => {
        const { x, y, width, height } = button.getBoundingClientRect();
        const center = document.elementFromPoint(x + width / 2, y + height / 2);
        return x >= 0 && y >= 0 && x + width <= innerWidth + 1 && y + height <= innerHeight + 1 &&
          (button.disabled || button.contains(center));
      });
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '去问', exact: true }).click();
  const identityDialog = page.getByRole('dialog', { name: '林越的来处' });
  await identityDialog.getByRole('heading', { name: '选择林越的形象' }).waitFor();
  const portraitNames = ['portrait-linyue-overseas-light', 'portrait-linyue-modern', 'portrait-linyue-overseas-deep'];
  await page.waitForFunction(names => {
    const portraits = [...document.querySelectorAll('.overseas-opening__portrait img')];
    return portraits.length === names.length && portraits.every((image, index) => image.complete && image.naturalWidth > 0 && image.currentSrc.includes(names[index]));
  }, portraitNames);
  const openingNext = identityDialog.getByRole('button', { name: '选择文化传统' });
  const openingBegin = identityDialog.getByRole('button', { name: '带着这个问题启程' });
  const toneDeep = identityDialog.getByRole('button', { name: '深肤色', exact: true });
  await toneDeep.click();
  await page.setViewportSize({ width: 662, height: 375 });
  await openingNext.click();
  await identityDialog.getByRole('button', { name: /^寻因之学/ }).click();
  await page.keyboard.press('Escape');
  await identityDialog.getByRole('heading', { name: '选择林越的形象' }).waitFor();
  assert.equal(await toneDeep.getAttribute('aria-pressed'), 'true');
  await openingNext.click();
  assert.equal(await identityDialog.getByRole('button', { name: /^寻因之学/ }).getAttribute('aria-pressed'), 'true');
  await page.setViewportSize({ width: 390, height: 844 });
  await openingBegin.click();
  await page.locator('.game-screen').waitFor();
  await page.evaluate(() => document.querySelector('[data-testid="chapter-intro"]')?.click());
  await page.getByTestId('dialogue-text').waitFor();
  await page.waitForFunction(() => document.querySelector('.scene-image--current')?.getAttribute('data-art') === 'modern-street-arrival-r3');
  assert.equal(await page.locator('.scene-image--previous:visible').count(), 0, 'portrait entry does not expose the previous scene below the street crop');
  await page.locator('.game-location').click();
  const routeMemory = await page.locator('.route-memory').innerText();
  assert.match(routeMemory, /回到现代线/);
  assert.doesNotMatch(routeMemory, /卜骨/);
  await page.keyboard.press('Escape');
  await page.locator('.route-memory').waitFor({ state: 'detached' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(300);
  assert.match(await page.locator('.game-location').innerText(), /现代卷/);
  await page.keyboard.press('s');
  await page.getByRole('button', { name: /空白书签/ }).first().click();
  await page.waitForFunction(() => {
    const state = JSON.parse(localStorage.getItem('heterotopia.v1.overseas.autosave') || 'null');
    const profile = JSON.parse(localStorage.getItem('heterotopia.v1.overseas.profile') || 'null');
    return state?.campaign === 'overseas' && state?.sceneId === 'modern-o-0-1' && state.overseasIdentity?.tone === 'deep' && state.overseasIdentity?.tradition === '2' && profile?.campaign === 'overseas';
  });
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  const jade = page.getByRole('button', { name: '细看何字玉扣', exact: true });
  assert.equal(await jade.count(), 0);
  const stall = page.locator('.scene-image--current[data-art="cg-modern-word-stall-r3"]');
  let checkedLandscape = false;
  for (let i = 0; i < 20 && !await jade.isVisible(); i++) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(195);
    if (!checkedLandscape && await stall.isVisible()) {
      await page.setViewportSize({ width: 662, height: 375 });
      await page.waitForFunction(() => {
        const art = document.querySelector('.scene-image--current[data-art="cg-modern-word-stall-r3"]');
        const box = art?.getBoundingClientRect();
        const text = document.querySelector('.dialogue-text')?.getBoundingClientRect();
        return box && text && box.left >= text.right - 1 && box.right <= innerWidth &&
          getComputedStyle(art).backgroundSize === 'contain' && /cg-modern-word-stall-r3-overseas-deep\.(?:png|webp|avif)/.test(getComputedStyle(art).backgroundImage);
      });
      await page.setViewportSize({ width: 390, height: 844 });
      checkedLandscape = true;
    }
  }
  assert.ok(checkedLandscape, 'the opening encounter uses a full composition in short landscape');
  await jade.waitFor();
  assert.ok((await jade.boundingBox()).height >= 44);
  await jade.focus();
  await page.keyboard.press('Enter');
  const study = page.locator('[data-relic-study="question-jade"]');
  await study.getByRole('heading', { name: '何字玉扣' }).waitFor();
  await study.locator('img').evaluate(image => image.decode());
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  assert.match(await page.getByTestId('dialogue-text').getAttribute('aria-label'), /顺手拿起/);
  const savedBeat = await page.evaluate(() => JSON.parse(localStorage.getItem('heterotopia.v1.overseas.autosave')).beatId);
  assert.equal(savedBeat, 'modern-o-0-1:18:0');
  await page.getByRole('button', { name: '打开菜单', exact: true }).click();
  await page.locator('.pause-grid button').filter({ hasText: '绘卷' }).click();
  await page.getByRole('tab', { name: /留影/ }).click();
  const stallCard = page.getByRole('button', { name: /问字，不问命/ });
  await stallCard.locator('img').evaluate(image => image.decode());
  assert.match(await stallCard.locator('img').evaluate(image => image.currentSrc), /cg-modern-word-stall-r3-overseas-deep-thumb\.\w+$/);
  await stallCard.click();
  await page.locator('.gallery-full').evaluate(image => image.decode());
  assert.match(await page.locator('.gallery-full').evaluate(image => image.currentSrc), /cg-modern-word-stall-r3-overseas-deep\.\w+$/);
  await page.keyboard.press('Escape');
  await page.locator('.gallery-content').waitFor();
  await page.keyboard.press('Escape');
  await page.locator('.pause-content').waitFor();
  await page.getByRole('button', { name: '听水集', exact: true }).click();
  const track = page.getByRole('button', { name: '试听《异乡街角》', exact: true });
  const songRequest = page.waitForResponse(response => response.url().endsWith('/audio/music-modern-street.mp3'));
  await track.click();
  assert.ok((await songRequest).ok());
  await page.getByRole('button', { name: '暂停试听', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: '试听《何的回声》', exact: true }).count(), 0);
  await page.evaluate(() => { localStorage.setItem('heterotopia.v1.campaign', JSON.stringify('original')); location.reload(); });
  await page.waitForLoadState('domcontentloaded');
  await page.getByRole('button', { name: /沈辞.*原篇/ }).waitFor();
  const separated = await page.evaluate(() => ({ modern: JSON.parse(localStorage.getItem('heterotopia.v1.overseas.autosave') || 'null'), original: JSON.parse(localStorage.getItem('heterotopia.v1.autosave') || 'null') }));
  assert.equal(separated.modern?.campaign, 'overseas');
  assert.deepEqual(separated.modern?.overseasIdentity, { tone: 'deep', tradition: '2' });
  assert.equal(separated.original, null);
  // Import through the real settings control: no storage injection for this old save.
  await page.getByRole('button', { name: /林越.*现代新卷/ }).click();
  await page.getByRole('button', { name: '阅读设置', exact: true }).click();
  await loadStory('overseas');
  const legacyProfile = newProfile('overseas');
  const legacyState = { ...enterScene(newGame(legacyProfile), legacyProfile, 'modern-o-4-1'), beatId: 'modern-o-4-1:7:0', inventory: ['map', 'questionJade'] };
  const slot = { version: 1, savedAt: '2026-11-23T14:00:00Z', state: legacyState };
  const legacyFile = { format: 'heterotopia-save', version: 1, profile: legacyProfile, state: legacyState, slots: [slot, null, null, null, null, null] };
  await page.locator('input[type="file"]').setInputFiles({ name: 'legacy-modern.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(legacyFile)) });
  await page.waitForFunction(() => {
    const state = JSON.parse(localStorage.getItem('heterotopia.v1.overseas.autosave') || 'null');
    const slots = JSON.parse(localStorage.getItem('heterotopia.v1.overseas.slots') || 'null');
    return state?.beatId === 'modern-o-4-1:7:0' && state.inventory.join(',') === 'questionJade' && slots?.[0]?.state.inventory.join(',') === 'questionJade';
  });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^续梦/ }).click();
  const intro = page.getByTestId('chapter-intro');
  if (await intro.isVisible()) await intro.click();
  await page.getByTestId('dialogue-text').waitFor();
  assert.match(await page.getByTestId('dialogue-text').innerText(), /玉扣上的“何”字，刻痕还在/);
  // Entry cooldown protects a short landing beat against fast double-taps, and restart confirmation protects active progress.
  await page.getByRole('button', { name: '打开菜单', exact: true }).click();
  await page.getByRole('button', { name: /^回到标题/ }).click();
  await page.getByRole('button', { name: /再点一次/ }).click();
  const restartBtn = page.locator('.start-button');
  await restartBtn.click();
  assert.match(await restartBtn.innerText(), /再点一次，重走这一程/);
  assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem('heterotopia.v1.overseas.autosave'))).beatId, 'modern-o-4-1:7:0');
  await restartBtn.click();
  await openingNext.click();
  await identityDialog.getByRole('button', { name: '关闭', exact: true }).click();
  await identityDialog.waitFor({ state: 'detached' });
  assert.deepEqual(JSON.parse(await page.evaluate(() => localStorage.getItem('heterotopia.v1.overseas.autosave'))), { ...legacyState, inventory: ['questionJade'] });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ legacyFileImportAndResume: 'ok', modernEntry: 'ok', campaignAboutAndSource: 'ok', openingArtwork: 'ok', openingChoicesAndCancel: 'ok', jadeStudy: 'ok', identityGallery: 'ok', modernSoundtrack: 'ok', modernRouteMemory: 'ok', scopedAutosave: 'ok', originalSaveIsolation: 'ok', browserErrors: errors }, null, 2));
} finally { await context.close(); await browser.close(); }
