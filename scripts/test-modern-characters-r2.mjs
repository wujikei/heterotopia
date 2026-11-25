// Normal file-import UI and rendered-pixel tests; synthetic history is not a human playthrough.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {loadStory} from '../src/story.ts';
import {modernAcceptanceSeed} from '../tests/helpers/modernAcceptance.ts';
import {MODERN_CHARACTER_STATES} from '../src/data/modernPerformance.ts';
import {portraitNameFor} from '../src/data/expressions.ts';
await loadStory('overseas');
const base=process.env.VN_TEST_URL||'http://127.0.0.1:4179';
const out=resolve(process.env.VN_CHARACTER_SCREENSHOTS||'artifacts/modern-characters-r2');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});const report=[];let testedViews=0;
async function importSeed(page,seed){
 await page.getByRole('button',{name:'阅读设置',exact:true}).click();
 await page.getByRole('slider',{name:'文字显现',exact:true}).focus();await page.keyboard.press('Home');
 await page.locator('input[type="file"]').setInputFiles({name:'acceptance.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(seed))});
 await page.getByText('旅途已导入，已经历的记忆合在了一处。').waitFor();await page.keyboard.press('Escape');
 await page.getByRole('button',{name:/^续梦/}).click();
 await page.waitForFunction(id=>document.querySelector('[data-testid="dialogue-text"]')?.dataset.beatId===id,seed.state.beatId);
 assert.equal(await page.getByTestId('dialogue-text').getAttribute('aria-label'),seed.acceptance.text,'one resume click must land on the exact seed, not the following page');
 assert.equal((await page.locator('.dialogue-page').innerText()).replace(/\s/g,''),`${seed.acceptance.page}/${seed.acceptance.total}`);
 const hint=page.getByRole('button',{name:'知道了',exact:true});if(await hint.isVisible())await hint.click();
 const toast=page.getByRole('button',{name:'关闭提示',exact:true});if(await toast.isVisible())await toast.click();
}
async function next(page){
 const old=await page.getByTestId('dialogue-text').getAttribute('data-beat-id');
 const button=page.locator('.dialogue-advance');if(await button.getAttribute('aria-label')==='立即显示全文'){await button.click();await page.waitForTimeout(200);}
 await button.click();await page.waitForFunction(id=>document.querySelector('[data-testid="dialogue-text"]')?.dataset.beatId!==id,old);await page.waitForTimeout(220);
}
async function home(page){await page.getByRole('button',{name:'打开菜单',exact:true}).click();await page.getByRole('button',{name:/^回到标题/}).click();await page.getByRole('button',{name:/再点一次/}).click();}
async function portrait(page,name){await page.locator(`.actor[data-actor-state="active"][data-portrait="${name}"] img:not(.actor-portrait--outgoing)`).waitFor();await page.waitForTimeout(600);}
async function visibleArt(page,label){
 await page.waitForTimeout(100);
 if(page.viewportSize().width/page.viewportSize().height>.75)await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.scene-image--current')).opacity)>.99,{},{timeout:1800});
 const geometry=await page.locator('.scene-image--current').evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return{name:el.dataset.art,dpr:devicePixelRatio,x:r.x,y:r.y,w:r.width,h:r.height,opacity:Number(s.opacity),animation:s.animationName,url:s.backgroundImage,readingTop:document.querySelector('.scene-art').style.getPropertyValue('--r2-reading-top')};});
 assert.ok(geometry.h>80&&geometry.opacity>.95,JSON.stringify(geometry));
 const png=await page.screenshot({clip:{x:Math.max(0,geometry.x+geometry.w*.08),y:Math.max(0,geometry.y+geometry.h*.08),width:geometry.w*.84,height:geometry.h*.64}});
 const pixels=await page.evaluate(async data=>{const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const a=ctx.getImageData(0,0,image.width,image.height).data;let lit=0;for(let i=0;i<a.length;i+=4)if((a[i]+a[i+1]+a[i+2])/3>55)lit++;return{lit:lit/(a.length/4),pixels:a.length/4};},png.toString('base64'));
 assert.ok(pixels.lit>.02,`Rendered art went black: ${JSON.stringify({geometry,pixels})}`);
 report.push({label,beat:await page.getByTestId('dialogue-text').getAttribute('data-beat-id'),...geometry,...pixels});
 await page.screenshot({path:resolve(out,`${label}.png`)});
}
try{
 for(const viewport of [{width:1440,height:900},{width:415,height:687},{width:623,height:1030},{width:390,height:844,reduced:true},{width:415,height:687,dpr:1.5}]){
  const viewLabel=`${viewport.width}${viewport.dpr?'-dpr15':''}`;
  const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},deviceScaleFactor:viewport.dpr||1,serviceWorkers:'block',reducedMotion:viewport.reduced?'reduce':'no-preference'});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await page.getByRole('button',{name:/林越.*现代新卷/}).click();
  if(viewport.width===1440)for(const [scene,id] of [['modern-o-0-1','modern-o-0-1:18:0'],['modern-o-0-2','modern-o-0-2:21:0'],['modern-o-0-2','modern-o-0-2:28:0']]){await importSeed(page,modernAcceptanceSeed(scene,id));await visibleArt(page,`exact-${id.replaceAll(':','-')}`);await home(page);}
  // Exact cold import of the reported failing CG, followed by continuous pages without resizing.
  await importSeed(page,modernAcceptanceSeed('modern-o-0-2','modern-o-0-2:17:0'));
  for(let index=16;index<=27;index++){
   const suffix=`${viewLabel}-${viewport.reduced?'reduced-':''}${index}`;await visibleArt(page,suffix);
   if(index===18){await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(150);await page.setViewportSize({width:viewport.width,height:viewport.height});await visibleArt(page,suffix+'-rotated');}
   if(index<27)await next(page);
  }
  await home(page);
  // New performance, real source sequence, and no protagonist/roommate pasted over the CG.
  await importSeed(page,modernAcceptanceSeed('modern-o-0-2','modern-o-0-2:10:0'));
  for(let n=10;n<=17;n++){
   if(n===10||n===12)await portrait(page,'portrait-linyue-modern-thoughtful');
   if(n===14)await portrait(page,'portrait-linyue-modern-puzzled');
   if(n>=15){await page.waitForTimeout(750);assert.equal(await page.locator('.actor').count(),0,'CG focal action must remain uncovered');}
   if(n===12||n===14)await page.screenshot({path:resolve(out,`${viewLabel}-linyue-${n}.png`)});
   if(n<17)await next(page);
  }
  await page.getByRole('button',{name:'回看',exact:true}).click();
  const replay=page.getByRole('button',{name:/^重读：.*第三声落下去/});
  await replay.waitFor({timeout:6000}).catch(async error=>{
   const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('heterotopia.v1.overseas.autosave')||'null'));
   throw new Error(`${viewLabel}: unable to replay at ${state?.beatId} with recent pages ${JSON.stringify(state?.history?.slice(-6))}`,{cause:error});
  });
  await replay.click();
  await page.waitForFunction(()=>document.querySelector('[data-testid="dialogue-text"]')?.dataset.beatId==='modern-o-0-2:15:0');
  await page.waitForTimeout(220);await next(page);await visibleArt(page,`${viewLabel}-replayed-carving`);await home(page);
  await importSeed(page,modernAcceptanceSeed('modern-o-4-1','modern-o-4-1:19:0'));
  await next(page);await portrait(page,'portrait-roommate-modern-concerned');assert.equal(await page.locator('.scene-image--current').getAttribute('data-art'),'modern-dorm-quiet-r2');await page.screenshot({path:resolve(out,`${viewLabel}-roommate.png`)});
  await next(page);await portrait(page,'portrait-linyue-modern-puzzled');await next(page);await next(page);await portrait(page,'portrait-linyue-modern-thoughtful');await next(page);await page.waitForTimeout(750);assert.equal(await page.locator('.actor').count(),0);assert.equal(await page.locator('.scene-image--current').getAttribute('data-art'),'cg-modern-noodles');await home(page);
  await importSeed(page,modernAcceptanceSeed('modern-o-5-2','modern-o-5-2:19:0'));await portrait(page,'portrait-linyue-modern-smile');await page.screenshot({path:resolve(out,`${viewLabel}-linyue-smile.png`)});await next(page);await next(page);await portrait(page,'portrait-linyue-modern-thoughtful');await home(page);
  // Decode all twelve assets; unused emotional states are not falsely counted as story appearances.
  const names=Object.entries(MODERN_CHARACTER_STATES).flatMap(([key,states])=>states.map(state=>portraitNameFor(key,state)));
  for(const name of names){const size=await page.evaluate(async src=>{const image=new Image();image.src=src;await image.decode();return[image.naturalWidth,image.naturalHeight];},`${base}/art/${name}.webp`);assert.deepEqual(size,[864,1152]);}
  assert.deepEqual(errors,[]);testedViews++;await context.close();
 }
 console.log(`PASS: ${report.length} rendered nonblack CG observations, cold exact import/continuous page/rotation/replay, two character performances, 12 decoded states × ${testedViews} viewports (including DPR1.5). Automated rendering, not human/mobile/audio acceptance.`);
}finally{writeFileSync(resolve(out,'report.json'),JSON.stringify(report,null,2));await browser.close();}
