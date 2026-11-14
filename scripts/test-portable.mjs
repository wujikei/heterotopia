import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { advance, choose, completeEnding, continueEnding, currentBeat, newGame, newProfile, recordProgress } from '../src/engine.ts';
import { BACKGROUNDS, CHARACTERS } from '../src/data/world.ts';
import { loadStory } from '../src/story.ts';
import { CGS, cgForBeat } from '../src/data/cgs.ts';
import { AVAILABLE, portraitNameFor } from '../src/data/expressions.ts';
import { ACTOR_VARIANTS, actorPortraitName } from '../src/data/actorVariants.ts';
import { AVAILABLE_EXTRAS } from '../src/data/extras.ts';
import { portraitName } from '../src/assets.ts';
import { RELIC_ART } from '../src/data/relics.ts';

await loadStory();

// Isolated, disposable browser contexts and synthetic test journeys only.
// This never opens or changes the user's browser profile or real saves.
const gameUrl = new URL('../异托邦.html', import.meta.url).href;
const output = new URL('../artifacts/', import.meta.url);
const artifact = name => fileURLToPath(new URL(name, output));
await mkdir(output, { recursive: true });
const errors = [];
const browser = await chromium.launch({ headless: true });
const contexts = [];
const imageManifest = JSON.parse(await readFile(new URL('../src/data/art-manifest.json', import.meta.url), 'utf8'));

function walk(until, selections, state = newGame(newProfile()), profile = newProfile()) {
  for (let step = 0; step < 3000; step++) {
    profile = recordProgress(state, profile);
    const beat = currentBeat(state, profile);
    if (beat.kind === 'ending') profile = completeEnding(state, profile);
    if (until(state, beat)) return { state, profile };
    assert.notEqual(beat.kind, 'ending', 'Test journey ended before its destination');
    state = beat.kind === 'choice' ? choose(state, profile, selections[state.sceneId]) : advance(state, profile);
  }
  throw new Error('Test journey did not reach its destination');
}

async function open(fixture, viewport = { width: 1440, height: 900 }) {
  const context = await browser.newContext({ offline: true, viewport, deviceScaleFactor: 1, acceptDownloads: true });
  contexts.push(context);
  await context.addInitScript(data => {
    // The persisted settings themselves guard the fixture. file:// session
    // storage is browser-dependent and must not reset a real reload assertion.
    if (localStorage.getItem('heterotopia.v1.settings')) return;
    localStorage.setItem('heterotopia.v1.settings', JSON.stringify({ textSpeed: 0, reducedMotion: true, muted: true, showSprites: true }));
    if (data) {
      localStorage.setItem('heterotopia.v1.profile', JSON.stringify(data.profile));
      localStorage.setItem('heterotopia.v1.autosave', JSON.stringify(data.state));
    }
  }, fixture);
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => errors.push(`${request.url().slice(0, 160)}: ${request.failure()?.errorText}`));
  page.on('request', request => {
    if (/^https?:/.test(request.url())) errors.push(`Unexpected network dependency: ${request.url()}`);
  });
  await page.goto(gameUrl);
  await page.evaluate(() => document.fonts.ready);
  if (fixture) await page.getByRole('button', { name: /^续梦/ }).click();
  const beat = fixture ? currentBeat(fixture.state, fixture.profile) : null;
  const background = beat ? cgForBeat(beat, fixture.state.sceneId)?.file || beat.background : 'hero';
  await page.waitForFunction(name => {
    const stage = document.querySelector('.scene-image--current');
    const mobile = matchMedia('(max-aspect-ratio: 3/4)').matches ? globalThis.__HETEROTOPIA_ASSETS__[`${name}-m`] : undefined;
    const assets = globalThis.__HETEROTOPIA_ORIGINALS__?.[name] ?? mobile ?? globalThis.__HETEROTOPIA_ASSETS__[name];
    return stage?.style.backgroundImage.includes(assets)
      && Number(getComputedStyle(stage).opacity) > 0.99;
  }, background);
  await page.evaluate(() => Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {}))));
  return page;
}

try {
  const page = await open();
  await page.getByRole('heading', { name: '异托邦' }).waitFor();
  const expected = [
    ...RELIC_ART,
    ...Object.keys(BACKGROUNDS).flatMap(name => [name, `${name}-thumb`]),
    ...CHARACTERS.map(c => `portrait-${c.key}${c.key === 'xua' ? '-v3' : c.key === 'tu' ? '-v2' : ''}`),
    ...CHARACTERS.map(c => `portrait-${c.key}-face`),
    ...Object.entries(AVAILABLE).flatMap(([key, states]) => states.map(state => portraitNameFor(key, state))),
    ...Object.entries(ACTOR_VARIANTS).flatMap(([key, variants]) => Object.entries(variants).flatMap(([variant, states]) => states.map(expression => actorPortraitName({ character: { key }, variant, expression })))),
    ...[...AVAILABLE_EXTRAS].map(portraitName),
    ...CGS.filter(cg => cg.file).flatMap(cg => [cg.file, ...(cg.thumbnail ? [cg.thumbnail] : [])]),
    ...imageManifest.mobile.filter(name => name.startsWith('cg-')).map(name => `${name}-m`),
  ];
  const integrity = await page.evaluate(async expectedNames => {
    const assets = globalThis.__HETEROTOPIA_ASSETS__;
    const missing = expectedNames.filter(name => !assets?.[name]?.startsWith('data:image/'));
    const broken = [];
    for (const [name, src] of Object.entries(assets ?? {})) {
      const img = new Image(); img.src = src;
      try { await img.decode(); } catch { broken.push(name); }
    }
    await document.fonts.load('400 22px StorySerif', '异托邦，魂兮归来。');
    await document.fonts.load('400 22px StorySerif', '丁');
    await document.fonts.load('600 22px StorySerif', '启程');
    await document.fonts.load('600 22px StorySerif', '循着水声，回家。');
    await document.fonts.load('400 22px StoryHand', '水声还在，慢慢说。');
    await Promise.all([...document.fonts].map(font => font.load()));
    return { missing, broken, imageAssets: Object.keys(assets ?? {}).length, fonts: [...document.fonts].map(font => ({ family: font.family, status: font.status })) };
  }, expected);
  assert.deepEqual(integrity.missing, []);
  assert.deepEqual(integrity.broken, []);
  assert.equal(integrity.fonts.length, 8);
  assert.ok(integrity.fonts.some(font => font.family === 'StoryHand'));
  assert.ok(integrity.fonts.every(font => font.status === 'loaded'));
  for (const [sceneId, beatId, portrait] of [
    ['0-1', '0-1:15:0', 'portrait-shen-home-surprised'],
    ['B-2', 'B-2:12:2', 'portrait-mi-palm'],
  ]) {
    const state = { ...newGame(newProfile()), sceneId, beatId };
    const variantPage = await open({ state, profile: newProfile() }, { width: 390, height: 844 });
    await variantPage.waitForFunction(name => {
      const actor = document.querySelector(`.actor--active[data-portrait="${name}"]`);
      const image = actor?.querySelector('.actor-portrait:not(.actor-portrait--outgoing)');
      return image?.complete && image.currentSrc === globalThis.__HETEROTOPIA_ASSETS__[name];
    }, portrait);
    await variantPage.screenshot({ path: artifact(`${portrait}-offline.png`) });
    await variantPage.context().close();
  }
  const snowState = { ...newGame(newProfile()), sceneId: 'B-12-2', beatId: 'B-12-2:3:1' };
  const mobileCGPage = await open({ state: snowState, profile: newProfile() }, { width: 390, height: 844 });
  assert.equal(await mobileCGPage.locator('.scene-image--current').evaluate(stage => stage.style.backgroundImage.includes(globalThis.__HETEROTOPIA_ASSETS__['cg-s06-snow-hands-m'])), true);
  await mobileCGPage.setViewportSize({ width: 844, height: 390 });
  await mobileCGPage.waitForFunction(() => document.querySelector('.scene-image--current')?.style.backgroundImage.includes(globalThis.__HETEROTOPIA_ASSETS__['cg-s06-snow-hands']));
  await mobileCGPage.setViewportSize({ width: 390, height: 844 });
  await mobileCGPage.waitForFunction(() => document.querySelector('.scene-image--current')?.style.backgroundImage.includes(globalThis.__HETEROTOPIA_ASSETS__['cg-s06-snow-hands-m']));
  await mobileCGPage.screenshot({ path: artifact('art-direction-1-offline-mobile.png') });
  const originalIntegrity = await page.evaluate(async expectedNames => {
    const originals = globalThis.__HETEROTOPIA_ORIGINALS__ ?? {};
    const missingOriginals = expectedNames.filter(name => !originals[name]?.startsWith('data:image/'));
    const brokenOriginals = [];
    for (const name of expectedNames) {
      const image = new Image(); image.src = originals[name] ?? '';
      try { await image.decode(); } catch { brokenOriginals.push(name); }
    }
    return { missingOriginals, brokenOriginals, originalAssets: Object.keys(originals).length };
  }, Object.keys(imageManifest.originals ?? {}));
  assert.deepEqual(originalIntegrity.missingOriginals, []);
  assert.deepEqual(originalIntegrity.brokenOriginals, []);
  // Both quality modes must remain functional with networking disabled,
  // including the stored setting after reopening the single HTML file.
  await page.getByRole('button', { name: '阅读设置', exact: true }).click();
  const quality = page.getByRole('switch', { name: '轻量模式', exact: true });
  assert.equal(await quality.getAttribute('aria-checked'), 'false');
  await quality.click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('heterotopia.v1.settings') ?? '{}').lightweight === true);
  await page.waitForFunction(() => document.querySelector('.scene-image--current')?.style.backgroundImage.includes(globalThis.__HETEROTOPIA_ASSETS__.hero));
  await page.reload();
  await page.waitForFunction(() => document.querySelector('.scene-image--current')?.style.backgroundImage.includes(globalThis.__HETEROTOPIA_ASSETS__.hero));
  await page.getByRole('button', { name: '阅读设置', exact: true }).click();
  assert.equal(await quality.getAttribute('aria-checked'), 'true');
  await quality.click();
  await page.waitForFunction(() => document.querySelector('.scene-image--current')?.style.backgroundImage.includes(globalThis.__HETEROTOPIA_ORIGINALS__.hero));
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  const expectedAudio = JSON.parse(await readFile(new URL('../public/audio/manifest.json', import.meta.url), 'utf8')).files;
  const audioIntegrity = await page.evaluate(async expectedFiles => {
    const assets = globalThis.__HETEROTOPIA_AUDIO__ ?? {};
    const missing = expectedFiles.filter(item => !assets[item.file]?.startsWith('data:audio/mpeg;base64,')).map(item => item.file);
    const context = new AudioContext();
    const broken = [], decoded = [];
    try {
      for (const item of expectedFiles) {
        try {
          const data = await (await fetch(assets[item.file])).arrayBuffer();
          const buffer = await context.decodeAudioData(data);
          if (Math.abs(buffer.duration - item.seconds) > .1 || buffer.numberOfChannels !== 2) throw new Error('Duration or channels');
          const channel = buffer.getChannelData(0);
          let energy = 0;
          for (let i = 0; i < channel.length; i += 97) energy += channel[i] * channel[i];
          if (!(energy > 0)) throw new Error('Silent or non-finite samples');
          decoded.push(item.file);
        } catch { broken.push(item.file); }
      }
    } finally { await context.close(); }
    return { missingAudio: missing, brokenAudio: broken, audioAssets: decoded.length };
  }, expectedAudio);
  assert.deepEqual(audioIntegrity.missingAudio, []);
  assert.deepEqual(audioIntegrity.brokenAudio, []);
  assert.equal(audioIntegrity.audioAssets, 51);
  await page.getByRole('button', { name: '启程', exact: true }).click();
  await page.locator('.game-screen').waitFor();
  await page.evaluate(() => document.querySelector('[data-testid="chapter-intro"]')?.click());
  await page.getByTestId('dialogue-text').waitFor();
  await page.waitForTimeout(200);
  await page.screenshot({ path: artifact('08-offline-opening.png') });
  assert.equal(await page.locator('.location-name').textContent(), BACKGROUNDS['dream-boat'].subtitle);
  const bookmarked = await page.evaluate(() => JSON.parse(localStorage.getItem('heterotopia.v1.autosave')));
  await page.keyboard.press('s');
  await page.locator('.save-slot-main').first().click();
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await page.getByRole('button', { name: '继续', exact: true }).click();
  await page.keyboard.press('l');
  await page.locator('.save-slot--filled .save-slot-main').first().click();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('heterotopia.v1.autosave')).beatId), bookmarked.beatId);
  await page.reload();
  assert.ok(await page.getByRole('button', { name: /^续梦/ }).isEnabled());
  await page.getByRole('button', { name: '阅读设置', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出旅途', exact: true }).click();
  const download = await downloadPromise;
  const testSave = artifact('synthetic-offline-test-save.json');
  await download.saveAs(testSave);
  const exported = JSON.parse(await readFile(testSave, 'utf8'));
  assert.equal(exported.format, 'heterotopia-save');
  assert.equal(exported.slots[0].state.beatId, bookmarked.beatId);
  const importedPage = await open();
  await importedPage.getByRole('button', { name: '阅读设置', exact: true }).click();
  await importedPage.locator('input[type=file]').setInputFiles(testSave);
  await importedPage.getByRole('status').filter({ hasText: '旅途已导入' }).waitFor();
  assert.equal(await importedPage.evaluate(() => JSON.parse(localStorage.getItem('heterotopia.v1.slots'))[0].state.beatId), bookmarked.beatId);

  const xua = walk((state, beat) => state.sceneId === 'B-1' && beat.kind === 'text' && beat.speaker === '媭', { '0-2': 'A', '1-12': 'B' });
  const castPage = await open(xua);
  await castPage.locator('.actor img').evaluate(img => img.decode());
  assert.ok((await castPage.locator('.actor img').getAttribute('src')).startsWith('data:image/webp;'));
  await castPage.screenshot({ path: artifact('09-kunlun-dialogue-desktop.png') });
  await castPage.getByRole('button', { name: '打开菜单' }).click();
  await castPage.getByRole('button', { name: '人物志 记住的名字' }).click();
  for (const name of ['媭', '荼']) {
    await castPage.locator('.character-card').filter({ hasText: name }).click();
    await castPage.locator('.character-detail-portrait').evaluate(img => img.decode());
    await castPage.waitForFunction(() => Number(getComputedStyle(document.querySelector('.character-scroll')).opacity) > 0.99);
    await castPage.screenshot({ path: artifact(name === '媭' ? '10-characters-xua-desktop.png' : '11-characters-tu-desktop.png') });
  }
  await castPage.getByRole('button', { name: '关闭', exact: true }).click();
  await castPage.setViewportSize({ width: 390, height: 844 });
  await castPage.screenshot({ path: artifact('12-kunlun-dialogue-mobile.png') });
  assert.equal(await castPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);

  const fork = walk((state, beat) => state.sceneId === '1-12' && beat.kind === 'choice', { '0-2': 'A' });
  const choicePage = await open(fork);
  assert.equal(await choicePage.locator('.choice-option').count(), 2);
  await choicePage.screenshot({ path: artifact('13-route-choice-desktop.png') });
  await choicePage.setViewportSize({ width: 390, height: 844 });
  await choicePage.screenshot({ path: artifact('14-route-choice-mobile.png') });
  await choicePage.getByRole('button', { name: /往河边去/ }).click();
  assert.equal(await choicePage.evaluate(() => JSON.parse(localStorage.getItem('heterotopia.v1.autosave')).sceneId), 'B-1');

  const royal = walk((_, beat) => beat.kind === 'ending', { '0-2': 'A', '1-12': 'A', 'A-6': 'A', 'A-9': 'B' });
  const kunlun = walk((_, beat) => beat.kind === 'ending', { '1-12': 'B' }, continueEnding(royal.state, royal.profile), royal.profile);
  const endingPage = await open(kunlun);
  await endingPage.getByRole('button', { name: '循光归来' }).waitFor();
  await endingPage.screenshot({ path: artifact('15-ending-desktop.png') });
  await endingPage.getByRole('button', { name: '循光归来' }).click();
  assert.equal(await endingPage.evaluate(() => JSON.parse(localStorage.getItem('heterotopia.v1.autosave')).sceneId), '终-1');

  // Display an actual new study from file:// in airplane mode as well as
  // decoding every embedded drawing in the integrity pass above.
  const relicPage = await open({ ...royal, state: { ...royal.state, sceneId: 'A-6', beatId: 'A-6:25:0' } }, { width: 390, height: 844 });
  await relicPage.locator('.relic-cue').click();
  await relicPage.locator('[data-relic-study="jade-joined"]').waitFor();
  await relicPage.locator('.relic-study-plate img').evaluate(img => img.decode());
  assert.match(await relicPage.locator('.relic-study-plate img').evaluate(img => img.currentSrc), /^data:image\/webp;base64,/);
  await relicPage.screenshot({ path: artifact('16-relic-study-offline-mobile.png') });
  await relicPage.keyboard.press('Escape');
  await relicPage.getByRole('tab', { name: '途中物笺' }).click();
  await relicPage.getByRole('button', { name: '细看十根旧队名简', exact: true }).click();
  await relicPage.locator('.relic-study-plate img').evaluate(img => img.decode());
  await relicPage.screenshot({ path: artifact('17-name-slips-offline-mobile.png') });
  assert.deepEqual(errors, []);
  await writeFile(new URL('portable-results.json', output), JSON.stringify({ testedAt: new Date().toISOString(), mode: 'file:// with networking disabled; isolated synthetic test journeys', ...integrity, ...originalIntegrity, qualitySwitch: true, ...audioIntegrity, errors }, null, 2));
  console.log('Offline checks passed: original and lightweight art, delivered CGs and expressions, both quality modes across reload, fonts and all 51 audio files; saves, import/export, mobile choices, ending and return. No network requests.');
} catch (error) {
  const diagnostics = await Promise.all(contexts.flatMap(context => context.pages()).map(async page => {
    try {
      return await page.evaluate(() => ({ url: location.href, settings: localStorage.getItem('heterotopia.v1.settings'),
        stage: [...document.querySelectorAll('.scene-image')].map(stage => ({ art: stage.getAttribute('data-art'),
          current: stage.classList.contains('scene-image--current'),
          lightweight: stage.style.backgroundImage.includes(globalThis.__HETEROTOPIA_ASSETS__?.hero),
          original: stage.style.backgroundImage.includes(globalThis.__HETEROTOPIA_ORIGINALS__?.hero) })) }));
    } catch { return { url: page.url(), closed: true }; }
  }));
  await writeFile(new URL('portable-results.json', output), JSON.stringify({ testedAt: new Date().toISOString(), errors, failure: String(error), diagnostics }, null, 2));
  if (errors.length) console.error(errors);
  throw error;
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
}
