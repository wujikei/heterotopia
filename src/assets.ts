import manifest from './data/art-manifest.json';

type Embedded = typeof globalThis & { __HETEROTOPIA_ASSETS__?: Record<string, string>; __HETEROTOPIA_ORIGINALS__?: Record<string, string> };
const avifNames = new Set(manifest.avif);
const mobileNames = new Set(manifest.mobile);
const failed = new Set<string>();
const urlKey = (url: string) => typeof document === 'undefined' ? url : new URL(url, document.baseURI).href;
let avif = false;
let lightweight = false;
try { lightweight = JSON.parse(globalThis.localStorage?.getItem('heterotopia.v1.settings') ?? '{}').lightweight === true; } catch { /* new readers see the original art */ }
const qualityListeners = new Set<() => void>();
export const artQuality = () => lightweight;
export const subscribeArtQuality = (listener: () => void) => { qualityListeners.add(listener); return () => { qualityListeners.delete(listener); }; };
export function setArtQuality(value: boolean) {
  if (value === lightweight) return;
  lightweight = value;
  qualityListeners.forEach(listener => listener());
}
const base = () => import.meta.env?.BASE_URL ?? './';
export const isPortable = () => !!(globalThis as Embedded).__HETEROTOPIA_ASSETS__;
export const avifEnabled = () => avif;
export const mobileArt = () => typeof matchMedia === 'function' && matchMedia('(max-width: 760px)').matches;
export const mobileMedia = (name: string) => name.startsWith('cg-') ? '(max-aspect-ratio: 3/4)' : '(max-width: 760px)';
const matches = (query: string) => typeof matchMedia === 'function' && matchMedia(query).matches;
export const artViewport = () => `${mobileArt()}:${matches(mobileMedia('cg-'))}`;
export function subscribeArtViewport(listener: () => void) {
  if (typeof matchMedia !== 'function') return () => {};
  const queries = [matchMedia('(max-width: 760px)'), matchMedia(mobileMedia('cg-'))];
  queries.forEach(query => query.addEventListener('change', listener));
  return () => queries.forEach(query => query.removeEventListener('change', listener));
}
export const portraitName = (key: string) => `portrait-${key}${key === 'tu' ? '-v2' : key === 'xua' ? '-v3' : ''}`;
export const imageFailed = (url: string) => failed.has(urlKey(url));

export function assetSources(name: string) {
  const embedded = (globalThis as Embedded).__HETEROTOPIA_ASSETS__?.[name];
  const embeddedMobile = (globalThis as Embedded).__HETEROTOPIA_ASSETS__?.[`${name}-m`];
  const originalFile = (manifest.originals as Record<string, string>)[name];
  const original = (globalThis as Embedded).__HETEROTOPIA_ORIGINALS__?.[name] ?? (!isPortable() && originalFile ? `${base()}art-original/${originalFile}` : undefined);
  if (!lightweight && original && !failed.has(urlKey(original))) {
    const type = original.endsWith('.webp') || original.startsWith('data:image/webp') ? 'image/webp' : 'image/png';
    return { webp: original, avif: undefined, mobile: undefined, type };
  }
  const webp = embedded ?? `${base()}art/${name}.webp`;
  return {
    webp,
    type: 'image/webp',
    avif: !embedded && avifNames.has(name) ? `${base()}art/${name}.avif` : undefined,
    mobile: mobileNames.has(name) && (!isPortable() || embeddedMobile) ? {
      webp: embeddedMobile ?? `${base()}art/${name}-m.webp`,
      avif: !isPortable() ? `${base()}art/${name}-m.avif` : undefined,
      media: mobileMedia(name),
    } : undefined,
  };
}

export function asset(name: string, responsive = true): string {
  const sources = assetSources(name);
  const selected = responsive && sources.mobile && matches(sources.mobile.media) && !imageFailed(sources.mobile.webp) ? sources.mobile : sources;
  return avif && selected.avif && !failed.has(urlKey(selected.avif)) ? selected.avif : selected.webp;
}
export const portraitAsset = (key: string) => asset(portraitName(key));
export const portraitFace = (key: string) => asset(`portrait-${key}-face`);
export const imageFallback = (url: string) => /\.avif$/.test(url) ? url.replace(/\.avif$/, '.webp')
  : /\/art\/[^/]+-m\.webp$/.test(url) ? url.replace(/-m\.webp$/, '.webp')
  : /\/art-original\/[^/]+\.(?:png|webp)$/.test(url) ? url.replace('/art-original/', '/art/').replace(/\.(?:png|webp)$/, '.webp') : undefined;
export function recordImageFailure(url: string) { failed.add(urlKey(url)); }

export function backgroundImage(name: string): string {
  return backgroundImageForUrl(asset(name));
}

export function backgroundImageForUrl(selected: string): string {
  if (selected.endsWith('.avif') && typeof CSS !== 'undefined' && CSS.supports('background-image', 'image-set(url("x") type("image/avif"))')) {
    return `image-set(url("${selected}") type("image/avif"), url("${imageFallback(selected)}") type("image/webp"))`;
  }
  return `url("${selected}")`;
}

/** A tiny local alpha AVIF probe, before rendering: prefetch and <picture> agree. */
export async function initializeImageFormats(): Promise<void> {
  if (isPortable()) return;
  const probe = new Image();
  probe.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAAGGbWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAAAAAAAOcGl0bQAAAAAAAQAAACxpbG9jAAAAAEQAAAIAAQAAAAEAAAG/AAAAIwACAAAAAQAAAa4AAAARAAAAQmlpbmYAAAAAAAIAAAAaaW5mZQIAAAAAAQAAYXYwMUNvbG9yAAAAABppbmZlAgAAAAACAABhdjAxQWxwaGEAAAAAGmlyZWYAAAAAAAAADmF1eGwAAgABAAEAAADDaXBycAAAAJ1pcGNvAAAAFGlzcGUAAAAAAAAAAgAAAAIAAAAQcGl4aQAAAAADCAgIAAAADGF2MUOBAAwAAAAAE2NvbHJuY2x4AAEADQAGgAAAAA5waXhpAAAAAAEIAAAADGF2MUOBABwAAAAAOGF1eEMAAAAAdXJuOm1wZWc6bXBlZ0I6Y2ljcDpzeXN0ZW1zOmF1eGlsaWFyeTphbHBoYQAAAAAeaXBtYQAAAAAAAAACAAEEAQKDBAACBAEFhgcAAAA8bWRhdBIACgQYADYVMgccgKaRABCgEgAKCBgANogIaDQgMhUdh4eFndxxxwLKwACQNY48fqJ+tuA=';
  try { await probe.decode(); avif = probe.naturalWidth === 2; } catch { avif = false; }
}
