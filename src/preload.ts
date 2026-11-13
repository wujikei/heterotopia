type CachedImage = { promise: Promise<void>; decoded: boolean };
const images = new Map<string, CachedImage>();

/** A fulfilled promise means the image can be painted, including data: images. */
export function preloadImage(url: string, priority: 'high' | 'low' | 'auto' = 'auto'): Promise<void> {
  const cached = images.get(url);
  if (cached) return cached.promise;
  const image = new Image();
  image.decoding = 'async';
  image.fetchPriority = priority;
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const entry: CachedImage = { decoded: false, promise: new Promise<void>((yes, no) => { resolve = yes; reject = no; }) };
  images.set(url, entry);
  const clear = () => { image.onload = null; image.onerror = null; };
  image.onerror = () => {
    clear(); images.delete(url); // a later visit may retry a transient failure
    reject(new Error(`Image unavailable: ${url.slice(0, 100)}`));
  };
  image.onload = async () => {
    clear();
    // Some WebKit versions reject decode() for an otherwise loaded image.
    try { await image.decode?.(); } catch { /* onload is the fallback */ }
    entry.decoded = true;
    resolve();
  };
  image.src = url;
  return entry.promise;
}

export function isDecoded(url: string): boolean { return images.get(url)?.decoded === true; }

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
      void preloadImage(url).catch(() => {}).then(next);
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
