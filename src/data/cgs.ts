import type { Beat, EndingId, Profile } from '../types';

export type CGTrigger = { endingId: EndingId } | { beatIds: string[] } | { sceneId: string; fromBeat?: string; toBeat?: string };
export type CG = { id: string; title: string; caption: string; file: string; thumbnail?: string; trigger: CGTrigger };

// Reviewed ComfyUI exports. The trigger register also controls gallery unlocking.
export const CGS: CG[] = [
  { id: 'e1-blade', title: '天亮以前', caption: '那些被他们从人脚下拖出来的人，也确实活到了天亮。', file: 'cg-e1-blade', thumbnail: 'cg-e1-blade-thumb', trigger: { endingId: 'blade' } },
  { id: 'e2-mercy', title: '亭外无人', caption: '亭外无人等他，他终于不用怕说得慢。', file: 'cg-e2-mercy', thumbnail: 'cg-e2-mercy-thumb', trigger: { endingId: 'mercy' } },
  { id: 'e3-leave', title: '我叫戌', caption: '岸上的鸟，和学校操场后面几乎一样。', file: 'cg-e3-leave', thumbnail: 'cg-e3-leave-thumb', trigger: { endingId: 'leave' } },
  { id: 'e4-names', title: '没有说完的名字', caption: '有话……趁能说。', file: 'cg-e4-names', thumbnail: 'cg-e4-names-thumb', trigger: { endingId: 'names' } },
  { id: 'e5-kunlun', title: '两片夜之间', caption: '他原来以为只有抵达才能将旅程留下。', file: 'cg-e5-kunlun', thumbnail: 'cg-e5-kunlun-thumb', trigger: { endingId: 'kunlun' } },
  { id: 'e6-home', title: '再添半碗', caption: '我还要半碗。', file: 'cg-e6-home', thumbnail: 'cg-e6-home-thumb', trigger: { endingId: 'home' } },
  { id: 's01-dream-boat', title: '船底的敲击', caption: '船底下有东西在敲。', file: 'cg-s01-dream-boat', thumbnail: 'cg-s01-dream-boat-thumb', trigger: { sceneId: '0-1', fromBeat: '0-1:3:0', toBeat: '0-1:4:0' } },
  { id: 's02-first-crossing', title: '河拐弯以前', caption: '谁都没有先放下。', file: 'cg-s02-first-crossing', thumbnail: 'cg-s02-first-crossing-thumb', trigger: { sceneId: 'B-1', fromBeat: 'B-1:21:0', toBeat: 'B-1:22:3' } },
  { id: 's03-ritual', title: '也叫他们', caption: '名字只够台顶两人听见。', file: 'cg-s03-ritual', thumbnail: 'cg-s03-ritual-thumb', trigger: { sceneId: 'A-8', fromBeat: 'A-8:8:1', toBeat: 'A-8:11:1' } },
  { id: 's04-old-names', title: '旧箱与断笛', caption: '那十个孩子的名字。', file: 'cg-s04-old-names', thumbnail: 'cg-s04-old-names-thumb', trigger: { sceneId: 'A-6a', fromBeat: 'A-6a:3:0', toBeat: 'A-6a:6:0' } },
  { id: 's05-mi-flute', title: '没吹完的一声笛', caption: '每一个漏掉的音，都有人肯多停一会儿。', file: 'cg-s05-mi-flute', thumbnail: 'cg-s05-mi-flute-thumb', trigger: { beatIds: ['B-13:8:2'] } },
  { id: 's06-snow-hands', title: '不松', caption: '衣襟下的手，谁的，也没有松。', file: 'cg-s06-snow-hands', thumbnail: 'cg-s06-snow-hands-thumb', trigger: { sceneId: 'B-12-2', fromBeat: 'B-12-2:3:1', toBeat: 'B-12-2:9:7' } },
  { id: 's07-light-river', title: '把旅程留下', caption: '两片夜之间横着宽河。', file: 'cg-s07-light-river', thumbnail: 'cg-s07-light-river-thumb', trigger: { sceneId: 'B-13', fromBeat: 'B-13:3:1', toBeat: 'B-13:3:3' } },
  { id: 's08-farewell', title: '掌心的两下', caption: '说不出的话，也有人肯等。', file: 'cg-s08-farewell', thumbnail: 'cg-s08-farewell-thumb', trigger: { beatIds: ['终-1:22:2', '终-1:27:1'] } },
];

function pageOrder(id: string): number {
  const parts = id.split(':');
  return Number(parts.at(-2)) * 10000 + Number(parts.at(-1));
}
function matches(cg: CG, beat: Beat, sceneId: string): boolean {
  const trigger = cg.trigger;
  if ('endingId' in trigger) return beat.kind === 'ending' && beat.ending === trigger.endingId;
  if ('beatIds' in trigger) return trigger.beatIds.includes(beat.id);
  return trigger.sceneId === sceneId && (!trigger.fromBeat || pageOrder(beat.id) >= pageOrder(trigger.fromBeat)) && (!trigger.toBeat || pageOrder(beat.id) <= pageOrder(trigger.toBeat));
}

export const cgForBeat = (beat: Beat, sceneId: string): CG | undefined => CGS.find(cg => !!cg.file && matches(cg, beat, sceneId));
export const cgForEnding = (endingId: EndingId): CG | undefined => CGS.find(cg => !!cg.file && 'endingId' in cg.trigger && cg.trigger.endingId === endingId);
export function cgUnlocked(cg: CG, profile: Profile): boolean {
  const trigger = cg.trigger;
  if ('endingId' in trigger) return profile.endings.includes(trigger.endingId);
  if ('beatIds' in trigger) return trigger.beatIds.some(id => profile.read.includes(id));
  if (!trigger.fromBeat && !trigger.toBeat) return profile.visited.includes(trigger.sceneId);
  return profile.read.some(id => id.startsWith(`${trigger.sceneId}:`) && (!trigger.fromBeat || pageOrder(id) >= pageOrder(trigger.fromBeat)) && (!trigger.toBeat || pageOrder(id) <= pageOrder(trigger.toBeat)));
}
