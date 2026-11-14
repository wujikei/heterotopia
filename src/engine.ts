import { SCENES, isStoryReady } from './story';
import { CHARACTERS } from './data/world';
import type { Beat, ChoiceBeat, EndingId, GameState, Profile, Scene, TextBeat } from './types';

export { STORY, SCENES, loadStory, isStoryReady } from './story';
export const sceneById = (id: string) => SCENES.find(scene => scene.id === id) ?? SCENES[0];
export const hasRoyal = (profile: Profile) => profile.endings.some(e => ['blade', 'mercy', 'leave', 'names'].includes(e));
export const hasKunlun = (profile: Profile) => profile.endings.includes('kunlun');
export const canReturn = (profile: Profile) => hasRoyal(profile) && hasKunlun(profile);
export const newProfile = (): Profile => ({ version: 1, visited: [], read: [], art: ['hero'], met: [], endings: [], oldNames: false });

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
  if (!isStoryReady()) throw new Error('剧情尚未载入，请先 await loadStory()。');
  const scene = sceneById(sceneId);
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
  const inventory = inventoryForScene(sceneId, state.inventory);
  const next = { ...state, sceneId, inventory };
  const beats = compileScene(sceneId, profile, next);
  return { ...next, beatId: (atChoice ? beats.find(beat => beat.kind === 'choice') : beats[0])?.id ?? beats[0].id };
}

export function newGame(profile: Profile): GameState {
  return enterScene({ version: 1, sceneId: '0-1', beatId: '', inventory: [], choices: {}, history: [], cycle: 1 }, profile, '0-1');
}

export function recordProgress(state: GameState, profile: Profile): Profile {
  const beat = currentBeat(state, profile);
  return {
    ...profile,
    visited: unique([...profile.visited, state.sceneId]),
    read: unique([...profile.read, beat.id]),
    art: unique([...profile.art, beat.background]),
    met: unique([...profile.met, ...beat.cast]),
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
    choices: { ...state.choices, [state.sceneId === '0-2' ? 'breakfast' : state.sceneId]: choice.key },
    history: [...state.history, { id: `${beat.id}:${choice.key}`, sceneId: state.sceneId, speaker: '选择', text: choice.title, kind: 'choice' as const }],
  };
  if (choice.target) return enterScene(next, profile, choice.target);
  const beats = compileScene(next.sceneId, profile, next);
  const index = beats.findIndex(item => item.id === beat.id);
  return { ...next, beatId: beats[index + 1].id };
}

export function completeEnding(state: GameState, profile: Profile): Profile {
  const beat = currentBeat(state, profile);
  if (beat.kind !== 'ending') return profile;
  return { ...profile, endings: unique([...profile.endings, beat.ending]) };
}

export function continueEnding(state: GameState, profile: Profile): GameState {
  const updated = completeEnding(state, profile);
  if (canReturn(updated)) return enterScene(state, updated, '终-1');
  return enterScene({ ...state, inventory: ['jadeTail', 'birds', 'box', 'bone', 'coat'], choices: {}, cycle: state.cycle + 1 }, updated, '1-12', true);
}

export function revisitScene(state: GameState, profile: Profile, sceneId: string): GameState {
  if (!profile.visited.includes(sceneId)) return state;
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
