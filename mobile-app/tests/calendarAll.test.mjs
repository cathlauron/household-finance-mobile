import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withEverythingDated } from '../src/calendarAll.ts';
import { computeMonthEvents, computeRunningBalances } from '../src/balanceProjection.ts';
import { defaultModel } from '../src/defaultModel.ts';

// Cath, 2026-11-06: "for calendar, i want it to show everything that i have added a date for,
// may it be a due date or just a reminder since this will serve as my main calendar". Events
// show whether or not they are in Savings and whether or not they have an amount.
const NOV = [2026, 10];
const labels = (out, day) => (out[day] || []).map((e) => e.label);
const find = (out, day, label) => (out[day] || []).find((e) => e.label === label);

test('events show with no amount, not in Savings, once or every year', () => {
  const m = defaultModel();
  m.events = [
    { id: 'e1', name: 'Mama birthday', type: 'birthday', recurrence: 'annual', month: 11, day: 14, budget: '', completed: false },
    { id: 'e2', name: 'Reunion', type: 'other', recurrence: 'onetime', onetimeDate: '2026-11-21', budget: 5000, completed: false, trackInSavings: true },
    { id: 'e3', name: 'Dentist', type: 'other', recurrence: 'onetime', onetimeDate: '2026-11-22', budget: '', completed: true },
  ];
  const out = withEverythingDated({}, m, ...NOV);
  assert.equal(find(out, 14, 'Mama birthday').amount, 0);
  assert.equal(find(out, 14, 'Mama birthday').sub, 'Birthday');
  assert.equal(find(out, 21, 'Reunion').amount, 5000);
  assert.ok(find(out, 22, 'Dentist'), 'a finished event still shows');
  assert.ok(labels(withEverythingDated({}, m, 2030, 10), 14).includes('Mama birthday'), 'every year');
  assert.deepEqual(labels(withEverythingDated({}, m, 2030, 10), 21), [], 'a one-time event only once');
});

test('a Feb 29 birthday shows on Feb 28 in other years', () => {
  const m = defaultModel();
  m.events = [{ id: 'e', name: 'Leap', type: 'birthday', recurrence: 'annual', month: 2, day: 29, budget: '', completed: false }];
  assert.ok(labels(withEverythingDated({}, m, 2027, 1), 28).includes('Leap'));
  assert.ok(labels(withEverythingDated({}, m, 2028, 1), 29).includes('Leap'));
});

test('trips: first and last day, to-dos with a date, and items with a date with or without a cost', () => {
  const m = defaultModel();
  m.travel = [{
    id: 't', name: 'BKK', startDate: '2026-11-13', endDate: '2026-11-20',
    checklist: [
      { id: 'a', title: 'Visa form', cost: '', checked: false, dueDate: '2026-11-05' },
      { id: 'b', title: 'Hotel', cost: 12000, checked: false, dueDate: '2026-11-06' },
      { id: 'c', title: 'Tickets', cost: 900, checked: true, dueDate: '2026-11-07' },
    ],
    todos: [{ id: 'd', text: 'Pack', done: false, date: '2026-11-12' }, { id: 'e', text: 'No date', done: false }],
  }];
  const out = withEverythingDated({}, m, ...NOV);
  assert.equal(find(out, 13, 'BKK').sub, 'Trip starts');
  assert.equal(find(out, 20, 'BKK').sub, 'Trip ends');
  assert.deepEqual(find(out, 13, 'BKK').open, { page: 'Travel', params: { tripId: 't' } });
  assert.ok(find(out, 5, 'Visa form'), 'an item with no cost');
  assert.equal(labels(out, 6).filter((x) => x === 'Hotel').length, 1, 'a due item with a cost shows once');
  assert.equal(find(out, 7, 'Tickets').sub, 'BKK trip · paid');
  assert.equal(find(out, 12, 'Pack').sub, 'BKK trip · to-do');
});

test('a one-day trip shows once', () => {
  const m = defaultModel();
  m.travel = [{ id: 't', name: 'Tagaytay', startDate: '2026-11-13', endDate: '2026-11-13', checklist: [] }];
  const out = withEverythingDated({}, m, ...NOV);
  assert.equal((out[13] || []).length, 1);
  assert.equal(out[13][0].sub, 'Trip');
});

test('goals: target dates show, but not the pot a trip or event made for itself', () => {
  const m = defaultModel();
  m.savingsGoals = [
    { id: 'g1', name: 'New phone', targetAmount: 30000, targetDate: '2026-11-09', currentAmount: 0, contributions: [] },
    { id: 'g2', name: 'Travel: BKK', targetAmount: 5000, targetDate: '2026-11-13', currentAmount: 0, contributions: [] },
    { id: 'g3', name: 'Event: Reunion', targetAmount: 5000, targetDate: '2026-11-21', currentAmount: 0, contributions: [] },
  ];
  m.travel = [{ id: 't', name: 'BKK', startDate: '', endDate: '', checklist: [], savingsGoalId: 'g2' }];
  m.events = [{ id: 'e', name: 'Reunion', type: 'other', recurrence: 'onetime', budget: '', completed: false, savingsGoalId: 'g3' }];
  m.yearlyGoals = [{ id: 'y', title: 'Run a 10K', description: '', mode: 'checklist', targetAmount: '', currentAmount: '', targetDate: '2026-11-30', completed: false }];
  const out = withEverythingDated({}, m, ...NOV);
  assert.deepEqual(find(out, 9, 'New phone').open, { page: 'PotDetail', params: { id: 'g1' } });
  assert.equal(out[13], undefined);
  assert.equal(out[21], undefined);
  assert.equal(find(out, 30, 'Run a 10K').sub, 'Yearly goal');
});

test('the other dated things: cancel-by, moves, shared expenses, investments, repeats, loans', () => {
  const m = defaultModel();
  m.bills = [{ id: 'b', name: 'Netflix', amount: 500, recurringType: 'monthly', dueDate: {}, cycles: [], cancelBy: '2026-11-03' }];
  m.transfers = [{ id: 'x', date: '2026-11-04', from: 'a', to: 'b', amount: 1000 }];
  m.sharedExpenses = [
    { id: 's1', date: '2026-11-08', label: 'Dinner', amount: 900, paidBy: 'p', shares: [], splitMode: 'equal' },
    { id: 's2', date: '2026-11-08', label: 'From a txn', amount: 900, paidBy: 'p', shares: [], splitMode: 'equal', transactionId: 't' },
  ];
  m.investments = [{ id: 'i', name: 'MP2', kind: 'mp2', entries: [{ id: 'n', date: '2026-11-10', type: 'add', amount: 500 }] }];
  m.recurring = [{ id: 'r', label: 'Gym', amount: 800, direction: 'out', owner: '', frequency: 'weekly', startDate: '2026-11-02', nextDate: '2026-11-16' }];
  m.loans = [{ id: 'l', name: 'Lent to Ana', loanType: '', totalAmount: 5000, expectedPayment: 500, actualPayments: [], owner: '', direction: 'lent', recurringType: 'onetime', dueDate: { date: '2026-11-11' } }];
  const out = withEverythingDated({}, m, ...NOV);
  assert.equal(find(out, 3, 'Netflix').sub, 'Cancel by');
  assert.ok(find(out, 4, 'Money moved'));
  assert.ok(find(out, 8, 'Dinner'));
  assert.equal(find(out, 8, 'From a txn'), undefined, 'its transaction is already on the day');
  assert.ok(find(out, 10, 'MP2'));
  assert.ok(find(out, 16, 'Gym') && find(out, 23, 'Gym') && find(out, 30, 'Gym'), 'each coming repeat');
  assert.equal(find(out, 9, 'Gym'), undefined, 'not before the next one');
  assert.ok(find(out, 11, 'Lent to Ana'));
});

test('nothing here changes money: projected balances are the same', () => {
  const m = defaultModel();
  m.events = [{ id: 'e2', name: 'Reunion', type: 'other', recurrence: 'onetime', onetimeDate: '2026-11-21', budget: 5000, completed: false }];
  const before = JSON.stringify(computeRunningBalances(m, ...NOV));
  const base = computeMonthEvents(m, ...NOV);
  const copy = JSON.stringify(base);
  withEverythingDated(base, m, ...NOV);
  assert.equal(JSON.stringify(base), copy, 'the money events are not touched');
  assert.equal(JSON.stringify(computeRunningBalances(m, ...NOV)), before);
});
