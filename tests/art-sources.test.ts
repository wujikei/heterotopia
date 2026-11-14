import assert from 'node:assert/strict';
import test from 'node:test';
import { asset, assetSources, artViewport, imageFailed, initializeImageFormats, recordImageFailure, subscribeArtViewport } from '../src/assets';
import { preloadImage } from '../src/preload';

test('portrait CGs follow screen shape, rotate live, and work from embedded sources', async () => {
  const originalMedia = globalThis.matchMedia;
  const originalImage = globalThis.Image;
  const embedded = globalThis as typeof globalThis & { __HETEROTOPIA_ASSETS__?: Record<string, string> };
  let width = 390, height = 844;
  const listeners = new Map<string, Set<() => void>>();
  globalThis.matchMedia = ((query: string) => ({
    get matches() { return query.includes('aspect-ratio') ? width / height <= .75 : width <= 760; },
    addEventListener: (_: string, listener: () => void) => {
      const set = listeners.get(query) ?? new Set(); set.add(listener); listeners.set(query, set);
    },
    removeEventListener: (_: string, listener: () => void) => listeners.get(query)?.delete(listener),
  })) as typeof matchMedia;
  try {
    assert.match(asset('cg-s06-snow-hands'), /-m.webp$/);
    assert.match(asset('cg-s06-snow-hands', false), /cg-s06-snow-hands.webp$/);
    let changes = 0;
    const unsubscribe = subscribeArtViewport(() => changes++);
    const before = artViewport();
    width = 740; height = 360;
    for (const set of listeners.values()) for (const listener of set) listener();
    assert.notEqual(artViewport(), before);
    assert.ok(changes > 0);
    assert.match(asset('cg-s06-snow-hands'), /cg-s06-snow-hands.webp$/);
    assert.match(asset('portrait-shen'), /portrait-shen-m.webp$/);
    width = 820; height = 1180;
    assert.match(asset('cg-s06-snow-hands'), /-m.webp$/);
    unsubscribe();
    assert.ok([...listeners.values()].every(set => set.size === 0));
    embedded.__HETEROTOPIA_ASSETS__ = {
      'cg-s06-snow-hands': 'data:image/webp;base64,wide',
      'cg-s06-snow-hands-m': 'data:image/webp;base64,tall',
      'portrait-shen': 'data:image/webp;base64,portrait',
    };
    assert.equal(asset('cg-s06-snow-hands'), 'data:image/webp;base64,tall');
    assert.equal(asset('cg-s06-snow-hands', false), 'data:image/webp;base64,wide');
    assert.equal(assetSources('portrait-shen').mobile, undefined);
    delete embedded.__HETEROTOPIA_ASSETS__;

    globalThis.Image = class { naturalWidth = 2; src = ''; decode = async () => {}; } as unknown as typeof Image;
    await initializeImageFormats();
    assert.match(asset('cg-s02-first-crossing'), /-m.avif$/);
    recordImageFailure('./art/cg-s02-first-crossing-m.avif');
    assert.match(asset('cg-s02-first-crossing'), /-m.webp$/);
    recordImageFailure('./art/cg-s02-first-crossing-m.webp');
    assert.match(asset('cg-s02-first-crossing'), /cg-s02-first-crossing.avif$/);
  } finally {
    delete embedded.__HETEROTOPIA_ASSETS__;
    globalThis.matchMedia = originalMedia;
    globalThis.Image = originalImage;
  }
});

test('missing mobile formats decode the full landscape fallback and return its real URL', async () => {
  const original = globalThis.Image;
  let image!: { src: string; onerror: () => void; onload: () => Promise<void> };
  globalThis.Image = class {
    src = ''; onerror = () => {}; onload = async () => {}; decode = async () => {};
    constructor() { image = this; }
  } as unknown as typeof Image;
  try {
    const loaded = preloadImage('./art/cg-test-responsive-m.avif');
    image.onerror();
    assert.equal(image.src, './art/cg-test-responsive-m.webp');
    image.onerror();
    assert.equal(image.src, './art/cg-test-responsive.webp');
    await image.onload();
    assert.equal(await loaded, './art/cg-test-responsive.webp');
    assert.equal(imageFailed('./art/cg-test-responsive-m.avif'), true);
    assert.equal(imageFailed('./art/cg-test-responsive-m.webp'), true);
  } finally { globalThis.Image = original; }
});
