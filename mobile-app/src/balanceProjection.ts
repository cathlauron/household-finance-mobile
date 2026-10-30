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

import type { HouseholdModel, Bill, Debt, Loan, IncomeSource, PaymentMethod, BalanceAccountEntry } from './types';
import { accountEffect as investmentAccountEffect } from './investments';
import { isCyclePaid, lastPaidDueDate } from './billPayments';
import { customOccurrencesInMonth, stripTime } from './recurrence';
import { computeNextPayDate } from './income';
import { leftToSpendAmount } from './leftToSpendExtras';

export type CalendarEvent = {
  type: 'income' | 'bill' | 'debt' | 'loan' | 'manual' | 'saving';
  label: string;
  amount: number;
  direction?: 'in' | 'out' | 'saving'; // only set for manual transactions
  id?: string; // set for bill, debt and loan events
  regular?: boolean; // a bill that is a regular payment (Cath, 2026-10-27)
};

function toNumber(v: number | '' | undefined): number {
  return typeof v === 'number' && !isNaN(v) ? v : 0;
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

// ---- Early / late paydays (redesign) ----
// You might be paid a day or two before or after the expected payday. A logged payday
// within this many days of an expected one counts as that payday, so the expected
// amount isn't added again. The window is under half the gap between paydays, so one
// logged payday can never stand in for two expected ones.
function paydayWindowDays(frequency: string): number {
  switch (frequency) {
    case 'weekly':
      return 3;
    case 'biweekly':
    case 'semimonthly':
      return 6;
    default:
      return 10; // monthly, one-time
  }
}

export function isPaydayReceived(source: IncomeSource, expectedISO: string): boolean {
  const expected = parseISO(expectedISO);
  if (!expected) return false;
  const windowMs = paydayWindowDays(source.frequency) * 86400000;
  return (source.paymentLog || []).some((e) => {
    const got = parseISO(e.date);
    return !!got && toNumber(e.amount) > 0 && Math.abs(stripTime(got).getTime() - stripTime(expected).getTime()) <= windowMs;
  });
}

// ---- Live account balances (redesign) ----
// An account's saved balance is true as of the moment the balances were last updated on
// the Accounts page. Anything paid from or into that account since then moves it:
// transactions, bills and debts marked paid, loan payments, and money put into or taken
// out of savings pots. Moving money between accounts already changes the saved balances
// directly, so transfers aren't counted again here. Items dated in the future don't
// count yet. The saved balance itself is never changed by this; updating a balance on
// the Accounts page folds this activity in and starts afresh.
export type SpendingGroup = 'cash' | 'debit' | 'credit';

export function happenedSinceUpdate(model: HouseholdModel, date: string | undefined, at: number | undefined, today: string): boolean {
  const asOf = model.balanceAccounts.asOfDate;
  if (!date || !asOf || date > today) return false;
  if (date > asOf) return true;
  if (date === asOf) {
    const asOfAt = model.balanceAccounts.asOfAt;
    return !!asOfAt && !!at && at > asOfAt;
  }
  return false;
}

export function accountActivitySinceUpdate(model: HouseholdModel, group: SpendingGroup, accountId: string): number {
  // Cash paid without picking a cash account counts against the first cash account.
  const firstCashId = model.balanceAccounts.cash[0]?.id;
  const matches = (pm?: PaymentMethod) =>
    !!pm &&
    pm.type === group &&
    (pm.accountId === accountId || (group === 'cash' && !pm.accountId && accountId === firstCashId));
  const today = toISO(new Date());
  let delta = 0;
  (model.manualTransactions || []).forEach((t) => {
    if (!matches(t.paymentMethod) || !happenedSinceUpdate(model, t.date, t.createdAt, today)) return;
    delta += t.direction === 'in' ? toNumber(t.amount) : -toNumber(t.amount);
  });
  [...model.bills, ...model.debts].forEach((r) =>
    (r.cycles || []).forEach((c) => {
      if (!c.paidDate || !matches(c.paymentMethod) || !happenedSinceUpdate(model, c.paidDate, c.paidAt, today)) return;
      delta -= toNumber(c.amountPaid);
    })
  );
  (model.loans || []).forEach((l) =>
    (l.actualPayments || []).forEach((p) => {
      if (!matches(p.paymentMethod) || !happenedSinceUpdate(model, p.date, p.createdAt, today)) return;
      delta += l.direction === 'lent' ? toNumber(p.actual) : -toNumber(p.actual);
    })
  );
  (model.income || []).forEach((s) =>
    (s.paymentLog || []).forEach((e) => {
      if (!matches(e.paymentMethod) || !happenedSinceUpdate(model, e.date, e.createdAt, today)) return;
      delta += toNumber(e.amount); // a logged payday adds to the account it went into
    })
  );
  (model.savingsGoals || []).forEach((g) =>
    (g.contributions || []).forEach((c) => {
      if (!matches(c.paymentMethod) || !happenedSinceUpdate(model, c.date, c.createdAt, today)) return;
      delta -= toNumber(c.amount); // put in = leaves the account; taken out (negative) = comes back
    })
  );
  // Cath 2026-10-27 (canvas I1): money put into an investment leaves the account; money
  // taken out comes back to it. What an investment is worth never counts here.
  (model.investments || []).forEach((inv) =>
    (inv.entries || []).forEach((e) => {
      if (!happenedSinceUpdate(model, e.date, e.createdAt, today)) return;
      delta += investmentAccountEffect(e, matches);
    })
  );
  return delta;
}

export function accountCurrentBalance(model: HouseholdModel, group: SpendingGroup, account: BalanceAccountEntry): number {
  return toNumber(account.amount) + accountActivitySinceUpdate(model, group, account.id);
}

// The same account with its live balance in place of the saved one (for display).
export function withCurrentBalance(model: HouseholdModel, group: SpendingGroup, account: BalanceAccountEntry): BalanceAccountEntry {
  return { ...account, amount: accountCurrentBalance(model, group, account) };
}

export function totalCurrentBalance(model: HouseholdModel): number {
  return (['cash', 'debit', 'credit'] as SpendingGroup[]).reduce(
    (sum, g) => sum + model.balanceAccounts[g].reduce((s, a) => s + accountCurrentBalance(model, g, a), 0),
    0
  );
}

// Updating balances on the Accounts page: every spending account's saved balance
// becomes its live balance, so nothing paid since the last update is lost when the
// "as of" moment moves to now.
export function bakeCurrentBalances(model: HouseholdModel): HouseholdModel['balanceAccounts'] {
  const ba = model.balanceAccounts;
  return {
    ...ba,
    cash: ba.cash.map((a) => withCurrentBalance(model, 'cash', a)),
    debit: ba.debit.map((a) => withCurrentBalance(model, 'debit', a)),
    credit: ba.credit.map((a) => withCurrentBalance(model, 'credit', a)),
  };
}

// ---- Bill / Debt outstanding amount ----
// How much is currently still owed on a bill or debt, across every logged payment cycle.
export function outstandingBalance(record: Bill | Debt): number {
  // Code review 2026-10-27: paying more than was due on one round never makes later
  // rounds look smaller (each round counts at most what it still owes).
  return (record.cycles || []).reduce((sum, c) => sum + Math.max(0, toNumber(c.amountDue) - toNumber(c.amountPaid)), 0);
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

function latestCycleAmount(record: Bill | Debt): number {
  if (!record.cycles || record.cycles.length === 0) return 0;
  const last = record.cycles[record.cycles.length - 1];
  return typeof last.amountDue === 'number' && !isNaN(last.amountDue) ? last.amountDue : 0;
}

// ---- Comprehensive Monthly Obligations Baseline ----
// Combines recurring bills, debt minimum payments, and borrowed loan payments into
// a single monthly outflow baseline.
// - Monthly items counted fully
// - Annual items divided by 12
// - One-time and custom schedules excluded
// - 'Lent' loans excluded (money owed to you, not an expense)
export function computeMonthlyObligationsBaseline(
  bills: Bill[] = [],
  debts: Debt[] = [],
  loans: Loan[] = []
): number {
  let total = 0;

  // 1. Recurring Bills
  for (const bill of bills) {
    const amount = latestCycleAmount(bill);
    if (bill.recurringType === 'monthly') {
      total += amount;
    } else if (bill.recurringType === 'annual') {
      total += amount / 12;
    }
  }

  // 2. Recurring Debts (prefer minPayment; fallback to latest cycle amountDue)
  for (const debt of debts) {
    const minPay = typeof debt.minPayment === 'number' && !isNaN(debt.minPayment) && debt.minPayment > 0
      ? debt.minPayment
      : latestCycleAmount(debt);

    if (debt.recurringType === 'monthly') {
      total += minPay;
    } else if (debt.recurringType === 'annual') {
      total += minPay / 12;
    }
  }

  // 3. Recurring Borrowed Loans (expectedPayment)
  for (const loan of loans) {
    if (loan.direction === 'lent') continue; // Skip money owed to you
    const payment = typeof loan.expectedPayment === 'number' && !isNaN(loan.expectedPayment) && loan.expectedPayment > 0
      ? loan.expectedPayment
      : 0;

    const recurType = loan.recurringType || 'onetime';
    if (recurType === 'monthly') {
      total += payment;
    } else if (recurType === 'annual') {
      total += payment / 12;
    }
  }

  return total;
}

// ---- Bill / Debt next-due-date resolver ----
// Bills and Debts share the exact same recurrence shape, so one function handles both.
function nextOccurrenceInMonth(record: Bill | Debt, year: number, monthIndex: number): number[] {
  const d = record.dueDate || {};
  const daysInMonth = lastDayOfMonth(year, monthIndex);

  // 2026-10-27 (Cath): a day past the month's end (the 31st in November) falls on the
  // month's last day, the same as the Bills / Debts pages (it used to show nowhere).
  if (record.recurringType === 'monthly') {
    if (!d.day) return [];
    const day = d.day === 'last' ? daysInMonth : Math.min(parseInt(d.day, 10), daysInMonth);
    return day >= 1 ? [day] : [];
  }

  if (record.recurringType === 'annual') {
    if (!d.day || !d.month || Number(d.month) !== monthIndex + 1) return [];
    const day = d.day === 'last' ? daysInMonth : Math.min(parseInt(d.day, 10), daysInMonth);
    return day >= 1 ? [day] : [];
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
  // Version 2.1: nothing is due before a repeating loan's first payment.
  if ((recurringType === 'monthly' || recurringType === 'annual') && typeof d.firstDate === 'string' && d.firstDate) {
    const days = loanOccurrenceInMonthPlain(loan, year, monthIndex);
    const pad = (n: number) => String(n).padStart(2, '0');
    return days.filter((day) => `${year}-${pad(monthIndex + 1)}-${pad(day)}` >= d.firstDate);
  }
  return loanOccurrenceInMonthPlain(loan, year, monthIndex);
}

function loanOccurrenceInMonthPlain(loan: Loan, year: number, monthIndex: number): number[] {
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
export function incomeOccurrencesInMonth(source: IncomeSource, year: number, monthIndex: number): number[] {
  const daysInMonth = lastDayOfMonth(year, monthIndex);
  const pd = source.payDates || [];

  if (source.frequency === 'monthly' && pd[0]) {
    const rawDay = pd[0] === 'last' ? daysInMonth : parseInt(pd[0], 10);
    if (isNaN(rawDay) || rawDay < 1) return [];
    return [Math.min(rawDay, daysInMonth)];
  }

  if (source.frequency === 'semimonthly') {
    const results: number[] = [];
    pd.forEach((raw) => {
      if (!raw) return;
      const rawDay = raw === 'last' ? daysInMonth : parseInt(raw, 10);
      if (isNaN(rawDay) || rawDay < 1) return;
      results.push(Math.min(rawDay, daysInMonth));
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
// 2.2 speed sweep: Home, Left to Spend, the mood colours and the calendar all ask for the
// same months again and again. Each month is now worked out once per version of your data
// (and per day, since "today" matters) and reused. Nothing that reads it changes it.
const monthEventsCache = new WeakMap<object, Map<string, Record<number, CalendarEvent[]>>>();
// The days in a month a bill or debt is due (calendar, Home's Due soon).
// 2026-10-27 (Cath: a debt due Oct 30 on the Debts page was missing from Oct 30 on the
// calendar): a saved payment round has its own due date, which can differ from the
// repeat day (the Debts page shows that date). In a month with a saved round, its date is
// the one used; in other months, the repeat day. Rounds already paid don't show again
// (and, as before, nothing up to the newest paid due date shows).
function dueDaysInMonth(record: Bill | Debt, year: number, monthIndex: number): number[] {
  const ym = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
  const rounds = (record.cycles || []).filter((c) => typeof c.dueDate === 'string' && c.dueDate.startsWith(ym));
  if (rounds.length > 0) {
    const days = rounds
      .filter((c) => !isCyclePaid(c))
      .map((c) => parseInt(c.dueDate.slice(8, 10), 10))
      .filter((d) => d >= 1);
    return Array.from(new Set(days)).sort((a, b) => a - b);
  }
  const paidUpTo = lastPaidDueDate(record);
  return nextOccurrenceInMonth(record, year, monthIndex).filter(
    (day) => !(paidUpTo && toISO(new Date(year, monthIndex, day)) <= paidUpTo)
  );
}

export function computeMonthEvents(
  model: HouseholdModel,
  year: number,
  monthIndex: number
): Record<number, CalendarEvent[]> {
  let byMonth = monthEventsCache.get(model);
  if (!byMonth) {
    byMonth = new Map();
    monthEventsCache.set(model, byMonth);
  }
  const key = `${toISO(stripTime(new Date()))}|${year}-${monthIndex}`;
  const hit = byMonth.get(key);
  if (hit) return hit;
  const fresh = computeMonthEventsNow(model, year, monthIndex);
  byMonth.set(key, fresh);
  return fresh;
}

function computeMonthEventsNow(
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
    dueDaysInMonth(bill, year, monthIndex).forEach((day) => {
      push(day, { type: 'bill', label: bill.name || 'Bill', amount, id: bill.id, ...(bill.regular ? { regular: true } : {}) });
    });
  });

  model.debts.forEach((debt) => {
    const amount = Math.max(0, outstandingBalance(debt));
    dueDaysInMonth(debt, year, monthIndex).forEach((day) => {
      push(day, { type: 'debt', label: debt.creditorOrPerson || 'Debt', amount, id: debt.id });
    });
  });

  model.loans.forEach((loan) => {
    if (loan.direction === 'lent') return; // money owed TO you, not an expense — skip
    const amount = toNumber(loan.expectedPayment);
    if (amount <= 0) return;
    loanOccurrenceInMonth(loan, year, monthIndex).forEach((day) => {
      push(day, { type: 'loan', label: loan.name || 'Loan', amount, id: loan.id });
    });
  });

  // Redesign: expected income is only a projection, so it counts from tomorrow on.
  // Paydays you've logged (money actually received) count on the day they came in.
  const todayKey = toISO(stripTime(new Date()));
  model.income.forEach((source) => {
    const amount = toNumber(source.expectedAmount);
    const label = source.sourceName || source.category || 'Income';
    incomeOccurrencesInMonth(source, year, monthIndex).forEach((day) => {
      const key = toISO(new Date(year, monthIndex, day));
      if (key <= todayKey) return;
      if (isPaydayReceived(source, key)) return; // already logged a day or two early
      push(day, { type: 'income', label, amount });
    });
    (source.paymentLog || []).forEach((e) => {
      const dt = parseISO(e.date);
      if (!dt || dt.getFullYear() !== year || dt.getMonth() !== monthIndex) return;
      const got = toNumber(e.amount);
      if (got > 0) push(dt.getDate(), { type: 'income', label: `${label} (received)`, amount: got });
    });
  });

  // Redesign: bill and debt payments marked paid in the app take money out on the day
  // they were paid (only cycles stamped with paidAt, i.e. paid through "Mark as paid").
  [...model.bills, ...model.debts].forEach((rec) => {
    (rec.cycles || []).forEach((c) => {
      if (!c.paidAt || !c.paidDate) return;
      const dt = parseISO(c.paidDate);
      if (!dt || dt.getFullYear() !== year || dt.getMonth() !== monthIndex) return;
      const label = 'name' in rec ? rec.name || 'Bill' : rec.creditorOrPerson || 'Debt';
      push(dt.getDate(), { type: 'manual', label: `${label} payment`, amount: toNumber(c.amountPaid), direction: 'out' });
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
      if (amount === 0) return; // negative = moved back out of the pot (adds to spending money)
      push(dt.getDate(), { type: 'saving', label: `${goal.name || 'Savings'} contribution`, amount });
    });
  });

  return map;
}

// How much one event moves the liquid balance: income adds, everything else subtracts.
export function eventDelta(event: CalendarEvent): number {
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
  // The account totals are true as of the moment they were last updated. Transactions
  // on that same day that were logged AFTER the update aren't in them yet, so add them
  // on top (the day's events are otherwise treated as already included).
  const asOfAt = model.balanceAccounts.asOfAt;
  const asOfISO = toISO(asOf);
  const loggedAfterUpdate =
    asOfAt && model.balanceAccounts.asOfDate
      ? model.manualTransactions
          .filter((t) => t.date === asOfISO && (t.createdAt ?? 0) > asOfAt)
          .reduce((sum, t) => sum + (t.direction === 'in' ? t.amount : -t.amount), 0) -
        [...model.bills, ...model.debts]
          .flatMap((r) => r.cycles || [])
          .filter((c) => c.paidDate === asOfISO && (c.paidAt ?? 0) > asOfAt)
          .reduce((sum, c) => sum + toNumber(c.amountPaid), 0) -
        (model.savingsGoals || [])
          .flatMap((g) => g.contributions || [])
          .filter((c) => c.date === asOfISO && (c.createdAt ?? 0) > asOfAt)
          .reduce((sum, c) => sum + toNumber(c.amount), 0) +
        (model.income || [])
          .flatMap((s) => s.paymentLog || [])
          .filter((e) => e.date === asOfISO && (e.createdAt ?? 0) > asOfAt)
          .reduce((sum, e) => sum + toNumber(e.amount), 0)
      : 0;
  const totalStart = totalLiquidBalance(model) + loggedAfterUpdate;

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
  // H-11 (2026-10-22): a missing or broken amount shows a dash, never "NaN" or "∞"; and the
  // sign comes from the amount rounded to centavos, so a hair below zero is "₱0.00", not
  // "-₱0.00".
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return `${currencySymbol}—`;
  const cents = Math.round(amount * 100);
  const isNegative = cents < 0;
  const abs = Math.abs(cents) / 100;
  const formatted = abs.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${isNegative ? '-' : ''}${currencySymbol}${formatted}`;
}

// ---- B.7: "Left to Spend" ----
// The household's projected balance on its next payday (the earliest upcoming
// payday across every income source), or projected to the end of the current
// month if no payday can be resolved. Reuses computeRunningBalances — nothing
// here is computed from scratch.
export type LeftToSpendResult = {
  amount: number;
  targetDate: Date;
  basis: 'payday' | 'endOfMonth';
};

function nextHouseholdPayDate(model: HouseholdModel, today: Date = new Date()): Date | null {
  let earliest: Date | null = null;
  (model.income || []).forEach((source) => {
    let next = computeNextPayDate(source.frequency as any, source.payDates || [], today);
    // A payday already logged early doesn't count as the next one; use the one after.
    let guard = 0;
    while (next && isPaydayReceived(source, toISO(next)) && guard < 6) {
      guard++;
      const after = new Date(next.getFullYear(), next.getMonth(), next.getDate() + 1);
      const following = computeNextPayDate(source.frequency as any, source.payDates || [], after);
      if (!following || following.getTime() === next.getTime()) {
        next = null;
        break;
      }
      next = following;
    }
    if (next && (!earliest || next < earliest)) earliest = next;
  });
  return earliest;
}

export function computeLeftToSpend(model: HouseholdModel, today: Date = new Date()): LeftToSpendResult {
  const payDate = nextHouseholdPayDate(model, today);
  // Redesign: what you can spend UNTIL payday, so the payday's own (not yet received)
  // income isn't counted: read the balance the day before, never earlier than today.
  const todayStart = stripTime(today);
  const dayBefore = payDate ? stripTime(new Date(payDate.getFullYear(), payDate.getMonth(), payDate.getDate() - 1)) : null;
  const targetDate = dayBefore
    ? dayBefore < todayStart
      ? todayStart
      : dayBefore
    : new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const basis: 'payday' | 'endOfMonth' = payDate ? 'payday' : 'endOfMonth';
  // H-52 (Cath, 2026-10-29): what is in your accounts now, minus everything still to pay up
  // to the day before payday (past due included), and plans. leftToSpendExtras.ts.
  // H-11 (2026-10-22): rounded to centavos; `+ 0` turns -0 into 0.
  const amount = leftToSpendAmount(model, today, targetDate).amount;
  return { amount, targetDate, basis };
}

// For the "Where it comes from" page on Home's Left to Spend card: starts from what is
// in your accounts right now, then the money planned to go out (or come in) after today
// and up to the Left to Spend date, grouped by kind. Anything else that makes up the
// difference (for example something due today that isn't marked paid yet) is shown as
// "Other changes", so the lines always add up to the Left to Spend amount.
export type LeftToSpendLine = { label: string; amount: number };
export function leftToSpendBreakdown(model: HouseholdModel, result: LeftToSpendResult, today: Date = new Date()): {
  now: number;
  lines: LeftToSpendLine[];
} {
  // H-52: the same lines Left to Spend is made of, so they always add up to it exactly.
  const r = leftToSpendAmount(model, today, result.targetDate);
  return { now: r.now, lines: r.lines };
}

// Same three-tier red/orange/green shape as SavingsScreen's getEfStatus() — red when
// negative, green at or above the household's caution threshold, orange in between.
// The threshold is a % (Settings › Budgeting) of your monthly budget, as in the Finance
// Flow mockup ("At 20%, the mood turns orange below ₱7,600" for a ₱38,000 budget).
// Without a monthly budget it falls back to a % of your typical monthly bills, debts and
// loans (the old rule, which was often so small that it only turned orange near ₱0).
export type LeftToSpendMood = 'good' | 'low' | 'over';

export function cautionBase(model: HouseholdModel): { amount: number; kind: 'budget' | 'obligations' } {
  const budget = model.settings.monthlySpendingBudget;
  if (typeof budget === 'number' && budget > 0) return { amount: budget, kind: 'budget' };
  return { amount: computeMonthlyObligationsBaseline(model.bills, model.debts, model.loans), kind: 'obligations' };
}

export function cautionThresholdAmount(model: HouseholdModel): number {
  const thresholdPercent = model.settings.cautionThresholdPercent ?? 20;
  return cautionBase(model).amount * (thresholdPercent / 100);
}

export function getLeftToSpendStatus(
  amount: number,
  model: HouseholdModel,
  colors: { error: string; orange: string; ok: string }
): { color: string; label: string; mood: LeftToSpendMood } {
  // Redesign: labels match the Finance Flow mockups, and `mood` drives the Home card
  // colour (green / burnt orange / red).
  if (amount < 0) return { color: colors.error, label: 'Over budget', mood: 'over' };
  const cautionAmount = cautionThresholdAmount(model);
  if (amount < cautionAmount) return { color: colors.orange, label: 'Running low', mood: 'low' };
  return { color: colors.ok, label: 'Looking good', mood: 'good' };
}
