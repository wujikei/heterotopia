import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { campaignScenes, compileScene, enterScene, newGame, newProfile } from '../src/engine.ts';
import { loadStory } from '../src/story.ts';

const base = process.env.VN_TEST_URL || 'http://127.0.0.1:4179';
await loadStory('original');
await loadStory('overseas');
const browser = await chromium.launch({ headless: true });
const report = [];
const failures = [];
const viewports = [{ width: 1440, height: 900 }, { width: 1024, height: 572 }, { width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }];
try {
  for (const ending of ['modern-royal-o', 'modern-royal-e1', 'modern-kunlun', 'modern-home', 'blade']) for (const reducedMotion of [false, true]) {
    const campaign = ending.startsWith('modern-') ? 'overseas' : 'original';
    const profile = newProfile(campaign);
    const scene = campaignScenes(campaign).find(item => compileScene(item.id, profile, { choices: {}, inventory: [] }).some(beat => beat.kind === 'ending' && beat.ending === ending));
    assert.ok(scene, ending);
    let state = enterScene(newGame(profile), profile, scene.id);
    const finalBeat = compileScene(scene.id, profile, state).find(beat => beat.kind === 'ending' && beat.ending === ending);
    assert.ok(finalBeat, ending);
    state = { ...state, beatId: finalBeat.id };
    const context = await browser.newContext({ viewport: viewports[0], serviceWorkers: 'block' });
    const browserErrors = [];
    try {
      await context.addInitScript(settings => localStorage.setItem('heterotopia.v1.settings', JSON.stringify(settings)), { textSpeed: 0, reducedMotion, muted: true });
      const page = await context.newPage();
      page.on('pageerror', error => browserErrors.push(error.message));
      page.on('response', response => { if (response.status() >= 400 && !response.url().includes('favicon.ico')) browserErrors.push(`${response.status()} ${response.url()}`); });
      await page.goto(base);
      await page.getByRole('button', { name: campaign === 'overseas' ? /林越.*现代新卷/ : /沈辞.*原篇/ }).click();
      await page.getByRole('button', { name: '阅读设置', exact: true }).click();
      const file = { format: 'heterotopia-save', version: 1, profile, state, slots: [] };
      await page.locator('input[type="file"]').setInputFiles({ name: 'ending-test.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file)) });
      await page.getByText('旅途已导入，已经历的记忆合在了一处。').waitFor();
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: /^续梦/ }).focus();
      await page.keyboard.press('Enter');
      await page.locator('.ending-screen').waitFor();
      await page.evaluate(() => document.fonts.ready);
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.locator('.ending-screen').evaluate(element => { element.scrollTop = 0; });
        for (const time of [1000, 5000]) {
          await page.locator('.ending-screen').evaluate(async (element, currentTime) => {
            for (const animation of element.getAnimations({ subtree: true })) { animation.pause(); animation.currentTime = currentTime; }
            await new Promise(requestAnimationFrame);
          }, time);
          const size = await page.locator('.ending-screen').evaluate(element => {
            const content = element.querySelector('.ending-content').getBoundingClientRect();
            const footer = element.querySelector('.ending-copyright').getBoundingClientRect();
            const css = getComputedStyle(element);
            return { clientWidth: element.clientWidth, scrollWidth: element.scrollWidth, clientHeight: element.clientHeight, scrollHeight: element.scrollHeight, contentTop: content.top, contentHeight: content.height, footerTop: footer.top, expectedHeight: Math.max(element.clientHeight, content.height + footer.height + parseFloat(css.paddingTop) + parseFloat(css.paddingBottom) + parseFloat(css.rowGap || '0')) };
          });
          report.push({ ending, reducedMotion, viewport, time, ...size });
          const label = `${ending}/${reducedMotion}/${viewport.width}x${viewport.height}/${time}`;
          if (size.scrollWidth > size.clientWidth + 1) failures.push(`${label}: horizontal overflow ${size.scrollWidth} > ${size.clientWidth}`);
          if (size.contentTop < -1) failures.push(`${label}: beginning is above scroll origin ${size.contentTop}`);
          if (size.scrollHeight > size.expectedHeight + 2) failures.push(`${label}: decorative overflow ${size.scrollHeight} > ${size.expectedHeight}`);
          if (size.footerTop + 1 < size.contentTop + size.contentHeight) failures.push(`${label}: footer overlaps reading content`);
        }
        // A real wheel scroll must expose the last action, not merely hide overflow.
        await page.locator('.ending-screen').hover();
        await page.mouse.wheel(0, 20000);
        await page.waitForFunction(() => { const e = document.querySelector('.ending-screen'); return e.scrollTop + e.clientHeight >= e.scrollHeight - 2; });
        const paint = await page.locator('.ending-effects').boundingBox();
        assert.ok(paint && paint.y <= 0 && paint.y + paint.height >= viewport.height, `${ending}: ink backing scrolls away at ${viewport.width}x${viewport.height}`);
        const lastAction = await page.locator('.ending-secondary').boundingBox();
        assert.ok(lastAction && lastAction.y >= 0 && lastAction.y + lastAction.height <= viewport.height + 1, `${ending}: last action unreachable at ${viewport.width}x${viewport.height}`);
        if (campaign === 'overseas' && ['modern-royal-o', 'modern-royal-e1'].includes(ending) && viewport.width === 1024 && process.env.ENDING_LAYOUT_SHOTS) {
          await page.screenshot({ path: `${process.env.ENDING_LAYOUT_SHOTS}/${ending}.png` });
        }
      }
      assert.deepEqual(browserErrors, []);
    } finally { await context.close(); }
  }
} finally {
  await browser.close();
  if (process.env.ENDING_LAYOUT_REPORT) writeFileSync(process.env.ENDING_LAYOUT_REPORT, JSON.stringify(report, null, 2));
}
assert.deepEqual(failures, []);
console.log(`Ending layout passed: ${report.length} animation/viewport observations; real wheel access to last actions; normal JSON import; original and modern endings.`);
