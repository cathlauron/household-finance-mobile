// H-40 + H-41 (Cath, 2026-10-29, picked A2): Debts shows what's already paid like Bills, a
// "still to pay this month" total, and a separate total for debts with no due date.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { debtSections } from '../src/debtSections.ts';

const today = new Date(2026, 9, 29); // Oct 29 2026
const cyc = (id, due, amt, paid = '') => ({ id, dueDate: due, amountDue: amt, amountPaid: paid ? amt : '', paidDate: paid, notes: '' });
const debt = (id, name, cycles, extra = {}) => ({ id, creditorOrPerson: name, category: '', recurringType: 'monthly', dueDate: { day: '6' }, cycles, notes: '', owner: 'shared', ...extra });

function model() {
  return {
    debts: [
      debt('d1', 'Tita Lorna', [cyc('c1', '2026-10-26', 5000)], { recurringType: 'onetime', dueDate: { date: '2026-10-26' } }),
      debt('d2', 'BillEase', [cyc('c2', '2026-10-31', 1200)]),
      debt('d3', 'Home Credit', [cyc('c3', '2026-11-16', 2450)], { dueDate: { day: '16' } }),
      debt('d4', 'Kuya Ben', [cyc('c4', '', 3000)], { recurringType: 'onetime', dueDate: {} }),
      debt('d5', 'Atome', [cyc('c5', '2026-10-12', 1850, '2026-10-12'), cyc('c6', '2026-11-12', 1850)], { dueDate: { day: '12' } }),
    ],
  };
}

test('A2: sections like Bills, a paid-this-month list, and the two totals', () => {
  const r = debtSections(model(), today, new Set(['d1']));
  const ids = Object.fromEntries(r.sections.map((s) => [s.title, s.items.map((d) => d.id)]));
  assert.deepEqual(ids['Overdue'], ['d1']);
  assert.deepEqual(ids['This week'], ['d2']);
  assert.deepEqual(ids['Coming up'], ['d5', 'd3']);
  assert.deepEqual(ids['No due date'], ['d4']);
  assert.deepEqual(r.paidThisMonth.map((d) => d.id), ['d5']);
  assert.equal(r.stillToPay, 6200); // Tita Lorna (overdue) + BillEase (Oct 31)
  assert.equal(r.noDateTotal, 3000);
  assert.equal(r.paidCount, 1);
  assert.equal(r.dueCount, 3); // paid this month + still due this month
});
