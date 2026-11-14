import type { Beat } from '../types';

/** Explicit screenplay boundaries; never infer the time from a passing memory. */
export function timeOfDayBackground(sceneId: string, beat: Beat): string {
  const [, blockId, pageId] = beat.id.split(':');
  const block = Number(blockId), page = Number(pageId ?? 0);
  if (sceneId === '0-1' && block >= 11) return 'bedroom-morning'; // phone: 07:12
  if (sceneId === '0-2') return 'home-morning';
  if (sceneId === '0-7' && block >= 11) return 'bedroom'; // waking before daylight
  if (sceneId === '0-8' && block >= 6 && block < 18) return 'canteen-day';
  if (sceneId === '终-4' && beat.background === 'bedroom') return 'bedroom-evening';
  if (sceneId === 'B-12-1' && block === 18 && page >= 1) return 'snow-night';
  if (sceneId === 'B-12-2') return block === 9 && page >= 7 ? 'snow' : 'snow-night';
  return beat.background;
}
