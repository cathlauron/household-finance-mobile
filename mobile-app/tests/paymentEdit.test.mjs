// H-48 (Cath, 2026-10-29, canvas C1-C3): Undo only for 15 minutes; after that a payment can be
// edited (receipt, a higher amount, date, account), never lowered or removed. Money follows.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { undoLeftMs, UNDO_MS, editLoanPayment, editCyclePayment, checkChanges, cycleAmountLocked } from '../src/paymentEdit.ts';
import { accountCurrentBalance } from '../src/balanceProjection.ts';
import { defaultModel } from '../src/defaultModel.ts';

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = iso(new Date());
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
const MB = { type: 'debit', accountId: 'mb' };
const BPI = { type: 'debit', accountId: 'bpi' };

function model(asOf, at) {
  const m = defaultModel();
  m.balanceAccounts = { ...m.balanceAccounts, asOfDate: asOf, asOfAt: at, debit: [{ id: 'mb', name: 'Maribank', amount: 10000 }, { id: 'bpi', name: 'BPI', amount: 20000 }] };
  m.loans = [{ id: 'o', name: 'Olive', totalAmount: 1200000, expectedPayment: 24550, direction: 'borrowed', owner: 'shared', recurringType: 'monthly', dueDate: { day: '16' },
    actualPayments: [{ id: 'p', date: daysAgo(1), actual: 500, paymentMethod: MB, createdAt: Date.now() - 86400000 }] }];
  return m;
}
const bal = (m, id) => accountCurrentBalance(m, 'debit', m.balanceAccounts.debit.find((a) => a.id === id));

test('Undo is there for 15 minutes after logging, then gone; older payments with no time have none', () => {
  const now = 1_000_000_000;
  assert.equal(undoLeftMs(now - 60_000, now), UNDO_MS - 60_000);
  assert.equal(undoLeftMs(now - UNDO_MS, now), 0);
  assert.equal(undoLeftMs(undefined, now), 0);
});

test('never lower than first paid; no future date; an account is needed unless recorded only', () => {
  assert.match(checkChanges(500, { amount: 400, date: today, pm: MB }, false), /can't be less/);
  assert.equal(checkChanges(500, { amount: 600, date: today, pm: MB }, false), null);
  assert.match(checkChanges(500, { amount: 500, date: '2999-01-01', pm: MB }, false), /future/);
  assert.match(checkChanges(500, { amount: 500, date: today }, false), /account/);
  assert.equal(checkChanges(500, { amount: 500, date: today }, true), null);
});

test('a payment made after the balances were typed in: raising it and moving it to another account moves the money', () => {
  const m = model(daysAgo(5), Date.now() - 5 * 86400000);
  assert.equal(bal(m, 'mb'), 9500);
  const e = editLoanPayment(m, 'o', 'p', { amount: 800, date: daysAgo(1), pm: BPI });
  assert.equal(bal(e, 'mb'), 10000);
  assert.equal(bal(e, 'bpi'), 19200);
  assert.equal(e.loans[0].actualPayments[0].actual, 800);
});

test('a payment already inside the typed-in balance: the typed-in balances are corrected', () => {
  const m = model(today, Date.now()); // balances typed in today, after the payment
  assert.equal(bal(m, 'mb'), 10000);
  const e = editLoanPayment(m, 'o', 'p', { amount: 800, date: daysAgo(1), pm: BPI });
  assert.equal(bal(e, 'mb'), 10500); // the 500 goes back to Maribank
  assert.equal(bal(e, 'bpi'), 19200); // 800 comes off BPI
});

test('it never lowers the amount, even if asked to; a receipt can be added or removed', () => {
  const m = model(daysAgo(5), Date.now() - 5 * 86400000);
  const e = editLoanPayment(m, 'o', 'p', { amount: 100, date: daysAgo(1), pm: MB, receipt: 'data:image/jpeg;base64,R' });
  assert.equal(e.loans[0].actualPayments[0].actual, 500);
  assert.equal(e.loans[0].actualPayments[0].receiptPhoto, 'data:image/jpeg;base64,R');
  const e2 = editLoanPayment(e, 'o', 'p', { amount: 500, date: daysAgo(1), pm: MB, receipt: null });
  assert.equal(e2.loans[0].actualPayments[0].receiptPhoto, undefined);
});

test('a debt round paid in part (rest carried over) keeps its amount; date and account still change', () => {
  const m = model(daysAgo(5), Date.now() - 5 * 86400000);
  m.debts = [{ id: 'd', creditorOrPerson: 'BillEase', category: '', recurringType: 'monthly', dueDate: { day: '6' }, notes: '', owner: 'shared',
    cycles: [{ id: 'c', dueDate: daysAgo(3), amountDue: 600, amountPaid: 600, paidDate: daysAgo(2), notes: '', paymentMethod: MB, paidAt: Date.now() - 2 * 86400000, dueBefore: 1200 }] }];
  assert.ok(cycleAmountLocked(m.debts[0].cycles[0]));
  const e = editCyclePayment(m, 'debt', 'd', 'c', { amount: 900, date: daysAgo(1), pm: BPI });
  assert.equal(e.debts[0].cycles[0].amountPaid, 600);
  assert.equal(e.debts[0].cycles[0].paymentMethod.accountId, 'bpi');
  assert.equal(e.debts[0].cycles[0].paidDate, daysAgo(1));
});
