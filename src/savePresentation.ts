import { BACKGROUNDS } from './data/world';
import { currentBeat, sceneById } from './engine';
import type { GameState, Profile } from './types';

export function slotPresentation(state: GameState, profile: Profile) {
  const scene = sceneById(state.sceneId);
  const fallback = { background: scene.background, title: scene.title, chapter: scene.chapter, excerpt: '' };
  try {
    const beat = currentBeat(state, profile);
    // currentBeat intentionally falls back to the first page for obsolete saves.
    // That page is not necessarily where this bookmark was made.
    if (beat.id !== state.beatId) return fallback;
    return {
      background: beat.background,
      title: BACKGROUNDS[beat.background]?.subtitle ?? scene.title,
      chapter: scene.chapter,
      excerpt: beat.kind === 'text' ? [...beat.text].slice(0, 20).join('') + ([...beat.text].length > 20 ? '…' : '') : '',
    };
  } catch { return fallback; }
}
