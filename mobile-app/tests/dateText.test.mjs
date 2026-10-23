import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dateText } from '../src/dateUtils.ts';

// 2026-10-22 (Cath): the year shows only when the date isn't in this year.
const now = new Date(2026, 9, 22);
test('this year: no year', () => {
  assert.equal(dateText(new Date(2026, 10, 11), {}, now), 'Nov 11');
  assert.equal(dateText(new Date(2026, 9, 30), { weekday: true }, now), 'Fri, Oct 30');
});
test('next year or last year: with the year', () => {
  assert.equal(dateText(new Date(2027, 7, 18), {}, now), 'Aug 18, 2027');
  assert.equal(dateText(new Date(2025, 11, 31), { weekday: true }, now), 'Wed, Dec 31, 2025');
});
test('a broken date gives an empty text, not "Invalid Date"', () => {
  assert.equal(dateText(new Date('nope'), {}, now), '');
});
