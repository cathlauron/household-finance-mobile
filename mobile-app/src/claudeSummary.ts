// Claude connector (Cath, 2026-11-28): the short, UNLOCKED summary the phone shares so Claude
// can help with budgeting. Only totals are in it: account balances, this month's in / out,
// spending per category against its budget, Left to Spend and what is due before payday.
// No transactions, notes, photos, people's names or card digits are ever in it. Everything
// else stays locked with the passphrase as before. Built from the same functions the screens
// use, so every number matches what the app shows.
import type { HouseholdModel } from './types';
import { accountCurrentBalance, computeLeftToSpend, totalCurrentBalance, type SpendingGroup } from './balanceProjection';
import { buildTransactionsList, transactionTotals } from './transactions';
import { leftToSpendItems } from './leftToSpendExtras';

export const SUMMARY_VERSION = 1;
const MAX_CATEGORIES = 30;
const MAX_DUE = 30;

export type ClaudeSummary = {
  v: number;
  currency: string;
  asOf: string; // YYYY-MM-DD the summary was worked out for
  accounts: { name: string; kind: SpendingGroup; balance: number }[];
  totalBalance: number;
  leftToSpend: { amount: number; until: string; basis: 'payday' | 'endOfMonth' };
  thisMonth: { month: string; moneyIn: number; moneyOut: number; saved: number };
  categories: { name: string; spent: number; budget: number | null; left: number | null }[];
  dueBeforePayday: { kind: string; name: string; amount: number; date: string | null }[];
};

const r2 = (n: number) => Math.round(n * 100) / 100 + 0;
const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// Names only, kept short; nothing that looks like a card or account number.
const cleanName = (s: string | undefined, fallback: string) =>
  (s || fallback).replace(/\d{4,}/g, '••••').slice(0, 60) || fallback;

export function buildClaudeSummary(model: HouseholdModel, today: Date = new Date()): ClaudeSummary {
  const month = iso(today).slice(0, 7);
  const accounts = (['cash', 'debit', 'credit'] as SpendingGroup[]).flatMap((kind) =>
    model.balanceAccounts[kind].map((a) => ({
      name: cleanName(a.name, kind === 'credit' ? 'Card' : 'Account'),
      kind,
      balance: r2(accountCurrentBalance(model, kind, a)),
    }))
  );

  const lts = computeLeftToSpend(model, today);
  const monthList = buildTransactionsList(model).filter((t) => t.date.startsWith(month));
  const totals = transactionTotals(monthList);

  const spentBy = new Map<string, number>();
  monthList.forEach((t) => {
    if (t.direction !== 'out' || t.borrowed) return;
    const name = t.category || 'Uncategorized';
    spentBy.set(name, (spentBy.get(name) ?? 0) + t.amount);
  });
  const budgetBy = new Map<string, number>();
  (model.categoryBudgets || []).forEach((b) => {
    if (typeof b.monthlyBudget === 'number' && b.monthlyBudget > 0) budgetBy.set(b.category, b.monthlyBudget);
  });
  const names = new Set([...spentBy.keys(), ...budgetBy.keys()]);
  const categories = [...names]
    .map((name) => {
      const spent = r2(spentBy.get(name) ?? 0);
      const budget = budgetBy.has(name) ? r2(budgetBy.get(name)!) : null;
      return { name: cleanName(name, 'Uncategorized'), spent, budget, left: budget === null ? null : r2(budget - spent) };
    })
    .sort((a, b) => b.spent - a.spent || a.name.localeCompare(b.name))
    .slice(0, MAX_CATEGORIES);

  const due = leftToSpendItems(model, today, lts.targetDate)
    .filter((i) => i.amount < 0 && ['Past due', 'Bills', 'Debts', 'Loans'].includes(i.group))
    .slice(0, MAX_DUE)
    .map((i) => ({ kind: i.group, name: cleanName(i.name, i.group), amount: r2(-i.amount), date: i.date ?? null }));

  return {
    v: SUMMARY_VERSION,
    currency: model.settings?.currency || 'PHP',
    asOf: iso(today),
    accounts,
    totalBalance: r2(totalCurrentBalance(model)),
    leftToSpend: { amount: r2(lts.amount), until: iso(lts.targetDate), basis: lts.basis },
    thisMonth: { month, moneyIn: r2(totals.totalIn), moneyOut: r2(totals.totalOut), saved: r2(totals.totalSaving) },
    categories,
    dueBeforePayday: due,
  };
}
