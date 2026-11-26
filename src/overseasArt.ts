import { portraitName, registeredArtwork } from './assets';
import type { OverseasTone } from './overseasIdentity';

/** Use only art deliberately exported for this tone. Scene and gallery IDs stay stable. */
export function overseasArt(name: string, tone?: OverseasTone): string {
  if (!tone || tone === 'neutral') return name;
  // The supplied replacement matches the warm appearance. Keep previously authored light/deep states.
  const variant = `${name === 'cg-modern-photo-user' ? 'cg-modern-photo-r4' : name}-overseas-${tone}`;
  return registeredArtwork(variant) ? variant : name;
}

export function overseasThumbnail(name: string, thumbnail: string, tone?: OverseasTone): string {
  const art = overseasArt(name, tone);
  const variant = `${art}-thumb`;
  return art !== name && registeredArtwork(variant) ? variant : thumbnail;
}

export function overseasPortrait(key: string, tone?: OverseasTone): string {
  const original = portraitName(key);
  if (key !== 'linyue' || !tone || tone === 'neutral') return original;
  const variant = overseasArt('portrait-linyue', tone);
  return variant === 'portrait-linyue' ? original : variant;
}
