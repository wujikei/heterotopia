import type { Language } from './types';

export type Catalog = Record<string, string>;
export interface LanguagePack { ui: Catalog; story: Catalog }

/** Source strings are keys only at the display boundary, never engine inputs. */
export function translate(source: string, catalog: Catalog, parameters: unknown[] = []): string {
  const text = catalog[source] ?? source;
  return text.replace(/\{(\d+)\}/g, (token, index: string) => {
    if (Number(index) >= parameters.length) return token;
    const value = parameters[Number(index)];
    return typeof value === 'string' ? catalog[value] ?? value : String(value ?? '');
  });
}

export function storyText(id: string, source: string, pack?: LanguagePack): string {
  return pack?.story[id] ?? pack?.ui[source] ?? source;
}

export const LANGUAGES: { id: Language; name: string; html: string }[] = [
  { id: 'zh', name: '中文', html: 'zh-CN' },
  { id: 'en', name: 'English', html: 'en' },
  { id: 'ja', name: '日本語', html: 'ja' },
  { id: 'de', name: 'Deutsch', html: 'de' },
];
export const isLanguage = (value: unknown): value is Language => LANGUAGES.some(language => language.id === value);
