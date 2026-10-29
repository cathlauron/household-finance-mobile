import type { EventItem } from './types';

// Shared by Events and Left to Spend (H-52, 2026-10-29), so both read an event's date and
// budget the same way. Moved here unchanged from EventsScreen.tsx.
export function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
// The next date this event happens (today counts), or null if it has no date.
export function nextEventDate(ev: EventItem, today: string): string | null {
  if (ev.recurrence === 'onetime') return ev.onetimeDate || null;
  if (typeof ev.month !== 'number' || typeof ev.day !== 'number') return null;
  const y = Number(today.slice(0, 4));
  const thisYear = isoOf(new Date(y, ev.month - 1, ev.day));
  return thisYear >= today ? thisYear : isoOf(new Date(y + 1, ev.month - 1, ev.day));
}
export function eventBudget(ev: EventItem): number {
  if (ev.items && ev.items.length) return ev.items.reduce((s, i) => s + (typeof i.cost === 'number' ? i.cost : 0), 0);
  return typeof ev.budget === 'number' ? ev.budget : 0;
}
