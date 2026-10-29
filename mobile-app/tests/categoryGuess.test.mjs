// H-46 (Cath, 2026-10-29): the category is guessed and preselected; she only changes it if wrong.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guessCategory, categoryOptions } from '../src/categoryGuess.ts';
import { defaultModel } from '../src/defaultModel.ts';

function model() {
  const m = defaultModel();
  m.manualTransactions = [
    { id: 'a', date: '2026-09-01', label: 'Jollibee', amount: 200, direction: 'out', category: 'Eating out', createdAt: 1 },
    { id: 'b', date: '2026-10-20', label: 'jollibee ayala', amount: 250, direction: 'out', category: 'Food', createdAt: 2 },
    { id: 'c', date: '2026-10-21', label: 'Meralco', amount: 2000, direction: 'out', category: 'Utilities', createdAt: 3 },
  ];
  return m;
}

test('the most recent entry with the same name gives the guess', () => {
  assert.deepEqual(guessCategory(model(), 'Jollibee', 245), { category: 'Food', from: 'past' });
  assert.deepEqual(guessCategory(model(), '  MERALCO ', 1900), { category: 'Utilities', from: 'past' });
});

test('no name or no match: no guess', () => {
  assert.equal(guessCategory(model(), '', 10), null);
  assert.equal(guessCategory(model(), 'Grab', 10), null);
  assert.equal(guessCategory(model(), 'Jolli', 10), null); // part of a word isn't a match
});

test('your rules come first', () => {
  const m = model();
  m.categorizationRules = [{ id: 'r', labelContains: 'jollibee', amountMin: '', amountMax: '', category: 'Treats' }];
  assert.deepEqual(guessCategory(m, 'Jollibee', 245), { category: 'Treats', from: 'rule' });
});

test('the list: your categories plus ones you used, A to Z', () => {
  const opts = categoryOptions(model());
  assert.ok(opts.includes('Food') && opts.includes('Utilities') && opts.includes('Eating out'));
  assert.deepEqual([...opts].sort((a, b) => a.localeCompare(b)), opts);
});
