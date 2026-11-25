import { imageFailed, imageFallback, imageUrl, recordImageFailure } from './assets';

type CachedImage = { promise: Promise<string>; pending?: HTMLImageElement };
const images = new Map<string, CachedImage>();
const fallbackLoads = new Map<string, Promise<string>>();

/** A fulfilled promise means the image can be painted, including data: images. */
export function preloadImage(url: string, priority: 'high' | 'low' | 'auto' = 'auto'): Promise<string> {
  const key = imageUrl(url);
  const recovering = fallbackLoads.get(key);
  if (recovering && imageFailed(key)) return recovering;
  fallbackLoads.delete(key);
  const cached = images.get(key);
  if (cached) {
    if (priority === 'high' && cached.pending) cached.pending.fetchPriority = 'high';
    return cached.promise;
  }
  const image = new Image();
  image.decoding = 'async';
  image.fetchPriority = priority;
  let resolve!: (url: string) => void;
  let reject!: (error: Error) => void;
  const entry: CachedImage = { pending: image, promise: new Promise<string>((yes, no) => { resolve = yes; reject = no; }) };
  images.set(key, entry);
  let settled = false;
  const clear = () => {
    settled = true;
    entry.pending = undefined;
    image.onload = null;
    image.onerror = null;
    clearTimeout(timer);
  };
  const timer = setTimeout(() => {
    clear();
    images.delete(key);
    image.removeAttribute('src');
    // A slow request may work on another visit. Keep the original eligible.
    reject(new Error(`Image timed out: ${url.slice(0, 100)}`));
  }, 30000);
  image.onerror = () => {
    const priority = image.fetchPriority as 'high' | 'low' | 'auto';
    clear();
    images.delete(key);
    recordImageFailure(key);
    const fallback = imageFallback(url);
    if (fallback) {
      fallbackLoads.set(key, entry.promise);
      void preloadImage(fallback, priority).then(resolve, error => {
        if (fallbackLoads.get(key) === entry.promise) fallbackLoads.delete(key);
        reject(error);
      });
      return;
    }
    reject(new Error(`Image unavailable: ${url.slice(0, 100)}`));
  };
  image.onload = async () => {
    // Some WebKit versions reject decode() for an otherwise loaded image.
    try { await image.decode?.(); } catch { /* onload is the fallback */ }
    if (settled) return;
    clear();
    resolve(image.src);
  };
  image.src = url;
  return entry.promise;
}

export function isDecoded(url: string): boolean {
  const entry = images.get(imageUrl(url));
  return !!entry && !entry.pending;
}

/** Serial background work: one image at a time, yielding before every request. */
export function prefetchWhenIdle(urls: string[]): () => void {
  if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return () => {};
  let cancelled = false;
  let idle = 0;
  let timer = 0;
  let index = 0;
  const next = () => {
    if (cancelled || index >= urls.length) return;
    const load = () => {
      if (cancelled) return;
      const url = urls[index++];
      void preloadImage(url, 'low').catch(() => {}).then(next);
    };
    if (typeof window.requestIdleCallback === 'function') idle = window.requestIdleCallback(load, { timeout: 4000 });
    else timer = window.setTimeout(load, 2000);
  };
  next();
  return () => {
    cancelled = true;
    if (idle) window.cancelIdleCallback(idle);
    clearTimeout(timer);
  };
}
