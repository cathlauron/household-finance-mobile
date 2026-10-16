// ============================================================
// Household Finance App — Envelopes (redesign, Settings › Budgeting › Envelopes)
// ============================================================
// An envelope is a watched category with a monthly amount (the same list as the
// Category Watchlist, model.categoryBudgets), so there is one list, not two.
// "Not given a job yet" = the month's money (your monthly budget, or this month's
// expected paydays if no budget is set) minus what is in the envelopes.
// With "Roll leftovers into next month" on, what is left in an envelope at the end of a
// month is added to it the next month (never a negative: overspending doesn't roll).
// Rolling starts from the month it was switched on, so turning it on never invents
// leftovers from before.

import type { CategoryBudget, HouseholdModel } from './types';
import { computeCategorySpend } from './transactions';
import { incomeOccurrencesInMonth } from './balanceProjection';

export type EnvelopeRow = {
  envelope: CategoryBudget;
  amount: number; // the monthly amount you gave it
  carried: number; // rolled over from last month
  available: number; // amount + carried
  spent: number;
  left: number; // available - spent (can go below zero)
  pct: number; // share spent, 0..100+
};

export type EnvelopeSummary = {
  monthLabel: string;
  rows: EnvelopeRow[];
  base: number;
  baseKind: 'budget' | 'income' | 'none';
  assigned: number; // total of the monthly amounts
  unassigned: number; // base - assigned (can go below zero)
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function monthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

function amountOf(e: CategoryBudget): number {
  return typeof e.monthlyBudget === 'number' && e.monthlyBudget > 0 ? e.monthlyBudget : 0;
}

// This month's expected paydays (the real count, e.g. 3 for a 3-payday month).
export function expectedIncomeInMonth(model: HouseholdModel, year: number, monthIndex: number): number {
  return (model.income || []).reduce((sum, s) => {
    const amt = typeof s.expectedAmount === 'number' ? s.expectedAmount : 0;
    if (amt <= 0) return sum;
    return sum + amt * incomeOccurrencesInMonth(s, year, monthIndex).length;
  }, 0);
}

// What rolled into this envelope for the month, counting each month from the month
// rolling was switched on.
function carriedInto(model: HouseholdModel, e: CategoryBudget, year: number, monthIndex: number): number {
  const s = model.settings;
  if (!s.envelopeRollover || !s.envelopeRolloverFrom) return 0;
  const [fy, fm] = s.envelopeRolloverFrom.split('-').map(Number);
  if (!fy || !fm) return 0;
  let y = fy;
  let m = fm - 1;
  let carry = 0;
  let guard = 0;
  // Walk forward month by month until the month before this one.
  while ((y < year || (y === year && m < monthIndex)) && guard < 240) {
    const spent = computeCategorySpend(model, e.category, monthKey(y, m));
    carry = Math.max(0, amountOf(e) + carry - spent);
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
    guard += 1;
  }
  return carry;
}

export function computeEnvelopes(model: HouseholdModel, today: Date = new Date()): EnvelopeSummary {
  const year = today.getFullYear();
  const monthIndex = today.getMonth();
  const key = monthKey(year, monthIndex);
  const rows = (model.categoryBudgets || []).map((e) => {
    const amount = amountOf(e);
    const carried = carriedInto(model, e, year, monthIndex);
    const available = amount + carried;
    const spent = computeCategorySpend(model, e.category, key);
    return {
      envelope: e,
      amount,
      carried,
      available,
      spent,
      left: available - spent,
      pct: available > 0 ? Math.round((spent / available) * 100) : spent > 0 ? 100 : 0,
    };
  });
  const budget = typeof model.settings.monthlySpendingBudget === 'number' ? model.settings.monthlySpendingBudget : 0;
  const income = expectedIncomeInMonth(model, year, monthIndex);
  const base = budget > 0 ? budget : income;
  const baseKind: EnvelopeSummary['baseKind'] = budget > 0 ? 'budget' : income > 0 ? 'income' : 'none';
  const assigned = rows.reduce((sum, r) => sum + r.amount, 0);
  return { monthLabel: MONTHS[monthIndex], rows, base, baseKind, assigned, unassigned: base - assigned };
}
