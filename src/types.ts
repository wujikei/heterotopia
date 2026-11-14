export type Route = 'prologue' | 'common' | 'royal' | 'kunlun' | 'return';
export type EndingId = 'blade' | 'mercy' | 'leave' | 'names' | 'kunlun' | 'home';
export interface RawBlock { tag: string; lines: string[]; pages?: string[] }
export interface Scene { id: string; title: string; chapter: string; route: Route; background: string; blocks: RawBlock[] }
export interface Choice { key: string; title: string; detail: string; target?: string; disabled?: boolean; hint?: string }
export interface BeatBase { id: string; background: string; cast: string[]; atmosphere: string; audioCueId: string; direction: string }
export interface TextBeat extends BeatBase { kind: 'text'; speaker: string; mood: string; text: string }
export interface ChoiceBeat extends BeatBase { kind: 'choice'; prompt: string; choices: Choice[] }
export interface EndingBeat extends BeatBase { kind: 'ending'; ending: EndingId }
export type Beat = TextBeat | ChoiceBeat | EndingBeat;
export interface Profile {
  version: 1;
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
  sceneId: string;
  beatId: string;
  inventory: string[];
  choices: Record<string, string>;
  history: HistoryEntry[];
  cycle: number;
}
export interface SaveSlot { version: 1; savedAt: string; state: GameState; label?: string }
export interface Settings {
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
