import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { compileScene, enterScene, loadStory, newGame, newProfile } from '../src/engine.ts';
import { MODERN_PHOTO_ART } from '../src/modern.ts';

const file = pathToFileURL(path.resolve(process.argv[2] ?? '异托邦.html')).href;
const out = path.resolve(process.argv[3] ?? 'artifacts/preview-shenci'); await mkdir(out,{recursive:true});
await loadStory('shenci'); await loadStory('overseas'); await loadStory('original');
const browser = await chromium.launch({ executablePath: process.env.VN_CHROMIUM_EXE || undefined });
const errors = [];
const settings = { textSpeed: 0, reducedMotion: true, muted: true, showSprites: true };
async function open(campaign, seed, viewport={width:1366,height:768}, overrides={}) {
  const context = await browser.newContext({ offline: true, viewport, serviceWorkers:'block' });
  if (campaign || seed) await context.addInitScript(({campaign,seed,settings}) => {
    if (localStorage.getItem('heterotopia.v1.settings')) return;
    const prefix='heterotopia.v1.';
    localStorage.setItem(prefix+'settings',JSON.stringify(settings));
    if (campaign) localStorage.setItem(prefix+'campaign',JSON.stringify(campaign));
    for (const [key,value] of Object.entries(seed ?? {})) localStorage.setItem(prefix+key,JSON.stringify(value));
  },{campaign,seed,settings:{...settings,...overrides}});
  const page = await context.newPage(); page.on('pageerror', e=>errors.push(String(e))); page.on('request',r=>{ if (/^https?:/.test(r.url())) errors.push(r.url()); });
  await page.goto(file); return { context, page };
}
function state(campaign, scene, select, extra={}) {
  const profile = {...newProfile(campaign),...extra}; const s=enterScene(newGame(profile),profile,scene);
  const beat=compileScene(scene,profile,s).find(select); assert.ok(beat,scene);
  return {profile,state:{ ...s,beatId:beat.id }};
}
const seed = (c,x) => {const prefix=c==='original'?'':`${c==='shenci'?'shenci-r2':c}.`;return {[prefix+'profile']:x.profile,[prefix+'autosave']:x.state};};
async function resume(page) { await page.getByRole('button',{name:/^续梦/}).click(); await page.locator('.app--play').waitFor(); }
try {
  const {context,page}=await open('shenci',null,{width:390,height:844});
  const selector=page.locator('.campaign-selector button'); assert.equal(await selector.count(),3);
  for(const item of await selector.all()) { const b=await item.boundingBox(); assert.ok(b.x>=0&&b.x+b.width<=390); }
  await page.screenshot({path:path.join(out,'01-首页-三卷与旧版.png')});
  await page.getByRole('button',{name:'启程',exact:true}).click();
  await page.locator('.app--play').waitFor(); await page.evaluate(()=>document.querySelector('[data-testid="chapter-intro"]')?.click());
  await page.getByTestId('dialogue-text').waitFor();
  assert.match(await page.getByTestId('dialogue-text').getAttribute('data-beat-id'),/^shenci-d-0-1:/);
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

  const unlocked={ endings:['shenci-royal-g1','shenci-kunlun'] };
  const ret=state('shenci','shenci-m-3-4',b=>b.kind==='choice',unlocked);
  const c=await open('shenci',seed('shenci',ret)); await resume(c.page);
  await c.page.getByRole('button',{name:/留在这边/}).click();
  await c.page.waitForFunction(()=>JSON.parse(localStorage.getItem('heterotopia.v1.shenci-r2.autosave')||'null')?.sceneId==='shenci-m-4-0'); await c.context.close();

  const finale=state('shenci','shenci-m-4-5',b=>b.kind==='ending',unlocked);
  const d=await open('shenci',seed('shenci',finale),{width:390,height:844}); await resume(d.page);
  await d.page.getByRole('button',{name:/回到标题/}).waitFor();
  await d.page.screenshot({path:path.join(out,'04-沈辞新版-登山尾声.png')}); await d.context.close();

  const old = state('original','0-2',b=>b.kind==='choice');
  const e=await open('original',{...seed('original',old),...seed('shenci',fork)}); await resume(e.page);
  assert.ok(await e.page.getByRole('button',{name:/加快吃完/}).isVisible());
  assert.equal(await e.page.evaluate(()=>JSON.parse(localStorage.getItem('heterotopia.v1.shenci-r2.autosave')).sceneId),'shenci-d-1-13'); await e.context.close();

  const photo=state('overseas','modern-o-5-7',b=>b.id==='modern-o-5-7:17:0',{endings:['modern-royal-e1','modern-kunlun']});
  for(const [i,viewport] of [{width:1366,height:768},{width:390,height:844}].entries()) {
    const f=await open('overseas',seed('overseas',photo),viewport); await resume(f.page);
    await f.page.locator(`.scene-image--current[data-art="${MODERN_PHOTO_ART}"]`).waitFor();
    const url=await f.page.evaluate(n=>globalThis.__HETEROTOPIA_ORIGINALS__?.[n],MODERN_PHOTO_ART);
    assert.match(url,/^data:image\/webp;base64,/);
    const hint=f.page.getByRole('button',{name:'知道了',exact:true}); if(await hint.isVisible()) await hint.click();
    await f.page.screenshot({path:path.join(out,`0${5+i}-海外合照-${i?'手机':'桌面'}.png`)}); await f.context.close();
  }
  const market=state('shenci','shenci-d-1-5',b=>b.kind==='text' && b.text.includes('两只鸡谁也不理'));
  const m=await open('shenci',seed('shenci',market),{width:390,height:844},{muted:false}); await resume(m.page);
  await m.page.locator('[data-playing-track="shenci-playful"]').waitFor();
  assert.match(await m.page.locator('.game-location').innerText(), /看鸡/);
  assert.match(await m.page.locator('.dialogue-page').innerText(),/^1\s*\/\s*(?:[12][0-9]|3[01])$/);
  const closeHint=m.page.getByRole('button',{name:'知道了',exact:true}); if(await closeHint.isVisible()) await closeHint.click();
  await m.page.screenshot({path:path.join(out,'07-沈辞新版-市井分节.png')});
  await m.page.getByRole('button',{name:'查看行迹'}).click();
  await m.page.locator('.shenci-chapter-label').filter({hasText:'古镇与陆祭'}).waitFor(); await m.context.close();

  for (const [scene,art,shot] of [['shenci-d-1-2','shenci-ritual-steps','08-选巫高台.png'],['shenci-k-E-4','shenci-underwater-eaves','09-湘夫人水下屋.png'],['shenci-k-F-5','shenci-sky-golden','10-青蓝退去.png']]) {
    const fixture=state('shenci',scene,b=>b.kind==='text'&&b.background===art);
    const f=await open('shenci',seed('shenci',fixture),{width:390,height:844}); await resume(f.page);
    await f.page.locator(`.scene-image--current[data-art="${art}"]`).waitFor();
    const hint=f.page.getByRole('button',{name:'知道了',exact:true}); if(await hint.isVisible()) await hint.click();
    await f.page.screenshot({path:path.join(out,shot)});await f.context.close();
  }
  assert.deepEqual(errors,[]); console.log('Offline Chromium: title, first reading, reload, fork, Xu sprite, return, finale, V6 isolation and photo (desktop/mobile) verified.');
} finally { await browser.close(); }
