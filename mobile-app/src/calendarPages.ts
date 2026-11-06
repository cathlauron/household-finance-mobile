// The months the calendar can show (B-025: the year view once started at Oct 2024 with
// empty months before it). Whole years only: 5 years before this year to 5 after it.
export type Page = { year: number; month: number };
export const YEARS_EACH_SIDE = 5;

export function buildPages(now: Date = new Date()): Page[] {
  const pages: Page[] = [];
  for (let y = now.getFullYear() - YEARS_EACH_SIDE; y <= now.getFullYear() + YEARS_EACH_SIDE; y++) {
    for (let m = 0; m < 12; m++) pages.push({ year: y, month: m });
  }
  return pages;
}

export function todayIndex(now: Date = new Date()): number {
  return YEARS_EACH_SIDE * 12 + now.getMonth();
}

// Cath, 2026-11-06: one month as week rows, with the days of the month before and after filling
// the first and last rows (outside: greyed, like a phone calendar). A day from a month past the
// calendar's two ends stays blank, because there is no month to move to.
export type DayCell = { year: number; month: number; day: number; outside: boolean };
export function monthCells(year: number, month: number, now: Date = new Date()): (DayCell | null)[][] {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const minYear = now.getFullYear() - YEARS_EACH_SIDE;
  const maxYear = now.getFullYear() + YEARS_EACH_SIDE;
  const rows: (DayCell | null)[][] = [];
  for (let w = 0; w < Math.ceil((first + days) / 7); w++) {
    const row: (DayCell | null)[] = [];
    for (let c = 0; c < 7; c++) {
      const at = new Date(year, month, w * 7 + c - first + 1);
      const y = at.getFullYear();
      row.push(y < minYear || y > maxYear ? null : { year: y, month: at.getMonth(), day: at.getDate(), outside: at.getMonth() !== month });
    }
    rows.push(row);
  }
  return rows;
}
