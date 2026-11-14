import { BACKGROUNDS } from './data/world';
import type { Beat, Scene } from './types';

export function locationForBeat(scene: Scene, beat: Beat): string {
  if (scene.id === '0-7' && beat.background === 'bedroom') return '沈家卧室 · 黎明前';
  if (scene.id === '终-4' && beat.background.startsWith('bedroom')) return '沈家卧室 · 数日后傍晚';
  return BACKGROUNDS[beat.background]?.subtitle ?? scene.title;
}
