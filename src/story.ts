import index from './data/scene-index.json';
import shenciIndex from './data/shenci-index.json';
import modernIndex from './data/modern-index.json';
import type { Campaign, Scene } from './types';

export let SCENES: Scene[] = index.scenes.map(scene => ({ ...scene, blocks: [] })) as Scene[];
export let STORY = { ...index, scenes: SCENES };
export let MODERN_SCENES: Scene[] = modernIndex.scenes.map(scene => ({ ...scene, blocks: [] })) as Scene[];
export const MODERN_STORY = modernIndex;
export const SHENCI_SCENES = shenciIndex.scenes.map(scene => ({ ...scene, blocks: [] })) as Scene[];
export const SHENCI_STORY = shenciIndex;
const shenciScenePositions = new Map(SHENCI_SCENES.map((scene, index) => [scene.id, index]));
const shenciOpeningIds = new Set(SHENCI_SCENES.filter(scene => scene.route === 'prologue').map(scene => scene.id));
let shenciOpeningReady = false;
let shenciOpeningLoading: Promise<void> | undefined;
let shenciLoading: Promise<void> | undefined;
let shenciReady = false;
let ready = false;
let modernReady = false;
let loading: Promise<void> | undefined;
let modernLoading: Promise<void> | undefined;

export const isStoryReady = (campaign: Campaign = 'original') => campaign === 'overseas' ? modernReady : campaign === 'shenci' ? shenciReady : ready;
export const isSceneReady = (campaign: Campaign, sceneId: string) =>
  campaign === 'shenci' && shenciOpeningIds.has(sceneId) ? shenciOpeningReady : isStoryReady(campaign);

function installShenciScenes(scenes: Scene[]) {
  for (const scene of scenes) SHENCI_SCENES[shenciScenePositions.get(scene.id)!] = scene;
}

function loadShenciOpening(): Promise<void> {
  if (shenciOpeningReady) return Promise.resolve();
  return shenciOpeningLoading ??= import('./data/shenci-opening.json').then(({ default: data }) => {
    installShenciScenes(data.scenes as Scene[]);
    shenciOpeningReady = true;
  }).catch(error => { shenciOpeningLoading = undefined; throw error; });
}

/** The prologue is independently playable. The main story also needs it for chapter replay. */
export function loadSceneStory(campaign: Campaign, sceneId: string): Promise<void> {
  return campaign === 'shenci' && shenciOpeningIds.has(sceneId) ? loadShenciOpening() : loadStory(campaign);
}

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
    return shenciLoading ??= Promise.all([loadShenciOpening(), import('./data/shenci-story.json')]).then(([, { default: data }]) => {
      installShenciScenes(data.scenes as Scene[]);
      shenciReady = true;
    }).catch(error => { shenciLoading = undefined; throw error; });
  }
  return campaign === 'overseas' ? loadModernStory() : loadOriginalStory();
}
