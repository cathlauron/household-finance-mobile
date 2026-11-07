import test from 'node:test';
import assert from 'node:assert/strict';
import { datesFrom, dateHeading } from '../src/calendarDates.ts';

// Cath, 2026-11-07 (mockup calendar-date-page): tapping a date opens a page of that date and the
// dates after it that have something on them, like the iPhone.
const months = {
  '2026-10': { 31: ['a'] },
  '2026-11': { 2: ['b'], 14: ['c', 'd'], 20: [] },
  '2026-12': { 1: ['e'] },
  '2027-1': { 3: ['f'] },
};
const eventsFor = (y, m) => months[`${y}-${m + 1}`] || {};
const start = (year, month, day) => ({ year, month, day });
const days = (list) => list.map((d) => `${d.year}-${d.month + 1}-${d.day}`);

test('starts on the tapped date and skips earlier ones and empty ones', () => {
  assert.deepEqual(days(datesFrom(start(2026, 10, 2), 1, eventsFor)), ['2026-11-2', '2026-11-14']);
  assert.deepEqual(days(datesFrom(start(2026, 10, 3), 1, eventsFor)).slice(1), ['2026-11-14']);
});

test('the tapped date is always first, even with nothing on it', () => {
  const list = datesFrom(start(2026, 10, 10), 1, eventsFor);
  assert.deepEqual(days(list), ['2026-11-10', '2026-11-14']);
  assert.deepEqual(list[0].events, []);
});

test('a date with an empty list is skipped', () => {
  assert.ok(!days(datesFrom(start(2026, 10, 1), 1, eventsFor)).includes('2026-11-20'));
});

test('carries on into the next months, across the new year', () => {
  assert.deepEqual(days(datesFrom(start(2026, 10, 14), 3, eventsFor)), ['2026-11-14', '2026-12-1', '2027-1-3']);
});

test('items keep their order', () => {
  assert.deepEqual(datesFrom(start(2026, 10, 14), 1, eventsFor)[0].events, ['c', 'd']);
});

test('headings read like the iPhone, with the year only when it is not this year', () => {
  assert.equal(dateHeading(2026, 10, 14, 2026), 'SATURDAY — NOV 14');
  assert.equal(dateHeading(2027, 0, 1, 2026), 'FRIDAY — JAN 1, 2027');
});
