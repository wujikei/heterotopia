import { locationForBeat } from './scenePresentation';
import { presentChapterTitle, presentSceneTitle, presentStoryText } from './editorial';
import { currentBeat, restoreEditorialBookmark, sceneById } from './engine';
import type { GameState, Profile } from './types';

export function slotPresentation(state: GameState, profile: Profile, display: (id: string, text: string) => string = presentStoryText, limit = 20, wrapWords = false) {
  const scene = sceneById(state.sceneId);
  const fallback = { background: scene.background, title: presentSceneTitle(scene), chapter: presentChapterTitle(scene), excerpt: '' };
  try {
    const restored = restoreEditorialBookmark(state, profile);
    const beat = currentBeat(restored, profile);
    // currentBeat intentionally falls back to the first page for obsolete saves.
    // That page is not necessarily where this bookmark was made.
    if (beat.id !== restored.beatId) return fallback;
    const text = beat.kind === 'text' ? display(beat.id, beat.text) : '';
    const location = restored.sceneId === scene.id ? scene : sceneById(restored.sceneId);
    return {
      background: beat.background,
      title: locationForBeat(location, beat),
      chapter: presentChapterTitle(location),
      excerpt: excerpt(text, limit, wrapWords),
    };
  } catch { return fallback; }
}

function excerpt(text: string, limit: number, wrapWords: boolean): string {
  const characters = Array.from(text);
  if (characters.length <= limit) return text;
  let end = limit;
  if (wrapWords) {
    const prefix = characters.slice(0, limit).join('');
    const boundary = prefix.lastIndexOf(' ');
    if (boundary > limit * 0.55) end = Array.from(prefix.slice(0, boundary)).length;
  }
  return characters.slice(0, end).join('') + '…';
}
