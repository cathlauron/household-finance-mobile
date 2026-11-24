import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultModel } from '../src/defaultModel.ts';
import { computeMonthEvents } from '../src/balanceProjection.ts';
import { debtSections } from '../src/debtSections.ts';
import { getOverdueItems } from '../src/overdue.ts';
import { leftToSpendItems } from '../src/leftToSpendExtras.ts';
import { debtShownAmount } from '../src/billPayments.ts';

// Cath, 2026-11-24 (mockup three-updates, part 3): a debt with "Pay at least" shows that
// minimum on its due date, with the full amount in small print, and Left to Spend counts the
// minimum ("most likely, user will pay for the minimum").
const now = new Date();
const iso = (d) => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
const day = (n) => iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + n));
function household(debtExtra = {}, cycleExtra = {}) {
  const m = defaultModel();
  m.balanceAccounts = { ...m.balanceAccounts, asOfDate: day(-30), cash: [{ id: 'c1', name: 'Cash', amount: 20000 }], debit: [], credit: [] };
  m.debts = [{ id: 'd1', creditorOrPerson: 'Tita Lorna', category: '', recurringType: 'onetime', dueDate: { date: day(2) }, notes: '', owner: 'shared', minPayment: 1000, cycles: [{ id: 'c1', dueDate: day(2), amountDue: 5000, amountPaid: '', paidDate: '', notes: '', ...cycleExtra }], ...debtExtra }];
  return m;
}
const eventsFor = (m, iso) => {
  const d = new Date(iso + 'T00:00:00');
  return (computeMonthEvents(m, d.getFullYear(), d.getMonth())[d.getDate()] || []).filter((e) => e.type === 'debt');
};

test('Minimum: the shown amount is the minimum, with the full amount beside it', () => {
  const m = household();
  assert.deepEqual(debtShownAmount(m.debts[0]), { amount: 1000, full: 5000, isMinimum: true });
  // No minimum: the full amount, as before.
  const plain = household({ minPayment: '' });
  assert.deepEqual(debtShownAmount(plain.debts[0]), { amount: 5000, full: 5000, isMinimum: false });
  // A minimum bigger than what is left: what is left.
  const small = household({ minPayment: 9000 });
  assert.deepEqual(debtShownAmount(small.debts[0]), { amount: 5000, full: 5000, isMinimum: false });
  // Unpaid minimum carried in from last time is added to it.
  const carried = household({}, { carriedIn: 300 });
  assert.equal(debtShownAmount(carried.debts[0]).amount, 1300);
});

test('Minimum: the Calendar (and so Due soon and the widget) shows the minimum on the due date', () => {
  const ev = eventsFor(household(), day(2));
  assert.equal(ev.length, 1);
  assert.equal(ev[0].amount, 1000);
  assert.equal(ev[0].full, 5000);
  const plain = eventsFor(household({ minPayment: '' }), day(2));
  assert.equal(plain[0].amount, 5000);
  assert.equal(plain[0].full, undefined);
});

test('Minimum: Debts "still to pay this month" adds up the minimums, and keeps the full total', () => {
  const s = debtSections(household(), now, new Set());
  if (new Date(day(2)).getMonth() === now.getMonth()) {
    assert.equal(s.stillToPay, 1000);
    assert.equal(s.stillToPayFull, 5000);
  }
});

test('Minimum: an overdue debt with a minimum is overdue by its minimum', () => {
  const m = household({}, { dueDate: day(-3) });
  const o = getOverdueItems(m).find((x) => x.kind === 'debt');
  assert.equal(o.amountOwed, 1000);
  assert.equal(o.fullOwed, 5000);
});

test('Minimum: Left to Spend counts the minimum, for one due soon and one past due', () => {
  const soon = leftToSpendItems(household(), now, new Date(now.getFullYear(), now.getMonth(), now.getDate() + 10)).filter((i) => i.ref?.kind === 'debt');
  assert.equal(soon.length > 0, true);
  assert.equal(Math.abs(soon.reduce((s, i) => s + i.amount, 0)), 1000);
  const late = leftToSpendItems(household({}, { dueDate: day(-3) }), now, new Date(now.getFullYear(), now.getMonth(), now.getDate() + 10)).filter((i) => i.group === 'Past due');
  assert.equal(Math.abs(late.reduce((s, i) => s + i.amount, 0)), 1000);
});
