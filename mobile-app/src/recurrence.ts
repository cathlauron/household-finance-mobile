// ============================================================
// Recurrence helpers (Checkpoint 5.4)
// ============================================================
// Shared by Bills, Debts, and (eventually) Loans — computes the next
// upcoming due date for a record based on its recurringType + dueDate
// pattern, mirroring the logic used in the original web app.
//
// dueDate shapes:
//   onetime -> { date: 'YYYY-MM-DD' }
//   monthly -> { day: '15' }            (day of month, 1-31)
//   annual  -> { month: 3, day: '15' }  (month is 1-12)
//
// "Custom" recurrence (finite occurrence counts, arbitrary frequencies)
// from the web app is intentionally not included yet — Monthly/Annual/
// One-time covers the roadmap goal ("a bill correctly repeats on
// schedule") without a lot of extra complexity. Custom can be added
// later as its own small checkpoint if it's actually needed.
// ============================================================

export type RecurringType = 'onetime' | 'monthly' | 'annual';

export function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Returns the next due date on/after today, or null if there isn't enough
// info yet to compute one (e.g. no day set).
export function getNextDueDate(
  recurringType: RecurringType | string,
  dueDate: Record<string, any> | undefined,
  today: Date = new Date()
): Date | null {
  const d = dueDate || {};

  if (recurringType === 'onetime') {
    if (!d.date) return null;
    const dt = new Date(d.date + 'T00:00:00');
    return isNaN(dt.getTime()) ? null : dt;
  }

  if (recurringType === 'monthly') {
    const dayNum = parseInt(d.day, 10);
    if (isNaN(dayNum)) return null;
    let y = today.getFullYear();
    let m = today.getMonth();
    let day = Math.min(dayNum, lastDayOfMonth(y, m));
    let candidate = new Date(y, m, day);
    if (stripTime(candidate) < stripTime(today)) {
      m += 1;
      if (m > 11) { m = 0; y += 1; }
      day = Math.min(dayNum, lastDayOfMonth(y, m));
      candidate = new Date(y, m, day);
    }
    return candidate;
  }

  if (recurringType === 'annual') {
    const dayNum = parseInt(d.day, 10);
    const monthIdx = parseInt(d.month, 10) - 1;
    if (isNaN(dayNum) || isNaN(monthIdx)) return null;
    let y = today.getFullYear();
    let day = Math.min(dayNum, lastDayOfMonth(y, monthIdx));
    let candidate = new Date(y, monthIdx, day);
    if (stripTime(candidate) < stripTime(today)) {
      y += 1;
      day = Math.min(dayNum, lastDayOfMonth(y, monthIdx));
      candidate = new Date(y, monthIdx, day);
    }
    return candidate;
  }

  return null;
}

export function formatShortDate(d: Date | null): string {
  if (!d) return 'No date set';
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function recurringTypeLabel(t: string): string {
  if (t === 'monthly') return 'Monthly';
  if (t === 'annual') return 'Annual';
  return 'One-time';
}
