import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultModel } from '../src/defaultModel.ts';
import { checkInTimes, loggedOn, CHECK_IN_TITLE, CHECK_IN_BODY } from '../src/checkIn.ts';

// Cath, 2026-11-24 (mockup three-updates, part 2, wording C, 8:00 PM): once a day, only when
// nothing was logged that day by anyone in the household.
const at = (y, mo, d, h = 12, mi = 0) => new Date(y, mo, d, h, mi, 0, 0);
const iso = (d) => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
const EIGHT = { hour: 20, minute: 0 };

test('Check-in: the words she picked', () => {
  assert.equal(CHECK_IN_TITLE, 'Quiet day?');
  assert.equal(CHECK_IN_BODY, 'No spending logged today. Tap to add it.');
});

test('Check-in: at 8 PM on each of the next 7 days, starting today when nothing is logged yet', () => {
  const m = defaultModel();
  const now = at(2026, 10, 24, 9);
  const times = checkInTimes(m, now, EIGHT);
  assert.equal(times.length, 7);
  assert.deepEqual(times.map((t) => [iso(t), t.getHours(), t.getMinutes()])[0], ['2026-11-24', 20, 0]);
  assert.equal(iso(times[6]), '2026-11-30');
});

test('Check-in: no reminder today once anything was logged today', () => {
  const m = defaultModel();
  const now = at(2026, 10, 24, 15);
  m.manualTransactions = [{ id: 't', date: '2026-11-24', label: 'Lunch', amount: 340, direction: 'out', owner: 'shared', createdAt: at(2026, 10, 24, 13).getTime() }];
  assert.equal(loggedOn(m, '2026-11-24'), true);
  assert.equal(iso(checkInTimes(m, now, EIGHT)[0]), '2026-11-25');
});

test('Check-in: something back-dated but added today counts as logging today', () => {
  const m = defaultModel();
  m.manualTransactions = [{ id: 't', date: '2026-11-20', label: 'Old lunch', amount: 340, direction: 'out', owner: 'shared', createdAt: at(2026, 10, 24, 13).getTime() }];
  assert.equal(loggedOn(m, '2026-11-24'), true);
});

test('Check-in: a bill paid, a payday logged or money moved today counts too', () => {
  const m = defaultModel();
  m.bills = [{ id: 'b', name: 'Water', cycles: [{ id: 'c', dueDate: '2026-11-24', amountDue: 300, amountPaid: 300, paidDate: '2026-11-24' }] }];
  assert.equal(loggedOn(m, '2026-11-24'), true);
  const t = defaultModel();
  t.transfers = [{ id: 'x', date: '2026-11-24', from: 'cash:a', to: 'debit:b', amount: 100, createdAt: at(2026, 10, 24, 10).getTime() }];
  assert.equal(loggedOn(t, '2026-11-24'), true);
});

test('Check-in: something planned for a later day does not count for that day', () => {
  const m = defaultModel();
  m.manualTransactions = [{ id: 't', date: '2026-11-26', label: 'Rent', amount: 9000, direction: 'out', owner: 'shared', createdAt: at(2026, 10, 24, 10).getTime() }];
  assert.equal(loggedOn(m, '2026-11-26'), false);
  assert.equal(checkInTimes(m, at(2026, 10, 24, 9), EIGHT).some((t) => iso(t) === '2026-11-26'), true);
});

test('Check-in: after 8 PM it starts tomorrow; "Nothing today" quiets today', () => {
  const m = defaultModel();
  assert.equal(iso(checkInTimes(m, at(2026, 10, 24, 20, 30), EIGHT)[0]), '2026-11-25');
  assert.equal(iso(checkInTimes(m, at(2026, 10, 24, 9), EIGHT, '2026-11-24')[0]), '2026-11-25');
  assert.equal(iso(checkInTimes(m, at(2026, 10, 24, 9), EIGHT, '2026-11-23')[0]), '2026-11-24');
});
