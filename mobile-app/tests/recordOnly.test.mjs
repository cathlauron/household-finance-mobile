// Cath, 2026-10-27 (canvas R4): "Just record it" keeps a payment in the history as paid,
// with no account and no change to any balance or spending; a fee paid from an account is
// its own Fees entry; loans log the amount actually paid.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markPaid, currentCycle, isCyclePaid } from '../src/billPayments.ts';
import { buildTransactionsList } from '../src/transactions.ts';
import { accountCurrentBalance } from '../src/balanceProjection.ts';
import { withFeeEntry } from '../src/payFees.ts';
import { defaultModel } from '../src/defaultModel.ts';

const BDO = { type: 'debit', accountId: 'd1' };
function model() {
  const m = defaultModel();
  m.balanceAccounts = { ...m.balanceAccounts, debit: [{ id: 'd1', name: 'BDO', amount: 10000 }], asOfDate: '2026-01-01' };
  m.bills = [{ id: 'b1', name: 'Meralco', category: 'Utilities', recurringType: 'monthly', dueDate: { day: '16' }, priority: '', owner: 'shared', notes: '',
    cycles: [{ id: 'c1', dueDate: '2026-03-16', amountDue: 2000, amountPaid: '', paidDate: '', notes: '', paymentMethod: BDO }] }];
  return m;
}

test('just record it: paid in the history, no account, no time stamp', () => {
  const m = model();
  const b = markPaid(m.bills[0], undefined, '2026-03-16', 2000, 0, { recordedOnly: true, feePaid: 25 });
  const c = b.cycles[0];
  assert.equal(isCyclePaid(c), true);
  assert.equal(c.recordedOnly, true);
  assert.equal(c.paymentMethod, undefined);
  assert.equal(c.paidAt, undefined);
  assert.equal(c.feePaid, 25);
  // The next round is queued as usual.
  assert.equal(currentCycle(b).dueDate, '2026-04-16');
});

test('just record it: no balance change and nothing in Transactions / spending', () => {
  const m = model();
  const after = { ...m, bills: [markPaid(m.bills[0], undefined, '2026-03-16', 2000, 0, { recordedOnly: true })] };
  assert.equal(accountCurrentBalance(after, 'debit', after.balanceAccounts.debit[0]), 10000);
  assert.equal(buildTransactionsList(after).filter((t) => t.source === 'bill').length, 0);
});

test('from an account: the payment and its fee both come out; the fee is its own Fees entry', () => {
  const m = model();
  let after = { ...m, bills: [markPaid(m.bills[0], BDO, '2026-03-16', 2000, 0, { feePaid: 25 })] };
  after = withFeeEntry(after, { amount: 25, label: 'Meralco', date: '2026-03-16', paymentMethod: BDO });
  assert.equal(accountCurrentBalance(after, 'debit', after.balanceAccounts.debit[0]), 10000 - 2000 - 25);
  const fees = buildTransactionsList(after).filter((t) => t.category === 'Fees');
  assert.equal(fees.length, 1);
  assert.equal(fees[0].label, 'Fee: Meralco');
  assert.equal(withFeeEntry(m, { amount: 0, label: 'x', date: '2026-03-16', paymentMethod: BDO }), m);
});

test('loans: a recorded-only payment counts as paid but is not spending or a balance change', () => {
  const m = model();
  m.loans = [{ id: 'l1', name: 'Pag-IBIG', loanType: '', totalAmount: 60000, expectedPayment: 5000, owner: 'shared', direction: 'borrowed', recurringType: 'monthly', dueDate: { day: '16' },
    actualPayments: [{ id: 'p1', date: '2026-03-16', actual: 4800, recordedOnly: true }] }];
  assert.equal(accountCurrentBalance(m, 'debit', m.balanceAccounts.debit[0]), 10000);
  assert.equal(buildTransactionsList(m).filter((t) => t.source === 'loan').length, 0);
});
