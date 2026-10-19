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

export function isTrackedLoan(loan: Loan): boolean {
  const rt = loan.recurringType;
  const first = loan.dueDate?.firstDate;
  return (rt === 'monthly' || rt === 'annual') && typeof first === 'string' && ISO.test(first);
}

// How many payments the loan needs (0 = unknown, no limit).
function paymentCount(loan: Loan): number {
  const total = num(loan.totalAmount);
  const each = num(loan.expectedPayment);
  return total > 0 && each > 0 ? Math.ceil(total / each - 1e-9) : 0;
}

// Scheduled payment dates from the first one, up to and including `untilISO`.
export function loanScheduledDates(loan: Loan, untilISO: string): string[] {
  if (!isTrackedLoan(loan)) return [];
  const rt = loan.recurringType as 'monthly' | 'annual';
  const { firstDate, ...rest } = loan.dueDate || {};
  const first = firstDate as string;
  // The repeating day (and month) default to the first payment's own.
  const sched: Record<string, any> = { ...rest };
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
  covered: Record<string, string>; // scheduled date -> payment id
  missed: string[]; // scheduled dates before today with no payment, oldest first
  nextOpen: string | null; // the oldest scheduled date with no payment (past or future)
};

export function loanCoverage(loan: Loan, todayISO: string): LoanCoverage {
  if (!isTrackedLoan(loan)) return { covered: {}, missed: [], nextOpen: null };
  const payments = [...(loan.actualPayments || [])].filter((p) => num(p.actual) > 0);
  // Look far enough ahead to place every payment (paying ahead covers future dates).
  const horizon = new Date(todayISO + 'T00:00:00');
  horizon.setFullYear(horizon.getFullYear() + 2 + Math.ceil(payments.length / 12));
  const dates = loanScheduledDates(loan, toISO(horizon));
  const covered: Record<string, string> = {};
  const set = new Set(dates);
  payments.forEach((p) => {
    if (p.forDate && set.has(p.forDate) && !covered[p.forDate]) covered[p.forDate] = p.id;
  });
  payments
    .filter((p) => !p.forDate || covered[p.forDate] !== p.id)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .forEach((p) => {
      const open = dates.find((d) => !covered[d]);
      if (open) covered[open] = p.id;
    });
  const missed = dates.filter((d) => d < todayISO && !covered[d]);
  const nextOpen = dates.find((d) => !covered[d]) ?? null;
  return { covered, missed, nextOpen };
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
