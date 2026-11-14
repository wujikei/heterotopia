import { READING_HOLDS } from './data/performance';
import type { Language } from './types';

/** Reading time starts after the typewriter finishes, not at the first letter. */
export function autoDelayFor(text: string, autoDelay: number, beatId?: string, language: Language = 'zh'): number {
  const pace = Number.isFinite(autoDelay) ? Math.min(10, Math.max(2, autoDelay)) : 4;
  // Count code points so a single supplementary character is not timed twice.
  const characters = Array.from(text.trim()).length;
  if (language === 'en' || language === 'de') {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    return Math.min(30000, 600 + pace * 250 + words * (language === 'de' ? 300 : 270) + (beatId ? READING_HOLDS[beatId] ?? 0 : 0));
  }
  return Math.min(9000, 600 + pace * 250 + characters * 55 + (beatId ? READING_HOLDS[beatId] ?? 0 : 0));
}
