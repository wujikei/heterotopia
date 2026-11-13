import { readFile, writeFile } from 'node:fs/promises';

// Homepage/save validation needs scene names and IDs, never narrative blocks.
const story = JSON.parse(await readFile(new URL('../src/data/story.json', import.meta.url), 'utf8'));
const index = { ...story, scenes: story.scenes.map(({ blocks, ...scene }) => scene) };
await writeFile(new URL('../src/data/scene-index.json', import.meta.url), JSON.stringify(index, null, 2) + '\n');
console.log(`Scene index: ${index.scenes.length} scenes; original screenplay unchanged.`);
