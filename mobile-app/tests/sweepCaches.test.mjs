// Version 2.2 sweep: the shared caches and the "find the new one" helper.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expectArrival, takeExpectedArrival } from '../src/arrivalFocus.ts';
import { getOverdueItems } from '../src/overdue.ts';
import { defaultModel } from '../src/defaultModel.ts';

test('an add made elsewhere is found once on the list it lands on', () => {
  expectArrival('bills', ['a', 'b']);
  assert.equal(takeExpectedArrival('debts', ['a', 'b', 'c']), null); // other list
  assert.equal(takeExpectedArrival('bills', ['a', 'b']), null); // not there yet
  assert.equal(takeExpectedArrival('bills', ['a', 'b', 'c']), 'c');
  assert.equal(takeExpectedArrival('bills', ['a', 'b', 'c', 'd']), null); // used up
});

test('overdue items are worked out again for new data, reused for the same data', () => {
  const m = defaultModel();
  const first = getOverdueItems(m);
  assert.equal(getOverdueItems(m), first); // same data: same answer, not recomputed
  const changed = { ...m, bills: [...(m.bills || [])] };
  assert.notEqual(getOverdueItems(changed), first); // new data: worked out again
});
