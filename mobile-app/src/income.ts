// ============================================================
// Household Finance App — Income helpers (Checkpoint 7.1)
// ============================================================
// Small, self-contained date/frequency helpers for income sources.
// Deliberately separate from recurrence.ts (which handles Bill/Debt/
// Loan due dates) since a pay schedule's shape is different enough
// (weekly day-of-week, semi-monthly two-days, etc.) that sharing logic
// wasn't worth the added complexity for this checkpoint.
// ============================================================

import { stripTime } from './recurrence';

export type Frequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'onetime';

export const FREQUENCIES: Frequency[] = ['monthly', 'semimonthly', 'biweekly', 'weekly', 'onetime'];

export const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function frequencyLabel(f: Frequency): string {
  switch (f) {
    case 'weekly': return 'Weekly';
    case 'biweekly': return 'Biweekly';
    case 'semimonthly': return 'Semi-monthly';
    case 'monthly': return 'Monthly';
    case 'onetime': return 'One-time';
    default: return f;
  }
}

function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function formatShortDate(d: Date | null): string {
  if (!d) return 'No date set';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Computes the next upcoming pay date for a source, based on its frequency and
// payDates. Returns null when there isn't enough info to compute one — this is
// expected (and fine to show as "No date set") for biweekly sources, since those
// are logged as they happen rather than scheduled ahead of time in this version.
export function computeNextPayDate(
  frequency: Frequency,
  payDates: string[],
  today: Date = new Date()
): Date | null {
  if (frequency === 'monthly' && payDates[0]) {
    const raw = payDates[0];
    let y = today.getFullYear();
    let m = today.getMonth();
    let day = raw === 'last' ? lastDayOfMonth(y, m) : parseInt(raw, 10);
    if (isNaN(day)) return null;
    let candidate = new Date(y, m, day);
    if (stripTime(candidate) < stripTime(today)) {
      m += 1;
      day = raw === 'last' ? lastDayOfMonth(y, m) : parseInt(raw, 10);
      candidate = new Date(y, m, day);
    }
    return candidate;
  }

  if (frequency === 'semimonthly') {
    const candidates: Date[] = [];
    payDates.forEach((raw) => {
      if (!raw) return;
      let y = today.getFullYear();
      let m = today.getMonth();
      let day = raw === 'last' ? lastDayOfMonth(y, m) : parseInt(raw, 10);
      if (isNaN(day)) return;
      let c = new Date(y, m, day);
      if (stripTime(c) < stripTime(today)) {
        m += 1;
        day = raw === 'last' ? lastDayOfMonth(y, m) : parseInt(raw, 10);
        c = new Date(y, m, day);
      }
      candidates.push(c);
    });
    if (!candidates.length) return null;
    candidates.sort((a, b) => a.getTime() - b.getTime());
    return candidates[0];
  }

  if (frequency === 'weekly' && payDates[0] !== undefined && payDates[0] !== '') {
    const dow = parseInt(payDates[0], 10);
    if (isNaN(dow)) return null;
    const d = new Date(today);
    for (let i = 0; i < 7; i++) {
      if (d.getDay() === dow) return d;
      d.setDate(d.getDate() + 1);
    }
    return null;
  }

  if (frequency === 'onetime' && payDates[0]) {
    const d = new Date(payDates[0] + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
  }

  // Biweekly (no anchor date collected in this version) falls through here.
  return null;
}
