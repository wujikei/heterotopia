import { readFile, readdir, writeFile, stat, mkdir, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import react from '@vitejs/plugin-react';

// Repository edition: HTML plus classic local data scripts, usable via file://.
// --standalone also embeds those scripts for a genuinely single-file download.
const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
const standalone = process.argv.includes('--standalone');
const destination = path.resolve(process.env.VN_PORTABLE_OUTPUT || (standalone
  ? path.join(root, 'artifacts/portable/异托邦-单文件.html') : path.join(root, '异托邦.html')));
let html = await readFile(path.join(dist, 'index.html'), 'utf8');
const assetMap = {};
const manifest = JSON.parse(await readFile(path.join(root, 'src/data/art-manifest.json'), 'utf8'));
const mobileCGs = new Set(manifest.mobile.filter(name => name.startsWith('cg-')).map(name => `${name}-m.webp`));
for (const name of await readdir(path.join(dist, 'art'))) {
  if (!name.endsWith('.webp') || (name.endsWith('-m.webp') && !mobileCGs.has(name))) continue;
  const image = await readFile(path.join(dist, 'art', name));
  assetMap[name.slice(0, -5)] = `data:image/webp;base64,${image.toString('base64')}`;
}
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
let embedded = `<script>globalThis.__HETEROTOPIA_ASSETS__=${JSON.stringify(assetMap)};globalThis.__HETEROTOPIA_ORIGINALS__={};globalThis.__HETEROTOPIA_AUDIO__={};globalThis.__HETEROTOPIA_SOURCE__="data:text/plain;charset=utf-8;base64,${source.toString('base64')}";</script>`;
const payloads = [];
let payload = '';
const shardBudget = 24 * 1024 * 1024;
for (const [globalName, map] of [['__HETEROTOPIA_ORIGINALS__', originalMap], ['__HETEROTOPIA_AUDIO__', audioMap]]) {
  for (const [name, value] of Object.entries(map)) {
    const assignment = `globalThis.${globalName}[${JSON.stringify(name)}]=${JSON.stringify(value)};\n`;
    if (Buffer.byteLength(assignment) > shardBudget) throw new Error(`Asset exceeds the local shard budget: ${name}`);
    if (payload && Buffer.byteLength(payload) + Buffer.byteLength(assignment) > shardBudget) { payloads.push(payload); payload = ''; }
    payload += assignment;
  }
}
if (payload) payloads.push(payload);
await mkdir(path.dirname(destination), { recursive: true });
if (standalone) {
  embedded += payloads.map(code => `<script>${code}</script>`).join('');
} else {
  const folder = path.join(path.dirname(destination), '离线资源');
  await mkdir(folder, { recursive: true });
  const manifestPath = path.join(folder, 'manifest.json');
  let previous;
  try { previous = JSON.parse(await readFile(manifestPath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const files = [];
  for (const [i, code] of payloads.entries()) {
    const sha256 = createHash('sha256').update(code).digest('hex');
    const file = `resources-${String(i + 1).padStart(2, '0')}-${sha256.slice(0, 12)}.js`;
    await writeFile(path.join(folder, file), code, 'utf8');
    files.push({ file, bytes: Buffer.byteLength(code), sha256 });
    // Classic blocking scripts work from file:// without fetch or CORS.
    embedded += `<script data-portable-shard src="./离线资源/${file}"></script>`;
  }
  await writeFile(manifestPath, JSON.stringify({ version: 1, files, originals: Object.keys(originalMap).length, audio: Object.keys(audioMap).length }, null, 2) + '\n');
  // Remove only files listed by this generator's previous manifest, never a
  // directory or an arbitrary user-supplied path.
  for (const old of previous?.files ?? []) {
    if (/^resources-\d+-[a-f0-9]{12}\.js$/.test(old.file) && !files.some(item => item.file === old.file)) {
      await unlink(path.join(folder, old.file)).catch(error => { if (error.code !== 'ENOENT') throw error; });
    }
  }
}
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
const complete = `Object.keys(globalThis.__HETEROTOPIA_ORIGINALS__).length===${Object.keys(originalMap).length}&&Object.keys(globalThis.__HETEROTOPIA_AUDIO__).length===${Object.keys(audioMap).length}`;
const missing = `document.addEventListener('DOMContentLoaded',()=>{const root=document.getElementById('root');root.setAttribute('data-portable-error','');root.style.cssText='padding:12vh 8vw;font:20px/2 serif;color:#eee8d8';root.textContent='离线资源没有放齐。请将「异托邦.html」与「离线资源」文件夹放在一起，再重新打开。';});`;
html = html.replace(scriptMatch[0], () => `${embedded}<script type="module">if(${complete}){${js}}else{${missing}}</script>`);
html = html.replace(/<link\b[^>]*rel="(?:modulepreload|preload)"[^>]*>/g, '');
const icon = await readFile(path.join(dist, 'favicon.svg'));
html = html.replace('./favicon.svg', `data:image/svg+xml;base64,${icon.toString('base64')}`);
const license = await Promise.all(['NotoSerifSC-OFL.txt', 'LXGWWenKai-OFL.txt'].map(name => readFile(path.join(dist, 'fonts', name), 'utf8'))).then(items => items.join('\n\n').replace(/[\t ]+$/gm, ''));
html = html.replace('</head>', () => `<!-- Embedded font license: Noto Serif SC\n${license.replaceAll('-->', '-- >')}\n-->\n</head>`);
html = html.replace(/[\t ]+$/gm, '');
if (!standalone && Buffer.byteLength(html, 'utf8') >= 100 * 1024 * 1024) throw new Error('Repository HTML exceeds the GitHub 100 MiB file limit');
await writeFile(destination, html, 'utf8');
await writeFile(path.join(root, '字体授权-OFL.txt'), license, 'utf8');
console.log(`Portable game: ${destination}`);
console.log(`${Object.keys(assetMap).length} lightweight images; ${Object.keys(originalMap).length} original masters; ${(await stat(destination)).size / 1024 / 1024 >> 0} MiB HTML. Both quality modes work offline.`);
console.log(`${Object.keys(audioMap).length} audio files; ${standalone ? 'all data embedded in one file' : `${payloads.length} local data scripts in 离线资源/`}.`);
