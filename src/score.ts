import rawSoundtrack from './data/soundtrack.json';
import type { Beat, EndingId, Profile } from './types';

export const MUSIC_IDS = ['river-home', 'paper-note', 'hearth', 'river-journey', 'old-jade', 'ritual', 'under-current', 'small-goodbyes', 'last-flute', 'river-of-names', 'light-in-kitchen'] as const;
export type MusicId = typeof MUSIC_IDS[number];
export const AMBIENCE_IDS = ['river', 'rain', 'hearth', 'wind', 'winter', 'room', 'night', 'street', 'marsh', 'underwater', 'cave', 'palace'] as const;
export type AmbienceId = typeof AMBIENCE_IDS[number];
export const EFFECT_IDS = ['page', 'choice', 'bookmark', 'bronze', 'triple-bell', 'ritual-drum', 'hull', 'alarm', 'school-bell', 'door', 'wood-latch', 'bamboo', 'cloth', 'ceramic', 'splash', 'oar', 'drop', 'electric', 'chair', 'steps', 'stone', 'string-snap', 'ball', 'bike-bell', 'flute', 'crow', 'pottery', 'heartbeat'] as const;
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
  '终-1': 'river-of-names', '终-2': 'paper-note', '终-3': 'light-in-kitchen', '终-4': 'light-in-kitchen', '终-5': 'light-in-kitchen',
};

export const TRACK_ART: Record<MusicId, string> = {
  'river-home': 'hero', 'paper-note': 'classroom-day', hearth: 'hut', 'river-journey': 'river',
  'old-jade': 'study', ritual: 'ritual', 'under-current': 'marsh', 'small-goodbyes': 'mountain',
  'last-flute': 'snow', 'river-of-names': 'light-river', 'light-in-kitchen': 'home',
};

export function unlockedTracks(profile: Pick<Profile, 'visited'>): MusicId[] {
  return [...new Set<MusicId>(['river-home', ...profile.visited.map(id => MUSIC_BY_SCENE[id]).filter((id): id is MusicId => !!id)])];
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
};

const ACCENTS: Record<string, Effect[]> = {
  'A-8:11:1': [e('steps', .24, .3)],
  'B-5-5:8:2': [e('cloth', .12, .2)],
  'B-10-4:11:4': [e('bamboo', .12, .7)],
};

const ENVIRONMENTS: Record<string, [AmbienceId, number][]> = {
  hero: [['river', .65], ['wind', .12]], 'dream-boat': [['river', .7], ['wind', .15]],
  bedroom: [['room', .25], ['street', .18]], home: [['room', .3], ['street', .15]],
  bus: [['street', .65], ['room', .3]], school: [['wind', .28], ['street', .3]],
  classroom: [['room', .65], ['street', .08]], 'classroom-day': [['room', .6], ['street', .15]],
  alley: [['street', .65], ['wind', .12]], nightmare: [['underwater', .58], ['room', .12]],
  hut: [['hearth', .6], ['river', .12]], village: [['river', .5], ['wind', .2]],
  shrine: [['wind', .23], ['river', .32]], ritual: [['palace', .43], ['hearth', .18]],
  bamboo: [['night', .4], ['wind', .3]], study: [['palace', .35], ['wind', .12]],
  palace: [['palace', .5], ['hearth', .13]], tomb: [['cave', .6]],
  river: [['river', .8], ['wind', .17]], ruins: [['wind', .45], ['hearth', .22]],
  marsh: [['marsh', .75]], underwater: [['underwater', .8]], valley: [['wind', .35], ['river', .18]],
  cave: [['cave', .65], ['wind', .18]], snow: [['winter', .5], ['hearth', .26]],
  mountain: [['wind', .65]], 'light-river': [['river', .43], ['wind', .1]],
};

export function scoreFrame(sceneId: string, beat: Beat | null): ScoreFrame {
  if (!beat) return { scene: 'title', cue: 'title', music: 'river-home', musicGain: 1, ambience: ENVIRONMENTS.hero, events: [], transition: 4.5 };
  const [, rawBlock, rawPage] = beat.id.split(':');
  const block = Number(rawBlock), page = Number(rawPage ?? 0);
  const frame: ScoreFrame = {
    scene: sceneId, cue: beat.audioCueId, music: MUSIC_BY_SCENE[sceneId] ?? 'river-home', musicGain: .88,
    ambience: ENVIRONMENTS[beat.background] ?? [['wind', .2]], transition: 4.5,
    events: [{ id: beat.audioCueId, effects: CUE_EFFECTS[beat.audioCueId] ?? [] }],
  };
  if (ACCENTS[beat.id]) frame.events.push({ id: beat.id, effects: ACCENTS[beat.id] });
  if (sceneId === '0-1' && block >= 6) { frame.music = 'paper-note'; frame.transition = .18; }
  if (sceneId === '0-7' && block >= 10) { frame.music = 'paper-note'; frame.ambience = ENVIRONMENTS.bedroom; }
  if (sceneId === '0-10' && block >= 15) { frame.music = 'under-current'; frame.ambience = [['room', .1], ['underwater', .3]]; }
  if (sceneId === '0-11' && block >= 18) { frame.music = null; frame.ambience = []; frame.transition = 1.4; }
  if (['1-5', '1-6', '1-7', '1-8', '1-9', 'A-E2-4'].includes(sceneId)) frame.ambience = [['rain', .63], ['hearth', .25]];
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
  if (beat.kind === 'ending' && ENDING_EFFECTS[beat.ending]?.length) {
    frame.events.push({ id: `ending:${beat.ending}`, effects: ENDING_EFFECTS[beat.ending]! });
  }
  return frame;
}
