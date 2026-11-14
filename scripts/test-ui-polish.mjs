import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';
import { advance, compileScene, enterScene, newGame, newProfile, SCENES } from '../src/engine.ts';
import { BACKGROUNDS, CHARACTERS, ENDINGS } from '../src/data/world.ts';
import { EXTRAS } from '../src/data/extras.ts';
import { loadStory } from '../src/story.ts';

await loadStory();
const base = process.env.VN_TEST_URL || 'http://127.0.0.1:4181';
const name = process.env.VN_TEST_BROWSER || 'chromium';
const browser = await { chromium, firefox, webkit }[name].launch();
const output = new URL(`../artifacts/ui-fix-3/${name}/`, import.meta.url);
await mkdir(output, { recursive: true });
const screenshot = file => fileURLToPath(new URL(file, output));
const results = [], errors = [];
const profile = { ...newProfile(), visited: SCENES.map(scene => scene.id), art: Object.keys(BACKGROUNDS), met: CHARACTERS.map(character => character.key), endings: Object.keys(ENDINGS), oldNames: true };
let reading = enterScene(newGame(profile), profile, '0-1');
for (let i = 0; i < 6; i++) reading = advance(reading, profile);
const endings = new Map();
for (const scene of SCENES) {
  const state = enterScene(newGame(profile), profile, scene.id);
  for (const beat of compileScene(scene.id, profile, state)) if (beat.kind === 'ending') endings.set(beat.ending, { ...state, beatId: beat.id });
}
assert.equal(endings.size, 6);

const extraReadIds = new Map(EXTRAS.map(character => {
  const scene = SCENES.find(item => item.blocks.some(block => {
    const speaker = block.tag.split('·')[0];
    return speaker === character.name || (character.key === 'daoist' && speaker === '邋遢道士');
  }));
  const index = scene?.blocks.findIndex(block => {
    const speaker = block.tag.split('·')[0];
    return speaker === character.name || (character.key === 'daoist' && speaker === '邋遢道士');
  });
  assert.ok(scene && index !== undefined && index >= 0, `Missing first spoken line for ${character.key}`);
  return [character.key, `${scene.id}:${index}:0`];
}));

async function open(state = reading, viewport = { width: 1280, height: 800 }, extras = {}) {
  const context = await browser.newContext({ serviceWorkers: 'block', viewport, hasTouch: viewport.width < 760 });
  const activeProfile = extras.profile ?? profile;
  await context.addInitScript(({ state, profile, extras }) => {
    localStorage.setItem('heterotopia.v1.autosave', JSON.stringify(state));
    localStorage.setItem('heterotopia.v1.profile', JSON.stringify(profile));
    localStorage.setItem('heterotopia.v1.settings', JSON.stringify({ textSpeed: 0, reducedMotion: true, muted: true, lightweight: true, ...extras.settings }));
    localStorage.setItem('heterotopia.v1.readingHint', 'true');
    if (extras.slots) localStorage.setItem('heterotopia.v1.slots', JSON.stringify(extras.slots));
  }, { state, profile: activeProfile, extras });
  const page = await context.newPage();
  const failedRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
  await page.goto(base);
  await page.getByRole('button', { name: /^续梦/ }).click();
  try {
    // Use the main frame: Windows WebKit can delay isolated-world selector
    // polling across several short-lived contexts while React is already ready.
    const deadline = Date.now() + 30000;
    while (!await page.evaluate(() => document.querySelector('.app')?.classList.contains('app--play'))) {
      if (Date.now() >= deadline) throw new Error('Reading state did not become ready within 30 seconds');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  catch (error) {
    const state = await page.evaluate(() => ({ app: document.querySelector('.app')?.className, text: document.body.innerText.slice(-900), readingLoad: document.querySelector('.reading-load')?.outerHTML, visibleButtons: [...document.querySelectorAll('button')].filter(button => button.getClientRects().length).map(button => ({ text: button.innerText, disabled: button.disabled })).slice(-10) })).catch(() => ({ app: 'unavailable' }));
    await page.screenshot({ path: screenshot(`open-failure-${name}-${Date.now()}.png`) }).catch(() => {});
    console.error(`OPEN FAILURE ${JSON.stringify({ state, failedRequests })}`);
    throw error;
  }
  await page.evaluate(() => document.fonts.ready);
  return { context, page };
}
async function check(label, action) {
  if (process.env.VN_TEST_FILTER && !new RegExp(process.env.VN_TEST_FILTER).test(label)) return;
  await action(); results.push({ label, passed: true }); console.log(`PASS ${label}`);
}

try {
  await check('All six desktop bookmarks fit; empty cards stay quiet', async () => {
    const saved = { version: 1, savedAt: '2026-11-13T10:00:00Z', state: reading };
    const { context, page } = await open(reading, undefined, { slots: [saved, saved, null, null, null, null] });
    try {
      await page.keyboard.press('s');
      await page.getByRole('dialog', { name: '一枚书签' }).waitFor();
      await page.locator('.save-grid').waitFor();
      const layout = await page.evaluate(() => {
        const content = document.querySelector('.save-content'), modal = document.querySelector('.modal');
        return { scroll: content.scrollHeight - content.clientHeight, bottom: Math.max(...[...document.querySelectorAll('.save-slot')].map(card => card.getBoundingClientRect().bottom)), modalBottom: modal.getBoundingClientRect().bottom, emptyBackground: getComputedStyle(document.querySelector('.save-slot:not(.save-slot--filled) .save-slot-main')).backgroundImage, emptyInk: getComputedStyle(document.querySelector('.save-slot:not(.save-slot--filled) .save-slot-info')).opacity };
      });
      assert.ok(layout.scroll <= 1 && layout.bottom < layout.modalBottom, JSON.stringify(layout));
      assert.equal(layout.emptyBackground, 'none'); assert.ok(Number(layout.emptyInk) <= .5);
      await page.screenshot({ path: screenshot('bookmarks-desktop.png') });
    } finally { await context.close(); }
  });

  await check('Phone character name, identity and first description line are visible', async () => {
    for (const width of [360, 390, 430]) {
      const { context, page } = await open(reading, { width, height: 844 });
      try {
        await page.getByRole('button', { name: '打开菜单' }).click();
        await page.getByRole('button', { name: '人物志 记住的名字' }).click();
        await page.locator('.character-detail-portrait').evaluate(image => image.decode());
        const layout = await page.evaluate(() => {
          const rectangle = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { top: r.top, bottom: r.bottom, height: r.height }; };
          const first = document.querySelector('.character-description').firstChild;
          const range = document.createRange(); range.setStart(first, 0); range.setEnd(first, Math.min(3, first.textContent.length));
          const line = range.getBoundingClientRect();
          return { name: rectangle('.character-biography h3'), identity: rectangle('.character-biography > .eyebrow'), firstLine: { top: line.top, bottom: line.bottom }, portrait: rectangle('.character-portrait-frame'), height: innerHeight, overflow: document.documentElement.scrollWidth > innerWidth };
        });
        assert.ok([layout.name, layout.identity, layout.firstLine].every(r => r.top >= 0 && r.bottom <= layout.height), JSON.stringify(layout));
        assert.ok(layout.portrait.height <= layout.height * .4 && !layout.overflow, JSON.stringify(layout));
        await page.screenshot({ path: screenshot(`characters-${width}.png`) });
      } finally { await context.close(); }
    }
  });

  await check('Extra biographies unlock only after their dialogue is read', async () => {
    const openCharacters = async read => {
      const { context, page } = await open(reading, undefined, { profile: { ...profile, read } });
      await page.getByRole('button', { name: '打开菜单' }).click();
      await page.getByRole('button', { name: '人物志 记住的名字' }).click();
      return { context, page };
    };
    const keys = EXTRAS.map(character => character.key);
    const locked = await openCharacters([]);
    try {
      for (const key of keys) assert.equal(await locked.page.locator(`.character-card[data-character="${key}"]`).isDisabled(), true, key);
      assert.equal(await locked.page.locator('.character-hint span').innerText(), `14 / ${CHARACTERS.length + EXTRAS.length}`);
    } finally { await locked.context.close(); }

    const [first] = EXTRAS;
    const unlocked = await openCharacters([extraReadIds.get(first.key)]);
    try {
      for (const character of EXTRAS) assert.equal(await unlocked.page.locator(`.character-card[data-character="${character.key}"]`).isDisabled(), character.key !== first.key, character.key);
      const card = unlocked.page.locator(`.character-card[data-character="${first.key}"]`);
      await card.click();
      assert.equal(await unlocked.page.locator('.character-biography h3').innerText(), first.name);
      assert.match(await card.locator('img').getAttribute('src'), new RegExp(`portrait-${first.key}-face(?:-m)?\\.(?:avif|webp)$`));
      await unlocked.page.screenshot({ path: screenshot('characters-extras-unlocked.png') });
    } finally { await unlocked.context.close(); }
  });

  await check('Previously read extra biographies unlock directly from a Save-Data title screen', async () => {
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
    const first = EXTRAS[0];
    await context.addInitScript(({ profile, readId }) => {
      localStorage.setItem('heterotopia.v1.profile', JSON.stringify({ ...profile, read: [readId] }));
      localStorage.setItem('heterotopia.v1.settings', JSON.stringify({ textSpeed: 0, reducedMotion: true, muted: true, lightweight: true }));
      Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true } });
    }, { profile, readId: extraReadIds.get(first.key) });
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.route(new RegExp('/assets/story-[^/]+[.]js$'), async route => { await gate; await route.continue().catch(() => {}); });
    try {
      await page.goto(base);
      await page.getByRole('button', { name: '人物志', exact: true }).click();
      const card = page.locator(`.character-card[data-character="${first.key}"]`);
      await card.waitFor();
      assert.equal(await card.isDisabled(), true, 'Biography waits for its authored dialogue metadata');
      release();
      await page.waitForFunction(key => document.querySelector(`.character-card[data-character="${key}"]`)?.disabled === false, first.key);
      await card.click();
      assert.match(await page.locator('.character-biography h3').innerText(), new RegExp(first.name));
      assert.equal(await page.locator('.app--play').count(), 0, 'No story resume is needed');
    } finally { release(); await context.close(); }
  });

  await check('Narration starts at the log edge without a redundant label', async () => {
    const { context, page } = await open();
    try {
      await page.keyboard.press('PageUp');
      await page.getByRole('dialog', { name: '方才的话' }).waitFor();
      await page.locator('.history-entry').first().waitFor();
      const rows = await page.locator('.history-entry--narration').evaluateAll(entries => entries.map(entry => ({ gap: entry.querySelector('.history-copy').getBoundingClientRect().left - document.querySelector('.history-content').getBoundingClientRect().left, label: !!entry.querySelector('.history-speaker') })));
      assert.ok(rows.length && rows.every(row => row.gap <= 24 && !row.label), JSON.stringify(rows));
      const gaps = await page.locator('.history-entry:not(.history-entry--narration)').evaluateAll(entries => entries.map(entry => entry.querySelector('.history-copy').getBoundingClientRect().left - entry.querySelector('.history-speaker').getBoundingClientRect().right));
      assert.ok(gaps.every(gap => gap <= 16));
      await page.screenshot({ path: screenshot('backlog-desktop.png') });
    } finally { await context.close(); }
  });

  await check('Gallery immersion, arrow keys, swipe and layered Escape stay in the book', async () => {
    const { context, page } = await open(reading, { width: 390, height: 844 });
    try {
      await page.getByRole('button', { name: '打开菜单' }).click();
      await page.getByRole('button', { name: '浮生绘卷 沿途的山河' }).click();
      await page.locator('.gallery-card:enabled').first().click();
      await page.getByRole('link', { name: '下载此景' }).waitFor();
      const first = await page.locator('.gallery-viewer').getAttribute('data-gallery-art');
      await page.getByRole('button', { name: '沉浸看图', exact: true }).click();
      await page.waitForFunction(() => {
        const viewer = document.querySelector('.gallery-viewer');
        return viewer.getBoundingClientRect().width === innerWidth && viewer.getBoundingClientRect().height === innerHeight;
      }, null, { timeout: 1500 });
      const clean = await page.evaluate(() => ({ header: getComputedStyle(document.querySelector('.modal-header')).display, back: getComputedStyle(document.querySelector('.gallery-back')).visibility, width: document.querySelector('.gallery-viewer').getBoundingClientRect().width, height: document.querySelector('.gallery-viewer').getBoundingClientRect().height }));
      assert.equal(clean.header, 'none'); assert.equal(clean.back, 'hidden'); assert.equal(clean.width, 390, JSON.stringify(clean)); assert.equal(clean.height, 844, JSON.stringify(clean));
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction(first => document.querySelector('.gallery-viewer').dataset.galleryArt !== first, first);
      await page.screenshot({ path: screenshot('gallery-immersive-phone.png') });
      await page.keyboard.press('ArrowLeft');
      await page.waitForFunction(first => document.querySelector('.gallery-viewer').dataset.galleryArt === first, first);
      await page.mouse.move(300, 360); await page.mouse.down(); await page.mouse.move(120, 370, { steps: 5 }); await page.mouse.up();
      await page.waitForFunction(first => document.querySelector('.gallery-viewer').dataset.galleryArt !== first, first);
      assert.equal(await page.locator('.gallery-viewer--clean').count(), 1, 'A swipe should change the image without toggling immersion');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.gallery-viewer--clean').count(), 0);
      assert.equal(await page.locator('.gallery-viewer').count(), 1);
      await page.keyboard.press('Escape'); await page.locator('.gallery-grid').waitFor();
      await page.getByRole('tab', { name: '留影 · CG', exact: true }).click();
      assert.equal(await page.getByRole('tab', { name: '留影 · CG', exact: true }).getAttribute('aria-selected'), 'true');
      await page.keyboard.press('Escape');
      await page.getByRole('dialog', { name: '梦间小憩' }).waitFor();
      await page.keyboard.press('Escape'); assert.equal(await page.getByRole('dialog').count(), 0);
    } finally { await context.close(); }
  });

  await check('Six ending titles and quotes keep space at desktop and phone widths', async () => {
    const measurements = [];
    for (const viewport of [{ width: 1280, height: 800 }, ...[360, 390, 430].map(width => ({ width, height: 844 }))]) {
      for (const [id, state] of endings) {
        const { context, page } = await open(state, viewport);
        try {
          await page.locator('.ending-content blockquote').waitFor();
          await page.locator('.ending-seal').evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished)));
          const measure = await page.evaluate(() => {
            const title = document.querySelector('.ending-title').getBoundingClientRect();
            const quote = document.querySelector('.ending-content blockquote');
            const range = document.createRange(); range.selectNodeContents(quote);
            const last = quote.querySelector('.ending-quote-tail');
            const tail = last?.getBoundingClientRect();
            const seal = document.querySelector('.ending-seal'), sealBox = seal.getBoundingClientRect();
            const matrix = new DOMMatrixReadOnly(getComputedStyle(seal).transform);
            const determinant = matrix.a * matrix.d - matrix.b * matrix.c;
            const centerX = sealBox.left + sealBox.width / 2, centerY = sealBox.top + sealBox.height / 2;
            const localXs = [...seal.children].map(character => {
              const rect = character.getBoundingClientRect();
              const x = rect.left + rect.width / 2 - centerX, y = rect.top + rect.height / 2 - centerY;
              return seal.offsetWidth / 2 + (matrix.d * x - matrix.c * y) / determinant;
            });
            return { gap: quote.getBoundingClientRect().top - title.bottom, text: quote.textContent, tail: last?.textContent, tailWidth: tail?.width, sealColumnSpread: Math.max(...localXs) - Math.min(...localXs), quoteWidth: quote.getBoundingClientRect().width, overflow: document.documentElement.scrollWidth > innerWidth };
          });
          assert.ok(measure.gap >= 24, JSON.stringify({ id, viewport, ...measure }));
          assert.equal(measure.text, ENDINGS[id].quote);
          assert.ok(Array.from(measure.tail || '').length >= 4 && measure.tailWidth < measure.quoteWidth, JSON.stringify(measure));
          assert.ok(measure.sealColumnSpread < 2, `${viewport.width > 760 ? 'desktop' : 'mobile'} seal column drift: ${JSON.stringify(measure)}`); assert.equal(measure.overflow, false);
          measurements.push({ id, width: viewport.width, ...measure });
          if (viewport.width === 1280 || viewport.width === 390) await page.screenshot({ path: screenshot(`ending-${id}-${viewport.width}.png`) });
          if (id === 'mercy' && viewport.width === 1280 && name === 'chromium') {
            const styles = [
              ['all', ''], ['no-ink', '.ending-ink { display: none !important }'], ['no-ripple', '.ending-ripple { display: none !important }'],
              ['no-paper-fiber', ':root { --fiber-texture:none !important; --paper-texture:none !important }'], ['no-grain', '.scene-grain { display:none !important }'], ['flat-background', '.scene-image { background-image:none !important }'],
            ];
            const exposure = await page.addStyleTag({ content: 'html { filter: brightness(3) !important }' });
            for (const [label, css] of styles) {
              const override = css ? await page.addStyleTag({ content: css }) : null;
              await page.screenshot({ path: screenshot(`ending-texture-${label}-bright.png`) });
              await override?.evaluate(element => element.remove());
            }
            await exposure.evaluate(element => element.remove());
          }
        } finally { await context.close(); }
      }
    }
    await writeFile(new URL('ending-measurements.json', output), JSON.stringify(measurements, null, 2));
  });
  assert.deepEqual(errors, []);
} finally {
  await writeFile(new URL('results.json', output), JSON.stringify({ browser: name, url: base, results, errors }, null, 2));
  await browser.close();
}
console.log(`${name}: ${results.length} UI polish checks passed.`);
