// Cath, 2026-11-07 (mockup calendar-date-page, from her iPhone recording): tapping a date in Compact
// or Details opens a page of that date and the dates after it that have something on them.

export type DateSection<E> = { year: number; month: number; day: number; events: E[] };

// The tapped date always comes first, even with nothing on it.
export function datesFrom<E>(
  start: { year: number; month: number; day: number },
  monthCount: number,
  eventsFor: (year: number, month: number) => Record<number, E[]>
): DateSection<E>[] {
  const out: DateSection<E>[] = [];
  for (let i = 0; i < monthCount; i++) {
    const at = new Date(start.year, start.month + i, 1);
    const year = at.getFullYear();
    const month = at.getMonth();
    const events = eventsFor(year, month);
    const days = new Date(year, month + 1, 0).getDate();
    for (let day = i === 0 ? start.day : 1; day <= days; day++) {
      const list = events[day] || [];
      if (list.length || (i === 0 && day === start.day)) out.push({ year, month, day, events: list });
    }
  }
  return out;
}

const WEEKDAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function dateHeading(year: number, month: number, day: number, thisYear: number): string {
  const text = `${WEEKDAYS[new Date(year, month, day).getDay()]} — ${MONTHS[month]} ${day}`;
  return year === thisYear ? text : `${text}, ${year}`;
}
