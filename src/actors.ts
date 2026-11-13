import { characterFor } from './data/world';
import type { Beat, Character, Scene } from './types';

export type StageActor = { character: Character; label: string; castKey: string };

/** Presentation only: the speaker and the story state stay untouched. */
export function actorForBeat(beat: Beat, scene: Scene, beats: Beat[]): StageActor | undefined {
  if (beat.kind !== 'text') return;
  let character = characterFor(beat.speaker);
  if (!character) return;
  const castKey = character.key;
  let borrowed = beat.speaker.includes('戌（沈辞）');
  if (character.key === 'shen' && (['royal', 'kunlun', 'common'].includes(scene.route) || scene.id === '终-1')) {
    const returnedIndex = beats.findIndex(item => item.kind === 'text' && item.text.includes('虎口白疤却留在戌'));
    if (scene.id !== '终-1' || returnedIndex < 0 || beats.findIndex(item => item.id === beat.id) <= returnedIndex) {
      character = characterFor('戌')!;
      borrowed = true;
    }
  }
  return { character, label: borrowed ? '戌（沈辞）' : character.name, castKey };
}

export function actorInCast(actor: StageActor, cast: string[]): boolean {
  return cast.includes(actor.character.key) || cast.includes(actor.castKey);
}
