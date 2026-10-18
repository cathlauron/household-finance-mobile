import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planBatches, BATCH_MAX_WRITES, BATCH_MAX_CHARS } from '../src/householdPartsPlan.ts';

test('no writes, no batches', () => {
  assert.deepEqual(planBatches([]), []);
});

test('small writes fit in one batch, order kept', () => {
  const items = [{ id: 'a', size: 10 }, { id: 'b', size: 20 }, { id: 'c', size: 30 }];
  const b = planBatches(items);
  assert.equal(b.length, 1);
  assert.deepEqual(b[0].map((x) => x.id), ['a', 'b', 'c']);
});

test('splits by number of writes', () => {
  const items = Array.from({ length: BATCH_MAX_WRITES * 2 + 5 }, (_, i) => ({ id: 'p' + i, size: 0 }));
  const b = planBatches(items);
  assert.equal(b.length, 3);
  assert.ok(b.every((x) => x.length <= BATCH_MAX_WRITES));
  assert.equal(b.flat().length, items.length);
});

test('splits by size and never goes over the size limit', () => {
  const items = Array.from({ length: 20 }, (_, i) => ({ id: 'p' + i, size: 900_000 }));
  const b = planBatches(items);
  assert.ok(b.length >= 3);
  for (const batch of b) assert.ok(batch.reduce((s, x) => s + x.size, 0) <= BATCH_MAX_CHARS);
  assert.deepEqual(b.flat().map((x) => x.id), items.map((x) => x.id));
});
