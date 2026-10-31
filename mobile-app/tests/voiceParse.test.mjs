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
