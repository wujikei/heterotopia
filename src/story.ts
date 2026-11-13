import index from './data/scene-index.json';
import type { Scene } from './types';

export let SCENES: Scene[] = index.scenes.map(scene => ({ ...scene, blocks: [] })) as Scene[];
export let STORY = { ...index, scenes: SCENES };
let ready = false;
let loading: Promise<void> | undefined;

export const isStoryReady = () => ready;

/** Coalesce idle prefetch and a reader's click; a failed download can be retried. */
export function loadStory(): Promise<void> {
  if (ready) return Promise.resolve();
  return loading ??= import('./data/story.json').then(module => {
    STORY = module.default as typeof STORY;
    SCENES = STORY.scenes;
    ready = true;
  }).catch(error => { loading = undefined; throw error; });
}
