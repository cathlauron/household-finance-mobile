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
