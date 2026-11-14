import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';
import { compileScene, loadStory, newGame, newProfile, SCENES } from '../src/engine.ts';

await loadStory();
const browserName = process.argv.includes('--webkit') ? 'webkit' : process.env.VN_TEST_BROWSER || 'chromium';
const browser = await ({ chromium, webkit })[browserName].launch();
const base = process.env.VN_TEST_URL || 'http://127.0.0.1:4179/';
const artifactRoot = new URL('../artifacts/localization/', import.meta.url);
await mkdir(artifactRoot, { recursive: true });
const packs = Object.fromEntries(await Promise.all(['en','ja','de'].map(async language => [language, {
  ui: JSON.parse(await readFile(new URL(`../src/data/locales/${language}/ui.json`, import.meta.url), 'utf8')),
  story: JSON.parse(await readFile(new URL(`../src/data/locales/${language}/story.json`, import.meta.url), 'utf8')),
}])));
const profiles = { ...newProfile(), visited: SCENES.map(scene => scene.id), endings: ['blade','mercy','leave','names','kunlun','home'], oldNames: true };
const playable = new Set();
for (const scene of SCENES) for (const breakfast of ['A','B']) {
  const state = { ...newGame(profiles), sceneId: scene.id, choices: { breakfast }, inventory: ['jadeHead','jadeBody','jadeTail'] };
  for (const beat of compileScene(scene.id, profiles, state)) if (beat.kind === 'text') playable.add(beat.id);
}
const pageId = [...playable].sort((a,b) => {
  const size = id => ['en','ja','de'].reduce((sum, language) => sum + Array.from(packs[language].story[id] ?? '').length, 0);
  return size(b) - size(a);
})[0];
assert.ok(pageId);
const sceneId = pageId.slice(0, pageId.indexOf(':'));
const fixture = { version: 1, sceneId, beatId: pageId, inventory: ['jadeHead','jadeBody','jadeTail'], choices: { breakfast: 'A' }, history: [{ id: '0-1:3:0', sceneId: '0-1', speaker: '', text: '船底下有东西在敲。', kind: 'text' }], cycle: 1 };
const errors = [];

try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 820, height: 1180 }, { width: 1440, height: 900 }]) {
    const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
    try {
      await context.addInitScript(({ state, profile }) => {
        localStorage.setItem('heterotopia.v1.settings', JSON.stringify({ language: 'zh', textSpeed: 0, autoDelay: 4, fontSize: 22, muted: true, reducedMotion: true, showSprites: true, lightweight: true }));
        localStorage.setItem('heterotopia.v1.autosave', JSON.stringify(state));
        localStorage.setItem('heterotopia.v1.profile', JSON.stringify(profile));
        localStorage.setItem('heterotopia.v1.readingHint', 'true');
      }, { state: fixture, profile: profiles });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      page.on('requestfailed', request => errors.push(`${request.url()}: ${request.failure()?.errorText}`));
      page.on('request', request => { if (/^https?:/.test(request.url()) && !request.url().startsWith(base)) errors.push(`Remote dependency: ${request.url()}`); });
      await page.goto(base);
      await page.waitForFunction(() => document.documentElement.lang === 'zh-CN');
      await page.getByRole('button', { name: '阅读设置' }).click();
      const select = page.locator('#reading-language');
      await select.selectOption('en');
      await page.waitForFunction(() => document.documentElement.lang === 'en');
      assert.equal(await select.inputValue(), 'en');
      await page.locator('.modal-close').click();
      await page.locator('.continue-button').click();
      await page.locator('.dialogue-text').waitFor();
      const first = packs.en.story[pageId];
      await page.waitForFunction(value => document.querySelector('.dialogue-text')?.getAttribute('aria-label') === value, first);
      const savedId = await page.evaluate(() => JSON.parse(localStorage.getItem('heterotopia.v1.autosave')).beatId);
      assert.equal(savedId, pageId);
      let actual = await page.locator('.dialogue-text').getAttribute('aria-label');
      assert.equal(actual, first);
      assert.doesNotMatch(actual, /[\p{Script=Han}]/u);
      const firstHistory = packs.en.story['0-1:3:0'];
      await page.locator('.reading-controls button').first().click();
      assert.ok((await page.locator('.history-content').innerText()).includes(firstHistory));
      await page.locator('.modal-close').click();
      const englishLayout = await page.locator('.dialogue').evaluate(element => ({
        client: element.clientHeight, scroll: element.scrollHeight,
        textBottom: element.querySelector('.dialogue-text').getBoundingClientRect().bottom,
        viewport: innerHeight, width: element.scrollWidth, clientWidth: element.clientWidth,
      }));
      assert.ok(englishLayout.clientWidth >= 1 && englishLayout.width <= englishLayout.clientWidth + 2, JSON.stringify(englishLayout));
      if (viewport.width < 600 && englishLayout.scroll > englishLayout.client + 2) {
        assert.ok(englishLayout.client <= englishLayout.viewport + 2);
      }

      for (const language of ['ja','de','zh']) {
        await page.locator('.game-header .header-tools button').last().click();
        await page.locator('.pause-rows .pause-row').nth(2).click();
        await page.locator('#reading-language').selectOption(language);
        await page.waitForFunction(expected => document.documentElement.lang === expected, language === 'ja' ? 'ja' : language === 'de' ? 'de' : 'zh-CN');
        assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('heterotopia.v1.autosave')).beatId), savedId, 'language change must preserve page and route');
        const expected = language === 'zh' ? compileScene(sceneId, profiles, fixture).find(beat => beat.kind === 'text' && beat.id === pageId).text : packs[language].story[pageId];
        await page.waitForFunction(value => document.querySelector('.dialogue-text')?.getAttribute('aria-label') === value, expected);
        actual = await page.locator('.dialogue-text').getAttribute('aria-label');
        assert.equal(actual, expected);
        if (language !== 'ja' && language !== 'zh') assert.doesNotMatch(actual, /[\p{Script=Han}]/u);
        const settingsText = await page.locator('.settings-content').innerText();
        assert.ok(settingsText.includes(language === 'zh' ? '语言' : packs[language].ui['语言']), `${language} settings language label`);
        if (language !== 'zh') {
          const font = await page.evaluate(async lang => {
            const family = lang === 'ja' ? 'StoryJapanese' : 'StoryLatin';
            const sample = lang === 'ja' ? '日本語の水音' : lang === 'de' ? 'äöü ÄÖÜ ß' : 'Heterotopia';
            const loaded = await document.fonts.load(`400 22px ${family}`, sample);
            return { family, loaded: loaded.some(face => face.status === 'loaded'), computed: getComputedStyle(document.querySelector('.dialogue-text')).fontFamily };
          }, language);
          assert.ok(font.loaded && font.computed.includes(font.family), `${language} bundled typeface: ${JSON.stringify(font)}`);
        }
        await page.screenshot({ path: fileURLToPath(new URL(`${browserName}-${viewport.width}-${language}.png`, artifactRoot)), fullPage: false });
        await page.locator('.modal-close').click();
        await page.locator('.reading-controls button').first().click();
        const historyText = await page.locator('.history-content').innerText();
        const expectedHistory = language === 'zh' ? '船底下有东西在敲。' : packs[language].story['0-1:3:0'];
        assert.ok(historyText.includes(expectedHistory), `${language} localized backlog history`);
        if (language !== 'zh') {
          const metrics = await page.locator('.dialogue').evaluate(element => ({ width: element.scrollWidth, client: element.clientWidth, height: element.scrollHeight, clientHeight: element.clientHeight, text: element.querySelector('.dialogue-text').getBoundingClientRect().toJSON(), viewport: innerHeight, viewportWidth: innerWidth }));
          assert.ok(metrics.width <= metrics.client + 2, `${language} horizontal overflow: ${JSON.stringify(metrics)}`);
          assert.ok(metrics.text.left >= -1 && metrics.text.right <= metrics.viewportWidth + 1, `${language} text outside screen: ${JSON.stringify(metrics)}`);
        }
        await page.locator('.modal-close').click();
      }
      await page.reload();
      await page.waitForFunction(() => document.documentElement.lang === 'zh-CN');
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('heterotopia.v1.autosave')).beatId), pageId);
      assert.deepEqual(errors, [], errors.join('\n'));
      console.log(`${browserName} ${viewport.width}x${viewport.height}: settings, all four locales, save continuity, reload and long-page layout passed.`);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
