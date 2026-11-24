import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { ACTOR_LIGHT } from '../src/data/actorLight';
import { compileScene, newGame, newProfile } from '../src/engine';
import { loadStory } from '../src/story';

await loadStory('overseas');

test('ancient Kunlun mountain slope keeps mountain backdrop instead of modern-mountain-path', () => {
  const profile = newProfile('overseas');
  const game = newGame(profile);
  const kunlunFruit = compileScene('modern-k-A-9', profile, game);
  assert.ok(kunlunFruit.length > 0);
  for (const beat of kunlunFruit) {
    assert.equal(beat.background, 'mountain', `${beat.id} should stay ancient mountain`);
  }
  const modernHill = compileScene('modern-o-5-4', { ...profile, endings: ['modern-royal-e1', 'modern-kunlun'] }, game);
  assert.equal(modernHill[0]?.background, 'modern-mountain-path');
  const dormFlashback = compileScene('modern-k-E-7', profile, game);
  assert.ok(dormFlashback.some(b => b.background === 'modern-dorm'));
});

test('modern actor lighting profiles cover all modern return and prologue backdrops', () => {
  for (const bg of ['modern-dorm-quiet-r2', 'modern-dorm', 'modern-street-arrival-r3', 'modern-library', 'modern-office', 'modern-mountain-path', 'modern-sunset']) {
    assert.ok(ACTOR_LIGHT[bg] === 'warm' || ACTOR_LIGHT[bg] === 'cold', `${bg} has ambient lighting`);
  }
});

test('overseas visual polish CSS keeps idle actors opaque, frames 16:9 CGs on portrait, and prevents short-landscape ending clipping', () => {
  const dialogueCss = readFileSync('src/styles/ink-dialogue.css', 'utf8');
  assert.match(dialogueCss, /\.actor--idle:not\(\.actor--pending\):not\(\.actor--exit\)\s*\{\s*opacity:\s*1;/);
  const modernCss = readFileSync('src/styles/modern.css', 'utf8');
  assert.match(modernCss, /cg-modern-"\]:not\(\[data-art\$="-r2"\]\)/);
  assert.match(modernCss, /background-size:\s*contain/);
  const endingCss = readFileSync('src/styles/ink-ending.css', 'utf8');
  assert.match(endingCss, /@media \(max-height: 680px\).*\(max-height: 520px\)/);
  const atmosphere = readFileSync('src/components/Atmosphere.tsx', 'utf8');
  assert.match(atmosphere, /target\.startsWith\('cg-modern-'\)/);
});
