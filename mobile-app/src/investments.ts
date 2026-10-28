// Cath, 2026-10-27 (canvas I1): investments. Pure functions, no screens, so the automatic
// checks (tests/investments.test.mjs) can run them directly.
import type { Bill, HouseholdModel, Investment, InvestmentEntry, InvestmentKind, PaymentMethod } from './types';

export const INVESTMENT_KINDS: { id: InvestmentKind; label: string; icon: string }[] = [
  { id: 'mp2', label: 'Pag-IBIG MP2', icon: 'home-outline' },
  { id: 'stocks', label: 'Stocks', icon: 'trending-up-outline' },
  { id: 'fund', label: 'UITF / mutual fund', icon: 'pie-chart-outline' },
  { id: 'timedeposit', label: 'Time deposit', icon: 'time-outline' },
  { id: 'crypto', label: 'Crypto', icon: 'logo-bitcoin' },
  { id: 'other', label: 'Other', icon: 'briefcase-outline' },
];
export function kindInfo(kind: InvestmentKind | string | undefined) {
  return INVESTMENT_KINDS.find((k) => k.id === kind) ?? INVESTMENT_KINDS[INVESTMENT_KINDS.length - 1];
}

const cents = (n: number) => Math.round(n * 100) / 100;
const num = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : 0);

// Entries oldest first (same day: in the order they were logged).
export function sortedEntries(inv: Investment): InvestmentEntry[] {
  return [...(inv.entries || [])].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : num(a.createdAt) - num(b.createdAt)));
}

export type InvestmentSummary = {
  putIn: number; // money put in minus money taken out
  worth: number; // what it's worth now
  gain: number; // worth - putIn
  lastValueDate: string | null; // when the worth was last typed in
};

// Worth: the last value typed in, plus money put in after it, minus money taken out after
// it. With no value typed in yet it's simply what was put in.
export function investmentSummary(inv: Investment): InvestmentSummary {
  let putIn = 0;
  let worth = 0;
  let lastValueDate: string | null = null;
  for (const e of sortedEntries(inv)) {
    const a = num(e.amount);
    if (e.type === 'add') {
      putIn += a;
      worth += a;
    } else if (e.type === 'withdraw') {
      putIn -= a;
      worth -= a;
    } else if (e.type === 'value') {
      worth = a;
      lastValueDate = e.date;
    }
  }
  putIn = cents(Math.max(0, putIn));
  worth = cents(Math.max(0, worth));
  return { putIn, worth, gain: cents(worth - putIn), lastValueDate };
}

export function investmentsTotal(model: HouseholdModel): InvestmentSummary {
  let putIn = 0;
  let worth = 0;
  for (const inv of model.investments || []) {
    const s = investmentSummary(inv);
    putIn += s.putIn;
    worth += s.worth;
  }
  return { putIn: cents(putIn), worth: cents(worth), gain: cents(worth - putIn), lastValueDate: null };
}

// The most that can be taken out right now.
export function canTakeOut(inv: Investment): number {
  return investmentSummary(inv).worth;
}

export function withEntry(model: HouseholdModel, investmentId: string, entry: InvestmentEntry): HouseholdModel {
  return {
    ...model,
    investments: (model.investments || []).map((i) => (i.id === investmentId ? { ...i, entries: [...(i.entries || []), entry] } : i)),
  };
}
export function withoutEntry(model: HouseholdModel, investmentId: string, entryId: string): HouseholdModel {
  return {
    ...model,
    investments: (model.investments || []).map((i) => (i.id === investmentId ? { ...i, entries: (i.entries || []).filter((e) => e.id !== entryId) } : i)),
  };
}

// How an entry changes an account: put in = leaves it, taken out = comes back to it.
// "value" entries never touch an account.
export function accountEffect(e: InvestmentEntry, pm: (p?: PaymentMethod) => boolean): number {
  if (!pm(e.paymentMethod)) return 0;
  if (e.type === 'add') return -num(e.amount);
  if (e.type === 'withdraw') return num(e.amount);
  return 0;
}

// ---- "Every month" (canvas I1): a regular payment that puts money into the investment ----
// It sits in To-Pay > Bills > Regular payments and on the calendar like any regular payment;
// paying it adds an "add" entry to the investment (from the account picked), never spending.
export function monthlyPlanFor(model: HouseholdModel, investmentId: string): Bill | undefined {
  return (model.bills || []).find((b) => b.investmentId === investmentId);
}

function isoDay(y: number, m: number, day: number): string {
  const last = new Date(y, m + 1, 0).getDate();
  const d = Math.min(day, last);
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// The next due date for the plan, on `day`, after `fromISO` (the month after it).
export function nextPlanDue(fromISO: string, day: number): string {
  const [y, m] = fromISO.split('-').map(Number);
  return isoDay(m === 12 ? y + 1 : y, m === 12 ? 0 : m, day);
}

export function withMonthlyPlan(
  model: HouseholdModel,
  inv: Investment,
  opts: { amount: number; day: number; paymentMethod?: PaymentMethod; firstDue: string; id: string; cycleId: string }
): HouseholdModel {
  const existing = monthlyPlanFor(model, inv.id);
  if (existing) {
    // Change the amount, day and account; payments already made stay as they were.
    return {
      ...model,
      bills: model.bills.map((b) =>
        b.id !== existing.id
          ? b
          : {
              ...b,
              name: inv.name,
              dueDate: { day: String(opts.day) },
              // The one waiting moves to the new day too (review 10-27).
              cycles: (b.cycles || []).map((c) => (num(c.amountPaid) > 0 ? c : { ...c, dueDate: opts.firstDue, amountDue: cents(opts.amount), paymentMethod: opts.paymentMethod })),
            }
      ),
    };
  }
  const bill: Bill = {
    id: opts.id,
    name: inv.name,
    category: 'Investments',
    recurringType: 'monthly',
    dueDate: { day: String(opts.day) },
    priority: '',
    owner: 'shared',
    notes: '',
    cycles: [{ id: opts.cycleId, dueDate: opts.firstDue, amountDue: cents(opts.amount), amountPaid: '', paidDate: '', notes: '', ...(opts.paymentMethod ? { paymentMethod: opts.paymentMethod } : {}) }],
    createdAt: Date.now(),
    regular: true,
    investmentId: inv.id,
  };
  return { ...model, bills: [...(model.bills || []), bill] };
}

export function withoutMonthlyPlan(model: HouseholdModel, investmentId: string): HouseholdModel {
  return { ...model, bills: (model.bills || []).filter((b) => b.investmentId !== investmentId) };
}
