// Version 3: checks for the calm Home (Welcome back and Running low tips).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catchUpSince, tightWays, wayText, daysBetween } from '../src/calmHome.ts';
import { defaultModel } from '../src/defaultModel.ts';

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysFrom = (n) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return iso(d); };
const today = daysFrom(0);
const since = daysFrom(-6);

test('days away counts whole days', () => {
  assert.equal(daysBetween('2026-10-12', '2026-10-18'), 6);
  assert.equal(daysBetween('2026-10-31', '2026-11-03'), 3);
});

test('welcome back: good news from while you were away, nothing from before', () => {
  const m = defaultModel();
  m.income = [{ id: 's1', personId: '', category: 'Salary', sourceName: 'Salary', expectedAmount: 25000, frequency: 'onetime', payDates: [], paymentLog: [
    { id: 'p1', date: daysFrom(-2), amount: 25000 },
    { id: 'p0', date: daysFrom(-9), amount: 25000 }, // before you left: not news
  ] }];
  m.bills = [{ id: 'b1', name: 'Rent', cycles: [{ id: 'c1', dueDate: daysFrom(-1), amountDue: 8000, amountPaid: 8000, paidDate: daysFrom(-3) }] }];
  m.savingsGoals = [{ id: 'g1', name: 'Trip', targetAmount: '', targetDate: '', currentAmount: 0, contributions: [{ id: 'x', date: daysFrom(-1), amount: 2000 }] }];
  const c = catchUpSince(m, since, today);
  assert.equal(c.days, 6);
  assert.deepEqual(c.good, ['Payday came in (₱25,000)', 'Rent paid on time', '₱2,000 added to savings']);
});

test('welcome back: an unpaid bill that came due while away is listed to catch up', () => {
  const m = defaultModel();
  m.bills = [
    { id: 'b1', name: 'Meralco', cycles: [{ id: 'c1', dueDate: daysFrom(-2), amountDue: 2350, amountPaid: '' }] },
    { id: 'b2', name: 'Old', cycles: [{ id: 'c2', dueDate: daysFrom(-20), amountDue: 500, amountPaid: '' }] }, // overdue before you left
  ];
  const c = catchUpSince(m, since, today);
  assert.deepEqual(c.bills.map((b) => [b.name, b.amount]), [['Meralco', 2350]]);
  assert.equal(c.good.length, 0);
});

test('running low: frees up enough to get out of Running low, pots first, emergency last', () => {
  const m = defaultModel();
  m.savingsGoals = [
    { id: 'ef', name: 'Emergency', isEmergency: true, targetAmount: '', targetDate: '', currentAmount: 0, contributions: [{ id: 'a', date: '2026-01-01', amount: 10000 }] },
    { id: 'fun', name: 'Fun', targetAmount: '', targetDate: '', currentAmount: 0, contributions: [{ id: 'b', date: '2026-01-01', amount: 1500 }] },
  ];
  const { target, ways } = tightWays(m, 1200, 4150); // ₱2,950 short of the line -> ₱3,000
  assert.equal(target, 3000);
  assert.deepEqual(ways.map((w) => [w.id, w.amount]), [['fun', 1500], ['ef', 1500]]);
  assert.equal(wayText(ways[0]), 'Use ₱1,500 from Fun');
});

test('running low: money you lent and refunds count, and never more than 3 ways', () => {
  const m = defaultModel();
  m.loans = [{ id: 'l1', name: 'Ana', direction: 'lent', totalAmount: 2000, actualPayments: [{ id: 'p', date: '2026-01-01', actual: 500 }] }];
  m.manualTransactions = [
    { id: 't1', date: '2026-10-01', label: 'Lazada', amount: 900, direction: 'out', owner: 'shared', refundExpectedAmount: 900 },
    { id: 't2', date: '2026-10-01', label: 'Shopee', amount: 300, direction: 'out', owner: 'shared', refundExpectedAmount: 300, refundTransactionId: 'done' }, // already back
  ];
  m.savingsGoals = [{ id: 'g', name: 'Gadget', targetAmount: '', targetDate: '', currentAmount: 0, contributions: [{ id: 'c', date: '2026-01-01', amount: 400 }] }];
  const { ways } = tightWays(m, 0, 5000);
  assert.deepEqual(ways.map((w) => [w.kind, w.amount]), [['pot', 400], ['owed', 1500], ['refund', 900]]);
  assert.equal(wayText(ways[1]), 'Collect ₱1,500 you lent (Ana)');
});
