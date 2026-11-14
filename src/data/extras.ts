import type { Character } from '../types';

export const EXTRAS: Character[] = [
  { key: 'mother', name: '母亲', subtitle: '饭还热着', description: '沈辞的母亲。早晨隔门叫他起床，洗校服、夹面、叮嘱分科，也会把新添的一双筷子摆上桌。', quote: '烫，等会儿再喝。', first: '0-1', color: '#d4b99b' },
  { key: 'gouzi', name: '狗子', subtitle: '河滩上的少年', description: '巫村少年。曾在河边学戌说话，也在老觋让他掌灯时，跟着走向竹林。', quote: '怎么，神把你退回来了？', first: '1-3', color: '#b5ad8e' },
  { key: 'zhou', name: '周老师', subtitle: '黑板边的归字', description: '高一七班的老师。她在课堂里讲楚地巫祭与乘风来去的人，粉笔敲在“归”字边上。', quote: '讲到哪儿了？', first: '0-4', color: '#b9c8c3' },
  { key: 'daoist', name: '道士', subtitle: '校门外的螺丝', description: '常在学校附近出现的邋遢道士。收拾螺丝、留心古图，衣摆沾着湿泥。', quote: '小友，气色不好啊。', first: '0-6', color: '#b9b6aa' },
  { key: 'aheng', name: '阿蘅', subtitle: '山里的采药人', description: '山中采药人。背篓比肩宽，裤腿沾泥，腰边系红果；为路过的孩子诊看伤病，又捎上一把别人托求的山茶种。', quote: '走到我跟前，还跟我省字。', first: 'B-8', color: '#b5bda2' },
];

// Only reviewed exports may enter this register. Unknown or undelivered
// characters keep the existing empty stage; no invented silhouette is shown.
export const AVAILABLE_EXTRAS = new Set(EXTRAS.map(character => character.key));
export function extraFor(name: string): Character | undefined {
  return EXTRAS.find(character => AVAILABLE_EXTRAS.has(character.key) && (name === character.name || (character.key === 'daoist' && name === '邋遢道士')));
}
