// Home screen widgets (mockup W2, approved by Cath 2026-10-30): the small summary the widgets
// show. Worked out in the app whenever the household changes, and kept on this phone so the
// widgets can draw without opening the app. Only these display numbers are kept (never the
// household data itself), and with "Hide amounts" on they're kept as ••••.
import type { HouseholdModel } from '../types';
import { computeLeftToSpend, formatPeso, getLeftToSpendStatus } from '../balanceProjection';
import { computeEnvelopes } from '../envelopes';
import { getUpcomingDue } from '../screens/DashboardScreen';
import { getOverdueItems } from '../overdue';

export type WidgetSnapshot = {
  at: number;
  hidden: boolean;
  lts: string;
  ltsNegative: boolean;
  mood: 'good' | 'low' | 'over'; // the widgets' colour, like Home's card (green with Mood colours off)
  daysToPayday: number | null; // null: no payday set (Left to spend runs to month end)
  periodPct: number; // how much of the period is still ahead, 0-100 (the ring)
  perDay: string;
  today: string; // money out today
  week: number[]; // money out each of the last 7 days (oldest first), for the line
  due: { name: string; day: string; amount: string }[];
  dueLeft: string;
  budgets: { name: string; pct: number; spent: string }[];
  trip: { name: string; dayText: string; spent: string; budget: string; left: string; pct: number } | null;
};

const MASK = '₱ ••••';
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function makeWidgetSnapshot(model: HouseholdModel, opts: { hidden: boolean; now?: Date }): WidgetSnapshot {
  const now = opts.now ?? new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const m = (n: number) => (opts.hidden ? MASK : formatPeso(Math.round(n)));
  const lts = computeLeftToSpend(model, now);
  const days = Math.max(1, Math.round((new Date(lts.targetDate).getTime() - today.getTime()) / 86400000) + 1);
  const daysToPayday = lts.basis === 'payday' ? days : null;
  const periodPct = Math.max(0, Math.min(100, Math.round((days / 30) * 100)));

  const outOn = (d: string) =>
    (model.manualTransactions || []).filter((t: any) => t.date === d && (t.direction ?? 'out') === 'out' && typeof t.amount === 'number').reduce((s: number, t: any) => s + Math.abs(t.amount), 0);
  const week: number[] = [];
  for (let i = 6; i >= 0; i--) week.push(outOn(iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - i))));

  let dueAll: { date: Date; label: string; amount: number }[] = [];
  try {
    dueAll = getUpcomingDue(model, 31) as any;
  } catch {}
  // Same as Home's Due soon (sweep 2026-10-30): anything overdue first, then what's coming.
  let overdue: { label: string; amount: number }[] = [];
  try {
    overdue = getOverdueItems(model).map((o: any) => ({ label: o.name, amount: o.amountOwed }));
  } catch {}
  const due = [
    ...overdue.map((o) => ({ name: o.label, day: 'Overdue', amount: m(o.amount) })),
    ...dueAll.map((d) => ({ name: d.label, day: `${MON[d.date.getMonth()]} ${d.date.getDate()}`, amount: m(d.amount) })),
  ].slice(0, 3);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const dueLeft = overdue.reduce((s, o) => s + o.amount, 0) + dueAll.filter((d) => d.date <= monthEnd).reduce((s, d) => s + d.amount, 0);

  let budgets: WidgetSnapshot['budgets'] = [];
  try {
    budgets = computeEnvelopes(model, now)
      .rows.filter((r) => r.available > 0)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 3)
      .map((r) => ({ name: r.envelope.category, pct: Math.max(0, Math.min(100, Math.round(r.pct))), spent: m(r.spent) }));
  } catch {}

  const t = iso(today);
  const trip = (model.travel || []).find((x: any) => x.startDate && x.endDate && x.startDate <= t && t <= x.endDate);
  let tripOut: WidgetSnapshot['trip'] = null;
  if (trip) {
    const list = trip.checklist || [];
    const budget = list.reduce((s: number, i: any) => s + (typeof i.cost === 'number' ? i.cost : 0), 0);
    const spent = list.filter((i: any) => i.checked).reduce((s: number, i: any) => s + (typeof i.paidAmount === 'number' ? i.paidAmount : typeof i.cost === 'number' ? i.cost : 0), 0);
    const start = new Date(trip.startDate + 'T00:00:00');
    const end = new Date(trip.endDate + 'T00:00:00');
    const total = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    const day = Math.round((today.getTime() - start.getTime()) / 86400000) + 1;
    tripOut = {
      name: trip.name || 'Trip',
      dayText: `Day ${day} of ${total}`,
      spent: m(spent),
      budget: m(budget),
      left: m(Math.max(0, budget - spent)),
      pct: budget > 0 ? Math.max(0, Math.min(100, Math.round((spent / budget) * 100))) : 0,
    };
  }

  return {
    at: now.getTime(),
    hidden: opts.hidden,
    lts: m(lts.amount),
    ltsNegative: lts.amount < 0,
    mood: model.settings?.moodColorsEnabled === false ? 'good' : getLeftToSpendStatus(lts.amount, model, { error: '', orange: '', ok: '' }).mood,
    daysToPayday,
    periodPct,
    perDay: lts.amount > 0 ? m(lts.amount / days) : m(0),
    today: opts.hidden ? MASK : `−${formatPeso(Math.round(outOn(t)))}`,
    week,
    due,
    dueLeft: m(dueLeft),
    budgets,
    trip: tripOut,
  };
}
