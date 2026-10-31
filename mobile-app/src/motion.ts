// Smoothness (2026-10-23, Cath: everything should move the same way). The app's one set of
// speeds and its one curve. Tabs, pages, sheets and sub-pages all use these, so they move
// alike. tests/motion.test.mjs fails if a screen types its own speed or this curve by hand.
// Plain numbers only (no React Native imports), so the checks can read this file directly.
// Make the curve where it's used: Easing.bezier(...CURVE).

// Leaps away at once and settles gently (Emil Kowalski's drawer curve, approved P1).
export const CURVE = [0.32, 0.72, 0, 1] as const;
// The same curve played backwards (slow start, quick end), for things fading OUT just
// before something else fades in (the soft dip): the two halves meet in the middle instead
// of the old one vanishing at once and leaving an empty moment (frame recorder, 10-23).
export const CURVE_OUT = [1, 0.28, 0.68, 0] as const;

export const TAB_MS = 240; // bottom tabs
export const PAGE_OPEN_MS = 280; // a page sliding in
export const PAGE_BACK_MS = 240; // going back
export const SHEET_OPEN_MS = 280; // a pop-up sheet rising
export const SHEET_CLOSE_MS = 240; // a sheet going away
export const DIM_MS = 220; // the dim behind a sheet fading in
export const SUBPAGE_MS = 240; // Bills / Debts / Loans settling after a swipe or tap
export const COUNT_MS = 500; // a money number counting to its new value
export const ROW_MS = 220; // a row or card opening / closing, the rows below making room
export const FADE_IN_MS = 180; // something appearing (page content, a title, a toast)
export const FADE_OUT_MS = 140; // something going away
export const DIP_MS = 160; // each half of a soft dip (dark mode, whole-screen changes)
export const PEEL_TAP_MS = 1000; // a tapped peel-off sticker: one steady peel (Cath, mockup K2e, 2026-10-29)
export const VOICE_PULSE_MS = 1600; // voice entry: the mic's soft pulse while listening (Cath, mockup V, 2026-10-30)
export const AUTO_THEME_MS = 500; // Day & night switching by itself at sunset/sunrise: each half of a 1-second soft fade (Cath, 2026-10-31). Tapping stays instant.
export const SUN_ARC_MS = 1200; // the welcome's / set-up's sun travelling along its arc to the next time of day (Cath, mockup O3a, 2026-10-31)
export const WELCOME_MOMENT_MS = 4200; // the welcome's day: how long each time of day stays before the next (mockup O3a)
export const WELCOME_HOLD_MS = 8000; // after a tap on a time, the day waits this long untouched, then carries on (mockup O3a)
export const FINALE_MS = 2400; // set-up's "You're all set" screen before Home (logo draws, words rise; Cath, mockup S4, 2026-10-31)
export const VOICE_WAVE_MS = 900; // voice entry: one rise and fall of the listening bars (mockup V)

// 2026-10-26 fix (Cath's phone: "Interpolation property 'easing' is not supported by native
// animated module"). Android's native animation engine can't bend an `interpolate` with a
// curve. This writes the curve out as a row of points instead (a straight line between
// each), which the native engine runs and which looks the same.
// Use: value.interpolate({ ...curvedRange(a, b, from, to, CURVE_OUT), extrapolate: 'clamp' })
export function cubicBezierAt(curve: readonly number[], t: number): number {
  const [x1, y1, x2, y2] = curve;
  const at = (a: number, b: number, s: number) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3;
  // Find s where x(s) = t (bisection: plain and safe), then return y(s).
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (at(x1, x2, mid) < t) lo = mid;
    else hi = mid;
  }
  return at(y1, y2, (lo + hi) / 2);
}
export function curvedRange(a: number, b: number, from: number, to: number, curve: readonly number[], steps = 12) {
  const inputRange: number[] = [];
  const outputRange: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    inputRange.push(a + (b - a) * t);
    outputRange.push(from + (to - from) * cubicBezierAt(curve, t));
  }
  return { inputRange, outputRange };
}
