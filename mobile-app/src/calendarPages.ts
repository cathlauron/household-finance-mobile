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
