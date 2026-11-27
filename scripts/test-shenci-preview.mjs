import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { compileScene, enterScene, loadStory, newGame, newProfile } from '../src/engine.ts';
import { MODERN_PHOTO_ART, MODERN_SHUTTER_BEAT } from '../src/modern.ts';
import { overseasArt } from '../src/overseasArt.ts';

const web = process.env.VN_TEST_URL;
const url = web ?? pathToFileURL(path.resolve(process.argv[2] ?? '异托邦.html')).href;
const origin = new URL(url).origin;
const out = path.resolve(process.argv[3] ?? 'artifacts/preview-shenci'); await mkdir(out,{recursive:true});
await loadStory('shenci'); await loadStory('overseas'); await loadStory('original');
const browser = await chromium.launch({ executablePath: process.env.VN_CHROMIUM_EXE || undefined });
const errors = [];
const settings = { textSpeed: 0, reducedMotion: true, muted: true, showSprites: true };
async function open(campaign, seed, viewport={width:1366,height:768}, overrides={}, beforeOpen) {
  const context = await browser.newContext({ offline: !web, viewport, serviceWorkers:'block' });
  if (campaign || seed) await context.addInitScript(({campaign,seed,settings}) => {
    if (localStorage.getItem('heterotopia.v1.settings')) return;
    const prefix='heterotopia.v1.';
    localStorage.setItem(prefix+'settings',JSON.stringify(settings));
    if (campaign) localStorage.setItem(prefix+'campaign',JSON.stringify(campaign));
    for (const [key,value] of Object.entries(seed ?? {})) localStorage.setItem(prefix+key,JSON.stringify(value));
  },{campaign,seed,settings:{...settings,...overrides}});
  const page = await context.newPage();
  page.on('pageerror', e=>errors.push(String(e)));
  page.on('request', r=>{ if (/^https?:/.test(r.url()) && (!web || new URL(r.url()).origin !== origin)) errors.push(r.url()); });
  await beforeOpen?.(page);
  await page.goto(url);
  return { context, page };
}
function state(campaign, scene, select, extra={}) {
  const profile = {...newProfile(campaign),...extra}; const s=enterScene(newGame(profile),profile,scene);
  const beat=compileScene(scene,profile,s).find(select); assert.ok(beat,scene);
  return {profile,state:{ ...s,beatId:beat.id }};
}
const seed = (c,x) => {const prefix=c==='original'?'':`${c==='shenci'?'shenci-r2':c}.`;return {[prefix+'profile']:x.profile,[prefix+'autosave']:x.state};};
async function resume(page) { await page.getByRole('button',{name:/^续梦/}).click(); await page.locator('.app--play').waitFor(); }
async function dismissHint(page) {
  const hint = page.getByRole('button', { name: '知道了', exact: true });
  if (await hint.isVisible()) await hint.click();
}
async function turn(page, nextBeat) {
  await page.waitForTimeout(190);
  await page.getByRole('button', { name: '继续', exact: true }).click();
  await page.locator(`[data-beat-id="${nextBeat}"]`).waitFor();
}
const currentArt = (page, name) => page.locator(`.scene-image--current[data-art="${name}"]`);
async function photoSource(page, name, mobile) {
  const sourceKey = mobile ? `${name}-m` : name;
  await page.waitForFunction(({ art, sourceKey, web, mobile }) => {
    const layer = document.querySelector(`.scene-image--current[data-art="${art}"]`);
    if (!layer || (layer.parentElement.dataset.composition === 'portrait') !== mobile) return false;
    const source = layer.style.backgroundImage;
    return web ? source.includes(`art-original/${sourceKey}.webp`) :
      source === `url("${window.__HETEROTOPIA_ORIGINALS__[sourceKey]}")`;
  }, { art: MODERN_PHOTO_ART, sourceKey, web, mobile });
}
try {
  const {context,page}=await open('shenci',null,{width:390,height:844});
  const selector=page.locator('.campaign-selector button'); assert.equal(await selector.count(),3);
  for(const item of await selector.all()) { const b=await item.boundingBox(); assert.ok(b.x>=0&&b.x+b.width<=390); }
  await page.screenshot({path:path.join(out,'01-首页-三卷与旧版.png')});
  await page.getByRole('button',{name:'启程',exact:true}).click();
  await page.locator('.app--play').waitFor(); await page.evaluate(()=>document.querySelector('[data-testid="chapter-intro"]')?.click());
  await page.getByTestId('dialogue-text').waitFor();
  assert.match(await page.getByTestId('dialogue-text').getAttribute('data-beat-id'),/^shenci-d-0-1:/);
  assert.equal(await page.locator('.location-name').innerText(), '夜梦 · 船底的敲击');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('heterotopia.v1.shenci-r2.autosave')||'null')?.campaign==='shenci');
  assert.equal(await page.evaluate(()=>localStorage.getItem('heterotopia.v1.autosave')),null);
  await page.reload(); await resume(page);
  assert.match(await page.getByTestId('dialogue-text').getAttribute('data-beat-id'),/^shenci-d-0-1:/);
  await context.close();

  const fork=state('shenci','shenci-d-1-13',b=>b.kind==='choice');
  const a=await open('shenci',seed('shenci',fork),{width:390,height:844}); await resume(a.page);
  await a.page.getByRole('button',{name:/接屈衡的烤薯/}).waitFor();
  await a.page.screenshot({path:path.join(out,'02-沈辞新版-马车分路.png')});
  await a.page.getByRole('button',{name:/接大巫祝的饼/}).click();
  await a.page.waitForFunction(()=>document.querySelector('[data-beat-id]')?.getAttribute('data-beat-id')?.startsWith('shenci-d-1-13b:'));
  await a.context.close();

  const borrowed=state('shenci','shenci-d-1-3a',b=>b.kind==='text' && ['沈辞','戌'].includes(b.speaker));
  const b=await open('shenci',seed('shenci',borrowed)); await resume(b.page);
  await b.page.locator('[data-portrait^="portrait-xu"]').waitFor();
  await b.page.screenshot({path:path.join(out,'03-沈辞新版-戌身立绘.png')}); await b.context.close();

  for (const scene of ['shenci-m-2-1', 'shenci-m-3-1']) {
    const wake = state('shenci', scene, beat => beat.kind === 'text' && beat.text.includes('睁开眼'));
    const returned = await open('shenci', seed('shenci', wake), undefined, { muted: false });
    await resume(returned.page);
    await returned.page.locator('.scene-image--current[data-art="classroom"]').waitFor();
    assert.equal(await returned.page.locator('.location-name').innerText(), '高一七班 · 19:37');
    await returned.page.locator('main[data-playing-track]').waitFor({ state: 'detached' });
    await returned.context.close();
  }

  const unlocked={ endings:['shenci-royal-g1','shenci-kunlun'] };
  const ret=state('shenci','shenci-m-3-4',b=>b.kind==='choice',unlocked);
  const c=await open('shenci',seed('shenci',ret)); await resume(c.page);
  await c.page.getByRole('button',{name:/留在这边/}).click();
  await c.page.waitForFunction(()=>JSON.parse(localStorage.getItem('heterotopia.v1.shenci-r2.autosave')||'null')?.sceneId==='shenci-m-4-0'); await c.context.close();

  const finale=state('shenci','shenci-m-4-5',b=>b.kind==='ending',unlocked);
  const d=await open('shenci',seed('shenci',finale),{width:390,height:844}); await resume(d.page);
  await currentArt(d.page,'cg-modern-hike-lookback').waitFor();
  await d.page.getByRole('button',{name:/回到标题/}).waitFor();
  await d.page.screenshot({path:path.join(out,'04-沈辞新版-登山尾声.png')}); await d.context.close();

  const hike = state('shenci', 'shenci-m-4-4', beat => beat.id === 'shenci-m-4-4:22:0', unlocked);
  const h = await open('shenci', seed('shenci', hike), { width: 390, height: 844 });
  await resume(h.page); await dismissHint(h.page);
  await currentArt(h.page, 'modern-mountain-path').waitFor();
  for (const [page, art] of [
    ['23:0', 'cg-modern-hike-tang'], ['24:0', 'cg-modern-hike-tang'], ['25:0', 'modern-mountain-path'],
  ]) {
    await turn(h.page, `shenci-m-4-4:${page}`);
    await currentArt(h.page, art).waitFor();
    if (page === '24:0') await h.page.screenshot({ path: path.join(out, '13-沈辞-唐瑾递水.png') });
  }
  for (const page of ['26:0', '27:0', '28:0', '29:0']) await turn(h.page, `shenci-m-4-4:${page}`);
  await turn(h.page, 'shenci-m-4-5:2:0');
  for (const [page, art, shot] of [
    ['3:0', 'rail', '14-沈辞-水瓶碰栏.png'], ['4:0', 'rail'], ['5:0', 'pickup'], ['6:0', 'pickup'],
    ['7:0', 'return', '15-沈辞-女孩还水.png'],
  ]) {
    await turn(h.page, `shenci-m-4-5:${page}`);
    await currentArt(h.page, `cg-modern-hike-${art}`).waitFor();
    if (shot) await h.page.screenshot({ path: path.join(out, shot) });
    if (page === '3:0') {
      await h.page.setViewportSize({ width: 320, height: 568 });
      await h.page.waitForFunction(() => {
        const scene = document.querySelector('.scene-image--current');
        const dialogue = document.querySelector('.dialogue-text');
        const rail = scene?.getBoundingClientRect(), copy = dialogue?.getBoundingClientRect();
        return rail?.height >= 120 && rail.bottom <= copy?.top && copy.bottom <= innerHeight;
      });
      await h.page.screenshot({ path: path.join(out, '18-沈辞-小屏碰栏.png') });
      await h.page.setViewportSize({ width: 390, height: 844 });
    }
  }
  for (let page = 8; page < 20; page++) {
    await turn(h.page, `shenci-m-4-5:${page}:0`);
    if (page === 14) await currentArt(h.page, 'cg-modern-hike-held').waitFor();
    if (page === 15) await currentArt(h.page, 'cg-modern-hike-invitation').waitFor();
  }
  await currentArt(h.page, 'cg-modern-hike-held').waitFor();
  await turn(h.page, 'shenci-m-4-5:20:0');
  await currentArt(h.page, 'cg-modern-hike-lookback').waitFor();
  await h.page.screenshot({ path: path.join(out, '16-沈辞-女孩回头.png') });
  await h.page.getByRole('button', { name: '打开菜单', exact: true }).click();
  await h.page.getByRole('button', { name: /^浮生绘卷/ }).click();
  await h.page.getByRole('tab', { name: '留影 · CG', exact: true }).click();
  await h.page.getByRole('button', { name: /回头一笑/ }).click();
  await h.page.locator('.gallery-viewer[data-gallery-art="cg-modern-hike-lookback"]').waitFor();
  await h.context.close();

  const old = state('original','0-2',b=>b.kind==='choice');
  const e=await open('original',{...seed('original',old),...seed('shenci',fork)}); await resume(e.page);
  assert.ok(await e.page.getByRole('button',{name:/加快吃完/}).isVisible());
  assert.equal(await e.page.evaluate(()=>JSON.parse(localStorage.getItem('heterotopia.v1.shenci-r2.autosave')).sceneId),'shenci-d-1-13'); await e.context.close();

  const photo = state('overseas', 'modern-o-5-7', beat => beat.id === 'modern-o-5-7:16:0', { endings: ['modern-royal-e1', 'modern-kunlun'] });
  for (const [tone, width, height, reducedMotion] of [
    ['neutral', 1366, 768, false], ['light', 390, 844, false], ['deep', 320, 568, true], ['neutral', 844, 390, true],
  ]) {
    const fixture = { ...photo, state: { ...photo.state, overseasIdentity: { tone, tradition: '4' } } };
    const f = await open('overseas', seed('overseas', fixture), { width, height }, { reducedMotion });
    const mobile = width / height <= 3 / 4;
    const name = overseasArt(MODERN_PHOTO_ART, tone);
    await resume(f.page); await dismissHint(f.page);
    await currentArt(f.page, 'modern-sunset').waitFor();
    assert.equal(await currentArt(f.page, MODERN_PHOTO_ART).count(), 0);
    assert.equal(await f.page.getByRole('button', { name: '看合影' }).count(), 0);
    await turn(f.page, MODERN_SHUTTER_BEAT);
    await photoSource(f.page, name, mobile);
    const picture = currentArt(f.page, MODERN_PHOTO_ART);
    assert.equal(await picture.evaluate(el => getComputedStyle(el).animationName), reducedMotion ? 'none' : 'summit-image-arrive');
    const text = f.page.getByTestId('dialogue-text');
    if (mobile) {
      const stage = await picture.boundingBox(), copy = await text.boundingBox();
      assert.ok(stage.height >= 150 && stage.y + stage.height <= copy.y, JSON.stringify({ stage, copy }));
    } else if (height < 500) {
      const stage = await picture.boundingBox(), copy = await text.boundingBox();
      assert.ok(stage.x >= copy.x + copy.width, JSON.stringify({ stage, copy }));
    }
    await f.page.screenshot({ path: path.join(out, `海外-快门-${tone}-${width}x${height}.png`), animations: 'disabled' });
    await f.page.getByRole('button', { name: '看合影', exact: true }).click();
    await f.page.getByRole('button', { name: '返回阅读', exact: true }).waitFor();
    assert.equal(await picture.evaluate(el => getComputedStyle(el).backgroundSize), 'contain');
    assert.equal(await picture.evaluate(el => getComputedStyle(el).maskImage), 'none');
    if (tone === 'light') {
      await f.page.screenshot({ path: path.join(out, '17-海外-手机看合影.png'), animations: 'disabled' });
      await f.page.setViewportSize({ width: 844, height: 390 });
      await photoSource(f.page, name, false);
      await f.page.setViewportSize({ width, height });
      await photoSource(f.page, name, true);
    }
    await f.page.getByRole('button', { name: '返回阅读', exact: true }).press('Enter');
    await f.page.getByRole('button', { name: '看合影', exact: true }).waitFor();
    assert.equal(await text.getAttribute('data-beat-id'), MODERN_SHUTTER_BEAT);
    if (tone === 'light') {
      await f.page.reload(); await resume(f.page);
      await photoSource(f.page, name, true);
      assert.equal(await text.getAttribute('data-beat-id'), MODERN_SHUTTER_BEAT);
      for (const number of [18, 19, 20, 21]) await turn(f.page, `modern-o-5-7:${number}:0`);
      await f.page.waitForTimeout(190);
      await f.page.getByRole('button', { name: '继续', exact: true }).click();
      await f.page.getByRole('button', { name: '静看此景', exact: true }).click();
      await photoSource(f.page, name, true);
      assert.equal(await picture.evaluate(el => getComputedStyle(el).backgroundSize), 'contain');
      await f.page.getByRole('button', { name: '返回结局', exact: true }).click();
      await f.page.getByRole('button', { name: /回到标题/ }).waitFor();
    }
    await f.context.close();
  }
  const market=state('shenci','shenci-d-1-5',b=>b.kind==='text' && b.text.includes('两只鸡谁也不理'));
  const marketAudio=[];
  const m=await open('shenci',seed('shenci',market),{width:390,height:844},{muted:false},page=>{
    page.on('request',request=>{ if (/\/audio\//.test(request.url())) marketAudio.push(request.url()); });
  });
  await resume(m.page);
  await m.page.locator('[data-playing-track="shenci-playful"]').waitFor();
  if (web) {
    assert.ok(marketAudio.some(url=>url.endsWith('amb-wind.mp3')));
    assert.ok(marketAudio.every(url=>!url.endsWith('amb-street.mp3')));
  }
  assert.match(await m.page.locator('.game-location').innerText(), /看鸡/);
  assert.match(await m.page.locator('.dialogue-page').innerText(),/^1\s*\/\s*(?:[12][0-9]|3[01])$/);
  const closeHint=m.page.getByRole('button',{name:'知道了',exact:true}); if(await closeHint.isVisible()) await closeHint.click();
  await m.page.screenshot({path:path.join(out,'07-沈辞新版-市井分节.png')});
  await m.page.getByRole('button',{name:'查看行迹'}).click();
  await m.page.locator('.shenci-chapter-label').filter({hasText:'古镇与陆祭'}).waitFor(); await m.context.close();

  const storm=state('shenci','shenci-k-D-6',b=>b.id==='shenci-k-D-6:23:0');
  const wind=await open('shenci',seed('shenci',storm),undefined,{muted:false});
  await resume(wind.page);
  await wind.page.locator('[data-playing-track="chu-storm"]').waitFor();
  await wind.page.keyboard.press('ArrowRight');
  await wind.page.locator('[data-beat-id="shenci-k-D-6:24:0"]').waitFor();
  await wind.page.locator('main[data-playing-track]').waitFor({state:'detached'});
  await wind.context.close();

  for (const [scene,art,shot] of [['shenci-d-1-2','shenci-ritual-steps','08-选巫高台.png'],['shenci-k-E-4','shenci-underwater-eaves','09-湘夫人水下屋.png'],['shenci-k-F-5','shenci-sky-golden','10-青蓝退去.png']]) {
    const fixture=state('shenci',scene,b=>b.kind==='text'&&b.background===art);
    const f=await open('shenci',seed('shenci',fixture),{width:390,height:844}); await resume(f.page);
    await f.page.locator(`.scene-image--current[data-art="${art}"]`).waitFor();
    const hint=f.page.getByRole('button',{name:'知道了',exact:true}); if(await hint.isVisible()) await hint.click();
    await f.page.screenshot({path:path.join(out,shot)});await f.context.close();
  }

  const shoal=state('shenci','shenci-k-G-2',b=>b.id==='shenci-k-G-2:2:0');
  const copy=await open('shenci',seed('shenci',shoal),{width:390,height:844});
  await resume(copy.page);
  const text = copy.page.getByTestId('dialogue-text');
  assert.match(await text.getAttribute('aria-label'), /临行那天，老妇人送来的那碗粥/);
  await copy.page.keyboard.press('ArrowRight');
  await text.and(copy.page.locator('[data-beat-id="shenci-k-G-2:3:0"]')).waitFor();
  await copy.page.locator('.scene-image--current[data-art="cg-modern-porridge-plaque"]').waitFor();
  const hint=copy.page.getByRole('button',{name:'知道了',exact:true}); if(await hint.isVisible()) await hint.click();
  await copy.page.screenshot({path:path.join(out,'11-浅滩-冷粥木牌.png')});
  await copy.page.keyboard.press('ArrowLeft');
  const history=copy.page.getByRole('dialog');
  await history.getByText(/临行那天，老妇人送来的那碗粥/).waitFor();
  assert.doesNotMatch(await history.innerText(), /C-3/);
  await copy.context.close();

  const split=state('shenci','shenci-k-F-6',b=>b.kind==='choice');
  const landscape=await open('shenci',seed('shenci',split),{width:844,height:390});
  await resume(landscape.page);
  const options=landscape.page.locator('.choice-option');
  assert.equal(await options.count(),6);
  for (const name of ['.choice-prompt','.choice-save']) {
    const bounds=await landscape.page.locator(name).boundingBox();
    assert.ok(bounds.y>=0 && bounds.y+bounds.height<=390,name);
  }
  const landscapeList=await landscape.page.locator('.choice-options').boundingBox();
  for (const option of await options.all()) {
    const bounds=await option.boundingBox();
    assert.ok(bounds.y>=landscapeList.y && bounds.y+bounds.height<=landscapeList.y+landscapeList.height+1);
  }
  await landscape.page.screenshot({path:path.join(out,'12-昆仑-横屏六选项.png')});
  await landscape.page.setViewportSize({width:610,height:330});
  await options.first().focus();
  for(let i=1;i<6;i++) await landscape.page.keyboard.press('Tab');
  assert.equal(await options.last().evaluate(element=>element===document.activeElement),true);
  const list=await landscape.page.locator('.choice-options').boundingBox();
  const lastChoice=await options.last().boundingBox();
  assert.ok(lastChoice.y>=list.y && lastChoice.y+lastChoice.height<=list.y+list.height+1);
  assert.ok(await landscape.page.locator('.choice-options').evaluate(element=>element.scrollTop>0));
  if (web) await options.last().click();
  else await landscape.page.keyboard.press('6');
  await landscape.page.getByRole('button',{name:'跟着鸟走',exact:false}).waitFor();
  assert.equal(await landscape.page.locator('.choice-options').evaluate(element=>element.scrollTop),0);
  await landscape.context.close();

  if (web) {
    const last=state('shenci','shenci-d-0-11',b=>b.id==='shenci-d-0-11:26:0');
    let releaseStory, markRequested;
    const held=new Promise(resolve=>{releaseStory=resolve;});
    const requestStarted=new Promise(resolve=>{markRequested=resolve;});
    const files=[];
    const boundary=await open('shenci',seed('shenci',last),undefined,{muted:false},async page=>{
      await page.addInitScript(()=>{ Object.defineProperty(navigator.connection,'saveData',{ value:true }); });
      page.on('request',request=>files.push(new URL(request.url()).pathname));
      await page.route('**/shenci-story-*.js',async route=>{markRequested(); await held; await route.continue();});
    });
    try {
      await resume(boundary.page);
      await boundary.page.locator('.scene-image--current[data-art="marsh"]').waitFor();
      await boundary.page.locator('[data-playing-track="under-current"]').waitFor();
      assert.match(await boundary.page.getByTestId('dialogue-text').getAttribute('data-beat-id'),/^shenci-d-0-11:/);
      assert.ok(files.some(name=>name.includes('/shenci-opening-')));
      assert.ok(files.every(name=>!name.includes('/shenci-story-')));
      await boundary.page.keyboard.press('ArrowRight');
      await Promise.race([requestStarted,boundary.page.getByRole('status').filter({hasText:'正在载入旅途'}).waitFor()]);
      await boundary.page.getByRole('status').filter({hasText:'正在载入旅途'}).waitFor();
      assert.equal(await boundary.page.getByTestId('dialogue-text').getAttribute('data-beat-id'),last.state.beatId);
      releaseStory();
      await boundary.page.locator('[data-beat-id^="shenci-d-1-2:"]').waitFor();
      await boundary.page.locator('[data-playing-track="ritual"]').waitFor();
      await boundary.page.locator('.scene-image--current[data-art="shenci-ritual-steps"]').waitFor();
      assert.equal(files.filter(name=>name.includes('/shenci-story-')).length,1);
    } finally {
      releaseStory();
      await boundary.context.close();
    }
  }

  assert.deepEqual(errors,[]);
  console.log(`Chromium (${web?'web':'offline'}): opening, bookmarks, returns, photo, market, player-facing text and six-option navigation verified.`);
} finally { await browser.close(); }
