import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { loadStory } from '../src/story.ts';
import { advance, currentBeat, enterScene, newGame, newProfile } from '../src/engine.ts';
import { mkdirSync } from 'node:fs';
const base=process.env.VN_TEST_URL || 'http://127.0.0.1:4179';
await loadStory('overseas');
const browser=await chromium.launch({headless:true});
const out=process.env.VN_STAGING_SCREENSHOTS;
if(out)mkdirSync(out,{recursive:true});
const cases=[
 ['palm','modern-o-0-1','modern-o-0-1:18:0','cg-modern-jade-palm-r2'],
 ['unease','modern-o-0-2','modern-o-0-2:15:0','cg-modern-dorm-unease-r2'],
 ['carving','modern-o-0-2','modern-o-0-2:17:0','cg-modern-dorm-carving-r2'],
 ['blackout','modern-o-0-2','modern-o-0-2:21:0','cg-modern-dorm-dark-r2'],
 ['light','modern-o-0-2','modern-o-0-2:28:0','cg-modern-jade-light-r2'],
];
let observed=0;
try {
 for(const viewport of [{width:1440,height:900},{width:421,height:687},{width:390,height:844},{width:320,height:568},{width:844,height:390},{width:390,height:844,reduced:true}]) {
  const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},serviceWorkers:'block',reducedMotion:viewport.reduced?'reduce':'no-preference'});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);
  await page.getByRole('button',{name:/林越.*现代新卷/}).click();
  for(const [label,scene,id,art] of cases) {
   const profile=newProfile('overseas');
   const state={...enterScene(newGame(profile),profile,scene),beatId:id};
   const expected=currentBeat(state,profile);
   const slot={version:1,savedAt:'2026-11-24T00:00:00+09:00',state};
   const seed={format:'heterotopia-save',version:1,campaign:'overseas',profile,state,slots:[slot,null,null,null,null,null]};
   await page.getByRole('button',{name:'阅读设置',exact:true}).click();
   await page.getByRole('slider',{name:'文字显现',exact:true}).focus();
   await page.keyboard.press('Home');
   await page.locator('input[type="file"]').setInputFiles({name:`${label}.json`,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(seed))});
   await page.getByText('旅途已导入，已经历的记忆合在了一处。').waitFor();
   await page.keyboard.press('Escape');
   const resume=page.getByRole('button',{name:/^续梦/});
   if(await resume.isVisible())await resume.click();
   const intro=page.getByTestId('chapter-intro');if(await intro.isVisible())await intro.click();
   await page.waitForFunction(art=>document.querySelector('.scene-image--current')?.getAttribute('data-art')===art,art)
    .catch(async error => {
      const current = await page.evaluate(() => ({
        art: document.querySelector('.scene-image--current')?.getAttribute('data-art'),
        text: document.querySelector('[data-testid="dialogue-text"]')?.getAttribute('aria-label'),
        intro: !!document.querySelector('[data-testid="chapter-intro"]'),
      }));
      throw new Error(`${label} ${viewport.width}×${viewport.height} expected ${art}. ${JSON.stringify(current)}`, { cause: error });
    });
   const hint=page.getByRole('button',{name:'知道了',exact:true});if(await hint.isVisible())await hint.click();
   const notice=page.getByRole('button',{name:'关闭提示',exact:true});if(await notice.isVisible())await notice.click();
   await page.waitForTimeout(650);
   assert.equal(await page.getByTestId('dialogue-text').getAttribute('aria-label'),expected.text);
   const geometry=await page.locator('.scene-image--current').evaluate(el=>{
    const style=getComputedStyle(el),rect=el.getBoundingClientRect();
    const dialogue=document.querySelector('.dialogue-text').getBoundingClientRect();
    return {animation:style.animationName,url:style.backgroundImage,x:rect.x,y:rect.y,w:rect.width,h:rect.height,textY:dialogue.y,scroll:document.documentElement.scrollWidth,inner:innerWidth};
   });
   assert.equal(geometry.animation,viewport.reduced||viewport.width/viewport.height<=.75?'none':'modern-r2-arrive','portrait action is statically painted; wide art has one short fade, never infinite drift');
   assert.ok(geometry.scroll<=geometry.inner+1,'no document horizontal overflow');
   if(viewport.width/viewport.height<=.75) {
    assert.match(geometry.url,/-m\.webp/,'original-quality mobile crop must load');
    assert.ok(geometry.y>=viewport.height*.09,'action window starts below navigation');
    assert.ok(geometry.y+geometry.h<=geometry.textY+1,`art action window stays above the reading line: ${label}/${viewport.width} ${JSON.stringify(geometry)}`);
   } else assert.doesNotMatch(geometry.url,/-m\.webp/,'landscape returns to wide art');
   if(out)await page.screenshot({path:`${out}/${viewport.width}x${viewport.height}-${label}${viewport.reduced?'-reduced':''}.png`});
   if(label==='carving' && viewport.width===390) {
    await page.setViewportSize({width:844,height:390});
    await page.waitForFunction(()=>!getComputedStyle(document.querySelector('.scene-image--current')).backgroundImage.includes('-m.webp'));
    await page.setViewportSize({width:390,height:844});
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('.scene-image--current')).backgroundImage.includes('-m.webp'));
    assert.equal(await page.getByTestId('dialogue-text').getAttribute('aria-label'),expected.text,'rotation keeps the page');
    if(!viewport.reduced) {
     await page.getByRole('button',{name:'回看',exact:true}).click();
     await page.getByRole('dialog').waitFor();
     await page.keyboard.press('Escape');
     await page.getByRole('button',{name:'自动',exact:true}).click();
     assert.equal(await page.getByRole('button',{name:'自动',exact:true}).getAttribute('aria-pressed'),'true');
     await page.getByRole('button',{name:'自动',exact:true}).click();
     const next=currentBeat(advance(state,profile),profile);
     await page.getByRole('button',{name:'快进',exact:true}).click();
     await page.waitForFunction(text=>document.querySelector('[data-testid="dialogue-text"]')?.getAttribute('aria-label')===text,next.text);
     await page.waitForFunction(()=>document.querySelector('[title="仅跳过已读 · 按住 Ctrl"]')?.getAttribute('aria-pressed')==='false');
    }
   }
   observed++;
   await page.getByRole('button',{name:'打开菜单',exact:true}).click();
   await page.getByRole('button',{name:/^回到标题/}).click();
   await page.getByRole('button',{name:/再点一次，回到标题/}).click();
  }
  assert.deepEqual(errors,[]);
  await context.close();
 }
 console.log(`Modern r2 staging passed: ${observed} normal-import render observations. Not a human playthrough or phone-device audit.`);
} finally {await browser.close();}
