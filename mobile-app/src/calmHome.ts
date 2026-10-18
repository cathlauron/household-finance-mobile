// Version 3: the calm Home (approved mockups H3b and H4b).
//
// 1. Welcome back: after 3 or more days away, a short card between Left to Spend and
//    Accounts. Good news first (what happened while you were away, including anything your
//    household logged), then "N days to catch up. No rush, nothing is lost."
// 2. Running low: when Left to Spend is Running low or Overspent, Home suggests up to
//    3 real ways to free up money before payday (money in a savings pot, money someone owes
//    you, a refund you're waiting for). It never moves anything by itself.

import type { HouseholdModel } from './types';
import { getOverdueItems } from './overdue';
import { paydaysForSource } from './incomeMonth';
import { loanOutstandingBalance, formatPeso } from './balanceProjection';
import { isEmergencyPot, potSaved } from './savingsPots';

const DAY = 86400000;
const toTime = (iso: string) => new Date(iso + 'T00:00:00').getTime();
const num = (v: unknown) => (typeof v === 'number' && !isNaN(v) ? v : 0);
const noCents = (n: number) => formatPeso(n).replace('.00', '');

export const WELCOME_BACK_DAYS = 3;

export function daysBetween(fromISO: string, toISO: string): number {
  return Math.round((toTime(toISO) - toTime(fromISO)) / DAY);
}

export type CatchUp = {
  days: number;
  good: string[]; // "Payday came in (₱25,000)", "Rent paid on time"
  bills: { kind: 'bill' | 'debt' | 'loan'; id: string; name: string; dueDate: string; amount: number }[];
  paydays: { sourceId: string; name: string; date: string; amount: number }[];
};

// What happened between `since` (the day Home was last looked at, not included) and today.
export function catchUpSince(model: HouseholdModel, since: string, today: string): CatchUp {
  const after = (d?: string) => !!d && d > since && d <= today;
  const good: string[] = [];

  // Paydays logged while away.
  const paid = (model.income || []).flatMap((s) => (s.paymentLog || []).filter((e) => after(e.date)).map((e) => num(e.amount)));
  if (paid.length === 1) good.push(`Payday came in (${noCents(paid[0])})`);
  else if (paid.length > 1) good.push(`${paid.length} paydays came in (${noCents(paid.reduce((a, b) => a + b, 0))})`);

  // Bills and debts paid while away.
  const paidBills: { name: string; onTime: boolean }[] = [];
  [...(model.bills || []), ...(model.debts || [])].forEach((r: any) =>
    (r.cycles || []).forEach((c: any) => {
      if (after(c.paidDate)) paidBills.push({ name: r.name || r.creditorOrPerson || 'A bill', onTime: !c.dueDate || c.paidDate <= c.dueDate });
    })
  );
  if (paidBills.length === 1) good.push(`${paidBills[0].name} paid${paidBills[0].onTime ? ' on time' : ''}`);
  else if (paidBills.length === 2) good.push(`${paidBills[0].name} and ${paidBills[1].name} paid`);
  else if (paidBills.length > 2) good.push(`${paidBills.length} bills paid`);

  // Money put into savings while away.
  const saved = (model.savingsGoals || []).reduce(
    (sum, g) => sum + (g.contributions || []).filter((c) => after(c.date) && num(c.amount) > 0).reduce((s, c) => s + num(c.amount), 0),
    0
  );
  if (saved > 0) good.push(`${noCents(saved)} added to savings`);

  // Came due while away and still unpaid.
  const bills = getOverdueItems(model)
    .filter((o) => o.dueDate > since)
    .map((o) => ({ kind: o.kind, id: o.id, name: o.name, dueDate: o.dueDate, amount: o.amountOwed }));

  // Paydays that were due while away but haven't been logged.
  const paydays: CatchUp['paydays'] = [];
  const start = new Date(since + 'T00:00:00');
  const end = new Date(today + 'T00:00:00');
  (model.income || []).forEach((s) => {
    let y = start.getFullYear();
    let m = start.getMonth();
    while (y < end.getFullYear() || (y === end.getFullYear() && m <= end.getMonth())) {
      paydaysForSource(s, y, m).forEach((row) => {
        if (!row.logged && row.expected > 0 && after(row.date)) paydays.push({ sourceId: s.id, name: s.sourceName || 'Payday', date: row.date, amount: row.expected });
      });
      m += 1;
      if (m > 11) {
        m = 0;
        y += 1;
      }
    }
  });
  paydays.sort((a, b) => a.date.localeCompare(b.date));

  return { days: daysBetween(since, today), good: good.slice(0, 3), bills, paydays };
}

export type TightWay =
  | { kind: 'pot'; id: string; name: string; amount: number; emergency: boolean }
  | { kind: 'owed'; id: string; name: string; amount: number }
  | { kind: 'refund'; id: string; name: string; amount: number };

// How much to free up so Left to Spend is out of Running low (rounded up to ₱100), and up
// to 3 real ways to do it. Savings pots come first, then money owed to you and refunds,
// and the emergency pot last.
export function tightWays(model: HouseholdModel, leftToSpend: number, cautionAmount: number): { target: number; ways: TightWay[] } {
  const target = Math.max(100, Math.ceil((cautionAmount - leftToSpend) / 100) * 100);
  let remaining = target;
  const ways: TightWay[] = [];
  const take = (have: number) => Math.min(have, remaining);

  const pots = (model.savingsGoals || []).filter((g) => potSaved(g) > 0);
  const ordinary = pots.filter((g) => !isEmergencyPot(g)).sort((a, b) => potSaved(b) - potSaved(a));
  const emergency = pots.filter((g) => isEmergencyPot(g));

  const owed = (model.loans || [])
    .filter((l) => l.direction === 'lent' && loanOutstandingBalance(l) > 0)
    .sort((a, b) => loanOutstandingBalance(b) - loanOutstandingBalance(a));
  const refunds = (model.manualTransactions || []).filter(
    (t) => t.direction === 'out' && typeof t.refundExpectedAmount === 'number' && t.refundExpectedAmount > 0 && !t.refundTransactionId
  );

  for (const g of ordinary) {
    if (ways.length >= 3 || remaining <= 0) break;
    const a = take(potSaved(g));
    ways.push({ kind: 'pot', id: g.id, name: g.name || 'Savings pot', amount: a, emergency: false });
    remaining -= a;
  }
  for (const l of owed) {
    if (ways.length >= 3 || remaining <= 0) break;
    const a = take(loanOutstandingBalance(l));
    ways.push({ kind: 'owed', id: l.id, name: l.name || 'Money you lent', amount: a });
    remaining -= a;
  }
  for (const t of refunds) {
    if (ways.length >= 3 || remaining <= 0) break;
    const a = take(t.refundExpectedAmount as number);
    ways.push({ kind: 'refund', id: t.id, name: t.label || 'A purchase', amount: a });
    remaining -= a;
  }
  for (const g of emergency) {
    if (ways.length >= 3 || remaining <= 0) break;
    const a = take(potSaved(g));
    ways.push({ kind: 'pot', id: g.id, name: g.name || 'Emergency pot', amount: a, emergency: true });
    remaining -= a;
  }
  return { target, ways };
}

export function wayText(w: TightWay): string {
  const amt = noCents(w.amount);
  if (w.kind === 'pot') return `Use ${amt} from ${w.name}`;
  if (w.kind === 'owed') return `Collect ${amt} you lent (${w.name})`;
  return `Follow up the ${amt} refund (${w.name})`;
}
