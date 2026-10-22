import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chartPoints } from '../src/homeChart.ts';

// H-08 (2026-10-22): on Home's Left to Spend card, last month's spending line ran past the
// right edge of the chart when last month had more days than this one (Oct 31 -> Nov 30,
// Jan 31 -> Feb 28).
const xs = (pts) => pts.map((p) => Number(p.split(',')[0]));

test("last month's line never goes past the right edge (31-day month before a 30-day one)", () => {
  const prev = Array.from({ length: 31 }, (_, i) => (i + 1) * 100);
  const pts = chartPoints(prev, 30, 300, 50, 3100);
  assert.ok(Math.max(...xs(pts)) <= 300, `max x ${Math.max(...xs(pts))}`);
});

test('February after January: still inside', () => {
  const prev = Array.from({ length: 31 }, () => 0);
  assert.ok(Math.max(...xs(chartPoints(prev, 28, 280, 50, 1))) <= 280);
});

test('a full month spans the whole width, first day at the left edge', () => {
  const pts = chartPoints(Array.from({ length: 30 }, () => 0), 30, 290, 50, 1);
  assert.equal(xs(pts)[0], 0);
  assert.equal(xs(pts)[29], 290);
});

test('nothing spent: points sit on the bottom line, no NaN', () => {
  const pts = chartPoints([0, 0, 0], 30, 290, 50, 1);
  assert.ok(pts.every((p) => !p.includes('NaN')));
});
