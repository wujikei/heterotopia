import { avifEnabled, isPortable } from './assets';
import { afterFirstScreen } from './idle';

let waiting: ServiceWorker | null = null;
let refreshing = false;
const listeners = new Set<() => void>();
const publish = (worker: ServiceWorker | null) => { waiting = worker; listeners.forEach(listener => listener()); };
export const subscribeUpdate = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const updateAvailable = () => waiting !== null;
export function applyUpdate() {
  if (!waiting) return;
  refreshing = true;
  waiting.postMessage({ type: 'SKIP_WAITING' });
}

export function registerSiteCache(): void {
  if (!import.meta.env.PROD || isPortable() || location.protocol === 'file:' || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (refreshing) location.reload(); });
  afterFirstScreen(() => {
    void document.fonts.ready.then(() => navigator.serviceWorker.register(`./sw.js?format=${avifEnabled() ? 'avif' : 'webp'}`, { scope: './', updateViaCache: 'none' })).then(registration => {
      const report = async () => {
        // WebKit can emit "installed" before this registration object's waiting
        // property updates. Reading the registration again observes that change.
        const current = await navigator.serviceWorker.getRegistration();
        if (current?.waiting && navigator.serviceWorker.controller) publish(current.waiting);
      };
      void report();
      registration.addEventListener('updatefound', () => {
        registration.installing?.addEventListener('statechange', () => { void report(); });
      });
    }).catch(() => { /* caching failure must never prevent reading */ });
  }, 2400);
}
