import { readFile, readdir, mkdir, writeFile, stat } from 'node:fs/promises';
import { BACKGROUNDS, CHARACTERS } from '../src/data/world.ts';
import { portraitName } from '../src/assets.ts';

const root = new URL('../', import.meta.url);
const imageManifest = JSON.parse(await readFile(new URL('src/data/art-manifest.json', root), 'utf8'));
const audio = JSON.parse(await readFile(new URL('public/audio/manifest.json', root), 'utf8'));
const requiredArt = new Set([
  ...Object.keys(BACKGROUNDS).flatMap(name => [`${name}.webp`, `${name}-thumb.webp`]),
  ...CHARACTERS.flatMap(character => [`${portraitName(character.key)}.webp`, `portrait-${character.key}-face.webp`]),
  ...imageManifest.avif.map(name => `${name}.avif`),
  ...imageManifest.mobile.flatMap(name => [`${name}-m.avif`, `${name}-m.webp`]),
]);
const requiredAudio = new Set(audio.files.map(item => item.file));
// Include literal references as well as the dynamic world/portrait rules.
const scanned = [];
async function scan(folder) {
  for (const entry of await readdir(new URL(folder, root), { withFileTypes: true })) {
    const file = folder + entry.name;
    if (entry.isDirectory()) await scan(file + '/');
    else if (/\.(tsx?|css|mjs|py)$/.test(file)) scanned.push(file);
  }
}
await scan('src/'); await scan('scripts/'); scanned.push('index.html');
for (const file of scanned) {
  const text = await readFile(new URL(file, root), 'utf8');
  for (const match of text.matchAll(/\bart\/([a-z0-9-]+\.(?:webp|avif|png))/g)) requiredArt.add(match[1]);
  for (const match of text.matchAll(/\basset(?:Sources)?\(\s*['"]([a-z0-9-]+)['"]\s*\)/g)) requiredArt.add(`${match[1]}.webp`);
}
const result = { art: [], audio: [], missing: [] };
for (const [folder, required] of [['art', requiredArt], ['audio', requiredAudio]]) {
  const files = await readdir(new URL(`public/${folder}/`, root));
  for (const file of files) {
    const url = new URL(`public/${folder}/${file}`, root);
    if (!(await stat(url)).isFile()) continue;
    const role = required.has(file) ? 'runtime' : /\.(json|md|txt)$/i.test(file) ? 'metadata' : 'unreferenced';
    result[folder].push({ file, role, bytes: (await stat(url)).size });
  }
  for (const file of required) if (!files.includes(file)) result.missing.push(`${folder}/${file}`);
}
await mkdir(new URL('artifacts/perf/', root), { recursive: true });
await writeFile(new URL('artifacts/perf/asset-audit.json', root), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ missing: result.missing,
  unreferenced: result.art.filter(item => item.role === 'unreferenced'),
  unusedAudio: result.audio.filter(item => item.role === 'unreferenced'),
}, null, 2));
if (result.missing.length) process.exitCode = 1;
