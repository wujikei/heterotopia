import { sceneById } from './engine';
import { isShenci } from './shenci';
import rawSoundtrack from './data/soundtrack.json';
import type { Beat, EndingId, Profile } from './types';
import { isModern, MODERN_ARRIVAL_ART, MODERN_GLANCE_ART, MODERN_NOTEBOOK_ART, MODERN_PAPER_NOTE_ART, MODERN_PHOTO_ART, MODERN_STALL_ART, MODERN_SUMMIT_ART, MODERN_TRANSLATION_ART } from './modern';
import { OVERSEAS_MUSIC_BY_SCENE } from './data/overseasScore';
import { MODERN_BLACKOUTS } from './data/modernStaging';

export const ORIGINAL_MUSIC_IDS = ['river-home', 'paper-note', 'hearth', 'river-journey', 'old-jade', 'ritual', 'under-current', 'small-goodbyes', 'last-flute', 'river-of-names', 'light-in-kitchen'] as const;
export const MUSIC_IDS = [...ORIGINAL_MUSIC_IDS, 'modern-street', 'modern-question', 'modern-return', 'modern-untranslated', 'modern-ascent', 'modern-afterglow', 'chu-night-river', 'chu-storm', 'shenci-playful'] as const;
export type MusicId = typeof MUSIC_IDS[number];
export const AMBIENCE_IDS = ['river', 'rain', 'hearth', 'wind', 'winter', 'room', 'night', 'street', 'marsh', 'underwater', 'cave', 'palace'] as const;
export type AmbienceId = typeof AMBIENCE_IDS[number];
export const EFFECT_IDS = ['page', 'choice', 'bookmark', 'bronze', 'triple-bell', 'ritual-drum', 'hull', 'alarm', 'school-bell', 'door', 'wood-latch', 'bamboo', 'cloth', 'ceramic', 'splash', 'oar', 'drop', 'electric', 'chair', 'steps', 'stone', 'string-snap', 'ball', 'bike-bell', 'flute', 'crow', 'pottery', 'heartbeat', 'dorm-bowl', 'camera-shutter'] as const;
export type EffectId = typeof EFFECT_IDS[number];
export interface Track { id: MusicId; title: string; subtitle: string; bpm: number; keyscale: string; file: string; seconds: number }
export const SOUNDTRACK = rawSoundtrack as Track[];
export const trackById = (id: MusicId) => SOUNDTRACK.find(track => track.id === id)!;
type EmbeddedAudio = typeof globalThis & { __HETEROTOPIA_AUDIO__?: Record<string, string> };
export const audioAsset = (file: string) => (globalThis as EmbeddedAudio).__HETEROTOPIA_AUDIO__?.[file] ?? `${import.meta.env?.BASE_URL ?? './'}audio/${file}`;

export interface Effect { id: EffectId; at?: number; gain?: number; pan?: number }
export interface SoundEvent { id: string; effects: Effect[] }
export type UiSoundKind = 'page' | 'choice' | 'stamp' | 'open' | 'close' | 'toggle' | 'bell' | 'save' | 'preview';

/** Existing recordings only. UI intent stays separate from screenplay cues. */
export const UI_EFFECTS: Record<UiSoundKind, Readonly<Effect>> = {
  page: { id: 'page', gain: .12 },
  choice: { id: 'choice', gain: .33 },
  stamp: { id: 'wood-latch', gain: .42 },
  open: { id: 'cloth', gain: .18 },
  close: { id: 'page', gain: .14 },
  toggle: { id: 'choice', gain: .18 },
  bell: { id: 'bronze', gain: .12 },
  save: { id: 'bookmark', gain: .28 },
  preview: { id: 'choice', gain: .33 },
};

// Authored additions go here when their recordings exist. Empty hooks never
// introduce an extra bell or disturb the screenplay's three silent farewells.
export const CHAPTER_EFFECTS: Record<string, Effect[]> = {};
export const ENDING_EFFECTS: Partial<Record<EndingId, Effect[]>> = {};
export const MUSIC_ALTERNATES: Partial<Record<MusicId, { file: string; seconds: number }>> = {};
export function musicSegment(id: MusicId, cycle = 0): { file: string; seconds: number } {
  return cycle % 2 === 1 && MUSIC_ALTERNATES[id] ? MUSIC_ALTERNATES[id]! : trackById(id);
}
export const chapterSoundEvent = (sceneId: string): SoundEvent | null => CHAPTER_EFFECTS[sceneId]?.length
  ? { id: `chapter:${sceneId}`, effects: CHAPTER_EFFECTS[sceneId] } : null;
export interface ScoreFrame {
  scene: string;
  cue: string;
  music: MusicId | null;
  musicGain: number;
  ambience: [AmbienceId, number][];
  events: SoundEvent[];
  transition: number;
  musicFade?: number;
  ambienceFade?: number;
  releaseBeforeLoad?: boolean;
  prepareMusic?: MusicId;
  prepareEffects?: readonly EffectId[];
}

// Authored against the screenplay's scene and block IDs. Paragraph changes keep
// the same cue ID, so reading slowly never retriggers an alarm or a bell.
export const MUSIC_BY_SCENE: Record<string, MusicId> = {
  '0-1': 'under-current', '0-2': 'paper-note', '0-3': 'paper-note', '0-4': 'paper-note', '0-5': 'paper-note', '0-6': 'paper-note', '0-7': 'under-current', '0-8': 'paper-note', '0-9': 'paper-note', '0-10': 'paper-note', '0-11': 'under-current',
  '1-1': 'hearth', '1-2': 'hearth', '1-3': 'river-journey', '1-4': 'old-jade', '1-5': 'hearth', '1-6': 'old-jade', '1-7': 'ritual', '1-8': 'old-jade', '1-9': 'old-jade', '1-10': 'river-journey', '1-11': 'old-jade', '1-12': 'hearth',
  'A-1': 'river-journey', 'A-2': 'old-jade', 'A-3': 'hearth', 'A-4': 'old-jade', 'A-5': 'old-jade', 'A-6': 'under-current', 'A-6a': 'old-jade', 'A-7': 'ritual', 'A-8': 'old-jade', 'A-9': 'under-current',
  'A-E1-1': 'ritual', 'A-E1-2': 'old-jade', 'A-E2-1': 'old-jade', 'A-E2-2': 'small-goodbyes', 'A-E2-3': 'river-journey', 'A-E2-4': 'last-flute', 'A-E3-1': 'under-current', 'A-E3-2': 'old-jade', 'A-E3-3': 'river-home', 'A-H-1': 'river-of-names',
  'B-1': 'river-journey', 'B-2': 'river-journey', 'B-3-1': 'under-current', 'B-3-2': 'under-current', 'B-3-3': 'under-current', 'B-4': 'hearth',
  'B-5-1': 'old-jade', 'B-5-2': 'small-goodbyes', 'B-5-3': 'small-goodbyes', 'B-5-4': 'small-goodbyes', 'B-5-5': 'small-goodbyes', 'B-5-6': 'small-goodbyes',
  'B-6': 'old-jade', 'B-7-1': 'old-jade', 'B-7-2': 'old-jade', 'B-7-3': 'under-current', 'B-7-4': 'under-current', 'B-7-5': 'hearth', 'B-8': 'under-current',
  'B-9-1': 'hearth', 'B-9-2': 'old-jade', 'B-9-3': 'old-jade', 'B-9-4': 'under-current', 'B-9-5': 'small-goodbyes', 'B-9-6': 'small-goodbyes',
  'B-10-1': 'small-goodbyes', 'B-10-2': 'under-current', 'B-10-3': 'under-current', 'B-10-4': 'small-goodbyes', 'B-11': 'last-flute', 'B-12-1': 'last-flute', 'B-12-2': 'last-flute', 'B-13': 'river-of-names',
  '终-1': 'river-of-names', '终-2': 'light-in-kitchen', '终-3': 'light-in-kitchen', '终-4': 'light-in-kitchen', '终-5': 'light-in-kitchen',
};

export const TRACK_ART: Record<MusicId, string> = {
  'river-home': 'hero', 'paper-note': 'classroom-day', hearth: 'hut', 'river-journey': 'river',
  'old-jade': 'study', ritual: 'ritual', 'under-current': 'marsh', 'small-goodbyes': 'mountain',
  'last-flute': 'snow', 'river-of-names': 'light-river', 'light-in-kitchen': 'home',
  'modern-street': MODERN_ARRIVAL_ART, 'modern-question': 'cg-modern-dorm-carving-r2',
  'modern-return': 'cg-modern-noodles', 'modern-untranslated': MODERN_TRANSLATION_ART,
  'modern-ascent': 'modern-mountain-path', 'modern-afterglow': MODERN_PHOTO_ART, 'shenci-playful': 'school',
  'chu-night-river': 'modern-night-river', 'chu-storm': 'cg-modern-storm',
};

// Secondary cues must be discoverable in the listening room before the full
// manuscript is loaded. Retain previously unlocked tracks as well.
const OTHER_TRACKS: Partial<Record<string, readonly MusicId[]>> = {
  '0-1': ['paper-note'], '0-9': ['old-jade'], '0-10': ['under-current'],
  '1-4': ['ritual'], '1-5': ['old-jade'], 'A-6': ['old-jade'],
  'modern-r-B-11': ['small-goodbyes'], 'modern-k-B-3': ['ritual'], 'modern-k-E-12': ['river-of-names'],
};
const LEGACY_MODERN_TRACKS: Partial<Record<string, readonly MusicId[]>> = {
  'modern-o-4-1': ['small-goodbyes'], 'modern-o-4-2': ['small-goodbyes'], 'modern-o-5-7': ['light-in-kitchen'],
};
const OVERSEAS_SCORE_CUTS = new Set([
  'modern-o-0-3', 'modern-o-0-5', 'modern-o-2-1', 'modern-c-1-13',
  'modern-o-4-1', 'modern-o-4-2', 'modern-k-D-5', 'modern-k-D-7', 'modern-k-D-13', 'modern-k-G-1',
]);
const musicForScene = (sceneId: string): MusicId | null => (
  isModern(sceneId) ? OVERSEAS_MUSIC_BY_SCENE[sceneId] : MUSIC_BY_SCENE[sceneId]
) ?? null;

function shenciMusic(id: string): MusicId | null {
  const [, group, family, number] = id.split('-');
  const n = Number(number);
  if (group === 'd') {
    if (family === '0') return [1,7,11].includes(n) ? 'under-current' : 'paper-note';
    if (['2','3'].includes(number)) return 'ritual';
    if (number === '12z') return 'hearth';
    if (['9','10','11'].includes(number) || /^12[a-g]/.test(number)) return 'river-of-names';
    return 'hearth';
  }
  if (group === 'r') {
    if (family === 'G' && n === 0) return null;
    if (['E2','H','O'].includes(family)) return 'small-goodbyes';
    if (['G2','R'].includes(family)) return 'river-of-names';
    if (['L','S','F'].includes(family)) return 'river-home';
    if (family === 'E1' || family === 'G1' && n >= 5 || family === 'C' && n >= 9) return 'under-current';
    if (family === 'A' && n === 1) return 'river-journey';
    if (family === 'A' && n === 3) return 'hearth';
    if (family === 'A' && n >= 7 || family === 'C' && n >= 5 && n <= 7) return 'ritual';
    if (family === 'B' && n >= 8 && n <= 13 || family === 'C' && n === 8) return 'under-current';
    return 'old-jade';
  }
  if (group === 'k') {
    if (family === 'G') return null;
    if (family === 'A') return [4,5,6,9].includes(n) ? 'shenci-playful' : 'hearth';
    if (family === 'B') return [8,12,15].includes(n) ? 'small-goodbyes' : [2,3,4,5,6].includes(n) ? 'ritual' : 'river-journey';
    if (family === 'C') return n < 3 ? 'old-jade' : 'last-flute';
    if (family === 'D') return n < 4 ? 'river-journey' : n < 7 ? 'under-current' : n === 7 ? null : n < 12 ? 'small-goodbyes' : 'river-of-names';
    if (family === 'E') return [4,8,10].includes(n) ? 'under-current' : 'river-of-names';
    if (family === 'F') return n === 5 ? 'river-of-names' : n >= 6 ? null : 'last-flute';
    return family === 'Z' ? 'river-of-names' : 'small-goodbyes';
  }
  if (family === '4' && n === 4) return 'modern-ascent';
  if (family === '4' && n === 5) return 'light-in-kitchen';
  return family === '2' || family === '3' ? n === 1 ? 'paper-note' : 'light-in-kitchen' : 'river-home';
}
const readShenciMusic = (cue?: string): MusicId | null | undefined => cue === 'silence' ? null : cue === 'playful' ? 'shenci-playful' : MUSIC_IDS.find(m => m === cue);

export function tracksForVisit(sceneId: string): MusicId[] {
  if (isShenci(sceneId)) return [...new Set([shenciMusic(sceneId), ...sceneById(sceneId).blocks.map(block => readShenciMusic(block.musicCue))])].filter((track): track is MusicId => !!track);
  const track = musicForScene(sceneId);
  return [...(track ? [track] : []), ...(OTHER_TRACKS[sceneId] ?? []), ...(LEGACY_MODERN_TRACKS[sceneId] ?? [])];
}
export function unlockedTracks(profile: Pick<Profile, 'visited'>): MusicId[] {
  return [...new Set<MusicId>(['river-home', ...profile.visited.flatMap(tracksForVisit)])];
}

const e = (id: EffectId, gain = .65, at = 0, pan = 0): Effect => ({ id, gain, at, pan });
export const CUE_EFFECTS: Record<string, Effect[]> = {
  '0-1:1': [e('hull', .8, .25), e('oar', .55, 2.3), e('ritual-drum', .42, 3.1)],
  '0-1:6': [e('alarm', .48)], '0-1:10': [e('ceramic', .3, .5, -.15)],
  '0-2:1': [e('ceramic', .26, .5)], '0-3:1': [e('choice', .35, .9), e('choice', .28, 1.15)],
  '0-4:1': [e('school-bell', .35, .5), e('page', .3, 3.4)],
  '0-5:1': [e('ball', .55, .3, .17)], '0-5:4': [e('ball', .75)],
  '0-6:1': [e('wood-latch', .2, 1.2, -.4)],
  '0-7:1': [e('ritual-drum', .46, .4)], '0-7:10': [e('cloth', .3)],
  '0-8:1': [e('school-bell', .2, .7)], '0-9:1': [e('ball', .16, 1.8, .4)],
  '0-10:1': [e('page', .26, .4), e('chair', .12, 2.1, -.35)],
  '0-10:15': [e('electric', .58)], '0-10:19': [e('bronze', .16, 1.3, .3)],
  '0-11:1': [e('electric', .23), e('heartbeat', .53, .8)],
  '0-11:7': [e('chair', .65)], '0-11:18': [e('cloth', .2)],
  '1-1:1': [e('drop', .16, 1.7)], '1-2:1': [e('cloth', .27, .4)],
  '1-3:1': [e('splash', .15, 1.9, -.3)], '1-4:1': [e('ceramic', .24, .5), e('pottery', .3, 2.9)],
  '1-5:1': [e('cloth', .2, .8)], '1-5:14': [e('bamboo', .12, .8)],
  '1-6:1': [e('ceramic', .18, 1.3)], '1-7:1': [e('ritual-drum', .35, 2.8), e('bronze', .23, 4.2)],
  '1-8:1': [e('flute', .3, 1.6, -.22)], '1-9:1': [e('bronze', .14, 1.7)],
  '1-10:1': [e('bamboo', .2, 1.4)], '1-11:1': [e('bamboo', .34, 1), e('steps', .3, 2.1)],
  '1-12:1': [e('cloth', .23, .6)], 'A-1:1': [e('oar', .33, 1.1), e('bamboo', .22, 3)],
  'A-2:1': [e('cloth', .25)], 'A-2:6': [e('ceramic', .38, 0, -.3)],
  'A-3:1': [e('door', .5, .2), e('ceramic', .22, 2.1)],
  'A-4:1': [e('cloth', .22, 1.6)], 'A-5:1': [e('bamboo', .25, .6)],
  'A-6:1': [e('wood-latch', .4), e('stone', .52, .6), e('steps', .35, 3.1)],
  'A-6:7': [e('cloth', .36, .2, -.25)], 'A-6:21': [e('string-snap', .24, 1.1, .25)],
  'A-6a:1': [e('bamboo', .23, .4), e('steps', .12, 3.2, .35)],
  'A-7:1': [e('ritual-drum', .42, .5)], 'A-7:12': [e('triple-bell', .75, .2)],
  'A-8:20': [e('cloth', .25)], 'A-9:1': [e('string-snap', .24, .3), e('steps', .35, 1.1)],
  'A-E1-1:1': [e('bronze', .7), e('string-snap', .38, 1.3), e('cloth', .55, 1.8)],
  'A-E1-1:6': [e('wood-latch', .52), e('string-snap', .42, .5)],
  'A-E1-2:1': [e('steps', .27, .3)], 'A-E1-2:12': [e('bronze', .28), e('wood-latch', .14, .2)],
  'A-E2-1:1': [e('triple-bell', .62), e('steps', .2, 5.2)],
  'A-E2-2:1': [e('ritual-drum', .13), e('wood-latch', .35, 5.4)],
  'A-E2-3:1': [e('oar', .35, .3)], 'A-E2-4:1': [e('flute', .19, 2.5)],
  'A-E3-1:1': [e('cloth', .43), e('steps', .35, 1)],
  'A-E3-2:1': [e('bamboo', .36, .4)], 'A-E3-3:1': [e('bamboo', .24, .5)],
  'A-H-1:1': [e('triple-bell', .57), e('steps', .22, 5.6)],
  'B-1:1': [e('oar', .43, .2), e('crow', .24, 2.1, -.38)],
  'B-2:1': [e('oar', .3, 1.2)], 'B-2:22': [e('crow', .36, .2, -.4)],
  'B-3-1:1': [e('hull', .2, .6)], 'B-3-2:1': [e('bamboo', .52), e('splash', .28, .8)],
  'B-3-3:1': [e('bamboo', .36, .3), e('string-snap', .22, 1.1)],
  'B-4:1': [e('flute', .17, 2.4)], 'B-5-1:1': [e('wood-latch', .22, .7), e('splash', .15, 1.5)],
  'B-5-2:1': [e('ceramic', .19, .5)], 'B-5-3:1': [e('cloth', .3)],
  'B-5-4:1': [e('steps', .24, .6), e('bamboo', .14, 2.1)],
  'B-5-5:1': [e('cloth', .15, 1.2)], 'B-5-6:1': [e('bamboo', .2, .3)],
  'B-6:1': [e('door', .4, .3), e('ceramic', .22, 2.3)],
  'B-7-1:1': [e('oar', .25, .3), e('bamboo', .18, 1.8)],
  'B-7-2:1': [e('stone', .3, 1.6)], 'B-7-3:1': [e('bamboo', .25), e('cloth', .45, .8), e('splash', .47, 1.7)],
  'B-7-3:6': [e('splash', .65)], 'B-7-4:1': [e('bronze', .13, 1.9)],
  'B-7-4:6': [e('splash', .45)], 'B-7-5:1': [e('cloth', .22, .5)],
  'B-8:1': [e('steps', .32, 1), e('crow', .16, 3.1, .35)],
  'B-9-1:1': [e('ceramic', .2, .5)], 'B-9-2:1': [e('cloth', .23, .4)],
  'B-9-3:1': [e('wood-latch', .14, 1.3)], 'B-9-4:1': [e('pottery', .4, .8)],
  'B-9-6:1': [e('cloth', .19, .8)], 'B-10-1:1': [e('bamboo', .2, .6)],
  'B-10-2:1': [e('wood-latch', .4, .3), e('drop', .15, 2.1)],
  'B-10-3:1': [e('stone', .5, .4), e('string-snap', .3, 3.2)],
  'B-10-4:1': [e('cloth', .19, .7)], 'B-11:1': [e('cloth', .15, 1), e('crow', .12, 2.3, -.45)],
  'B-12-1:1': [e('flute', .27, 1.1)], 'B-12-2:1': [e('cloth', .13, 1)],
  'B-13:1': [e('flute', .26, 2.7)], '终-1:1': [e('wood-latch', .12, .6), e('flute', .24, 2)],
  '终-2:1': [e('page', .25), e('chair', .3, .8)], '终-3:1': [e('choice', .15, 1.1), e('ceramic', .16, 2.4)],
  '终-4:1': [e('bike-bell', .3, .8)], '终-5:1': [e('ceramic', .22, .5), e('bike-bell', .13, 2.8, .4)],
  'modern-o-0-3:1': [e('bronze', .32, .3), e('bronze', .17, 1.8)],
  'modern-o-0-5:1': [e('ceramic', .16, .6)],
};

const ACCENTS: Record<string, Effect[]> = {
  'A-8:11:1': [e('steps', .24, .3)],
  'B-5-5:8:2': [e('cloth', .12, .2)],
  'B-10-4:11:4': [e('bamboo', .12, .7)],
  'modern-o-4-1:24:0': [e('dorm-bowl', .30, .10, -.08)],
  'modern-o-5-1:8:0': [e('page', .18, .06, .12)],
  'modern-o-5-2:4:0': [e('electric', .1, .25)],
  'modern-o-5-2:8:0': [e('page', .17, .14, .10)],
  'modern-o-5-6:9:0': [e('cloth', .15, .18, .08)],
  'modern-o-5-7:17:0': [e('camera-shutter', .32, .09, .04)],
  'modern-k-D-5:3:0': [e('hull', .47, .07), e('splash', .57, .19, -.18)],
  'modern-k-D-5:5:0': [e('wood-latch', .39, .16, -.28)],
  'modern-k-E-12:3:0': [e('ritual-drum', .29, .12)],
};

const ENVIRONMENTS: Record<string, [AmbienceId, number][]> = {
  'modern-dorm': [['room', .4], ['street', .1]],
  'modern-library': [['room', .28]],
  'modern-classroom': [['room', .28]],
  'modern-office': [['room', .3], ['street', .07]],
  'modern-office-video': [['room', .24], ['street', .035]],
  'modern-mountain-path': [['wind', .3]],
  'modern-sunset': [['wind', .2], ['river', .1]],
  'modern-night-river': [['river', .32]],
  'modern-herb-eaves': [['wind', .11], ['river', .07]],
  'cg-modern-porridge-offering': [['wind', .14], ['river', .12]],
  [MODERN_ARRIVAL_ART]: [['street', .46]],
  [MODERN_STALL_ART]: [['street', .37]],
  'cg-modern-jade-palm-r2': [['street', .37]],
  'modern-dorm-quiet-r2': [['room', .36], ['street', .06]],
  'modern-royal-wall-night': [['wind', .48]],
  'modern-chu-courtyard': [['wind', .2]],
  'modern-minister-hall': [['palace', .25], ['hearth', .09]],
  'modern-minister-ancestor': [['palace', .18], ['wind', .07]],
  'modern-minister-veteran': [['wind', .2]],
  'modern-minister-orange': [['wind', .18]],
  'modern-minister-inlaw': [['wind', .12], ['palace', .08]],
  'modern-river-aboard': [['river', .8], ['wind', .17]],
  'cg-modern-selection': [['hearth', .32], ['palace', .12]],
  'cg-modern-ritual': [['hearth', .24], ['palace', .23]],
  'cg-modern-feast': [['palace', .37], ['hearth', .12]],
  'cg-modern-battle': [['wind', .34]],
  'cg-modern-city': [['wind', .27], ['hearth', .09]],
  'cg-modern-last-geese': [['wind', .23]],
  'cg-modern-storm': [['wind', .61], ['rain', .56]],
  'cg-modern-noodles': [['room', .35]],
  [MODERN_NOTEBOOK_ART]: [['room', .22]],
  [MODERN_TRANSLATION_ART]: [['room', .22]],
  'cg-modern-paper': [['room', .25], ['street', .07]],
  [MODERN_PAPER_NOTE_ART]: [['room', .25], ['street', .07]],
  [MODERN_GLANCE_ART]: [['wind', .28]],
  [MODERN_SUMMIT_ART]: [['wind', .25]],
  [MODERN_PHOTO_ART]: [['wind', .15], ['river', .08]],
  hero: [['river', .65], ['wind', .12]], 'dream-boat': [['river', .7], ['wind', .15]],
  bedroom: [['room', .25], ['street', .18]], home: [['room', .3], ['street', .15]],
  'bedroom-morning': [['room', .25], ['street', .22]],
  'bedroom-evening': [['room', .25], ['street', .12]],
  'home-morning': [['room', .3], ['street', .22]],
  bus: [['street', .65], ['room', .3]], school: [['wind', .28], ['street', .3]],
  classroom: [['room', .65], ['street', .08]], 'classroom-day': [['room', .6], ['street', .15]],
  'canteen-day': [['room', .4], ['street', .12]],
  alley: [['street', .65], ['wind', .12]], nightmare: [['underwater', .58], ['room', .12]],
  hut: [['hearth', .6], ['river', .12]], village: [['river', .5], ['wind', .2]],
  shrine: [['wind', .23], ['river', .32]], ritual: [['palace', .43], ['hearth', .18]],
  bamboo: [['night', .4], ['wind', .3]], study: [['palace', .35], ['wind', .12]],
  palace: [['palace', .5], ['hearth', .13]], tomb: [['cave', .6]],
  river: [['river', .8], ['wind', .17]], ruins: [['wind', .45], ['hearth', .22]],
  marsh: [['marsh', .75]], underwater: [['underwater', .8]], valley: [['wind', .35], ['river', .18]],
  cave: [['cave', .65], ['wind', .18]], snow: [['winter', .5], ['hearth', .26]],
  'snow-night': [['winter', .42], ['hearth', .09]],
  mountain: [['wind', .65]], 'light-river': [['river', .43], ['wind', .1]],
};

function directOverseasScore(frame: ScoreFrame, beat: Beat, block: number): void {
  const sceneId = frame.scene;
  frame.transition = 1.65;
  if (OVERSEAS_SCORE_CUTS.has(sceneId)) {
    frame.releaseBeforeLoad = true;
    frame.transition = .75;
    frame.ambienceFade = .65;
  }
  if (sceneId === 'modern-o-0-1') frame.musicGain = beat.background === MODERN_ARRIVAL_ART ? .68 : .55;
  if (sceneId === 'modern-o-0-4' && block >= 24) frame.prepareMusic = 'hearth';
  if (sceneId === 'modern-o-0-8') frame.prepareMusic = 'chu-night-river';
  if (sceneId === 'modern-o-0-2') {
    frame.musicGain = block >= 26 ? .15 : block >= 15 ? .3 : .57;
    frame.musicFade = .85;
    frame.ambience = block >= 26 ? [['rain', .48], ['marsh', .13]] : block >= 15 ? [['room', .18]] : frame.ambience;
    if (block >= 26) frame.prepareMusic = 'ritual';
  }
  if (sceneId === 'modern-o-0-3') {
    frame.musicGain = block >= 14 ? .49 : .32;
    frame.musicFade = 1.2;
    frame.ambience = [['rain', .53], ['hearth', .19]];
  }
  if (sceneId === 'modern-o-0-4') frame.musicGain = .5;
  if (sceneId.startsWith('modern-o-2-')) {
    frame.musicGain = sceneId === 'modern-o-2-7' ? .50 : .42;
    frame.ambience = [['river', .26], [
      ['modern-o-2-1', 'modern-o-2-3', 'modern-o-2-5'].includes(sceneId) ? 'night' : 'wind', .12,
    ]];
    if (sceneId === 'modern-o-2-7') {
      frame.ambience = [['river', .26]];
      frame.prepareMusic = 'old-jade';
    }
  }
  if (sceneId === 'modern-r-B-11' && beat.background === 'river') {
    frame.music = 'small-goodbyes';
    frame.musicGain = .35;
    frame.ambience = [['river', .20]];
    frame.releaseBeforeLoad = true;
    frame.transition = .65;
    frame.ambienceFade = .50;
  }
  if (sceneId === 'modern-r-C-11') {
    frame.musicGain = .38;
    frame.ambience = [['wind', .43]];
  }
  if (sceneId === 'modern-k-B-3' && beat.background === 'ritual') {
    frame.music = 'ritual';
    frame.musicGain = .58;
  }
  if (sceneId === 'modern-k-D-4' && block >= 8) {
    frame.prepareMusic = 'chu-storm';
    frame.ambience = [['river', .28], ['wind', .35]];
  }
  if (frame.music === 'chu-storm') {
    frame.musicGain = sceneId === 'modern-k-D-5' && block < 3 ? .39 : .59;
    frame.musicFade = .65;
  }
  if (sceneId === 'modern-k-D-7') frame.ambience = [['river', .23]];
  if (sceneId === 'modern-k-D-11' && block >= 6) {
    frame.musicGain = .16;
    frame.musicFade = .6;
    frame.ambience = [];
    frame.ambienceFade = .55;
  }
  if (sceneId === 'modern-k-D-12') {
    frame.musicGain = .31;
    frame.ambience = [['underwater', .34], ['river', .14]];
    frame.prepareMusic = 'river-of-names';
  }
  if (sceneId === 'modern-k-D-13' ||
      (sceneId.startsWith('modern-k-E-') && sceneId !== 'modern-k-E-12')) {
    frame.musicGain = frame.music === 'old-jade' ? .43 : .52;
    // A brief view of the dorm is his memory of the sun, while the boat remains here.
    frame.ambience = [['river', .18], ['wind', .1]];
  }
  if (sceneId === 'modern-k-E-12') {
    frame.musicGain = .56;
    frame.ambience = [['river', .17]];
    if (block >= 7) {
      frame.music = 'river-of-names';
      frame.musicGain = .35;
      frame.releaseBeforeLoad = true;
      frame.transition = .85;
    }
  }
  if (sceneId === 'modern-k-F-6') {
    frame.musicGain = .27;
    frame.musicFade = 1;
    frame.ambience = [['river', .15]];
    if (block >= 10) {
      frame.music = null;
      frame.transition = 1;
      frame.ambience = [['river', .08]];
    }
  }
  if (sceneId === 'modern-k-G-1') frame.ambience = [];
  else if (sceneId.startsWith('modern-k-G-')) frame.ambience = [['river', .17], ['wind', .10]];

  if (frame.music === 'modern-return') {
    frame.musicGain = block < 5 ? .45 : .72;
    if (block === 22 || block === 23) frame.prepareEffects = ['dorm-bowl'];
    if (block === 24) {
      frame.cue = beat.id;
      frame.musicGain = .24;
      frame.musicFade = .14;
      frame.ambience = [['room', .23], ['street', .06]];
      frame.ambienceFade = .32;
    }
    if (block === 25) frame.musicFade = 1.25;
  }
  if (frame.music === 'modern-untranslated') {
    const atNotebook = sceneId === 'modern-o-4-2' && block >= 8 && block <= 10;
    frame.musicGain = atNotebook ? .19 : .71;
    if (atNotebook) frame.musicFade = 1.1;
    if (sceneId === 'modern-o-4-2' && block < 5) {
      frame.musicGain = .43;
      frame.musicFade = 1.15;
    }
    if (sceneId === 'modern-o-5-2' && block >= 4) {
      frame.musicGain = .46;
      frame.musicFade = 1.15;
    }
  }
  if (frame.music === 'modern-ascent') {
    frame.musicGain = sceneId === 'modern-o-5-5' && block >= 4 && block <= 6 ? .43 : .74;
    if (beat.id === 'modern-o-5-6:9:0') frame.cue = beat.id;
  }
  if (frame.music === 'modern-afterglow') {
    const atShutter = beat.kind === 'text' && block >= 17 && block <= 18;
    frame.musicGain = atShutter ? .20 : .76;
    if (block >= 5 && block <= 14) {
      frame.ambience = [['river', .045]];
      frame.ambienceFade = 1.4;
    }
    if (block === 15 || block === 16) {
      frame.prepareEffects = ['camera-shutter'];
      frame.ambience = [['wind', .11], ['river', .045]];
      frame.ambienceFade = .65;
    }
    if (atShutter) {
      frame.cue = 'modern-o-5-7:17:0';
      frame.musicFade = .13;
      frame.ambience = [['wind', .06], ['river', .045]];
      frame.ambienceFade = .24;
    }
    if (block === 19) frame.musicFade = 1.25;
  }
  if (MODERN_BLACKOUTS.has(beat.id)) {
    frame.music = null;
    frame.transition = .18;
    frame.ambienceFade = .36;
    frame.ambience = sceneId === 'modern-o-0-2' ? [['rain', .24]]
      : sceneId === 'modern-r-B-8' ? [['river', .08]] : [];
  }
}

export function scoreFrame(sceneId: string, beat: Beat | null): ScoreFrame {
  if (!beat) return { scene: 'title', cue: 'title', music: 'river-home', musicGain: 1, ambience: ENVIRONMENTS.hero, events: [], transition: 1.6, releaseBeforeLoad: true };
  const [, rawBlock, rawPage] = beat.id.split(':');
  const block = Number(rawBlock), page = Number(rawPage ?? 0);
  const frame: ScoreFrame = {
    scene: sceneId, cue: beat.audioCueId, music: musicForScene(sceneId), musicGain: .88,
    ambience: ENVIRONMENTS[beat.background] ?? [['wind', .2]], transition: 4.5,
    events: [{ id: beat.audioCueId, effects: CUE_EFFECTS[beat.audioCueId] ?? [] }],
  };
  if (isShenci(sceneId)) {
    const cue = readShenciMusic(beat.musicCue);
    frame.music = cue === undefined ? shenciMusic(sceneId) : cue;
    frame.musicGain = frame.music === 'shenci-playful' ? .52 : frame.music === 'under-current' ? .64 : .73;
    frame.transition = frame.music === 'shenci-playful' ? .32 : frame.music ? 2.3 : 1.35;
    if (beat.ambienceCue === 'none' || sceneId === 'shenci-r-G-0' || sceneId === 'shenci-k-G-1' || beat.blackout) frame.ambience = [];
    else if (beat.ambienceCue) {
      const amb = AMBIENCE_IDS.find(x => x === beat.ambienceCue);
      if (amb) frame.ambience = [[amb, amb === 'rain' ? .50 : amb === 'wind' || amb === 'river' ? .28 : .21]];
    } else if (sceneId.startsWith('shenci-d-1-12')) frame.ambience = [['river', .24], ['night', .09]];
    if (beat.blackout) { frame.music = null; frame.transition = .45; }
    const effects = (beat.effects ?? []).flatMap(x => EFFECT_IDS.includes(x as EffectId) ? [e(x as EffectId, x === 'splash' ? .47 : .34)] : []);
    if (effects.length) frame.events.push({ id: beat.id, effects });
    if (beat.stageEffect && beat.stageCueId && EFFECT_IDS.includes(beat.stageEffect as EffectId)) {
      frame.events.push({ id: beat.stageCueId, effects: [e(beat.stageEffect as EffectId, beat.stageEffect === 'alarm' ? .54 : .33)] });
      if (beat.stageEffect === 'alarm') frame.transition = .18;
    }
  }
  if (isModern(sceneId)) directOverseasScore(frame, beat, block);
  if (ACCENTS[beat.id]) frame.events.push({ id: beat.id, effects: ACCENTS[beat.id] });
  if (sceneId === '0-1' && block >= 6) { frame.music = 'paper-note'; frame.transition = .18; }
  if (sceneId === '0-1' && block >= 4 && block < 6) frame.prepareMusic = 'paper-note';
  if (sceneId === '0-7' && block >= 10) { frame.music = null; frame.ambience = [['room', .18]]; frame.transition = .55; }
  if (sceneId === '0-9' && block >= 10) { frame.music = 'old-jade'; frame.musicGain = .48; frame.transition = 1.35; }
  if (sceneId === '0-10' && block >= 15) {
    frame.music = 'under-current'; frame.ambience = [['room', .1], ['underwater', .3]];
    frame.releaseBeforeLoad = true; frame.transition = .55; frame.ambienceFade = .60;
  }
  if (sceneId === '0-10' && block < 15) frame.prepareMusic = 'under-current';
  if (sceneId === '0-11' && block >= 18) { frame.music = null; frame.ambience = []; frame.transition = 1.4; }
  if (sceneId === '1-1') {
    frame.releaseBeforeLoad = true;
    frame.transition = .85;
    frame.ambienceFade = .65;
  }
  if (['1-5', '1-6', '1-7', '1-8', '1-9', 'A-E2-4'].includes(sceneId)) frame.ambience = [['rain', .63], ['hearth', .25]];
  if (sceneId === '1-4' && block >= 17) { frame.music = 'ritual'; frame.musicGain = .46; frame.transition = 1.1; }
  if (sceneId === '1-5' && block >= 14) { frame.music = 'old-jade'; frame.ambience = [['rain', .15], ['hearth', .25]]; }
  if (sceneId === 'A-6' && beat.background === 'study') { frame.music = 'old-jade'; frame.ambience = ENVIRONMENTS.study; }
  if (sceneId === 'A-8' && block >= 11 && block < 20) { frame.musicGain = .35; frame.ambience = [['palace', .08]]; }
  if (sceneId === 'B-5-3') frame.ambience = [['hearth', .18]];
  if (sceneId === 'B-5-5' && (block > 8 || block === 8 && page >= 3)) {
    frame.music = null; frame.ambience = [['river', .12]]; frame.transition = 4;
  }
  if (sceneId === 'B-7-4' && block >= 6) frame.ambience = [['river', .65], ['wind', .1]];
  if (sceneId === 'B-10-4') frame.ambience = [['river', .2], ['winter', .3]];
  if (sceneId === 'B-10-4' && block === 11 && page >= 2) {
    frame.music = null; frame.ambience = [['winter', .2]]; frame.transition = 5;
  }
  if (sceneId === 'B-12-2' && block === 9 && page >= 2) { frame.musicGain = .35; frame.ambience = [['winter', .15]]; }
  if (sceneId === 'B-12-2' && block === 9 && page >= 4) {
    frame.music = null; frame.ambience = page >= 6 ? [['river', .1]] : []; frame.transition = 5.5;
  }
  if (sceneId === '终-2') {
    frame.musicGain = .48;
    frame.transition = .9;
    frame.releaseBeforeLoad = true;
    frame.ambienceFade = .65;
    if (block <= 4) frame.music = null;
  }
  if (beat.kind === 'ending' && ENDING_EFFECTS[beat.ending]?.length) {
    frame.events.push({ id: `ending:${beat.ending}`, effects: ENDING_EFFECTS[beat.ending]! });
  }
  return frame;
}
