// Synthetic test files for the normal settings import control, not playthroughs.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadStory } from '../src/story.ts';
import { modernAcceptanceSeed } from '../tests/helpers/modernAcceptance.ts';
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
cases.push(
  ['08-three-questions','modern-o-0-2','modern-o-0-2:10:0'],
  ['09-roommate-return','modern-o-4-1','modern-o-4-1:19:0'],
  ['10-linyue-resolve','modern-o-5-2','modern-o-5-2:19:0'],
);
const manifest=[];
for (const [name,scene,id] of cases) {
  const seed=modernAcceptanceSeed(scene,id);
  writeFileSync(resolve(out,`${name}.json`),JSON.stringify(seed,null,2));
  manifest.push({file:`${name}.json`,...seed.acceptance});
}
writeFileSync(resolve(out,'manifest.json'),JSON.stringify(manifest,null,2));
writeFileSync(resolve(out,'README.txt'),`合成UI验收定位档，不是人工完整通读的存档。只在无痕/隔离浏览器使用。
选林越·现代新卷→阅读设置→导入JSON→等待导入成功→关闭设置→只点一次续梦。续梦不出章节卡，不要再点画面“进入”；额外点击会推进一页。先按manifest.json逐字确认当前句与页码，再开始推进。
05=16/28手刻；06=20/28灯灭；07=27/28玉扣亮。若是17/21/28，已比定位页多推进一次。
02后连续读3页，再开回看确认实际刚读文字；08从三声何连续读到16/28和17/28，再到20/28、27/28。此路径有引擎逐页生成的真实原文历史；仍是合成阅读历史，不等于人已通读。
09从“夜里，室友”继续到想家了/没有/心里，下一页分面CG应接替立绘。10从“想”继续下一句。
不能按普通重新启程，不能用开发者工具/storage注入。无声测试不是实际听音。窄窗不是手机实机。
`);
console.log(out);
