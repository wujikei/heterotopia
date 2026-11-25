import type { GameState } from './types';

export const OVERSEAS_TONES = [
  { id: 'light', label: '浅肤色' },
  { id: 'neutral', label: '暖调肤色' },
  { id: 'deep', label: '深肤色' },
] as const;

export const OVERSEAS_TRADITIONS = [
  { id: '1', label: '古典辩问', detail: '从苏格拉底的广场辩问里，学到怎样追问。', phrase: '先承认自己还不知道。' },
  { id: '2', label: '寻因之学', detail: '读过伊本·西那的哲学，习惯沿着事物寻找起因。', phrase: '沿着一件事，追到它最初的起因。' },
  { id: '3', label: '观苦与止息', detail: '熟悉南亚佛教对苦的追问，留心痛苦从何而来。', phrase: '想想眼前的人，为何受苦。' },
  { id: '4', label: '家中的典籍', detail: '从家人读过的儒家经典里，听过关于生死的追问。', phrase: '先问怎样活，再问怎样离开。' },
] as const;

export type OverseasTone = typeof OVERSEAS_TONES[number]['id'];
export type OverseasTradition = typeof OVERSEAS_TRADITIONS[number]['id'];
export interface OverseasOpeningIdentity { tone: OverseasTone; tradition: OverseasTradition }

export const DEFAULT_OVERSEAS_IDENTITY: OverseasOpeningIdentity = { tone: 'neutral', tradition: '4' };
export const OVERSEAS_REFLECTION_SCENE = 'modern-o-2-6';
export const OVERSEAS_REFLECTION_CHOICE = `${OVERSEAS_REFLECTION_SCENE}:0`;

export function validOverseasIdentity(value: unknown): value is OverseasOpeningIdentity {
  if (!value || typeof value !== 'object') return false;
  const identity = value as Partial<OverseasOpeningIdentity>;
  return OVERSEAS_TONES.some(tone => tone.id === identity.tone) && OVERSEAS_TRADITIONS.some(tradition => tradition.id === identity.tradition);
}

export function traditionForReflection(state: Pick<GameState, 'choices' | 'overseasIdentity'>): string | undefined {
  return state.overseasIdentity?.tradition ?? state.choices[OVERSEAS_REFLECTION_CHOICE];
}

export function presentOverseasChoiceLabel(id: string, source: string): string {
  return id.startsWith(`${OVERSEAS_REFLECTION_CHOICE}:`)
    ? OVERSEAS_TRADITIONS.find(tradition => id === `${OVERSEAS_REFLECTION_CHOICE}:${tradition.id}`)?.phrase ?? source
    : source;
}

const REFLECTION_PAGES: Readonly<Partial<Record<string, readonly [string, string]>>> = {
  'modern-o-2-6:10:0': ['（河上起了一点风。你自己在心里想——）', '（河上起了一点风。那句问话，让你想起自己早就听过的另一些话。）'],
  'modern-o-2-6:24:0': ['（想完，你回到河边。那人还在，走两步，停一停。）', '（你回过神来。那人还在河边，走两步，停一停。）'],
  'modern-o-2-6:25:0': ['（你什么也没说。跨文化这一处，只在你心里发生，不由你说破，也不改变任何事。）', '（你没有说出口。那人继续往前走，你听着他的脚步，一声一声远了。）'],
};

export function presentOverseasReflection(id: string, source: string): string {
  const edit = REFLECTION_PAGES[id];
  return edit && source === edit[0] ? edit[1] : source;
}
