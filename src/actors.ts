import { characterFor, CHARACTERS } from './data/world';
import { extraFor } from './data/extras';
import { expressionForBeat, type Expression } from './data/expressions';
import { presenceForBeat } from './data/presence';
import type { Beat, Character, Scene } from './types';

export type StageActor = { character: Character; label: string; castKey: string; expression: Expression };

/** Presentation only: the speaker and the story state stay untouched. */
export function actorForBeat(beat: Beat, scene: Scene, beats: Beat[]): StageActor | undefined {
  if (beat.kind !== 'text') return;
  let character = characterFor(beat.speaker);
  const extra = character ? undefined : extraFor(beat.speaker);
  if (!character && extra) character = extra;
  if (!character) {
    character = CHARACTERS.find(item => presenceForBeat(beat.id).includes(item.key));
    if (!character) return;
    return { character, label: character.name, castKey: character.key, expression: 'default' };
  }
  const castKey = character.key;
  let borrowed = beat.speaker.includes('戌（沈辞）');
  if (character.key === 'shen' && (['royal', 'kunlun', 'common'].includes(scene.route) || scene.id === '终-1')) {
    const returnedIndex = beats.findIndex(item => item.kind === 'text' && item.text.includes('虎口白疤却留在戌'));
    if (scene.id !== '终-1' || returnedIndex < 0 || beats.findIndex(item => item.id === beat.id) <= returnedIndex) {
      character = characterFor('戌')!;
      borrowed = true;
    }
  }
  return { character, label: borrowed ? '戌（沈辞）' : character.name, castKey, expression: expressionForBeat(beat) };
}

export function actorInCast(actor: StageActor, cast: string[]): boolean {
  return cast.includes(actor.character.key) || cast.includes(actor.castKey);
}
