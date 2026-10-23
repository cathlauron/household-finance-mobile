// Version 2.2 (canvas S1-S3): touches inside pop-up forms don't reach the app's main
// screen, so the forms say "someone is here" through this, and the "Are you still there?"
// and Auto-lock timers start again.
const listeners = new Set<() => void>();
let last = 0;
export function noteActivity() {
  const now = Date.now();
  if (now - last < 1000) return; // at most once a second
  last = now;
  listeners.forEach((fn) => fn());
}
export function onActivity(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
