import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const dist = new URL('../dist/', import.meta.url);
const files = [];
async function walk(folder = '') {
  for (const entry of await readdir(new URL(folder, dist), { withFileTypes: true })) {
    const name = folder + entry.name;
    if (entry.isDirectory()) await walk(name + '/');
    else if (name !== 'sw.js' && !name.endsWith('.zip')) files.push(name);
  }
}
await walk();
const digest = createHash('sha256');
const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
digest.update(source);
for (const name of files.sort()) { digest.update(name); digest.update(await readFile(new URL(name, dist))); }
const version = digest.digest('hex').slice(0, 16);
const precache = [
  'index.html', 'favicon.svg',
  ...files.filter(name => /^assets\/.*\.(js|css)$/.test(name)),
  ...['story-serif-ui', 'story-serif-ui-semibold', 'story-serif-metadata', 'story-serif-regular', 'story-serif-semibold'].map(name => `fonts/${name}.woff2`),
  'art/hero.avif', 'art/hero.webp',
];
for (const name of precache) if (!files.includes(name)) throw new Error(`Precache asset missing: ${name}`);
const manifest = `const BUILD_VERSION = ${JSON.stringify(version)};\nconst PRECACHE_URLS = ${JSON.stringify(precache)};`;
await writeFile(new URL('sw.js', dist), source.replace('/* __BUILD_MANIFEST__ */', manifest));
console.log(`Service worker ${version}: ${precache.length} precached files (one hero format per browser).`);
