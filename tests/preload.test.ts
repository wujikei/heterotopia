import assert from 'node:assert/strict';
import test from 'node:test';
import { isDecoded, preloadImage } from '../src/preload';

test('preloading deduplicates URLs, waits for decoding, supports onload fallback and retries errors', async () => {
  const original = globalThis.Image;
  const instances: FakeImage[] = [];
  let finishDecode!: () => void;
  class FakeImage {
    decoding = '';
    src = '';
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    decode = () => new Promise<void>(resolve => { finishDecode = resolve; });
    constructor() { instances.push(this); }
  }
  globalThis.Image = FakeImage as unknown as typeof Image;
  try {
    const pending = preloadImage('test:decoded');
    assert.equal(preloadImage('test:decoded'), pending);
    assert.equal(instances.length, 1);
    instances[0].onload!();
    assert.equal(isDecoded('test:decoded'), false);
    finishDecode(); await pending;
    assert.equal(isDecoded('test:decoded'), true);
    assert.equal(instances[0].onload, null);
    const fallback = preloadImage('data:image/webp;base64,test');
    instances[1].decode = () => Promise.reject(new Error('WebKit decode fallback'));
    instances[1].onload!(); await fallback;
    assert.equal(isDecoded('data:image/webp;base64,test'), true);
    const failed = preloadImage('test:retry');
    instances[2].onerror!();
    await assert.rejects(failed, /Image unavailable/);
    assert.equal(isDecoded('test:retry'), false);
    const retry = preloadImage('test:retry');
    assert.notEqual(retry, failed);
    instances[3].onload!(); finishDecode(); await retry;
    const avif = preloadImage('./art/test.avif');
    instances[4].onerror!();
    assert.equal(instances[5].src, './art/test.webp');
    const webp = preloadImage('./art/test.webp');
    assert.equal(instances.length, 6, 'the fallback shares the existing WebP request');
    assert.equal(preloadImage('./art/test.avif'), avif, 'concurrent readers share the fallback path');
    instances[5].onload!(); finishDecode();
    assert.equal(await avif, await webp);
    assert.equal(isDecoded('./art/test.avif'), false);
    assert.equal(isDecoded('./art/test.webp'), true);
  } finally { globalThis.Image = original; }
});

test('a timed-out request can be retried at the original size', async t => {
  const original = globalThis.Image;
  const requests: string[] = [];
  t.mock.timers.enable({ apis: ['setTimeout'] });
  globalThis.Image = class {
    set src(url: string) { requests.push(url); }
    removeAttribute() {}
  } as unknown as typeof Image;
  try {
    const url = './art-original/hero.webp';
    const first = assert.rejects(preloadImage(url), /Image timed out/);
    t.mock.timers.tick(30000);
    await first;
    const retry = assert.rejects(preloadImage(url), /Image timed out/);
    assert.deepEqual(requests, [url, url]);
    t.mock.timers.tick(30000);
    await retry;
  } finally {
    globalThis.Image = original;
    t.mock.timers.reset();
  }
});
