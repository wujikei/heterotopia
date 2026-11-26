import index from './data/scene-index.json';
import shenciIndex from './data/shenci-index.json';
import modernIndex from './data/modern-index.json';
import type { Campaign, Scene } from './types';

export let SCENES: Scene[] = index.scenes.map(scene => ({ ...scene, blocks: [] })) as Scene[];
export let STORY = { ...index, scenes: SCENES };
export let MODERN_SCENES: Scene[] = modernIndex.scenes.map(scene => ({ ...scene, blocks: [] })) as Scene[];
export const MODERN_STORY = modernIndex;
export let SHENCI_SCENES = shenciIndex.scenes.map(scene => ({ ...scene, blocks: [] })) as Scene[];
export const SHENCI_STORY = shenciIndex;
let shenciReady = false;
let shenciLoading: Promise<void> | undefined;
let ready = false;
let modernReady = false;
let loading: Promise<void> | undefined;
let modernLoading: Promise<void> | undefined;

export const isStoryReady = (campaign: Campaign = 'original') => campaign === 'overseas' ? modernReady : campaign === 'shenci' ? shenciReady : ready;

function loadOriginalStory(): Promise<void> {
  if (ready) return Promise.resolve();
  return loading ??= import('./data/story.json').then(module => {
    STORY = module.default as typeof STORY;
    SCENES = STORY.scenes;
    ready = true;
  }).catch(error => { loading = undefined; throw error; });
}

function loadModernStory(): Promise<void> {
  if (modernReady) return Promise.resolve();
  return modernLoading ??= import('./data/modern-story.json').then(module => {
    MODERN_SCENES = module.default.scenes as Scene[];
    modernReady = true;
  }).catch(error => { modernLoading = undefined; throw error; });
}

/** Coalesce idle prefetch and a reader's click; failed downloads can be retried. */
export function loadStory(campaign: Campaign = 'original'): Promise<void> {
  if (campaign === 'shenci') {
    if (shenciReady) return Promise.resolve();
    return shenciLoading ??= import('./data/shenci-story.json').then(({ default: data }) => {
      SHENCI_SCENES = data.scenes as Scene[];
      shenciReady = true;
    }).catch(error => { shenciLoading = undefined; throw error; });
  }
  return campaign === 'overseas' ? loadModernStory() : loadOriginalStory();
}
