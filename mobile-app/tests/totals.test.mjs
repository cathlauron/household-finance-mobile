// Totals checks (Cath, 2026-11-28: "making sure that the logic ... works perfectly"). The money
// totals that had no check of their own yet: total balance, budget status, category spending,
// month totals, income for a month and who-owes-whom in Shared Expenses.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultModel } from '../src/defaultModel.ts';
import { totalLiquidBalance } from '../src/balanceProjection.ts';
import { transactionTotals, computeCategorySpend, getCategoryBudgetStatus } from '../src/transactions.ts';
import { monthTotals } from '../src/incomeMonth.ts';
import { pairBalances, myNet } from '../src/sharedExpenses.ts';

const colors = { error: 'red', orange: 'orange', ok: 'green' };

function model() {
  const m = defaultModel();
  m.balanceAccounts = {
    ...m.balanceAccounts,
    asOfDate: '2026-11-01',
    cash: [{ id: 'c', name: 'Wallet', amount: 1500.5 }],
    debit: [{ id: 'd', name: 'BPI', amount: 20000 }, { id: 'e', name: 'GCash', amount: '' }],
    credit: [{ id: 'k', name: 'Visa', amount: 8000 }],
    investment: [{ id: 'i', name: 'MP2', amount: 99999 }],
  };
  return m;
}

test('total balance adds cash, debit and credit only, and an empty amount counts as 0', () => {
  assert.equal(totalLiquidBalance(model()), 29500.5);
});

test('month totals: borrowed money is never In, saving is its own total, net takes both off', () => {
  const list = [
    { id: '1', date: '2026-11-02', direction: 'in', amount: 30000, source: 'manual' },
    { id: '2', date: '2026-11-03', direction: 'in', amount: 5000, borrowed: { kind: 'debt', id: 'x' }, source: 'manual' },
    { id: '3', date: '2026-11-04', direction: 'out', amount: 1234.56, source: 'manual' },
    { id: '4', date: '2026-11-05', direction: 'saving', amount: 2000, source: 'saving' },
  ];
  const t = transactionTotals(list);
  assert.equal(t.totalIn, 30000);
  assert.equal(t.totalOut, 1234.56);
  assert.equal(t.totalSaving, 2000);
  assert.equal(Math.round(t.net * 100) / 100, 26765.44);
});

test('category spending counts only money out, in that category, in that month (paid bills too)', () => {
  const m = model();
  m.manualTransactions = [
    { id: 'a', date: '2026-11-02', label: 'SM', amount: 800, direction: 'out', owner: 'shared', category: 'Groceries' },
    { id: 'b', date: '2026-11-20', label: 'Puregold', amount: 450.25, direction: 'out', owner: 'shared', category: 'Groceries' },
    { id: 'c', date: '2026-10-31', label: 'Last month', amount: 999, direction: 'out', owner: 'shared', category: 'Groceries' },
    { id: 'd', date: '2026-11-03', label: 'Refund', amount: 100, direction: 'in', owner: 'shared', category: 'Groceries' },
    { id: 'e', date: '2026-11-03', label: 'Jeep', amount: 50, direction: 'out', owner: 'shared', category: 'Transport' },
  ];
  m.bills = [{ id: 'b1', name: 'Meralco', category: 'Utilities', recurringType: 'monthly', dueDate: { day: '20' }, priority: '', owner: '', notes: '',
    cycles: [{ id: 'y', dueDate: '2026-11-20', amountDue: 2350, amountPaid: 2350, paidDate: '2026-11-19', notes: '' }] }];
  assert.equal(computeCategorySpend(m, 'Groceries', '2026-11'), 1250.25);
  assert.equal(computeCategorySpend(m, 'Transport', '2026-11'), 50);
  assert.equal(computeCategorySpend(m, 'Utilities', '2026-11'), 2350);
  assert.equal(computeCategorySpend(m, 'Groceries', '2026-12'), 0);
});

test('a "just record it" bill payment is never spending', () => {
  const m = model();
  m.bills = [{ id: 'b1', name: 'Plane tickets', category: 'Travel', recurringType: 'onetime', dueDate: {}, priority: '', owner: '', notes: '',
    cycles: [{ id: 'y', dueDate: '2026-11-20', amountDue: 9000, amountPaid: 9000, paidDate: '2026-11-19', notes: '', recordedOnly: true }] }];
  assert.equal(computeCategorySpend(m, 'Travel', '2026-11'), 0);
});

test('budget status: on track below 80%, getting close from 80%, at budget at 100%, over above it', () => {
  assert.equal(getCategoryBudgetStatus(0, 0, colors).label, 'No limit set');
  assert.equal(getCategoryBudgetStatus(799.99, 1000, colors).label, 'On track');
  assert.equal(getCategoryBudgetStatus(800, 1000, colors).label, 'Getting close');
  assert.equal(getCategoryBudgetStatus(1000, 1000, colors).label, 'At budget');
  assert.equal(getCategoryBudgetStatus(1000.01, 1000, colors).color, 'red');
});

test('income for a month: received, still to come, and an early payday matched to its row', () => {
  const src = { id: 's', personId: 'p', category: 'Salary', sourceName: 'Work', expectedAmount: 25000, frequency: 'semimonthly',
    payDates: ['15', '30'], paymentLog: [{ id: 'l1', date: '2026-11-13', amount: 25000 }] };
  const t = monthTotals([src], 2026, 10);
  assert.equal(t.expected, 50000);
  assert.equal(t.received, 25000);
  assert.equal(t.toCome, 25000);
});

test('shared expenses: each pair nets to one amount, and a settle-up takes it down', () => {
  const m = model();
  m.people = [{ id: 'me', name: 'Cath' }, { id: 'm', name: 'Miguel' }];
  m.sharedExpenses = [
    { id: 'x', date: '2026-11-01', label: 'Dinner', amount: 1200, paidBy: 'me', shares: [{ personId: 'me', amount: 600 }, { personId: 'm', amount: 600 }], splitMode: 'equal' },
    { id: 'y', date: '2026-11-02', label: 'Grab', amount: 120, paidBy: 'm', shares: [{ personId: 'me', amount: 60 }, { personId: 'm', amount: 60 }], splitMode: 'equal' },
  ];
  m.sharedSettlements = [{ id: 's', date: '2026-11-03', from: 'm', to: 'me', amount: 100 }];
  const b = pairBalances(m);
  assert.deepEqual(b, [{ from: 'm', to: 'me', amount: 440 }]);
  assert.equal(myNet(b, 'me'), 440);
  assert.equal(myNet(b, 'm'), -440);
});
