import type { MusicId } from '../score';

// Each group follows an act or recurring motif. A new scene stays quiet until
// it has a cue here. The artwork can briefly show a memory of another era.
const common: Record<string, MusicId> = {
  'o-0-1': 'modern-street',
  'o-0-2': 'modern-question',
  'o-0-3': 'ritual', 'o-0-4': 'ritual',
  'o-0-5': 'hearth', 'o-0-6': 'hearth', 'o-0-7': 'river-journey', 'o-0-8': 'old-jade',
  'o-2-1': 'chu-night-river', 'o-2-2': 'chu-night-river', 'o-2-3': 'chu-night-river',
  'o-2-4': 'chu-night-river', 'o-2-5': 'chu-night-river', 'o-2-6': 'chu-night-river', 'o-2-7': 'chu-night-river',
  'c-1-13': 'old-jade', 'c-1-13a': 'old-jade', 'c-1-13b': 'old-jade',
  'o-4-1': 'modern-return', 'o-4-2': 'modern-untranslated',
  'o-5-1': 'modern-untranslated', 'o-5-2': 'modern-untranslated',
  'o-5-3': 'modern-ascent', 'o-5-4': 'modern-ascent', 'o-5-5': 'modern-ascent', 'o-5-6': 'modern-ascent',
  'o-5-7': 'modern-afterglow',
};

type CueGroup = { scenes: readonly string[]; music: MusicId | null };

const royal: readonly CueGroup[] = [
  { scenes: ['A-1', 'E2-1', 'E2-2', 'E2-3', 'E2-6', 'S-2', 'S-3', 'S-4', 'S-7', 'O-1', 'O-3'], music: 'river-journey' },
  { scenes: ['A-3', 'A-3a', 'B-5', 'B-12', 'C-3', 'D-7', 'D-9', 'O-4', 'O-5', 'O-6', 'O-7', 'O-8', 'O-9'], music: 'hearth' },
  { scenes: [
    'A-2', 'A-4', 'A-5', 'A-6a',
    'B-3', 'B-4', 'B-5a', 'B-7a', 'B-9', 'B-9a', 'B-13', 'B-14',
    'C-1a', 'C-4', 'C-4a', 'C-9', 'C-10',
    'D-1', 'D-3', 'D-4', 'D-11', 'D-12',
    'G1-1', 'G1-2', 'G1-3', 'G1-4', 'G2-1', 'G2-3', 'G2-5', 'G2-6',
    'L-1', 'L-2',
  ], music: 'old-jade' },
  { scenes: ['A-7', 'A-8', 'B-6', 'B-7', 'B-10', 'B-11', 'C-1', 'C-2', 'C-5', 'C-6', 'C-7', 'C-8', 'D-5', 'G2-2', 'R-2', 'R-3', 'R-4', 'R-5'], music: 'ritual' },
  { scenes: [
    'A-6', 'B-1', 'B-2', 'B-8', 'C-11', 'C-12',
    'E1-1', 'E1-2', 'E1-5', 'E2-4', 'G1-5', 'G1-7', 'G2-4', 'G2-7', 'R-1', 'F-1',
  ], music: 'under-current' },
  { scenes: ['L-3', 'L-4', 'L-6', 'L-7', 'H-1', 'H-2', 'H-3', 'H-4', 'F-2', 'F-5'], music: 'chu-night-river' },
  { scenes: [
    'D-2', 'D-6', 'D-8', 'D-10', 'E1-3', 'E1-4', 'E2-5', 'G1-6',
    'L-5', 'S-1', 'S-5', 'S-6', 'F-3', 'O-2',
  ], music: 'small-goodbyes' },
  { scenes: ['E1-6', 'E1-7', 'H-7'], music: 'last-flute' },
  { scenes: ['E2-7', 'G1-8', 'G2-8', 'L-8', 'S-8', 'H-8', 'R-6', 'F-6', 'O-10'], music: 'river-of-names' },
];

const kunlun: readonly CueGroup[] = [
  { scenes: ['A-1', 'A-2', 'A-3', 'A-4', 'A-5', 'A-6', 'A-7', 'A-8', 'A-9', 'A-12', 'B-9', 'B-10', 'B-11', 'B-13', 'F-2', 'X-1', 'X-2', 'N-1', 'J-2'], music: 'hearth' },
  { scenes: ['A-10', 'A-11', 'B-2', 'B-3', 'C-2', 'E-5', 'M-1'], music: 'old-jade' },
  { scenes: ['B-1', 'C-4', 'C-5', 'C-6', 'D-1', 'D-2', 'H-5'], music: 'river-journey' },
  { scenes: [
    'B-8', 'D-3', 'D-4', 'D-8', 'D-9', 'D-11', 'D-12',
    'X-4', 'Y-2', 'Y-4', 'J-3', 'J-4', 'M-2', 'T-3', 'T-4', 'T-5', 'Z-4', 'Z-5',
  ], music: 'under-current' },
  { scenes: ['B-4', 'B-5', 'B-6', 'B-7', 'B-12', 'B-14', 'B-15', 'C-1', 'C-3', 'D-10', 'X-3', 'X-5', 'J-1', 'J-5', 'N-4', 'S-1', 'M-4', 'T-1'], music: 'small-goodbyes' },
  { scenes: ['D-5', 'D-6'], music: 'chu-storm' },
  { scenes: ['D-7', 'G-1', 'G-2', 'G-3', 'G-4'], music: null },
  { scenes: [
    'D-13', 'E-1', 'E-2', 'E-3', 'E-4', 'E-6', 'E-7', 'E-8', 'E-9', 'E-10', 'E-11',
    'F-1', 'F-4', 'F-5', 'F-6',
    'X-6', 'N-2', 'N-3', 'N-5', 'N-6', 'Y-1', 'Y-3', 'Y-5', 'Y-6', 'J-6',
    'M-3', 'M-5', 'M-6', 'T-2', 'T-6', 'H-1', 'H-2', 'H-3', 'H-4', 'H-6',
    'L-6', 'Z-1', 'Z-2', 'Z-3', 'Z-6',
  ], music: 'river-of-names' },
  { scenes: ['E-12', 'L-1', 'L-2', 'L-3', 'L-4', 'L-5'], music: 'ritual' },
  { scenes: ['F-3', 'S-2', 'S-3', 'S-4', 'S-5', 'S-6'], music: 'last-flute' },
];

export const OVERSEAS_MUSIC_BY_SCENE: Readonly<Partial<Record<string, MusicId | null>>> = Object.fromEntries([
  ...Object.entries(common).map(([id, music]) => [`modern-${id}`, music]),
  ...royal.flatMap(group => group.scenes.map(id => [`modern-r-${id}`, group.music])),
  ...kunlun.flatMap(group => group.scenes.map(id => [`modern-k-${id}`, group.music])),
]);
