import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { advance, campaignScenes, choose, compileScene, completeEnding, continueEnding, currentBeat, enterScene, newGame, newProfile, recordProgress, revisitScene } from '../src/engine';
import { loadStory, MODERN_SCENES } from '../src/story';
import { actorForBeat } from '../src/actors';
import { modernComplete, MODERN_ENDINGS, MODERN_RETURN_ENDING, restoreModernState } from '../src/modern';
import type { GameState, Profile } from '../src/types';

await loadStory('overseas');

function readToBoundary(state: GameState, profile: Profile, choice: (scene: string) => string = () => '1', stopAtInterlude = false) {
  const seen = new Set<string>();
  for (let steps = 0; steps < 6000; steps++) {
    profile = recordProgress(state, profile);
    const beat = currentBeat(state, profile);
    seen.add(state.sceneId);
    if (beat.kind === 'ending') return { state, profile: completeEnding(state, profile), seen, beat };
    if (stopAtInterlude && beat.kind === 'choice' && ['modern-o-4-1','modern-o-4-2'].includes(state.sceneId)) return { state, profile, seen, beat };
    const next = beat.kind === 'text' ? advance(state, profile) : choose(state, profile, choice(state.sceneId));
    assert.notDeepEqual(next, state, `Stalled at ${state.sceneId}/${beat.id}`);
    state = next;
  }
  assert.fail('Modern journey did not reach a boundary');
}

test('both source corpora stay separate, every new scene compiles and narrative pages are lossless', () => {
  assert.equal(campaignScenes().length, 81);
  assert.ok(MODERN_SCENES.length > 100);
  const source = readFileSync(new URL('../最新/异托邦_海外版现代线_独立卷.txt', import.meta.url), 'utf8');
  const adaptations: { scene: string; block: number; source: string; text: string }[] = JSON.parse(readFileSync(new URL('../scripts/modern-adaptations.json', import.meta.url), 'utf8'));
  const modernIds = ['0-1','0-2','4-1','4-2','5-1','5-2','5-3','5-4','5-5','5-6','5-7'];
  for (const id of modernIds) {
    const scene = MODERN_SCENES.find(s => s.id === `modern-o-${id}`)!;
    assert.ok(scene, id);
    for (const [index, block] of scene.blocks.entries()) {
      if (!block.pages) continue;
      assert.equal(block.pages.join(''), block.lines.join(''), `${scene.id} text changed while splitting`);
      const adaptation = adaptations.find(patch => patch.scene === scene.id && patch.block === index);
      if (adaptation) {
        assert.ok(source.includes(adaptation.source), `Adaptation lost its supplied-source anchor: ${scene.id}:${index}`);
        assert.deepEqual(block.lines, [adaptation.text]);
      } else {
        for (const line of block.lines) assert.ok(source.includes(line), `Not in supplied modern volume: ${line}`);
      }
    }
  }
  for (const scene of MODERN_SCENES) {
    const state = enterScene(newGame(newProfile('overseas')), newProfile('overseas'), scene.id);
    assert.ok(currentBeat(state, newProfile('overseas'))?.id.startsWith(scene.id + ':'), scene.id);
  }
  const overseas = newProfile('overseas');
  const opening = compileScene('modern-o-0-1', overseas, { choices: {}, inventory: [] });
  assert.equal(opening.find(beat => beat.kind === 'text')?.background, 'modern-street-arrival-r3');
  assert.equal(opening.find(beat => beat.id === 'modern-o-0-1:7:0')?.background, 'cg-modern-word-stall-r3');
  assert.equal(opening.find(beat => beat.id === 'modern-o-0-1:18:0')?.background, 'cg-modern-jade-palm-r2');
  const projection = compileScene('modern-o-0-2', overseas, { choices: {}, inventory: [] });
  assert.equal(projection.find(beat => beat.id === 'modern-o-0-2:17:0')?.background, 'cg-modern-dorm-carving-r2');
  for (const sceneId of ['modern-o-4-1', 'modern-o-4-2']) {
    const backgrounds = compileScene(sceneId, overseas, { choices: {}, inventory: [] }).map(beat => beat.background);
    assert.ok(!backgrounds.some(background => ['river', 'light-river', 'palace', 'ruins'].includes(background)), `${sceneId} should remain staged in the modern world`);
  }
});

for (const first of ['royal','kunlun']) test(`${first} first: each route returns to its own modern chapter, then the full modern finale`, () => {
  const profile = newProfile('overseas');
  const start = newGame(profile);
  assert.equal(start.sceneId, 'modern-o-0-1');
  let forkCount = 0;
  const option = (scene: string) => scene === 'modern-c-1-13' ? (++forkCount === 1 ? first === 'royal' ? '1' : '2' : first === 'royal' ? '2' : '1') : scene === 'modern-o-2-6' ? '4' : '1';
  const a = readToBoundary(start, profile, option);
  assert.equal(a.beat.kind === 'ending' ? a.beat.ending : '', first === 'royal' ? 'modern-royal-e1' : 'modern-kunlun');
  assert.ok(!modernComplete(a.profile));
  const interludeStart = continueEnding(a.state, a.profile);
  assert.equal(interludeStart.sceneId, first === 'royal' ? 'modern-o-4-1' : 'modern-o-4-2');
  const interlude = readToBoundary(interludeStart, a.profile, undefined, true);
  assert.equal(interlude.beat.kind, 'choice');
  const secondStart = choose(interlude.state, interlude.profile, 'return');
  assert.equal(secondStart.sceneId, 'modern-c-1-13');
  assert.equal(secondStart.cycle, 2);
  assert.deepEqual(secondStart.inventory, ['jadeTail', 'birds', 'box'], 'the modern jade stays in the modern world; the box supplied only the ancient objects');
  const b = readToBoundary(secondStart, interlude.profile, scene => scene === 'modern-c-1-13' ? first === 'royal' ? '2' : '1' : scene === 'modern-o-2-6' ? '4' : '1');
  assert.ok(modernComplete(b.profile));
  const finalInterlude = readToBoundary(continueEnding(b.state, b.profile), b.profile, undefined, true);
  assert.ok(finalInterlude.beat.kind === 'choice');
  assert.deepEqual(finalInterlude.beat.choices.map(option => option.target), ['modern-o-5-1']);
  const finalStart = choose(finalInterlude.state, finalInterlude.profile, 'return');
  const finale = readToBoundary(finalStart, finalInterlude.profile);
  assert.equal(finale.beat.kind === 'ending' && finale.beat.ending, 'modern-home');
  for (let n=1;n<=7;n++) assert.ok(finale.seen.has(`modern-o-5-${n}`));
  assert.ok(![...a.seen,...b.seen,...finale.seen].some(id => !id.startsWith('modern-')));
});

test('culture reflections are exclusive; the interlude cannot unlock a finale from V6 progress', () => {
  const p = newProfile('overseas');
  const start = enterScene(newGame(p), p, 'modern-o-2-6', true);
  const state = choose(start, p, '2');
  const texts: string[] = [];
  let cursor = state;
  while (cursor.sceneId === state.sceneId) {
    const beat = currentBeat(cursor, p);
    if (beat.kind !== 'text') break;
    texts.push(beat.text);
    cursor = advance(cursor,p);
  }
  assert.ok(texts.join('').includes('伊本·西那'));
  assert.ok(!texts.join('').includes('苏格拉底'));
  assert.ok(!texts.join('').includes('佛陀'));
  const old = { ...p, endings: ['blade' as const, 'kunlun' as const], visited:['modern-o-5-1'] };
  assert.equal(revisitScene(start, old, 'modern-o-5-1'), start);
});

test('playable intra-scene choices show only their selected authored response', () => {
  const p = newProfile('overseas');
  const read = (sceneId: string, choiceId: string, option: string) => compileScene(sceneId, p, { inventory: [], choices: { [choiceId]: option } })
    .filter(beat => beat.kind === 'text').map(beat => beat.kind === 'text' ? beat.text : '').join('');
  const home = read('modern-r-C-1a', 'modern-r-C-1a:24', '4');
  assert.ok(home.includes('粮仓'));
  assert.ok(!home.includes('边关的将士'));
  const soldier = read('modern-r-C-1a', 'modern-r-C-1a:24', '2');
  assert.ok(soldier.includes('脸僵了一瞬'));
  assert.ok(!soldier.includes('粮仓'));
  const river = read('modern-k-F-5', 'modern-k-F-5:16', '2');
  assert.ok(river.includes('目光不冷，也不暖'));
  assert.ok(!river.includes('（所有的蓝，开始变淡。'));
});

test('Lin Yue retains his face in modern scenes and uses Xu in the ancient body', () => {
  const p=newProfile('overseas');
  for (const [id,key] of [['modern-o-0-1','linyue'],['modern-o-0-5','xu']]) {
    let state=enterScene(newGame(p),p,id);
    const scene=MODERN_SCENES.find(s=>s.id===id)!;
    for(let n=0;n<100 && state.sceneId===id;n++) {
      const beat=currentBeat(state,p);
      if(beat.kind==='text' && beat.speaker==='林越') {
        assert.equal(actorForBeat(beat,scene,[])?.character.key,key); break;
      }
      if(beat.kind!=='text') assert.fail('Unexpected boundary');
      state=advance(state,p);
    }
  }
});

test('the two authored crisis choices enter different ending routes', () => {
  const profile = newProfile('overseas');
  const start = newGame(profile);
  const scene = MODERN_SCENES.find(item => item.id === 'modern-r-C-12')!;
  const choices = scene.blocks.find(block => block.options)?.options ?? [];
  assert.deepEqual(choices.map(option => option.target), ['modern-r-D-1','modern-r-E2-1','modern-r-L-1','modern-r-F-1']);
  const decision = MODERN_SCENES.find(item => item.id === 'modern-r-D-11')!;
  assert.deepEqual(decision.blocks.find(block => block.options)?.options?.map(option => option.target), ['modern-r-D-12','modern-r-E2-1','modern-r-L-1']);
  assert.equal(start.sceneId,'modern-o-0-1');
});

test('only modern prose, the final chapter and later ancient scenes include Xu, not V6 saves', () => {
  const p = newProfile('overseas');
  const scene = MODERN_SCENES.find(item => item.id === 'modern-o-0-8')!;
  const state = enterScene(newGame(p), p, scene.id);
  const next = recordProgress(state, p);
  assert.ok(next.met.includes('xu'));
  assert.ok(!p.met.includes('xu'));
});

const royalTerminals = ['E1-7','E2-7','G1-8','G2-8','L-8','S-8','H-8','R-6','F-6','O-10'];
for (const terminal of royalTerminals) for (const order of ['royal-first', 'kunlun-first']) test(`${terminal} ${order}: its own memory returns, both journeys still unlock the finale`, () => {
  let profile = newProfile('overseas');
  let initial = newGame(profile);
  if (order === 'kunlun-first') {
    const first = readToBoundary(enterScene(initial, profile, 'modern-k-G-1'), profile);
    assert.equal(first.beat.kind === 'ending' && first.beat.ending, 'modern-kunlun');
    const back = readToBoundary(continueEnding(first.state, first.profile), first.profile, undefined, true);
    profile = back.profile;
    initial = choose(back.state, profile, 'return');
  }
  // Start at every supported terminal, not just the default E1 path.
  const royal = readToBoundary(enterScene(initial, profile, `modern-r-${terminal}`), profile);
  assert.equal(royal.beat.kind, 'ending');
  if (royal.beat.kind !== 'ending') assert.fail('Expected ending');
  const endingId = royal.beat.ending;
  const returned = continueEnding(royal.state, royal.profile);
  assert.equal(returned.sceneId, 'modern-o-4-1');
  assert.equal(returned.choices[MODERN_RETURN_ENDING], royal.beat.ending);
  const memory = Object.entries(MODERN_ENDINGS).find(([id]) => id === endingId)?.[1].quote;
  assert.ok(memory);
  const texts = compileScene(returned.sceneId, royal.profile, returned).filter(beat => beat.kind === 'text').map(beat => beat.kind === 'text' ? beat.text : '').join('');
  assert.ok(texts.includes(memory));
  assert.doesNotMatch(texts, /城破那一下之后|古图|脚踝那圈墨|记了几百个名字/);
  assert.deepEqual(returned.inventory, ['questionJade']);
  const restored = restoreModernState(JSON.parse(JSON.stringify(returned)));
  assert.equal(currentBeat(restored, royal.profile).id, returned.beatId);
  const back = readToBoundary(restored, royal.profile, undefined, true);
  const onward = choose(back.state, back.profile, 'return');
  let both = back.profile;
  let finalStart = onward;
  if (order === 'royal-first') {
    assert.equal(onward.sceneId, 'modern-c-1-13');
    const kunlun = readToBoundary(onward, back.profile, scene => scene === 'modern-c-1-13' ? '2' : '1');
    assert.equal(kunlun.beat.kind === 'ending' && kunlun.beat.ending, 'modern-kunlun');
    const modern = readToBoundary(continueEnding(kunlun.state, kunlun.profile), kunlun.profile, undefined, true);
    both = modern.profile;
    finalStart = choose(modern.state, both, 'return');
  }
  assert.ok(modernComplete(both));
  assert.equal(finalStart.sceneId, 'modern-o-5-1');
  const final = readToBoundary(finalStart, both);
  assert.equal(final.beat.kind === 'ending' && final.beat.ending, 'modern-home');
});

for (const terminal of ['X-6','N-6','Y-6','J-6','S-6','M-6','T-6','H-6','L-6','Z-6']) test(`Kunlun ${terminal}: its shared boat ending returns to the authored modern chapter`, () => {
  const profile = newProfile('overseas');
  const ending = readToBoundary(enterScene(newGame(profile), profile, `modern-k-${terminal}`), profile);
  assert.equal(ending.beat.kind === 'ending' && ending.beat.ending, 'modern-kunlun');
  const returned = continueEnding(ending.state, ending.profile);
  assert.equal(returned.sceneId, 'modern-o-4-2');
  const prose = compileScene(returned.sceneId, ending.profile, returned).filter(beat => beat.kind === 'text').map(beat => beat.kind === 'text' ? beat.text : '').join('');
  assert.match(prose, /靠岸的小舟/);
  assert.doesNotMatch(prose, /古图|城破那一下/);
});

test('an old interlude save with no ending marker stays readable without guessing its past ending', () => {
  const profile = newProfile('overseas');
  const state = { ...enterScene(newGame(profile), profile, 'modern-o-4-1'), beatId: 'modern-o-4-1:7:0', inventory: ['map','questionJade'], choices: { 'old-choice': '1' } };
  const restored = restoreModernState(state);
  assert.deepEqual(restored.inventory, ['questionJade']);
  assert.equal(restored.beatId, state.beatId);
  assert.deepEqual(restored.choices, state.choices);
  const beat = currentBeat(restored, profile);
  assert.equal(beat.kind === 'text' && beat.text, '（玉扣上的“何”字，刻痕还在。）');
});

test('return memory follows this playthrough even after replaying an already unlocked ending', () => {
  const profile = { ...newProfile('overseas'), endings: ['modern-royal-o' as const, 'modern-royal-e1' as const] };
  const ending = readToBoundary(enterScene(newGame(profile), profile, 'modern-r-O-10'), profile);
  const returned = continueEnding(ending.state, ending.profile);
  assert.equal(returned.choices[MODERN_RETURN_ENDING], 'modern-royal-o');
  const memory = compileScene(returned.sceneId, ending.profile, returned).find(beat => beat.id === 'modern-o-4-1:7:0');
  assert.equal(memory?.kind === 'text' && memory.text.includes(MODERN_ENDINGS['modern-royal-o'].quote), true);
});
