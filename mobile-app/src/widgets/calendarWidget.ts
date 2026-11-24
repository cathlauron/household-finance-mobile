import type { HouseholdModel } from '../types';
import { computeMonthEvents, formatPeso, type CalendarEvent } from '../balanceProjection';
import { withEverythingDated } from '../calendarAll';

// Cath, 2026-11-24 (mockups three-updates part 1 and calendar-widget-medium): calendar widgets
// laid out like the iPhone's, in the app's mood colour. The app keeps what is on each day of this
// month and next (only names, kinds and display amounts, masked when hidden); the widget works
// out "today" itself every time it draws, so the date is right after midnight without the app.

export type WidgetDayItem = { name: string; kind: 'bill' | 'debt' | 'loan' | 'income' | 'trip' | 'event' | 'other'; amount: string };
export type WidgetDays = Record<string, WidgetDayItem[]>;

const MASK = '₱ ••••';
const pad = (n: number) => String(n).padStart(2, '0');
const isoOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
const KIND_WORD: Record<WidgetDayItem['kind'], string> = { bill: 'Bill', debt: 'Debt', loan: 'Loan', income: 'Payday', trip: 'Trip', event: 'Event', other: '' };

function kindOf(ev: CalendarEvent): WidgetDayItem['kind'] {
  if (ev.band?.kind === 'trip' || ev.tripId) return 'trip';
  if (ev.band?.kind === 'event') return 'event';
  if (ev.type === 'bill' || ev.type === 'debt' || ev.type === 'loan' || ev.type === 'income') return ev.type;
  return 'other';
}

export function calendarWidgetDays(model: HouseholdModel, opts: { hidden: boolean; now?: Date }): WidgetDays {
  const now = opts.now ?? new Date();
  const money = (n: number) => (opts.hidden ? MASK : formatPeso(Math.round(Math.abs(n))).replace(/\.00$/, ''));
  const out: WidgetDays = {};
  for (let k = 0; k < 2; k++) {
    const first = new Date(now.getFullYear(), now.getMonth() + k, 1);
    const y = first.getFullYear();
    const m = first.getMonth();
    let events: Record<number, CalendarEvent[]> = {};
    try {
      events = withEverythingDated(computeMonthEvents(model, y, m), model, y, m);
    } catch {}
    for (const [day, list] of Object.entries(events)) {
      const items: WidgetDayItem[] = [];
      for (const ev of list) {
        // A trip shows once, on the day it starts (its ribbon days are not each a thing to do).
        if (ev.band && !ev.band.first) continue;
        if (ev.type === 'manual' || ev.type === 'saving') continue;
        const kind = kindOf(ev);
        const amt = Math.abs(ev.amount || 0);
        const isMin = ev.type === 'debt' && typeof ev.full === 'number' && ev.full > ev.amount;
        items.push({ name: ev.label, kind, amount: amt > 0 ? `${kind === 'income' ? '+' : ''}${isMin ? 'min ' : ''}${money(amt)}` : '' });
      }
      if (items.length) out[isoOf(y, m, Number(day))] = items;
    }
  }
  return out;
}

export type WidgetCell = { day: number; iso: string; inMonth: boolean; today: boolean; dot: boolean };
export type CalendarWidgetView = {
  dayName: string;
  date: number;
  monthName: string;
  todayISO: string;
  next: { name: string; sub: string; kind: WidgetDayItem['kind'] }[];
  cells: WidgetCell[];
};

export function calendarWidgetView(days: WidgetDays, now: Date, maxNext = 3): CalendarWidgetView {
  const y = now.getFullYear();
  const m = now.getMonth();
  const todayISO = isoOf(y, m, now.getDate());
  // What's next: today and the next 6 days.
  const next: CalendarWidgetView['next'] = [];
  for (let i = 0; i < 7 && next.length < maxNext; i++) {
    const d = new Date(y, m, now.getDate() + i);
    for (const item of days[isoOf(d.getFullYear(), d.getMonth(), d.getDate())] || []) {
      if (next.length >= maxNext) break;
      const when = i === 0 ? (item.kind === 'income' ? 'Today' : 'Due today') : i === 1 ? 'Tomorrow' : SHORT[d.getDay()];
      const what = item.amount || KIND_WORD[item.kind];
      next.push({ name: item.name, sub: what ? `${when} · ${what}` : when, kind: item.kind });
    }
  }
  // The month, Sunday first, with the days around it greyed.
  const cells: WidgetCell[] = [];
  const lead = new Date(y, m, 1).getDay();
  for (let i = lead; i > 0; i--) {
    const d = new Date(y, m, 1 - i);
    cells.push({ day: d.getDate(), iso: isoOf(d.getFullYear(), d.getMonth(), d.getDate()), inMonth: false, today: false, dot: false });
  }
  const len = new Date(y, m + 1, 0).getDate();
  for (let d = 1; d <= len; d++) {
    const key = isoOf(y, m, d);
    cells.push({ day: d, iso: key, inMonth: true, today: key === todayISO, dot: (days[key] || []).length > 0 });
  }
  for (let d = 1; cells.length % 7 !== 0; d++) {
    const nd = new Date(y, m + 1, d);
    cells.push({ day: d, iso: isoOf(nd.getFullYear(), nd.getMonth(), nd.getDate()), inMonth: false, today: false, dot: false });
  }
  return { dayName: DAY_NAMES[now.getDay()], date: now.getDate(), monthName: MONTHS[m], todayISO, next, cells };
}
