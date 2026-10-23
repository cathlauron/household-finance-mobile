// Smoothness 2026-10-23 (Cath): how the app changes between whole screens.
// - 'fade': the old screen fades out, then the new one fades in (no blank blink, never
//   both at once). Welcome, set-up, sign-in, unlocking, onboarding.
// - 'instant': straight to the new screen, no fade. Locking (Cath: nobody should glimpse
//   the numbers), and anything else that leaves the money screens (signing out,
//   switching account), whose data is being put away at that moment. Also the very
//   first screen after the opening animation's loading step, and Reduce Motion.
export type ScreenName = string;

const MONEY = new Set(['home', 'guest']);

export function swapPlan(from: ScreenName, to: ScreenName, reduceMotion: boolean): 'fade' | 'instant' {
  if (reduceMotion) return 'instant';
  if (to === 'locked') return 'instant';
  if (MONEY.has(from) && !MONEY.has(to)) return 'instant';
  if (from === 'loading') return 'fade';
  return 'fade';
}
