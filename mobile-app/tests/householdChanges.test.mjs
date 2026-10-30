// H-51 (Cath, 2026-10-29, canvas F2 + F3): on opening, what another member changed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { householdChangesSince, changesHeadline } from '../src/householdChanges.ts';
import { defaultModel } from '../src/defaultModel.ts';

const since = 1000;
function model() {
  const m = defaultModel();
  m.manualTransactions = [
    { id: 't1', date: '2026-10-29', label: 'Groceries', amount: 1240.75, direction: 'out', addedBy: 'ana', createdAt: 2000 },
    { id: 't2', date: '2026-10-29', label: 'Lunch', amount: 150, direction: 'out', addedBy: 'cath', createdAt: 3000 },
    { id: 't3', date: '2026-10-20', label: 'Old one', amount: 50, direction: 'out', addedBy: 'ana', createdAt: 500 },
  ];
  m.bills = [{ id: 'b', name: 'Meralco', category: '', recurringType: 'monthly', dueDate: { day: '31' }, priority: '', owner: '', notes: '', addedBy: 'cath', createdAt: 10,
    cycles: [{ id: 'c', dueDate: '2026-10-31', amountDue: 2350.45, amountPaid: 2350.45, paidDate: '2026-10-29', paidAt: 4000, paidBy: 'ana', notes: '' }] }];
  m.travel = [{ id: 'tr', name: 'Baguio', startDate: '2026-11-20', endDate: '2026-11-22', checklist: [{ id: 'i', title: 'Hotel', cost: 4500, checked: false, changedBy: 'ana', changedAt: 5000 }], todos: [], addedBy: 'cath', createdAt: 10 }];
  return m;
}

test("another member's adds, changes and payments since last time, newest first; mine and older ones are left out", () => {
  const list = householdChangesSince(model(), 'cath', since);
  assert.deepEqual(list.map((c) => `${c.action} ${c.what} by ${c.who}`), [
    'Changed Hotel by ana',
    'Marked paid Meralco by ana',
    'Added Groceries by ana',
  ]);
  assert.equal(list[1].amount, 2350.45);
  assert.deepEqual(list[2].ref, { page: 'TransactionDetail', id: 't1' });
});

test('the headline', () => {
  const list = householdChangesSince(model(), 'cath', since);
  assert.equal(changesHeadline(list, (u) => u[0].toUpperCase() + u.slice(1)), 'Ana changed 3 things');
});

test('nothing new: nothing listed', () => {
  assert.deepEqual(householdChangesSince(model(), 'cath', 9999), []);
});
