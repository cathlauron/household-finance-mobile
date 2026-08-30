// ============================================================
// Household Finance App — Running balance projection
// ============================================================
// This is the mobile version of the web app's "what will my
// balance be" calendar math (see household-finance-app-spec-
// and-scale.md §7, and the .html file's computeRunningBalances /
// getMonthEvents functions).
//
// It starts from your Cash + Debit + Credit accounts, as of the
// "as of" date you've set, then walks forward (or backward) day
// by day applying anything dated: manual transactions, bill/debt
// payments due, income due, loan payments due, and savings
// contributions.
//
// NOTE: Loans with "Custom" recurrence ARE included, sharing the same
// customOccurrencesInMonth() helper as Bills/Debts.
// NOTE: A "lent" loan (direction: 'lent' — money owed TO you) is
// intentionally excluded from this projection. It isn't money
// going out, so it shouldn't reduce your projected balance.
// NOTE: Income "actual paid" logs aren't factored in yet — every
// projected payday uses the expected amount, not a logged actual
// amount. That refinement can come later, once there's a real
// screen for logging actual paydays.
// ============================================================

import type { HouseholdModel, Bill, Debt, Loan, IncomeSource } from './types';
import { customOccurrencesInMonth } from './recurrence';

export type CalendarEvent = {
  type: 'income' | 'bill' | 'debt' | 'loan' | 'manual' | 'saving';
  label: string;
  amount: number;
  direction?: 'in' | 'out' | 'saving'; // only set for manual transactions
};

function toNumber(v: number | '' | undefined): number {
  return typeof v === 'number' && !isNaN(v) ? v : 0;
}

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseISO(iso: string | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

// ---- Total balance right now (not projected) ----
// Sums every Cash, Debit, and Credit account. Matches the "Total balance" figure
// shown on the web app's Calendar tab.
export function totalLiquidBalance(model: HouseholdModel): number {
  const groups = [model.balanceAccounts.cash, model.balanceAccounts.debit, model.balanceAccounts.credit];
  return groups.reduce((sum, group) => sum + group.reduce((s, a) => s + toNumber(a.amount), 0), 0);
}

// ---- Bill / Debt outstanding amount ----
// How much is currently still owed on a bill or debt, across every logged payment cycle.
export function outstandingBalance(record: Bill | Debt): number {
  return (record.cycles || []).reduce((sum, c) => sum + (toNumber(c.amountDue) - toNumber(c.amountPaid)), 0);
}

// ---- Loan outstanding amount ----
// How much is still left to pay on a loan: the original total amount, minus every
// actual payment logged against it so far. Only meaningful for loans you owe
// (direction: 'borrowed') — a loan someone owes you isn't counted here, matching
// how LoansScreen already filters out direction === 'lent' before totaling what's
// owed for its own payoff-related calculations.
export function loanOutstandingBalance(loan: Loan): number {
  const total = toNumber(loan.totalAmount);
  const paid = (loan.actualPayments || []).reduce((sum, p) => sum + toNumber(p.actual), 0);
  return Math.max(0, total - paid);
}

// ---- Bill / Debt next-due-date resolver ----
// Bills and Debts share the exact same recurrence shape, so one function handles both.
function nextOccurrenceInMonth(record: Bill | Debt, year: number, monthIndex: number): number[] {
  const d = record.dueDate || {};
  const daysInMonth = lastDayOfMonth(year, monthIndex);

  if (record.recurringType === 'monthly') {
    if (!d.day) return [];
    const day = d.day === 'last' ? daysInMonth : parseInt(d.day, 10);
    return day >= 1 && day <= daysInMonth ? [day] : [];
  }

  if (record.recurringType === 'annual') {
    if (!d.day || !d.month || d.month !== monthIndex + 1) return [];
    const day = d.day === 'last' ? daysInMonth : parseInt(d.day, 10);
    return day >= 1 && day <= daysInMonth ? [day] : [];
  }

  if (record.recurringType === 'onetime') {
    if (!d.date) return [];
    const dt = parseISO(d.date);
    if (!dt || dt.getFullYear() !== year || dt.getMonth() !== monthIndex) return [];
    return [dt.getDate()];
  }

  if (record.recurringType === 'custom') {
    return customOccurrencesInMonth(
      record.customStartDate,
      record.customFreq,
      record.customOccurrenceCount,
      year,
      monthIndex
    );
  }

  return [];
}

// ---- Loan next-due-date-in-month resolver ----
// Same day/month/date shape as Bills & Debts (see the type comment at the top of
// this file for the dueDate shapes), but Loans don't have Custom recurrence wired
// up on the data model yet — no customStartDate/customFreq/customOccurrenceCount
// fields exist on the Loan type, and the Loans screen's own recurrence picker
// doesn't offer "Custom" as a choice. So Custom loans simply produce no
// occurrences here for now, same as they already do everywhere else in the app.
function loanOccurrenceInMonth(loan: Loan, year: number, monthIndex: number): number[] {
  const d = loan.dueDate || {};
  const daysInMonth = lastDayOfMonth(year, monthIndex);
  const recurringType = loan.recurringType || 'onetime';

  if (recurringType === 'monthly') {
    if (!d.day) return [];
    const day = d.day === 'last' ? daysInMonth : parseInt(d.day, 10);
    return day >= 1 && day <= daysInMonth ? [day] : [];
  }

  if (recurringType === 'annual') {
    if (!d.day || !d.month || d.month !== monthIndex + 1) return [];
    const day = d.day === 'last' ? daysInMonth : parseInt(d.day, 10);
    return day >= 1 && day <= daysInMonth ? [day] : [];
  }

  if (recurringType === 'onetime') {
    if (!d.date) return [];
    const dt = parseISO(d.date);
    if (!dt || dt.getFullYear() !== year || dt.getMonth() !== monthIndex) return [];
    return [dt.getDate()];
  }

  if (recurringType === 'custom') {
    return customOccurrencesInMonth(
      loan.customStartDate,
      loan.customFreq,
      loan.customOccurrenceCount,
      year,
      monthIndex
    );
  }

  return [];
}


// ---- Income next-payday resolver ----
function incomeOccurrencesInMonth(source: IncomeSource, year: number, monthIndex: number): number[] {
  const daysInMonth = lastDayOfMonth(year, monthIndex);
  const pd = source.payDates || [];

  if (source.frequency === 'monthly' && pd[0]) {
    const day = pd[0] === 'last' ? daysInMonth : parseInt(pd[0], 10);
    return day >= 1 && day <= daysInMonth ? [day] : [];
  }

  if (source.frequency === 'semimonthly') {
    const results: number[] = [];
    pd.forEach((raw) => {
      if (!raw) return;
      const day = raw === 'last' ? daysInMonth : parseInt(raw, 10);
      if (day >= 1 && day <= daysInMonth) results.push(day);
    });
    return results;
  }

  if (source.frequency === 'weekly' && pd[0] !== undefined && pd[0] !== '') {
    const dow = parseInt(pd[0], 10);
    const results: number[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      if (new Date(year, monthIndex, day).getDay() === dow) results.push(day);
    }
    return results;
  }

  if (source.frequency === 'biweekly' && pd[0]) {
    const anchor = parseISO(pd[0]);
    if (!anchor) return [];
    const results: number[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dt = stripTime(new Date(year, monthIndex, day));
      const diffDays = Math.round((dt.getTime() - stripTime(anchor).getTime()) / 86400000);
      if (((diffDays % 14) + 14) % 14 === 0) results.push(day);
    }
    return results;
  }

  if (source.frequency === 'onetime' && pd[0]) {
    const dt = parseISO(pd[0]);
    if (dt && dt.getFullYear() === year && dt.getMonth() === monthIndex) return [dt.getDate()];
  }

  return [];
}

// ---- Every dated event in one month, grouped by day-of-month ----
export function computeMonthEvents(
  model: HouseholdModel,
  year: number,
  monthIndex: number
): Record<number, CalendarEvent[]> {
  const map: Record<number, CalendarEvent[]> = {};
  function push(day: number, event: CalendarEvent) {
    if (!map[day]) map[day] = [];
    map[day].push(event);
  }

  model.bills.forEach((bill) => {
    const amount = Math.max(0, outstandingBalance(bill));
    nextOccurrenceInMonth(bill, year, monthIndex).forEach((day) => {
      push(day, { type: 'bill', label: bill.name || 'Bill', amount });
    });
  });

  model.debts.forEach((debt) => {
    const amount = Math.max(0, outstandingBalance(debt));
    nextOccurrenceInMonth(debt, year, monthIndex).forEach((day) => {
      push(day, { type: 'debt', label: debt.creditorOrPerson || 'Debt', amount });
    });
  });

  model.loans.forEach((loan) => {
    if (loan.direction === 'lent') return; // money owed TO you, not an expense — skip
    const amount = toNumber(loan.expectedPayment);
    if (amount <= 0) return;
    loanOccurrenceInMonth(loan, year, monthIndex).forEach((day) => {
      push(day, { type: 'loan', label: loan.name || 'Loan', amount });
    });
  });

  model.income.forEach((source) => {
    const amount = toNumber(source.expectedAmount);
    incomeOccurrencesInMonth(source, year, monthIndex).forEach((day) => {
      push(day, { type: 'income', label: source.sourceName || source.category || 'Income', amount });
    });
  });

  model.manualTransactions.forEach((t) => {
    const dt = parseISO(t.date);
    if (!dt || dt.getFullYear() !== year || dt.getMonth() !== monthIndex) return;
    push(dt.getDate(), { type: 'manual', label: t.label || 'Transaction', amount: t.amount, direction: t.direction });
  });

  model.savingsGoals.forEach((goal) => {
    (goal.contributions || []).forEach((c) => {
      const dt = parseISO(c.date);
      if (!dt || dt.getFullYear() !== year || dt.getMonth() !== monthIndex) return;
      const amount = toNumber(c.amount);
      if (amount <= 0) return;
      push(dt.getDate(), { type: 'saving', label: `${goal.name || 'Savings'} contribution`, amount });
    });
  });

  return map;
}

// How much one event moves the liquid balance: income adds, everything else subtracts.
function eventDelta(event: CalendarEvent): number {
  if (event.type === 'income') return event.amount;
  if (event.type === 'manual') return event.direction === 'in' ? event.amount : -event.amount;
  return -event.amount; // bill, debt, loan, saving
}

function accountsAsOfDate(model: HouseholdModel): Date {
  const parsed = parseISO(model.balanceAccounts.asOfDate);
  return parsed ? stripTime(parsed) : stripTime(new Date());
}

// ---- Projected balance for every day in one month ----
// Mirrors the web app's computeRunningBalances(): starts from the account totals as of
// their "as of" date, then adds up every day's events between that date and the month
// being viewed (in whichever direction), so the projection is correct even when looking
// at a month before or after the "as of" date.
export function computeRunningBalances(
  model: HouseholdModel,
  year: number,
  monthIndex: number
): Record<number, number> {
  const daysInMonth = lastDayOfMonth(year, monthIndex);
  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex, daysInMonth);
  const asOf = accountsAsOfDate(model);
  const totalStart = totalLiquidBalance(model);

  const rangeStart = asOf < monthStart ? asOf : monthStart;
  const rangeEnd = asOf > monthEnd ? asOf : monthEnd;

  // Walk every month between rangeStart and rangeEnd, collecting a delta per date.
  const deltaByDate: Record<string, number> = {};
  let y = rangeStart.getFullYear();
  let m = rangeStart.getMonth();
  const endY = rangeEnd.getFullYear();
  const endM = rangeEnd.getMonth();
  while (y < endY || (y === endY && m <= endM)) {
    const events = computeMonthEvents(model, y, m);
    Object.keys(events).forEach((dayStr) => {
      const day = parseInt(dayStr, 10);
      const dateObj = stripTime(new Date(y, m, day));
      if (dateObj < rangeStart || dateObj > rangeEnd) return;
      const key = toISO(dateObj);
      const dayTotal = events[day].reduce((sum, ev) => sum + eventDelta(ev), 0);
      deltaByDate[key] = (deltaByDate[key] || 0) + dayTotal;
    });
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }

  // Turn the per-day deltas into a running (cumulative) total, then read off whichever
  // days we actually need for the visible month.
  const prefix: Record<string, number> = {};
  let cumulative = 0;
  const cursor = new Date(rangeStart);
  while (cursor <= rangeEnd) {
    const key = toISO(cursor);
    cumulative += deltaByDate[key] || 0;
    prefix[key] = cumulative;
    cursor.setDate(cursor.getDate() + 1);
  }
  const asOfKey = toISO(asOf);
  const cumulativeAtAsOf = prefix[asOfKey] !== undefined ? prefix[asOfKey] : 0;

  const result: Record<number, number> = {};
  for (let day = 1; day <= daysInMonth; day++) {
    const key = toISO(new Date(year, monthIndex, day));
    const cumulativeAtDay = prefix[key] !== undefined ? prefix[key] : 0;
    result[day] = totalStart + (cumulativeAtDay - cumulativeAtAsOf);
  }
  return result;
}

// ---- Peso formatting ----
// Small local helper so Calendar doesn't need its own copy — matches the web app's
// two-decimal-places style.
export function formatPeso(amount: number, currencySymbol: string = '₱'): string {
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${isNegative ? '-' : ''}${currencySymbol}${formatted}`;
}
