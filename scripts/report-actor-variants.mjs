import { mkdir, writeFile } from 'node:fs/promises';
import { actorForBeat } from '../src/actors.ts';
import { actorPortraitName } from '../src/data/actorVariants.ts';
import { cgForBeat } from '../src/data/cgs.ts';
import { compileScene, newProfile, SCENES } from '../src/engine.ts';
import { loadStory } from '../src/story.ts';

await loadStory();
const pages = new Map();
for (const endings of [[], ['mercy', 'kunlun'], ['blade', 'names', 'kunlun']]) {
  const profile = { ...newProfile(), endings, oldNames: endings.length > 0 };
  for (const breakfast of ['A', 'B']) for (const scene of SCENES) {
    const beats = compileScene(scene.id, profile, { choices: { breakfast }, inventory: ['jadeHead', 'jadeBody', 'jadeTail', 'names'] });
    for (const beat of beats) {
      const actor = actorForBeat(beat, scene, beats);
      if (!actor || actor.variant === 'default' || cgForBeat(beat, scene.id)) continue;
      pages.set(beat.id, { id: beat.id, sceneId: scene.id, character: actor.character.key, label: actor.label, variant: actor.variant,
        expression: actor.expression, portrait: actorPortraitName(actor), text: beat.kind === 'text' ? beat.text : '' });
    }
  }
}
const rows = [...pages.values()];
const counts = Object.fromEntries([...new Set(rows.map(row => `${row.character}/${row.variant}`))].map(key => {
  const subset = rows.filter(row => `${row.character}/${row.variant}` === key);
  return [key, { pages: subset.length, examples: subset.slice(0, 3).map(row => row.id) }];
}));
const output = new URL('../docs/art/art-direction-2-coverage.json', import.meta.url);
await mkdir(new URL('.', output), { recursive: true });
await writeFile(output, JSON.stringify({ counts, pages: rows }, null, 2) + '\n');
console.log(JSON.stringify(counts, null, 2));
