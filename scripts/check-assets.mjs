import { readFile, readdir, mkdir, writeFile, stat } from 'node:fs/promises';
import { BACKGROUNDS, CHARACTERS } from '../src/data/world.ts';
import { portraitName } from '../src/assets.ts';
import { AVAILABLE, portraitNameFor } from '../src/data/expressions.ts';
import { AVAILABLE_EXTRAS } from '../src/data/extras.ts';
import { CGS } from '../src/data/cgs.ts';
import { ACTOR_VARIANTS, actorPortraitName } from '../src/data/actorVariants.ts';
import { RELIC_ART } from '../src/data/relics.ts';

const root = new URL('../', import.meta.url);
const imageManifest = JSON.parse(await readFile(new URL('src/data/art-manifest.json', root), 'utf8'));
const audio = JSON.parse(await readFile(new URL('public/audio/manifest.json', root), 'utf8'));
const requiredArt = new Set([
  ...RELIC_ART.map(name => `${name}.webp`),
  ...Object.keys(BACKGROUNDS).flatMap(name => [`${name}.webp`, `${name}-thumb.webp`]),
  ...CHARACTERS.flatMap(character => [`${portraitName(character.key)}.webp`, `portrait-${character.key}-face.webp`]),
  ...imageManifest.avif.map(name => `${name}.avif`),
  ...imageManifest.mobile.flatMap(name => [`${name}-m.avif`, `${name}-m.webp`]),
  ...Object.keys(imageManifest.originals ?? {}).map(name => `${name}.webp`),
  ...Object.entries(AVAILABLE).flatMap(([key, expressions]) => expressions.map(expression => `${portraitNameFor(key, expression)}.webp`)),
  ...[...AVAILABLE_EXTRAS].flatMap(key => [`${portraitName(key)}.webp`, `portrait-${key}-face.webp`]),
  ...CGS.filter(cg => cg.file).flatMap(cg => [cg.file, ...(cg.thumbnail ? [cg.thumbnail] : [])]).map(name => `${name}.webp`),
  ...Object.entries(ACTOR_VARIANTS).flatMap(([key, variants]) => Object.entries(variants).flatMap(([variant, states]) => states.map(expression => `${actorPortraitName({ character: { key }, variant, expression })}.webp`))),
]);
const requiredOriginals = new Set(Object.values(imageManifest.originals ?? {}));
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
const result = { art: [], 'art-original': [], audio: [], missing: [] };
for (const [folder, required] of [['art', requiredArt], ['art-original', requiredOriginals], ['audio', requiredAudio]]) {
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
  unregisteredOriginals: result['art-original'].filter(item => item.role === 'unreferenced'),
  originals: requiredOriginals.size,
  cgs: CGS.filter(cg => cg.file).length,
  unusedAudio: result.audio.filter(item => item.role === 'unreferenced'),
}, null, 2));
if (result.missing.length) process.exitCode = 1;
