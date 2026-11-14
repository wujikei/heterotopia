import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { compileScene, loadStory, newProfile, SCENES } from '../src/engine';
import { isLanguage, LANGUAGES, storyText, translate } from '../src/localeText';
import { autoDelayFor } from '../src/autoReading';
import type { Catalog, LanguagePack } from '../src/localeText';
import type { EndingId } from '../src/types';

await loadStory();
const load = (language: string, part: string): Catalog => JSON.parse(readFileSync(new URL(`../src/data/locales/${language}/${part}.json`, import.meta.url), 'utf8'));
const originals = new Map<string, string>();
const japaneseNameCalls = new Set(['0-4:14:0','0-10:18:0','0-11:4:0','1-1:18:0','1-9:21:0','A-9:4:0','A-E1-1:4:0','A-E2-1:13:0','A-E3-3:5:0','B-1:14:0','终-2:4:0']);
const japaneseUntranslatedLabels = new Set(['序章','沈辞','唐瑾','宋嘉树','林薇','道士','阿媪','戌（沈辞）','狗子','屈衡','棠','王','太后','沅','媭','雩','荼','合唱','村人','老祝','阿蘅','魏叔','老兵','阿豆','戌','四','五','六','一','二','三','名','憩','水','食堂','沈家','背景','演出','丁','日本語','序','山河','玉','笛','字/秒','第','平静','卜骨','卜','芈','衣','戌（']);
for (const scene of SCENES) {
  for (const endings of [[], ['blade'], ['mercy'], ['names'], ['blade','mercy','leave','names','kunlun','home']] as EndingId[][]) {
    for (const breakfast of ['A','B']) {
      const profile = { ...newProfile(), oldNames: true, endings };
      for (const beat of compileScene(scene.id, profile, { choices: { breakfast }, inventory: ['jadeHead','jadeBody','jadeTail'] })) {
        if (beat.kind === 'text') originals.set(beat.id, beat.text);
      }
    }
  }
}

test('every language covers all authored pages including conditional memories', () => {
  assert.equal(originals.size, 1603);
  const englishKeys = Object.keys(load('en','ui')).sort();
  for (const language of ['en','ja','de']) {
    const story = load(language, 'story');
    const ui = load(language, 'ui');
    assert.deepEqual(Object.keys(story).sort(), [...originals.keys()].sort(), language);
    assert.deepEqual(Object.keys(ui).sort(), englishKeys, `${language} UI keys`);
    for (const [key, text] of Object.entries({ ...story, ...ui })) {
      assert.equal(typeof text, 'string', `${language}/${key}`);
      assert.ok(text.trim().length, `${language}/${key} empty`);
      assert.doesNotMatch(text, /\bTODO\b|\bTBD\b|待翻译|未翻译|翻訳待ち/, `${language}/${key}`);
    }
    if (language === 'ja') {
      const untranslated = Object.entries(ui).filter(([key, value]) => key === value);
      assert.ok(untranslated.every(([key]) => japaneseUntranslatedLabels.has(key)), `unexpected untranslated Japanese UI values: ${untranslated.filter(([key]) => !japaneseUntranslatedLabels.has(key)).map(([key]) => key).join(', ')}`);
    }
    for (const [key, text] of Object.entries(ui)) {
      const tokens = (s: string) => [...new Set(s.match(/\{\d+\}/g) ?? [])].sort();
      assert.deepEqual(tokens(text), tokens(key), `${language} placeholders: ${key}`);
    }
    // A source paragraph must never masquerade as a completed translated page.
    for (const [id, source] of originals) {
      if (/[\p{Script=Han}]/u.test(source) && story[id] === source) {
        assert.ok(language === 'ja' && japaneseNameCalls.has(id), `${language}/${id} retained untranslated source text`);
      }
    }
  }
});

test('source-key UI formatting keeps numbered placeholders, including repeated values', () => {
  assert.equal(translate('书签 {0}：{1}', { '书签 {0}：{1}': '{1} — bookmark {0}', '梦船': 'Dream boat' }, [2,'梦船']), 'Dream boat — bookmark 2');
  assert.equal(translate('Untouched {0}', {}, ['$&` literal']), 'Untouched $&` literal');
  assert.equal(translate('{0} {0} {1}', {}, ['A']), 'A A {1}');
  const pack: LanguagePack = { story: { '0-1:3:0': 'A knock beneath the boat.' }, ui: { '举刃': 'Raise the Blade' } };
  assert.equal(storyText('0-1:3:0', '船底下有东西在敲。', pack), 'A knock beneath the boat.');
  assert.equal(storyText('choice-id', '举刃', pack), 'Raise the Blade');
  assert.equal(storyText('legacy', 'Old imported line', pack), 'Old imported line');
  assert.equal(storyText('0-1:3:0', '原稿'), '原稿');
});

test('the language list has a stable Chinese default and rejects stale preferences', () => {
  assert.deepEqual(LANGUAGES.map(item => item.id), ['zh','en','ja','de']);
  for (const value of [undefined,null,'fr',0,{},'EN']) assert.equal(isLanguage(value), false);
  for (const item of LANGUAGES) assert.equal(isLanguage(item.id), true);
});

test('Latin automatic reading times actual words and allows longer translated paragraphs', () => {
  const long = Array(75).fill('river').join(' ');
  assert.ok(autoDelayFor(long, 4, undefined, 'en') > 9000);
  assert.ok(autoDelayFor(long, 4, undefined, 'de') > autoDelayFor(long, 4, undefined, 'en'));
  assert.ok(autoDelayFor('Stay.', 4, undefined, 'en') < autoDelayFor(long, 4, undefined, 'en'));
  assert.ok(autoDelayFor(Array(300).fill('word').join(' '), 10, undefined, 'de') <= 30000);
  assert.equal(autoDelayFor('水声还在。', 4), autoDelayFor('水声还在。', 4, undefined, 'zh'));
});
