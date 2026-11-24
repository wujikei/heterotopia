import type { Campaign, GameState, Profile, Scene } from './types';
import type { MusicId } from './score';

export const isModern = (id: string) => id.startsWith('modern-');
export const campaignOf = (value?: { campaign?: Campaign } | null): Campaign => value?.campaign === 'overseas' ? 'overseas' : 'original';
export const modernHasRoyal = (profile: Profile) => profile.endings.some(id => id.startsWith('modern-royal-'));
export const modernHasKunlun = (profile: Profile) => profile.endings.includes('modern-kunlun');
export const modernComplete = (profile: Profile) => modernHasRoyal(profile) && modernHasKunlun(profile);
export const modernInterlude = (id: string) => id === 'modern-o-4-1' || id === 'modern-o-4-2';
export const modernFinal = (id: string) => id === 'modern-home';

export const MODERN_ARRIVAL_ART = 'modern-street-arrival-r3';
export const MODERN_STALL_ART = 'cg-modern-word-stall-r3';
export const MODERN_NOTEBOOK_ART = 'cg-modern-notebook-open';
export const MODERN_TRANSLATION_ART = 'cg-modern-translation-r3';
export const MODERN_PAPER_NOTE_ART = 'cg-modern-paper-note';
const MODERN_ART_PREVIOUS: Readonly<Partial<Record<string, string>>> = {
  [MODERN_ARRIVAL_ART]: 'modern-street-arrival-r2',
  [MODERN_STALL_ART]: 'cg-modern-word-stall',
  [MODERN_TRANSLATION_ART]: 'cg-modern-translation',
};
export function hasSeenModernArt(profile: Pick<Profile, 'art'>, name: string): boolean {
  const previous = MODERN_ART_PREVIOUS[name];
  return profile.art.includes(name) || (previous !== undefined && profile.art.includes(previous));
}

export const MODERN_BACKGROUNDS = {
  [MODERN_ARRIVAL_ART]: { name: '字在街上', subtitle: '海外旧街 · 黄昏', chapter: '现代卷' },
  [MODERN_STALL_ART]: { name: '问字，不问命', subtitle: '海外旧街 · 黄昏', chapter: '现代卷' },
  'modern-dorm-quiet-r2': { name: '日常尚在', subtitle: '海外 · 宿舍夜色', chapter: '现代卷' },
  'cg-modern-jade-palm-r2': { name: '掌心的何', subtitle: '海外旧街 · 黄昏', chapter: '现代卷' },
  'cg-modern-dorm-unease-r2': { name: '第三声之后', subtitle: '海外 · 宿舍夜色', chapter: '现代卷' },
  'cg-modern-dorm-carving-r2': { name: '墙上的刻痕', subtitle: '海外 · 宿舍夜色', chapter: '现代卷' },
  'cg-modern-dorm-dark-r2': { name: '灯灭之后', subtitle: '海外 · 宿舍夜色', chapter: '现代卷' },
  'cg-modern-jade-light-r2': { name: '何字一亮', subtitle: '海外 · 宿舍夜色', chapter: '现代卷' },
  'modern-dorm': { name: '何字微亮', subtitle: '海外 · 宿舍夜色', chapter: '现代卷' },
  'modern-library': { name: '自己的句子', subtitle: '海外 · 图书馆', chapter: '现代卷' },
  'modern-office': { name: '把问题写清楚', subtitle: '导师办公室 · 午后', chapter: '现代卷' },
  'modern-mountain-path': { name: '一段很长的路', subtitle: '山坡 · 午后', chapter: '现代卷' },
  'modern-sunset': { name: '半规落日', subtitle: '山顶 · 黄昏', chapter: '现代卷' },
  'modern-royal-wall-night': { name: '最后一个橘', subtitle: '寿春 · 城头夜色', chapter: '王裔线' },
  'cg-modern-friends': { name: '在异乡说话', subtitle: '海外 · 校园中庭', chapter: '现代卷' },
  'cg-modern-noodles': { name: '分一碗面', subtitle: '海外 · 宿舍深夜', chapter: '现代卷' },
  [MODERN_TRANSLATION_ART]: { name: '不译', subtitle: '海外 · 图书馆', chapter: '现代卷' },
  'cg-modern-projection': { name: '投影上的刻痕', subtitle: '海外 · 宿舍夜色', chapter: '现代卷' },
  'cg-modern-paper': { name: '把稿子推过来', subtitle: '导师办公室 · 午后', chapter: '现代卷' },
  'cg-modern-glance': { name: '只是一瞬', subtitle: '半山 · 人潮', chapter: '现代卷' },
  'cg-modern-summit': { name: '沈辞！这儿！', subtitle: '山顶平台 · 黄昏', chapter: '现代卷' },
  'cg-modern-photo': { name: '替后来者接住', subtitle: '山顶 · 快门之前', chapter: '现代卷' },
};

export const MODERN_CGS = [
  { id: 'modern-jade-palm-r2', title: '掌心的何', caption: '刻痕很深，像被人摩挲了很多年。', file: 'cg-modern-jade-palm-r2', thumbnail: 'cg-modern-jade-palm-r2-thumb', trigger: { beatIds: [] } },
  { id: 'modern-dorm-unease-r2', title: '第三声之后', caption: '日常还在，声音却变了。', file: 'cg-modern-dorm-unease-r2', thumbnail: 'cg-modern-dorm-unease-r2-thumb', trigger: { beatIds: [] } },
  { id: 'modern-dorm-carving-r2', title: '一笔，一笔', caption: '那只手握着小刀，在竹简上刻字。', file: 'cg-modern-dorm-carving-r2', thumbnail: 'cg-modern-dorm-carving-r2-thumb', trigger: { beatIds: [] } },
  { id: 'modern-word-stall', title: '问字，不问命', caption: '不信，才是问。', file: MODERN_STALL_ART, thumbnail: `${MODERN_STALL_ART}-thumb`, trigger: { beatIds: ['modern-o-0-1:5:0', 'modern-o-0-1:7:0'] } },
  { id: 'modern-carriage-fork', title: '这个清晨', caption: '你得选一样。', file: 'cg-modern-fork', thumbnail: 'cg-modern-fork-thumb', trigger: { beatIds: [] } },
  { id: 'modern-east-god', title: '神坐在船板上', caption: '你们到了吗？', file: 'cg-modern-donghuang', thumbnail: 'cg-modern-donghuang-thumb', trigger: { beatIds: [] } },
  { id: 'modern-noodles', title: '心里有个地方', caption: '室友把煮好的面，分了一碗。', file: 'cg-modern-noodles', thumbnail: 'cg-modern-noodles-thumb', trigger: { beatIds: [] as string[] } },
  { id: 'modern-translation', title: '不译', caption: '有些字，译出来，就不是它了。', file: MODERN_TRANSLATION_ART, thumbnail: `${MODERN_TRANSLATION_ART}-thumb`, trigger: { beatIds: [] as string[] } },
  { id: 'modern-projection', title: '一笔一笔', caption: '那只手还在刻。', file: 'cg-modern-projection', thumbnail: 'cg-modern-projection-thumb', trigger: { beatIds: [] as string[] } },
  { id: 'modern-paper', title: '把稿子推过来', caption: '这个人写得像真的见过。', file: 'cg-modern-paper', thumbnail: 'cg-modern-paper-thumb', trigger: { beatIds: [] as string[] } },
  { id: 'modern-paper-note', title: '导师的批注', caption: '这个人写得像真的见过。', file: MODERN_PAPER_NOTE_ART, thumbnail: `${MODERN_PAPER_NOTE_ART}-thumb`, trigger: { beatIds: [] as string[] } },
  { id: 'modern-glance', title: '有些相见', caption: '就是一瞬。够你用很久。', file: 'cg-modern-glance', thumbnail: 'cg-modern-glance-thumb', trigger: { beatIds: [] as string[] } },
  { id: 'modern-summit', title: '山顶 · 仍是同一个人', caption: '他从圈外，看见少年们接住彼此。', file: 'cg-modern-summit', thumbnail: 'cg-modern-summit-thumb', trigger: { beatIds: [] as string[] } },
  { id: 'modern-photo', title: '半规落日', caption: '你尚且年少，却与落笔成诗的人并肩而立。', file: 'cg-modern-photo', thumbnail: 'cg-modern-photo-thumb', trigger: { beatIds: [] as string[] } },
];

export const MODERN_ENDINGS = {
  'modern-royal-e1': { title: '哀郢', subtitle: '王裔 · 战死', quote: '往东的人，往南的雁，都走了。只有那木牌还留在原地。', background: 'ruins', index: 'I', description: '城破之后，记下最后一个名字。' },
  'modern-royal-e2': { title: '随队', subtitle: '王裔 · 流亡', quote: '停下来，就是家。', background: 'river', index: 'II', description: '随队离开，仍记住来处。' },
  'modern-royal-g1': { title: '国殇', subtitle: '王裔 · 鬼雄', quote: '首身离了，心没有；魂魄散了，可那口气还在。', background: 'ruins', index: 'III', description: '守到城破。' },
  'modern-royal-g2': { title: '招魂', subtitle: '王裔 · 两个名字', quote: '这就是你问名问到最后，问出的答案。', background: 'ritual', index: 'IV', description: '重开旧册，追问两个名字。' },
  'modern-royal-l': { title: '离骚', subtitle: '王裔 · 还在走', quote: '不知道。但我还在走。', background: 'mountain', index: 'V', description: '独自去求索。' },
  'modern-royal-s': { title: '涉江', subtitle: '王裔 · 不顾', quote: '她没有收。她在等，等一个也许不会回来的人。', background: 'river', index: 'VI', description: '走向西边渡口。' },
  'modern-royal-h': { title: '怀沙', subtitle: '王裔 · 石头上的字', quote: '那石头上的字还在那里，被水一点一点泡掉。', background: 'river', index: 'VII', description: '把名字还给河。' },
  'modern-royal-r': { title: '礼魂', subtitle: '王裔 · 传芭', quote: '鼓还在响，草还在传。', background: 'ritual', index: 'VIII', description: '把招魂做完。' },
  'modern-royal-f': { title: '渔父', subtitle: '王裔 · 濯足', quote: '你没有答案。你只是往下游走。', background: 'river', index: 'IX', description: '谁也不跟，随波逐流。' },
  'modern-royal-o': { title: '橘颂', subtitle: '王裔 · 一间屋', quote: '世界冰冷，与君相拥二眠。', background: 'hut', index: 'X', description: '西渡口，一间可以挂药的屋。' },
  'modern-kunlun': { title: '仿佛到了昆仑', subtitle: '九歌 · 舟与岸', quote: '人没了，名字还刻在牌上。天地不会为谁停，可它也不删谁。', background: 'light-river', index: 'XI', description: '走过诸神，回到靠岸的小舟。' },
  'modern-home': { title: '半规落日', subtitle: '现代卷 · 这边的日子', quote: '你尚且年少。', background: 'modern-sunset', index: 'XII', description: '两条路之后，留在这一边，把自己的句子写下去。' },
};

/** Exact-source text controls the small number of modern montage cuts. */
export function modernBackground(scene: Scene, text: string, current: string): string {
  if (scene.id === 'modern-o-0-1') {
    if (/从图书馆出来|把玉扣揣进口袋/.test(text)) return MODERN_ARRIVAL_ART;
    if (/一块手写的招牌|蹲了下去|那到底问什么|你抬头看她/.test(text)) return MODERN_STALL_ART;
    if (/顺手拿起|塞进你手里/.test(text)) return 'cg-modern-jade-palm-r2';
    return current;
  }
  if (scene.id === 'modern-c-1-13') return text.includes('一个人递烤薯，一个人递饼') ? 'cg-modern-fork' : current;
  if (scene.id === 'modern-r-C-11') return text.startsWith('切。城下') ? 'ruins' : current;
  if (scene.id === 'modern-k-F-5') return text.includes('神坐在你们中间') ? 'cg-modern-donghuang' : current;
  if (scene.id === 'modern-r-A-4' || scene.id === 'modern-r-D-1') return current;
  if (scene.id === 'modern-o-0-2') {
    if (/掌心的玉扣.*亮了一下/.test(text)) return 'cg-modern-jade-light-r2';
    if (/灯灭了|屋里一片黑/.test(text)) return 'cg-modern-dorm-dark-r2';
    if (/屏幕上不再是人|竹简上刻字/.test(text)) return 'cg-modern-dorm-carving-r2';
    if (/听见自己的声音变了/.test(text)) return 'cg-modern-dorm-unease-r2';
    return current;
  }
  if (scene.id === 'modern-o-4-1' && text.includes('夜里，室友看你')) return 'modern-dorm-quiet-r2';
  if (scene.id === 'modern-o-4-1' && /煮好的面|分了一碗/.test(text)) return 'cg-modern-noodles';
  if (scene.id === 'modern-o-4-2') {
    if (text.includes('不译。')) return MODERN_TRANSLATION_ART;
    if (/抄到“何”字|最后，你在右边/.test(text)) return MODERN_NOTEBOOK_ART;
  }
  if (scene.id === 'modern-o-5-1') {
    if (text === '这个人写得像真的见过。') return MODERN_PAPER_NOTE_ART;
    if (/打印稿推过来|稿子推了过来|把打印稿|导师又说/.test(text)) return 'cg-modern-paper';
  }
  if (scene.id === 'modern-o-5-5' && /亮黄外套|药学院的学生/.test(text)) return 'cg-modern-glance';
  if (scene.id === 'modern-o-5-6' && /沈辞！/.test(text)) return 'cg-modern-summit';
  if (scene.id === 'modern-o-5-7' && /拍照|按下快门/.test(text)) return 'cg-modern-photo';
  if (scene.id === 'modern-o-4-1' && (text.includes('去图书馆') || text.includes('课堂上第一次举手'))) return 'modern-library';
  if (scene.id === 'modern-o-4-1' && text.includes('想再走一趟')) return 'modern-dorm-quiet-r2';
  if (scene.id === 'modern-o-4-2' && (text.includes('睁开眼') || text.includes('给家里打了个视频'))) return 'modern-dorm-quiet-r2';
  if (scene.id === 'modern-o-4-2' && text.includes('开始做一件没用的事')) return 'modern-library';
  // These chapters stay in present-day locations even when the narration
  // recalls rivers, boats, old palaces or mountains from the ancient routes.
  if (scene.id.startsWith('modern-o-')) return current;
  if (/导师办公室|办公室|打印稿|暖气管/.test(text)) return 'modern-office';
  if (/图书馆|书架|资料室/.test(text)) return 'modern-library';
  if (/卧室|宿舍|投影仪|室友/.test(text) && !/土屋|阿媪|木匣|走廊/.test(text)) return 'modern-dorm';
  if (/车站|登山/.test(text)) return 'modern-mountain-path';
  if (/落日|夕照|江面碎金|落霞/.test(text)) return 'modern-sunset';
  if (/问字摊|涂鸦墙|修鞋摊/.test(text)) return MODERN_STALL_ART;
  if (/城墙|秦军|城门洞开/.test(text)) return 'ruins';
  if (/楚宫|朝堂|王寝|王宫|屈宅/.test(text)) return /屈宅|书房|旧箱/.test(text) ? 'study' : 'palace';
  if (/河边|渡口|船上|小舟|靠岸/.test(text)) return 'river';
  if (/蓝色的水|青蓝|恒久的蓝|天开了/.test(text)) return 'light-river';
  if (/村口|巫村|土屋|阿媪/.test(text)) return /土屋|灶/.test(text) ? 'hut' : 'village';
  return current;
}

const MODERN_SCENE_MUSIC: Partial<Record<string, MusicId>> = {
  'modern-o-0-1': 'modern-street',
  'modern-o-0-2': 'modern-question',
  'modern-o-4-1': 'modern-return',
  'modern-o-4-2': 'modern-untranslated',
  'modern-o-5-1': 'modern-untranslated',
  'modern-o-5-2': 'modern-untranslated',
  'modern-o-5-3': 'modern-ascent',
  'modern-o-5-4': 'modern-ascent',
  'modern-o-5-5': 'modern-ascent',
  'modern-o-5-6': 'modern-ascent',
  'modern-o-5-7': 'modern-afterglow',
};

export function modernMusic(sceneId: string, background: string): MusicId | null {
  const track = MODERN_SCENE_MUSIC[sceneId];
  if (track) return track;
  if (sceneId.startsWith('modern-r-')) return ['ritual', 'cg-modern-ritual'].includes(background) ? 'ritual' : 'old-jade';
  if (sceneId.startsWith('modern-k-')) return sceneId.startsWith('modern-k-G-') ? null : 'river-journey';
  return 'paper-note';
}

export const MODERN_SCENE_ART: Record<string, string> = {
  'modern-o-0-1': MODERN_ARRIVAL_ART,
  'modern-o-0-2': 'modern-dorm-quiet-r2',
  'modern-o-4-1': 'modern-dorm-quiet-r2',
  'modern-o-4-2': 'modern-dorm-quiet-r2',
  'modern-o-0-4': 'cg-modern-selection',
  'modern-c-1-13': 'village',
  'modern-o-5-6': 'cg-modern-summit',
  'modern-r-A-4': 'cg-modern-feast', 'modern-r-A-6': 'cg-modern-reed-boat',
  'modern-r-C-6': 'cg-modern-ritual', 'modern-r-C-7': 'cg-modern-ritual',
  'modern-r-C-11': 'cg-modern-battle', 'modern-r-C-12': 'cg-modern-city',
  'modern-r-E1-6': 'cg-modern-last-geese',
  'modern-r-D-1': 'modern-royal-wall-night',
  'modern-k-D-5': 'cg-modern-storm', 'modern-k-D-6': 'cg-modern-storm',
  'modern-k-E-1': 'cg-modern-cloud-lord', 'modern-k-E-3': 'cg-modern-xiangjun',
  'modern-k-E-4': 'cg-modern-xiangfuren', 'modern-k-E-5': 'cg-modern-siming',
  'modern-k-E-6': 'cg-modern-shaosiming', 'modern-k-E-7': 'cg-modern-dongjun',
  'modern-k-E-8': 'cg-modern-mountain-spirit', 'modern-k-E-9': 'cg-modern-river-lord',
  'modern-k-E-12': 'cg-modern-gods-rite', 'modern-k-F-1': 'cg-modern-kunlun-light',
  'modern-k-F-5': 'light-river', 'modern-k-G-1': 'cg-modern-reed-boat',
  'modern-k-G-2': 'cg-modern-reed-boat',
};

// Stored in the existing extensible choice record; old saves without it use neutral prose.
export const MODERN_RETURN_ENDING = 'modern-return-ending';
export function modernReturnMemory(choices: GameState['choices']): string | undefined {
  const ending = choices[MODERN_RETURN_ENDING];
  const entry = Object.entries(MODERN_ENDINGS).find(([id]) => id === ending && id.startsWith('modern-royal-'));
  return entry ? `（“${entry[1].quote}”——那一边的句子，还留在你心里。）` : undefined;
}

export function modernInventory(sceneId: string, previous: string[]): string[] {
  if (sceneId === 'modern-o-0-1') return [];
  if (sceneId === 'modern-o-0-2' || modernInterlude(sceneId) || /^modern-o-5-/.test(sceneId)) return ['questionJade'];
  if (sceneId === 'modern-o-0-3') return [];
  if (['modern-c-1-13', 'modern-c-1-13a', 'modern-c-1-13b'].includes(sceneId)) return ['jadeTail', 'birds', 'box'];
  const ancient = previous.filter(id => id !== 'map' && id !== 'questionJade');
  if (sceneId === 'modern-o-0-8') return [...new Set([...ancient, 'jadeTail', 'birds', 'box'])];
  return ancient;
}

export function restoreModernState(state: GameState): GameState {
  return isModern(state.sceneId) ? { ...state, inventory: modernInventory(state.sceneId, state.inventory) } : state;
}
