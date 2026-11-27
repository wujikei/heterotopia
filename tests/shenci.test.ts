import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';
import { advance, campaignScenes, choose, compileScene, completeEnding, continueEnding, currentBeat, enterScene, loadStory, newGame, newProfile, recordProgress, restoreEditorialBookmark, sceneById } from '../src/engine';
import { actorForBeat, portraitCandidatesForActor } from '../src/actors';
import { SHENCI_STORY } from '../src/story';
import { validState } from '../src/storage';
import { scoreFrame, tracksForVisit } from '../src/score';
import { cgForBeat } from '../src/data/cgs';
import { MODERN_PHOTO_ART } from '../src/modern';
import { presentStoryText } from '../src/editorial';
import { slotPresentation } from '../src/savePresentation';
import { SHENCI_RETURN_ENDING } from '../src/shenci';
import type { GameState, Profile } from '../src/types';

await loadStory('shenci'); await loadStory('overseas'); await loadStory('original');
const fresh = () => newProfile('shenci');
const id = (n: string) => `shenci-${n}`;
function visit(n: string, p = fresh()) { return enterScene(newGame(p), p, id(n)); }
function passage(s: GameState, p: Profile, pick = '', until?: string) {
  const start = s.sceneId;
  for (let i = 0; i < 600; i++) {
    const b = currentBeat(s,p);
    if (s.sceneId !== start || b.kind === 'ending' || b.id === until) return s;
    const n = b.kind === 'choice' ? choose(s,p,b.choices.find(o => o.key === pick && !o.disabled)?.key ?? b.choices.find(o => !o.disabled)!.key) : advance(s,p);
    assert.notDeepEqual(n,s,`stuck at ${b.id}`);
    s=n;
  }
  throw new Error('No exit: ' + start);
}

test('all domestic scenes, author source hash, stage art and conditional references', () => {
  const scenes = campaignScenes('shenci'), ids = new Set(scenes.map(s => s.id));
  assert.equal(ids.size, SHENCI_STORY.sceneCount);
  assert.equal(createHash('sha256').update(readFileSync('public/原著剧本-沈辞新版.txt')).digest('hex'), SHENCI_STORY.sourceSha256);
  for (const s of scenes) {
    assert.ok(compileScene(s.id,fresh(),{choices:{}, inventory:[]}).length,s.id);
    for (const name of [s.background,...s.blocks.flatMap(b => b.background ?? [])]) assert.ok(existsSync(`public/art/${name}.webp`), name);
    for (const [i,b] of s.blocks.entries()) {
      if (b.when) assert.ok(s.blocks[Number(b.when.choice.split(':').at(-1))].options!.some(o => o.key === b.when!.value),`${s.id}:${i}`);
      for (const t of [s.next, s.redirect?.target, ...b.options?.map(o=>o.target) ?? []]) if (t) assert.ok(ids.has(t),t);
    }
  }
});

test('both starting routes end at both real modern returns, inventory resets, home unlocks', () => {
  for (const first of ['1','2']) {
    let p=fresh(), s=newGame(p), saw=new Set<string>(), firstCycleInventory='';
    for (let i=0;i<9000;i++) {
      saw.add(s.sceneId);
      p=recordProgress(s,p);
      const b=currentBeat(s,p);
      if (s.sceneId===id('d-1-13')) {
        if(s.cycle===1)firstCycleInventory=s.inventory.join();
        else assert.equal(s.inventory.join(),firstCycleInventory);
      }
      if(b.kind==='ending') {
        p=completeEnding(s,p);
        if(b.ending==='shenci-home') break;
        s=continueEnding(s,p);continue;
      }
      if(b.kind==='choice') {
        if(s.sceneId===id('d-1-13') && s.cycle===2) assert.ok(b.choices.find(o=>o.key===first)?.disabled);
        s=choose(s,p,s.sceneId===id('d-1-13') && s.cycle===1 ? first : b.choices.find(o=>!o.disabled)!.key);
      } else s=advance(s,p);
      if(i===8999)assert.fail(`no ending: ${s.beatId}`);
    }
    for(const n of ['d-0-1','d-1-12z','m-2-1','m-3-1','m-4-0','m-4-5','k-A-0','k-G-2','r-G-0']) assert.ok(saw.has(id(n)),n);
    assert.ok(p.endings.includes('shenci-home'));
    assert.ok(validState(s,'shenci'));
    assert.ok(!validState(s,'original') && !validState(s,'overseas'));
  }
});

test('all ten royal endings and all ten Kunlun variants have executable branches', () => {
  const p={ ...fresh(), visited:[id('r-D-5'),id('r-D-7')] };
  const gates: Record<string, string[]>={'r-D-12':['E1-1','G1-1','G2-1'],'r-D-13':['E2-1','S-1','H-1','O-1'],'k-F-6':['G-1','X-1','N-1','Y-1','J-1','F-7'],'k-F-7':['S-1','M-1','T-1','H-1','L-1','Z-1']};
  for(const [gate,targets] of Object.entries(gates)){
    for(let i=0;i<targets.length;i++){
      let s=visit(gate,p);s={...s,choices:{[`${id('k-F-4')}:1`]:'1'}};
      s=passage(s,p,String(i+1));assert.equal(s.sceneId,id(gate[0]+'-'+targets[i]));
      if(gate[0]==='k' && !['F-7','G-1'].includes(targets[i])){
        for(let j=0;j<12 && s.sceneId!==id('k-G-1');j++)s=passage(s,p);
        assert.equal(s.sceneId,id('k-G-1'));
      }
    }
  }
  const endings=campaignScenes('shenci').filter(s=>s.ending?.startsWith('shenci-royal-'));
  assert.equal(endings.length,10);
  for (const s of endings) {
    const end=passage(visit(s.id.slice(7),p),p);
    assert.equal(currentBeat(end,p).kind,'ending');
    assert.match(continueEnding(end,p).sceneId,/^shenci-(?:m-2-1|r-G-0)$/);
  }
  assert.equal(passage(visit('r-C-12',p),p,'3').sceneId,id('r-L-1'));
  assert.equal(passage(visit('r-C-12',p),p,'4').sceneId,id('r-F-1'));
  assert.equal(passage(visit('r-C-1b',p),p,'2').sceneId,id('r-R-1'));
});

test('both outcomes of local choices converge without swallowing shared prose', () => {
  for (const [scene,proof] of [['d-1-5','摊主放下木棍'],['d-1-7','他退到岸上'],['d-1-12d','海里呢'],['d-1-12g','吾将上下而求索']]) {
    const sid=id(scene), p=fresh();
    const first=compileScene(sid,p,{inventory:[],choices:{}}).find(b=>b.kind==='choice')!;
    for(const k of ['1','2']) assert.ok(compileScene(sid,p,{inventory:[],choices:{[first.id]:k}}).some(b=>b.kind==='text'&&b.text.includes(proof)),`${scene}:${k}`);
  }
});

test('domestic ancient Shen Ci keeps Xu art, and new overseas photo only cuts on shutter', () => {
  const s=sceneById(id('d-1-3a')), b=compileScene(s.id,fresh(),{choices:{},inventory:[]});
  const line=b.find(x=>x.kind==='text' && ['沈辞','戌'].includes(x.speaker))!;
  const actor=actorForBeat(line,s,b)!; assert.equal(actor.character.key,'xu'); assert.match(portraitCandidatesForActor(actor)[0],/^portrait-xu/);
  const photo=compileScene('modern-o-5-7',newProfile('overseas'),{choices:{},inventory:[]});
  assert.notEqual(photo.find(b=>b.id==='modern-o-5-7:16:0')?.background,MODERN_PHOTO_ART);
  assert.equal(photo.find(b=>b.id==='modern-o-5-7:17:0')?.background,MODERN_PHOTO_ART);
});

test('domestic hiking cuts and the final score follow the authored handoff, impact and reply', () => {
  const state = { choices: {}, inventory: [] };
  const ascent = compileScene('shenci-m-4-4', fresh(), state);
  const overlook = compileScene('shenci-m-4-5', fresh(), state);
  for (const [beats, scene, page, art] of [
    [ascent, 'shenci-m-4-4', '22:0', 'modern-mountain-path'],
    [ascent, 'shenci-m-4-4', '23:0', 'cg-modern-hike-tang'],
    [ascent, 'shenci-m-4-4', '24:0', 'cg-modern-hike-tang'],
    [ascent, 'shenci-m-4-4', '25:0', 'modern-mountain-path'],
    [overlook, 'shenci-m-4-5', '2:0', 'cg-modern-hike-terrace'],
    [overlook, 'shenci-m-4-5', '3:0', 'cg-modern-hike-rail'],
    [overlook, 'shenci-m-4-5', '5:0', 'cg-modern-hike-pickup'],
    [overlook, 'shenci-m-4-5', '6:0', 'cg-modern-hike-pickup'],
    [overlook, 'shenci-m-4-5', '7:0', 'cg-modern-hike-return'],
    [overlook, 'shenci-m-4-5', '14:0', 'cg-modern-hike-held'],
    [overlook, 'shenci-m-4-5', '15:0', 'cg-modern-hike-invitation'],
    [overlook, 'shenci-m-4-5', '17:0', 'cg-modern-hike-held'],
    [overlook, 'shenci-m-4-5', '19:0', 'cg-modern-hike-held'],
    [overlook, 'shenci-m-4-5', '20:0', 'cg-modern-hike-lookback'],
    [overlook, 'shenci-m-4-5', 'ending', 'cg-modern-hike-lookback'],
  ] as const) {
    const beat = beats.find(candidate => candidate.id === `${scene}:${page}`)!;
    assert.equal(beat.background, art);
    if (art.startsWith('cg-')) assert.equal(cgForBeat(beat, scene)?.file, art);
  }
  const score = overlook.map(beat => scoreFrame('shenci-m-4-5', beat));
  assert.deepEqual(score.flatMap(frame => frame.events.filter(event => event.effects.length)), [
    { id: 'shenci-m-4-5:3:0', effects: [{ id: 'bottle-rail', gain: .48, at: .04, pan: .08 }] },
  ]);
  assert.ok(score.slice(0, -2).every(frame => frame.music === null));
  assert.ok(score.slice(-2).every(frame => frame.music === 'shenci-lookback'));
  assert.ok(tracksForVisit('shenci-m-4-5').includes('shenci-lookback'));
});


test('domestic sections follow stable scene positions and keep even the longest section under 32 data pages', () => {
  let longestSection = 0;
  for (const scene of campaignScenes('shenci')) {
    const cuts = (scene.sections ?? [{ start: 0 }]).map(section=>section.start).concat(scene.blocks.length);
    for(let i=0;i<cuts.length-1;i++) {
      const size=scene.blocks.slice(cuts[i],cuts[i+1]).reduce((sum,b)=>sum+(b.options ? 1 : b.pages?.length ?? 0),0);
      longestSection=Math.max(longestSection,size);
    }
  }
  assert.ok(longestSection<=31);
  assert.ok(sceneById('shenci-r-C-1a').sections!.some(s=>s.title.includes('算盘')));
  const p=fresh(), s=newGame(p);
  assert.equal(validState({...s,scriptRevision:undefined},'shenci'),false);
});

test('domestic score follows jokes, storm and silence; one-shot accents attach to the intended pages', () => {
  const frame=(id:string,find:(text:string)=>boolean)=>{
    const p=fresh(); const b=compileScene(id,p,{choices:{},inventory:[]}).find(b=>b.kind==='text'&&find(b.text))!;
    assert.ok(b,id);return scoreFrame(id,b);
  };
  const woke=frame('shenci-d-0-1',text=>text.includes('从床上坐起来'));
  assert.equal(woke.music,'paper-note');assert.ok(woke.events.some(e=>e.effects.some(f=>f.id==='alarm')));
  const market = frame('shenci-d-1-5',s=>s.includes('两只鸡谁也不理'));
  assert.equal(market.music,'shenci-playful');
  assert.deepEqual(market.ambience.map(([id]) => id), ['wind']);
  assert.equal(frame('shenci-d-1-5',s=>s.includes('笑到一半，脸上僵住了')).music,'old-jade');
  const chalk = frame('shenci-d-0-10',s=>s.includes('正抄黑板') || s.includes('古图上'));
  assert.equal(chalk.prepareMusic, 'under-current');
  const marsh = frame('shenci-d-0-11',s=>s.includes('血红色的沼泽'));
  assert.ok(marsh.events.some(event => event.effects.some(effect => effect.id === 'splash')));
  assert.equal(currentBeat({...visit('d-0-11'), beatId: 'shenci-d-0-11:17:0'}, fresh()).background,'marsh');
  const ritual = frame('shenci-d-1-2',s=>s.includes('鸡鸣'));
  assert.equal(ritual.music,'ritual');
  assert.ok(ritual.releaseBeforeLoad && ritual.transition < 1);
  assert.equal(frame('shenci-d-1-12a',s=>s.includes('第一夜')).music,'chu-night-river');
  assert.ok(tracksForVisit('shenci-d-1-12z').includes('chu-night-river'));
  const storm = frame('shenci-k-D-5',s=>s.includes('风从囊里冲出来'));
  assert.equal(storm.music,'chu-storm');
  assert.equal(storm.releaseBeforeLoad,true);
  assert.equal(frame('shenci-k-D-6',s=>s.includes('雨不是下的')).music,'chu-storm');
  const fall = frame('shenci-k-D-6',s=>s.includes('风，忽然小了'));
  assert.equal(fall.music,null);
  assert.deepEqual(fall.ambience,[['river', .23]]);
  assert.equal(frame('shenci-k-D-7',s=>s.includes('六个人坐在空舱')).music,null);
  const shoal=frame('shenci-k-G-1',s=>s.includes('那只小舟很轻'));assert.equal(shoal.music,null);assert.deepEqual(shoal.ambience,[]);
  const firstReturn = frame('shenci-m-2-1',s=>s.includes('睁开眼'));
  assert.equal(firstReturn.music, null);
  assert.ok(firstReturn.releaseBeforeLoad);
  assert.deepEqual(firstReturn.ambience, [['room', .18]]);
  assert.deepEqual(frame('shenci-m-3-1',s=>s.includes('靠岸的小舟')).ambience, [['river', .16]]);
  assert.deepEqual(frame('shenci-m-3-1',s=>s.includes('睁开眼')).ambience, [['room', .18]]);
});

test('Shenci narration, old bookmarks and returning branches preserve the intended speaker and passage', () => {
  const profile = fresh();
  const narrative = (scene: string, page: string, choices: GameState['choices'] = {}) => {
    const state = {...visit(scene, profile), beatId: `shenci-${scene}:${page}`, choices};
    const beat = currentBeat(state, profile);
    assert.equal(beat.kind, 'text');
    assert.equal(beat.id, state.beatId);
    return presentStoryText(beat.id, beat.text);
  };
  assert.match(narrative('d-0-4','4:0'), /周围响起笑声/);
  assert.match(narrative('r-C-1a','108:0', {'shenci-r-C-1a:107': '1'}), /这王位/);
  assert.match(narrative('r-C-8','2:0'), /持刃站在王背后/);
  assert.match(narrative('k-Z-6','6:0'), /靠在了船板上/);
  assert.match(narrative('k-Z-7','7:0'), /药铺的柜台角上/);
  const porridge = {...visit('k-G-2', profile), beatId: 'shenci-k-G-2:2:0'};
  assert.match(slotPresentation(porridge, profile).excerpt, /临行那天/);
  const omitted = {...visit('d-1-11', profile), beatId: 'shenci-d-1-11:0:0'};
  assert.equal(restoreEditorialBookmark(omitted, profile).beatId, 'shenci-d-1-11:3:0');

  const returnState = visit('m-2-1', profile);
  const beforeFix = {...returnState, beatId: 'shenci-m-2-1:2:0'};
  assert.equal(restoreEditorialBookmark(beforeFix, profile).beatId, 'shenci-m-2-1:4:0');
  const fallenCity = {...beforeFix, choices: {[SHENCI_RETURN_ENDING]: 'shenci-royal-g1'}};
  assert.equal(restoreEditorialBookmark(fallenCity, profile).beatId, beforeFix.beatId);
  assert.match(narrative('m-2-1','4:0'), /睁开眼/);

  for (const scene of campaignScenes('shenci')) {
    const beats = compileScene(scene.id, profile, {choices: {}, inventory: []});
    for (const beat of beats) {
      if (beat.kind !== 'text') continue;
      assert.doesNotMatch(presentStoryText(beat.id, beat.text), /\b[A-Z]\d?[-－–]\d+|\b\d+-\d+[a-z]\b|统一模糊朦胧虚化处理|全剧最瑰丽|幕前·起因|【间场】|最后一个镜头/, beat.id);
    }
  }
});
