// Version 2.2 (Cath, canvas P1-P3): ticking a trip's checklist item asks how it was paid.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reconcileTravelChecklistTransactions as reconcile } from '../src/travelChecklist.ts';

const bpi = { type: 'debit', accountId: 'bpi' };
const food = { id: 'i1', title: 'Food', cost: 6000, checked: false };
const hotel = { id: 'i2', title: 'Hotel', cost: 4000, checked: false };

test('paid from an account: one transaction, from that account, on the chosen day', () => {
  const r = reconcile([food], [{ ...food, checked: true, completedDate: '2026-10-18', paidWith: bpi }], [], 'Thailand');
  assert.equal(r.transactions.length, 1);
  const t = r.transactions[0];
  assert.deepEqual([t.amount, t.direction, t.date, t.label, t.category], [6000, 'out', '2026-10-18', 'Thailand: Food', 'Travel']);
  assert.deepEqual(t.paymentMethod, bpi);
  assert.equal(r.checklist[0].expenseTransactionId, t.id);
  assert.deepEqual(r.takeOffs, []);
});

test('just mark it paid: ticked, but nothing in spending', () => {
  const r = reconcile([food], [{ ...food, checked: true, completedDate: '2026-10-20', markedOnly: true }], [{ id: 'x', amount: 5 }], 'Thailand');
  assert.equal(r.transactions.length, 1); // only the one that was already there
  assert.equal(r.checklist[0].checked, true);
  assert.equal(r.checklist[0].markedOnly, true);
  assert.equal(r.checklist[0].expenseTransactionId, undefined);
});

test('unticking takes the payment back off and forgets how it was paid', () => {
  const paid = reconcile([food], [{ ...food, checked: true, paidWith: bpi, completedDate: '2026-10-18' }], [], 'Thailand');
  const r = reconcile(paid.checklist, paid.checklist.map((i) => ({ ...i, checked: false })), paid.transactions, 'Thailand');
  assert.equal(r.transactions.length, 0);
  assert.equal(r.checklist[0].paidWith, undefined);
  assert.equal(r.checklist[0].expenseTransactionId, undefined);
  const marked = reconcile([hotel], [{ ...hotel, checked: true, markedOnly: true }], [], 'T');
  const back = reconcile(marked.checklist, marked.checklist.map((i) => ({ ...i, checked: false })), [], 'T');
  assert.equal(back.checklist[0].markedOnly, undefined);
});

test('"take it off my balance" is passed on once and never kept on the item', () => {
  const r = reconcile([food], [{ ...food, checked: true, paidWith: bpi, completedDate: '2026-09-01', takeOffBalance: true }], [], 'Thailand');
  assert.deepEqual(r.takeOffs, [{ pm: bpi, amount: 6000 }]);
  assert.equal('takeOffBalance' in r.checklist[0], false);
});

test('an older tick with no account still logs spending, as before', () => {
  const r = reconcile([hotel], [{ ...hotel, checked: true }], [], 'Baguio');
  assert.equal(r.transactions.length, 1);
  assert.equal(r.transactions[0].paymentMethod, undefined);
});
