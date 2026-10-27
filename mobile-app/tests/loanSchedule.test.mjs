// Version 3: missed loan payments and "Which payment was this?" (canvas M4c).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loanScheduledDates, loanCoverage, loanPaymentToPlace, placeLoanPayment } from '../src/loanSchedule.ts';

function loan(first, payments = [], extra = {}) {
  return {
    id: 'l', name: 'Pag-IBIG', loanType: '', totalAmount: 60000, expectedPayment: 5000, owner: 'shared', direction: 'borrowed',
    recurringType: 'monthly', dueDate: { day: '5', firstDate: first }, actualPayments: payments, ...extra,
  };
}
const pay = (id, date, forDate) => ({ id, date, actual: 5000, ...(forDate ? { forDate } : {}) });

test('scheduled dates from the first payment, monthly, up to the number of payments', () => {
  assert.deepEqual(loanScheduledDates(loan('2026-08-05'), '2026-10-31'), ['2026-08-05', '2026-09-05', '2026-10-05']);
  assert.equal(loanScheduledDates(loan('2026-01-05'), '2030-01-01').length, 12); // ₱60,000 ÷ ₱5,000
  assert.deepEqual(loanScheduledDates(loan('2026-01-31', [], { dueDate: { day: '31', firstDate: '2026-01-31' } }), '2026-03-31'), ['2026-01-31', '2026-02-28', '2026-03-31']);
});

test('older loans without a First payment date are not tracked', () => {
  const l = loan('2026-08-05');
  delete l.dueDate.firstDate;
  assert.deepEqual(loanCoverage(l, '2026-10-19'), { covered: {}, missed: [], nextOpen: null, paidTowardNext: 0, leftForNext: 0 });
});

test('missed: scheduled dates before today with no payment; payments cover the oldest first', () => {
  const l = loan('2026-08-05', [pay('p1', '2026-10-05')]);
  const c = loanCoverage(l, '2026-10-19');
  assert.equal(c.covered['2026-08-05'], 'p1');
  assert.deepEqual(c.missed, ['2026-09-05', '2026-10-05']);
  assert.equal(c.nextOpen, '2026-09-05');
});

test('a payment logged for a date covers that date', () => {
  const l = loan('2026-09-05', [pay('p1', '2026-10-05', '2026-10-05')]);
  assert.deepEqual(loanCoverage(l, '2026-10-19').missed, ['2026-09-05']);
});

test('Which payment was this: September (new first date) or October (month it was paid)', () => {
  const l = loan('2026-09-05', [pay('p1', '2026-10-05')]);
  const p = loanPaymentToPlace(l, '2026-09-05');
  assert.equal(p.other, '2026-10-05');
  const sep = placeLoanPayment(l, p, '2026-09-05');
  assert.deepEqual(loanCoverage(sep, '2026-10-19').missed, ['2026-10-05']);
  const oct = placeLoanPayment(l, p, '2026-10-05');
  assert.deepEqual(loanCoverage(oct, '2026-10-19').missed, ['2026-09-05']);
});

test('no question when the first date is after the payment, or in the same month', () => {
  assert.equal(loanPaymentToPlace(loan('2026-11-05', [pay('p1', '2026-10-05')]), '2026-11-05'), null);
  assert.equal(loanPaymentToPlace(loan('2026-10-05', [pay('p1', '2026-10-20')]), '2026-10-05'), null);
});

// Cath, 2026-10-27 (2.2 build): payments every 16th; after logging Sept 16, the loan said
// "next Nov 16" (and showed an amount past due) instead of Oct 16. The next payment is the
// oldest one not paid yet.
test('next payment = the oldest unpaid date (Oct 16 after paying up to Sept 16)', async () => {
  const { loanNextDueDate } = await import('../src/loanSchedule.ts');
  const l = loan('2026-06-16', [pay('a', '2026-06-16'), pay('b', '2026-07-16'), pay('c', '2026-08-16'), pay('d', '2026-09-16')], { dueDate: { day: '16', firstDate: '2026-06-16' } });
  const next = loanNextDueDate(l, new Date('2026-10-27T10:00:00'));
  assert.equal(next && next.toISOString().slice(0, 10) !== undefined && `${next.getFullYear()}-${next.getMonth() + 1}-${next.getDate()}`, '2026-10-16');
  // Paid ahead through October: next is Nov 16.
  const ahead = loan('2026-06-16', ['06', '07', '08', '09', '10'].map((m, i) => pay(`p${i}`, `2026-${m}-16`)), { dueDate: { day: '16', firstDate: '2026-06-16' } });
  const n2 = loanNextDueDate(ahead, new Date('2026-10-27T10:00:00'));
  assert.equal(`${n2.getFullYear()}-${n2.getMonth() + 1}-${n2.getDate()}`, '2026-11-16');
  // Older loans without a First payment date: the plain next date, as before.
  const old = { ...loan('2026-06-16'), dueDate: { day: '16' } };
  const n3 = loanNextDueDate(old, new Date('2026-10-27T10:00:00'));
  assert.equal(`${n3.getFullYear()}-${n3.getMonth() + 1}-${n3.getDate()}`, '2026-11-16');
});

// Cath, 2026-10-27 (phone, "Miduri"): no First payment date set, payments every 16th up to
// Sept 16, today Oct 27: it said "next Nov 16" and nothing past due.
test('a loan with payments but no First payment date: Oct 16 is next, and past due', async () => {
  const { loanNextDueDate, loanFirstDate } = await import('../src/loanSchedule.ts');
  const months = ['2026-06-16', '2026-07-16', '2026-08-16', '2026-09-16'];
  const l = { ...loan('x'), totalAmount: 200001, expectedPayment: 7000, dueDate: { day: '16' }, actualPayments: months.map((d, i) => ({ id: `p${i}`, date: d, actual: 7000 })) };
  assert.equal(loanFirstDate(l), '2026-06-16');
  const n = loanNextDueDate(l, new Date('2026-10-27T10:00:00'));
  assert.equal(`${n.getFullYear()}-${n.getMonth() + 1}-${n.getDate()}`, '2026-10-16');
  assert.deepEqual(loanCoverage(l, '2026-10-27').missed, ['2026-10-16']);
  // Paid a couple of days early for the first one: still starts at that month's 16th.
  const early = { ...l, actualPayments: [{ id: 'e', date: '2026-06-14', actual: 7000 }] };
  assert.equal(loanFirstDate(early), '2026-06-16');
});

// Cath, 2026-10-27: "warn and count what I've actually paid in total".
test('smaller payments add up: two halves pay one month; one half leaves it open', () => {
  const half = (id, date, forDate) => ({ id, date, actual: 2500, ...(forDate ? { forDate } : {}) });
  const one = loan('2026-09-05', [half('a', '2026-09-05', '2026-09-05')]);
  const c1 = loanCoverage(one, '2026-10-19');
  assert.equal(c1.nextOpen, '2026-09-05');
  assert.equal(c1.paidTowardNext, 2500);
  assert.equal(c1.leftForNext, 2500);
  assert.deepEqual(c1.missed, ['2026-09-05', '2026-10-05']);
  const two = loan('2026-09-05', [half('a', '2026-09-05', '2026-09-05'), half('b', '2026-09-20', '2026-09-05')]);
  assert.deepEqual(loanCoverage(two, '2026-10-19').missed, ['2026-10-05']);
  // A double payment covers the next one too.
  const dbl = loan('2026-09-05', [{ id: 'd', date: '2026-09-05', actual: 10000, forDate: '2026-09-05' }]);
  assert.deepEqual(loanCoverage(dbl, '2026-10-19').missed, []);
  assert.equal(loanCoverage(dbl, '2026-10-19').nextOpen, '2026-11-05');
});
