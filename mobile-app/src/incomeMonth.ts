import type { HouseholdModel, IncomeSource, PaymentLogEntry } from './types';
import { incomeOccurrencesInMonth } from './balanceProjection';

// Income for one calendar month: every scheduled payday, matched to the payday that was
// actually logged for it. A logged payday counts for the nearest scheduled payday of the
// same source within a week either side (early or late pay still lands on the right row);
// each logged payday is used once. Logged paydays that don't match any scheduled one
// (e.g. an extra or far-off payday) still count as received, as their own rows.

export type PaydayRow = {
  sourceId: string;
  date: string; // YYYY-MM-DD (the scheduled date, or the logged date for an extra one)
  expected: number; // 0 for an extra logged payday
  logged?: PaymentLogEntry;
};

const MATCH_DAYS = 7;
const pad = (n: number) => String(n).padStart(2, '0');
const dayMs = 86400000;
const toTime = (iso: string) => new Date(iso + 'T00:00:00').getTime();

export function paydaysForSource(source: IncomeSource, year: number, monthIndex: number): PaydayRow[] {
  const expected = typeof source.expectedAmount === 'number' ? source.expectedAmount : 0;
  const scheduled = incomeOccurrencesInMonth(source, year, monthIndex).map((d) => `${year}-${pad(monthIndex + 1)}-${pad(d)}`);
  const logs = (source.paymentLog || []).filter((e) => typeof e.amount === 'number' && /^\d{4}-\d{2}-\d{2}$/.test(e.date));
  const used = new Set<string>();
  const rows: PaydayRow[] = scheduled.map((date) => {
    let best: PaymentLogEntry | undefined;
    let bestGap = Infinity;
    logs.forEach((e) => {
      if (used.has(e.id)) return;
      const gap = Math.abs(toTime(e.date) - toTime(date)) / dayMs;
      if (gap <= MATCH_DAYS && gap < bestGap) {
        best = e;
        bestGap = gap;
      }
    });
    if (best) used.add(best.id);
    return { sourceId: source.id, date, expected, logged: best };
  });
  // Logged this month but not matched to a scheduled payday: an extra row.
  const ym = `${year}-${pad(monthIndex + 1)}`;
  logs.forEach((e) => {
    if (!used.has(e.id) && e.date.startsWith(ym)) rows.push({ sourceId: source.id, date: e.date, expected: 0, logged: e });
  });
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

export type MonthTotals = { expected: number; received: number; toCome: number; rows: PaydayRow[] };

export function monthTotals(sources: IncomeSource[], year: number, monthIndex: number): MonthTotals {
  const rows = sources.flatMap((s) => paydaysForSource(s, year, monthIndex));
  const expected = rows.reduce((sum, r) => sum + r.expected, 0);
  const received = rows.reduce((sum, r) => sum + (r.logged ? (r.logged.amount as number) : 0), 0);
  const toCome = rows.reduce((sum, r) => sum + (r.logged ? 0 : r.expected), 0);
  return { expected, received, toCome, rows };
}

// Income sources grouped by who they belong to ('' = nobody picked).
export function sourcesByPerson(model: HouseholdModel): { personId: string; sources: IncomeSource[] }[] {
  const map = new Map<string, IncomeSource[]>();
  (model.income || []).forEach((s) => {
    const key = s.personId || '';
    map.set(key, [...(map.get(key) || []), s]);
  });
  const order = (model.people || []).map((p) => p.id);
  return [...map.entries()]
    .sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : order.indexOf(a) - order.indexOf(b)))
    .map(([personId, sources]) => ({ personId, sources }));
}
