import { portraitNameFor, type Expression } from './expressions';
import type { Beat, Scene } from '../types';

export type ActorVariant = 'default' | 'home' | 'school' | 'dining' | 'winter' | 'listening' | 'palm' | 'tired';

// Only reviewed, exported sprites belong here. Expressions fall back within
// the current outfit before trying a canonical portrait on a network failure.
export const ACTOR_VARIANTS: Record<string, Partial<Record<ActorVariant, readonly Expression[]>>> = {
  shen: { home: ['default', 'surprised', 'smile'], school: ['default', 'smile', 'surprised', 'angry', 'sad', 'closed'] },
  tang: { dining: ['default'] },
  xu: { winter: ['default', 'sad'] },
  mi: { listening: ['default'], palm: ['default'], tired: ['default'] },
};

export const POSE_BEATS: Record<string, ActorVariant> = {
  'B-2:12:2': 'palm',
  'B-2:12:6': 'listening',
  'B-5-5:8:4': 'listening',
  'B-7-2:7:1': 'listening',
  'B-7-5:13:2': 'palm',
  'B-10-4:11:4': 'tired',
  'B-11:3:3': 'tired',
  'B-12-1:3:6': 'tired',
  'B-12-1:16:3': 'tired',
  'B-13:28:0': 'palm',
};

export function variantForBeat(key: string, beat: Beat, scene: Scene): ActorVariant {
  if (key === 'mi') return POSE_BEATS[beat.id] ?? 'default';
  if (key === 'shen') {
    if (scene.id === '0-1' || scene.id === '终-5' || (scene.id === '终-4' && beat.background.startsWith('bedroom'))) return 'home';
    if (['0-2', '0-4', '0-7', '0-10', '0-11', '终-2', '终-3'].includes(scene.id) || beat.background.startsWith('classroom')) return 'school';
  }
  if (key === 'tang' && ['0-2', '终-5'].includes(scene.id)) return 'dining';
  if (key === 'xu' && ['B-11', 'B-12-1', 'B-12-2', 'A-E2-4'].includes(scene.id)) return 'winter';
  return 'default';
}

export function actorPortraitName(actor: { character: { key: string }; variant: ActorVariant; expression: Expression }, expression = actor.expression): string {
  const { key } = actor.character;
  const delivered = ACTOR_VARIANTS[key]?.[actor.variant];
  if (!delivered) return portraitNameFor(key, expression);
  const selected = delivered.includes(expression) ? expression : 'default';
  return `portrait-${key}-${actor.variant}${selected === 'default' ? '' : `-${selected}`}`;
}

export function actorPortraitCandidates(actor: Parameters<typeof actorPortraitName>[0]): string[] {
  return [...new Set([actorPortraitName(actor), actorPortraitName(actor, 'default'), portraitNameFor(actor.character.key, actor.expression), portraitNameFor(actor.character.key)])];
}
