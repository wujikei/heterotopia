import { useState, useSyncExternalStore } from 'react';
import type { ImgHTMLAttributes } from 'react';
import { asset, assetSources, avifEnabled, imageFailed, recordImageFailure, artQuality, subscribeArtQuality, artViewport, subscribeArtViewport } from '../assets';

/** Native responsive selection; a failed AVIF still has a real WebP fallback. */
export function ArtImage({ name, responsive = true, ...props }: { name: string; responsive?: boolean } & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet'>) {
  useSyncExternalStore(subscribeArtQuality, artQuality, () => false);
  useSyncExternalStore(subscribeArtViewport, artViewport, () => 'false:false');
  const sources = assetSources(name);
  const [, retry] = useState(0);
  const selected = asset(name, responsive);
  const mobile = responsive && sources.mobile && !imageFailed(sources.mobile.webp) ? sources.mobile : undefined;
  const preferred = avifEnabled();
  return <picture style={{ display: 'contents' }}>
    {preferred && mobile?.avif && !imageFailed(mobile.avif) && <source media={mobile.media} type="image/avif" srcSet={mobile.avif} />}
    {mobile && <source media={mobile.media} type="image/webp" srcSet={mobile.webp} />}
    {preferred && sources.avif && !imageFailed(sources.avif) && <source type="image/avif" srcSet={sources.avif} />}
    <source type={sources.type} srcSet={sources.webp} />
    {/* WebKit can fetch src before picture is attached; match the prefetch. */}
    <img {...props} src={selected} onError={event => {
      recordImageFailure(event.currentTarget.currentSrc);
      retry(value => value + 1);
      props.onError?.(event);
    }} />
  </picture>;
}
