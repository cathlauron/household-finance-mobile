import type { Loan, LoanPayment } from './types';
import { getNextDueDate } from './recurrence';

// Version 3 (Cath, 2026-10-19): missed loan payments, and "Which payment was this?".
//
// A repeating loan (every month / every year) with a First payment date has a list of
// scheduled payments: the first payment date, then one per month (or year) after it,
// up to the number of payments the loan needs (total ÷ monthly payment).
// Each logged payment covers one of them: the one it was logged for (`forDate`), or,
// for payments logged without one, the oldest one not yet covered. A scheduled payment
// before today that nothing covers is MISSED.
// Loans without a First payment date (older loans) aren't tracked, so nothing changes
// for them until a First payment date is set.

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function num(v: unknown): number {
  return typeof v === 'number' && !isNaN(v) ? v : 0;
}
const ISO = /^\d{4}-\d{2}-\d{2}$/;

// Cath, 2026-10-27 (phone, "Miduri" and "Olive"): a repeating loan with no First payment
// date set showed "next Nov 16" and nothing past due, although Oct 16 was never paid. When
// a monthly / yearly loan has no First payment date but has payments, the schedule starts
// at the scheduled date nearest its earliest payment, so it is tracked like any other.
function scheduleOf(loan: Loan): Record<string, any> | null {
  const rt = loan.recurringType;
  if (rt !== 'monthly' && rt !== 'annual') return null;
  const { firstDate: _f, ...rest } = loan.dueDate || {};
  const sched: Record<string, any> = { ...rest };
  return sched;
}
// H-47 (Cath, 2026-10-29, "Olive"): a loan that repeats "Custom" (e.g. monthly from a start
// date) is tracked too, from its start date. Before this, Custom loans showed the next date
// after today ("next Nov 16") and never anything past due.
function customOf(loan: Loan): { start: string; freq: string; count: number | undefined } | null {
  if (loan.recurringType !== 'custom') return null;
  const d: Record<string, any> = loan.dueDate || {};
  const start = (loan as any).customStartDate || d.customStartDate || '';
  if (typeof start !== 'string' || !ISO.test(start)) return null;
  const freq = (loan as any).customFreq || d.customFreq || 'monthly';
  const rawCount = (loan as any).customOccurrenceCount ?? d.customOccurrenceCount;
  const count = typeof rawCount === 'number' && rawCount > 0 ? rawCount : undefined;
  return { start, freq, count };
}

export function loanFirstDate(loan: Loan): string | null {
  const custom = customOf(loan);
  if (custom) return custom.start;
  const first = loan.dueDate?.firstDate;
  const rt = loan.recurringType;
  if (rt !== 'monthly' && rt !== 'annual') return null;
  const sched = scheduleOf(loan);
  const dates = (loan.actualPayments || []).filter((p) => num(p.actual) > 0 && ISO.test(p.date)).map((p) => p.date).sort();
  const inferred = sched && sched.day !== undefined && sched.day !== '' && dates.length && num(loan.expectedPayment) > 0 ? nearestScheduled(rt, sched, dates[0]) : null;
  if (typeof first === 'string' && ISO.test(first)) {
    // Review 2026-10-27: before this fix, saving the loan form set the First payment to
    // the NEXT date, after the payments already made, so they all counted as paid ahead.
    // A First payment more than a month after the first payment logged is that mistake.
    // H-47 (Cath, 2026-10-29): "a payment logged before the First payment date means the
    // loan started then". B-047's check only caught a First payment MORE than a month after
    // the first payment, so exactly one month later (Aug 16 paid, First payment Sep 16)
    // slipped through. Now: the earliest payment is at least most of a cycle before the
    // First payment (25 days / 330 days, so paying the first one a few weeks early still
    // counts as that payment) and lands on an earlier scheduled date.
    const early = new Date(dates[0] + 'T00:00:00');
    early.setDate(early.getDate() + (rt === 'annual' ? 330 : 25));
    if (inferred && dates.length && inferred < first && first >= toISO(early)) return inferred;
    return first;
  }
  return inferred;
}

// The scheduled date nearest a payment (paying a bit early or late); a tie goes to the
// later one (paying early is more usual). Review 10-27: paid Oct 1 for the 16th = Oct 16.
function nearestScheduled(rt: 'monthly' | 'annual', sched: Record<string, any>, payISO: string): string | null {
  // Yearly: the year's payment it was paid for, up to a month late.
  if (rt === 'annual') {
    const from = new Date(payISO + 'T00:00:00');
    from.setDate(from.getDate() - 31);
    const d = getNextDueDate(rt, sched, from);
    return d ? toISO(d) : null;
  }
  const pay = new Date(payISO + 'T00:00:00').getTime();
  const from = new Date(payISO + 'T00:00:00');
  from.setDate(from.getDate() - 40);
  let best: string | null = null;
  let bestGap = Infinity;
  let cur = getNextDueDate(rt, sched, from);
  for (let i = 0; cur && i < 4; i++) {
    const gap = Math.abs(cur.getTime() - pay);
    if (gap <= bestGap) {
      best = toISO(cur);
      bestGap = gap;
    }
    if (cur.getTime() > pay) break;
    const after = new Date(cur);
    after.setDate(after.getDate() + 1);
    cur = getNextDueDate(rt, sched, after);
  }
  return best;
}

export function isTrackedLoan(loan: Loan): boolean {
  return loanFirstDate(loan) !== null;
}

// How many payments the loan needs (0 = unknown, no limit).
function paymentCount(loan: Loan): number {
  const total = num(loan.totalAmount);
  const each = num(loan.expectedPayment);
  return total > 0 && each > 0 ? Math.ceil(total / each - 1e-9) : 0;
}

// Scheduled payment dates from the first one, up to and including `untilISO`.
export function loanScheduledDates(loan: Loan, untilISO: string): string[] {
  const first = loanFirstDate(loan);
  if (!first) return [];
  const custom = customOf(loan);
  if (custom) {
    const limit = paymentCount(loan) || 600;
    const out: string[] = [];
    let cur: Date | null = getNextDueDate('custom', {}, new Date(first + 'T00:00:00'), custom.start, custom.freq, custom.count);
    while (cur && toISO(cur) <= untilISO && out.length < limit) {
      out.push(toISO(cur));
      const after = new Date(cur);
      after.setDate(after.getDate() + 1);
      cur = getNextDueDate('custom', {}, after, custom.start, custom.freq, custom.count);
    }
    return out;
  }
  const rt = loan.recurringType as 'monthly' | 'annual';
  // The repeating day (and month) default to the first payment's own.
  const sched: Record<string, any> = { ...(scheduleOf(loan) || {}) };
  if (sched.day === undefined || sched.day === '') sched.day = String(Number(first.slice(8, 10)));
  if (rt === 'annual' && (sched.month === undefined || sched.month === '')) sched.month = Number(first.slice(5, 7));
  const limit = paymentCount(loan) || 600;
  const out: string[] = [];
  let cur: string | null = first;
  while (cur && cur <= untilISO && out.length < limit) {
    out.push(cur);
    const after = new Date(cur + 'T00:00:00');
    after.setDate(after.getDate() + 1);
    const next = getNextDueDate(rt, sched, after);
    cur = next ? toISO(next) : null;
  }
  return out;
}

export type LoanCoverage = {
  covered: Record<string, string>; // scheduled date -> payment id that finished paying it
  missed: string[]; // scheduled dates before today not fully paid, oldest first
  nextOpen: string | null; // the oldest scheduled date not fully paid (past or future)
  // Cath, 2026-10-27 ("count what I've actually paid in total"): money already put toward
  // nextOpen by smaller payments, and how much more it needs.
  paidTowardNext: number;
  leftForNext: number;
};

const cents = (n: number) => Math.round(n * 100) / 100;

// Money paid is counted toward the scheduled payments in order. A payment logged for a
// date (`forDate`) goes to that date first; anything over goes to the oldest payments not
// paid yet. A payment smaller than the monthly amount counts toward it, and that payment
// stays open (and past due once its date passes) until the rest is paid.
// Loans with no monthly amount: each payment counts as one whole payment, as before.
export function loanCoverage(loan: Loan, todayISO: string): LoanCoverage {
  const none: LoanCoverage = { covered: {}, missed: [], nextOpen: null, paidTowardNext: 0, leftForNext: 0 };
  if (!isTrackedLoan(loan)) return none;
  const payments = [...(loan.actualPayments || [])]
    .filter((p) => num(p.actual) > 0)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const eachRaw = num(loan.expectedPayment);
  const each = eachRaw > 0 ? eachRaw : 1;
  const value = (p: LoanPayment) => (eachRaw > 0 ? num(p.actual) : 1);
  // Look far enough ahead to place every payment (paying ahead covers future dates).
  const horizon = new Date(todayISO + 'T00:00:00');
  const units = payments.reduce((s, p) => s + value(p), 0) / each;
  horizon.setFullYear(horizon.getFullYear() + 2 + Math.ceil(units / 12));
  const dates = loanScheduledDates(loan, toISO(horizon));
  const index = new Map(dates.map((d, i) => [d, i]));
  const put = dates.map(() => 0);
  const covered: Record<string, string> = {};
  const give = (i: number, amount: number, id: string): number => {
    const room = cents(each - put[i]);
    const used = Math.min(room, amount);
    put[i] = cents(put[i] + used);
    if (put[i] >= each - 0.005 && !covered[dates[i]]) covered[dates[i]] = id;
    return cents(amount - used);
  };
  const rest: { id: string; amount: number }[] = [];
  for (const p of payments) {
    const i = p.forDate !== undefined ? index.get(p.forDate) : undefined;
    let amount = value(p);
    if (i !== undefined) amount = give(i, amount, p.id);
    if (amount > 0.005) rest.push({ id: p.id, amount });
  }
  for (const r of rest) {
    let amount = r.amount;
    for (let i = 0; i < dates.length && amount > 0.005; i++) {
      if (put[i] < each - 0.005) amount = give(i, amount, r.id);
    }
  }
  const open = dates.findIndex((_d, i) => put[i] < each - 0.005);
  const missed = dates.filter((d, i) => d < todayISO && put[i] < each - 0.005);
  const nextOpen = open >= 0 ? dates[open] : null;
  const paidTowardNext = open >= 0 && eachRaw > 0 ? put[open] : 0;
  const leftForNext = open >= 0 && eachRaw > 0 ? cents(each - put[open]) : 0;
  return { covered, missed, nextOpen, paidTowardNext, leftForNext };
}

// ---- Which payment was this? (canvas M4c) ----
export type LoanPlacement = {
  paymentId: string;
  paidDate: string;
  amount: number;
  newFirst: string; // the first payment date just picked (suggested)
  other: string; // the scheduled date in the month it was paid
};

// After an edit (loan already has the new schedule): the latest payment, when the first
// payment date moved to before it and the two choices differ; otherwise null.
export function loanPaymentToPlace(loan: Loan, newFirstISO: string): LoanPlacement | null {
  if (!isTrackedLoan(loan) || !ISO.test(newFirstISO)) return null;
  const pays = (loan.actualPayments || []).filter((p) => num(p.actual) > 0 && ISO.test(p.date));
  if (!pays.length) return null;
  const latest = pays.reduce((a, b) => (b.date > a.date ? b : a));
  if (newFirstISO > latest.date) return null;
  if (pays.some((p) => p.id !== latest.id && p.forDate === newFirstISO)) return null;
  const monthEnd = latest.date.slice(0, 7) + '-31';
  const inPaidMonth = loanScheduledDates(loan, monthEnd).filter((d) => d.slice(0, 7) === latest.date.slice(0, 7));
  const other = inPaidMonth[0];
  if (!other || other.slice(0, 7) === newFirstISO.slice(0, 7)) return null;
  return { paymentId: latest.id, paidDate: latest.date, amount: num(latest.actual), newFirst: newFirstISO, other };
}

export function placeLoanPayment(loan: Loan, p: LoanPlacement, forISO: string): Loan {
  return {
    ...loan,
    actualPayments: (loan.actualPayments || []).map((x: LoanPayment) => (x.id === p.paymentId ? { ...x, forDate: forISO } : x)),
  };
}

// ---- The next payment to make (Cath, 2026-10-27) ----
// After logging Sept 16 the loan said "next Nov 16" while Oct 16 was still unpaid (and
// showed as past due). For a tracked loan the next payment is the oldest scheduled one
// not paid yet, even if that date has passed; loans without a First payment date keep the
// plain next date from today. null = nothing left to pay / no date.
export function loanNextDueDate(loan: Loan, today: Date = new Date()): Date | null {
  if (isTrackedLoan(loan)) {
    const { nextOpen } = loanCoverage(loan, toISO(today));
    return nextOpen ? new Date(nextOpen + 'T00:00:00') : null;
  }
  return getNextDueDate(
    (loan.recurringType as any) || 'onetime',
    loan.dueDate || {},
    today,
    (loan as any).customStartDate,
    (loan as any).customFreq,
    (loan as any).customOccurrenceCount
  );
}
