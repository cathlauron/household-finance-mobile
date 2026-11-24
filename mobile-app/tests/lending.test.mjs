import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultModel } from '../src/defaultModel.ts';
import { accountCurrentBalance } from '../src/balanceProjection.ts';
import { addBorrowed, syncBorrowed, lendingLocked } from '../src/borrowed.ts';
import { buildTransactionsList, transactionTotals } from '../src/transactions.ts';

// Cath, 2026-11-24 (H-87): a Borrowed transaction edited to Money out is money you lent. The money
// leaves the account, and its debt or loan becomes a loan in To-Pay › Loans › Lent (owed to you).
// Once something was paid on it, it can't switch.
const now = new Date();
const TODAY = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
const pm = { type: 'debit', accountId: 'd1' };
function household() {
  const m = defaultModel();
  m.balanceAccounts = { ...m.balanceAccounts, asOfDate: '2026-01-01', cash: [], debit: [{ id: 'd1', name: 'BPI', amount: 10000 }], credit: [] };
  return m;
}
const bal = (m) => accountCurrentBalance(m, 'debit', m.balanceAccounts.debit[0]);
const toOut = (m, id) => syncBorrowed({ ...m, manualTransactions: m.manualTransactions.map((t) => (t.id === id ? { ...t, direction: 'out' } : t)) }, id);

test('Lent: a borrowed loan switched to Money out becomes a loan you lent', () => {
  const b = addBorrowed(household(), { kind: 'loan', amount: 5000, from: 'Ate Joy', account: pm, date: TODAY, now: 1 });
  assert.equal(bal(b.model), 15000);
  const m = toOut(b.model, b.txnId);
  assert.equal(bal(m), 5000);
  const loan = m.loans.find((l) => l.id === b.refId);
  assert.equal(loan.direction, 'lent');
  assert.equal(loan.totalAmount, 5000);
  assert.equal(m.manualTransactions[0].category, 'Lent');
  assert.deepEqual(m.manualTransactions[0].borrowed, { kind: 'loan', id: b.refId });
});

test('Lent: a borrowed debt switched to Money out is replaced by a loan you lent, with its due date', () => {
  const b = addBorrowed(household(), { kind: 'debt', amount: 800, from: 'Kuya', account: pm, date: TODAY, payBackBy: '2026-12-15', now: 1 });
  const m = toOut(b.model, b.txnId);
  assert.equal(m.debts.length, 0);
  const link = m.manualTransactions[0].borrowed;
  assert.equal(link.kind, 'loan');
  const loan = m.loans.find((l) => l.id === link.id);
  assert.equal(loan.direction, 'lent');
  assert.equal(loan.name, 'Kuya');
  assert.equal(loan.totalAmount, 800);
  assert.deepEqual(loan.dueDate, { date: '2026-12-15' });
});

test('Lent: switched back to Money in, it is borrowed again', () => {
  const b = addBorrowed(household(), { kind: 'loan', amount: 5000, from: 'Ate Joy', account: pm, date: TODAY, now: 1 });
  const out = toOut(b.model, b.txnId);
  const back = syncBorrowed({ ...out, manualTransactions: out.manualTransactions.map((t) => ({ ...t, direction: 'in' })) }, b.txnId);
  assert.equal(back.loans.find((l) => l.id === b.refId).direction, 'borrowed');
  assert.equal(back.manualTransactions[0].category, 'Borrowed');
});

test('Lent: once something was paid on it, it is locked and nothing changes', () => {
  const b = addBorrowed(household(), { kind: 'loan', amount: 5000, from: 'Ate Joy', account: pm, date: TODAY, now: 1 });
  b.model.loans = b.model.loans.map((l) => ({ ...l, actualPayments: [{ id: 'p', date: TODAY, actual: 500 }] }));
  assert.equal(lendingLocked(b.model, b.txnId), true);
  assert.equal(lendingLocked(addBorrowed(household(), { kind: 'loan', amount: 1, from: 'x', account: pm, date: TODAY }).model, 'none'), false);
  const m = toOut(b.model, b.txnId);
  assert.equal(m.loans[0].direction, 'borrowed');
});

test('Lent: lending is not spending, like borrowing is not income', () => {
  const b = addBorrowed(household(), { kind: 'loan', amount: 5000, from: 'Ate Joy', account: pm, date: TODAY, now: 1 });
  const m = toOut(b.model, b.txnId);
  m.manualTransactions.push({ id: 'lunch', date: TODAY, label: 'Lunch', amount: 300, direction: 'out', owner: 'shared', paymentMethod: pm, createdAt: 2 });
  const t = transactionTotals(buildTransactionsList(m));
  assert.equal(t.totalOut, 300);
  assert.equal(t.totalIn, 0);
});
