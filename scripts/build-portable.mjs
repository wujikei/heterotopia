import { readFile, readdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// A real single-file game: all illustrations, transparent sprites, fonts,
// original screenplay, engine and UI are embedded. No server or CDN is needed.
const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
let html = await readFile(path.join(dist, 'index.html'), 'utf8');
const assetMap = {};
for (const name of await readdir(path.join(dist, 'art'))) {
  if (!name.endsWith('.webp')) continue;
  const image = await readFile(path.join(dist, 'art', name));
  assetMap[name.slice(0, -5)] = `data:image/webp;base64,${image.toString('base64')}`;
}
const source = await readFile(path.join(dist, '原著剧本-V6.txt'));
const embedded = `<script>globalThis.__HETEROTOPIA_ASSETS__=${JSON.stringify(assetMap)};globalThis.__HETEROTOPIA_SOURCE__="data:text/plain;charset=utf-8;base64,${source.toString('base64')}";</script>`;
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
const js = (await readFile(path.join(dist, scriptMatch[1]), 'utf8')).replaceAll('</script', '<\\/script');
html = html.replace(scriptMatch[0], () => `${embedded}<script type="module">${js}</script>`);
const icon = await readFile(path.join(dist, 'favicon.svg'));
html = html.replace('./favicon.svg', `data:image/svg+xml;base64,${icon.toString('base64')}`);
const license = await readFile(path.join(dist, 'fonts', 'NotoSerifSC-OFL.txt'), 'utf8');
html = html.replace('</head>', () => `<!-- Embedded font license: Noto Serif SC\n${license.replaceAll('-->', '-- >')}\n-->\n</head>`);
const destination = path.join(root, '异托邦.html');
await writeFile(destination, html, 'utf8');
await writeFile(path.join(root, '字体授权-OFL.txt'), license, 'utf8');
console.log(`Portable game: ${destination}`);
console.log(`${Object.keys(assetMap).length} image assets embedded; ${(await stat(destination)).size / 1024 / 1024 >> 0} MB. No network or server required.`);
