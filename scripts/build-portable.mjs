import { readFile, readdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import react from '@vitejs/plugin-react';

// A real single-file game: all illustrations, transparent sprites, fonts,
// original screenplay, mastered score, sound effects, engine and UI are embedded.
const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
let html = await readFile(path.join(dist, 'index.html'), 'utf8');
const assetMap = {};
for (const name of await readdir(path.join(dist, 'art'))) {
  if (!name.endsWith('.webp') || name.endsWith('-m.webp')) continue;
  const image = await readFile(path.join(dist, 'art', name));
  assetMap[name.slice(0, -5)] = `data:image/webp;base64,${image.toString('base64')}`;
}
const manifest = JSON.parse(await readFile(path.join(root, 'src/data/art-manifest.json'), 'utf8'));
const originalMap = {};
for (const [name, filename] of Object.entries(manifest.originals ?? {})) {
  if (!assetMap[name]) throw new Error(`Original has no lightweight fallback: ${name}`);
  const image = await readFile(path.join(dist, 'art-original', filename));
  const mime = filename.endsWith('.webp') ? 'image/webp' : filename.endsWith('.avif') ? 'image/avif' : 'image/png';
  originalMap[name] = `data:${mime};base64,${image.toString('base64')}`;
}
const source = await readFile(path.join(dist, '原著剧本-V6.txt'));
const audioMap = {};
for (const name of await readdir(path.join(dist, 'audio'))) {
  if (!name.endsWith('.mp3')) continue;
  const audio = await readFile(path.join(dist, 'audio', name));
  audioMap[name] = `data:audio/mpeg;base64,${audio.toString('base64')}`;
}
const embedded = `<script>globalThis.__HETEROTOPIA_ASSETS__=${JSON.stringify(assetMap)};globalThis.__HETEROTOPIA_ORIGINALS__=${JSON.stringify(originalMap)};globalThis.__HETEROTOPIA_AUDIO__=${JSON.stringify(audioMap)};globalThis.__HETEROTOPIA_SOURCE__="data:text/plain;charset=utf-8;base64,${source.toString('base64')}";</script>`;
const cssMatch = html.match(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/);
if (!cssMatch) throw new Error('Built CSS link was not found');
let css = await readFile(path.join(dist, cssMatch[1]), 'utf8');
const fontFiles = await readdir(path.join(dist, 'fonts'));
for (const name of fontFiles.filter(name => name.endsWith('.woff2'))) {
  const data = await readFile(path.join(dist, 'fonts', name));
  const embeddedFont = `data:font/woff2;base64,${data.toString('base64')}`;
  for (const prefix of ['../fonts/', './fonts/', '/fonts/', 'fonts/']) {
    css = css.replaceAll(`${prefix}${name}`, embeddedFont);
  }
}
for (const match of css.matchAll(/url\(([^)]+)\)/g)) {
  if (!match[1].replace(/^["']|["']$/g, '').startsWith('data:')) {
    throw new Error(`Unembedded CSS asset: ${match[1]}`);
  }
}
html = html.replace(cssMatch[0], () => `<style>${css}</style>`);
const scriptMatch = html.match(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/);
if (!scriptMatch) throw new Error('Built script was not found');
// The website keeps a lazy story chunk. The downloadable edition deliberately
// bundles that same source into one IIFE, including every dynamic import.
const bundled = await build({
  configFile: false, root, base: './', plugins: [react()],
  build: { write: false, cssCodeSplit: false, emptyOutDir: false,
    rollupOptions: { input: path.join(root, 'src/main.tsx'), output: { format: 'iife', inlineDynamicImports: true } },
  },
});
const entry = bundled.output.find(item => item.type === 'chunk' && item.isEntry);
if (!entry || entry.imports.length || entry.dynamicImports.length) throw new Error('Portable edition still has external JavaScript chunks');
const js = entry.code.replaceAll('</script', '<\\/script');
html = html.replace(scriptMatch[0], () => `${embedded}<script type="module">${js}</script>`);
html = html.replace(/<link\b[^>]*rel="(?:modulepreload|preload)"[^>]*>/g, '');
const icon = await readFile(path.join(dist, 'favicon.svg'));
html = html.replace('./favicon.svg', `data:image/svg+xml;base64,${icon.toString('base64')}`);
const license = await Promise.all(['NotoSerifSC-OFL.txt', 'LXGWWenKai-OFL.txt'].map(name => readFile(path.join(dist, 'fonts', name), 'utf8'))).then(items => items.join('\n\n').replace(/[\t ]+$/gm, ''));
html = html.replace('</head>', () => `<!-- Embedded font license: Noto Serif SC\n${license.replaceAll('-->', '-- >')}\n-->\n</head>`);
const destination = process.env.VN_PORTABLE_OUTPUT || path.join(root, '异托邦.html');
html = html.replace(/[\t ]+$/gm, '');
await writeFile(destination, html, 'utf8');
await writeFile(path.join(root, '字体授权-OFL.txt'), license, 'utf8');
console.log(`Portable game: ${destination}`);
console.log(`${Object.keys(assetMap).length} lightweight images and ${Object.keys(originalMap).length} original masters embedded; ${(await stat(destination)).size / 1024 / 1024 >> 0} MB. Both quality modes work offline.`);
console.log(`${Object.keys(audioMap).length} music, ambience and effect files embedded.`);
