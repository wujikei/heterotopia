import type { Campaign, GameState, Profile } from './types';
import { validOverseasIdentity } from './overseasIdentity';

export const isModern = (id: string) => id.startsWith('modern-');
export const campaignOf = (value?: { campaign?: Campaign } | null): Campaign => value?.campaign === 'overseas' || value?.campaign === 'shenci' ? value.campaign : 'original';
export const modernHasRoyal = (profile: Profile) => profile.endings.some(id => id.startsWith('modern-royal-'));
export const modernHasKunlun = (profile: Profile) => profile.endings.includes('modern-kunlun');
export const modernComplete = (profile: Profile) => modernHasRoyal(profile) && modernHasKunlun(profile);
export const modernInterlude = (id: string) => id === 'modern-o-4-1' || id === 'modern-o-4-2';
export const modernFinal = (id: string) => id === 'modern-home' || id === 'shenci-home';

export const MODERN_ARRIVAL_ART = 'modern-street-arrival-r3';
export const MODERN_STALL_ART = 'cg-modern-word-stall-r3';
export const MODERN_NOTEBOOK_ART = 'cg-modern-notebook-open';
export const MODERN_TRANSLATION_ART = 'cg-modern-translation-r3';
export const MODERN_PAPER_NOTE_ART = 'cg-modern-paper-note';
export const MODERN_GLANCE_ART = 'cg-modern-glance-r4';
export const MODERN_SUMMIT_ART = 'cg-modern-summit-r4';
export const MODERN_PHOTO_ART = 'cg-modern-photo-user';
export const MODERN_SHUTTER_BEAT = 'modern-o-5-7:17:0';
const MODERN_ART_PREVIOUS: Readonly<Partial<Record<string, string>>> = {
  [MODERN_ARRIVAL_ART]: 'modern-street-arrival-r2',
  [MODERN_STALL_ART]: 'cg-modern-word-stall',
  [MODERN_TRANSLATION_ART]: 'cg-modern-translation',
  [MODERN_GLANCE_ART]: 'cg-modern-glance',
  [MODERN_SUMMIT_ART]: 'cg-modern-summit',
  [MODERN_PHOTO_ART]: 'cg-modern-photo',
};
export function hasSeenModernArt(profile: Pick<Profile, 'art'>, name: string): boolean {
  const previous = MODERN_ART_PREVIOUS[name];
  return profile.art.includes(name) || (name === MODERN_PHOTO_ART && profile.art.includes('cg-modern-photo-r4')) || (previous !== undefined && profile.art.includes(previous));
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
  'modern-classroom': { name: '第一次举手', subtitle: '海外 · 大学教室', chapter: '现代卷' },
  'modern-office': { name: '把问题写清楚', subtitle: '导师办公室 · 午后', chapter: '现代卷' },
  'modern-mountain-path': { name: '一段很长的路', subtitle: '山坡 · 午后', chapter: '现代卷' },
  'modern-sunset': { name: '半规落日', subtitle: '山顶 · 黄昏', chapter: '现代卷' },
  'modern-royal-wall-night': { name: '最后一个橘', subtitle: '寿春 · 城头夜色', chapter: '王裔线' },
  'modern-chu-courtyard': { name: '院中影', subtitle: '寿春 · 宅院', chapter: '王裔线' },
  'modern-river-aboard': { name: '日复一日', subtitle: '大泽 · 舟上', chapter: '昆仑线' },
  'cg-modern-friends': { name: '在异乡说话', subtitle: '海外 · 校园中庭', chapter: '现代卷' },
  'cg-modern-noodles': { name: '分一碗面', subtitle: '海外 · 宿舍深夜', chapter: '现代卷' },
  [MODERN_TRANSLATION_ART]: { name: '不译', subtitle: '海外 · 图书馆', chapter: '现代卷' },
  'cg-modern-projection': { name: '投影上的刻痕', subtitle: '海外 · 宿舍夜色', chapter: '现代卷' },
  'cg-modern-paper': { name: '把稿子推过来', subtitle: '导师办公室 · 午后', chapter: '现代卷' },
  [MODERN_GLANCE_ART]: { name: '只是一瞬', subtitle: '半山 · 人潮', chapter: '现代卷' },
  [MODERN_SUMMIT_ART]: { name: '沈辞！这儿！', subtitle: '山顶平台 · 黄昏', chapter: '现代卷' },
  [MODERN_PHOTO_ART]: { name: '替后来者接住', subtitle: '山顶 · 快门', chapter: '现代卷' },
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
  { id: 'modern-glance', title: '有些相见', caption: '就是一瞬。够你用很久。', file: MODERN_GLANCE_ART, thumbnail: `${MODERN_GLANCE_ART}-thumb`, trigger: { beatIds: [] as string[] } },
  { id: 'modern-summit', title: '山顶 · 仍是同一个人', caption: '他从圈外，看见少年们接住彼此。', file: MODERN_SUMMIT_ART, thumbnail: `${MODERN_SUMMIT_ART}-thumb`, trigger: { beatIds: [] as string[] } },
  { id: 'modern-photo', title: '半规落日', caption: '你尚且年少，却与落笔成诗的人并肩而立。', file: MODERN_PHOTO_ART, thumbnail: `${MODERN_PHOTO_ART}-thumb`, trigger: { beatIds: [] as string[] } },
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
  if (!isModern(state.sceneId)) return state;
  const restored = { ...state, inventory: modernInventory(state.sceneId, state.inventory) };
  // Ignore an unknown future definition without discarding a playable save.
  if (!validOverseasIdentity(restored.overseasIdentity)) delete restored.overseasIdentity;
  return restored;
}
