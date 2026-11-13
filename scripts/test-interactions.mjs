import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';
import { advance, compileScene, currentBeat, enterScene, newGame, newProfile } from '../src/engine.ts';

const base = process.env.VN_TEST_URL || 'http://127.0.0.1:5173';
const name = process.env.VN_TEST_BROWSER || 'chromium';
const browserType = { chromium, firefox, webkit }[name];
if (!browserType) throw new Error(`Unsupported browser: ${name}`);
const output = new URL(`../artifacts/ui-fix-1/${name}/`, import.meta.url);
await mkdir(output, { recursive: true });
const browser = await browserType.launch({ headless: true });
const results = [], errors = [];
const screenshot = file => fileURLToPath(new URL(file, output));
const stored = page => page.evaluate(() => JSON.parse(localStorage.getItem('heterotopia.v1.autosave')));
const bookmarks = page => page.evaluate(() => JSON.parse(localStorage.getItem('heterotopia.v1.slots')));
const waitBeat = (page, id) => page.waitForFunction(id => JSON.parse(localStorage.getItem('heterotopia.v1.autosave'))?.beatId === id, id);
const resize = async (page, width, height) => {
  await page.setViewportSize({ width, height });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
};

function fixture(sceneId = '0-1', offset = 3, atChoice = false) {
  const profile = newProfile();
  let state = enterScene(newGame(profile), profile, sceneId, atChoice);
  for (let i = 0; i < offset; i++) state = advance(state, profile);
  const beats = compileScene(sceneId, profile, state);
  return { state, profile: { ...profile, visited: [sceneId], read: beats.map(beat => beat.id), art: [currentBeat(state, profile).background], met: ['shen', 'tang'] } };
}

async function check(label, run, options = {}) {
  const data = { ...fixture(), ...options };
  const context = await browser.newContext({ viewport: data.viewport ?? { width: 1280, height: 800 } });
  await context.addInitScript(data => {
    if (sessionStorage.getItem('synthetic-interaction-test')) return;
    localStorage.setItem('heterotopia.v1.settings', JSON.stringify({ textSpeed: 0, reducedMotion: true, muted: true, autoDelay: 10, ...data.settings }));
    if (data.state) {
      localStorage.setItem('heterotopia.v1.autosave', JSON.stringify(data.state));
      localStorage.setItem('heterotopia.v1.profile', JSON.stringify(data.profile));
    }
    if (data.slots) localStorage.setItem('heterotopia.v1.slots', JSON.stringify(data.slots));
    if (data.seen !== false) localStorage.setItem('heterotopia.v1.readingHint', 'true');
    sessionStorage.setItem('synthetic-interaction-test', 'true');
  }, data);
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(`${label}: ${error.message}`));
  page.on('response', response => { if (response.status() >= 400 && !response.url().includes('favicon.ico')) errors.push(`${response.status()} ${response.url()}`); });
  try {
    await page.goto(base);
    await page.evaluate(() => document.fonts.ready);
    if (data.state) await page.getByRole('button', { name: /^续梦/ }).click();
    const background = data.state ? currentBeat(data.state, data.profile).background : 'hero';
    await page.waitForFunction(background => document.querySelector('.scene-image--current')?.style.backgroundImage.includes(`/art/${background}.webp`), background);
    await run(page, data);
    results.push({ label, passed: true });
    console.log(`PASS ${label}`);
  } catch (error) {
    const file = `failure-${results.length + 1}.png`;
    await page.screenshot({ path: screenshot(file), fullPage: true }).catch(() => {});
    results.push({ label, passed: false, error: String(error), screenshot: file });
    console.error(`FAIL ${label}: ${error}`);
  } finally { await context.close(); }
}

try {
  await check('Escape returns through nested pages; focus stays in the modal', async page => {
    await page.getByRole('button', { name: '打开菜单' }).click();
    await page.getByRole('button', { name: '行迹 走过的水路' }).click();
    await page.evaluate(() => document.activeElement.blur());
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog', { name: '梦间小憩' }).count(), 1);
    await page.getByRole('button', { name: '人物志 记住的名字' }).click();
    await page.getByRole('button', { name: '返回小憩', exact: true }).click();
    assert.equal(await page.getByRole('dialog', { name: '梦间小憩' }).count(), 1);
    await page.getByRole('button', { name: '阅读设置', exact: true }).click();
    await page.getByRole('button', { name: '听水集 · 原声重听' }).click();
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog', { name: '听风与读字' }).count(), 1);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /^回到标题/ }).focus();
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), '关闭');
    await page.keyboard.press('Shift+Tab');
    assert.ok(await page.getByRole('button', { name: /^回到标题/ }).evaluate(element => element === document.activeElement));
    await page.screenshot({ path: screenshot('01-menu.png'), fullPage: true });
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(), 0);
  });

  await check('Mouse controls do not steal Space or Enter from reading', async (page, data) => {
    await page.getByRole('button', { name: '回看', exact: true }).click();
    await page.keyboard.press('Escape');
    await page.keyboard.press('Space');
    const next = advance(data.state, data.profile);
    await waitBeat(page, next.beatId);
    assert.equal(await page.getByRole('dialog').count(), 0);
    await page.getByRole('button', { name: '自动', exact: true }).click();
    await page.waitForTimeout(200);
    await page.keyboard.press('Enter');
    await waitBeat(page, advance(next, data.profile).beatId);
    assert.equal(await page.getByRole('button', { name: '自动', exact: true }).getAttribute('aria-pressed'), 'true');
    await page.keyboard.press('a');
    assert.equal(await page.getByRole('button', { name: '自动', exact: true }).getAttribute('aria-pressed'), 'false');
  });

  const save = { version: 1, savedAt: '2026-11-13T04:00:00.000Z', state: fixture().state };
  await check('Deleting a bookmark requires a second click and confirmation resets', async page => {
    await page.keyboard.press('s');
    await page.getByRole('button', { name: '移除书签 1', exact: true }).click();
    assert.ok((await bookmarks(page))[0]);
    assert.equal(await page.getByRole('button', { name: '确认移除书签 1', exact: true }).count(), 1);
    await page.screenshot({ path: screenshot('02-bookmark-confirm.png'), fullPage: true });
    await page.locator('[data-slot="1"] .save-slot-main').click();
    assert.equal(await page.getByRole('button', { name: '确认移除书签 1', exact: true }).count(), 0);
    await page.getByRole('button', { name: '移除书签 1', exact: true }).click();
    await page.keyboard.press('Escape');
    await page.keyboard.press('s');
    assert.equal(await page.getByRole('button', { name: '确认移除书签 1', exact: true }).count(), 0);
    await page.getByRole('button', { name: '移除书签 1', exact: true }).click();
    await page.getByRole('button', { name: '确认移除书签 1', exact: true }).click();
    assert.equal((await bookmarks(page))[0], null);
    assert.deepEqual((await bookmarks(page))[1], save);
    assert.equal(await page.locator('[role="dialog"] .toast--inline').count(), 1);
    const toast = await page.locator('.toast--inline').boundingBox();
    const grid = await page.locator('.save-grid').boundingBox();
    assert.ok(toast.y + toast.height <= grid.y + 1, 'Save notification must reserve space above the bookmarks');
  }, { slots: [save, save, null, null, null, null] });

  await check('Wheel and PageUp open history; re-reading preserves choices and items', async (page, data) => {
    await page.mouse.move(600, 300);
    await page.mouse.wheel(0, -160);
    await page.getByRole('dialog', { name: '方才的话' }).waitFor();
    await page.screenshot({ path: screenshot('03-backlog.png'), fullPage: true });
    await page.getByRole('button', { name: `重读：${data.state.history[1].text}`, exact: true }).click();
    await waitBeat(page, data.state.history[1].id);
    const reread = await stored(page);
    assert.deepEqual(reread.inventory, data.state.inventory);
    assert.deepEqual(reread.choices, data.state.choices);
    assert.equal(reread.cycle, data.state.cycle);
    assert.equal(reread.history.length, 1);
    await page.waitForTimeout(200);
    await page.keyboard.press('Space');
    await page.keyboard.press('PageUp');
    assert.equal(await page.getByRole('dialog', { name: '方才的话' }).count(), 1);
  });

  await check('Three rapid clicks reveal a sentence or advance at most one page', async (page, data) => {
    const bounds = await page.locator('.dialogue-advance').boundingBox();
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    const triple = async () => { for (let i = 0; i < 3; i++) { await page.mouse.down(); await page.mouse.up(); } };
    await triple();
    assert.equal((await stored(page)).beatId, data.state.beatId);
    assert.equal(await page.locator('.dialogue-text > span').first().innerText(), currentBeat(data.state, data.profile).text);
    await page.waitForTimeout(220);
    await triple();
    await waitBeat(page, advance(data.state, data.profile).beatId);
  }, { settings: { textSpeed: 2 } });

  await check('The chapter card pauses typing and names the opening background', async page => {
    // Hold the story clock while Playwright waits for layout. Software WebKit
    // may otherwise spend the entire 2.3s chapter card on automation round trips.
    await page.clock.install({ time: new Date('2026-11-13T04:00:00Z') });
    await page.clock.pauseAt(new Date('2026-11-13T04:00:01Z'));
    await page.getByRole('button', { name: '启程', exact: true }).click({ force: true });
    await page.getByTestId('chapter-intro').waitFor();
    assert.match(await page.locator('.intro-subtitle').innerText(), /夜梦|船底/);
    await page.clock.runFor(750);
    assert.equal(await page.locator('.dialogue-text > span').first().innerText(), '');
    await page.getByTestId('chapter-intro').click({ force: true });
    const initial = (await page.locator('.dialogue-text > span').first().innerText()).length;
    assert.ok(initial <= 1, `Typing started behind the intro: ${initial}`);
    await page.clock.runFor(600);
    await page.waitForFunction(() => document.querySelector('.dialogue-text > span')?.textContent.length > 0);
    await page.screenshot({ path: screenshot('04-opening-typing.png'), fullPage: true });
  }, { state: null, settings: { textSpeed: 2, reducedMotion: false } });

  await check('Skip renders whole sentences and releasing Ctrl stops held skip', async page => {
    await page.keyboard.down('Control');
    await page.waitForTimeout(240);
    assert.equal(await page.getByRole('button', { name: '快进', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.ok(await page.locator('.dialogue-text').evaluate(element => element.firstElementChild.textContent === element.getAttribute('aria-label')));
    await page.keyboard.up('Control');
    const released = (await stored(page)).beatId;
    await page.waitForTimeout(250);
    assert.equal((await stored(page)).beatId, released);
    assert.equal(await page.getByRole('button', { name: '快进', exact: true }).getAttribute('aria-pressed'), 'false');
    await page.getByRole('button', { name: '快进', exact: true }).click();
    await page.waitForTimeout(140);
    assert.ok(await page.locator('.dialogue-text').evaluate(element => element.firstElementChild.textContent === element.getAttribute('aria-label')));
    await page.screenshot({ path: screenshot('05-skip.png'), fullPage: true });
    await page.waitForFunction(() => document.querySelector('.reading-controls button[title*="Ctrl"]')?.getAttribute('aria-pressed') === 'false');
    assert.equal((await stored(page)).sceneId, '0-2', 'Skip stops at the first previously unread scene');
  }, { settings: { textSpeed: 2 } });

  await check('Choices show hover feedback and accept number keys', async page => {
    const choice = page.locator('.choice-option').first();
    await page.mouse.move(5, 5);
    const before = await choice.boundingBox();
    await page.screenshot({ path: screenshot('06-choice-rest.png'), fullPage: true });
    await choice.hover();
    await page.waitForTimeout(350);
    const after = await choice.boundingBox();
    assert.ok(after.y <= before.y - 3, 'The hovered paper slip should visibly rise');
    assert.ok(Number(await choice.locator('.choice-stamp').evaluate(element => getComputedStyle(element).opacity)) > 0);
    await page.screenshot({ path: screenshot('07-choice-hover.png'), fullPage: true });
    await page.keyboard.press('2');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('heterotopia.v1.autosave'))?.choices.breakfast === 'B');
  }, fixture('0-2', 0, true));

  await check('Number keys respect locked choices', async page => {
    const before = await stored(page);
    await page.keyboard.press('4');
    assert.deepEqual(await stored(page), before);
    await page.keyboard.press('1');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('heterotopia.v1.autosave'))?.sceneId === 'A-E1-1');
  }, fixture('A-9', 0, true));

  await check('Opening a menu cancels an unfinished choice stamp', async page => {
    const before = await stored(page);
    await page.keyboard.press('1');
    await page.keyboard.press('s');
    await page.getByRole('dialog', { name: '一枚书签' }).waitFor();
    await page.waitForTimeout(750);
    assert.deepEqual(await stored(page), before);
    await page.keyboard.press('Escape');
    await page.keyboard.press('2');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('heterotopia.v1.autosave'))?.choices.breakfast === 'B');
  }, { ...fixture('0-2', 0, true), settings: { reducedMotion: false } });

  await check('Phone targets, hidden mode and narrow layouts stay usable', async page => {
    for (const [width, height] of [[320, 568], [390, 844], [820, 1180], [844, 390]]) {
      await resize(page, width, height);
      const layout = await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('.game-header .header-tools button')].map(button => {
          const rect = button.getBoundingClientRect(); return { width: rect.width, height: rect.height, right: rect.right };
        });
        const bounds = document.querySelector('.dialogue').getBoundingClientRect();
        return { buttons, overflow: document.documentElement.scrollWidth > innerWidth, top: bounds.top, bottom: bounds.bottom };
      });
      assert.ok(!layout.overflow && layout.top >= 0 && layout.bottom <= height + 1, JSON.stringify(layout));
      assert.ok(layout.buttons.every(button => button.width >= 44 && button.height >= 44 && button.right <= width), JSON.stringify(layout));
      assert.equal(await page.locator('.scene-margin-label, .chapter-current').count(), 0);
      assert.doesNotMatch(await page.locator('.game-header').innerText(), /\b[0-9AB]-[\w-]+\b/);
      await page.screenshot({ path: screenshot(`08-story-${width}x${height}.png`), fullPage: true });
      await page.getByRole('button', { name: '更多', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('.reading-more').getBoundingClientRect().width >= 180);
      const tools = await page.locator('.reading-controls button').evaluateAll(buttons => buttons.map(button => {
        const r = button.getBoundingClientRect(); return { x: r.x, right: r.right, height: r.height, bottom: r.bottom, hit: button.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)) };
      }));
      assert.ok(tools.every(r => r.x >= 0 && r.right <= width && r.bottom <= height && r.height >= 44 && r.hit), JSON.stringify({ width, height, tools }));
      await page.screenshot({ path: screenshot(`08-tools-${width}x${height}.png`), fullPage: true });
      await page.getByRole('button', { name: '收起', exact: true }).click();
    }
    await page.keyboard.press('h');
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.game-header')).opacity === '0');
    await page.keyboard.press('h');
    await page.reload();
    for (const [width, height] of [[320, 568], [390, 844], [844, 390]]) {
      await resize(page, width, height);
      const targets = await page.locator('.home-library button, .headphone-note, .about-link, .home-header .icon-button').evaluateAll(buttons => buttons.map(button => {
        const r = button.getBoundingClientRect(); const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return { width: r.width, height: r.height, x: r.x, right: r.right, bottom: r.bottom, hit: button.contains(hit) };
      }));
      assert.ok(targets.every(r => r.width >= 44 && r.height >= 44 && r.x >= 0 && r.right <= width && r.bottom <= height && r.hit), JSON.stringify({ width, height, targets }));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: screenshot(`09-home-${width}x${height}.png`), fullPage: true });
    }
  });

  await check('First-play guidance dismisses persistently and screen readers receive full lines', async page => {
    await page.getByRole('complementary', { name: '阅读提示' }).waitFor();
    await page.screenshot({ path: screenshot('10-reading-hint.png'), fullPage: true });
    await page.getByRole('button', { name: '知道了', exact: true }).click();
    assert.equal(await page.evaluate(() => localStorage.getItem('heterotopia.v1.readingHint')), 'true');
    const live = page.locator('.sr-only[aria-live="polite"]');
    assert.ok((await live.innerText()).length > 0);
    assert.equal((await live.boundingBox()).width, 1);
    await page.reload();
    await page.getByRole('button', { name: /^续梦/ }).click();
    assert.equal(await page.getByRole('complementary', { name: '阅读提示' }).count(), 0);
  }, { seen: false, viewport: { width: 390, height: 844 } });
} finally {
  await browser.close();
  await writeFile(new URL('results.json', output), JSON.stringify({ testedAt: new Date().toISOString(), browser: name, url: base, results, errors }, null, 2));
}
const failures = results.filter(result => !result.passed);
assert.equal(errors.length, 0, errors.join('\n'));
assert.equal(failures.length, 0, `${failures.length} interaction checks failed; see ${fileURLToPath(output)}`);
console.log(`${name}: ${results.length} interaction checks passed.`);
