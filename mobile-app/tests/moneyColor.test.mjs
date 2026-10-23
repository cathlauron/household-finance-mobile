import { test } from 'node:test';
import assert from 'node:assert/strict';
import { redUnlessZero, isZeroAmount } from '../src/moneyColor.ts';

// H-15 (2026-10-22): zero totals were red (Debts "Total debt logged ₱0.00", Groceries
// "Bought ₱0.00", ...). Cath: grey when zero, red only when there's something.
const colors = { negative: 'red', inkDim: 'grey' };
test('zero is grey', () => {
  assert.equal(redUnlessZero(0, colors), 'grey');
  assert.equal(redUnlessZero(0.001, colors), 'grey');
  assert.equal(redUnlessZero(-0, colors), 'grey');
});
test('anything owed or spent is red', () => {
  assert.equal(redUnlessZero(0.01, colors), 'red');
  assert.equal(redUnlessZero(2350, colors), 'red');
});
test('zero after rounding to centavos counts as zero', () => {
  assert.equal(isZeroAmount(0.3 - 0.1 - 0.2), true);
});
