// H-42 (Cath, 2026-10-29): the idle timer keeps counting in the background.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stillThereState, secondsLeft } from '../src/stillThereClock.ts';

const MIN = 60 * 1000;
const t0 = 1_000_000;

test('H-42: under 5 minutes away: nothing happens', () => {
  assert.equal(stillThereState(t0, t0 + 4 * MIN).kind, 'fine');
});

test('H-42: back after 5 min 20 s: the question shows with 40 seconds left, not a fresh minute', () => {
  const s = stillThereState(t0, t0 + 5 * MIN + 20000);
  assert.equal(s.kind, 'ask');
  assert.equal(secondsLeft(s.deadline, t0 + 5 * MIN + 20000), 40);
});

test('H-42: back after 6 minutes or more: the amounts are already hidden', () => {
  assert.equal(stillThereState(t0, t0 + 6 * MIN).kind, 'hide');
  assert.equal(stillThereState(t0, t0 + 3 * 60 * MIN).kind, 'hide');
});

// The app really uses it (before H-42 the question always started a fresh minute on return).
import { readFileSync } from 'node:fs';
test('H-42: App checks the clock on return and passes the deadline to the question', () => {
  const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
  const fn = app.slice(app.indexOf('function checkStillThere'), app.indexOf('function checkStillThere') + 700);
  assert.match(fn, /stillThereState\(lastTouchRef\.current, Date\.now\(\)\)/);
  assert.match(fn, /hideAmountsNow\(\)/);
  assert.match(app, /<StillTherePopup\s+visible=\{stillThereOpen\}\s+deadline=\{stillThereDeadline\}/);
  const popup = readFileSync(new URL('../src/components/StillThere.tsx', import.meta.url), 'utf8');
  assert.match(popup, /deadline \?\? Date\.now\(\)/);
});
