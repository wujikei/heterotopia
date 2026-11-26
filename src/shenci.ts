import type { Beat, EndingId, GameState, Profile, Scene } from './types';
import { characterFor } from './data/world';
import { extraFor } from './data/extras';

export const isShenci = (id: string) => id.startsWith('shenci-');
export const SHENCI_START = 'shenci-d-0-1';
export const SHENCI_FORK = 'shenci-d-1-13';
export const SHENCI_RETURN_ENDING = 'shenci-return-ending';
export const shenciHasRoyal = (p: Profile) => p.endings.some(id => id.startsWith('shenci-royal-'));
export const shenciHasKunlun = (p: Profile) => p.endings.includes('shenci-kunlun');
export const shenciComplete = (p: Profile) => shenciHasRoyal(p) && shenciHasKunlun(p);
export const shenciAfterEnding = (ending: EndingId) => ending === 'shenci-kunlun' ? 'shenci-m-3-1' : /shenci-royal-(?:e1|g1|g2)$/.test(ending) ? 'shenci-r-G-0' : 'shenci-m-2-1';

export function shenciInventory(scene: Scene, old: string[]) {
  if (scene.id === SHENCI_START) return [];
  if (scene.id === SHENCI_FORK || scene.id === `${SHENCI_FORK}r`) return ['map','box','birds','bone','jadeTail'];
  if (scene.id === 'shenci-m-2-1' || scene.id === 'shenci-m-3-1') return ['map'];
  const additions: Record<string, string[]> = { 'shenci-d-0-9':['map'], 'shenci-d-1-8':['box','birds','bone','jadeTail'], 'shenci-r-D-5':['names'] };
  return [...new Set([...old, ...additions[scene.id] ?? []])];
}

export function compileShenci(scene: Scene, profile: Profile, state: Pick<GameState, 'choices'>): Beat[] {
  let background = scene.background, cast: string[] = [], atmosphere = '', audioCueId = '', direction = '';
  let musicCue: string | undefined, ambienceCue: string | undefined, stageEffect: string | undefined, stageCueId: string | undefined, blackout = false, section = 0;
  const beats: Beat[] = [];
  for (const [i, b] of scene.blocks.entries()) {
    const id = `${scene.id}:${i}`;
    if (b.when && state.choices[b.when.choice] !== b.when.value) continue;
    if (b.royalCollapseOnly && !/shenci-royal-(?:e1|g1|g2)$/.test(state.choices[SHENCI_RETURN_ENDING] ?? '')) continue;
    const text = b.lines.join('\n');
    const marker = scene.sections?.findIndex(entry => entry.start === i) ?? -1;
    if (marker >= 0) section = marker;
    if (b.background) { background = b.background; blackout = false; }
    if (b.musicCue) { musicCue = b.musicCue; stageEffect = undefined; stageCueId = undefined; }
    if (b.ambienceCue) ambienceCue = b.ambienceCue;
    if (b.stageEffect) { stageEffect = b.stageEffect; stageCueId = id; }
    const base = () => ({ id, background, cast: [...cast], atmosphere, audioCueId, direction, musicCue, ambienceCue, stageEffect, stageCueId, section });
    const [speaker, ...moods] = b.tag.split('·');
    if (speaker === '背景') continue;
    if (speaker === '演出') { direction = text; if (b.blackout) blackout = true; continue; }
    if (speaker === '音效') { atmosphere = text; audioCueId = id; continue; }
    if (speaker === '立绘') {
      cast = [...new Set([...text.matchAll(/沈辞|唐瑾|宋嘉树|阿媪|屈衡|巫阳|大巫祝|老觋|母亲|狗子|道士|周老师|雩|芈|荼|媭|沅|棠|戌/g)].flatMap(m => (characterFor(m[0]) ?? extraFor(m[0]))?.key ?? []))];
      continue;
    }
    if (speaker === '选择') {
      if (scene.interlude) continue;
      const options = (b.options ?? []).filter(option => {
        const req = option.requires;
        if (!req) return true;
        if (req.lastChoice) return Object.entries(state.choices).some(([k,v]) => k.startsWith(`${req.sceneId}:`) && v === req.lastChoice);
        return profile.visited.includes(req.sceneId);
      }).map(option => {
        const walked = scene.id === SHENCI_FORK && (option.key === '1' ? shenciHasRoyal(profile) : shenciHasKunlun(profile));
        return walked ? { ...option, disabled: true, hint: '这一条路已经走过。' } : option;
      });
      beats.push({ ...base(), kind: 'choice', prompt: b.prompt ?? '这一刻，你如何选择？', choices: options });
      continue;
    }
    const who = speaker === '旁白' ? '' : speaker;
    const actor = characterFor(who) ?? extraFor(scene.route === 'return' && who === '老师' ? '周老师' : who);
    if (actor) cast = [actor.key];
    for (const [pageIndex,page] of (b.pages ?? b.lines).entries()) {
      beats.push({ ...base(), id: `${id}:${pageIndex}`, kind: 'text', speaker: who, mood: moods.join('·') || (page.startsWith('（心里）') ? '内心' : ''), text: page, ...(b.blackout || blackout ? { blackout: true } : {}), ...(pageIndex === 0 && b.effects?.length ? { effects: b.effects } : {}) });
    }
    direction = '';
  }
  const endingBase = { id: `${scene.id}:ending`, background, cast, atmosphere, audioCueId, direction: '', musicCue, ambienceCue, section };
  if (scene.ending) beats.push({ ...endingBase, kind: 'ending', ending: scene.ending });
  if (scene.interlude) {
    const done = shenciComplete(profile);
    beats.push({ ...endingBase, id: `${scene.id}:return`, kind: 'choice', prompt: done ? '两道裂纹，一同亮了起来。' : '烤薯还烫，饼还温着。', choices: [done
      ? { key: 'return', title: '留在这边', detail: '继续沈辞在现代的日子。', target: 'shenci-m-4-0' }
      : { key: 'return', title: '回到马车旁', detail: '记忆留下，物件归回原处。', target: `${SHENCI_FORK}r` }] });
  }
  return beats;
}
