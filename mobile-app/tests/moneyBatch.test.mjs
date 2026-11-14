import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultModel } from '../src/defaultModel.ts';
import { accountCurrentBalance } from '../src/balanceProjection.ts';
import { addBorrowed } from '../src/borrowed.ts';
import { createDraftStore } from '../src/formDrafts.ts';
import { CURRENCIES, withdrawCash, foreignBalance, isForeign, pesoFor, rateFromAmounts, suggestedRate, showMoney } from '../src/fx.ts';
import { transferAvailable, overAvailable } from '../src/moneyMoves.ts';

// Cath, 2026-11-13 (mockups money-batch-4 and money-batch-5).
const now = new Date();
const TODAY = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-'); // the phone's own date
function household() {
  const m = defaultModel();
  m.balanceAccounts = { ...m.balanceAccounts, asOfDate: '2026-01-01', cash: [{ id: 'c1', name: 'Cash', amount: 1200 }], debit: [{ id: 'd1', name: 'BPI Savings', amount: 12340 }], credit: [] };
  return m;
}
const bal = (m, g, id) => accountCurrentBalance(m, g, m.balanceAccounts[g].find((a) => a.id === id));

// ---- 3. Move money shows what is available now ----
test('Move money: available is what is in the account now, not the saved balance', () => {
  const m = household();
  m.manualTransactions = [{ id: 't', date: TODAY, label: 'Lunch', amount: 340, direction: 'out', owner: 'shared', paymentMethod: { type: 'debit', accountId: 'd1' }, createdAt: Date.now() }];
  assert.equal(transferAvailable(m, 'debit:d1'), 12000);
  assert.equal(overAvailable(m, 'debit:d1', 12000), false);
  assert.equal(overAvailable(m, 'debit:d1', 12000.5), true);
  assert.equal(transferAvailable(m, 'debit:nope'), null);
});

// ---- 1. Borrowed money (option B) ----
test('Borrowed as a loan: money in to the account, and a loan to pay back', () => {
  const out = addBorrowed(household(), { kind: 'loan', amount: 5000, from: 'Ate Joy', account: { type: 'debit', accountId: 'd1' }, date: TODAY, now: 1000 });
  const txn = out.model.manualTransactions.at(-1);
  const loan = out.model.loans.at(-1);
  assert.equal(txn.direction, 'in');
  assert.equal(txn.amount, 5000);
  assert.equal(txn.label, 'Ate Joy');
  assert.equal(txn.category, 'Borrowed');
  assert.equal(txn.incomeKind, undefined); // not income
  assert.deepEqual(txn.borrowed, { kind: 'loan', id: loan.id });
  assert.equal(loan.name, 'Ate Joy');
  assert.equal(loan.direction, 'borrowed');
  assert.equal(loan.totalAmount, 5000);
  assert.deepEqual(loan.actualPayments, []);
  assert.equal(bal(out.model, 'debit', 'd1'), 17340);
});

test('Borrowed as a loan with Pay back by: due once on that date', () => {
  const out = addBorrowed(household(), { kind: 'loan', amount: 5000, from: 'Ate Joy', account: { type: 'cash', accountId: 'c1' }, date: TODAY, payBackBy: '2026-12-15', now: 1 });
  const loan = out.model.loans.at(-1);
  assert.equal(loan.recurringType, 'onetime');
  assert.deepEqual(loan.dueDate, { date: '2026-12-15' });
});

test('Borrowed as a debt: one amount to pay, with or without a due date', () => {
  const a = addBorrowed(household(), { kind: 'debt', amount: 800, from: 'Kuya', account: { type: 'cash', accountId: 'c1' }, date: TODAY, payBackBy: '2026-11-30', now: 1 });
  const debt = a.model.debts.at(-1);
  assert.equal(debt.creditorOrPerson, 'Kuya');
  assert.equal(debt.cycles.length, 1);
  assert.equal(debt.cycles[0].amountDue, 800);
  assert.equal(debt.cycles[0].dueDate, '2026-11-30');
  assert.equal(debt.cycles[0].amountPaid, '');
  assert.deepEqual(a.model.manualTransactions.at(-1).borrowed, { kind: 'debt', id: debt.id });
  const b = addBorrowed(household(), { kind: 'debt', amount: 800, from: 'Kuya', account: { type: 'cash', accountId: 'c1' }, date: TODAY, now: 1 });
  assert.equal(b.model.debts.at(-1).cycles[0].dueDate, '');
});

test('Borrowed: nothing else in the household is touched', () => {
  const m = household();
  const out = addBorrowed(m, { kind: 'loan', amount: 1, from: 'X', account: { type: 'cash', accountId: 'c1' }, date: TODAY, now: 1 });
  assert.equal(out.model.bills, m.bills);
  assert.equal(out.model.balanceAccounts, m.balanceAccounts);
  assert.equal(m.loans.length + 1, out.model.loans.length);
});

// ---- 2. Forms keep what you typed ----
function fakeStorage() {
  const data = {};
  return { data, getItem: async (k) => data[k] ?? null, setItem: async (k, v) => { data[k] = v; }, removeItem: async (k) => { delete data[k]; } };
}

test('Drafts: kept, read back, and cleared', async () => {
  const s = fakeStorage();
  const drafts = createDraftStore(s);
  assert.equal(await drafts.load('txn'), null);
  await drafts.save('txn', { amount: 450, label: '7-Eleven' });
  assert.deepEqual(await drafts.load('txn'), { amount: 450, label: '7-Eleven' });
  assert.deepEqual(await createDraftStore(s).load('txn'), { amount: 450, label: '7-Eleven' }); // after the app restarts
  await drafts.clear('txn');
  assert.equal(await drafts.load('txn'), null);
  assert.equal(Object.keys(s.data).length, 0);
});

test('Drafts: an untouched form is not kept, and photos are never kept', async () => {
  const s = fakeStorage();
  const drafts = createDraftStore(s);
  await drafts.save('txn', { amount: '', label: '  ', notes: '' });
  assert.equal(await drafts.load('txn'), null);
  await drafts.save('txn', { amount: 5, receiptPhoto: 'data:image/png;base64,AAAA' });
  assert.deepEqual(await drafts.load('txn'), { amount: 5 });
});

test('Drafts: each form has its own, and broken saved text is ignored', async () => {
  const s = fakeStorage();
  const drafts = createDraftStore(s);
  await drafts.save('txn', { amount: 1 });
  await drafts.save('transfer', { amount: 2 });
  assert.deepEqual(await drafts.load('txn'), { amount: 1 });
  assert.deepEqual(await drafts.load('transfer'), { amount: 2 });
  s.data['formDraft:bill'] = '{not json';
  assert.equal(await createDraftStore(s).load('bill'), null);
});

test('Drafts: storage that fails never breaks the form', async () => {
  const drafts = createDraftStore({ getItem: async () => { throw new Error('x'); }, setItem: async () => { throw new Error('x'); }, removeItem: async () => { throw new Error('x'); } });
  await drafts.save('txn', { amount: 1 });
  assert.deepEqual(await drafts.load('txn'), { amount: 1 }); // still there for this session
  await drafts.clear('txn');
  assert.equal(await drafts.load('txn'), null);
});

// ---- 4. Withdraw cash in another currency ----
test('Currencies: a list with baht, and no peso (that is Move money)', () => {
  const thb = CURRENCIES.find((c) => c.code === 'THB');
  assert.equal(thb.symbol, '฿');
  assert.ok(CURRENCIES.length >= 20);
  assert.ok(!CURRENCIES.some((c) => c.code === 'PHP'));
  assert.equal(new Set(CURRENCIES.map((c) => c.code)).size, CURRENCIES.length);
});

test('Rate: worked out from the two amounts, and pesos from the rate', () => {
  assert.equal(rateFromAmounts(2000, 3480), 1.74);
  assert.equal(rateFromAmounts(0, 3480), null);
  assert.equal(pesoFor(150, 1.74), 261);
  assert.equal(pesoFor(33.33, 1.74), 57.99);
});

test('Withdraw: makes a cash wallet in that currency and takes pesos from the bank', () => {
  const out = withdrawCash(household(), { from: 'debit:d1', currency: 'THB', foreignAmount: 2000, pesoAmount: 3480, fee: 250, date: TODAY, now: 5 });
  const wallet = out.model.balanceAccounts.cash.at(-1);
  assert.equal(wallet.name, 'Cash (THB)');
  assert.equal(wallet.currency, 'THB');
  assert.equal(wallet.fxRate, 1.74);
  assert.equal(isForeign(wallet), true);
  assert.equal(isForeign(out.model.balanceAccounts.cash[0]), false);
  assert.equal(bal(out.model, 'cash', wallet.id), 3480); // kept in pesos, so every total still adds up
  assert.equal(foreignBalance(wallet, 3480), 2000);
  assert.equal(bal(out.model, 'debit', 'd1'), 12340 - 3480 - 250);
  const rec = out.model.transfers.at(-1);
  assert.equal(rec.amount, 3480);
  assert.equal(rec.foreignAmount, 2000);
  assert.equal(rec.currency, 'THB');
  assert.equal(rec.to, `cash:${wallet.id}`);
  assert.equal(out.model.manualTransactions.at(-1).category, 'Fees');
  assert.equal(out.model.manualTransactions.at(-1).amount, 250);
});

test('Withdraw again at another rate: the wallet keeps the average, and no second wallet', () => {
  const first = withdrawCash(household(), { from: 'debit:d1', currency: 'THB', foreignAmount: 2000, pesoAmount: 3480, date: TODAY, now: 5 });
  const second = withdrawCash(first.model, { from: 'debit:d1', currency: 'THB', foreignAmount: 1000, pesoAmount: 1800, date: TODAY, now: 6 });
  const wallets = second.model.balanceAccounts.cash.filter((a) => a.currency === 'THB');
  assert.equal(wallets.length, 1);
  assert.equal(wallets[0].fxRate, 1.76); // (3480 + 1800) / (2000 + 1000)
  assert.equal(foreignBalance(wallets[0], bal(second.model, 'cash', wallets[0].id)), 3000);
});

test('Withdraw in pesos is not a thing here, and bad amounts are refused', () => {
  assert.throws(() => withdrawCash(household(), { from: 'debit:d1', currency: 'PHP', foreignAmount: 1, pesoAmount: 1, date: TODAY, now: 1 }));
  assert.throws(() => withdrawCash(household(), { from: 'debit:d1', currency: 'THB', foreignAmount: 0, pesoAmount: 10, date: TODAY, now: 1 }));
  assert.throws(() => withdrawCash(household(), { from: 'debit:nope', currency: 'THB', foreignAmount: 5, pesoAmount: 10, date: TODAY, now: 1 }));
});

test('Money text: a baht wallet reads in baht, a peso one in pesos', () => {
  assert.equal(showMoney({ id: 'x', name: 'Cash (THB)', amount: 0, currency: 'THB', fxRate: 1.74 }, 3219), '฿1,850');
  assert.equal(showMoney({ id: 'c1', name: 'Cash', amount: 0 }, 1200), '₱1,200.00');
});

test('Suggested rate: today\'s from the internet, else your last one, else none', async () => {
  const ok = async (url) => { assert.match(url, /THB/); assert.doesNotMatch(url, /amount|12340|3480/); return { ok: true, json: async () => ({ rates: { PHP: 1.8815 } }) }; };
  assert.deepEqual(await suggestedRate('THB', 1.74, ok), { rate: 1.8815, from: 'today' });
  const down = async () => { throw new Error('offline'); };
  assert.deepEqual(await suggestedRate('THB', 1.74, down), { rate: 1.74, from: 'last' });
  assert.deepEqual(await suggestedRate('THB', undefined, down), { rate: null, from: 'none' });
  const odd = async () => ({ ok: true, json: async () => ({ rates: {} }) });
  assert.deepEqual(await suggestedRate('THB', undefined, odd), { rate: null, from: 'none' });
});

// ---- Changing leftover foreign cash back to pesos (Cath, 2026-11-14) ----
import { changeBack } from '../src/fx.ts';

function withBaht() {
  return withdrawCash(household(), { from: 'debit:d1', currency: 'THB', foreignAmount: 2000, pesoAmount: 3480, date: TODAY, now: 5 });
}

test('Change back at the same rate: the wallet goes down, pesos go up, no difference', () => {
  const start = withBaht();
  const out = changeBack(start.model, { wallet: `cash:${start.walletId}`, to: 'cash:c1', foreignAmount: 500, pesoAmount: 870, date: TODAY, now: 9 });
  const wallet = out.model.balanceAccounts.cash.find((a) => a.id === start.walletId);
  assert.equal(foreignBalance(wallet, bal(out.model, 'cash', wallet.id)), 1500);
  assert.equal(bal(out.model, 'cash', 'c1'), 1200 + 870);
  assert.equal(out.difference, 0);
  assert.equal(out.model.manualTransactions.length, start.model.manualTransactions.length);
  const rec = out.model.transfers.at(-1);
  assert.equal(rec.from, `cash:${start.walletId}`);
  assert.equal(rec.amount, 870);
  assert.equal(rec.foreignAmount, 500);
});

test('Change back at a worse rate: the loss is written down as a fee, so nothing vanishes', () => {
  const start = withBaht();
  const out = changeBack(start.model, { wallet: `cash:${start.walletId}`, to: 'cash:c1', foreignAmount: 1000, pesoAmount: 1600, date: TODAY, now: 9 });
  assert.equal(out.difference, -140); // cost 1,740, got 1,600
  const loss = out.model.manualTransactions.at(-1);
  assert.equal(loss.direction, 'out');
  assert.equal(loss.amount, 140);
  assert.equal(loss.category, 'Fees');
  assert.equal(loss.paymentMethod, undefined); // it is not paid from any account again
  assert.equal(bal(out.model, 'cash', 'c1'), 2800);
});

test('Change back at a better rate: the gain is money in, and never income', () => {
  const start = withBaht();
  const out = changeBack(start.model, { wallet: `cash:${start.walletId}`, to: 'debit:d1', foreignAmount: 1000, pesoAmount: 1800, date: TODAY, now: 9 });
  assert.equal(out.difference, 60);
  const gain = out.model.manualTransactions.at(-1);
  assert.equal(gain.direction, 'in');
  assert.equal(gain.amount, 60);
  assert.equal(gain.incomeKind, undefined);
});

test('Change back: only from a foreign wallet, into a peso one, with real amounts', () => {
  const start = withBaht();
  const w = `cash:${start.walletId}`;
  assert.throws(() => changeBack(start.model, { wallet: 'cash:c1', to: 'debit:d1', foreignAmount: 1, pesoAmount: 1, date: TODAY }));
  assert.throws(() => changeBack(start.model, { wallet: w, to: w, foreignAmount: 1, pesoAmount: 1, date: TODAY }));
  assert.throws(() => changeBack(start.model, { wallet: w, to: 'cash:c1', foreignAmount: 0, pesoAmount: 1, date: TODAY }));
});

// Sweep 2026-11-14: undoing a change-back put the pesos you got back into the wallet, not what
// that cash cost, and left the gain or loss behind.
import { undoTransfer } from '../src/transferUndo.ts';

test('Undo of a change-back: both accounts and the difference go back exactly', () => {
  const start = withBaht();
  const out = changeBack(start.model, { wallet: `cash:${start.walletId}`, to: 'cash:c1', foreignAmount: 1000, pesoAmount: 1600, date: TODAY, now: Date.now() });
  const undone = undoTransfer(out.model, out.model.transfers.at(-1));
  assert.equal(bal(undone, 'cash', start.walletId), 3480);
  assert.equal(bal(undone, 'cash', 'c1'), 1200);
  assert.equal(undone.manualTransactions.length, start.model.manualTransactions.length);
  assert.equal(undone.transfers.length, start.model.transfers.length);
});

test('Undo of a withdrawal: the pesos go back to the bank and the wallet empties', () => {
  const base = household();
  const out = withdrawCash(base, { from: 'debit:d1', currency: 'THB', foreignAmount: 2000, pesoAmount: 3480, fee: 250, date: TODAY, now: Date.now() });
  const undone = undoTransfer(out.model, out.model.transfers.at(-1));
  assert.equal(bal(undone, 'debit', 'd1'), 12340);
  assert.equal(bal(undone, 'cash', out.walletId), 0);
});

// Sweep 2026-11-14: borrowed money was added to every "In" total (Home, Transactions, the
// reports and the tax summary) although the form says it is not income.
import { buildTransactionsList, transactionTotals } from '../src/transactions.ts';
test('Borrowed money is not counted in the In totals', () => {
  const m = household();
  m.manualTransactions = [{ id: 'pay', date: TODAY, label: 'Gift', amount: 700, direction: 'in', owner: 'shared', paymentMethod: { type: 'debit', accountId: 'd1' }, createdAt: 1 }];
  const out = addBorrowed(m, { kind: 'debt', amount: 5000, from: 'Ate Joy', account: { type: 'debit', accountId: 'd1' }, date: TODAY, now: 1000 });
  const totals = transactionTotals(buildTransactionsList(out.model));
  assert.equal(totals.totalIn, 700);
  assert.equal(totals.net, 700);
  assert.equal(bal(out.model, 'debit', 'd1'), 18040); // the account still has the money
});

// ---- Cath, 2026-11-14 (H-78): a Borrowed transaction and its loan or debt follow each other ----
import { deleteManualTxn } from '../src/transactionActions.ts';
import { syncBorrowed, borrowedDeleteNote } from '../src/borrowed.ts';
const borrow = (kind) => addBorrowed(household(), { kind, amount: 5000, from: 'Ate Joy', account: { type: 'debit', accountId: 'd1' }, date: TODAY, now: 1000 });

test('Deleting a Borrowed transaction removes its unpaid loan or debt too', () => {
  for (const kind of ['loan', 'debt']) {
    const out = borrow(kind);
    assert.match(borrowedDeleteNote(out.model, out.txnId), /also removes/);
    const after = deleteManualTxn(out.model, out.txnId);
    assert.equal(after.manualTransactions.length, 0);
    assert.equal((kind === 'loan' ? after.loans : after.debts).some((x) => x.id === out.refId), false, kind);
  }
});

test('Deleting a Borrowed transaction keeps a loan or debt that already has payments', () => {
  const loan = borrow('loan');
  loan.model.loans = loan.model.loans.map((l) => ({ ...l, actualPayments: [{ id: 'p', date: TODAY, actual: 500 }] }));
  assert.match(borrowedDeleteNote(loan.model, loan.txnId), /stays/);
  assert.equal(deleteManualTxn(loan.model, loan.txnId).loans.length, 1);
  const debt = borrow('debt');
  debt.model.debts = debt.model.debts.map((d) => ({ ...d, cycles: d.cycles.map((c) => ({ ...c, amountPaid: 500, paidDate: TODAY })) }));
  assert.equal(deleteManualTxn(debt.model, debt.txnId).debts.length, 1);
  assert.equal(borrowedDeleteNote(household(), 'nope'), '');
});

test('Editing a Borrowed transaction changes its loan or debt to match', () => {
  const edit = (out) => syncBorrowed({ ...out.model, manualTransactions: out.model.manualTransactions.map((t) => ({ ...t, amount: 6500, label: 'Ate Joy R.' })) }, out.txnId);
  const loan = edit(borrow('loan')).loans.at(-1);
  assert.equal(loan.totalAmount, 6500);
  assert.equal(loan.name, 'Ate Joy R.');
  const debt = edit(borrow('debt')).debts.at(-1);
  assert.equal(debt.creditorOrPerson, 'Ate Joy R.');
  assert.equal(debt.cycles[0].amountDue, 6500);
  // A debt round already paid keeps its amount.
  const paid = borrow('debt');
  paid.model.debts = paid.model.debts.map((d) => ({ ...d, cycles: d.cycles.map((c) => ({ ...c, amountPaid: 5000, paidDate: TODAY })) }));
  assert.equal(edit(paid).debts.at(-1).cycles[0].amountDue, 5000);
});

// ---- Cath, 2026-11-14 (H-77): a transaction dated before the balances were last typed in ----
import { isBackDated, takeOffForTxn, putBackForTxn } from '../src/backDated.ts';
import { accountTrail } from '../src/accountTrail.ts';
test('Back-dated transaction: "take it off my balance" changes the balance, and deleting it puts it back', () => {
  const m = household();
  m.balanceAccounts.asOfDate = TODAY;
  m.balanceAccounts.asOfAt = 5000;
  assert.equal(isBackDated(m, '2026-01-01'), true);
  assert.equal(isBackDated(m, TODAY), false);
  const pm = { type: 'debit', accountId: 'd1' };
  const out = { id: 'o', date: '2026-01-05', label: 'Old lunch', amount: 340, direction: 'out', owner: 'shared', paymentMethod: pm, createdAt: 9000 };
  // Not ticked: the balance stays.
  const plain = { ...m, manualTransactions: [out] };
  assert.equal(bal(plain, 'debit', 'd1'), 12340);
  // Ticked: it comes off, and the row knows it moved the balance.
  const taken = takeOffForTxn(plain, 'o');
  assert.equal(bal(taken, 'debit', 'd1'), 12000);
  assert.equal(taken.manualTransactions[0].offSaved, true);
  assert.deepEqual(accountTrail(taken, 'debit', 'd1').map((r) => [r.before, r.after]), [[12340, 12000]]);
  assert.equal(accountTrail(plain, 'debit', 'd1')[0].before, null);
  // Money in is added instead.
  const inn = takeOffForTxn({ ...m, manualTransactions: [{ ...out, direction: 'in' }] }, 'o');
  assert.equal(bal(inn, 'debit', 'd1'), 12680);
  // Deleting it puts the balance back.
  assert.equal(bal(deleteManualTxn(taken, 'o'), 'debit', 'd1'), 12340);
  assert.equal(bal(putBackForTxn(taken, 'o'), 'debit', 'd1'), 12340);
  assert.equal(putBackForTxn(taken, 'o').manualTransactions[0].offSaved, undefined);
});

import { reapplyForEdit } from '../src/backDated.ts';
test('Back-dated transaction: editing its amount corrects the balance; moving its date after the update hands it back', () => {
  const m = household();
  m.balanceAccounts.asOfDate = TODAY;
  m.balanceAccounts.asOfAt = 5000;
  const pm = { type: 'debit', accountId: 'd1' };
  const before = takeOffForTxn({ ...m, manualTransactions: [{ id: 'o', date: '2026-01-05', label: 'Old lunch', amount: 340, direction: 'out', owner: 'shared', paymentMethod: pm, createdAt: 9000 }] }, 'o');
  const edited = (change) => reapplyForEdit(before, { ...before, manualTransactions: before.manualTransactions.map((t) => ({ ...t, ...change })) }, 'o');
  assert.equal(bal(edited({ amount: 500 }), 'debit', 'd1'), 11840);
  assert.equal(edited({ amount: 500 }).manualTransactions[0].offSaved, true);
  // Moved to the cash account: the bank gets it back, cash loses it.
  const moved = edited({ paymentMethod: { type: 'cash', accountId: 'c1' } });
  assert.equal(bal(moved, 'debit', 'd1'), 12340);
  assert.equal(bal(moved, 'cash', 'c1'), 860);
  // An ordinary transaction is left alone.
  const plain = { ...m, manualTransactions: [{ id: 'p', date: '2026-01-05', label: 'x', amount: 10, direction: 'out', owner: 'shared', paymentMethod: pm }] };
  assert.equal(reapplyForEdit(plain, plain, 'p'), plain);
});

// Bug hunt 2026-11-14: kept forms stayed on the phone after signing out, so the next person to
// sign in on it was shown "Picked up where you left off" with someone else's amounts and names.
test('Kept forms: signing out throws every one of them away', async () => {
  const data = new Map([['somethingElse', 'stays']]);
  const storage = { getItem: async (k) => data.get(k) ?? null, setItem: async (k, v) => { data.set(k, v); }, removeItem: async (k) => { data.delete(k); }, getAllKeys: async () => [...data.keys()], multiRemove: async (keys) => { keys.forEach((k) => data.delete(k)); } };
  const store = createDraftStore(storage);
  await store.save('txn', { label: 'Lunch', amount: 340 });
  await store.save('bill', { name: 'Meralco' });
  await store.clearAll();
  assert.equal(await store.load('txn'), null);
  assert.equal(await store.load('bill'), null);
  assert.deepEqual([...data.keys()], ['somethingElse']);
  // And one written by an earlier run of the app (not in memory) goes too.
  data.set('formDraft:loan', '{"name":"Ate"}');
  await store.clearAll();
  assert.equal(await createDraftStore(storage).load('loan'), null);
});
