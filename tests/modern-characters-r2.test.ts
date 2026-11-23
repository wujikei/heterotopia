import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { loadStory } from '../src/story';
import { compileScene, newGame, newProfile, sceneById, currentBeat } from '../src/engine';
import { actorForBeat } from '../src/actors';
import { actorPortraitName } from '../src/data/actorVariants';
import { MODERN_CHARACTER_STATES, MODERN_PERFORMANCE_BEATS } from '../src/data/modernPerformance';
import { portraitNameFor, availableExpression } from '../src/data/expressions';
import { charactersForCampaign } from '../src/data/world';
import { cgForBeat } from '../src/data/cgs';
import { modernAcceptanceSeed } from './helpers/modernAcceptance';

await loadStory('overseas');
await loadStory('original');

test('two modern characters have exactly six delivered, reachable transparent-expression assets', () => {
  const exports = JSON.parse(readFileSync('docs/art/modern-characters-r2-exports.json','utf8'));
  assert.equal(exports.length,12);
  for (const [key,states] of Object.entries(MODERN_CHARACTER_STATES)) {
    assert.equal(new Set(states).size,6);
    for (const expression of states) {
      assert.equal(availableExpression(key,expression),expression);
      const name=portraitNameFor(key,expression);
      assert.ok(exports.some((entry: {asset: string}) => entry.asset===name),name);
      for (const suffix of ['.webp','.avif','-m.webp','-m.avif']) assert.ok(existsSync(`public/art/${name}${suffix}`),`${name}${suffix}`);
    }
  }
  assert.equal(availableExpression('xu','thoughtful'),'default');
  assert.equal(portraitNameFor('xu','smile'),'portrait-xu-smile');
  assert.equal(portraitNameFor('xua','smile'),'portrait-xua-smile');
  assert.equal(charactersForCampaign('original').some(c=>c.key==='roommate'),false);
  assert.equal(charactersForCampaign('overseas')[0].key,'linyue');
});

test('each modern direction still matches its authored speaker and exact page, without replacing ancient Xu', () => {
  const p=newProfile('overseas'),g=newGame(p);
  for(const [id,direction] of Object.entries(MODERN_PERFORMANCE_BEATS)) {
    const sceneId=id.slice(0,id.indexOf(':')),scene=sceneById(sceneId),beats=compileScene(sceneId,p,g);
    const beat=beats.find(b=>b.id===id);
    assert.ok(beat?.kind==='text',id);
    assert.ok(beat.text.includes(direction.excerpt),`${id}: ${direction.excerpt}`);
    const actor=actorForBeat(beat,scene,beats);
    assert.equal(actor?.character.key,direction.character,id);
    assert.equal(actor?.expression,direction.expression,id);
    assert.equal(actorPortraitName(actor!),portraitNameFor(direction.character,direction.expression));
  }
  const beats=compileScene('modern-o-0-5',p,g),spoken=beats.find(b=>b.kind==='text'&&b.speaker==='林越');
  assert.ok(spoken);
  assert.equal(actorForBeat(spoken,sceneById('modern-o-0-5'),beats)?.character.key,'xu');
});

test('the roommate is in the familiar dorm for the question, while offscreen crisis remains a CG',()=>{
  const p=newProfile('overseas'),g=newGame(p);
  const returned=compileScene('modern-o-4-1',p,g);
  const question=returned.find(b=>b.id==='modern-o-4-1:20:0');
  assert.ok(question);
  assert.equal(question.background,'modern-dorm-quiet-r2');
  assert.equal(cgForBeat(question,'modern-o-4-1'),undefined);
  const crisis=compileScene('modern-o-0-2',p,g).find(b=>b.id==='modern-o-0-2:24:0');
  assert.ok(crisis);
  assert.ok(cgForBeat(crisis,'modern-o-0-2'));
  const noodles=returned.find(b=>b.id==='modern-o-4-1:24:0');assert.ok(noodles);
  assert.equal(cgForBeat(noodles,'modern-o-4-1')?.file,'cg-modern-noodles');
});

test('normal import seeds retain exact bookmark, inventory and engine-authored continuous history',()=>{
  for(const [scene,id,page] of [['modern-o-0-1','modern-o-0-1:18:0',17],['modern-o-0-2','modern-o-0-2:17:0',16],['modern-o-0-2','modern-o-0-2:21:0',20],['modern-o-0-2','modern-o-0-2:28:0',27]] as const) {
    const seed=modernAcceptanceSeed(scene,id);
    assert.equal(seed.acceptance.page,page);
    assert.deepEqual(JSON.parse(JSON.stringify(seed.state)),seed.state);
    assert.equal(currentBeat(seed.state,seed.profile).id,id);
    assert.ok(seed.state.history.length>0);
    assert.ok(seed.state.history.every(entry=>entry.kind==='text'&&entry.id!==id));
    for(const entry of seed.state.history) {
      const authored=compileScene(entry.sceneId,seed.profile,seed.state).find(b=>b.id===entry.id);
      assert.ok(authored?.kind==='text');assert.equal(entry.text,authored.text);
    }
    if(scene==='modern-o-0-2')assert.ok(seed.state.history.some(entry=>entry.sceneId==='modern-o-0-1'));
  }
});
