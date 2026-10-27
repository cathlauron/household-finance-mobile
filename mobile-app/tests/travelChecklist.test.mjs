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

// Review fixes (Oct 20)
const gcash = { type: 'debit', accountId: 'gcash' };

test('answered again in the trip form: the old payment goes, the new answer counts', () => {
  const paid = reconcile([food], [{ ...food, checked: true, completedDate: '2026-10-18', paidWith: bpi }], [], 'Thailand');
  const saved = paid.checklist[0];
  // untick then tick again with GCash on another day (still ticked when saved)
  const r = reconcile(paid.checklist, [{ ...saved, checked: true, paidWith: gcash, completedDate: '2026-10-19' }], paid.transactions, 'Thailand');
  assert.equal(r.transactions.length, 1);
  assert.deepEqual(r.transactions[0].paymentMethod, gcash);
  assert.equal(r.transactions[0].date, '2026-10-19');
  assert.equal(r.checklist[0].expenseTransactionId, r.transactions[0].id);
  // now "Just mark it paid": no transaction left
  const m = reconcile(r.checklist, [{ ...r.checklist[0], paidWith: undefined, markedOnly: true }], r.transactions, 'Thailand');
  assert.equal(m.transactions.length, 0);
  assert.equal(m.checklist[0].expenseTransactionId, undefined);
  // and back to an account: the payment is logged again
  const again = reconcile(m.checklist, [{ ...m.checklist[0], markedOnly: undefined, paidWith: bpi }], m.transactions, 'Thailand');
  assert.equal(again.transactions.length, 1);
});

test('the same answer again keeps the same payment', () => {
  const paid = reconcile([food], [{ ...food, checked: true, completedDate: '2026-10-18', paidWith: bpi }], [], 'Thailand');
  const r = reconcile(paid.checklist, paid.checklist.map((i) => ({ ...i })), paid.transactions, 'Thailand');
  assert.equal(r.transactions[0].id, paid.transactions[0].id);
});

test('"take it off my balance" is given back when unticked, answered again or removed', () => {
  const paid = reconcile([food], [{ ...food, checked: true, paidWith: bpi, completedDate: '2026-09-01', takeOffBalance: true }], [], 'T');
  assert.deepEqual(paid.takeOffs, [{ pm: bpi, amount: 6000 }]);
  assert.equal(paid.checklist[0].takenOff, 6000);
  const untick = reconcile(paid.checklist, paid.checklist.map((i) => ({ ...i, checked: false })), paid.transactions, 'T');
  assert.deepEqual(untick.takeOffs, [{ pm: bpi, amount: -6000 }]);
  assert.equal(untick.checklist[0].takenOff, undefined);
  const removed = reconcile(paid.checklist, [], paid.transactions, 'T');
  assert.deepEqual(removed.takeOffs, [{ pm: bpi, amount: -6000 }]);
  assert.equal(removed.transactions.length, 0);
  const other = reconcile(paid.checklist, [{ ...paid.checklist[0], paidWith: gcash }], paid.transactions, 'T');
  assert.deepEqual(other.takeOffs, [{ pm: bpi, amount: -6000 }]);
});

test('a cost change after "take it off my balance" moves the balance by the difference', () => {
  const paid = reconcile([food], [{ ...food, checked: true, paidWith: bpi, completedDate: '2026-09-01', takeOffBalance: true }], [], 'T');
  const r = reconcile(paid.checklist, [{ ...paid.checklist[0], cost: 6500 }], paid.transactions, 'T');
  assert.deepEqual(r.takeOffs, [{ pm: bpi, amount: 500 }]);
  assert.equal(r.checklist[0].takenOff, 6500);
  assert.equal(r.transactions[0].amount, 6500);
});
