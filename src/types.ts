import type { OverseasOpeningIdentity } from './overseasIdentity';

export type Route = 'prologue' | 'common' | 'royal' | 'kunlun' | 'return';
export type EndingId = 'blade' | 'mercy' | 'leave' | 'names' | 'kunlun' | 'home' | `modern-${string}` | `shenci-${string}`;
export type Campaign = 'original' | 'overseas' | 'shenci';
export type Language = 'zh' | 'en' | 'ja' | 'de';
export interface RawBlock { tag: string; lines: string[]; pages?: string[]; options?: Choice[]; when?: { choice: string; value: string }; background?: string; cast?: string[]; domesticOnly?: boolean; returnMemory?: true; prompt?: string; blackout?: boolean; effects?: string[]; royalCollapseOnly?: boolean }
export interface Scene { id: string; title: string; chapter: string; route: Route; background: string; blocks: RawBlock[]; next?: string; ending?: EndingId; script?: 'modern' | 'shenci'; sourceId?: string; interlude?: boolean; endingTitle?: string; redirect?: { when: { choice: string; value: string }; target: string } }
export interface Choice { key: string; title: string; detail: string; target?: string; disabled?: boolean; hint?: string; requires?: { sceneId: string; lastChoice?: string } }
export interface BeatBase { id: string; background: string; cast: string[]; atmosphere: string; audioCueId: string; direction: string; blackout?: boolean; effects?: string[] }
export interface TextBeat extends BeatBase { kind: 'text'; speaker: string; mood: string; text: string }
export interface ChoiceBeat extends BeatBase { kind: 'choice'; prompt: string; choices: Choice[] }
export interface EndingBeat extends BeatBase { kind: 'ending'; ending: EndingId }
export type Beat = TextBeat | ChoiceBeat | EndingBeat;
export interface Profile {
  version: 1;
  campaign?: Campaign;
  visited: string[];
  read: string[];
  art: string[];
  met: string[];
  endings: EndingId[];
  oldNames: boolean;
}
export interface HistoryEntry { id: string; sceneId: string; speaker: string; text: string; kind: 'text' | 'choice' }
export interface GameState {
  version: 1;
  campaign?: Campaign;
  overseasIdentity?: OverseasOpeningIdentity;
  sceneId: string;
  beatId: string;
  inventory: string[];
  choices: Record<string, string>;
  history: HistoryEntry[];
  cycle: number;
}
export interface SaveSlot { version: 1; savedAt: string; state: GameState; label?: string }
export interface Settings {
  language: Language;
  textSpeed: number;
  autoDelay: number;
  fontSize: number;
  musicVolume: number;
  ambienceVolume: number;
  sfxVolume: number;
  muted: boolean;
  reducedMotion: boolean;
  showSprites: boolean;
  lightweight: boolean;
  autoAfterChoice: boolean;
}
export interface Character {
  key: string;
  name: string;
  reading?: string;
  subtitle: string;
  description: string;
  quote: string;
  first: string;
  color: string;
}
