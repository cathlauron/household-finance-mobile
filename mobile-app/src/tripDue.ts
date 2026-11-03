import type { HouseholdModel } from './types';
import type { CalendarEvent } from './balanceProjection';

// Cath, 2026-11-03 (mockups P1 + P2): trip budget items with a due date. The unpaid ones with
// an amount are "amounts due" from your plans: To-Pay shows them under Bills ("From your
// plans"), Home's Due soon lists them, and Left to Spend counts them when due before payday.
// One list for all of those, so they always agree.

export type TripDueItem = { tripId: string; tripName: string; itemId: string; title: string; amount: number; dueDate: string };

export function tripItemsDue(model: HouseholdModel): TripDueItem[] {
  const out: TripDueItem[] = [];
  for (const trip of model.travel || []) {
    for (const item of trip.checklist || []) {
      if (item.checked || !item.dueDate || typeof item.cost !== 'number' || item.cost <= 0) continue;
      out.push({ tripId: trip.id, tripName: trip.name || 'Trip', itemId: item.id, title: item.title || 'Trip item', amount: item.cost, dueDate: item.dueDate });
    }
  }
  return out.sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0));
}

// H-63 (2026-11-03): the Calendar's days with the trip items due that month added (planned, blue).
// Only the Calendar uses this: computeMonthEvents itself never has trip items, because Left to
// Spend counts them on its own.
export function withTripItems(events: Record<number, CalendarEvent[]>, model: HouseholdModel, year: number, month: number): Record<number, CalendarEvent[]> {
  const trips = tripItemsDue(model).filter((d) => Number(d.dueDate.slice(0, 4)) === year && Number(d.dueDate.slice(5, 7)) - 1 === month);
  if (!trips.length) return events;
  const copy: Record<number, CalendarEvent[]> = { ...events };
  for (const d of trips) {
    const day = Number(d.dueDate.slice(8, 10));
    copy[day] = [...(copy[day] || []), { type: 'manual', direction: 'out', label: d.title, amount: d.amount, tripId: d.tripId, tripName: d.tripName }];
  }
  return copy;
}
