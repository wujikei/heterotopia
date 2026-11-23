// Synthetic test files for the normal settings import control, not playthroughs.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadStory } from '../src/story.ts';
import { currentBeat, enterScene, newGame, newProfile, recordProgress } from '../src/engine.ts';
await loadStory('overseas');
const out = resolve(process.argv[2] || 'artifacts/modern-art-r2/acceptance-saves');
mkdirSync(out, { recursive: true });
const cases = [
  ['01-street-arrival','modern-o-0-1'],
  ['02-jade-palm','modern-o-0-1','modern-o-0-1:18:0'],
  ['03-dorm-quiet','modern-o-0-2'],
  ['04-third-voice','modern-o-0-2','modern-o-0-2:15:0'],
  ['05-carving','modern-o-0-2','modern-o-0-2:17:0'],
  ['06-blackout','modern-o-0-2','modern-o-0-2:21:0'],
  ['07-jade-light','modern-o-0-2','modern-o-0-2:28:0'],
];
for (const [name,scene,id] of cases) {
  let profile = newProfile('overseas');
  let state = enterScene(newGame(profile),profile,scene);
  if (id) state = { ...state, beatId: id };
  const beat=currentBeat(state,profile);
  if (id && beat.id !== id) throw Error(`Missing bookmarked page ${id}`);
  profile=recordProgress(state,profile);
  const slot={version:1,savedAt:'2026-11-24T00:00:00+09:00',state};
  writeFileSync(resolve(out,`${name}.json`),JSON.stringify({format:'heterotopia-save',version:1,campaign:'overseas',profile,state,slots:[slot,null,null,null,null,null]},null,2));
}
writeFileSync(resolve(out,'README.txt'),'Synthetic UI acceptance seeds, not full playthrough saves. Use an incognito profile. Select 林越·现代新卷, 阅读设置 > 导入存档 > select JSON > close > 续梦. No developer tools or storage injection required. Original scene/page IDs remain unchanged.\n');
console.log(out);
