import type { Expression } from './expressions';
import type { Beat } from '../types';

// Only exported, reviewed states belong here. These affect performance, not words.
export const MODERN_CHARACTER_STATES = {
  linyue: ['default', 'thoughtful', 'smile', 'puzzled', 'alert', 'surprised'],
  roommate: ['default', 'focused', 'smile', 'puzzled', 'concerned', 'surprised'],
} as const satisfies Record<string, readonly Expression[]>;

type ModernPerformance = { character: keyof typeof MODERN_CHARACTER_STATES; expression: Expression; excerpt: string };
export const MODERN_PERFORMANCE_BEATS: Record<string, ModernPerformance> = {
  'modern-o-0-1:12:0': { character: 'linyue', expression: 'thoughtful', excerpt: '刻得有意思' },
  'modern-o-0-1:14:0': { character: 'linyue', expression: 'smile', excerpt: '从人，从可' },
  'modern-o-0-1:19:0': { character: 'linyue', expression: 'puzzled', excerpt: '到底问什么' },
  'modern-o-0-1:25:0': { character: 'linyue', expression: 'alert', excerpt: '离这个文化有多远' },
  'modern-o-0-2:10:0': { character: 'linyue', expression: 'thoughtful', excerpt: '何。' },
  'modern-o-0-2:12:0': { character: 'linyue', expression: 'thoughtful', excerpt: '何。' },
  'modern-o-0-2:14:0': { character: 'linyue', expression: 'puzzled', excerpt: '何。' },
  'modern-o-0-2:24:0': { character: 'roommate', expression: 'concerned', excerpt: '脸色怎么这么白' },
  'modern-o-4-1:20:0': { character: 'roommate', expression: 'concerned', excerpt: '想家了' },
  'modern-o-4-1:21:0': { character: 'linyue', expression: 'puzzled', excerpt: '没有' },
  'modern-o-4-1:23:0': { character: 'linyue', expression: 'thoughtful', excerpt: '没放回去' },
  'modern-o-4-2:14:0': { character: 'linyue', expression: 'thoughtful', excerpt: '三个月' },
  'modern-o-4-2:18:0': { character: 'linyue', expression: 'thoughtful', excerpt: '写清楚' },
  'modern-o-5-2:19:0': { character: 'linyue', expression: 'smile', excerpt: '想。' },
  'modern-o-5-2:21:0': { character: 'linyue', expression: 'thoughtful', excerpt: '弄懂它' },
  'modern-o-5-4:14:0': { character: 'linyue', expression: 'smile', excerpt: '教自己背' },
};

export function modernExpressionForBeat(beat: Beat, character: string): Expression | undefined {
  const direction = MODERN_PERFORMANCE_BEATS[beat.id];
  return direction?.character === character ? direction.expression : undefined;
}
