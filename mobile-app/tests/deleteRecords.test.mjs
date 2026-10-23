// Version 2.2: Delete at the bottom of pages uses these shared rules.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withoutTrip, withoutSavingsPot } from '../src/deleteRecords.ts';

const model = () => ({
  balanceAccounts: { cash: [], debit: [{ id: 'bpi', name: 'BPI', amount: 10000 }], credit: [] },
  savingsGoals: [{ id: 'g1', name: 'Travel: Thailand', contributions: [] }],
  events: [{ id: 'e1', savingsGoalId: 'g1', trackInSavings: true }],
  manualTransactions: [{ id: 'tx1', amount: 6000 }, { id: 'other', amount: 5 }],
  travel: [
    {
      id: 't1', name: 'Thailand', savingsGoalId: 'g1', trackInSavings: true,
      checklist: [{ id: 'i1', title: 'Food', cost: 6000, checked: true, expenseTransactionId: 'tx1', paidWith: { type: 'debit', accountId: 'bpi' }, takenOff: 6000 }],
    },
  ],
});

test('deleting a trip removes its pot and spending, and gives back what was taken off', () => {
  const m = withoutTrip(model(), 't1');
  assert.equal(m.travel.length, 0);
  assert.equal(m.savingsGoals.length, 0);
  assert.deepEqual(m.manualTransactions.map((t) => t.id), ['other']);
  assert.equal(m.balanceAccounts.debit[0].amount, 16000);
});

test('deleting a pot stops a trip or event saving into it', () => {
  const m = withoutSavingsPot(model(), 'g1');
  assert.equal(m.savingsGoals.length, 0);
  assert.equal(m.travel[0].trackInSavings, false);
  assert.equal(m.travel[0].savingsGoalId, undefined);
  assert.equal(m.events[0].trackInSavings, false);
});
