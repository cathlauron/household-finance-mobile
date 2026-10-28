// Cath, 2026-10-27 (canvas I1): investments. "count the money going into investments and
// only add it towards the balance if the investment has been withdrawn".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { investmentSummary, investmentsTotal, withEntry, withoutEntry } from '../src/investments.ts';
import { accountCurrentBalance, totalCurrentBalance } from '../src/balanceProjection.ts';
import { investmentMovesForList } from '../src/transfersList.ts';
import { mergeModels } from '../src/mergeModels.ts';

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = iso(new Date());
const lastMonth = (() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return iso(d); })();
const BDO = { type: 'debit', accountId: 'bdo' };

function model(entries = []) {
  return {
    settings: {}, people: [], income: [], bills: [], debts: [], loans: [], savingsGoals: [], manualTransactions: [], categories: [], categoryBudgets: [],
    balanceAccounts: { asOfDate: lastMonth, cash: [], debit: [{ id: 'bdo', name: 'BDO', amount: 50000 }], credit: [], investment: [], property: [], vehicle: [] },
    investments: [{ id: 'mp2', name: 'Pag-IBIG MP2', kind: 'mp2', entries }],
  };
}
const bdo = (m) => accountCurrentBalance(m, 'debit', m.balanceAccounts.debit[0]);

test('worth: the last value typed in, plus money put in after it, minus money taken out', () => {
  const inv = { id: 'x', name: 'x', kind: 'other', entries: [
    { id: 'a', date: '2026-01-01', type: 'add', amount: 60000 },
    { id: 'v', date: '2026-09-30', type: 'value', amount: 63180 },
    { id: 'b', date: '2026-10-01', type: 'add', amount: 1000 },
  ] };
  assert.deepEqual(investmentSummary(inv), { putIn: 61000, worth: 64180, gain: 3180, lastValueDate: '2026-09-30' });
  const out = { ...inv, entries: [...inv.entries, { id: 'w', date: '2026-10-05', type: 'withdraw', amount: 4180 }] };
  assert.equal(investmentSummary(out).worth, 60000);
});

test('money put in from an account leaves it; what it is worth is never added to it', () => {
  const m = withEntry(model(), 'mp2', { id: 'e1', date: today, type: 'add', amount: 1000, paymentMethod: BDO, createdAt: Date.now() });
  assert.equal(bdo(m), 49000);
  const grown = withEntry(m, 'mp2', { id: 'e2', date: today, type: 'value', amount: 5000, createdAt: Date.now() });
  assert.equal(bdo(grown), 49000);
  assert.equal(totalCurrentBalance(grown), 49000);
  assert.equal(investmentsTotal(grown).worth, 5000);
});

test('taking money out into an account adds it back; removing the entry undoes it', () => {
  let m = withEntry(model(), 'mp2', { id: 'e1', date: today, type: 'value', amount: 10000, createdAt: Date.now() });
  m = withEntry(m, 'mp2', { id: 'e2', date: today, type: 'withdraw', amount: 3000, paymentMethod: BDO, createdAt: Date.now() + 1 });
  assert.equal(bdo(m), 53000);
  assert.equal(investmentSummary(m.investments[0]).worth, 7000);
  assert.equal(bdo(withoutEntry(m, 'mp2', 'e2')), 50000);
});

test('no account: only the investment changes', () => {
  const m = withEntry(model(), 'mp2', { id: 'e1', date: today, type: 'add', amount: 1000, createdAt: Date.now() });
  assert.equal(bdo(m), 50000);
  assert.equal(investmentMovesForList(m, {}).length, 0);
});

test('Transactions lists moves with an account, grey and never spending', () => {
  const m = withEntry(model(), 'mp2', { id: 'e1', date: today, type: 'add', amount: 1000, paymentMethod: BDO, createdAt: Date.now() });
  const rows = investmentMovesForList(m, {});
  assert.equal(rows.length, 1);
  assert.equal(rows[0].title, 'Invested: BDO → Pag-IBIG MP2');
  assert.match(rows[0].sub, /not spending/);
  assert.equal(investmentMovesForList(m, { category: 'Food' }).length, 0);
});

test('two phones adding to the same investment keep both entries', () => {
  const a = withEntry(model(), 'mp2', { id: 'e1', date: today, type: 'add', amount: 1000 });
  const b = withEntry(model(), 'mp2', { id: 'e2', date: today, type: 'add', amount: 2000 });
  const merged = mergeModels(a, b);
  assert.deepEqual(merged.investments[0].entries.map((e) => e.id).sort(), ['e1', 'e2']);
});

// Canvas I1 "Every month": a regular payment that puts money into the investment.
test('every month: a regular payment next month; paying it moves money once, never spending', async () => {
  const { withMonthlyPlan, monthlyPlanFor, nextPlanDue } = await import('../src/investments.ts');
  const { markPaid } = await import('../src/billPayments.ts');
  const { buildTransactionsList } = await import('../src/transactions.ts');
  assert.equal(nextPlanDue('2026-01-31', 31), '2026-02-28');
  assert.equal(nextPlanDue('2026-12-05', 5), '2027-01-05');
  let m = withMonthlyPlan(model(), model().investments[0], { amount: 1000, day: 5, paymentMethod: BDO, firstDue: '2026-11-05', id: 'bill-p', cycleId: 'cy1' });
  const plan = monthlyPlanFor(m, 'mp2');
  assert.equal(plan.regular, true);
  assert.equal(plan.cycles[0].dueDate, '2026-11-05');
  // Sent (as the pay page does): the bill keeps it in its history only; the investment gets it.
  const paid = markPaid(plan, undefined, today, 1000, 0, { recordedOnly: true, investEntryId: 'e9' });
  m = { ...m, bills: m.bills.map((b) => (b.id === plan.id ? paid : b)) };
  m = withEntry(m, 'mp2', { id: 'e9', date: today, type: 'add', amount: 1000, paymentMethod: BDO, createdAt: Date.now() });
  assert.equal(bdo(m), 49000);
  assert.equal(investmentSummary(m.investments[0]).putIn, 1000);
  assert.equal(buildTransactionsList(m).filter((t) => t.direction === 'out').length, 0);
  assert.equal(paid.cycles[0].investEntryId, 'e9');
});

test('review 10-27: changing the monthly day moves the one waiting; a fee stays linked', async () => {
  const { withMonthlyPlan, monthlyPlanFor } = await import('../src/investments.ts');
  const { markPaid } = await import('../src/billPayments.ts');
  let m = withMonthlyPlan(model(), model().investments[0], { amount: 1000, day: 5, paymentMethod: BDO, firstDue: '2026-11-05', id: 'bill-p', cycleId: 'cy1' });
  m = withMonthlyPlan(m, m.investments[0], { amount: 1500, day: 20, paymentMethod: BDO, firstDue: '2026-11-20', id: 'x', cycleId: 'y' });
  const plan = monthlyPlanFor(m, 'mp2');
  assert.equal(m.bills.length, 1);
  assert.equal(plan.cycles[0].dueDate, '2026-11-20');
  assert.equal(plan.cycles[0].amountDue, 1500);
  const paid = markPaid(plan, undefined, today, 1500, 0, { recordedOnly: true, investEntryId: 'e1', feePaid: 15, feeTxnId: 'fee1' });
  assert.equal(paid.cycles[0].feeTxnId, 'fee1');
});
