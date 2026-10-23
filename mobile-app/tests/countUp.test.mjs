import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldCount, countFrame } from '../src/countUp.ts';

// Smoothness 2026-10-23 (Cath): money numbers that change while you're looking count
// quickly to the new value; instant with Reduce Motion.
const on = { reduce: false, showing: true, masked: false };

test('a change you can see counts', () => {
  assert.equal(shouldCount(2000, 1750, on), true);
});

test('no count: same value, phone set to remove animations, page not showing, amounts hidden', () => {
  assert.equal(shouldCount(1750, 1750, on), false);
  assert.equal(shouldCount(2000, 1750, { ...on, reduce: true }), false);
  assert.equal(shouldCount(2000, 1750, { ...on, showing: false }), false);
  assert.equal(shouldCount(2000, 1750, { ...on, masked: true }), false);
});

test('less than a centavo apart is the same value', () => {
  assert.equal(shouldCount(10.001, 10.004, on), false);
});

test('frames go from the old value to the new one, in centavos', () => {
  const linear = (t) => t;
  assert.equal(countFrame(2000, 1750, 0, linear), 2000);
  assert.equal(countFrame(2000, 1750, 0.5, linear), 1875);
  assert.equal(countFrame(2000, 1750, 1, linear), 1750);
  assert.equal(countFrame(0, 0.03, 0.5, linear), 0.02);
});

test('it never overshoots the new value', () => {
  const springy = (t) => t * 1.2;
  assert.equal(countFrame(100, 200, 0.99, springy), 200);
  assert.equal(countFrame(200, 100, 0.99, springy), 100);
});
