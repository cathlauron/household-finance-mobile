// Claude connector (Cath, 2026-11-28): the unlocked summary holds only totals that match the
// app's own numbers, and queue entries become "To review" transactions exactly once.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultModel } from '../src/defaultModel.ts';
import { buildClaudeSummary } from '../src/claudeSummary.ts';
import { applyQueue, entryToTransaction, transactionIdFor } from '../src/claudeQueue.ts';
import { computeLeftToSpend, totalCurrentBalance } from '../src/balanceProjection.ts';
import { computeCategorySpend } from '../src/transactions.ts';

const today = new Date(2026, 10, 10); // Tue Nov 10 2026

function model() {
  const m = defaultModel();
  m.balanceAccounts = {
    ...m.balanceAccounts,
    asOfDate: '2026-11-01',
    asOfAt: 1,
    cash: [{ id: 'c', name: 'Wallet', amount: 2000 }],
    debit: [{ id: 'd', name: 'BPI 1234567890', amount: 30000, last4: '7890' }],
    credit: [{ id: 'k', name: 'Visa', amount: 10000 }],
  };
  m.categories = [{ id: 'g', name: 'Groceries', color: '#0f0' }];
  m.categoryBudgets = [{ id: 'b', category: 'Groceries', monthlyBudget: 6000 }, { id: 'b2', category: 'Fun', monthlyBudget: 1000 }];
  m.manualTransactions = [
    { id: 't1', date: '2026-11-03', label: 'SM secret note', notes: 'private', amount: 1500, direction: 'out', owner: 'shared', category: 'Groceries', paymentMethod: { type: 'debit', accountId: 'd' }, createdAt: 2 },
    { id: 't2', date: '2026-11-04', label: 'Jeep', amount: 40, direction: 'out', owner: 'shared', category: 'Transport', paymentMethod: { type: 'cash', accountId: 'c' }, createdAt: 3 },
    { id: 't3', date: '2026-10-30', label: 'Old', amount: 999, direction: 'out', owner: 'shared', category: 'Groceries' },
  ];
  m.bills = [{ id: 'b1', name: 'Meralco', category: 'Utilities', recurringType: 'monthly', dueDate: { day: '20' }, priority: '', owner: '', notes: 'acct 99887766',
    cycles: [{ id: 'y', dueDate: '2026-11-20', amountDue: 2350, amountPaid: '', paidDate: '', notes: '' }] }];
  return m;
}

test('summary numbers match the app: balances, total, Left to Spend, category spending', () => {
  const m = model();
  const s = buildClaudeSummary(m, today);
  assert.equal(s.totalBalance, totalCurrentBalance(m));
  assert.equal(s.leftToSpend.amount, computeLeftToSpend(m, today).amount);
  const groceries = s.categories.find((c) => c.name === 'Groceries');
  assert.equal(groceries.spent, computeCategorySpend(m, 'Groceries', '2026-11'));
  assert.deepEqual(groceries, { name: 'Groceries', spent: 1500, budget: 6000, left: 4500 });
  assert.deepEqual(s.categories.find((c) => c.name === 'Fun'), { name: 'Fun', spent: 0, budget: 1000, left: 1000 });
  assert.equal(s.thisMonth.moneyOut, 1540);
  assert.deepEqual(s.accounts.map((a) => a.balance), [1960, 28500, 10000]);
});

test('summary has the bill due before payday', () => {
  const s = buildClaudeSummary(model(), today);
  assert.deepEqual(s.dueBeforePayday, [{ kind: 'Bills', name: 'Meralco', amount: 2350, date: '2026-11-20' }]);
});

test('summary never carries transaction names, notes, card digits or long numbers', () => {
  const text = JSON.stringify(buildClaudeSummary(model(), today));
  for (const secret of ['SM secret note', 'private', '7890', '1234567890', '99887766', 'Jeep']) {
    assert.ok(!text.includes(secret), `summary leaked "${secret}"`);
  }
});

test('a queue entry becomes a To review transaction on the named account', () => {
  const t = entryToTransaction(model(), { id: 'q1', label: 'Lunch', amount: 250.456, category: 'groceries', account: 'wallet', date: '2026-11-09' }, today, 'cath');
  assert.deepEqual(t, {
    id: 'claude-q1', date: '2026-11-09', label: 'Lunch', amount: 250.46, direction: 'out', owner: 'shared', category: 'Groceries',
    paymentMethod: { type: 'cash', accountId: 'c' }, needsReview: true, reviewWhy: 'Added by Claude', addedBy: 'cath',
  });
});

test('queue: a future or odd date becomes today; no account says so in the review note', () => {
  const t = entryToTransaction(model(), { id: 'q', label: 'Salary', amount: 100, direction: 'in', date: '2027-01-01' }, today);
  assert.equal(t.date, '2026-11-10');
  assert.equal(t.direction, 'in');
  assert.equal(t.paymentMethod, undefined);
  assert.equal(t.reviewWhy, 'Added by Claude, no account picked');
  assert.equal(entryToTransaction(model(), { id: 'q', label: 'x', amount: 1, date: 'soon' }, today).date, '2026-11-10');
});

test('queue: unusable entries are never added (no label, zero, negative, text amount, odd direction)', () => {
  const m = model();
  for (const bad of [{ amount: 10 }, { label: 'a', amount: 0 }, { label: 'a', amount: -5 }, { label: 'a', amount: '10' }, { label: 'a', amount: 5, direction: 'saving' }]) {
    assert.equal(entryToTransaction(m, { id: 'z', ...bad }, today), null);
  }
});

test('queue: each entry is added once, even if the queue is read twice', () => {
  const m = model();
  const first = applyQueue(m, [{ id: 'a', label: 'Lunch', amount: 100 }, { id: 'b', label: '', amount: 5 }], today);
  assert.deepEqual(first.done, ['a', 'b']);
  assert.equal(first.model.manualTransactions.length, 4);
  const again = applyQueue(first.model, [{ id: 'a', label: 'Lunch', amount: 100 }], today);
  assert.equal(again.model, null);
  assert.deepEqual(again.done, ['a']);
  assert.equal(transactionIdFor('a/../b'), 'claude-ab');
});
