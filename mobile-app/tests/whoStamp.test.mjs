// Version 2.2 (W1/W2 everywhere): who added / changed entries in a shared household.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stampHouseholdWho, stampList, stampCycles } from '../src/whoStamp.ts';
import { defaultModel } from '../src/defaultModel.ts';

const bill = (id, extra = {}) => ({ id, name: 'Rent', category: 'Housing', recurringType: 'monthly', dueDate: {}, priority: '', owner: '', notes: '', cycles: [], ...extra });

test('a new bill remembers who added it and when', () => {
  const prev = defaultModel();
  const next = { ...prev, bills: [bill('b1')] };
  const out = stampHouseholdWho(next, prev, 1000, 'ana');
  assert.equal(out.bills[0].addedBy, 'ana');
  assert.equal(out.bills[0].createdAt, 1000);
  assert.equal(out.bills[0].changedBy, undefined);
});

test('editing a bill says who changed it; paying it does not count as an edit', () => {
  const prev = { ...defaultModel(), bills: [bill('b1', { addedBy: 'ana', cycles: [{ id: 'c1', dueDate: '2026-10-01', amountDue: 100, amountPaid: '', paidDate: '', notes: '' }] })] };
  const paid = { ...prev, bills: [{ ...prev.bills[0], cycles: [{ ...prev.bills[0].cycles[0], amountPaid: 100, paidDate: '2026-10-01' }] }] };
  const out = stampHouseholdWho(paid, prev, 2000, 'ben');
  assert.equal(out.bills[0].changedBy, undefined);
  assert.equal(out.bills[0].cycles[0].paidBy, 'ben');
  const renamed = { ...prev, bills: [{ ...prev.bills[0], name: 'House rent' }] };
  const out2 = stampHouseholdWho(renamed, prev, 3000, 'ben');
  assert.equal(out2.bills[0].changedBy, 'ben');
  assert.equal(out2.bills[0].changedAt, 3000);
  assert.equal(out2.bills[0].addedBy, 'ana');
});

test('unpaying a cycle clears who paid it', () => {
  const before = [{ id: 'c1', paidDate: '2026-10-01', amountPaid: 100, paidBy: 'ben' }];
  const after = [{ id: 'c1', paidDate: '', amountPaid: '', paidBy: 'ben' }];
  assert.equal(stampCycles(after, before, 'ana')[0].paidBy, undefined);
});

test('cycles paid before 2.2 are not credited to whoever saves next', () => {
  const before = [{ id: 'c1', paidDate: '2026-09-01', amountPaid: 100 }];
  assert.equal(stampCycles(before, before, 'ana'), before);
});

test('a loan payment remembers who logged it; the loan is not marked changed', () => {
  const loan = { id: 'l1', name: 'Car', loanType: 'Car', totalAmount: 1000, expectedPayment: 100, actualPayments: [], owner: '', direction: 'borrowed' };
  const prev = { ...defaultModel(), loans: [loan] };
  const next = { ...prev, loans: [{ ...loan, actualPayments: [{ id: 'p1', date: '2026-10-20', actual: 100 }] }] };
  const out = stampHouseholdWho(next, prev, 5000, 'ben');
  assert.equal(out.loans[0].actualPayments[0].addedBy, 'ben');
  assert.equal(out.loans[0].changedBy, undefined);
});

test('savings moves and paydays and trip items are stamped too', () => {
  const prev = { ...defaultModel(),
    savingsGoals: [{ id: 'g1', name: 'Pot', targetAmount: 1000, targetDate: '', currentAmount: 0, contributions: [] }],
    income: [{ id: 'i1', personId: '', category: 'Salary', sourceName: 'Job', expectedAmount: 100, frequency: 'monthly', payDates: [], paymentLog: [] }],
    travel: [{ id: 't1', name: 'Thailand', startDate: '', endDate: '', checklist: [] }] };
  const next = { ...prev,
    savingsGoals: [{ ...prev.savingsGoals[0], currentAmount: 50, contributions: [{ id: 'x1', date: '2026-10-20', amount: 50 }] }],
    income: [{ ...prev.income[0], paymentLog: [{ id: 'pd1', date: '2026-10-20', amount: 100 }] }],
    travel: [{ ...prev.travel[0], budget: 200, checklist: [{ id: 'ti1', title: 'Hotel', cost: 200, checked: false }] }] };
  const out = stampHouseholdWho(next, prev, 6000, 'ana');
  assert.equal(out.savingsGoals[0].contributions[0].addedBy, 'ana');
  assert.equal(out.savingsGoals[0].changedBy, undefined);
  assert.equal(out.income[0].paymentLog[0].addedBy, 'ana');
  assert.equal(out.income[0].changedBy, undefined);
  assert.equal(out.travel[0].checklist[0].addedBy, 'ana');
  assert.equal(out.travel[0].changedBy, undefined);
});

test('nothing changed: the same lists come back untouched', () => {
  const prev = { ...defaultModel(), bills: [bill('b1', { addedBy: 'ana', createdAt: 1 })] };
  const same = { ...prev };
  const out = stampHouseholdWho(same, prev, 7000, 'ben');
  assert.equal(out.bills, prev.bills);
});

test('no earlier data: nothing is stamped', () => {
  const m = { ...defaultModel(), bills: [bill('b1')] };
  assert.equal(stampHouseholdWho(m, null, 1, 'ana'), m);
});

test('guest (no name): only the time is stamped', () => {
  const out = stampList([{ id: 'a' }], [], 9, null);
  assert.equal(out[0].createdAt, 9);
  assert.equal(out[0].addedBy, undefined);
});
