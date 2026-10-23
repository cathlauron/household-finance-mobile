import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deleteManualTxn } from '../src/transactionActions.ts';

// H-17 (2026-10-22): deleting the refund entry (the money in that "Mark refund as received"
// adds) left its expense saying "received" for money that was no longer there.
const model = () => ({
  manualTransactions: [
    { id: 'shoes', label: 'Shoes', amount: 1500, direction: 'out', date: '2026-10-20', refundExpectedAmount: 1500, refundTransactionId: 'r1' },
    { id: 'r1', label: 'Refund: Shoes', amount: 1500, direction: 'in', date: '2026-10-22' },
    { id: 'lunch', label: 'Lunch', amount: 200, direction: 'out', date: '2026-10-22' },
  ],
});

test('deleting the refund entry puts the expense back to "refund pending"', () => {
  const after = deleteManualTxn(model(), 'r1');
  const shoes = after.manualTransactions.find((t) => t.id === 'shoes');
  assert.equal(after.manualTransactions.some((t) => t.id === 'r1'), false);
  assert.equal(shoes.refundTransactionId, undefined);
  assert.equal(shoes.refundExpectedAmount, 1500);
});

test('deleting the expense still removes its refund entry too', () => {
  const after = deleteManualTxn(model(), 'shoes');
  assert.deepEqual(after.manualTransactions.map((t) => t.id), ['lunch']);
});

test('deleting something unrelated changes nothing else', () => {
  const after = deleteManualTxn(model(), 'lunch');
  assert.equal(after.manualTransactions.find((t) => t.id === 'shoes').refundTransactionId, 'r1');
});
