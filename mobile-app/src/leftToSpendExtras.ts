import type { HouseholdModel, Loan } from './types';
import { computeMonthEvents } from './balanceProjection';
import { isTrackedLoan, loanCoverage, loanScheduledDates } from './loanSchedule';
import { nextEventDate, eventBudget } from './eventDates';

// H-52 (Cath, 2026-10-29): Left to Spend takes off EVERYTHING due before the next payday:
// "bills, debts, loans, plans, as long as the date falls before the next pay date". Her
// answers: anything past due and unpaid comes off; debts with no due date don't (they have
// their own total on Debts); plans not yet paid or bought come off: the grocery list, trips
// that start before payday, events before payday, and any other planned amount.
//
// Left to Spend itself is a projection from the saved account balances ("as of" a date)
// through the calendar's events up to the day before payday. These lines are only what that
// projection misses, so nothing is counted twice:
// - Past due: bill / debt rounds and loan payments due ON OR BEFORE the balances' "as of"
//   date and still unpaid (later ones are already in the projection as events).
// - Loans: the projection takes off every scheduled loan date, paid or not, and never the
//   payments themselves. Each loan is set right: payments made after the "as of" date, plus
//   what's still unpaid up to the Left to Spend date, minus what the projection took off.
// - Groceries list, Trips, Events: planned and not yet bought / paid, less what is already
//   saved for it in its own savings pot (that money already left the accounts).
// Savings pots that add "every payday" add ON the payday, so they come out of the next pay.
// Each line is money that comes off (negative) or goes back (positive).

export type ExtraLine = { label: string; amount: number };

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const cents = (n: number) => Math.round(n * 100) / 100;

// What the projection took off for this loan between "as of" (not included) and the end date.
function projectedLoanOut(model: HouseholdModel, loan: Loan, asOf: string, end: string): number {
  let total = 0;
  const from = new Date(asOf + 'T00:00:00');
  const to = new Date(end + 'T00:00:00');
  let y = from.getFullYear();
  let m = from.getMonth();
  while (y < to.getFullYear() || (y === to.getFullYear() && m <= to.getMonth())) {
    const events = computeMonthEvents(model, y, m);
    for (const day of Object.keys(events)) {
      const d = iso(new Date(y, m, Number(day)));
      if (d <= asOf || d > end) continue;
      for (const ev of events[Number(day)]) if (ev.type === 'loan' && ev.id === loan.id) total += ev.amount;
    }
    m += 1;
    if (m > 11) { m = 0; y += 1; }
  }
  return total;
}

export function leftToSpendExtras(model: HouseholdModel, today: Date, target: Date): ExtraLine[] {
  const todayISO = iso(today);
  const end = iso(target);
  const asOf = model.balanceAccounts?.asOfDate || todayISO;
  const sums: Record<string, number> = {};
  const add = (label: string, amount: number) => {
    if (Math.abs(amount) < 0.005) return;
    sums[label] = cents((sums[label] || 0) + amount);
  };

  // Past due bill and debt rounds, due on or before the "as of" date.
  for (const rec of [...(model.bills || []), ...(model.debts || [])]) {
    for (const c of rec.cycles || []) {
      if (!c.dueDate || c.dueDate >= todayISO || c.dueDate > asOf) continue;
      const owed = num(c.amountDue) - num(c.amountPaid);
      if (owed > 0.005) add('Past due', -owed);
    }
  }

  // Loans you owe that are tracked (a schedule from their first payment).
  for (const loan of model.loans || []) {
    if (loan.direction === 'lent' || !isTrackedLoan(loan)) continue;
    const each = num(loan.expectedPayment);
    if (each <= 0) continue;
    const cov = loanCoverage(loan, todayISO);
    const left = (d: string) => (cov.covered[d] ? 0 : d === cov.nextOpen ? cov.leftForNext : each);
    const dates = loanScheduledDates(loan, end);
    const pastDue = dates.filter((d) => d < todayISO && d <= asOf).reduce((s, d) => s + left(d), 0);
    const unpaid = dates.reduce((s, d) => s + left(d), 0);
    const paidSince = (loan.actualPayments || [])
      .filter((p) => !p.recordedOnly && p.date > asOf && p.date <= todayISO)
      .reduce((s, p) => s + num(p.actual), 0);
    const projected = projectedLoanOut(model, loan, asOf, end);
    const correction = -(paidSince + unpaid - projected);
    add('Past due', -pastDue);
    add('Loans', correction + pastDue);
  }

  // Plans not yet bought or paid.
  const potSaved = (id?: string) => {
    const g = id ? (model.savingsGoals || []).find((x) => x.id === id) : undefined;
    return g ? (g.contributions || []).reduce((s, c) => s + num(c.amount), 0) : 0;
  };
  add('Groceries list', -(model.groceries || []).filter((g) => !g.purchased).reduce((s, g) => s + num(g.plannedAmount), 0));
  for (const trip of model.travel || []) {
    if (!trip.startDate || trip.startDate > end || (trip.endDate || trip.startDate) < todayISO) continue;
    const unpaid = (trip.checklist || []).filter((i) => !i.checked).reduce((s, i) => s + num(i.cost), 0);
    add('Trips', -Math.max(0, unpaid - potSaved(trip.savingsGoalId)));
  }
  for (const ev of model.events || []) {
    if (ev.completed) continue;
    const date = nextEventDate(ev, todayISO);
    if (!date || date < todayISO || date > end) continue;
    add('Events', -Math.max(0, eventBudget(ev) - potSaved(ev.savingsGoalId)));
  }

  return Object.keys(sums).filter((k) => Math.abs(sums[k]) >= 0.005).map((label) => ({ label, amount: sums[label] }));
}
