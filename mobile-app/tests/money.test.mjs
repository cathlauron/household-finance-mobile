// Version 2.1: automatic money checks. They re-check the app's money maths every time the
// code changes (npm test), so a mistake in due dates, payments, balances or Left to Spend
// is caught before it reaches a phone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getNextDueDate, lastDayOfMonth } from '../src/recurrence.ts';
import { markPaid, undoLastPayment, currentCycle } from '../src/billPayments.ts';
import {
  accountCurrentBalance,
  totalCurrentBalance,
  outstandingBalance,
  loanOutstandingBalance,
  computeLeftToSpend,
} from '../src/balanceProjection.ts';
import { equalShares, myNet } from '../src/sharedExpenses.ts';
import { defaultModel } from '../src/defaultModel.ts';

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysFrom = (n) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d; };

// ---- Due dates ----
test('monthly bill on the 31st falls on the last day of shorter months', () => {
  assert.equal(iso(getNextDueDate('monthly', { day: '31' }, new Date(2026, 1, 3))), '2026-02-28');
  assert.equal(iso(getNextDueDate('monthly', { day: '31' }, new Date(2028, 1, 3))), '2028-02-29'); // leap year
  assert.equal(iso(getNextDueDate('monthly', { day: '31' }, new Date(2026, 3, 1))), '2026-04-30');
});
test('monthly bill already past this month moves to next month (and next year in December)', () => {
  assert.equal(iso(getNextDueDate('monthly', { day: '15' }, new Date(2026, 9, 18))), '2026-11-15');
  assert.equal(iso(getNextDueDate('monthly', { day: '5' }, new Date(2026, 11, 20))), '2027-01-05');
});
test('due today counts as today, not next month', () => {
  assert.equal(iso(getNextDueDate('monthly', { day: '18' }, new Date(2026, 9, 18, 15))), '2026-10-18');
});
test('"last" day of month and yearly bills', () => {
  assert.equal(iso(getNextDueDate('monthly', { day: 'last' }, new Date(2026, 8, 2))), '2026-09-30');
  assert.equal(iso(getNextDueDate('annual', { day: '29', month: 2 }, new Date(2026, 5, 1))), '2027-02-28');
  assert.equal(lastDayOfMonth(2024, 1), 29);
});
test('a bill without a day has no due date (instead of a wrong one)', () => {
  assert.equal(getNextDueDate('monthly', { day: '' }, new Date(2026, 9, 18)), null);
  assert.equal(getNextDueDate('onetime', {}, new Date(2026, 9, 18)), null);
});

// ---- Paying bills and debts ----
const bill = () => ({ id: 'b1', name: 'Meralco', recurringType: 'monthly', dueDate: { day: '15' }, cycles: [{ id: 'c1', dueDate: '2026-10-15', amountDue: 3100, amountPaid: '', paidDate: '', notes: '' }] });
test('paying a monthly bill in full queues next month at the same amount', () => {
  const b = markPaid(bill(), undefined, '2026-10-14');
  assert.equal(b.cycles[0].amountPaid, 3100);
  assert.equal(b.cycles[0].paidDate, '2026-10-14');
  const next = currentCycle(b);
  assert.equal(next.dueDate, '2026-11-15');
  assert.equal(next.amountDue, 3100);
  assert.equal(outstandingBalance(b), 3100); // only next month's bill is still owed
});
test('paying the same bill twice does nothing the second time', () => {
  const once = markPaid(bill(), undefined, '2026-10-14');
  const cur = currentCycle(once);
  // the next cycle is unpaid, so a second markPaid pays November, not October again
  const twice = markPaid(once, undefined, '2026-10-14');
  assert.equal(twice.cycles.filter((c) => c.amountPaid === 3100).length, 2);
  assert.equal(cur.dueDate, '2026-11-15');
});
test('debt paid below the minimum carries the shortfall to the next amount due', () => {
  const debt = { id: 'd1', name: 'Card', minPayment: 1000, recurringType: 'monthly', dueDate: { day: '20' }, cycles: [{ id: 'c1', dueDate: '2026-10-20', amountDue: 5000, amountPaid: '', paidDate: '', notes: '' }] };
  const d = markPaid(debt, undefined, '2026-10-19', 600, 100);
  const next = currentCycle(d);
  assert.equal(next.dueDate, '2026-11-20');
  assert.equal(next.carriedIn, 500); // 400 short of the minimum + 100 late fee
  assert.equal(next.amountDue, 5500);
});
test('one-time debt paid in part keeps the rest owed on the same date', () => {
  const debt = { id: 'd2', name: 'Ate Fely', recurringType: 'onetime', dueDate: { date: '2026-10-30' }, cycles: [{ id: 'c1', dueDate: '2026-10-30', amountDue: 2000, amountPaid: '', paidDate: '', notes: '' }] };
  const d = markPaid(debt, undefined, '2026-10-18', 500);
  const next = currentCycle(d);
  assert.equal(next.dueDate, '2026-10-30');
  assert.equal(next.amountDue, 1500);
});
test('undo puts the bill back exactly as it was', () => {
  const before = bill();
  const after = undoLastPayment(markPaid(before, undefined, '2026-10-14'));
  assert.equal(after.cycles.length, 1);
  assert.equal(after.cycles[0].amountPaid, '');
  assert.equal(after.cycles[0].amountDue, 3100);
});

// ---- Account balances ----
function modelWithDebit(amount, asOfDaysAgo) {
  const m = defaultModel();
  m.balanceAccounts = { ...m.balanceAccounts, asOfDate: iso(daysFrom(-asOfDaysAgo)), asOfAt: daysFrom(-asOfDaysAgo).getTime(), cash: [], credit: [], debit: [{ id: 'a1', name: 'GCash', amount }] };
  return m;
}
const pm = { type: 'debit', accountId: 'a1' };
test('spending after the last balance update lowers the balance', () => {
  const m = modelWithDebit(10000, 3);
  m.manualTransactions = [{ id: 't1', date: iso(daysFrom(-1)), label: 'Groceries', amount: 1240, direction: 'out', paymentMethod: pm, createdAt: Date.now() }];
  assert.equal(accountCurrentBalance(m, 'debit', m.balanceAccounts.debit[0]), 8760);
});
test('spending dated before the last update is already in the balance', () => {
  const m = modelWithDebit(10000, 3);
  m.manualTransactions = [{ id: 't1', date: iso(daysFrom(-10)), label: 'Old', amount: 500, direction: 'out', paymentMethod: pm, createdAt: Date.now() }];
  assert.equal(accountCurrentBalance(m, 'debit', m.balanceAccounts.debit[0]), 10000);
});
test('future-dated spending does not count yet', () => {
  const m = modelWithDebit(10000, 3);
  m.manualTransactions = [{ id: 't1', date: iso(daysFrom(5)), label: 'Later', amount: 500, direction: 'out', paymentMethod: pm, createdAt: Date.now() }];
  assert.equal(totalCurrentBalance(m), 10000);
});
test('money in, a paid bill and a logged payday all count', () => {
  const m = modelWithDebit(10000, 3);
  const y = iso(daysFrom(-1));
  m.manualTransactions = [{ id: 't1', date: y, label: 'Refund', amount: 300, direction: 'in', paymentMethod: pm, createdAt: Date.now() }];
  m.bills = [{ ...bill(), cycles: [{ id: 'c1', dueDate: y, amountDue: 3100, amountPaid: 3100, paidDate: y, paidAt: Date.now(), notes: '', paymentMethod: pm }] }];
  m.income = [{ id: 'i1', sourceName: 'Job', frequency: 'monthly', payDates: ['30'], paymentLog: [{ id: 'p1', date: y, amount: 25000, paymentMethod: pm, createdAt: Date.now() }] }];
  assert.equal(accountCurrentBalance(m, 'debit', m.balanceAccounts.debit[0]), 10000 + 300 - 3100 + 25000);
});

// ---- Loans ----
test('a loan never shows less than zero left', () => {
  assert.equal(loanOutstandingBalance({ totalAmount: 10000, actualPayments: [{ actual: 4000 }, { actual: 7000 }] }), 0);
  assert.equal(loanOutstandingBalance({ totalAmount: 10000, actualPayments: [{ actual: 2500 }] }), 7500);
});

// ---- Shared expenses ----
test('splitting equally always adds back up to the total (centavos included)', () => {
  const shares = equalShares(100, ['a', 'b', 'c']);
  assert.equal(Math.round(shares.reduce((s, x) => s + x.amount, 0) * 100), 10000);
  assert.deepEqual(shares.map((s) => s.amount), [33.34, 33.33, 33.33]);
});
test('what I am owed nets out across people', () => {
  const balances = [{ from: 'b', to: 'me', amount: 500 }, { from: 'me', to: 'c', amount: 200 }];
  assert.equal(myNet(balances, 'me'), 300);
});

// ---- Left to Spend ----
test('Left to Spend: no payday set → balance minus bills still due this month', () => {
  const today = new Date();
  const lastDay = lastDayOfMonth(today.getFullYear(), today.getMonth());
  if (today.getDate() >= lastDay - 1) return; // too close to month end to place a bill after today
  const m = modelWithDebit(10000, 3);
  const due = Math.min(lastDay, today.getDate() + 1);
  m.bills = [{ id: 'b9', name: 'Water', recurringType: 'monthly', dueDate: { day: String(due) }, cycles: [{ id: 'c1', dueDate: iso(new Date(today.getFullYear(), today.getMonth(), due)), amountDue: 800, amountPaid: '', paidDate: '', notes: '' }] }];
  const r = computeLeftToSpend(m, today);
  assert.equal(r.basis, 'endOfMonth');
  assert.equal(Math.round(r.amount), 9200);
});
test('Left to Spend with nothing set up is just what is in the accounts', () => {
  const m = modelWithDebit(4321, 1);
  assert.equal(Math.round(computeLeftToSpend(m).amount), 4321);
});

// ---- Version 2.1: paying part of a bill (Meralco) ----
test('bill paid in part: the rest is added to next month as "carried"', () => {
  const b = markPaid(bill(), undefined, '2026-10-14', 1000);
  assert.equal(b.cycles[0].amountPaid, 1000);
  const next = currentCycle(b);
  assert.equal(next.dueDate, '2026-11-15');
  assert.equal(next.carriedIn, 2100);
  assert.equal(next.amountDue, 5200); // ₱3,100 new + ₱2,100 carried
});
test('a back-dated payment keeps the date it was paid', () => {
  const b = markPaid(bill(), undefined, '2026-10-02');
  assert.equal(b.cycles[0].paidDate, '2026-10-02');
});

// ---- Version 2.1: starting a repeating bill in an earlier month ----
import { recentOccurrences } from '../src/recurrence.ts';
test('which one is due now: the past 4 months and the next due date, oldest first', () => {
  assert.deepEqual(recentOccurrences('monthly', { day: '15' }, new Date(2026, 9, 18)), ['2026-07-15', '2026-08-15', '2026-09-15', '2026-10-15', '2026-11-15']);
  assert.deepEqual(recentOccurrences('monthly', { day: '31' }, new Date(2026, 2, 5)), ['2025-11-30', '2025-12-31', '2026-01-31', '2026-02-28', '2026-03-31']);
  assert.deepEqual(recentOccurrences('annual', { day: '1', month: 3 }, new Date(2026, 9, 18)), ['2026-03-01', '2027-03-01']);
  assert.deepEqual(recentOccurrences('monthly', { day: '' }), []);
  assert.deepEqual(recentOccurrences('onetime', { date: '2026-10-01' }), []);
});
test('paying a bill that started in an earlier month moves on to the month after it', () => {
  const bill = { id: 'b', name: 'Meralco', recurringType: 'monthly', dueDate: { day: '15' }, cycles: [{ id: 'c', dueDate: '2026-08-15', amountDue: 3100, amountPaid: '', paidDate: '' }] };
  const after = markPaid(bill, undefined, '2026-10-18');
  assert.equal(after.cycles[1].dueDate, '2026-09-15');
});

// ---- Version 2.1 (round 8): a repeating loan that starts later ----
test('first payment in the future is the next one due; once it has passed the schedule takes over', () => {
  assert.equal(iso(getNextDueDate('monthly', { day: '5', firstDate: '2027-01-05' }, new Date(2026, 9, 18))), '2027-01-05');
  assert.equal(iso(getNextDueDate('monthly', { day: '5', firstDate: '2025-01-05' }, new Date(2026, 9, 18))), '2026-11-05');
  assert.equal(iso(getNextDueDate('annual', { day: '1', month: 3, firstDate: '2028-03-01' }, new Date(2026, 9, 18))), '2028-03-01');
});
