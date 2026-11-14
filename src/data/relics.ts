import type { GameState, Profile } from '../types';

export type RelicId = 'map' | 'jade-tail' | 'jade-head' | 'jade-body' | 'jade-joined' | 'birds' | 'bone' | 'flute-old' | 'flute-mi' | 'flute-mi-broken' | 'names';
export type Relic = {
  id: RelicId;
  group: string;
  title: string;
  art: string;
  mark: string;
  material: string;
  detail: string;
  quote: string;
  source: string;
  reveal: readonly string[];
  inventory?: string;
};

// Exact, reviewed pages. Visiting a scene or owning an engine flag does not
// reveal a drawing. The register also supplies the optional reading shortcut.
export const RELICS: readonly Relic[] = [
  { id: 'map', group: 'map', title: '古图', art: 'prop-map', mark: '图', material: '茶色纸 · 墨与淡赭', detail: '山川与星斗画得极细。河岸挤着细小的人影，一叶舟停在画边，船尾留着一角白衣。', quote: '纸面呈茶色，边角一小块暗红。', source: '操场 · 夕阳与古图', reveal: ['0-9:10:0', '0-10:12:0'], inventory: 'map' },
  { id: 'jade-tail', group: 'jade', title: '鸟尾残玉', art: 'prop-jade-tail', mark: '玉', material: '青白玉 · 卷尾', detail: '木匣弹开，红绢上只剩一段细小卷起的鸟尾。玉贴着掌心，微凉。', quote: '鸟的身体已经断了，只留下细小卷起的尾。', source: '戌家 · 月相木匣', reveal: ['1-5:13:0'], inventory: 'jadeTail' },
  { id: 'jade-head', group: 'jade', title: '鸟首残玉', art: 'prop-jade-head', mark: '玉', material: '青白玉 · 眼孔', detail: '屈衡取出的第二角。鸟眼的小孔仍在，灯光能从那里透过。', quote: '鸟头的一角，眼孔还在，压在那三根手指下。', source: '屈宅 · 后堂', reveal: ['A-2:7:1', 'A-2:16:0'], inventory: 'jadeHead' },
  { id: 'jade-body', group: 'jade', title: '鸟身残玉', art: 'prop-jade-body', mark: '玉', material: '青白玉 · 鸟身', detail: '从先王棺侧取回的一角。浅刻的羽纹停在早年锯开的断口。', quote: '他攥紧玉，掌上的伤被硌了一下。', source: '宗庙 · 先王棺侧', reveal: ['A-6:15:0', 'A-6:19:0'], inventory: 'jadeBody' },
  { id: 'jade-joined', group: 'jade', title: '三玉相合', art: 'prop-jade-joined', mark: '玉', material: '鸟首 · 鸟身 · 鸟尾', detail: '三角残玉重新排成同一只鸟。断口能够吻合，旧日锯开的缝却没有消失。', quote: '摆在一起却仍旧各自分开，谁也不会替谁长回去。', source: '屈衡书房 · 大祭前夜', reveal: ['A-6:25:0', 'A-6:25:1'] },
  { id: 'birds', group: 'birds', title: '两只木鸟', art: 'prop-birds', mark: '鸟', material: '旧木 · 少年的刀痕', detail: '一只尾巴刻歪，只能斜着站；另一只翅膀削得太薄，断掉半边。都是戌做的。', quote: '阿媪接过木鸟，用拇指摸了摸断翅，再还给他。', source: '戌家 · 炉火旁', reveal: ['1-5:13:1', '1-5:22:0', '终-1:8:1'], inventory: 'birds' },
  { id: 'bone', group: 'bone', title: '卜骨', art: 'prop-bone', mark: '卜', material: '骨质 · 手掌磨亮的边角', detail: '骨面两道裂纹分向两头。经历会留下，物件仍回到同一夜原来的样子。', quote: '边角被许多人摸得光亮。', source: '朔夜 · 竹林', reveal: ['1-8:11:0', '1-8:14:0'], inventory: 'bone' },
  { id: 'flute-old', group: 'flute-old', title: '旧箱里的骨笛', art: 'prop-flute-old', mark: '笛', material: '旧骨 · 缠好的断处', detail: '屈衡藏了四十多年的旧物。骨笛断过，又缠好，和那件小旧衣、十根名简收在一起。', quote: '一支断过又缠好的骨笛。', source: '屈衡书房 · 旧箱', reveal: ['A-5:13:2', 'A-6a:3:0'] },
  { id: 'flute-mi', group: 'flute-mi', title: '芈的骨笛', art: 'prop-flute-mi', mark: '笛', material: '浅色骨管 · 随身之物', detail: '芈以骨笛、手势和鸟与人往来。笛子放低时，也有人愿意等他把话说完。', quote: '第三日，芈用骨笛招来一群白鹭。', source: '西行 · 白鹭落下', reveal: ['B-2:12:4', 'B-2:12:6', 'B-2:14:0'] },
  { id: 'flute-mi-broken', group: 'flute-mi', title: '缠坏的骨笛', art: 'prop-flute-mi-broken', mark: '笛', material: '同一支骨笛 · 裂口与旧布', detail: '过洞时撞坏，一直漏气。细枝卡过裂口，后来旧布一层层缠厚，仍没能把那支笛子修好。', quote: '布一层缠一层，越缠越厚。', source: '雪洞 · 迟来的晨光', reveal: ['B-12-1:3:1', 'B-12-1:3:2', 'B-12-1:16:3', 'B-13:8:2'] },
  { id: 'names', group: 'names', title: '十根旧队名简', art: 'prop-names', mark: '名', material: '竹简 · 水渍与旧刻痕', detail: '前九根竹色深浅不一，名字已难辨。最后一根是“衡”，旁边多出一道横，横末留着一点旧痕。', quote: '“衡”字旁多出一道横，横末有一点很黑的旧痕。', source: '屈衡书房 · 请止西行', reveal: ['A-5:13:3', 'A-6a:3:1'], inventory: 'names' },
];

export const RELIC_ART = RELICS.map(relic => relic.art);
const byId = new Map(RELICS.map(relic => [relic.id, relic]));
export const relicById = (id: string): Relic | undefined => byId.get(id as RelicId);
export const relicForBeat = (beatId: string): Relic | undefined => RELICS.find(relic => relic.reveal.includes(beatId));
export const relicUnlocked = (relic: Relic, profile: Profile): boolean => relic.reveal.some(id => profile.read.includes(id));

/** One card per object, with only the most recent *seen* state on its cover. */
export function seenRelics(profile: Profile): Relic[] {
  const groups = new Map<string, Relic>();
  for (const relic of RELICS) if (relicUnlocked(relic, profile)) groups.set(relic.group, relic);
  return [...groups.values()];
}

export function relicForItem(id: string, profile: Profile): Relic | undefined {
  return RELICS.find(relic => relic.inventory === id && relicUnlocked(relic, profile));
}

export function relicHeld(relic: Relic, state: GameState | null): boolean {
  if (!state) return false;
  if (relic.id === 'jade-joined') return ['jadeHead', 'jadeBody', 'jadeTail'].every(id => state.inventory.includes(id));
  return !!relic.inventory && state.inventory.includes(relic.inventory);
}

// These engine items have illustrated studies; hide their labels until the
// relevant page has actually been read, even though inventory is scene based.
export const illustratedInventoryItem = (id: string): boolean => RELICS.some(relic => relic.inventory === id);
