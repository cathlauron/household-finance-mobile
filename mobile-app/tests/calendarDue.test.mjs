// Cath, 2026-10-27 (2.2 build): Oct 30 on the calendar showed 2 incomes and 1 debt, but the
// Debts page showed ANOTHER debt due Oct 30. The Debts page shows each debt's current
// round (its saved due date); the calendar only used the repeat day. Everything due on a
// day must show on that day (and in Home's Due soon, which is built from the same list).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeMonthEvents } from '../src/balanceProjection.ts';
import { defaultModel } from '../src/defaultModel.ts';

const cycle = (id, dueDate, amountDue, paid = 0) => ({ id, dueDate, amountDue, amountPaid: paid || '', paidDate: paid ? dueDate : '', notes: '' });
function debt(id, extra) {
  return { id, creditorOrPerson: id, recurringType: 'monthly', dueDate: { day: '15' }, cycles: [], ...extra };
}
const day = (evs, d) => (evs[d] || []).filter((e) => e.type === 'debt').map((e) => e.id).sort();

test('a debt whose current round is due on another day shows on THAT day', () => {
  const m = defaultModel();
  m.debts = [
    debt('Ana', { dueDate: { day: '30' }, cycles: [cycle('a1', '2026-10-30', 2000)] }),
    // Repeats on the 15th, but this round was set to be due Oct 30.
    debt('Ben', { dueDate: { day: '15' }, cycles: [cycle('b1', '2026-10-30', 1500)] }),
  ];
  const evs = computeMonthEvents(m, 2026, 9);
  assert.deepEqual(day(evs, 30), ['Ana', 'Ben']);
  // ...and not a second time on the 15th for the same month.
  assert.deepEqual(day(evs, 15), []);
});

test('in months without a saved round, the repeat day is used (as before)', () => {
  const m = defaultModel();
  m.debts = [debt('Ben', { dueDate: { day: '15' }, cycles: [cycle('b1', '2026-10-30', 1500)] })];
  assert.deepEqual(day(computeMonthEvents(m, 2026, 10), 15), ['Ben']);
});

test('a round already paid does not show again', () => {
  const m = defaultModel();
  m.debts = [debt('Ben', { dueDate: { day: '15' }, cycles: [cycle('b1', '2026-10-30', 1500, 1500)] })];
  assert.deepEqual(day(computeMonthEvents(m, 2026, 9), 30), []);
});

test('due on the 31st: shows on the last day of shorter months (like the Debts page)', () => {
  const m = defaultModel();
  m.debts = [debt('Cara', { dueDate: { day: '31' } })];
  assert.deepEqual(day(computeMonthEvents(m, 2026, 10), 30), ['Cara']); // November
  assert.deepEqual(day(computeMonthEvents(m, 2027, 1), 28), ['Cara']); // February
});

test('bills: the same rules', () => {
  const m = defaultModel();
  m.bills = [{ id: 'Rent', name: 'Rent', recurringType: 'monthly', dueDate: { day: '5' }, cycles: [cycle('r1', '2026-10-30', 9000)] }];
  const evs = computeMonthEvents(m, 2026, 9);
  assert.deepEqual((evs[30] || []).filter((e) => e.type === 'bill').map((e) => e.id), ['Rent']);
  assert.deepEqual((evs[5] || []).filter((e) => e.type === 'bill'), []);
});
