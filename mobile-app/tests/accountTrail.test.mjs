import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultModel } from '../src/defaultModel.ts';
import { accountCurrentBalance } from '../src/balanceProjection.ts';
import { accountTrail } from '../src/accountTrail.ts';
import { withdrawCash } from '../src/fx.ts';

// Cath, 2026-11-14 (mockup balance-before, Place A): on an account's page every row says what
// the account had before it and after it.
const now = new Date();
const iso = (d) => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
const TODAY = iso(now);
const day = (back) => iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - back));
const pm = { type: 'debit', accountId: 'd1' };
function household() {
  const m = defaultModel();
  m.balanceAccounts = { ...m.balanceAccounts, asOfDate: day(30), asOfAt: 1, cash: [{ id: 'c1', name: 'Cash', amount: 1200 }], debit: [{ id: 'd1', name: 'BPI Savings', amount: 5500 }], credit: [] };
  return m;
}
const txn = (id, back, amount, direction, at, extra = {}) => ({ id, date: day(back), label: id, amount, direction, owner: 'shared', paymentMethod: pm, createdAt: at, ...extra });

test('Account page: each row has the balance before and after, newest first', () => {
  const m = household();
  m.manualTransactions = [txn('meralco', 4, 2160, 'out', 100), txn('salary', 1, 10000, 'in', 300), txn('groceries', 0, 450, 'out', 400)];
  const rows = accountTrail(m, 'debit', 'd1');
  assert.deepEqual(rows.map((r) => [r.id, r.before, r.after]), [
    ['manual-groceries', 13340, 12890],
    ['manual-salary', 3340, 13340],
    ['manual-meralco', 5500, 3340],
  ]);
  assert.equal(rows[0].after, accountCurrentBalance(m, 'debit', m.balanceAccounts.debit[0]));
});

test('Account page: two things on the same day follow the second they were added', () => {
  const m = household();
  m.manualTransactions = [txn('b', 0, 100, 'out', 900), txn('a', 0, 50, 'out', 800)];
  const rows = accountTrail(m, 'debit', 'd1');
  assert.deepEqual(rows.map((r) => [r.id, r.before, r.after]), [['manual-b', 5450, 5350], ['manual-a', 5500, 5450]]);
});

test('Account page: money moved, bills, loans, paydays, savings and investments are all in the trail', () => {
  const m = household();
  m.bills = [{ id: 'b', name: 'Water', cycles: [{ id: 'cy', dueDate: day(6), amountDue: 300, amountPaid: 300, paidDate: day(6), paidAt: 10, paymentMethod: pm }] }];
  m.loans = [{ id: 'l', name: 'Ate', direction: 'borrowed', totalAmount: 1000, actualPayments: [{ id: 'lp', date: day(5), actual: 200, paymentMethod: pm, createdAt: 20 }] }];
  m.income = [{ id: 'i', sourceName: 'Pay', frequency: 'monthly', paymentLog: [{ id: 'pl', date: day(4), amount: 4000, paymentMethod: pm, createdAt: 30 }] }];
  m.savingsGoals = [{ id: 'g', name: 'Trip', contributions: [{ id: 'sc', date: day(3), amount: 500, paymentMethod: pm, createdAt: 40 }] }];
  m.investments = [{ id: 'inv', name: 'Fund', entries: [{ id: 'ie', date: day(2), type: 'add', amount: 1000, paymentMethod: pm, createdAt: 50 }] }];
  // A move changes the saved balances when it is made: 1,000 from BPI to Cash.
  m.balanceAccounts.debit[0].amount = 4500;
  m.balanceAccounts.cash[0].amount = 2200;
  m.transfers = [{ id: 'x', date: day(1), from: 'debit:d1', to: 'cash:c1', amount: 1000, createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12).getTime() }]; // a move counts from the moment it was made
  const rows = accountTrail(m, 'debit', 'd1');
  assert.deepEqual(rows.map((r) => [r.id, r.before, r.after]), [
    ['x', 7500, 6500],
    ['ie', 8500, 7500],
    ['saving-sc', 9000, 8500],
    ['income-pl', 5000, 9000],
    ['loan-lp', 5200, 5000],
    ['bill-cy', 5500, 5200],
  ]);
  assert.equal(rows[0].after, accountCurrentBalance(m, 'debit', m.balanceAccounts.debit[0]));
  // The other side of the move.
  assert.deepEqual(accountTrail(m, 'cash', 'c1').map((r) => [r.id, r.before, r.after]), [['x', 1200, 2200]]);
});

test('Account page: a balance typed in by hand is where the older rows start from', () => {
  const m = household();
  // Was 5,500; 300 spent (so 5,200), then she typed 6,000 in, then spent 100.
  const typedAt = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 12).getTime();
  m.manualTransactions = [txn('old', 3, 300, 'out', typedAt - 86400000), txn('new', 1, 100, 'out', typedAt + 86400000)];
  m.balanceAccounts.asOfDate = day(2);
  m.balanceAccounts.asOfAt = typedAt;
  m.balanceAccounts.debit[0] = { ...m.balanceAccounts.debit[0], amount: 6000, balanceLog: [{ at: typedAt, from: 5200, to: 6000 }] };
  const rows = accountTrail(m, 'debit', 'd1');
  assert.deepEqual(rows.map((r) => [r.id, r.before, r.after]), [['manual-new', 6000, 5900], ['manual-old', 5500, 5200]]);
});

test('Account page: something that has not moved the balance shows no before and after', () => {
  const m = household();
  const future = iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3));
  m.balanceAccounts.asOfAt = 500;
  m.manualTransactions = [
    { ...txn('later', 0, 900, 'out', 700), date: future }, // dated in the future: not counted yet
    txn('backdated', 40, 250, 'out', 800), // dated before the balance was typed, added after: never counted
    txn('real', 1, 100, 'out', 600),
  ];
  const rows = accountTrail(m, 'debit', 'd1');
  const by = Object.fromEntries(rows.map((r) => [r.id, r]));
  assert.equal(by['manual-later'].before, null);
  assert.equal(by['manual-backdated'].before, null);
  assert.deepEqual([by['manual-real'].before, by['manual-real'].after], [5500, 5400]);
  assert.equal(by['manual-real'].after, accountCurrentBalance(m, 'debit', m.balanceAccounts.debit[0]));
});

test('Account page: cash in another currency has its trail too (kept in pesos underneath)', () => {
  const out = withdrawCash(household(), { from: 'debit:d1', currency: 'THB', foreignAmount: 2000, pesoAmount: 3480, date: TODAY, now: 5000 });
  const rows = accountTrail(out.model, 'cash', out.walletId);
  assert.deepEqual(rows.map((r) => [r.before, r.after]), [[0, 3480]]);
  assert.deepEqual(accountTrail(out.model, 'debit', 'd1').map((r) => [r.before, r.after]), [[5500, 2020]]);
});
