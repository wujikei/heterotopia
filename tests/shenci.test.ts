import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';
import { advance, campaignScenes, choose, compileScene, completeEnding, continueEnding, currentBeat, enterScene, loadStory, newGame, newProfile, recordProgress, sceneById } from '../src/engine';
import { actorForBeat, portraitCandidatesForActor } from '../src/actors';
import { SHENCI_STORY } from '../src/story';
import { validState } from '../src/storage';
import { MODERN_PHOTO_ART } from '../src/modern';
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
  const line=b.find(x=>x.kind==='text' && x.speaker==='沈辞')!;
  const actor=actorForBeat(line,s,b)!; assert.equal(actor.character.key,'xu'); assert.match(portraitCandidatesForActor(actor)[0],/^portrait-xu/);
  const photo=compileScene('modern-o-5-7',newProfile('overseas'),{choices:{},inventory:[]});
  assert.notEqual(photo.find(b=>b.id==='modern-o-5-7:16:0')?.background,MODERN_PHOTO_ART);
  assert.equal(photo.find(b=>b.id==='modern-o-5-7:17:0')?.background,MODERN_PHOTO_ART);
});
