// Sub-pages that follow your finger (2026-10-23, Cath picked sample B): Bills / Debts /
// Loans and the other pages with sub-pages. These two rules run on the phone's animation
// thread while you swipe ('worklet'), and are plain enough for tests/subPages.test.mjs.
// Positions are page numbers: 0 = first page, 1 = second; 0.5 = halfway between.

const FAR = 0.25; // drag a quarter of the screen to turn the page
const FLICK_SPEED = 600; // or flick at least this fast (points per second)...
const FLICK_MIN = 24; // ...over at least this far
const EDGE_GIVE = 1 / 3; // past the first or last page it only gives a third as much

// Where the pages sit while your finger is down.
export function dragPosition(start: number, dx: number, width: number, count: number): number {
  'worklet';
  if (width <= 0) return start;
  const raw = start - dx / width;
  const last = count - 1;
  if (raw < 0) return raw * EDGE_GIVE;
  if (raw > last) return last + (raw - last) * EDGE_GIVE;
  return raw;
}

// Which page to settle on when you let go. Past the ends it stays put (Cath: a soft
// bounce, never a jump to another main tab).
export function settleTarget(index: number, dx: number, vx: number, width: number, count: number): number {
  'worklet';
  if (width <= 0) return index;
  const far = Math.abs(dx) > width * FAR;
  const flick = Math.abs(vx) > FLICK_SPEED && Math.abs(dx) > FLICK_MIN && Math.sign(vx) === Math.sign(dx);
  if (!far && !flick) return index;
  const next = index + (dx < 0 ? 1 : -1);
  return Math.max(0, Math.min(count - 1, next));
}
