import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settleTarget, dragPosition } from '../src/subPages.ts';

// Sub-pages that follow your finger (2026-10-23, Cath picked sample B).
// Positions: 0 = first page (Bills), 1 = Debts, 2 = Loans. Phone 390 wide.
const W = 390;

test('a short slow drag springs back to the same page', () => {
  assert.equal(settleTarget(0, -60, -100, W, 3), 0);
  assert.equal(settleTarget(1, 60, 100, W, 3), 1);
});

test('dragging a quarter of the screen goes to the next or previous page', () => {
  assert.equal(settleTarget(0, -110, 0, W, 3), 1);
  assert.equal(settleTarget(2, 110, 0, W, 3), 1);
});

test('a quick flick goes over even if it is short', () => {
  assert.equal(settleTarget(1, -40, -900, W, 3), 2);
  assert.equal(settleTarget(1, 40, 900, W, 3), 0);
});

test('a tiny wobble is not a flick', () => {
  assert.equal(settleTarget(1, -10, -900, W, 3), 1);
});

test('past the last or first page it stays (soft bounce, never another tab)', () => {
  assert.equal(settleTarget(2, -300, -1500, W, 3), 2);
  assert.equal(settleTarget(0, 300, 1500, W, 3), 0);
});

test('two pages only (e.g. Upcoming / Done)', () => {
  assert.equal(settleTarget(0, -200, 0, W, 2), 1);
  assert.equal(settleTarget(1, -200, -2000, W, 2), 1);
});

test('the page follows the finger one for one in the middle', () => {
  assert.equal(dragPosition(1, -195, W, 3), 1.5);
  assert.equal(dragPosition(1, 195, W, 3), 0.5);
});

test('past the ends it only gives a third as much', () => {
  assert.ok(Math.abs(dragPosition(0, 117, W, 3) - -0.1) < 1e-9);
  assert.ok(Math.abs(dragPosition(2, -117, W, 3) - 2.1) < 1e-9);
});

test('no width yet: nothing moves', () => {
  assert.equal(dragPosition(1, -100, 0, 3), 1);
  assert.equal(settleTarget(1, -300, -2000, 0, 3), 1);
});
