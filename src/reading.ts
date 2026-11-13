import { compileScene } from './engine';
import type { GameState, Profile } from './types';

// A log entry has no inventory or choice snapshot. Re-read only the current
// visit, after its last choice, so going back cannot replay a taken decision.
export function historyTargets(state: GameState, profile: Profile): Map<number, string> {
  const beats = compileScene(state.sceneId, profile, state);
  const position = beats.findIndex(beat => beat.id === state.beatId);
  if (position < 0) return new Map();
  const targets = new Map<number, string>();
  for (let index = state.history.length - 1, cursor = position - 1; index >= 0 && cursor >= 0; index--, cursor--) {
    const entry = state.history[index], beat = beats[cursor];
    if (entry.sceneId !== state.sceneId || entry.kind !== 'text' || beat.kind !== 'text' || beat.id !== entry.id || beat.text !== entry.text) break;
    targets.set(index, entry.id);
  }
  return targets;
}

export function replayHistory(state: GameState, profile: Profile, index: number): GameState {
  const beatId = historyTargets(state, profile).get(index);
  return beatId ? { ...state, beatId, history: state.history.slice(0, index) } : state;
}
