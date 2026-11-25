import manifest from './data/art-manifest.json';

type Embedded = typeof globalThis & { __HETEROTOPIA_ASSETS__?: Record<string, string>; __HETEROTOPIA_ORIGINALS__?: Record<string, string> };
const avifNames = new Set(manifest.avif);
const mobileNames = new Set(manifest.mobile);
const originals: Readonly<Partial<Record<string, string>>> = manifest.originals;
const mobileOriginals: Readonly<Partial<Record<string, string>>> = manifest.mobileOriginals;
const failedUntil = new Map<string, number>();
export const imageUrl = (url: string) => typeof document === 'undefined' || url.startsWith('data:') ? url : new URL(url, document.baseURI).href;
let avif = false;
let lightweight = false;
try { lightweight = JSON.parse(globalThis.localStorage?.getItem('heterotopia.v1.settings') ?? '{}').lightweight === true; } catch { /* new readers see the original art */ }
const qualityListeners = new Set<() => void>();
const formatListeners = new Set<() => void>();
export const artQuality = () => lightweight;
export const subscribeArtQuality = (listener: () => void) => { qualityListeners.add(listener); return () => { qualityListeners.delete(listener); }; };
export const subscribeArtFormat = (listener: () => void) => { formatListeners.add(listener); return () => { formatListeners.delete(listener); }; };
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
export const portraitName = (key: string) => `portrait-${key}${key === 'linyue' || key === 'roommate' ? '-modern' : key === 'tu' ? '-v2' : key === 'xua' ? '-v3' : ''}`;
export function imageFailed(url: string): boolean {
  const key = imageUrl(url);
  const until = failedUntil.get(key);
  if (until === undefined) return false;
  if (until > Date.now()) return true;
  failedUntil.delete(key);
  return false;
}

const artType = (url: string) => url.endsWith('.png') || url.startsWith('data:image/png') ? 'image/png' : 'image/webp';

export function assetSources(name: string) {
  const embedded = (globalThis as Embedded).__HETEROTOPIA_ASSETS__?.[name];
  const embeddedMobile = (globalThis as Embedded).__HETEROTOPIA_ASSETS__?.[`${name}-m`];
  const originalFile = originals[name];
  const mobileOriginalFile = mobileOriginals[name];
  const mobileOriginal = (globalThis as Embedded).__HETEROTOPIA_ORIGINALS__?.[`${name}-m`] ?? (!isPortable() && mobileOriginalFile ? `${base()}art-original/${mobileOriginalFile}` : undefined);
  const original = (globalThis as Embedded).__HETEROTOPIA_ORIGINALS__?.[name] ?? (!isPortable() && originalFile ? `${base()}art-original/${originalFile}` : undefined);
  const desktop = !lightweight && original && !imageFailed(original) ? {
    webp: original,
    type: artType(original),
    avif: undefined,
  } : {
    webp: embedded ?? `${base()}art/${name}.webp`,
    type: 'image/webp',
    avif: !embedded && avifNames.has(name) ? `${base()}art/${name}.avif` : undefined,
  };
  const mobile = !lightweight && mobileOriginal && !imageFailed(mobileOriginal) ? {
    webp: mobileOriginal, avif: undefined, type: artType(mobileOriginal),
  } : desktop.webp !== original && mobileNames.has(name) && (!isPortable() || embeddedMobile) ? {
    webp: embeddedMobile ?? `${base()}art/${name}-m.webp`,
    avif: !isPortable() ? `${base()}art/${name}-m.avif` : undefined,
    type: 'image/webp',
  } : undefined;
  return { ...desktop, mobile: mobile ? { ...mobile, media: mobileMedia(name) } : undefined };
}

export function asset(name: string, responsive = true): string {
  const sources = assetSources(name);
  const selected = responsive && sources.mobile && matches(sources.mobile.media) && !imageFailed(sources.mobile.webp) ? sources.mobile : sources;
  return avif && selected.avif && !imageFailed(selected.avif) ? selected.avif : selected.webp;
}
export const portraitAsset = (key: string) => asset(portraitName(key));
export const portraitFace = (key: string) => asset(`portrait-${key}-face`);
export function imageFallback(url: string): string | undefined {
  if (url.endsWith('.avif')) return url.replace(/\.avif$/, '.webp');
  const mobile = url.match(/\/art-original\/([^/]+)-m\.(?:png|webp)$/);
  const desktop = mobile && originals[mobile[1]];
  if (desktop) return url.replace(/\/[^/]+$/, `/${desktop}`);
  if (/\/art\/[^/]+-m\.webp$/.test(url)) return url.replace(/-m\.webp$/, '.webp');
  if (/\/art-original\/[^/]+\.(?:png|webp)$/.test(url)) return url.replace('/art-original/', '/art/').replace(/\.(?:png|webp)$/, '.webp');
}

export function recordImageFailure(url: string) { if (url) failedUntil.set(imageUrl(url), Date.now() + 15000); }

let imageFormatProbe: Promise<void> | undefined;

/** Probe AVIF after the first screen can render; every image retains a WebP fallback. */
export async function initializeImageFormats(): Promise<void> {
  if (isPortable() || imageFormatProbe) return imageFormatProbe;
  imageFormatProbe = probeImageFormats();
  return imageFormatProbe;
}

async function probeImageFormats(): Promise<void> {
  const probe = new Image();
  probe.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAAGGbWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAAAAAAAOcGl0bQAAAAAAAQAAACxpbG9jAAAAAEQAAAIAAQAAAAEAAAG/AAAAIwACAAAAAQAAAa4AAAARAAAAQmlpbmYAAAAAAAIAAAAaaW5mZQIAAAAAAQAAYXYwMUNvbG9yAAAAABppbmZlAgAAAAACAABhdjAxQWxwaGEAAAAAGmlyZWYAAAAAAAAADmF1eGwAAgABAAEAAADDaXBycAAAAJ1pcGNvAAAAFGlzcGUAAAAAAAAAAgAAAAIAAAAQcGl4aQAAAAADCAgIAAAADGF2MUOBAAwAAAAAE2NvbHJuY2x4AAEADQAGgAAAAA5waXhpAAAAAAEIAAAADGF2MUOBABwAAAAAOGF1eEMAAAAAdXJuOm1wZWc6bXBlZ0I6Y2ljcDpzeXN0ZW1zOmF1eGlsaWFyeTphbHBoYQAAAAAeaXBtYQAAAAAAAAACAAEEAQKDBAACBAEFhgcAAAA8bWRhdBIACgQYADYVMgccgKaRABCgEgAKCBgANogIaDQgMhUdh4eFndxxxwLKwACQNY48fqJ+tuA=';
  try { await probe.decode(); avif = probe.naturalWidth === 2; } catch { avif = false; }
  formatListeners.forEach(listener => listener());
}
