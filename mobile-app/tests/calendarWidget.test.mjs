import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultModel } from '../src/defaultModel.ts';
import { calendarWidgetDays, calendarWidgetView } from '../src/widgets/calendarWidget.ts';

// Cath, 2026-11-24 (mockups three-updates part 1 and calendar-widget-medium): calendar widgets
// laid out like the iPhone's, in the mood colour. Small: today and what's next, or the month.
// Medium: both side by side.
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function household() {
  const m = defaultModel();
  m.bills = [{ id: 'b', name: 'Meralco', category: '', recurringType: 'onetime', dueDate: { date: '2026-11-24' }, priority: '', owner: 'shared', notes: '', cycles: [{ id: 'c', dueDate: '2026-11-24', amountDue: 2350, amountPaid: '', paidDate: '', notes: '' }] }];
  m.debts = [{ id: 'd', creditorOrPerson: 'Tita Lorna', category: '', recurringType: 'onetime', dueDate: { date: '2026-11-24' }, notes: '', owner: 'shared', minPayment: 1000, cycles: [{ id: 'dc', dueDate: '2026-11-24', amountDue: 5000, amountPaid: '', paidDate: '', notes: '' }] }];
  m.travel = [{ id: 't', name: 'Bangkok', startDate: '2026-11-26', endDate: '2026-11-30', checklist: [], todos: [] }];
  return m;
}

test('Calendar widget: what is on each day this month and next, with amounts', () => {
  const days = calendarWidgetDays(household(), { hidden: false, now: new Date(2026, 10, 24, 9) });
  assert.deepEqual(days['2026-11-24'].map((e) => [e.name, e.kind, e.amount]), [['Meralco', 'bill', '₱2,350'], ['Tita Lorna', 'debt', 'min ₱1,000']]);
  assert.equal(days['2026-11-26'][0].name, 'Bangkok');
  assert.equal(days['2026-11-26'][0].kind, 'trip');
  // Next month is there too, so the widget is right after the month changes.
  const m = household();
  m.bills.push({ id: 'b2', name: 'Rent', category: '', recurringType: 'onetime', dueDate: { date: '2026-12-02' }, priority: '', owner: 'shared', notes: '', cycles: [{ id: 'c2', dueDate: '2026-12-02', amountDue: 9000, amountPaid: '', paidDate: '', notes: '' }] });
  assert.equal(calendarWidgetDays(m, { hidden: false, now: new Date(2026, 10, 24, 9) })['2026-12-02'][0].name, 'Rent');
});

test('Calendar widget: hidden amounts stay hidden', () => {
  const days = calendarWidgetDays(household(), { hidden: true, now: new Date(2026, 10, 24, 9) });
  assert.equal(days['2026-11-24'][0].amount, '₱ ••••');
});

test('Calendar widget: today is worked out when it draws, not when the app last saved', () => {
  const days = calendarWidgetDays(household(), { hidden: false, now: new Date(2026, 10, 23, 9) });
  const v = calendarWidgetView(days, new Date(2026, 10, 24, 7));
  assert.equal(v.dayName, 'TUESDAY');
  assert.equal(v.date, 24);
  assert.equal(v.monthName, 'NOVEMBER');
  assert.deepEqual(v.next.map((e) => [e.name, e.sub]), [['Meralco', 'Due today · ₱2,350'], ['Tita Lorna', 'Due today · min ₱1,000'], ['Bangkok', 'Thu · Trip']]);
});

test('Calendar widget: what is next looks a week ahead and names the day', () => {
  const m = household();
  m.bills = [];
  m.debts = [];
  const v = calendarWidgetView(calendarWidgetDays(m, { hidden: false, now: new Date(2026, 10, 24, 9) }), new Date(2026, 10, 24, 9));
  assert.deepEqual(v.next.map((e) => [e.name, e.sub]), [['Bangkok', 'Thu · Trip']]);
  const empty = calendarWidgetView(calendarWidgetDays(defaultModel(), { hidden: false, now: new Date(2026, 10, 24) }), new Date(2026, 10, 24));
  assert.deepEqual(empty.next, []);
});

test('Calendar widget: the month grid starts on Sunday, fills with next month greyed, and marks days with something', () => {
  const v = calendarWidgetView(calendarWidgetDays(household(), { hidden: false, now: new Date(2026, 10, 24) }), new Date(2026, 10, 24));
  // November 2026 starts on a Sunday: 30 days plus 5 of December make 5 full weeks.
  assert.equal(v.cells.length, 35);
  assert.deepEqual(v.cells[0], { day: 1, iso: '2026-11-01', inMonth: true, today: false, dot: false });
  assert.equal(v.cells[23].today, true);
  assert.equal(v.cells[23].dot, true);
  assert.equal(v.cells[25].dot, true); // the trip's first day
  assert.deepEqual(v.cells[30], { day: 1, iso: '2026-12-01', inMonth: false, today: false, dot: false });
  // A month starting mid-week has last month's days greyed in front.
  const dec = calendarWidgetView({}, new Date(2026, 11, 5));
  assert.equal(dec.cells[0].inMonth, false);
  assert.equal(dec.cells[0].day, 29);
  assert.equal(dec.cells.length % 7, 0);
});

// H-71 (Cath, 2026-11-24: close the open items): after adding from the Calendar with the date
// changed in the form, the Calendar goes to the day it really landed on.
import { findNewDay } from '../src/calendarAll.ts';
test('H-71: the day something new landed on, the picked day first', () => {
  const before = { '2026-11-24': ['Meralco'], '2026-12-02': [] };
  assert.equal(findNewDay(before, { '2026-11-24': ['Meralco', 'Lunch'], '2026-12-02': ['Rent'] }, '2026-11-24'), '2026-11-24');
  assert.equal(findNewDay(before, { '2026-11-24': ['Meralco'], '2026-12-02': ['Rent'] }, '2026-11-24'), '2026-12-02');
  assert.equal(findNewDay(before, { '2026-11-24': ['Meralco'], '2026-12-02': [] }, '2026-11-24'), null);
  // A day that had nothing before.
  assert.equal(findNewDay({}, { '2026-11-30': ['Gift'] }, '2026-11-24'), '2026-11-30');
});
