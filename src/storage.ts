import { newProfile, SCENES } from './engine';
import { MODERN_SCENES } from './story';
import { campaignOf, isModern, restoreModernState } from './modern';
import { isLanguage } from './localeText';
import type { Campaign, GameState, Profile, SaveSlot, Settings } from './types';

const PREFIX = 'heterotopia.v1.';
const validScenes = new Set([...SCENES, ...MODERN_SCENES].map(s => s.id));
const scopedKey = (key: string, campaign: Campaign) => campaign === 'overseas' && ['profile', 'autosave', 'slots'].includes(key) ? `overseas.${key}` : key;

function read<T>(key: string, fallback: T, campaign: Campaign = 'original'): T {
  try {
    const raw = localStorage.getItem(PREFIX + scopedKey(key, campaign));
    return raw ? JSON.parse(raw) as T : fallback;
  } catch { return fallback; }
}

export function persist(key: string, value: unknown, campaign: Campaign = 'original'): boolean {
  try { localStorage.setItem(PREFIX + scopedKey(key, campaign), JSON.stringify(value)); return true; }
  catch { return false; }
}

export function loadProfile(campaign: Campaign = 'original'): Profile {
  const profile = read<Profile>('profile', newProfile(campaign), campaign);
  if (profile?.version !== 1 || campaignOf(profile) !== campaign) return newProfile(campaign);
  return {
    ...newProfile(campaign), ...profile,
    visited: Array.isArray(profile.visited) ? profile.visited.filter(id => validScenes.has(id) && isModern(id) === (campaign === 'overseas')) : [],
    read: Array.isArray(profile.read) ? profile.read.filter(v => typeof v === 'string') : [],
    art: Array.isArray(profile.art) ? profile.art.filter(v => typeof v === 'string') : ['hero'],
    met: Array.isArray(profile.met) ? profile.met.filter(v => typeof v === 'string') : [],
    endings: Array.isArray(profile.endings) ? profile.endings.filter(e => campaign === 'overseas' ? typeof e === 'string' && (e.startsWith('modern-royal-') || ['modern-kunlun','modern-home'].includes(e)) : ['blade', 'mercy', 'leave', 'names', 'kunlun', 'home'].includes(e)) : [],
    oldNames: profile.oldNames === true,
  };
}

export const DEFAULT_SETTINGS: Settings = {
  language: 'zh',
  textSpeed: 32, autoDelay: 4, fontSize: 22, musicVolume: 45, ambienceVolume: 38, sfxVolume: 55,
  muted: false, reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false, showSprites: true,
  lightweight: false, autoAfterChoice: true,
};

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

export function loadSettings(): Settings {
  const raw = read<Partial<Settings>>('settings', DEFAULT_SETTINGS);
  if (!raw || typeof raw !== 'object') return DEFAULT_SETTINGS;
  return {
    language: isLanguage(raw.language) ? raw.language : 'zh',
    textSpeed: clamp(raw.textSpeed, 0, 65, DEFAULT_SETTINGS.textSpeed),
    autoDelay: clamp(raw.autoDelay, 2, 10, DEFAULT_SETTINGS.autoDelay),
    fontSize: clamp(raw.fontSize, 17, 29, DEFAULT_SETTINGS.fontSize),
    musicVolume: clamp(raw.musicVolume, 0, 100, DEFAULT_SETTINGS.musicVolume),
    ambienceVolume: clamp(raw.ambienceVolume, 0, 100, DEFAULT_SETTINGS.ambienceVolume),
    sfxVolume: clamp(raw.sfxVolume, 0, 100, DEFAULT_SETTINGS.sfxVolume),
    muted: raw.muted === true,
    reducedMotion: typeof raw.reducedMotion === 'boolean' ? raw.reducedMotion : DEFAULT_SETTINGS.reducedMotion,
    showSprites: raw.showSprites !== false,
    lightweight: raw.lightweight === true,
    autoAfterChoice: raw.autoAfterChoice !== false,
  };
}

export function validState(value: unknown, campaign?: Campaign): value is GameState {
  const s = value as Partial<GameState> | null;
  return !!s && s.version === 1 && typeof s.sceneId === 'string' && validScenes.has(s.sceneId)
    && (s.campaign === undefined || s.campaign === 'original' || s.campaign === 'overseas')
    && isModern(s.sceneId) === (campaignOf(s) === 'overseas')
    && (campaign === undefined || campaignOf(s) === campaign)
    && typeof s.beatId === 'string' && Array.isArray(s.inventory) && s.inventory.every(v => typeof v === 'string')
    && !!s.choices && typeof s.choices === 'object' && Array.isArray(s.history)
    && s.history.every(v => v && typeof v.text === 'string' && typeof v.id === 'string')
    && typeof s.cycle === 'number';
}

export function loadAutosave(campaign: Campaign = 'original'): GameState | null {
  const state = read<unknown>('autosave', null, campaign);
  return validState(state, campaign) ? restoreModernState(state) : null;
}

export function loadSlots(campaign: Campaign = 'original'): (SaveSlot | null)[] {
  const slots = read<unknown[]>('slots', [], campaign);
  return Array.from({ length: 6 }, (_, i) => {
    const slot = Array.isArray(slots) ? slots[i] as SaveSlot | null : null;
    return slot?.version === 1 && validState(slot.state, campaign) && typeof slot.savedAt === 'string' && !Number.isNaN(Date.parse(slot.savedAt)) ? { ...slot, state: restoreModernState(slot.state) } : null;
  });
}

export function exportSave(profile: Profile, state: GameState | null, slots: (SaveSlot | null)[]): void {
  const blob = new Blob([JSON.stringify({ format: 'heterotopia-save', version: 1, campaign: campaignOf(profile), exportedAt: new Date().toISOString(), profile, state, slots }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = `异托邦-${campaignOf(profile) === 'overseas' ? '海外现代卷-' : ''}旅途存档-${new Date().toISOString().slice(0, 10)}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
