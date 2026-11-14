import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { loadStory, SCENES, compileScene, newProfile } from '../src/engine';

await loadStory();
const output = 'artifacts/i18n/source';
fs.mkdirSync(output, { recursive: true });
const story: Record<string, string> = {};
const context: Record<string, unknown> = {};
const ui: Record<string, string> = {};
const decorativeSeals = new Set(['帰', '路', '絵', '記', '聴', '栞', '休', '夢', '音']);
const add = (s: string) => { if (!decorativeSeals.has(s) && /[\p{Script=Han}]/u.test(s)) ui[s] = s; };
for (const scene of SCENES) {
  add(scene.title); add(scene.chapter);
  scene.chapter.split(' ').forEach(add);
  for (const endings of [[], ['blade'], ['mercy'], ['names'], ['blade','mercy','leave','names','kunlun','home']] as const) {
    for (const breakfast of ['A', 'B']) {
      const profile = { ...newProfile(), endings: [...endings], oldNames: true };
      for (const beat of compileScene(scene.id, profile, { choices: { breakfast }, inventory: ['jadeHead','jadeBody','jadeTail'] })) {
        if (beat.kind === 'text') {
          story[beat.id] = beat.text;
          context[beat.id] = { scene: scene.title, chapter: scene.chapter, speaker: beat.speaker, mood: beat.mood };
          add(beat.speaker); add(beat.mood);
        } else if (beat.kind === 'choice') {
          add(beat.prompt);
          beat.choices.forEach(c => { add(c.title); add(c.detail); if (c.hint) add(c.hint); });
        }
      }
    }
  }
}
const files = fs.readdirSync('src', { recursive: true }).map(String).filter(f => /\.(ts|tsx)$/.test(f));
for (const file of files) {
  const source = ts.createSourceFile(file, fs.readFileSync(path.join('src', file), 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  function walk(node: ts.Node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) add(node.text);
    if (ts.isJsxText(node)) add(node.text.replace(/\s+/g, ' ').trim());
    if (ts.isTemplateExpression(node)) add(node.head.text + node.templateSpans.map((s, i) => `{${i}}${s.literal.text}`).join(''));
    ts.forEachChild(node, walk);
  }
  walk(source);
}
const jsonWalk = (v: unknown): void => { if (typeof v === 'string') add(v); else if (v && typeof v === 'object') Object.values(v).forEach(jsonWalk); };
jsonWalk(JSON.parse(fs.readFileSync('src/data/soundtrack.json', 'utf8')));
['语言','正在切换语言…','语言切换失败，请重试。','中文','英语','日语','德语','日本語字体','本机字体 · 日文衬线体','正文翻译','英语、日语与德语译本','本译本保留原作中的人名、意象与留白。'].forEach(add);
for (const [name, data] of Object.entries({ story, context, ui })) fs.writeFileSync(`${output}/${name}.json`, JSON.stringify(data, null, 2) + '\n');
console.log(JSON.stringify({ pages: Object.keys(story).length, ui: Object.keys(ui).length, characters: Object.values(story).join('').length }));
