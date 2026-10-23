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
  assert.deepEqual(loanCoverage(l, '2026-10-19'), { covered: {}, missed: [], nextOpen: null });
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
