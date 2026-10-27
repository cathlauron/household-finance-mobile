// Cath, 2026-10-27 (canvas T1): transfers show in Transactions with their note, never as spending.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transfersForList, transferRow } from '../src/transfersList.ts';
import { defaultModel } from '../src/defaultModel.ts';

function model() {
  const m = defaultModel();
  m.balanceAccounts = { ...m.balanceAccounts, cash: [{ id: 'c1', name: 'Cash', amount: 1000 }], debit: [{ id: 'd1', name: 'BDO', amount: 5000 }], credit: [{ id: 'k1', name: 'BPI Credit', amount: 20000 }] };
  m.transfers = [
    { id: 'x1', date: '2026-10-27', from: 'cash:c1', to: 'debit:d1', amount: 3000, note: 'Deposit at the branch' },
    { id: 'x2', date: '2026-09-02', from: 'debit:d1', to: 'credit:k1', amount: 4200, fee: 15 },
  ];
  return m;
}

test('a transfer reads "Moved: Cash → BDO" with its note; a card payment "Paid card"', () => {
  const m = model();
  const a = transferRow(m, m.transfers[0]);
  assert.equal(a.title, 'Moved: Cash → BDO');
  assert.equal(a.sub, 'Deposit at the branch · not spending');
  const b = transferRow(m, m.transfers[1]);
  assert.equal(b.title, 'Paid card: BDO → BPI Credit');
  assert.equal(b.sub, 'not spending');
  assert.equal(b.fee, 15);
});

test('filters: month, account; a category filter (spending) shows none', () => {
  const m = model();
  assert.equal(transfersForList(m, { month: 'all' }).length, 2);
  assert.deepEqual(transfersForList(m, { month: '2026-10' }).map((t) => t.id), ['x1']);
  assert.deepEqual(transfersForList(m, { accountKey: 'credit:k1' }).map((t) => t.id), ['x2']);
  assert.deepEqual(transfersForList(m, { category: 'Food' }), []);
});

test('households from before transfers were saved: nothing to show', () => {
  const m = defaultModel();
  delete m.transfers;
  assert.deepEqual(transfersForList(m, {}), []);
});
