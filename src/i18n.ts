import { useSyncExternalStore } from 'react';
import type { Language } from './types';
import { LANGUAGES, storyText, translate } from './localeText';
import type { Catalog, LanguagePack } from './localeText';

export { LANGUAGES };
let language: Language = 'zh';
if (typeof document !== 'undefined') document.documentElement.lang = 'zh-CN';
const packs = new Map<Language, LanguagePack>();
const loading = new Map<Language, Promise<void>>();
const listeners = new Set<() => void>();
const loaders = import.meta.glob<{ default: Catalog }>('./data/locales/*/*.json');
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const getLanguage = () => language;
export const useLocale = () => useSyncExternalStore(subscribe, getLanguage, () => 'zh' as Language);

/** A rejected language download is evicted so the next gesture can retry. */
export function loadLanguage(next: Language): Promise<void> {
  if (next === 'zh' || packs.has(next)) return Promise.resolve();
  const existing = loading.get(next);
  if (existing) return existing;
  const request = Promise.all(['ui', 'story'].map(async part => {
    const load = loaders[`./data/locales/${next}/${part}.json`];
    if (!load) throw new Error('Language pack unavailable');
    return (await load()).default;
  })).then(([ui, story]) => { packs.set(next, { ui, story }); }).finally(() => loading.delete(next));
  loading.set(next, request);
  return request;
}

/** Only activate after both catalogs are ready: never show a half-translated page. */
export function activateLanguage(next: Language): void {
  if (next !== 'zh' && !packs.has(next)) throw new Error('Language pack not loaded');
  language = next;
  if (typeof document !== 'undefined') {
    document.documentElement.lang = LANGUAGES.find(item => item.id === next)!.html;
    document.documentElement.dataset.language = next;
    document.title = `${t('异托邦')} · ${t('循着水声，回家')}`;
  }
  listeners.forEach(listener => listener());
}

export function t(source: string, ...parameters: unknown[]): string {
  return translate(source, packs.get(language)?.ui ?? {}, parameters);
}

/** JSX text and metadata share this boundary; elements and numbers pass through. */
export function tr<T>(value: T): T {
  if (typeof value === 'string') return t(value) as T;
  if (Array.isArray(value)) return value.map(item => tr(item)) as T;
  return value;
}

export function localizePage(id: string, source: string): string {
  return storyText(id, source, packs.get(language));
}

export function dateLocale(): string {
  return LANGUAGES.find(item => item.id === language)!.html;
}
