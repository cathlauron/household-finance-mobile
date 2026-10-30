// Peel-off switches (mockup K2e, Cath 2026-10-29): the shapes behind the peel.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stickerPeel, stickerFar, stickerCorner, screenPeel, pathOf } from '../src/peelGeometry.ts';

const area = (p) => Math.abs(p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0) / 2);

test('a sticker not yet touched is fully stuck down', () => {
  const r = stickerPeel(84, 34, stickerCorner(84));
  assert.equal(area(r.keep), 84 * 34);
  assert.equal(r.flap.length, 0);
  assert.equal(r.k, 0);
  assert.equal(r.past, false);
});

test('peeling from the top-right corner lifts that corner first', () => {
  const r = stickerPeel(84, 34, [70, 12]);
  assert.ok(area(r.keep) > 84 * 34 * 0.8, 'most of it is still down');
  assert.ok(area(r.flap) > 0, 'a small corner is folded over');
  // the folded corner keeps its size (folding doesn't stretch paper)
  assert.ok(Math.abs(area(r.flap) - (84 * 34 - area(r.keep))) < 0.01);
  assert.equal(r.past, false);
});

test('at the end of a full peel nothing of the old face is left', () => {
  const r = stickerPeel(84, 34, stickerFar(84, 34));
  assert.equal(area(r.keep), 0);
  assert.equal(r.k, 1);
  assert.equal(r.past, true);
});

test('letting go counts as "off" only past halfway', () => {
  const diag = Math.hypot(84, 34);
  const c = stickerCorner(84);
  const dir = [-84 / diag, 34 / diag];
  const at = (f) => stickerPeel(84, 34, [c[0] + dir[0] * diag * f, c[1] + dir[1] * diag * f]);
  assert.equal(at(0.45).past, false);
  assert.equal(at(0.55).past, true);
});

test('the screen peels from its top-right corner at 45 degrees and grows to the whole screen', () => {
  const W = 390, H = 844;
  assert.equal(screenPeel(W, H, 0).revealed.length, 0);
  const small = screenPeel(W, H, 0.1);
  // a corner triangle: it touches the top edge and the right edge, both the same length
  const xs = small.revealed.map((p) => p[0]), ys = small.revealed.map((p) => p[1]);
  const along = W - Math.min(...xs), down = Math.max(...ys);
  assert.ok(Math.abs(along - down) < 0.01, 'same distance along the top and down the side');
  assert.ok(Math.max(...xs) === W && Math.min(...ys) === 0, 'starts at the top-right corner');
  assert.ok(area(small.flap) > 0 && Math.abs(area(small.flap) - area(small.revealed)) < 0.01, 'the folded flap is the same size while it fits');
  const full = screenPeel(W, H, 1);
  assert.ok(Math.abs(area(full.revealed) - W * H) < 0.01, 'at the end the whole screen shows the other look');
});

test('the flap never leaves the screen', () => {
  for (const k of [0.2, 0.5, 0.8]) {
    for (const [x, y] of screenPeel(390, 844, k).flap) {
      assert.ok(x >= -0.01 && x <= 390.01 && y >= -0.01 && y <= 844.01, `k=${k}`);
    }
  }
});

test('an empty shape draws nothing', () => {
  assert.equal(pathOf([]), '');
  assert.equal(pathOf([[0, 0], [1, 0], [1, 1]], 2, 3), 'M2.00 3.00L3.00 3.00L3.00 4.00Z');
});
