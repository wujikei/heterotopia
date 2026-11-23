import { MODERN_SCENES, SCENES, isStoryReady } from './story';
import { CHARACTERS, MODERN_CHARACTERS } from './data/world';
import { timeOfDayBackground } from './data/timeOfDay';
import { campaignOf, isModern, modernBackground, modernComplete, modernHasKunlun, modernHasRoyal, modernInterlude, modernInventory, MODERN_SCENE_ART } from './modern';
import type { Beat, Campaign, ChoiceBeat, EndingId, GameState, Profile, Scene, TextBeat } from './types';

export { STORY, SCENES, loadStory, isStoryReady } from './story';
export const sceneById = (id: string) => (isModern(id) ? MODERN_SCENES : SCENES).find(scene => scene.id === id) ?? SCENES[0];
export const campaignScenes = (campaign: Campaign = 'original') => campaign === 'overseas' ? MODERN_SCENES : SCENES;
export const hasRoyal = (profile: Profile) => campaignOf(profile) === 'overseas' ? modernHasRoyal(profile) : profile.endings.some(e => ['blade', 'mercy', 'leave', 'names'].includes(e));
export const hasKunlun = (profile: Profile) => campaignOf(profile) === 'overseas' ? modernHasKunlun(profile) : profile.endings.includes('kunlun');
export const canReturn = (profile: Profile) => hasRoyal(profile) && hasKunlun(profile);
export const newProfile = (campaign: Campaign = 'original'): Profile => ({ version: 1, ...(campaign === 'overseas' ? { campaign } : {}), visited: [], read: [], art: ['hero'], met: [], endings: [], oldNames: false });

const unique = <T,>(values: T[]) => [...new Set(values)];

function conditionMatches(tag: string, profile: Profile, choices: Record<string, string>): boolean {
  if (tag === '若选A') return choices.breakfast === 'A';
  if (tag === '若选B') return choices.breakfast === 'B';
  if (tag === '若已完成王裔路线') return hasRoyal(profile);
  if (tag === '若尚未完成王裔路线') return !hasRoyal(profile);
  if (tag === '若曾完成“留人”') return profile.endings.includes('mercy');
  if (tag === '若已完成王裔路线且未曾完成“留人”') return hasRoyal(profile) && !profile.endings.includes('mercy');
  if (tag === '若曾完成“问名”') return profile.endings.includes('names');
  if (tag === '若曾完成“举刃”') return profile.endings.includes('blade');
  return false;
}

function chooseBackground(scene: Scene, text: string, fallback: string): string {
  if (scene.id === '0-1') {
    if (text.startsWith('黑。')) return 'dream-boat';
    if (text.startsWith('卧室')) return 'bedroom';
  }
  if (scene.id === '0-7' && text.includes('雾')) return 'shrine';
  if (scene.id === '0-8') {
    if (text.includes('食堂')) return 'classroom-day';
    if (text.includes('沈家')) return 'home';
  }
  if (scene.id === 'A-6' && text.startsWith('书房')) return 'study';
  if (scene.id === 'A-H-1') return 'light-river';
  if (scene.id === '终-4' && text.includes('卧室')) return 'bedroom';
  return fallback;
}

function makeChoices(scene: Scene, base: Omit<ChoiceBeat, 'kind' | 'prompt' | 'choices'>, profile: Profile, inventory: string[]): ChoiceBeat {
  const prompts: Record<string, string> = {
    '0-2': '有些话，还没想好怎么说。',
    '1-12': '上车，是你的脚。上船，也是你的脚。',
    'A-6': '旧箱里，还有没问完的名字。',
    'A-9': '仍活着的人，都在这一夜。',
  };
  const options: Record<string, ChoiceBeat['choices']> = {
    '0-2': [
      { key: 'A', title: '先到楼下等', detail: '加快吃完，离开这张餐桌。' },
      { key: 'B', title: '慢慢吃', detail: '让这一顿早饭过去。' },
    ],
    '1-12': [
      { key: 'A', title: '往村口去', detail: '先问玉与这具身体的来历，再寻找回家的路。', target: 'A-1' },
      { key: 'B', title: '往河边去', detail: '与那些孩子同行，寻找古图上未尽的山路。', target: 'B-1' },
    ],
    'A-6': [
      { key: 'A', title: '追问旧队名简', detail: '问问屈衡旧箱里，那十个孩子的名字。', target: 'A-6a' },
      { key: 'B', title: '收起玉', detail: '准备大祭。', target: 'A-7' },
    ],
    'A-9': [
      { key: 'A', title: '举刃', detail: '举铃还击，公开先王之子的身份。', target: 'A-E1-1' },
      { key: 'B', title: '留人', detail: '以身份与证物，换乐工、宫人与府中人退场。', target: 'A-E2-1' },
      { key: 'C', title: '离席', detail: '不再替王室落座，带着玉离开祭台。', target: 'A-E3-1' },
      { key: 'D', title: '问名', detail: '以三玉问旧日未归的人。', target: 'A-H-1', disabled: !profile.oldNames || !['jadeHead', 'jadeBody', 'jadeTail'].every(id => inventory.includes(id)), hint: !profile.oldNames ? '尚有未问过的名字' : '本轮需亲自取得三玉' },
    ],
  };
  return { ...base, kind: 'choice', prompt: prompts[scene.id] ?? '你将如何选择？', choices: options[scene.id] ?? [] };
}

export function compileScene(sceneId: string, profile: Profile, state: Pick<GameState, 'choices' | 'inventory'>): Beat[] {
  if (!isStoryReady(isModern(sceneId) ? 'overseas' : 'original')) throw new Error('剧情尚未载入，请先 await loadStory()。');
  const scene = sceneById(sceneId);
  if (scene.script === 'modern') return compileModernScene(scene, profile, state);
  const beats: Beat[] = [];
  let background = scene.background;
  let cast: string[] = [];
  let atmosphere = '';
  let audioCueId = '';
  let direction = '';
  let active = true;
  scene.blocks.forEach((block, blockIndex) => {
    const tag = block.tag;
    const mainTag = tag.split('·')[0];
    const text = block.lines.join('\n');
    if (tag.startsWith('若')) { active = conditionMatches(tag, profile, state.choices); return; }
    if (tag === '共同剧情') { active = true; return; }
    if (!active) return;
    const base = () => ({ id: `${sceneId}:${blockIndex}`, background, cast: [...cast], atmosphere, audioCueId, direction });
    if (mainTag === '背景') { background = chooseBackground(scene, text, scene.background); return; }
    if (mainTag === '立绘') { cast = CHARACTERS.filter(c => text.includes(c.name)).map(c => c.key); return; }
    if (mainTag === '音效') { atmosphere = text; audioCueId = `${sceneId}:${blockIndex}`; return; }
    if (mainTag === '演出') { direction = text; return; }
    if (tag === '选择') { beats.push(makeChoices(scene, base(), profile, state.inventory)); return; }
    if (tag === '路线提示' || tag === '记录') return;
    if (tag === '分支结束' || tag === '路线结束') {
      const endings: Record<string, EndingId> = { 'A-E1-2': 'blade', 'A-E2-4': 'mercy', 'A-E3-3': 'leave', 'A-H-1': 'names', 'B-13': 'kunlun' };
      beats.push({ ...base(), kind: 'ending', ending: endings[sceneId] });
      return;
    }
    const [name, ...moods] = tag.split('·');
    const speaker = name === '旁白' ? '' : name;
    const mood = moods.join('·');
    (block.pages ?? block.lines).forEach((page, pageIndex) => {
      // The original paragraph moves home without another background tag.
      // Keep page IDs and text intact while staging the actual location.
      if (sceneId === '终-4' && blockIndex === 12 && pageIndex === 4) background = 'bedroom';
      beats.push({ ...base(), id: `${sceneId}:${blockIndex}:${pageIndex}`, kind: 'text', speaker, mood, text: page });
    });
    direction = '';
  });
  if (sceneId === '终-5') beats.push({ id: '终-5:ending', kind: 'ending', ending: 'home', background, atmosphere, audioCueId, cast, direction: '' });
  return beats.map(beat => ({ ...beat, background: timeOfDayBackground(sceneId, beat) }));
}

function compileModernScene(scene: Scene, profile: Profile, state: Pick<GameState, 'choices' | 'inventory'>): Beat[] {
  const beats: Beat[] = [];
  let background = MODERN_SCENE_ART[scene.id] ?? scene.background, atmosphere = '', audioCueId = '', direction = '';
  let cast: string[] = [];
  scene.blocks.forEach((block, index) => {
    if (block.domesticOnly || block.when && state.choices[block.when.choice] !== block.when.value) return;
    const text = block.lines.join('\n');
    const tag = block.tag.split('·')[0];
    const base = () => ({ id: `${scene.id}:${index}`, background, atmosphere, audioCueId, direction, cast: [...cast] });
    if (tag === '背景') { background = modernBackground(scene, text, background); return; }
    if (tag === '音效') { atmosphere = text; audioCueId = `${scene.id}:${index}`; return; }
    if (tag === '演出') { direction = text; return; }
    if (tag === '立绘') { cast = [...CHARACTERS, ...MODERN_CHARACTERS].filter(c => text.includes(c.name)).map(c => c.key); return; }
    if (tag === '选择') {
      if (modernInterlude(scene.id) && modernComplete(profile)) {
        beats.push({ ...base(), kind: 'choice', prompt: '两条路都已走过。这一次，留在这一边。', choices: [{ key: 'return', title: '把自己的句子写下去', detail: '继续现代卷尾声。', target: 'modern-o-5-1' }] });
      } else if (modernInterlude(scene.id)) {
        beats.push({ ...base(), kind: 'choice', prompt: '想再走一趟。这一次，把另一条路走完。', choices: [{ key: 'return', title: '回到马车旁', detail: '记忆留在身上；这一夜的物件，仍在原处。', target: 'modern-c-1-13' }] });
      } else {
        const choices = (block.options ?? []).map(option => {
          if (scene.id !== 'modern-c-1-13') return option;
          const alreadyWalked = option.target?.startsWith('modern-r-') ? modernHasRoyal(profile) : option.target?.startsWith('modern-k-') ? modernHasKunlun(profile) : false;
          return alreadyWalked ? { ...option, disabled: true, hint: '这一条路已经走过。接着走还未去过的另一边。' } : option;
        });
        // Experience remains; physical objects are restored at the next fork.
        beats.push({ ...base(), kind: 'choice', prompt: scene.id === 'modern-o-2-6' ? '你从哪个文化圈来？' : modernInterlude(scene.id) ? '再走一趟。你会接过谁递来的食物？' : '这一刻，你如何回答？', choices });
      }
      return;
    }
    const [speaker, ...moods] = block.tag.split('·');
    (block.pages ?? block.lines).forEach((page, pageIndex) => {
      background = modernBackground(scene, page, background);
      const activeSpeaker = speaker === '旁白' ? '' : speaker;
      const who = [...CHARACTERS, ...MODERN_CHARACTERS].find(c => c.name === activeSpeaker || activeSpeaker === '大巫祝' && c.key === 'wuyang');
      if (who) cast = [who.key];
      beats.push({ ...base(), id: `${scene.id}:${index}:${pageIndex}`, kind: 'text', speaker: activeSpeaker, mood: moods.join('·'), text: page });
    });
    direction = '';
  });
  if (scene.ending) beats.push({ id: `${scene.id}:ending`, kind: 'ending', ending: scene.ending, background, atmosphere, audioCueId, direction: '', cast });
  return beats;
}

export function currentBeat(state: GameState, profile: Profile): Beat {
  const beats = compileScene(state.sceneId, profile, state);
  return beats.find(beat => beat.id === state.beatId) ?? beats[0];
}

function inventoryForScene(sceneId: string, previous: string[]): string[] {
  const additions: Record<string, string[]> = {
    '0-9': ['map'], '1-5': ['jadeTail', 'birds', 'box'], '1-8': ['bone'], '1-12': ['coat'],
    'A-2': ['jadeHead'], 'A-6': ['jadeBody'], 'A-6a': ['names'],
  };
  let next = unique([...previous, ...(additions[sceneId] ?? [])]);
  if (sceneId === '1-1') next = [];
  if (sceneId === 'B-4') next = next.filter(id => id !== 'box');
  if (sceneId === 'A-H-1') next = next.filter(id => !id.startsWith('jade'));
  if (sceneId === '终-2') next = ['map'];
  return next;
}

export function enterScene(state: GameState, profile: Profile, sceneId: string, atChoice = false): GameState {
  const inventory = isModern(sceneId) ? modernInventory(sceneId, state.inventory) : inventoryForScene(sceneId, state.inventory);
  const next = { ...state, sceneId, inventory };
  const beats = compileScene(sceneId, profile, next);
  return { ...next, beatId: (atChoice ? beats.find(beat => beat.kind === 'choice') : beats[0])?.id ?? beats[0].id };
}

export function newGame(profile: Profile): GameState {
  if (campaignOf(profile) === 'overseas') return enterScene({ version: 1, campaign: 'overseas', sceneId: 'modern-o-0-1', beatId: '', inventory: [], choices: {}, history: [], cycle: 1 }, profile, 'modern-o-0-1');
  return enterScene({ version: 1, sceneId: '0-1', beatId: '', inventory: [], choices: {}, history: [], cycle: 1 }, profile, '0-1');
}

export function recordProgress(state: GameState, profile: Profile): Profile {
  const beat = currentBeat(state, profile);
  const scene = sceneById(state.sceneId);
  return {
    ...profile,
    visited: unique([...profile.visited, state.sceneId]),
    read: unique([...profile.read, beat.id]),
    art: unique([...profile.art, beat.background]),
    met: unique([...profile.met, ...beat.cast, ...(scene.script === 'modern' && scene.route === 'common' && scene.sourceId !== '1-13z' ? ['xu'] : [])]),
    oldNames: profile.oldNames || state.sceneId === 'A-6a',
  };
}

function logBeat(state: GameState, beat: TextBeat): GameState {
  const last = state.history.at(-1);
  if (last?.id === beat.id) return state;
  return { ...state, history: [...state.history.slice(-1199), { id: beat.id, sceneId: state.sceneId, speaker: beat.speaker, text: beat.text, kind: 'text' }] };
}

export function advance(state: GameState, profile: Profile): GameState {
  const beat = currentBeat(state, profile);
  if (beat.kind !== 'text') return state;
  const logged = logBeat(state, beat);
  const beats = compileScene(state.sceneId, profile, state);
  const index = beats.findIndex(item => item.id === beat.id);
  if (index < beats.length - 1) return { ...logged, beatId: beats[index + 1].id };
  if (isModern(state.sceneId)) {
    const target = sceneById(state.sceneId).next;
    return target ? enterScene(logged, profile, target) : logged;
  }
  const naturalNext = SCENES[SCENES.findIndex(scene => scene.id === state.sceneId) + 1];
  // All route exits are explicit; no ending may fall through to another ending.
  if (naturalNext) return enterScene(logged, profile, naturalNext.id);
  return logged;
}

export function choose(state: GameState, profile: Profile, optionKey: string): GameState {
  const beat = currentBeat(state, profile);
  if (beat.kind !== 'choice') return state;
  const choice = beat.choices.find(option => option.key === optionKey);
  if (!choice || choice.disabled) return state;
  const next = {
    ...state,
    choices: { ...state.choices, [isModern(state.sceneId) ? beat.id : state.sceneId === '0-2' ? 'breakfast' : state.sceneId]: choice.key },
    history: [...state.history, { id: `${beat.id}:${choice.key}`, sceneId: state.sceneId, speaker: '选择', text: choice.title, kind: 'choice' as const }],
  };
  if (modernInterlude(state.sceneId) && choice.key === 'return' && state.cycle < 2) {
    return enterScene({ ...next, choices: { ...next.choices, 'modern-cycle': 'first-return' }, cycle: state.cycle + 1 }, profile, choice.target!);
  }
  if (choice.target) return enterScene(next, profile, choice.target);
  const beats = compileScene(next.sceneId, profile, next);
  const index = beats.findIndex(item => item.id === beat.id);
  if (isModern(next.sceneId) && !beats[index + 1]) {
    const target = sceneById(next.sceneId).next;
    return target ? enterScene(next, profile, target) : next;
  }
  return { ...next, beatId: beats[index + 1].id };
}

export function completeEnding(state: GameState, profile: Profile): Profile {
  const beat = currentBeat(state, profile);
  if (beat.kind !== 'ending') return profile;
  return { ...profile, endings: unique([...profile.endings, beat.ending]) };
}

export function continueEnding(state: GameState, profile: Profile): GameState {
  const updated = completeEnding(state, profile);
  if (isModern(state.sceneId)) {
    const beat = currentBeat(state, updated);
    if (beat.kind !== 'ending' || beat.ending === 'modern-home') return state;
    return enterScene(state, updated, beat.ending === 'modern-kunlun' ? 'modern-o-4-2' : 'modern-o-4-1');
  }
  if (canReturn(updated)) return enterScene(state, updated, '终-1');
  return enterScene({ ...state, inventory: ['jadeTail', 'birds', 'box', 'bone', 'coat'], choices: {}, cycle: state.cycle + 1 }, updated, '1-12', true);
}

export function revisitScene(state: GameState, profile: Profile, sceneId: string): GameState {
  if (!profile.visited.includes(sceneId)) return state;
  if (isModern(sceneId)) {
    if (campaignOf(profile) !== 'overseas' || /^modern-o-5-/.test(sceneId) && !modernComplete(profile)) return state;
    // Choice guards must be replayed in this visit; a future decision is never
    // imported backwards from a different chapter.
    return enterScene({ ...state, campaign: 'overseas', choices: {}, inventory: [] }, profile, sceneId);
  }
  if (sceneId.startsWith('终-') && !canReturn(profile)) return state;
  // Reconstruct this run's physical objects from its timeline, rather than
  // importing objects from the route currently on screen.
  const prefix = sceneId.startsWith('A-') ? ['0-', '1-', 'A-'] : sceneId.startsWith('B-') ? ['0-', '1-', 'B-'] : sceneId.startsWith('终-') ? ['终-'] : [sceneId.slice(0, 2)];
  let inventory: string[] = [];
  for (const scene of SCENES) {
    if (!prefix.some(p => scene.id.startsWith(p))) continue;
    inventory = inventoryForScene(scene.id, inventory);
    if (scene.id === sceneId) break;
  }
  return enterScene({ ...state, inventory, choices: {} }, profile, sceneId);
}
