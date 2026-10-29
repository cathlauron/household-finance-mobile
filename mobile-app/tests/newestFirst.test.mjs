// H-39 (Cath, 2026-10-29): "Newest" must show her newest transaction at the very top, to the
// second. Before: only the DAY was compared, so on the same day the order depended on what
// kind of entry it was (bills before manual entries, etc.), not when it was logged.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTransactionsList, sortTransactions } from '../src/transactions.ts';

const base = {
  bills: [], debts: [], loans: [], income: [], savingsGoals: [], manualTransactions: [],
};
const at = (h, m, s) => new Date(2026, 9, 29, h, m, s).getTime();

function model() {
  return {
    ...base,
    bills: [{ id: 'b', name: 'Meralco', category: 'Utilities', owner: 'shared', cycles: [
      { id: 'c1', dueDate: '2026-10-29', amountDue: 2000, amountPaid: 2000, paidDate: '2026-10-29', notes: '', paidAt: at(9, 0, 0) },
    ] }],
    loans: [{ id: 'l', name: 'Olive', direction: 'borrowed', owner: 'shared', actualPayments: [
      { id: 'lp', date: '2026-10-29', actual: 24550, createdAt: at(13, 5, 1) },
    ] }],
    manualTransactions: [
      { id: 'm1', date: '2026-10-29', label: 'Lunch', amount: 150, direction: 'out', createdAt: at(13, 5, 0) },
      { id: 'm2', date: '2026-10-29', label: 'Coffee', amount: 90, direction: 'out', createdAt: at(13, 5, 2) },
      { id: 'm0', date: '2026-10-28', label: 'Yesterday', amount: 10, direction: 'out', createdAt: at(23, 0, 0) },
    ],
  };
}

test('H-39: Newest = newest to the second, across every kind of entry', () => {
  const ids = sortTransactions(buildTransactionsList(model()), 'newest').map((t) => t.id);
  assert.deepEqual(ids, ['manual-m2', 'loan-lp', 'manual-m1', 'bill-c1', 'manual-m0']);
});

test('H-39: Oldest is the exact reverse', () => {
  const ids = sortTransactions(buildTransactionsList(model()), 'oldest').map((t) => t.id);
  assert.deepEqual(ids, ['manual-m0', 'bill-c1', 'manual-m1', 'loan-lp', 'manual-m2']);
});

test('H-39: a back-dated entry stays on its own day, even if logged just now', () => {
  const m = model();
  m.manualTransactions.push({ id: 'm9', date: '2026-10-01', label: 'Old receipt', amount: 5, direction: 'out', createdAt: at(13, 30, 0) });
  const ids = sortTransactions(buildTransactionsList(m), 'newest').map((t) => t.id);
  assert.equal(ids[0], 'manual-m2');
  assert.equal(ids[ids.length - 1], 'manual-m9');
});
