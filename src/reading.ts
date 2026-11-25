import { compileScene } from './engine';
import { isOmittedPage, isSilentPage } from './editorial';
import { presentOverseasReflection } from './overseasIdentity';
import type { GameState, Profile } from './types';

// A log entry has no inventory or choice snapshot. Re-read only the current
// visit, after its last choice, so going back cannot replay a taken decision.
export function historyTargets(state: GameState, profile: Profile): Map<number, string> {
  const beats = compileScene(state.sceneId, profile, state);
  const position = beats.findIndex(beat => beat.id === state.beatId);
  if (position < 0) return new Map();
  const targets = new Map<number, string>();
  let cursor = position - 1;
  for (let index = state.history.length - 1; index >= 0 && cursor >= 0; index--) {
    const entry = state.history[index];
    if (entry.sceneId !== state.sceneId || entry.kind !== 'text') break;
    if (isOmittedPage(entry.id) || isSilentPage(entry.id)) continue;
    while (cursor >= 0 && isSilentPage(beats[cursor].id)) cursor--;
    if (cursor < 0) break;
    const beat = beats[cursor--];
    if (beat.kind !== 'text' || beat.id !== entry.id || beat.text !== presentOverseasReflection(entry.id, entry.text)) break;
    targets.set(index, entry.id);
  }
  return targets;
}

export function replayHistory(state: GameState, profile: Profile, index: number): GameState {
  const beatId = historyTargets(state, profile).get(index);
  return beatId ? { ...state, beatId, history: state.history.slice(0, index) } : state;
}
