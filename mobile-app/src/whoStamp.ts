// Version 2.2 (canvas W1 B + W2, Cath 2026-10-21: "on every applicable screen"): in a
// shared household, every entry remembers who added it, and who last changed it and when.
// Transactions already did this (DataContext.stampWho); this does the same for bills,
// debts, loans, savings pots, income and trips, and for the entries logged inside them
// (loan payments, savings moves, paydays, trip items, paid bill/debt cycles).
//
// Rules:
// - A NEW entry (its id wasn't there before) gets createdAt (if it has none) and addedBy.
// - A CHANGED entry gets changedBy + changedAt. "Changed" ignores the lists inside it
//   (a payment logged on a loan is not an edit of the loan) and the who/when fields.
// - Unchanged entries are returned as the very same object, so nothing re-renders or
//   re-syncs for no reason.
// - A bill or debt cycle remembers who marked it paid (paidBy); unpaying clears it.
// - With no username (guest), only createdAt is stamped.

import type { BalanceAccountEntry, BalanceAccounts, Bill, BillCycle, Debt, EventItem, GroceryItem, HouseholdModel, IncomeSource, Investment, InvestmentEntry, Loan, LoanPayment, MealIdea, PaymentLogEntry, SavingsContribution, SavingsGoal, SharedExpense, SharedSettlement, Transfer, TravelChecklistItem, TravelTodo, TravelTrip, YearlyGoal } from './types';

export type WhoFields = {
  id: string;
  createdAt?: number;
  addedBy?: string;
  changedBy?: string;
  changedAt?: number;
};

type Options<T> = {
  // Keys left out when deciding whether the entry itself was changed.
  ignore?: (keyof T)[];
  // Stamps the lists inside an entry; must return the same object when nothing changed.
  inner?: (entry: T, old: T | undefined) => T;
};

function sameIgnoring<T extends object>(a: T, b: T, ignore: (keyof T)[]): boolean {
  const skip = new Set<string>(['changedBy', 'changedAt', ...(ignore as string[])]);
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (skip.has(k)) continue;
    const x = (a as any)[k];
    const y = (b as any)[k];
    if (x === y) continue;
    if (x === undefined || y === undefined) return false;
    if (typeof x !== 'object' || typeof y !== 'object' || x === null || y === null) return false;
    if (JSON.stringify(x) !== JSON.stringify(y)) return false;
  }
  return true;
}

export function stampList<T extends WhoFields>(
  list: T[] | undefined,
  before: T[] | undefined,
  now: number,
  who: string | null,
  opts: Options<T> = {}
): T[] | undefined {
  if (!list) return list;
  const prevById = new Map((before || []).map((t) => [t.id, t]));
  let changedAny = false;
  const out = list.map((t0) => {
    const old = prevById.get(t0.id);
    const t = opts.inner ? opts.inner(t0, old) : t0;
    let next = t;
    if (!old) {
      if (!next.createdAt) next = { ...next, createdAt: now };
      if (who && !next.addedBy) next = { ...next, addedBy: who };
    } else if (who && old !== t0 && !sameIgnoring(old, t, opts.ignore || [])) {
      next = { ...next, changedBy: who, changedAt: now };
    }
    if (next !== t0) changedAny = true;
    return next;
  });
  return changedAny ? out : list;
}

type Cycle = { id: string; paidDate?: string; amountPaid?: number | ''; paidBy?: string };

// Bill and debt cycles: only "who marked it paid" matters (cycles are made automatically).
export function stampCycles<C extends Cycle>(cycles: C[] | undefined, before: C[] | undefined, who: string | null): C[] | undefined {
  if (!cycles) return cycles;
  const prevById = new Map((before || []).map((c) => [c.id, c]));
  let changedAny = false;
  const out = cycles.map((c) => {
    const isPaid = !!c.paidDate;
    if (!isPaid && c.paidBy) {
      changedAny = true;
      const { paidBy: _drop, ...rest } = c;
      return rest as C;
    }
    if (!who || !isPaid || c.paidBy) return c;
    const old = prevById.get(c.id);
    if (old && old.paidDate) return c; // paid before 2.2, or already stamped
    changedAny = true;
    return { ...c, paidBy: who };
  });
  return changedAny ? out : cycles;
}

// Wraps an inner list so the parent comes back unchanged when the inner list didn't change.
export function withInner<T, K extends keyof T>(entry: T, key: K, next: T[K]): T {
  return next === entry[key] ? entry : { ...entry, [key]: next };
}

// H-43: every kind of account (wallet cards), each list on its own. A balance typed in is
// already in the card's balanceLog with who typed it, so it isn't an "edit" here.
const ACCOUNT_KINDS = ['cash', 'debit', 'credit', 'investment', 'property', 'vehicle'] as const;
function stampAccounts(acc: BalanceAccounts | undefined, before: BalanceAccounts | undefined, now: number, who: string | null): BalanceAccounts | undefined {
  if (!acc) return acc;
  let next = acc;
  for (const k of ACCOUNT_KINDS) {
    const list = stampList<BalanceAccountEntry>(acc[k], before?.[k], now, who, { ignore: ['amount', 'balanceLog'] });
    if (list !== acc[k]) next = { ...next, [k]: list };
  }
  return next;
}

// The whole household at once (called by DataContext.saveModel, after the existing
// createdAt stamps). Transactions are stamped separately (DataContext.stampWho).
export function stampHouseholdWho(model: HouseholdModel, prev: HouseholdModel | null | undefined, now: number, who: string | null): HouseholdModel {
  // Nothing to compare against (no data loaded yet): stamp nothing, rather than marking
  // every existing entry as newly added by this person.
  if (!prev) return model;
  return {
    ...model,
    bills: stampList<Bill>(model.bills, prev?.bills, now, who, {
      ignore: ['cycles'],
      inner: (b, old) => withInner(b, 'cycles', stampCycles(b.cycles, old?.cycles, who) as BillCycle[]),
    }) as Bill[],
    debts: stampList<Debt>(model.debts, prev?.debts, now, who, {
      ignore: ['cycles'],
      inner: (d, old) => withInner(d, 'cycles', stampCycles(d.cycles, old?.cycles, who) as BillCycle[]),
    }) as Debt[],
    loans: stampList<Loan>(model.loans, prev?.loans, now, who, {
      ignore: ['actualPayments'],
      inner: (l, old) => withInner(l, 'actualPayments', stampList<LoanPayment>(l.actualPayments, old?.actualPayments, now, who) as LoanPayment[]),
    }) as Loan[],
    savingsGoals: stampList<SavingsGoal>(model.savingsGoals, prev?.savingsGoals, now, who, {
      ignore: ['contributions', 'currentAmount'],
      inner: (g, old) => withInner(g, 'contributions', stampList<SavingsContribution>(g.contributions, old?.contributions, now, who) as SavingsContribution[]),
    }) as SavingsGoal[],
    income: stampList<IncomeSource>(model.income, prev?.income, now, who, {
      ignore: ['paymentLog'],
      inner: (s, old) => withInner(s, 'paymentLog', stampList<PaymentLogEntry>(s.paymentLog, old?.paymentLog, now, who) as PaymentLogEntry[]),
    }) as IncomeSource[],
    travel: stampList<TravelTrip>(model.travel, prev?.travel, now, who, {
      ignore: ['checklist', 'todos', 'budget'],
      inner: (t, old) => {
        const withList = withInner(t, 'checklist', stampList<TravelChecklistItem>(t.checklist, old?.checklist, now, who) as TravelChecklistItem[]);
        // H-43: trip to-dos too.
        return withInner(withList, 'todos', stampList<TravelTodo>(withList.todos, old?.todos, now, who));
      },
    }),
    // H-43 (Cath, 2026-10-29): who added it, everywhere data is added.
    groceries: stampList<GroceryItem>(model.groceries, prev?.groceries, now, who),
    mealIdeas: stampList<MealIdea>(model.mealIdeas, prev?.mealIdeas, now, who),
    events: stampList<EventItem>(model.events, prev?.events, now, who),
    yearlyGoals: stampList<YearlyGoal>(model.yearlyGoals, prev?.yearlyGoals, now, who),
    balanceAccounts: stampAccounts(model.balanceAccounts, prev?.balanceAccounts, now, who),
    sharedExpenses: stampList<SharedExpense>(model.sharedExpenses, prev?.sharedExpenses, now, who),
    sharedSettlements: stampList<SharedSettlement>(model.sharedSettlements, prev?.sharedSettlements, now, who),
    transfers: stampList<Transfer>(model.transfers, prev?.transfers, now, who),
    investments: stampList<Investment>(model.investments, prev?.investments, now, who, {
      ignore: ['entries'],
      inner: (inv, old) => withInner(inv, 'entries', stampList<InvestmentEntry>(inv.entries, old?.entries, now, who) as InvestmentEntry[]),
    }),
  };
}
