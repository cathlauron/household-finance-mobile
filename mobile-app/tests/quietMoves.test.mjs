import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quietMovesFor, movesQuiet } from '../src/quietMoves.ts';

test('quiet for the given time, then moves are normal again', async () => {
  assert.equal(movesQuiet(), false);
  quietMovesFor(50);
  assert.equal(movesQuiet(), true);
  await new Promise((r) => setTimeout(r, 80));
  assert.equal(movesQuiet(), false);
});
