// The Calendar sheet is on top (or just sliding away): the page behind it stays put
// (RootStack reads this; CalendarScreen notes when it's leaving).
let leavingUntil = 0;
export function noteCalendarLeaving() {
  leavingUntil = Date.now() + 700;
}
export function calendarLeaving(): boolean {
  return Date.now() < leavingUntil;
}
