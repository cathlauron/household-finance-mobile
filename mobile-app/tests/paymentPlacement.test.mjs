// Version 3 (canvas M4): a payment made before the due date was moved.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paymentToPlace, placePayment, currentCycle, markPaid, isCyclePaid } from '../src/billPayments.ts';

// Cath's case: a monthly bill with no due date, paid Oct 19, then the due date set to Sep 15.
function cathsBill() {
  return {
    id: 'b', name: 'Meralco', category: '', recurringType: 'monthly', dueDate: { day: '15' }, priority: 'normal', owner: 'shared', notes: '',
    cycles: [
      { id: 'c1', dueDate: '', amountDue: 1250, amountPaid: 1250, paidDate: '2026-10-19', notes: '' },
      { id: 'c2', dueDate: '2026-09-15', amountDue: 1250, amountPaid: '', paidDate: '', notes: '' }, // what the edit makes today
    ],
  };
}

test('asks: September (the new date) or October (the month it was paid)', () => {
  const p = paymentToPlace(cathsBill(), '2026-09-15');
  assert.equal(p.cycleId, 'c1');
  assert.equal(p.newDue, '2026-09-15');
  assert.equal(p.other, '2026-10-15');
});

test('September bill: the payment covers Sep 15 and October is next', () => {
  const b = cathsBill();
  const after = placePayment(b, paymentToPlace(b, '2026-09-15'), '2026-09-15');
  assert.equal(after.cycles.find((c) => c.id === 'c1').dueDate, '2026-09-15');
  assert.equal(currentCycle(after).dueDate, '2026-10-15');
  assert.equal(after.cycles.length, 2);
});

test("This month's bill: October is paid, September stays unpaid; paying September skips to November", () => {
  const b = cathsBill();
  let after = placePayment(b, paymentToPlace(b, '2026-09-15'), '2026-10-15');
  assert.equal(after.cycles.find((c) => c.id === 'c1').dueDate, '2026-10-15');
  assert.equal(currentCycle(after).dueDate, '2026-09-15');
  after = markPaid(after, undefined, '2026-10-20');
  assert.ok(isCyclePaid(after.cycles.find((c) => c.id === 'c2')));
  assert.equal(currentCycle(after).dueDate, '2026-11-15'); // not October again
});

test('paid in the same month as the new date: no question, it just covers it', () => {
  const b = cathsBill();
  b.cycles[1].dueDate = '2026-10-15';
  const p = paymentToPlace(b, '2026-10-15');
  assert.equal(p.other, null);
  const after = placePayment(b, p, p.newDue);
  assert.equal(currentCycle(after).dueDate, '2026-11-15');
});

test('no question when the new date is after the payment, or nothing was paid', () => {
  const b = cathsBill();
  assert.equal(paymentToPlace(b, '2026-11-15'), null);
  const unpaid = { ...b, cycles: [b.cycles[1]] };
  assert.equal(paymentToPlace(unpaid, '2026-09-15'), null);
});

test('no question when that bill is already paid', () => {
  const b = cathsBill();
  b.cycles[0].dueDate = '2026-09-15';
  assert.equal(paymentToPlace(b, '2026-09-15'), null);
});

test('one-time bill paid, then given a date (earlier or later): it stays paid, nothing new to pay', () => {
  for (const date of ['2026-09-15', '2026-12-01']) {
    const b = {
      id: 'o', name: 'Repair', category: '', recurringType: 'onetime', dueDate: { date }, priority: 'normal', owner: 'shared', notes: '',
      cycles: [
        { id: 'c1', dueDate: '', amountDue: 900, amountPaid: 900, paidDate: '2026-10-19', notes: '' },
        { id: 'c2', dueDate: date, amountDue: 900, amountPaid: '', paidDate: '', notes: '' }, // what the edit adds today
      ],
    };
    const p = paymentToPlace(b, date);
    assert.equal(p.other, null);
    const after = placePayment(b, p, p.newDue);
    assert.equal(after.cycles.length, 1);
    assert.equal(after.cycles[0].dueDate, date);
    assert.ok(isCyclePaid(currentCycle(after)));
  }
});
