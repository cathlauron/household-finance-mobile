import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withEverythingDated, newEventIndex } from '../src/calendarAll.ts';
import { computeMonthEvents, computeRunningBalances, eventDelta } from '../src/balanceProjection.ts';
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
  assert.equal(find(out, 13, 'BKK').sub, 'Trip · day 1 of 8');
  assert.equal(find(out, 20, 'BKK').sub, 'Trip · day 8 of 8');
  assert.equal(find(out, 16, 'BKK').sub, 'Trip · day 4 of 8');
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

test('the new row on a day: found even with a same-named one, or none at all', () => {
  assert.equal(newEventIndex(['Rent', 'Lunch'], ['Rent', 'Water', 'Lunch']), 1);
  assert.equal(newEventIndex(['Lunch'], ['Lunch', 'Lunch']), 1);
  assert.equal(newEventIndex(['Rent'], ['Rent']), -1);
});

// Cath, 2026-11-06: "i want every detail be it a transaction, bill, debt, loan, or plan be
// clickable and direct me to its page same thing with how bills does it."
test('every row on the Calendar opens its page', () => {
  const m = defaultModel();
  m.balanceAccounts = { ...m.balanceAccounts, asOfDate: '2026-11-01' };
  m.bills = [{ id: 'b', name: 'Water', recurringType: 'monthly', dueDate: { day: '5' }, owner: 'shared', cycles: [{ id: 'bc', dueDate: '2026-11-05', amountDue: 500, amountPaid: 500, paidDate: '2026-11-04', paidAt: 1 }] }];
  m.debts = [{ id: 'd', creditorOrPerson: 'Ana', recurringType: 'monthly', dueDate: { day: '6' }, owner: 'shared', cycles: [{ id: 'dc', dueDate: '2026-11-06', amountDue: 300, amountPaid: '', paidDate: '' }] }];
  m.loans = [{ id: 'l', name: 'Car', loanType: '', totalAmount: 9000, expectedPayment: 900, actualPayments: [], owner: '', direction: 'borrowed', recurringType: 'onetime', dueDate: { date: '2026-11-07' } }];
  m.income = [{ id: 'i', sourceName: 'Salary', personId: 'p', expectedAmount: 20000, frequency: 'monthly', payDates: [], paymentLog: [{ id: 'pl', date: '2026-11-08', amount: 20000 }] }];
  m.manualTransactions = [{ id: 't', date: '2026-11-09', label: 'Lunch', amount: 250, direction: 'out', category: 'Food', owner: 'shared' }];
  m.savingsGoals = [{ id: 'g', name: 'Phone', targetAmount: 900, targetDate: '', currentAmount: 0, contributions: [{ id: 'c', date: '2026-11-10', amount: 100 }] }];
  m.recurring = [{ id: 'r', label: 'Gym', amount: 800, direction: 'out', owner: '', frequency: 'monthly', startDate: '2026-11-02', nextDate: '2026-11-16' }];
  const out = withEverythingDated(computeMonthEvents(m, ...NOV), m, ...NOV);
  const all = Object.values(out).flat();
  assert.ok(all.length >= 7);
  for (const ev of all) assert.ok(ev.open || ev.tripId || (ev.id && ['bill', 'debt', 'loan'].includes(ev.type)), `${ev.type} ${ev.label} opens nothing`);
  assert.deepEqual(find(out, 9, 'Lunch').open, { page: 'TransactionDetail', params: { id: 'manual-t' } });
  assert.deepEqual(find(out, 4, 'Water payment').open, { page: 'PayDetail', params: { kind: 'bill', id: 'b', backTitle: 'Calendar' } });
  assert.deepEqual(find(out, 8, 'Salary (received)').open, { page: 'IncomePerson', params: { personId: 'p' } });
  assert.deepEqual(find(out, 10, 'Phone contribution').open, { page: 'PotDetail', params: { id: 'g' } });
  assert.deepEqual(find(out, 16, 'Gym').open, { page: 'Recurring' });
});

test('money you lent stops showing once it is all paid back', () => {
  const loan = { id: 'l', name: 'Lent to Ana', loanType: '', totalAmount: 1000, expectedPayment: 500, owner: '', direction: 'lent', recurringType: 'monthly', dueDate: { day: '11' } };
  const m = defaultModel();
  m.loans = [{ ...loan, actualPayments: [{ id: 'p1', date: '2026-09-11', actual: 500 }] }];
  assert.ok(find(withEverythingDated({}, m, ...NOV), 11, 'Lent to Ana'));
  m.loans = [{ ...loan, actualPayments: [{ id: 'p1', date: '2026-09-11', actual: 500 }, { id: 'p2', date: '2026-10-11', actual: 500 }] }];
  assert.equal(find(withEverythingDated({}, m, ...NOV), 11, 'Lent to Ana'), undefined);
});

test('a row with no page to show does not pretend to open one', () => {
  const m = defaultModel();
  m.manualTransactions = [{ id: 't', date: '2026-11-09', label: 'Nothing', amount: 0, direction: 'out', category: '', owner: 'shared' }];
  assert.equal(computeMonthEvents(m, ...NOV)[9][0].open, undefined);
});

// Cath, 2026-11-06 (mockup A): a trip shows on every one of its days, and across months.
test('a trip that runs into next month shows in both, one ribbon end in each', () => {
  const m = defaultModel();
  m.travel = [{ id: 'tr', name: 'Japan', startDate: '2026-11-28', endDate: '2026-12-03', checklist: [] }];
  const nov = withEverythingDated({}, m, ...NOV);
  const dec = withEverythingDated({}, m, 2026, 11);
  assert.deepEqual(Object.keys(nov).map(Number), [28, 29, 30]);
  assert.deepEqual(Object.keys(dec).map(Number), [1, 2, 3]);
  assert.equal(nov[30][0].sub, 'Trip · day 3 of 6');
  assert.equal(nov[30][0].band.last, false);
  assert.equal(dec[1][0].band.first, false);
  assert.equal(dec[3][0].band.last, true);
});

test('a trip with one date, or an end before its start, is that one day', () => {
  const m = defaultModel();
  m.travel = [{ id: 'a', name: 'Only start', startDate: '2026-11-05', endDate: '', checklist: [] }, { id: 'b', name: 'Only end', startDate: '', endDate: '2026-11-08', checklist: [] }, { id: 'c', name: 'Backwards', startDate: '2026-11-20', endDate: '2026-11-02', checklist: [] }, { id: 'd', name: 'No dates', startDate: '', endDate: '', checklist: [] }];
  const out = withEverythingDated({}, m, ...NOV);
  assert.deepEqual(Object.keys(out).map(Number), [5, 8, 20]);
  assert.equal(out[5][0].sub, 'Trip');
});

test('an event has a ribbon, and a trip or event never counts in a balance', () => {
  const m = defaultModel();
  m.events = [{ id: 'e', name: 'Party', type: 'other', recurrence: 'onetime', onetimeDate: '2026-11-09', budget: 500 }];
  m.travel = [{ id: 'tr', name: 'Cebu', startDate: '2026-11-12', endDate: '2026-11-13', checklist: [] }];
  const out = withEverythingDated({}, m, ...NOV);
  assert.equal(out[9][0].band.kind, 'event');
  for (const day of [9, 12, 13]) assert.equal(eventDelta(out[day][0]), 0);
});

test('a grocery item with a Buy by date shows on that day', () => {
  const m = defaultModel();
  m.groceries = [{ id: 'g', item: 'Rice', plannedAmount: 320, actualAmount: '', purchased: false, buyBy: '2026-11-14' }, { id: 'h', item: 'No date', plannedAmount: 50, actualAmount: '', purchased: false }];
  const out = withEverythingDated({}, m, ...NOV);
  assert.deepEqual(Object.keys(out).map(Number), [14]);
  assert.equal(out[14][0].sub, 'Grocery item');
  assert.equal(out[14][0].amount, 320);
  assert.deepEqual(out[14][0].open, { page: 'Groceries' });
  assert.equal(eventDelta(out[14][0]), 0);
  m.groceries[0].purchased = true;
  assert.equal(withEverythingDated({}, m, ...NOV)[14][0].sub, 'Grocery item · bought');
});
