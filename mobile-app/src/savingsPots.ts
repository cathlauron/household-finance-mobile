import type { HouseholdModel, SavingsGoal, SavingsContribution, PaymentMethod } from './types';
import { incomeOccurrencesInMonth } from './balanceProjection';
import { makeId } from './utils';
import { todayISO } from './dateUtils';

// Redesign: savings "pots" (the Savings screen's Pots tab and the pot page).
// A pot is a savings goal. Its money is the sum of its contributions: money added is
// positive, money moved out is negative. Pots can add a set amount on every payday.

function num(v: unknown): number {
  return typeof v === 'number' && isFinite(v) ? v : 0;
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isEmergencyPot(goal: SavingsGoal): boolean {
  return goal.isEmergency === true || /emergency/i.test(goal.name || '');
}

export function potSaved(goal: SavingsGoal): number {
  return (goal.contributions || []).reduce((s, c) => s + num(c.amount), 0);
}

export function efTargetMonths(model: HouseholdModel): number {
  const m = num(model.calculatorInputs?.efTargetMonths);
  return m > 0 ? m : 6;
}

export function efMonthlyExpenses(model: HouseholdModel): number {
  return num(model.calculatorInputs?.efMonthlyExpenses);
}

// The pot's goal: its own target, or for the emergency pot (with no target of its own)
// the chosen number of months of essential expenses.
export function potTarget(goal: SavingsGoal, model: HouseholdModel): number {
  const own = num(goal.targetAmount);
  if (own > 0) return own;
  if (isEmergencyPot(goal)) return efTargetMonths(model) * efMonthlyExpenses(model);
  return 0;
}

export function monthsCovered(goal: SavingsGoal, model: HouseholdModel): number | null {
  const exp = efMonthlyExpenses(model);
  return exp > 0 ? potSaved(goal) / exp : null;
}

export function addedThisMonth(model: HouseholdModel, today: Date = new Date()): number {
  const ym = iso(today).slice(0, 7);
  let total = 0;
  (model.savingsGoals || []).forEach((g) =>
    (g.contributions || []).forEach((c) => {
      if ((c.date || '').startsWith(ym)) total += num(c.amount);
    })
  );
  return total;
}

// How many paydays fall in the given month (at least 1, so a pot still has a pace).
export function paydaysInMonth(model: HouseholdModel, year: number, monthIndex: number): number {
  let n = 0;
  (model.income || []).forEach((s) => (n += incomeOccurrencesInMonth(s, year, monthIndex).length));
  return n;
}

// Roughly how much goes into the pot each month: the payday amount if it's set to add
// automatically, otherwise the average of what was added over the last 3 months.
export function monthlyPace(goal: SavingsGoal, model: HouseholdModel, today: Date = new Date()): number {
  if (goal.autoAdd?.enabled && num(goal.autoAdd.amount) > 0) {
    return num(goal.autoAdd.amount) * Math.max(1, paydaysInMonth(model, today.getFullYear(), today.getMonth()));
  }
  const from = new Date(today);
  from.setMonth(from.getMonth() - 3);
  const fromISO = iso(from);
  const added = (goal.contributions || []).filter((c) => num(c.amount) > 0 && (c.date || '') > fromISO).reduce((s, c) => s + num(c.amount), 0);
  return added / 3;
}

// "full by May 2027", or null when there's no target or no pace.
export function fullByLabel(goal: SavingsGoal, model: HouseholdModel, today: Date = new Date()): string | null {
  const left = potTarget(goal, model) - potSaved(goal);
  if (left <= 0) return null;
  const pace = monthlyPace(goal, model, today);
  if (pace <= 0) return null;
  const months = Math.ceil(left / pace);
  if (months > 600) return null;
  const d = new Date(today.getFullYear(), today.getMonth() + months, 1);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function withContribution(goal: SavingsGoal, amount: number, pm?: PaymentMethod, extra: Partial<SavingsContribution> = {}): SavingsGoal {
  const c: SavingsContribution = { id: makeId('contrib'), date: todayISO(), amount, ...(pm ? { paymentMethod: pm } : {}), ...extra };
  return { ...goal, contributions: [...(goal.contributions || []), c], currentAmount: potSaved(goal) + amount };
}

// Adds the payday amount to every pot set to "add every payday", for each payday from
// the day it was switched on up to today that hasn't been added yet. Returns the
// updated model, or null when nothing changed.
export function applyAutoSavings(model: HouseholdModel, today: Date = new Date()): HouseholdModel | null {
  const todayStr = iso(today);
  let changed = false;
  const goals = (model.savingsGoals || []).map((g) => {
    const auto = g.autoAdd;
    if (!auto?.enabled || num(auto.amount) <= 0 || !auto.since) return g;
    const done = new Set((g.contributions || []).filter((c) => c.auto).map((c) => c.date));
    const start = new Date(auto.since + 'T00:00:00');
    if (isNaN(start.getTime())) return g;
    const added: SavingsContribution[] = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= today) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth();
      const days = new Set<number>();
      (model.income || []).forEach((s) => incomeOccurrencesInMonth(s, y, m).forEach((d) => days.add(d)));
      [...days].sort((a, b) => a - b).forEach((d) => {
        const date = iso(new Date(y, m, d));
        if (date < auto.since || date > todayStr || done.has(date)) return;
        done.add(date);
        added.push({ id: makeId('contrib'), date, amount: num(auto.amount), auto: true, ...(g.keptIn && g.keptIn.type !== 'credit' ? { paymentMethod: g.keptIn } : {}) /* a card can't fund a pot */ });
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    if (!added.length) return g;
    changed = true;
    const contributions = [...(g.contributions || []), ...added];
    return { ...g, contributions, currentAmount: contributions.reduce((s, c) => s + num(c.amount), 0) };
  });
  return changed ? { ...model, savingsGoals: goals } : null;
}
