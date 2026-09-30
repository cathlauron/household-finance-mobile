// Local-date "today" as YYYY-MM-DD. Uses the phone's own date, NOT toISOString(),
// which is UTC and wrong in the Philippines between midnight and 8am.
export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
