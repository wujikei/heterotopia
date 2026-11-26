import type { Scene } from './types';
import { presentOverseasChoiceLabel, presentOverseasReflection } from './overseasIdentity';

// Page IDs remain tied to the source manuscript and legacy bookmarks.
const OMITTED_PAGES = new Set([
  'modern-r-A-4:17:1', 'modern-r-C-1a:108:0', 'modern-r-C-1a:114:0',
  'modern-r-E1-7:11:0', 'modern-r-E2-7:6:0', 'modern-r-G1-8:7:0', 'modern-r-G2-8:7:0',
  'modern-r-L-8:4:0', 'modern-r-S-8:3:0', 'modern-r-H-8:3:0', 'modern-r-R-6:9:0',
  'modern-r-F-6:3:0', 'modern-r-O-10:18:0',
  'modern-k-B-15:12:0', 'modern-k-D-13:16:0', 'modern-k-F-3:11:0',
  'modern-k-G-4:6:0', 'modern-k-Z-6:6:0',
]);

const SILENT_PAGES = new Set(['modern-o-0-2:29:0', 'modern-k-G-4:7:0']);

export const isOmittedPage = (id: string) => OMITTED_PAGES.has(id);
export const isSilentPage = (id: string) => SILENT_PAGES.has(id);

const PAGE_EDITS: Readonly<Partial<Record<string, readonly (readonly [string, string])[]>>> = {
  'modern-r-A-4:12:0': [['方才就是你，把', '方才就是他，把']],
  'modern-r-A-4:14:0': [['你自始至终没抬过头，可你的脊背', '他自始至终没抬过头，可他的脊背']],
  'modern-r-A-4:16:0': [['你站在殿上斜着眼看人，像这满朝的人都欠你钱', '他站在殿上斜着眼看人，像这满朝的人都欠他钱']],
  'modern-r-A-4:17:0': [['你站在武官堆里', '他站在武官堆里'], ['你知道，边关吃草根的事，别人当酒令，你却咽不下。', '你知道，边关吃草根的事，别人当酒令，他却咽不下。）']],
  'modern-r-C-8:2:0': [['你持刃站在你背后。和 B-10 一样的两难。', '你持刃站在王背后。上一次他祷告时，你也这样站过。']],
  'modern-r-C-8:4:0': [['你想起 B-10。那一次你收刀', '你想起王上一次祷告时，你收了刀']],
  'modern-r-C-8:8:0': [['你的肩膀剧烈地抖了一下', '他的肩膀剧烈地抖了一下']],
  'modern-r-E2-5:13:0': [['你想起 A-1 那天，官道上', '你想起初见那天，官道上']],
  'modern-r-L-5:3:0': [['是 A-3 那天棠用包糖的油纸叠的', '是棠用包糖的油纸叠的']],
  'modern-r-F-3:6:0': [['想起 A-2 那天，她第一次端水进来', '想起她第一次端水进来的那天']],
  'modern-k-B-3:30:0': [['【间场】', '']],
  'modern-k-B-4:16:0': [['到最后一幕，还在', '直到最后，也没忘']],
  'modern-k-B-11:6:0': [['这一场，是全幕最轻的。', '这一刻，什么都轻了下来。']],
  'modern-k-B-14:6:0': [['你想起 B-4 那句', '你想起老妇人问你能不能保证时，你说的那句']],
  'modern-k-B-15:25:0': [['这是这条线真正的起点：不是六个孩子想去，是一个病了的王，在火把底下，抓住了一根水草。', '六个孩子还不知道自己要去哪里。那个病了的王，已在火把底下，抓住了这根水草。']],
  'modern-k-C-1:8:0': [['她答得和 B-5 一样快。', '她答得和先前那位妇人问孩子能不能吃上饭时一样快。']],
  'modern-k-C-3:8:0': [['媭两只手换着端。', '媭隔着袖口托住碗底。']],
  'modern-k-C-4:9:0': [['没人收。', '没有人把它带上船。']],
  'modern-k-C-4:12:0': [['他没回头。', '他没再回头。']],
  'modern-k-D-12:7:0': [['B-8 那些病人', '喝了井水就停不住笑的那些人']],
  'modern-k-D-13:11:0': [['从这一场起，水是青蓝的，天也是青蓝的。', '往前去，水和天都成了青蓝色。']],
  'modern-k-D-13:15:0': [['这一段，要写尽楚地的神。这些神', '楚地的这些神']],
  'modern-k-E-1:5:0': [['B-7 婚礼上，那种兰草味', '那场婚礼上的兰草味']],
  'modern-k-E-4:3:0': [['D-12 叫名字的那首', '在船底唤过他们名字的那首']],
  'modern-k-F-2:4:0': [['B-7 婚礼上那种', '那场婚礼上用过的那种']],
  'modern-k-F-2:7:0': [['她笑了。是全书她笑得最松的一次。', '她笑了。从没见她笑得这样松快。']],
  'modern-k-F-3:1:0': [['你（戌）吹的那支曲子', '芈吹的那支曲子'], ['没有一句是你从前想说的。你从前那些断掉的音节里，藏着你没说完的话', '没有一句是他从前想说的。他从前那些断掉的音节里，藏着他没说完的话']],
  'modern-k-F-3:2:0': [['你吹出', '他吹出']],
  'modern-k-F-3:3:0': [['你笑着', '他笑着']],
  'modern-k-F-3:4:0': [['不是你的笑', '不是他的笑']],
  'modern-k-F-3:5:0': [['你想起 A-2 的"三停"。', '你想起从前总要停三次的那支曲子。']],
  'modern-k-F-4:10:0': [['和很远的、B-4 那句', '还有那句从领粮队伍前远远传回来的']],
  'modern-k-F-6:1:0': [['镜头开始往后退。', '青蓝的河水里，先前的一切慢慢远了。']],
  'modern-k-F-6:6:0': [['镜头继续退。退出船舱。退出河面。退到很高很远的地方。', '船舱渐远。河面也渐远。']],
  'modern-k-F-6:7:0': [['退到云端上，还能看见河。', '云端之下，还能看见河。']],
  'modern-k-F-6:10:0': [['镜头退，退得很有层次。先退的是颜色', '先褪去的是颜色']],
  'modern-k-F-6:13:0': [['镜头退到最后，画面上只剩那碗粥。', '到最后，只剩那碗粥。']],
  'modern-k-G-1:7:0': [['E-6 少司命', '少司命']],
  'modern-k-G-2:2:0': [['就是 C-3 那位老妇人送的那碗。没有人收。', '就是临行那天，老妇人送来的那碗粥。没有人喝。']],
  'modern-k-G-2:8:0': [['你刻得很慢。', '那人刻得很慢。']],
  'modern-k-G-2:8:1': [['你不想刻错。', '那人不想刻错。']],
  'modern-k-G-2:9:0': [['镜头在木牌和粥之间，停了很久。', '木牌和粥，在岸上静静守着那条船。']],
  'modern-k-G-2:10:0': [['你把该想的都想到了', '立牌的人把该想的都想到了'], ['你不知道', '那人不知道'], ['你只能', '只能'], ['可你刻得很正。', '可那人把牌子立得很正。']],
  'modern-k-H-6:1:0': [['镜头退。九条河并成一条。', '远处，九条河并成一条。']],
  'modern-k-J-3:2:0': [['那个 B-4 朝你笑的老妇人', '那个领过粮、回头朝你笑的老妇人']],
  'modern-k-J-6:0:0': [['镜头退。完好的村，化成水汽。', '完好的村渐渐远去，化成水汽。']],
  'modern-k-L-6:1:0': [['传给谁，镜头不追了。', '后来传给了谁，已经没人知道了。']],
  'modern-k-N-1:1:0': [['E-6 留下的', '少司命留下的']],
  'modern-k-N-5:0:0': [['镜头退。小舟里，沅看见', '小舟里，沅看见'], ['那个 B-5 你（戌）给过粮的孩子', '先前跟着母亲来领粮的那个孩子']],
  'modern-k-X-2:0:0': [['还是 A-8 那个', '还是你替她别上的那个']],
  'modern-k-X-5:9:0': [['镜头退走。那只小舟里，没有她。', '小舟远了，舟里没有她。']],
  'modern-k-Y-5:0:0': [['D-12 歌里叫的方向', '水底那支歌传来的方向']],
  'modern-k-Z-6:8:0': [['一道裂纹，在屏幕中央，轻轻合拢。', '眼前的一道裂纹，轻轻合拢。']],
  'modern-k-Z-6:14:0': [['最后一个镜头，落在药铺的柜台上。柜台角上，', '药铺的柜台角上，']],
};

const CHOICE_EDITS: Readonly<Partial<Record<string, readonly [string, string]>>> = {
  'modern-r-D-11:11:1': ['守城（进国殇）', '守城'],
  'modern-r-D-11:11:2': ['去西渡口（进橘颂 / 哀郢 / 涉江 / 怀沙）', '去西渡口'],
  'modern-r-D-11:11:3': ['独自去求索（进离骚）', '独自去求索'],
  'modern-k-C-4:11:2': ['不回头', '不再回头'],
};

const SCENE_TITLES: Readonly<Partial<Record<string, string>>> = {
  'modern-k-F-6': '梦退潮时',
  'modern-k-G-4': '风过河岸',
};

export function presentStoryText(id: string, source: string): string {
  if (id.startsWith('shenci-')) return source.replace(/你（(?:沈辞|戌)）/g, '你');
  if (!id.startsWith('modern-')) return source;
  if (isOmittedPage(id) || isSilentPage(id)) return '';
  const text = (PAGE_EDITS[id] ?? []).reduce((value, [anchor, replacement]) => value.replace(anchor, replacement), source);
  return presentOverseasReflection(id, text).replaceAll('你（戌）', '你').replaceAll('你（林越）', '你');
}

export function presentChoiceLabel(id: string, source: string): string {
  const edit = CHOICE_EDITS[id];
  return edit && source === edit[0] ? edit[1] : presentOverseasChoiceLabel(id, source);
}

export function presentSceneTitle(scene: Pick<Scene, 'id' | 'title'>): string {
  return SCENE_TITLES[scene.id] ?? scene.title;
}

const RETURN_CHAPTER = '线间 这边的日子';

export function presentChapterTitle(scene: Pick<Scene, 'chapter'>): string {
  return scene.chapter === RETURN_CHAPTER ? '归来 这边的日子' : scene.chapter;
}
