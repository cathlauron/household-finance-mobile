import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutWeek, marksFor } from '../src/calendarBands.ts';

// Cath, 2026-11-06 (mockup A): trips and events as ribbons on the Calendar.
const week = (first) => Array.from({ length: 7 }, (_, i) => ({ day: first + i }));
const trip = (key, label, first = false, last = false) => ({ type: 'reminder', label, amount: 0, band: { kind: 'trip', key, first, last } });
const evt = (key, label) => ({ type: 'reminder', label, amount: 0, band: { kind: 'event', key, first: true, last: true } });

test('a trip is one ribbon across its days in a week, rounded where it really starts', () => {
  const days = { 12: [trip('t', 'Cebu', true)], 13: [trip('t', 'Cebu')], 14: [trip('t', 'Cebu')] };
  const { bands, lanesAt } = layoutWeek(week(8), days);
  assert.equal(bands.length, 1);
  assert.deepEqual([bands[0].from, bands[0].to, bands[0].roundStart, bands[0].roundEnd], [4, 6, true, false]);
  assert.deepEqual(lanesAt, [0, 0, 0, 0, 1, 1, 1]);
});

test('carried over from the week before, it is square on the left and rounded at its end', () => {
  const days = { 15: [trip('t', 'Cebu')], 16: [trip('t', 'Cebu')], 17: [trip('t', 'Cebu', false, true)] };
  const [band] = layoutWeek(week(15), days).bands;
  assert.deepEqual([band.from, band.to, band.roundStart, band.roundEnd], [0, 2, false, true]);
});

test('greyed days never carry a ribbon', () => {
  const row = [{ day: 29 }, { day: 30 }, { day: 1, outside: true }, { day: 2, outside: true }, { day: 3, outside: true }, { day: 4, outside: true }, { day: 5, outside: true }];
  const days = { 29: [trip('t', 'Cebu', true)], 30: [trip('t', 'Cebu')], 1: [trip('t', 'Cebu')] };
  assert.equal(layoutWeek(row, days).bands[0].to, 1);
});

test('an event during a trip sits on the second lane', () => {
  const days = { 12: [trip('t', 'Cebu', true)], 13: [trip('t', 'Cebu'), evt('e', 'Party')], 14: [trip('t', 'Cebu')] };
  const { bands, lanesAt } = layoutWeek(week(8), days);
  assert.equal(bands.find((b) => b.key === 't').lane, 0);
  assert.equal(bands.find((b) => b.key === 'e').lane, 1);
  assert.deepEqual(lanesAt, [0, 0, 0, 0, 1, 2, 1]);
});

test('a third thing on the same day stays a dot, and nothing is lost', () => {
  const list = [trip('t', 'Cebu', true, true), evt('a', 'One'), evt('b', 'Two')];
  const { bands, hiddenKeys } = layoutWeek(week(8), { 12: list });
  assert.equal(bands.length, 2);
  assert.equal(hiddenKeys.size, 1);
  assert.equal(marksFor(list, hiddenKeys).length, 1);
});

test('bills and other rows are not ribbons', () => {
  const bill = { type: 'bill', label: 'Meralco', amount: 100 };
  assert.equal(layoutWeek(week(8), { 12: [bill] }).bands.length, 0);
  assert.deepEqual(marksFor([bill], new Set()), [bill]);
});
