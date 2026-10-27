// Version 3: checks for credit cards (limit, owed, statement due day, installments, K4 answer).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardOwed, nextStatementDue, installmentsOnCard, savedBalanceAfterAnswer } from '../src/creditCards.ts';
import { defaultModel } from '../src/defaultModel.ts';

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

test('you owe = limit minus what you can still use; no limit = unknown', () => {
  assert.equal(cardOwed({ id: 'a', name: 'Atome', amount: 3824.96, creditLimit: 10000 }, 3824.96), 6175.04);
  assert.equal(cardOwed({ id: 'a', name: 'Atome', amount: 0 }, 0), null);
  assert.equal(cardOwed({ id: 'a', name: 'Atome', amount: 0, creditLimit: 5000 }, 6000), 0); // never below zero
});

test('next statement due date: this month if still ahead, else next month; 31 = last day', () => {
  assert.equal(iso(nextStatementDue(5, new Date(2026, 9, 18))), '2026-11-05');
  assert.equal(iso(nextStatementDue(25, new Date(2026, 9, 18))), '2026-10-25');
  assert.equal(iso(nextStatementDue(18, new Date(2026, 9, 18, 15))), '2026-10-18');
  assert.equal(iso(nextStatementDue(31, new Date(2026, 1, 3))), '2026-02-28');
  assert.equal(nextStatementDue(undefined), null);
});

test('installments: one part paid per month since the purchase; finished ones drop off', () => {
  const m = defaultModel();
  m.manualTransactions = [
    { id: 'p', date: '2026-08-10', label: 'Phone', amount: 7500, direction: 'out', owner: 'shared', installments: 6, paymentMethod: { type: 'credit', accountId: 'atome' } },
    { id: 'q', date: '2026-01-10', label: 'Old', amount: 300, direction: 'out', owner: 'shared', installments: 3, paymentMethod: { type: 'credit', accountId: 'atome' } },
    { id: 'r', date: '2026-10-01', label: 'Other card', amount: 600, direction: 'out', owner: 'shared', installments: 3, paymentMethod: { type: 'credit', accountId: 'bpi' } },
  ];
  assert.deepEqual(installmentsOnCard(m, 'atome', new Date(2026, 9, 18)), [{ id: 'p', label: 'Phone', perMonth: 1250, count: 6, left: 4 }]);
});

test('one-time question: "what I owe" turns the number into what you can still use', () => {
  // Saved ₱3,824.96, nothing since; it was what you owe on a ₱10,000 limit -> you can use ₱6,175.04.
  assert.equal(savedBalanceAfterAnswer(3824.96, 3824.96, 'owe', 10000), 6175.04);
  // Saved ₱4,000 but ₱176 spent since (live ₱3,824): live becomes ₱6,176, so saved becomes ₱6,352.
  assert.equal(savedBalanceAfterAnswer(4000, 3824, 'owe', 10000), 6352);
  assert.equal(savedBalanceAfterAnswer(3824.96, 3824.96, 'canUse', 10000), 3824.96);
});
