// 2026-10-23 (Cath: calendar + should go straight to the right screen, smoothly): when a
// change happens out of sight (under the Calendar as it slides down), the tab and the
// Bills / Debts / Loans page switch at once instead of sliding, so only one thing moves
// on screen: the Calendar going away.
let quietUntil = 0;

export function quietMovesFor(ms: number) {
  quietUntil = Date.now() + ms;
}

export function movesQuiet(): boolean {
  return Date.now() < quietUntil;
}
