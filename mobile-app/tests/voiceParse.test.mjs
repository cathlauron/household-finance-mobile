// Voice entry (mockup V, Cath 2026-10-30): what was said becomes form fields.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseVoice, splitItems, matchName } from '../src/voiceParse.ts';

const now = new Date(2026, 9, 30); // Fri Oct 30 2026
const categories = ['Groceries', 'Transport', 'Utilities', 'Salary', 'Dining out'];

test('mockup V: "Spent 250 on groceries yesterday"', () => {
  const h = parseVoice('Spent 250 on groceries yesterday', { now, categories });
  assert.equal(h.amount, 250);
  assert.equal(h.direction, 'out');
  assert.equal(h.category, 'Groceries');
  assert.equal(h.date, '2026-10-29');
});

test('income: "Got my salary 18,000 today"', () => {
  const h = parseVoice('Got my salary 18,000 today', { now, categories });
  assert.equal(h.amount, 18000);
  assert.equal(h.direction, 'in');
  assert.equal(h.category, 'Salary');
  assert.equal(h.date, '2026-10-30');
});

test('a bill: "Electric bill 2,400 due on the 15th every month"', () => {
  const h = parseVoice('Electric bill 2,400 due on the 15th every month', { now });
  assert.equal(h.amount, 2400);
  assert.equal(h.name, 'Electric');
  assert.equal(h.dueDay, 15);
  assert.equal(h.repeat, 'monthly');
});

test('a debt: "Credit card 15,000, minimum 1,500 on the 20th, 3% a month"', () => {
  const h = parseVoice('Credit card 15,000, minimum 1,500 on the 20th, 3% a month', { now });
  assert.equal(h.amount, 15000);
  assert.equal(h.minimum, 1500);
  assert.equal(h.dueDay, 20);
  assert.equal(h.ratePercent, 3);
  assert.equal(h.name, 'Credit');
});

test('a loan: "I lent Ana 1,000 today"', () => {
  const h = parseVoice('I lent Ana 1,000 today', { now });
  assert.equal(h.amount, 1000);
  assert.equal(h.loanDirection, 'lent');
  assert.equal(h.person, 'Ana');
  assert.equal(h.name, 'Ana');
});

test('words for numbers: "spent two thousand five hundred on dining out last friday"', () => {
  const h = parseVoice('spent two thousand five hundred on dining out last friday', { now, categories });
  assert.equal(h.amount, 2500);
  assert.equal(h.category, 'Dining out');
  assert.equal(h.date, '2026-10-23');
});

test('a pot: "Put 500 in the travel pot" matches the pot by its name', () => {
  const h = parseVoice('Put 500 in the travel pot', { now, names: ['Emergency fund', 'Travel'] });
  assert.equal(h.amount, 500);
  assert.equal(h.name, 'Travel');
});

test('lists: grocery and to-do items said in one go', () => {
  assert.deepEqual(splitItems('add milk, eggs and bread to the grocery list'), ['Milk', 'Eggs', 'Bread']);
  assert.deepEqual(parseVoice('book the hotel, buy sunscreen and pack chargers', { now }).items, ['Book the hotel', 'Buy sunscreen', 'Pack chargers']);
});

test('nothing clear: nothing made up', () => {
  const h = parseVoice('um', { now, categories });
  assert.equal(h.amount, undefined);
  assert.equal(h.category, undefined);
  assert.equal(h.date, undefined);
});

test('names match plurals and case', () => {
  assert.equal(matchName('bought GROCERY stuff', ['Groceries']), 'Groceries');
  assert.equal(matchName('bought stuff', ['Groceries']), undefined);
  assert.equal(matchName('paid for groceries', ['Grocery']), 'Grocery');
  assert.equal(matchName('the internet bill', ['Internet', 'Internet backup']), 'Internet');
});

// 2026-10-31 (Cath: "add voice on forms that don't have it yet"): helpers for the rest of the
// forms (new account, investment, event items, new trip, transfer).
import { voiceThing, voiceItems, voiceTrip, voiceTransfer } from '../src/voiceParse.ts';
const NOW = new Date(2026, 9, 31, 12);

test('a name and an amount: new account, investment, Log payday, Add money', () => {
  assert.deepEqual(voiceThing('BPI savings 24,300', { now: NOW }), { name: 'BPI Savings', amount: 24300 });
  assert.deepEqual(voiceThing('Pag-IBIG MP2 50,000', { now: NOW }), { name: 'Pag-IBIG MP2', amount: 50000 });
  assert.deepEqual(voiceThing('18,000 yesterday', { now: NOW }), { amount: 18000, date: '2026-10-30' });
  assert.deepEqual(voiceThing('about two thousand', { now: NOW }), { amount: 2000 });
});

test('several items with their costs (event items), commas in amounts kept', () => {
  assert.deepEqual(voiceItems('Cake 1,500, gift 2,000 and balloons 500'), [
    { name: 'Cake', amount: 1500 },
    { name: 'Gift', amount: 2000 },
    { name: 'Balloons', amount: 500 },
  ]);
  assert.deepEqual(voiceItems('cake and flowers'), [{ name: 'Cake' }, { name: 'Flowers' }]);
});

test('a trip: name and dates ("to 16" stays in the same month)', () => {
  assert.deepEqual(voiceTrip('Baguio weekend November 14 to 16', NOW), { name: 'Baguio weekend', start: '2026-11-14', end: '2026-11-16' });
  assert.deepEqual(voiceTrip('Cebu trip from December 28 to January 2', NOW), { name: 'Cebu trip', start: '2026-12-28', end: '2027-01-02' });
  assert.deepEqual(voiceTrip('Tagaytay day trip', NOW), { name: 'Tagaytay day trip' });
});

test('a transfer: amount, from and to your own accounts, date', () => {
  const names = ['BPI Savings', 'GCash', 'Cash'];
  assert.deepEqual(voiceTransfer('Move 2,000 from BPI savings to GCash today', names, NOW), { amount: 2000, from: 'BPI Savings', to: 'GCash', date: '2026-10-31' });
  assert.deepEqual(voiceTransfer('5k to cash', names, NOW), { amount: 5000, to: 'Cash' });
});

// Cath, 2026-11-03: "chicken and egg" came out as one grocery item, and a date said with a
// to-do was typed into the to-do instead of becoming its date. A list said in one go is split
// (also on "&" and "plus"), and a date said with it is taken out of the words and set as the
// date (the coming day: to-dos are ahead).
import { voiceList } from '../src/voiceParse.ts';
const TUE = new Date(2026, 10, 3, 12); // Tue Nov 3 2026

test('a list said in one go is several items, also with "&" and "plus"', () => {
  assert.deepEqual(voiceList('chicken and egg', TUE), { items: ['Chicken', 'Egg'] });
  assert.deepEqual(voiceList('chicken & egg', TUE), { items: ['Chicken', 'Egg'] });
  assert.deepEqual(voiceList('rice plus soy sauce', TUE), { items: ['Rice', 'Soy sauce'] });
  assert.deepEqual(voiceList('book the hotel, buy sunscreen and pack chargers', TUE), { items: ['Book the hotel', 'Buy sunscreen', 'Pack chargers'] });
});

test('a date said with it becomes the date, not words in the item', () => {
  assert.deepEqual(voiceList('buy chicken and eggs tomorrow', TUE), { items: ['Chicken', 'Eggs'], date: '2026-11-04' });
  assert.deepEqual(voiceList('Pack on November 12', TUE), { items: ['Pack'], date: '2026-11-12' });
  assert.deepEqual(voiceList('print payslip by Friday', TUE), { items: ['Print payslip'], date: '2026-11-06' });
  assert.deepEqual(voiceList('Medcert due on the 12th', TUE), { items: ['Medcert'], date: '2026-11-12' });
  assert.deepEqual(voiceList('baggage and TDAC next Tuesday', TUE), { items: ['Baggage', 'TDAC'], date: '2026-11-10' });
  assert.deepEqual(voiceList('print statement of account on October 30', TUE), { items: ['Print statement of account'], date: '2027-10-30' });
});
