import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tripItemsDue } from '../src/tripDue.ts';
import { leftToSpendItems } from '../src/leftToSpendExtras.ts';
import { defaultModel } from '../src/defaultModel.ts';

// Cath, 2026-11-03 (mockups P1 + P2): a trip budget item can have a due date. Unpaid items with
// a date and an amount show on To-Pay ("From your plans"), and count in Left to Spend when due
// before payday, even when the trip itself starts after payday.
function household() {
  const m = defaultModel();
  m.travel = [
    {
      id: 'bkk', name: 'BKK', startDate: '2026-11-13', endDate: '2026-11-20',
      checklist: [
        { id: 'a', title: 'Hotel balance', cost: 12000, checked: false, dueDate: '2026-11-09' },
        { id: 'b', title: 'Travel insurance', cost: 1500, checked: false, dueDate: '2026-11-12' },
        { id: 'c', title: 'Plane tickets', cost: 18800, checked: false },
        { id: 'd', title: 'Visa', cost: 2000, checked: true, dueDate: '2026-11-05' },
        { id: 'e', title: 'Tours', cost: '', checked: false, dueDate: '2026-11-15' },
      ],
    },
  ];
  return m;
}

test('only unpaid items with a due date and an amount, soonest first', () => {
  const due = tripItemsDue(household());
  assert.deepEqual(due.map((d) => [d.title, d.amount, d.dueDate, d.tripName]), [
    ['Hotel balance', 12000, '2026-11-09', 'BKK'],
    ['Travel insurance', 1500, '2026-11-12', 'BKK'],
  ]);
});

test('Left to Spend: items due before payday count even when the trip starts after payday', () => {
  const items = leftToSpendItems(household(), new Date(2026, 10, 3), new Date(2026, 10, 10));
  const trips = items.filter((i) => i.group === 'Trips');
  assert.deepEqual(trips.map((t) => [t.name, t.amount]), [['Hotel balance', -12000]]);
});

test('Left to Spend: a trip starting before payday still counts whole (no double count)', () => {
  const items = leftToSpendItems(household(), new Date(2026, 10, 3), new Date(2026, 10, 30));
  const trips = items.filter((i) => i.group === 'Trips');
  assert.deepEqual(trips.map((t) => [t.name, t.amount]), [['BKK', -(12000 + 1500 + 18800)]]);
});

// H-63: the Calendar shows each trip item due on its day, planned (blue), and opens its trip.
import { withTripItems } from '../src/tripDue.ts';
test('Calendar: a trip item due is on its day, without changing the other days', () => {
  const base = { 9: [{ type: 'bill', label: 'Electricity', amount: 2400, id: 'e' }] };
  const out = withTripItems(base, household(), 2026, 10);
  assert.deepEqual(out[9].map((e) => e.label), ['Electricity', 'Hotel balance']);
  assert.deepEqual(out[12].map((e) => [e.label, e.tripId, e.tripName]), [['Travel insurance', 'bkk', 'BKK']]);
  assert.equal(base[9].length, 1, 'the shared list is not changed');
  assert.equal(withTripItems(base, household(), 2026, 11), base, 'a month with none: unchanged');
});
