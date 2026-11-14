import type { Character, EndingId } from '../types';

type EmbeddedAssets = typeof globalThis & { __HETEROTOPIA_ASSETS__?: Record<string, string>; __HETEROTOPIA_SOURCE__?: string };
export { asset, assetSources, portraitAsset, portraitFace } from '../assets';
export const sourceDocument = () => (globalThis as EmbeddedAssets).__HETEROTOPIA_SOURCE__ ?? `${import.meta.env.BASE_URL}原著剧本-V6.txt`;

export const CHARACTERS: Character[] = [
  { key: 'shen', name: '沈辞', subtitle: '添笔的人', description: '十六岁，高一七班学生，家在宜昌一带，祖籍秭归。爱画地图与九层城，分科在即，常将没说出口的话留给想象。', quote: '如果能离开这里，去另一个地方呢。', first: '0-1', color: '#a4c9d7' },
  { key: 'tang', name: '唐瑾', subtitle: '那张未谈完的便签', description: '沈辞的邻居、班长与同桌，自己决定选文科。与沈辞因上周的一次表白变得局促，仍有自己的学业、打算与边界。', quote: '沈辞，我早饭就说过了。', first: '0-2', color: '#e2c99e' },
  { key: 'song', name: '宋嘉树', subtitle: '隔着过道的声音', description: '隔着过道坐的好友。嘴快，爱吃，也会在察觉不对时收起玩笑。', quote: '它只是爆胎，别给它加工作量。', first: '0-3', color: '#c8b9a0' },
  { key: 'xu', name: '戌', reading: 'xū', subtitle: '借来的一口气', description: '十五岁的泽边少年。口吃，会生火、认鱼、削木鸟。沈辞借用他的身体，也逐渐听见他的习惯与心事。', quote: '别……松。', first: '1-1', color: '#cfcdc1' },
  { key: 'amao', name: '阿媪', subtitle: '灶火旁等着的人', description: '将戌养大的老妇，耳背，针脚细。她仍等着没有归来的儿子阿禾，也记得把粥往火边挪一挪。', quote: '回来了就好。', first: '1-1', color: '#b9ad91' },
  { key: 'elder', name: '老觋', reading: 'xí', subtitle: '记得每一个名字', description: '巫村年老的巫者，记得每一个被叫过的名字。他不知道两个人怎样同一口气，仍愿意等少年将话讲完。', quote: '那就先活着。', first: '1-4', color: '#b7c1b6' },
  { key: 'quheng', name: '屈衡', subtitle: '旧箱与十根名简', description: '曾从少年巫旅独自归来的老臣，左手缺两指。四十多年前的旧衣与断笛，仍收在书房的箱中。', quote: '有话……趁能说。', first: 'A-1', color: '#bcaa8b' },
  { key: 'chang', name: '棠', reading: 'táng', subtitle: '先甜一下', description: '屈府女孩，十二三岁，正在寻找走散的弟弟。做事爽快，针脚细，袖中常藏着一点饴糖。', quote: '先甜一下，省得你总皱脸。', first: 'A-3', color: '#d9b79e' },
  { key: 'yu', name: '雩', reading: 'yú', subtitle: '听见路的人', description: '蒙眼少女，以声音与触摸认路。肯等人说完，也会坦白自己听不清的地方。', quote: '留着。明日还要撑船。', first: 'B-1', color: '#b5c7d1' },
  { key: 'mi', name: '芈', reading: 'mǐ', subtitle: '没吹完的一声笛', description: '失去舌头的少年，以手势、骨笛和乌鸦与人往来。喜欢笑，遇事有自己的主意。', quote: '等一等。', first: 'B-1', color: '#c9c4b5' },
  { key: 'xua', name: '媭', reading: 'xū', subtitle: '想要一个高屋檐', description: '独臂少女，照料伤病，也管粮、管行李。习惯撑住别人，想有一个能挂许多药的屋檐。', quote: '冷了就说，疼……也说。', first: 'B-1', color: '#d5ab9d' },
  { key: 'yuan', name: '沅', reading: 'yuán', subtitle: '听见那条河', description: '队伍里最小的男孩，常听见一条旁人听不到的河。分到两颗豆时，会把一颗放到旁边。', quote: '甜在后头。', first: 'B-1', color: '#c8bba1' },
  { key: 'tu', name: '荼', reading: 'tú', subtitle: '一只双耳罐', description: '分粮仔细的女孩，左脸有胎记。想学烧带两只耳的罐：手小也好端，冬天就不怕掉了。', quote: '还不会。先画，碰见会的再学。', first: 'B-1', color: '#c7a3a3' },
  { key: 'wuyang', name: '巫阳', subtitle: '不得滞行', description: '奉王令领孩子们西行的老巫。一路留下旧日记忆，身体与命令却越来越陌生。', quote: '他的名字，在我的名牍上。', first: '1-11', color: '#aeb5ad' },
];

export const BACKGROUNDS: Record<string, { name: string; subtitle: string; chapter: string }> = {
  hero: { name: '一叶归舟', subtitle: '循着水声，回家', chapter: '梦的入口' },
  'dream-boat': { name: '水声之前', subtitle: '夜梦 · 船底的敲击', chapter: '水声之前' },
  bedroom: { name: '天光未明', subtitle: '05:41 · 沈家卧室', chapter: '水声之前' },
  home: { name: '饭还热着', subtitle: '宜昌 · 沈家', chapter: '水声之前' },
  bus: { name: '同一班车', subtitle: '上学路 · 晨', chapter: '水声之前' },
  school: { name: '把影子留在操场', subtitle: '校园 · 薄暮', chapter: '水声之前' },
  classroom: { name: '一节很长的晚自习', subtitle: '高一七班 · 19:37', chapter: '水声之前' },
  'classroom-day': { name: '寻常的一天', subtitle: '高一七班 · 昼', chapter: '水声之前' },
  alley: { name: '来路与去路', subtitle: '老城 · 巷口', chapter: '水声之前' },
  nightmare: { name: '门外有水', subtitle: '教室 · 异变', chapter: '水声之前' },
  hut: { name: '借来的一口气', subtitle: '巫村 · 戌的屋', chapter: '共通线' },
  village: { name: '在这里过日子', subtitle: '泽边 · 巫村', chapter: '共通线' },
  shrine: { name: '隔江相望', subtitle: '峡口 · 沉江祠', chapter: '借来的一口气' },
  ritual: { name: '魂兮归来', subtitle: '楚地 · 招魂之夜', chapter: '旧玉与故人' },
  bamboo: { name: '雾里有人唱歌', subtitle: '山中 · 竹林', chapter: '未归的孩子' },
  study: { name: '旧箱里的月亮', subtitle: '寿春 · 屈宅', chapter: '旧玉与故人' },
  palace: { name: '帷幕深处', subtitle: '寿春 · 楚宫', chapter: '旧玉与故人' },
  tomb: { name: '先看名字', subtitle: '宗庙 · 地宫', chapter: '旧玉与故人' },
  river: { name: '发舟', subtitle: '大泽 · 古渡', chapter: '昆仑线' },
  ruins: { name: '日子没有烧', subtitle: '残村 · 喜事', chapter: '破屋喜事' },
  marsh: { name: '君无下此幽都些', subtitle: '旧祭泽 · 残桥', chapter: '发舟' },
  mountain: { name: '山中余日', subtitle: '深山 · 来路', chapter: '昆仑线' },
  underwater: { name: '九重城在水下', subtitle: '江底 · 铜像', chapter: '沉江' },
  valley: { name: '开春才吃得上', subtitle: '谷口 · 魏叔的田', chapter: '雾中问路' },
  cave: { name: '握住后来的人', subtitle: '谷后 · 子母洞', chapter: '山中余日' },
  snow: { name: '不松', subtitle: '盐客旧洞 · 第四十三日', chapter: '山中余日' },
  'light-river': { name: '两片夜之间', subtitle: '光河之岸 · 无时', chapter: '光河与归来' },
};

export const ENDINGS: Record<EndingId, { title: string; index: string; subtitle: string; description: string; quote: string; background: string }> = {
  blade: { title: '举刃', index: 'I', subtitle: '王裔 · 一', description: '举铃还击，公开先王之子的身份。', quote: '那些被他们从人脚下拖出来的人，也确实活到了天亮。', background: 'ritual' },
  mercy: { title: '留人', index: 'II', subtitle: '王裔 · 二', description: '以身份与证物，换仍活着的人退场。', quote: '亭外无人等他，他终于不用怕说得慢。', background: 'river' },
  leave: { title: '离席', index: 'III', subtitle: '王裔 · 三', description: '不再替王室落座，带着自己的名字离开。', quote: '昨夜画了一遍又一遍的那条路，就在几步之外。', background: 'palace' },
  names: { title: '问名', index: 'IV', subtitle: '王裔 · 隐', description: '追问旧队名简，以三玉问旧日未归的人。', quote: '有话……趁能说。', background: 'light-river' },
  kunlun: { title: '光河', index: 'V', subtitle: '昆仑 · 尽头', description: '走过完整昆仑旅途，留下第二道裂纹。', quote: '他原来以为只有抵达才能将旅程留下。', background: 'light-river' },
  home: { title: '归来', index: 'VI', subtitle: '两道裂纹 · 同一条归路', description: '亲历两条路线之后，回到那节未尽的晚自习。', quote: '一句话，仍慢一点。所有人都等他讲完。', background: 'home' },
};

export const ITEMS: Record<string, { name: string; mark: string; detail: string }> = {
  map: { name: '古图', mark: '图', detail: '山与河之间，有一道未尽的淡痕。' },
  jadeTail: { name: '鸟尾残玉', mark: '玉', detail: '从戌的小木匣中取出，贴着胸口，微凉。' },
  jadeHead: { name: '鸟首残玉', mark: '玉', detail: '屈衡保管的第二角，鸟眼还在。' },
  jadeBody: { name: '鸟身残玉', mark: '玉', detail: '三处早年锯开的断口，终于相合。' },
  birds: { name: '两只木鸟', mark: '鸟', detail: '一只尾歪，一只缺翅。都是戌做的。' },
  box: { name: '月相木匣', mark: '匣', detail: '用红绳扎着，曾藏过这个少年的来历。' },
  bone: { name: '卜骨', mark: '卜', detail: '两道裂纹，各自通往一种命运。' },
  coat: { name: '阿媪的冬衣', mark: '衣', detail: '袖口接了一圈错色的靛青布，针脚很齐。' },
  flute: { name: '旧骨笛', mark: '笛', detail: '有一段调子，仍等着后来的人接上。' },
  names: { name: '旧队名简', mark: '名', detail: '十个名字。最后一个旁边，多了一道横。' },
};

export function characterFor(name: string): Character | undefined {
  if (name.includes('戌（') || name === '戌（沈辞）') return CHARACTERS.find(c => c.key === 'xu');
  return CHARACTERS.find(c => c.name === name);
}
