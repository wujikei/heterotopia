import { useState, useSyncExternalStore } from 'react';
import type { ImgHTMLAttributes } from 'react';
import { asset, assetSources, avifEnabled, mobileArt, recordImageFailure, artQuality, subscribeArtQuality } from '../assets';

/** Native responsive selection; a failed AVIF still has a real WebP fallback. */
export function ArtImage({ name, ...props }: { name: string } & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet'>) {
  useSyncExternalStore(subscribeArtQuality, artQuality, () => false);
  const sources = assetSources(name);
  const [failedName, setFailedName] = useState('');
  const selected = asset(name);
  const preferred = avifEnabled() && failedName !== name && selected.endsWith('.avif');
  const fallback = mobileArt() && sources.mobile ? sources.mobile.webp : sources.webp;
  return <picture style={{ display: 'contents' }}>
    {preferred && sources.mobile && <source media="(max-width: 760px)" type="image/avif" srcSet={sources.mobile.avif} />}
    {sources.mobile && <source media="(max-width: 760px)" type="image/webp" srcSet={sources.mobile.webp} />}
    {preferred && sources.avif && <source type="image/avif" srcSet={sources.avif} />}
    <source type={sources.type} srcSet={sources.webp} />
    {/* WebKit can fetch src before picture is attached; match the prefetch. */}
    <img {...props} src={preferred ? selected : fallback} onError={event => {
      recordImageFailure(event.currentTarget.currentSrc);
      setFailedName(name);
      props.onError?.(event);
    }} />
  </picture>;
}
