import assert from 'node:assert/strict';
import test from 'node:test';
import { compileScene, newProfile } from '../src/engine';
import { loadStory } from '../src/story';

await loadStory('overseas');
const profile = newProfile('overseas');
function paragraph(scene: string, block: number) {
  return compileScene(scene, profile, { choices: {}, inventory: [] })
    .filter(beat => beat.kind === 'text' && beat.id.startsWith(`${scene}:${block}:`))
    .map(beat => beat.kind === 'text' ? beat.text : '').join('');
}

test('the borrowed-body opening keeps the officiant, Xu and the mocking child distinct', () => {
  assert.match(paragraph('modern-o-0-3', 7), /他颈间挂一串兽牙.*大巫祝开口/);
  assert.match(paragraph('modern-o-0-3', 17), /你想说“我不是”/);
  assert.match(paragraph('modern-o-0-3', 19), /我、我、我/);
  assert.match(paragraph('modern-o-0-5', 5), /你在想：戌。这是这具身体的名字/);
  assert.match(paragraph('modern-o-0-7', 3), /“我、我、我——”狗子故意/);
  assert.match(paragraph('modern-o-0-7', 13), /狗子卡住了.*他学不出来/);
});

test('the fork remembers the new seventh night, not an unplayed V6 conversation or map', () => {
  assert.match(paragraph('modern-c-1-13', 11), /路漫漫其修远兮.*跟我走，我就告诉你/);
  assert.doesNotMatch(paragraph('modern-c-1-13', 11), /问的三句|跟上你，你就告诉你/);
  assert.doesNotMatch(paragraph('modern-c-1-13', 12), /古图|断口|掌心只有墨/);
  assert.match(paragraph('modern-c-1-13', 12), /残玉与断翅木鸟/);
});

test('gods, the king, villagers and Yun keep their own acts and first-person speech', () => {
  assert.match(paragraph('modern-r-A-4', 1), /王剥得很慢.*他看也不看/);
  assert.match(paragraph('modern-r-A-1', 30), /大巫祝说完/);
  assert.match(paragraph('modern-k-A-11', 12), /他把六副面具.*轮到你，你接过来/);
  assert.match(paragraph('modern-k-B-2', 6), /神看了我.*看着他的背影/);
  assert.match(paragraph('modern-k-B-14', 5), /我瞎了以后.*我用来听/);
  assert.match(paragraph('modern-k-E-3', 1), /那人眉目含愁/);
  assert.match(paragraph('modern-k-E-9', 1), /河伯乘车驾龙/);
  assert.match(paragraph('modern-k-E-9', 4), /你问河伯/);
  assert.match(paragraph('modern-k-F-4', 5), /你想问我.*我眼睛瞎了，可我脑子没瞎/);
});

test('the shared royal return opens its eyes only once without changing Lin Yue identity', () => {
  assert.equal(paragraph('modern-o-4-1', 2), '（再睁开眼时，你（林越）坐在宿舍书桌前。）');
});
