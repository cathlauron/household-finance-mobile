// Cath, 2026-10-27: Undo a money move only until a balance is typed in again.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canUndoTransfer, undoTransfer } from '../src/transferUndo.ts';
import { defaultModel } from '../src/defaultModel.ts';

// H-48 (2026-10-29): Undo is only there for 15 minutes. These checks happen one minute after
// the move (createdAt 5000); the last one 16 minutes after.
const realNow = Date.now;
Date.now = () => 5000 + 60_000;

function moved() {
  const m = defaultModel();
  // After moving ₱3,000 Cash → BDO with a ₱15 fee (fee as its own entry).
  m.balanceAccounts = { ...m.balanceAccounts, asOfAt: 1000, cash: [{ id: 'c1', name: 'Cash', amount: 2000 }], debit: [{ id: 'd1', name: 'BDO', amount: 8000 }] };
  m.manualTransactions = [{ id: 'fee1', date: '2026-10-27', label: 'Fee: Cash to BDO', amount: 15, direction: 'out', owner: 'shared', category: 'Fees', notes: '', paymentMethod: { type: 'cash', accountId: 'c1' } }];
  m.transfers = [{ id: 'x1', date: '2026-10-27', from: 'cash:c1', to: 'debit:d1', amount: 3000, fee: 15, feeTxnId: 'fee1', createdAt: 5000 }];
  return m;
}

test('undo puts both balances back and removes the move and its fee entry', () => {
  const m = moved();
  assert.equal(canUndoTransfer(m, m.transfers[0]).ok, true);
  const u = undoTransfer(m, m.transfers[0]);
  assert.equal(u.balanceAccounts.cash[0].amount, 5000);
  assert.equal(u.balanceAccounts.debit[0].amount, 5000);
  assert.deepEqual(u.transfers, []);
  assert.deepEqual(u.manualTransactions, []);
});

test('a balance typed in since the move: no undo (it would count twice)', () => {
  const m = moved();
  m.balanceAccounts.debit[0].balanceLog = [{ at: 6000, from: 8000, to: 8100 }];
  const c = canUndoTransfer(m, m.transfers[0]);
  assert.equal(c.ok, false);
  assert.match(c.reason, /typed in since/);
  assert.equal(undoTransfer(m, m.transfers[0]), m);
  const m2 = moved();
  m2.balanceAccounts.asOfAt = 7000;
  assert.equal(canUndoTransfer(m2, m2.transfers[0]).ok, false);
});

test('older moves (no time saved) cannot be undone', () => {
  const m = moved();
  delete m.transfers[0].createdAt;
  assert.equal(canUndoTransfer(m, m.transfers[0]).ok, false);
});

test('a fee that came straight off the saved balance goes back too', () => {
  const m = moved();
  m.transfers[0].feeOffSaved = true;
  m.balanceAccounts.cash[0].amount = 1985;
  const u = undoTransfer(m, m.transfers[0]);
  assert.equal(u.balanceAccounts.cash[0].amount, 5000);
});

test('H-48: 16 minutes after the move, Undo is gone (fix it with a move back)', () => {
  Date.now = () => 5000 + 16 * 60_000;
  const m = moved();
  const r = canUndoTransfer(m, m.transfers[0]);
  Date.now = () => 5000 + 60_000;
  assert.equal(r.ok, false);
  assert.match(r.reason, /15 minutes/);
});
