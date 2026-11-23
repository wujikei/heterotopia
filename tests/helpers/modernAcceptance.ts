import { advance, compileScene, currentBeat, enterScene, newGame, newProfile, recordProgress } from '../../src/engine';

/** Engine-derived synthetic reading history; never a claim of a human playthrough. */
export function modernAcceptanceSeed(sceneId: string, beatId?: string) {
  let profile = newProfile('overseas');
  let state = newGame(profile);
  if (!['modern-o-0-1', 'modern-o-0-2'].includes(sceneId)) state = enterScene(state, profile, sceneId);
  const target = beatId ?? enterScene(state, profile, sceneId).beatId;
  for (let step = 0; step < 200; step++) {
    if (state.sceneId === sceneId && state.beatId === target) {
      profile = recordProgress(state, profile);
      const beat = currentBeat(state, profile);
      const pages = compileScene(sceneId, profile, state);
      return {
        format: 'heterotopia-save', version: 1, campaign: 'overseas', profile, state,
        slots: [{ version: 1, savedAt: '2026-11-24T00:00:00+09:00', state }, null, null, null, null, null],
        acceptance: { synthetic: true, beatId: beat.id, page: pages.findIndex(page => page.id === beat.id) + 1, total: pages.length, text: beat.kind === 'text' ? beat.text : '', historyPages: state.history.length },
      };
    }
    const next = advance(state, profile);
    if (next === state) throw new Error(`Acceptance path cannot advance to ${sceneId}/${target}`);
    state = next;
    profile = recordProgress(state, profile);
  }
  throw new Error(`Acceptance page not reached: ${sceneId}/${target}`);
}
