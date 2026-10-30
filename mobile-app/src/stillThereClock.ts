// H-42 (Cath, 2026-10-29): the "Are you still there?" timer keeps counting while the app is
// in the background. 5 minutes without a touch asks; 1 more minute without an answer hides
// the amounts. Coming back after 6 minutes or more, the amounts are already hidden (no
// question first); coming back between 5 and 6 minutes, the question shows with only the
// seconds that are left.
export const STILL_THERE_AFTER_MS = 5 * 60 * 1000;
export const ANSWER_MS = 60 * 1000;

export type StillThereState = { kind: 'fine' } | { kind: 'ask'; deadline: number } | { kind: 'hide' };

export function stillThereState(lastTouch: number, now: number): StillThereState {
  const idle = now - lastTouch;
  if (idle < STILL_THERE_AFTER_MS) return { kind: 'fine' };
  const deadline = lastTouch + STILL_THERE_AFTER_MS + ANSWER_MS;
  if (now >= deadline) return { kind: 'hide' };
  return { kind: 'ask', deadline };
}

// Seconds left on the question (shown as the countdown), never below 0.
export function secondsLeft(deadline: number, now: number): number {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
