import { chromium, firefox, webkit } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const base = process.env.VN_TEST_URL || 'http://127.0.0.1:5173';
const browserName = process.env.VN_TEST_BROWSER || 'chromium';
const browserType = { chromium, firefox, webkit }[browserName];
if (!browserType) throw new Error(`Unsupported browser: ${browserName}`);
const folder = new URL(browserName === 'chromium' ? '../artifacts/' : `../artifacts/${browserName}/`, import.meta.url);
const screenshotPath = name => fileURLToPath(new URL(name, folder));
await mkdir(folder, { recursive: true });
const browser = await browserType.launch({ headless: true });
const errors = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400 && !response.url().includes('favicon.ico')) errors.push(`${response.status()} ${response.url()}`); });
try {
await page.goto(base);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1900);
await page.screenshot({ path: screenshotPath('01-home-desktop.png'), fullPage: true });
await page.getByRole('button', { name: '启程 BEGIN THE JOURNEY' }).click();
const intro = page.getByTestId('chapter-intro');
if (await intro.count()) await intro.click();
await page.getByRole('button', { name: '立即显示全文' }).click();
await page.waitForTimeout(1000);
await page.screenshot({ path: screenshotPath('02-story-desktop.png'), fullPage: true });
await page.getByRole('button', { name: '继续', exact: true }).click();
await page.keyboard.press('s');
await page.getByRole('button', { name: /尚未落笔.*空白书签/ }).first().click();
await page.getByRole('button', { name: '关闭', exact: true }).click();
await page.getByRole('button', { name: '打开菜单' }).click();
await page.getByRole('button', { name: '人物志 ENCOUNTERS' }).click();
await page.waitForTimeout(600);
await page.screenshot({ path: screenshotPath('03-characters-desktop.png'), fullPage: true });
await page.getByRole('button', { name: '关闭', exact: true }).click();
await page.keyboard.press('Escape');
await page.getByRole('button', { name: /回到标题/ }).click();
await page.getByRole('button', { name: '浮生绘卷', exact: true }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: screenshotPath('04-gallery-desktop.png'), fullPage: true });
await page.getByRole('button', { name: '关闭', exact: true }).click();
await page.getByRole('button', { name: '阅读设置', exact: true }).click();
await page.getByRole('slider', { name: '文字显现' }).fill('0');
await page.getByRole('switch', { name: '减弱动态' }).click();
await page.getByRole('button', { name: '关闭', exact: true }).click();
await page.reload();
const settings = await page.evaluate(() => JSON.parse(localStorage.getItem('heterotopia.v1.settings')));
if (settings.textSpeed !== 0) errors.push('Text setting did not persist');
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('heterotopia.v1.slots')));
if (!saved?.[0]) errors.push('Manual save did not persist');

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
await page.screenshot({ path: screenshotPath('05-home-mobile.png'), fullPage: true });
await page.getByRole('button', { name: /^续梦/ }).click();
await page.waitForTimeout(1000);
await page.screenshot({ path: screenshotPath('06-story-mobile.png'), fullPage: true });
const overflow = await page.evaluate(() => ({ width: window.innerWidth, scroll: document.documentElement.scrollWidth }));
if (overflow.scroll > overflow.width) errors.push(`Mobile horizontal overflow: ${JSON.stringify(overflow)}`);
await page.getByRole('button', { name: '打开菜单' }).click();
await page.getByRole('button', { name: '行迹 CHAPTERS' }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: screenshotPath('07-chapters-mobile.png'), fullPage: true });
await page.getByRole('button', { name: '关闭', exact: true }).click();
for (const [name, width, height] of [['tablet', 820, 1180], ['landscape', 844, 390]]) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(200);
  const layout = await page.evaluate(() => {
    const bounds = document.querySelector('.dialogue')?.getBoundingClientRect();
    return { overflow: document.documentElement.scrollWidth > innerWidth, top: bounds?.top, bottom: bounds?.bottom, height: innerHeight };
  });
  if (layout.overflow || layout.top < 0 || layout.bottom > layout.height + 1) errors.push(`${name} layout: ${JSON.stringify(layout)}`);
  await page.screenshot({ path: screenshotPath(`08-story-${name}.png`), fullPage: true });
}
} catch (error) {
  await page.screenshot({ path: screenshotPath('failure.png'), fullPage: true });
  await writeFile(new URL('browser-failure.json', folder), JSON.stringify({ errors, failure: String(error), dialogs: await page.getByRole('dialog').allTextContents(), body: (await page.locator('body').innerText()).slice(0, 6000) }, null, 2));
  await context.close(); await browser.close(); throw error;
}
await context.close();
await browser.close();
await writeFile(new URL('browser-results.json', folder), JSON.stringify({ testedAt: new Date().toISOString(), browser: browserName, url: base, errors }, null, 2));
if (errors.length) throw new Error(errors.join('\n'));
console.log(`${browserName} checks passed: desktop, phone, tablet, landscape, text advance, manual save, settings persistence, gallery, characters, chapters.`);
