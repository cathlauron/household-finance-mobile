// Local-date "today" as YYYY-MM-DD. Uses the phone's own date, NOT toISOString(),
// which is UTC and wrong in the Philippines between midnight and 8am.
export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 2026-10-22 (Cath): dates show the year only when it isn't this year: "Nov 11" this
// year, "Aug 18, 2027" next year. weekday adds "Fri, ".
export function dateText(d: Date, opts: { weekday?: boolean } = {}, now: Date = new Date()): string {
  if (!(d instanceof Date) || isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    ...(opts.weekday ? { weekday: 'short' as const } : {}),
    month: 'short',
    day: 'numeric',
    ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' as const } : {}),
  });
}
