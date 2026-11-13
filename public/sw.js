/* __BUILD_MANIFEST__ */
// To recover from a broken release, see docs/reviews/perf-1.md.
const SCOPE = new URL(self.registration.scope);
const FORMAT = new URL(self.location.href).searchParams.get('format') === 'avif' ? 'avif' : 'webp';
const PREFIX = `heterotopia-${encodeURIComponent(SCOPE.pathname)}-`;
const CACHE = `${PREFIX}${BUILD_VERSION}-${FORMAT}`;
const INDEX = new URL('index.html', SCOPE).href;
const absolute = path => new URL(path, SCOPE).href;

async function store(cache, request, response) {
  const bytes = await response.arrayBuffer();
  const headers = new Headers(response.headers);
  headers.delete('Content-Encoding');
  headers.set('Content-Length', String(bytes.byteLength));
  await cache.put(request, new Response(bytes, { status: response.status, statusText: response.statusText, headers }));
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const files = PRECACHE_URLS.filter(path => !path.endsWith(`hero.${FORMAT === 'avif' ? 'webp' : 'avif'}`));
    // Failed precaching must leave the previous working version in charge.
    try {
      // Keep background installation from opening a burst of parallel downloads.
      const queue = [...files];
      const fill = async () => {
        while (queue.length) {
          const request = new Request(absolute(queue.shift()), { cache: 'no-store' });
          const requestUrl = new URL(request.url);
          // Separate background font fetches from an in-flight font loader.
          if (requestUrl.pathname.includes('/fonts/')) requestUrl.searchParams.set('cache-version', BUILD_VERSION);
          const response = await fetch(new Request(requestUrl, { cache: 'no-store', signal: AbortSignal.timeout(20000) }));
          if (!response.ok) throw new Error(`Precache failed: ${request.url}`);
          await store(cache, request, response);
        }
      };
      await Promise.all([fill(), fill()]);
    } catch (error) {
      await caches.delete(CACHE);
      throw error;
    }
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = (await caches.keys()).filter(key => key.startsWith(PREFIX) && key !== CACHE);
    // One preceding generation protects old tabs' dynamically imported chunks.
    await Promise.all(keys.slice(0, -1).map(key => caches.delete(key)));
    await self.registration.navigationPreload?.enable().catch(() => {});
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting();
});

async function rangeResponse(request, response) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('Range') || '');
  if (!match || (!match[1] && !match[2])) return fetch(request);
  const data = await response.arrayBuffer();
  const length = data.byteLength;
  const start = match[1] ? Number(match[1]) : Math.max(0, length - Number(match[2]));
  const end = match[1] ? (match[2] ? Math.min(Number(match[2]), length - 1) : length - 1) : length - 1;
  if (start >= length || end < start || !Number.isSafeInteger(start) || !Number.isSafeInteger(end)) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${length}` } });
  }
  const headers = new Headers(response.headers);
  headers.delete('Content-Encoding');
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Range', `bytes ${start}-${end}/${length}`);
  headers.set('Content-Length', String(end - start + 1));
  return new Response(data.slice(start, end + 1), { status: 206, headers });
}

async function navigation(event) {
  const cache = await caches.open(CACHE);
  try {
    const response = (await event.preloadResponse) || await fetch(new Request(event.request, { cache: 'no-cache' }));
    if (response.ok) await cache.put(INDEX, response.clone()).catch(() => {});
    if (response.ok || response.status < 500) return response;
  } catch { /* offline navigation falls back to the last working document */ }
  return (await cache.match(INDEX)) || Response.error();
}

async function cachedAsset(request, event) {
  const cache = await caches.open(CACHE);
  let response = await cache.match(request, { ignoreSearch: true });
  const path = new URL(request.url).pathname;
  if (!response && path.includes('/assets/')) {
    for (const key of (await caches.keys()).filter(key => key.startsWith(PREFIX) && key !== CACHE)) {
      response = await (await caches.open(key)).match(request, { ignoreSearch: true });
      if (response) break;
    }
  }
  if (response) return request.headers.has('Range') ? rangeResponse(request, response) : response;
  let network;
  try { network = await fetch(request); }
  catch { return new Response('', { status: 503, statusText: 'Unavailable offline' }); }
  // Never poison a cache with a 206 response or a failed/opaque download.
  if (network.status === 200 && network.type !== 'opaque') {
    const saved = path.includes('/fonts/') ? store(cache, new Request(request.url), network.clone()) : cache.put(new Request(request.url), network.clone());
    event.waitUntil(saved.catch(() => {}));
  }
  return network;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname)) return;
  if (request.mode === 'navigate') { event.respondWith(navigation(event)); return; }
  const relative = url.pathname.slice(SCOPE.pathname.length);
  if (/^(assets|art|fonts|audio)\//.test(relative) || relative === 'favicon.svg') {
    event.respondWith(cachedAsset(request, event));
  }
});
