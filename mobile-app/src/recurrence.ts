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

export type RecurringType = 'onetime' | 'monthly' | 'annual' | 'custom';

export function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseISO(iso: string | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

export function customOccurrencesInMonth(
  startDateStr: string | undefined,
  freq: string | undefined,
  occurrenceCount: number | '' | undefined,
  year: number,
  monthIndex: number
): number[] {
  if (!startDateStr) return [];
  const start = parseISO(startDateStr);
  if (!start) return [];
  const daysInMonth = lastDayOfMonth(year, monthIndex);
  const frequency = freq || 'monthly';
  const count = typeof occurrenceCount === 'number' && occurrenceCount > 0 ? occurrenceCount : null;

  if (count) {
    const results: number[] = [];
    const d = new Date(start);
    const anchorDay = start.getDate();
    for (let i = 0; i < count; i++) {
      if (d.getFullYear() === year && d.getMonth() === monthIndex) results.push(d.getDate());
      if (frequency === 'daily') d.setDate(d.getDate() + 1);
      else if (frequency === 'weekly') d.setDate(d.getDate() + 7);
      else if (frequency === 'biweekly') d.setDate(d.getDate() + 14);
      else if (frequency === 'yearly') d.setFullYear(d.getFullYear() + 1);
      else {
        d.setDate(1);
        d.setMonth(d.getMonth() + 1);
        d.setDate(Math.min(anchorDay, lastDayOfMonth(d.getFullYear(), d.getMonth())));
      }
    }
    return results;
  }

  const results: number[] = [];
  if (frequency === 'monthly') {
    const day = Math.min(start.getDate(), daysInMonth);
    const candidate = new Date(year, monthIndex, day);
    if (stripTime(candidate) >= stripTime(start)) results.push(day);
  } else if (frequency === 'yearly') {
    if (start.getMonth() === monthIndex && year >= start.getFullYear()) results.push(start.getDate());
  } else if (frequency === 'daily') {
    for (let day = 1; day <= daysInMonth; day++) {
      if (stripTime(new Date(year, monthIndex, day)) >= stripTime(start)) results.push(day);
    }
  } else if (frequency === 'weekly' || frequency === 'biweekly') {
    const interval = frequency === 'weekly' ? 7 : 14;
    for (let day = 1; day <= daysInMonth; day++) {
      const dt = stripTime(new Date(year, monthIndex, day));
      if (dt < stripTime(start)) continue;
      const diffDays = Math.round((dt.getTime() - stripTime(start).getTime()) / 86400000);
      if (diffDays % interval === 0) results.push(day);
    }
  }
  return results;
}

// Returns the next due date on/after today, or null if there isn't enough
// info yet to compute one (e.g. no day set).
export function getNextDueDate(
  recurringType: RecurringType | string,
  dueDate: Record<string, any> | undefined,
  today: Date = new Date(),
  customStartDate?: string,
  customFreq?: string,
  customOccurrenceCount?: number | ''
): Date | null {
  const d = dueDate || {};

  if (recurringType === 'onetime') {
    if (!d.date) return null;
    const dt = new Date(d.date + 'T00:00:00');
    return isNaN(dt.getTime()) ? null : dt;
  }

  if (recurringType === 'monthly') {
    if (d.day === undefined || d.day === '') return null;
    const isLast = d.day === 'last';
    const dayNum = isLast ? 0 : parseInt(d.day, 10);
    if (!isLast && isNaN(dayNum)) return null;
    let y = today.getFullYear();
    let m = today.getMonth();
    let day = isLast ? lastDayOfMonth(y, m) : Math.min(dayNum, lastDayOfMonth(y, m));
    let candidate = new Date(y, m, day);
    if (stripTime(candidate) < stripTime(today)) {
      m += 1;
      if (m > 11) { m = 0; y += 1; }
      day = isLast ? lastDayOfMonth(y, m) : Math.min(dayNum, lastDayOfMonth(y, m));
      candidate = new Date(y, m, day);
    }
    return candidate;
  }

  if (recurringType === 'annual') {
    if (d.day === undefined || d.day === '') return null;
    const isLast = d.day === 'last';
    const dayNum = isLast ? 0 : parseInt(d.day, 10);
    const monthIdx = parseInt(d.month, 10) - 1;
    if ((!isLast && isNaN(dayNum)) || isNaN(monthIdx)) return null;
    let y = today.getFullYear();
    let day = isLast ? lastDayOfMonth(y, monthIdx) : Math.min(dayNum, lastDayOfMonth(y, monthIdx));
    let candidate = new Date(y, monthIdx, day);
    if (stripTime(candidate) < stripTime(today)) {
      y += 1;
      day = isLast ? lastDayOfMonth(y, monthIdx) : Math.min(dayNum, lastDayOfMonth(y, monthIdx));
      candidate = new Date(y, monthIdx, day);
    }
    return candidate;
  }

  if (recurringType === 'custom') {
    const start = customStartDate || d.customStartDate || '';
    const freq = customFreq || d.customFreq || 'monthly';
    const count = typeof customOccurrenceCount === 'number'
      ? customOccurrenceCount
      : typeof d.customOccurrenceCount === 'number'
        ? d.customOccurrenceCount
        : undefined;
    if (!start) return null;
    const scanDate = new Date(today.getFullYear(), today.getMonth(), 1);
    for (let offset = 0; offset < 60; offset++) {
      const year = scanDate.getFullYear();
      const monthIndex = scanDate.getMonth();
      const days = customOccurrencesInMonth(start, freq, count, year, monthIndex);
      for (const day of days) {
        const candidate = new Date(year, monthIndex, day);
        if (stripTime(candidate) >= stripTime(today)) return candidate;
      }
      scanDate.setMonth(scanDate.getMonth() + 1);
    }
    return null;
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
  if (t === 'custom') return 'Custom';
  return 'One-time';
}
