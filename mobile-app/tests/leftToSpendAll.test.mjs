// H-52 (Cath, 2026-10-29): "Left to spend only accounts bills. It should take into account all
// amounts that had been entered, be it in bills, debts, loans, plans, as long as the date falls
// before the next pay date." Her answers: past due unpaid comes off; debts with no due date
// don't; plans: groceries list, trips and events before payday, savings plans, anything else.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leftToSpendLines as leftToSpendExtras } from '../src/leftToSpendExtras.ts';
import { defaultModel } from '../src/defaultModel.ts';

const today = new Date(2026, 9, 29); // Thu Oct 29 2026
const target = new Date(2026, 10, 14); // the day before payday (Nov 15)
const sum = (lines) => Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100;
const line = (lines, label) => lines.find((l) => l.label === label)?.amount ?? 0;

function base(asOf = '2026-10-27') {
  const m = defaultModel();
  m.balanceAccounts = { ...m.balanceAccounts, asOfDate: asOf, cash: [{ id: 'c', name: 'Cash', amount: 50000 }] };
  return m;
}

test('Olive (Custom, 14 paid, Oct 16 unpaid, balances updated Oct 27): Oct 16 is past due and comes off', () => {
  const m = base();
  const pays = Array.from({ length: 14 }, (_, i) => { const d = new Date(2025, 7 + i, 16); return { id: 'p' + i, date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-16`, actual: 24550 }; });
  m.loans = [{ id: 'o', name: 'Olive', totalAmount: 1200000, expectedPayment: 24550, direction: 'borrowed', owner: 'shared', recurringType: 'custom', customFreq: 'monthly', customStartDate: '2025-08-16', dueDate: {}, actualPayments: pays }];
  const lines = leftToSpendExtras(m, today, target);
  assert.equal(line(lines, 'Past due'), -24550);
});

test('a bill past due before the balances were updated comes off; a no-date debt does not', () => {
  const m = base();
  m.bills = [{ id: 'b', name: 'Meralco', category: '', recurringType: 'monthly', dueDate: { day: '20' }, priority: '', owner: '', notes: '', cycles: [{ id: 'c1', dueDate: '2026-10-20', amountDue: 2350.45, amountPaid: '', paidDate: '', notes: '' }] }];
  m.debts = [{ id: 'd', creditorOrPerson: 'Kuya Ben', category: '', recurringType: 'onetime', dueDate: {}, notes: '', owner: 'shared', cycles: [{ id: 'c2', dueDate: '', amountDue: 3000, amountPaid: '', paidDate: '', notes: '' }] }];
  const lines = leftToSpendExtras(m, today, target);
  assert.equal(line(lines, 'Past due'), -2350.45);
  assert.equal(sum(lines), -2350.45);
});

test('past due comes off once, whenever the balances were last typed in; paid rounds do not', () => {
  const m = base('2026-10-01');
  m.bills = [{ id: 'b', name: 'Meralco', category: '', recurringType: 'monthly', dueDate: { day: '20' }, priority: '', owner: '', notes: '', cycles: [
    { id: 'c0', dueDate: '2026-09-20', amountDue: 2000, amountPaid: 2000, paidDate: '2026-09-20', notes: '' },
    { id: 'c1', dueDate: '2026-10-20', amountDue: 2350.45, amountPaid: '', paidDate: '', notes: '' }] }];
  assert.equal(line(leftToSpendExtras(m, today, target), 'Past due'), -2350.45);
});

test('plans: grocery list, a trip and an event before payday (less what is already saved in their pots)', () => {
  const m = base();
  m.groceries = [{ id: 'g1', item: 'Rice', plannedAmount: 300, actualAmount: '', purchased: false }, { id: 'g2', item: 'Eggs', plannedAmount: 120, actualAmount: 120, purchased: true }];
  m.travel = [
    { id: 't1', name: 'Cebu', startDate: '2026-11-06', endDate: '2026-11-09', checklist: [{ id: 'i1', title: 'Hotel', cost: 6000, checked: false }, { id: 'i2', title: 'Flights', cost: 8000, checked: true }], todos: [], savingsGoalId: 'pot1' },
    { id: 't2', name: 'Later', startDate: '2026-12-20', endDate: '2026-12-22', checklist: [{ id: 'i3', title: 'Bus', cost: 900, checked: false }], todos: [] },
  ];
  m.events = [
    { id: 'e1', name: "Mama's birthday", type: 'birthday', recurrence: 'annual', month: 11, day: 8, budget: 3000, completed: false },
    { id: 'e2', name: 'Christmas', type: 'other', recurrence: 'annual', month: 12, day: 25, budget: 10000, completed: false },
  ];
  m.savingsGoals = [{ id: 'pot1', name: 'Travel: Cebu', targetAmount: 14000, targetDate: '', currentAmount: 2000, contributions: [{ id: 'k', date: '2026-10-01', amount: 2000 }] }];
  const lines = leftToSpendExtras(m, today, target);
  assert.equal(line(lines, 'Groceries list'), -300);
  assert.equal(line(lines, 'Trips'), -4000); // Hotel 6,000 not paid, less 2,000 already in its pot
  assert.equal(line(lines, 'Events'), -3000);
});

test('a loan payment paid ahead is not taken off again', () => {
  const m = base('2026-10-27');
  m.loans = [{ id: 'l', name: 'Pag-IBIG', totalAmount: 60000, expectedPayment: 5000, direction: 'borrowed', owner: 'shared', recurringType: 'monthly', dueDate: { day: '5', firstDate: '2026-10-05' },
    actualPayments: [{ id: 'a', date: '2026-10-05', actual: 5000 }, { id: 'b', date: '2026-10-26', actual: 5000 }] }];
  // Nov 5 is already paid (Oct 26): nothing more to pay before payday.
  assert.equal(line(leftToSpendExtras(m, today, target), 'Loans'), 0);
  assert.equal(line(leftToSpendExtras(m, today, target), 'Past due'), 0);
});

test('nothing extra: no lines', () => {
  assert.deepEqual(leftToSpendExtras(base(), today, target), []);
});

import { computeLeftToSpend, leftToSpendBreakdown } from '../src/balanceProjection.ts';
test('H-52: Left to Spend itself goes down by the plans, and "Where it comes from" lists them and adds up', () => {
  const m = base(iso(new Date()));
  const before = computeLeftToSpend(m).amount;
  const withList = { ...m, groceries: [{ id: 'g1', item: 'Rice', plannedAmount: 300, actualAmount: '', purchased: false }] };
  const r = computeLeftToSpend(withList);
  assert.equal(Math.round((r.amount - before) * 100) / 100, -300);
  const b = leftToSpendBreakdown(withList, r);
  assert.equal(b.lines.find((l) => l.label === 'Groceries list')?.amount, -300);
  const total = Math.round((b.now + b.lines.reduce((s, l) => s + l.amount, 0)) * 100) / 100;
  assert.equal(total, r.amount);
});
function iso(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

import { leftToSpendAmount } from '../src/leftToSpendExtras.ts';
test('H-52: payments logged since the balances were typed in are counted once (accounts now), never again', () => {
  const m = base('2026-10-01');
  m.balanceAccounts.cash = [{ id: 'c', name: 'Cash', amount: 50000 }];
  m.loans = [{ id: 'l', name: 'Pag-IBIG', totalAmount: 60000, expectedPayment: 5000, direction: 'borrowed', owner: 'shared', recurringType: 'monthly', dueDate: { day: '5', firstDate: '2026-10-05' },
    actualPayments: [{ id: 'a', date: '2026-10-05', actual: 5000, paymentMethod: { type: 'cash', accountId: 'c' } }, { id: 'b', date: '2026-10-26', actual: 5000, paymentMethod: { type: 'cash', accountId: 'c' } }] }];
  const r = leftToSpendAmount(m, new Date(), new Date(Date.now() + 5 * 86400000));
  assert.equal(r.now, 40000); // both payments already left Cash
  assert.equal(r.amount, 40000 + r.lines.reduce((s, l) => s + l.amount, 0));
  assert.ok(!r.lines.some((l) => l.label === 'Other changes'));
});
