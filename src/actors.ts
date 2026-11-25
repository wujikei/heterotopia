import { characterFor, CHARACTERS } from './data/world';
import { extraFor } from './data/extras';
import { BEAT_OVERRIDES, expressionForBeat, type Expression } from './data/expressions';
import { presenceForBeat } from './data/presence';
import { modernExpressionForBeat } from './data/modernPerformance';
import { actorPortraitCandidates, variantForBeat, type ActorVariant } from './data/actorVariants';
import { overseasArt, overseasPortrait } from './overseasArt';
import type { OverseasTone } from './overseasIdentity';
import type { Beat, Character, Scene } from './types';

export type StageActor = { character: Character; label: string; castKey: string; expression: Expression; variant: ActorVariant };

export function portraitCandidatesForActor(actor: StageActor, tone?: OverseasTone): string[] {
  const names = actorPortraitCandidates(actor);
  if (!tone || tone === 'neutral' || actor.character.key !== 'linyue') return names;
  const suited = names.map(name => overseasArt(name, tone)).filter((name, index) => name !== names[index]);
  const trail = actor.variant === 'trail' ? overseasArt('portrait-linyue-trail', tone) : 'portrait-linyue-trail';
  const selected = overseasPortrait('linyue', tone);
  return [...new Set([...suited, ...(actor.variant === 'trail' && trail !== 'portrait-linyue-trail' ? [trail] : []), selected, ...names])];
}

/** Presentation only: the speaker and the story state stay untouched. */
export function actorForBeat(beat: Beat, scene: Scene, beats: Beat[]): StageActor | undefined {
  if (beat.kind !== 'text') return;
  let character = characterFor(beat.speaker);
  // In the overseas ancient chapters Lin Yue speaks through Xu's body.
  const modernBorrowed = scene.script === 'modern' && character?.key === 'linyue' && scene.route === 'common';
  if (modernBorrowed) character = characterFor('戌');
  const extra = character ? undefined : extraFor(beat.speaker);
  if (!character && extra) character = extra;
  let silent = false;
  if (!character) {
    character = CHARACTERS.find(item => presenceForBeat(beat.id).includes(item.key));
    if (!character) return;
    silent = true;
  }
  const silentBorrowed = silent && character.key === 'xu' && ['royal', 'kunlun', 'common'].includes(scene.route);
  const castKey = silentBorrowed ? 'shen' : character.key;
  let borrowed = silentBorrowed || beat.speaker.includes('戌（沈辞）');
  if (character.key === 'shen' && (['royal', 'kunlun', 'common'].includes(scene.route) || scene.id === '终-1')) {
    const returnedIndex = beats.findIndex(item => item.kind === 'text' && item.text.includes('虎口白疤却留在戌'));
    if (scene.id !== '终-1' || returnedIndex < 0 || beats.findIndex(item => item.id === beat.id) <= returnedIndex) {
      character = characterFor('戌')!;
      borrowed = true;
    }
  }
  return { character, label: modernBorrowed ? '林越（戌身）' : borrowed ? '戌（沈辞）' : character.name, castKey, expression: modernExpressionForBeat(beat, character.key) ?? (silent ? BEAT_OVERRIDES[beat.id] ?? 'default' : expressionForBeat(beat)), variant: variantForBeat(character.key, beat, scene) };
}

export function actorInCast(actor: StageActor, cast: string[]): boolean {
  return cast.includes(actor.character.key) || cast.includes(actor.castKey);
}
