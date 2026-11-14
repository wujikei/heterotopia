import { asset, portraitName } from '../assets';
import type { Beat } from '../types';

export const EXPRESSIONS = ['default', 'smile', 'surprised', 'angry', 'sad', 'closed'] as const;
export type Expression = typeof EXPRESSIONS[number];
export const EXPRESSION_LABELS: Record<Expression, string> = { default: '平静', smile: '笑', surprised: '惊', angry: '怒', sad: '悲', closed: '闭眼' };

// This is a delivery register, not a wish list. Add an expression only after its
// transparent image has been reviewed and exported to public/art.
export const AVAILABLE: Record<string, Expression[]> = {
  shen: ['default', 'smile', 'surprised', 'angry', 'sad', 'closed'],
  xu: ['default', 'smile', 'surprised', 'angry', 'sad', 'closed'],
  tang: ['default', 'smile', 'surprised', 'sad'], amao: ['default', 'smile', 'surprised', 'sad'],
  quheng: ['default', 'smile', 'surprised', 'sad'], yu: ['default', 'smile', 'surprised', 'sad'],
  xua: ['default', 'smile', 'surprised', 'sad'], yuan: ['default', 'smile', 'surprised', 'sad'],
  song: ['default'], elder: ['default'], chang: ['default'], mi: ['default'], tu: ['default'], wuyang: ['default'],
};

// Free stage directions are deliberately conservative: speaking softly,
// looking down, being blindfolded or holding a medicine bag is not sadness.
export const MOOD_RULES: readonly [RegExp, Expression][] = [
  [/苦笑|含泪|哽|泣|哭|悲|哑声|极费力/, 'sad'],
  [/闭眼|闭上眼|阖眼|合眼/, 'closed'],
  [/惊|猛地坐起|猛地回头|愣|错愕|难以置信/, 'surprised'],
  [/愤|怒|嘶声|扬声|咬牙|咬紧牙/, 'angry'],
  [/笑|带一点笑/, 'smile'],
];

// Presentation annotations only. These IDs and their original words remain
// unchanged in story.json; explicit annotations take precedence over mood tags.
export const BEAT_OVERRIDES: Record<string, Expression> = {
  '0-1:15:0': 'surprised',
  '0-6:9:0': 'surprised',
  '0-8:24:0': 'angry',
  '1-2:9:0': 'smile',
  '1-5:18:0': 'sad',
  '1-12:11:0': 'sad',
  'A-1:16:0': 'surprised',
  'A-5:17:0': 'surprised',
  'A-5:22:0': 'sad',
  'A-6a:9:0': 'sad',
  'A-E2-4:6:0': 'sad',
  'B-3-2:4:0': 'surprised',
  'B-4:13:0': 'smile',
  'B-7-5:12:0': 'smile',
  'B-9-6:8:0': 'sad',
  'B-10-3:11:0': 'smile',
  'B-10-4:6:0': 'sad',
  'B-10-4:8:0': 'sad',
  'B-13:4:0': 'surprised',
  'B-13:29:0': 'surprised',
  '终-1:9:0': 'smile',
  '终-1:26:0': 'smile',
  '终-3:4:0': 'sad',
  '终-3:16:0': 'smile',
  '终-4:13:0': 'smile',
  '终-4:14:0': 'smile',
};

export function inferExpression(mood: string): Expression {
  return MOOD_RULES.find(([rule]) => rule.test(mood))?.[1] ?? 'default';
}

export function expressionForBeat(beat: Beat): Expression {
  return BEAT_OVERRIDES[beat.id] ?? (beat.kind === 'text' ? inferExpression(beat.mood) : 'default');
}

export function availableExpression(key: string, expression: Expression): Expression {
  return AVAILABLE[key]?.includes(expression) ? expression : 'default';
}

export function portraitNameFor(key: string, expression: Expression = 'default'): string {
  const selected = availableExpression(key, expression);
  return selected === 'default' ? portraitName(key) : `portrait-${key}-${selected}`;
}

export const portraitFor = (key: string, expression: Expression = 'default') => asset(portraitNameFor(key, expression));
