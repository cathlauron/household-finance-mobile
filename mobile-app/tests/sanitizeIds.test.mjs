// Version 2.2 (smoothness sweep): sanitizeModelIds keeps unchanged records as the same
// objects. These checks prove the values are exactly what the old version gave.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeModelIds } from '../src/mergeModels.ts';
import { sanitizeModelIds as before } from './fixtures/mergeModelsBefore2_2.ts';

function sample(dupes) {
  const tx = Array.from({ length: 30 }, (_, i) => ({ id: dupes && i % 7 === 3 ? 'tx-dup' : `tx-${i}`, date: '2026-10-01', label: 'x' + i, amount: i, direction: 'out', owner: 'shared' }));
  if (dupes) tx.push({ id: '', date: '2026-10-02', label: 'blank id', amount: 1, direction: 'out', owner: 'shared' });
  return {
    people: [{ id: 'p1', name: 'Cath' }, { id: dupes ? 'p1' : 'p2', name: 'Joanne' }],
    income: [{ id: 'i1', sourceName: 'Pay', paymentLog: [{ id: 'l1' }, { id: dupes ? 'l1' : 'l2' }] }, { id: 'i2', sourceName: 'Side' }],
    bills: [{ id: 'b1', name: 'Rent', cycles: [{ id: 'c1' }, { id: 'c2' }] }, { id: 'b2', name: 'Water', cycles: [{ id: dupes ? 'c1' : 'c3' }] }],
    debts: [{ id: 'd1', cycles: [{ id: 'dc1' }] }],
    loans: [{ id: 'L1', actualPayments: [{ id: 'lp1' }, { id: 'lp2' }] }],
    savingsGoals: [{ id: 'g1', contributions: [{ id: 'k1' }] }, { id: 'g2' }],
    balanceAccounts: { cash: [{ id: 'cash' }], debit: [{ id: 'bpi' }, { id: dupes ? 'bpi' : 'gcash' }], credit: [], investment: [], property: [], vehicle: [], asOfDate: '2026-10-01' },
    manualTransactions: tx,
    categories: [{ id: 'cat1', name: 'Food' }],
    categoryBudgets: [],
    travel: [{ id: 't1', name: 'Thailand', checklist: [{ id: 'it1' }, { id: 'it2' }] }, { id: 't2', name: 'Baguio' }],
    events: undefined,
    settings: { theme: 'light' },
  };
}

test('same values as before, with and without ids to fix', () => {
  for (const dupes of [false, true]) {
    assert.deepEqual(sanitizeModelIds(sample(dupes)), before(sample(dupes)));
  }
});

test('records with good ids stay the very same objects', () => {
  const m = sample(false);
  const s = sanitizeModelIds(m);
  assert.equal(s.manualTransactions, m.manualTransactions);
  assert.equal(s.bills, m.bills);
  assert.equal(s.bills[0], m.bills[0]);
  assert.equal(s.loans, m.loans);
  assert.equal(s.savingsGoals[0], m.savingsGoals[0]);
  assert.equal(s.balanceAccounts, m.balanceAccounts);
  assert.equal(s.travel[0], m.travel[0]);
  // a trip with no checklist gets an empty one, as before
  assert.deepEqual(s.travel[1].checklist, []);
  // running it again changes nothing at all
  const again = sanitizeModelIds(s);
  assert.equal(again.manualTransactions, s.manualTransactions);
  assert.equal(again.travel, s.travel);
  assert.equal(again.income, s.income);
});

test('only the record with a repeated id is replaced', () => {
  const m = sample(true);
  const s = sanitizeModelIds(m);
  assert.notEqual(s.manualTransactions, m.manualTransactions);
  assert.equal(s.manualTransactions[0], m.manualTransactions[0]);
  const ids = s.manualTransactions.map((t) => t.id).filter(Boolean);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(s.bills[0], m.bills[0]);
  assert.notEqual(s.bills[1], m.bills[1]);
});
