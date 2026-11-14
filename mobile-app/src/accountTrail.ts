import { accountCurrentBalance, happenedSinceUpdate, type SpendingGroup } from './balanceProjection';
import { accountEffect as investmentEffect } from './investments';
import { buildTransactionsList } from './transactions';
import { transferRow } from './transfersList';
import type { HouseholdModel, PaymentMethod } from './types';

// Cath, 2026-11-14 (mockup balance-before, Place A): on an account's page, every row says
// what the account had before it and after it.
//
// Worked out backwards from what the account has now: the newest row ends at today's
// balance, and each older row ends where the next one started. A balance typed in by hand
// (balanceLog) is a fixed point: rows older than it end at what the account had just before
// it was typed. Something that has not moved the balance (dated in the future, or dated
// before the balances were last typed in but added afterwards) has no before and after.

export type TrailRow = {
  id: string; // the Transactions list id ("manual-…", "bill-…"), or a move's / investment entry's own id
  kind: 'txn' | 'move' | 'invest';
  date: string;
  at: number;
  label: string;
  sub: string;
  effect: number; // what it did to this account, in pesos (minus = went out)
  before: number | null;
  after: number | null;
  investmentId?: string;
};

const num = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : 0);
const round = (n: number) => Math.round(n * 100) / 100;
const localISO = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function accountTrail(model: HouseholdModel, group: SpendingGroup, accountId: string): TrailRow[] {
  const account = (model.balanceAccounts[group] || []).find((a) => a.id === accountId);
  if (!account) return [];
  const key = `${group}:${accountId}`;
  // The same rule the live balance uses: cash paid with no cash account picked belongs to the first one.
  const firstCashId = model.balanceAccounts.cash[0]?.id;
  const matches = (pm?: PaymentMethod) =>
    !!pm && pm.type === group && (pm.accountId === accountId || (group === 'cash' && !pm.accountId && accountId === firstCashId));
  const today = localISO(Date.now());
  const asOf = model.balanceAccounts.asOfDate;
  const asOfAt = model.balanceAccounts.asOfAt ?? 0;
  // Did it move the balance? Since the last update we know exactly. Before it, it was folded
  // into the typed balance, unless it was added after that update (then it never counted).
  const counted = (date: string | undefined, at: number | undefined) => {
    if (!date || date > today) return false;
    if (happenedSinceUpdate(model, date, at, today)) return true;
    if (!asOf) return false;
    if (date > asOf) return false;
    return !(asOfAt && at && at > asOfAt);
  };

  const shown = new Map(buildTransactionsList(model).map((t) => [t.id, t]));
  // movedAt: when it really changed the balance, if that is not its own date (a move or a
  // back-dated amount changes the saved balance the moment it is added).
  type Ev = Omit<TrailRow, 'before' | 'after'> & { counts: boolean; movedAt?: number };
  const events: Ev[] = [];
  const add = (id: string, date: string | undefined, at: number | undefined, effect: number) => {
    const row = shown.get(id);
    if (!row || !date || effect === 0) return;
    events.push({ id, kind: 'txn', date, at: at || 0, label: row.label, sub: row.category, effect, counts: counted(date, at) });
  };

  (model.manualTransactions || []).forEach((t) => {
    if (!matches(t.paymentMethod)) return;
    const effect = t.direction === 'in' ? num(t.amount) : -num(t.amount);
    // Back-dated and taken straight off the saved balance (backDated.ts): it moved the balance
    // the moment it was added.
    const row = shown.get('manual-' + t.id);
    if (t.offSaved && row && effect) {
      events.push({ id: 'manual-' + t.id, kind: 'txn', date: t.date, at: t.createdAt || 0, label: row.label, sub: row.category, effect, counts: true, movedAt: t.createdAt });
    } else add('manual-' + t.id, t.date, t.createdAt, effect);
  });
  model.bills.forEach((r) => (r.cycles || []).forEach((c) => c.paidDate && matches(c.paymentMethod) && add('bill-' + c.id, c.paidDate, c.paidAt, -num(c.amountPaid))));
  model.debts.forEach((r) => (r.cycles || []).forEach((c) => c.paidDate && matches(c.paymentMethod) && add('debt-' + c.id, c.paidDate, c.paidAt, -num(c.amountPaid))));
  (model.loans || []).forEach((l) => (l.actualPayments || []).forEach((p) => matches(p.paymentMethod) && add('loan-' + p.id, p.date, p.createdAt, l.direction === 'lent' ? num(p.actual) : -num(p.actual))));
  (model.income || []).forEach((s) => (s.paymentLog || []).forEach((e) => matches(e.paymentMethod) && add('income-' + e.id, e.date, e.createdAt, num(e.amount))));
  (model.savingsGoals || []).forEach((g) => (g.contributions || []).forEach((c) => matches(c.paymentMethod) && add('saving-' + c.id, c.date, c.createdAt, -num(c.amount))));
  (model.investments || []).forEach((inv) =>
    (inv.entries || []).forEach((e) => {
      const effect = investmentEffect(e, matches);
      if (!effect) return;
      events.push({ id: e.id, kind: 'invest', date: e.date, at: e.createdAt || 0, label: e.type === 'add' ? `Invested in ${inv.name || 'Investment'}` : `Took out of ${inv.name || 'Investment'}`, sub: 'not spending', effect, counts: counted(e.date, e.createdAt), investmentId: inv.id });
    })
  );
  // A move changes the saved balances the moment it is made, whatever its date.
  (model.transfers || []).forEach((t) => {
    if (t.from !== key && t.to !== key) return;
    const r = transferRow(model, t);
    const out = t.from === key;
    const effect = out ? -(typeof t.cost === 'number' ? t.cost : num(t.amount)) - (t.feeOffSaved ? num(t.fee) : 0) : num(t.amount);
    const label = t.currency && !out ? `Withdrew cash from ${r.fromName}` : t.cost !== undefined ? (out ? `Changed back to ${r.toName}` : `Changed back from ${r.fromName}`) : t.to.startsWith('credit:') ? (out ? `Paid card ${r.toName}` : `Paid from ${r.fromName}`) : out ? `Moved to ${r.toName}` : `Moved from ${r.fromName}`;
    events.push({ id: t.id, kind: 'move', date: t.date, at: t.createdAt || 0, label, sub: r.sub, effect, counts: true, movedAt: t.createdAt });
  });

  const typed = (account.balanceLog || []).filter((e) => e.from !== null).map((e) => ({ typed: true as const, date: localISO(e.at), at: e.at, from: e.from as number }));
  const all = [...events.map((e) => ({ typed: false as const, ...e })), ...typed];
  // Newest first: by day, then by the second it was added.
  const when = (e: (typeof all)[number]) => (!('from' in e) && e.movedAt ? { date: localISO(e.movedAt), at: e.movedAt } : { date: e.date, at: e.at });
  all.sort((a, b) => {
    const x = when(a);
    const y = when(b);
    return x.date < y.date ? 1 : x.date > y.date ? -1 : y.at - x.at;
  });

  let running = accountCurrentBalance(model, group, account);
  const rows: TrailRow[] = [];
  for (const e of all) {
    if ('from' in e) {
      running = e.from;
      continue;
    }
    const { typed: _t, counts, movedAt: _m, ...row } = e;
    if (!counts) {
      rows.push({ ...row, before: null, after: null });
      continue;
    }
    const before = round(running - e.effect);
    rows.push({ ...row, before, after: round(running) });
    running = before;
  }
  // Shown newest first by its own date, like every other list.
  rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.at - a.at));
  return rows;
}
