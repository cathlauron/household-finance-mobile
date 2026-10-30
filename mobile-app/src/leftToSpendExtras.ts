import type { HouseholdModel } from './types';
import { computeMonthEvents, eventDelta, totalCurrentBalance, type CalendarEvent } from './balanceProjection';
import { isTrackedLoan, loanCoverage, loanScheduledDates } from './loanSchedule';
import { nextEventDate, eventBudget } from './eventDates';

// H-52 (Cath, 2026-10-29): Left to Spend takes off EVERYTHING due before the next payday:
// "bills, debts, loans, plans, as long as the date falls before the next pay date". Her
// answers: anything past due and unpaid comes off; debts with no due date don't (they have
// their own total on Debts); plans not yet paid or bought come off: the grocery list, trips
// that start before payday, events before payday, and any other planned amount.
//
// Left to Spend = what is in your accounts NOW (the live balances, which already include
// every payment logged) + the lines below, up to the day before payday. Every line is
// something she can recognise on "Where it comes from", and they add up exactly:
// - Past due: bill / debt rounds and loan payments whose date has passed, still unpaid.
// - Bills, Debts (due today or later, unpaid), Loans (scheduled payments not paid yet;
//   one paid ahead is not counted again), Savings top-ups and Planned transactions dated
//   after today, and Income expected before payday (another person's payday, say).
// - Groceries list, Trips (starting before payday), Events (before payday): planned, not
//   yet bought or paid, less what is already saved for it in its own savings pot.
// Savings pots that add "every payday" add ON the payday, so they come out of the next pay.
// Each line is money coming in (+) or going out (-).

export type LeftToSpendLine = { label: string; amount: number };

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const cents = (n: number) => Math.round(n * 100) / 100;

const LABEL: Record<CalendarEvent['type'], string> = {
  bill: 'Bills',
  debt: 'Debts',
  loan: 'Loans',
  saving: 'Savings top-ups',
  manual: 'Planned transactions',
  income: 'Income',
};
// The order the lines are shown in (money in first, then what's due soonest to plans).
const ORDER = ['Income', 'Past due', 'Bills', 'Debts', 'Loans', 'Savings top-ups', 'Planned transactions', 'Groceries list', 'Trips', 'Events'];

// One thing that makes up Left to Spend (L4 page, Cath 2026-10-29): what it is, a short line
// under it ("Past due · was due Oct 16"), the money (+ in / - out), and its group (the line it
// belongs to). `ref` says where tapping it goes.
export type LeftToSpendItem = {
  group: string;
  name: string;
  sub: string;
  amount: number;
  date?: string;
  ref?: { kind: 'bill' | 'debt' | 'loan'; id: string } | { kind: 'trip' | 'event' | 'groceries' | 'transactions' | 'savings' | 'income' };
};

const short = (isoDate: string) => new Date(isoDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const shortDay = (isoDate: string) => new Date(isoDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

export function leftToSpendItems(model: HouseholdModel, today: Date, target: Date): LeftToSpendItem[] {
  const todayISO = iso(today);
  const end = iso(target);
  const items: LeftToSpendItem[] = [];
  const push = (it: LeftToSpendItem) => {
    if (Math.abs(it.amount) >= 0.005) items.push({ ...it, amount: cents(it.amount) });
  };
  const tracked = new Set((model.loans || []).filter((l) => l.direction !== 'lent' && isTrackedLoan(l) && num(l.expectedPayment) > 0).map((l) => l.id));
  const KIND: Record<CalendarEvent['type'], string> = { bill: 'Bill', debt: 'Debt', loan: 'Loan', saving: 'Savings', manual: 'Planned', income: 'Income' };

  // The calendar's events from today to the Left to Spend date. Today: only bills, debts and
  // loans still unpaid (today's transactions, moves and paydays are already in the balances).
  let y = today.getFullYear();
  let m = today.getMonth();
  while (y < target.getFullYear() || (y === target.getFullYear() && m <= target.getMonth())) {
    const events = computeMonthEvents(model, y, m);
    for (const day of Object.keys(events)) {
      const d = iso(new Date(y, m, Number(day)));
      if (d < todayISO || d > end) continue;
      for (const ev of events[Number(day)]) {
        if (ev.type === 'loan' && ev.id && tracked.has(ev.id)) continue; // counted from its schedule below
        if (d === todayISO && ev.type !== 'bill' && ev.type !== 'debt' && ev.type !== 'loan') continue;
        const ref: LeftToSpendItem['ref'] = ev.type === 'bill' || ev.type === 'debt' || ev.type === 'loan' ? (ev.id ? { kind: ev.type, id: ev.id } : undefined) : ev.type === 'income' ? { kind: 'income' } : ev.type === 'saving' ? { kind: 'savings' } : { kind: 'transactions' };
        push({ group: LABEL[ev.type], name: ev.label, sub: `${KIND[ev.type]} · ${ev.type === 'income' ? '' : 'due '}${shortDay(d)}`, amount: eventDelta(ev), date: d, ref });
      }
    }
    m += 1;
    if (m > 11) { m = 0; y += 1; }
  }

  // Past due bill and debt rounds.
  for (const [kind, list] of [['bill', model.bills || []], ['debt', model.debts || []]] as const) {
    for (const rec of list as any[]) {
      for (const c of rec.cycles || []) {
        if (!c.dueDate || c.dueDate >= todayISO) continue;
        const owed = num(c.amountDue) - num(c.amountPaid);
        if (owed > 0.005) push({ group: 'Past due', name: rec.name || rec.creditorOrPerson || (kind === 'bill' ? 'Bill' : 'Debt'), sub: `Past due · was due ${short(c.dueDate)}`, amount: -owed, date: c.dueDate, ref: { kind, id: rec.id } });
      }
    }
  }

  // Loans with a schedule: every scheduled payment up to the Left to Spend date that isn't
  // paid yet (a part payment counts), past ones as Past due.
  for (const loan of model.loans || []) {
    if (!tracked.has(loan.id)) continue;
    const each = num(loan.expectedPayment);
    const cov = loanCoverage(loan, todayISO);
    for (const d of loanScheduledDates(loan, end)) {
      const left = cov.covered[d] ? 0 : d === cov.nextOpen ? cov.leftForNext : each;
      const past = d < todayISO;
      push({ group: past ? 'Past due' : 'Loans', name: loan.name || 'Loan', sub: past ? `Past due · was due ${short(d)}` : `Loan · due ${shortDay(d)}`, amount: -left, date: d, ref: { kind: 'loan', id: loan.id } });
    }
  }

  // Plans not yet bought or paid.
  const potSaved = (id?: string) => {
    const g = id ? (model.savingsGoals || []).find((x) => x.id === id) : undefined;
    return g ? (g.contributions || []).reduce((s, c) => s + num(c.amount), 0) : 0;
  };
  const toBuy = (model.groceries || []).filter((g) => !g.purchased && num(g.plannedAmount) > 0);
  push({ group: 'Groceries list', name: 'Grocery list', sub: `${toBuy.length} ${toBuy.length === 1 ? 'item' : 'items'} not bought yet`, amount: -toBuy.reduce((s, g) => s + num(g.plannedAmount), 0), ref: { kind: 'groceries' } });
  for (const trip of model.travel || []) {
    if (!trip.startDate || trip.startDate > end || (trip.endDate || trip.startDate) < todayISO) continue;
    const unpaid = (trip.checklist || []).filter((i) => !i.checked).reduce((s, i) => s + num(i.cost), 0);
    const saved = potSaved(trip.savingsGoalId);
    push({ group: 'Trips', name: trip.name || 'Trip', sub: `Trip · starts ${shortDay(trip.startDate)}${saved > 0 ? ' · less what\'s saved' : ''}`, amount: -Math.max(0, unpaid - saved), date: trip.startDate, ref: { kind: 'trip' } });
  }
  for (const ev of model.events || []) {
    if (ev.completed) continue;
    const date = nextEventDate(ev, todayISO);
    if (!date || date < todayISO || date > end) continue;
    const saved = potSaved(ev.savingsGoalId);
    push({ group: 'Events', name: ev.name || 'Event', sub: `Event · ${shortDay(date)}${saved > 0 ? ' · less what\'s saved' : ''}`, amount: -Math.max(0, eventBudget(ev) - saved), date, ref: { kind: 'event' } });
  }
  return items;
}

export function leftToSpendLines(model: HouseholdModel, today: Date, target: Date): LeftToSpendLine[] {
  const sums: Record<string, number> = {};
  for (const it of leftToSpendItems(model, today, target)) sums[it.group] = cents((sums[it.group] || 0) + it.amount);
  return Object.keys(sums)
    .filter((k) => Math.abs(sums[k]) >= 0.005)
    .sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))
    .map((label) => ({ label, amount: sums[label] }));
}

// Left to Spend: the live balances now plus every line above.
export function leftToSpendAmount(model: HouseholdModel, today: Date, target: Date): { now: number; lines: LeftToSpendLine[]; amount: number } {
  const now = cents(totalCurrentBalance(model));
  const lines = leftToSpendLines(model, today, target);
  return { now, lines, amount: cents(now + lines.reduce((s, l) => s + l.amount, 0)) + 0 };
}
