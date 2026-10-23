// Smoothness 2026-10-23 (Cath: "quick count to the new number"): when a money number you
// can see changes (Left to Spend after a transaction, a page's total), it counts to the
// new value in about half a second (COUNT_MS in motion.ts). Plain rules here so
// tests/countUp.test.mjs can check them; components/CountingText.tsx draws it.

const cents = (n: number) => Math.round(n * 100);

export function shouldCount(from: number, to: number, opts: { reduce: boolean; showing: boolean; masked: boolean }): boolean {
  if (opts.reduce || !opts.showing || opts.masked) return false;
  if (!Number.isFinite(from) || !Number.isFinite(to)) return false;
  return cents(from) !== cents(to);
}

// The value to show at progress t (0 to 1) along the curve, rounded to centavos.
export function countFrame(from: number, to: number, t: number, ease: (t: number) => number): number {
  if (t >= 1) return to;
  const p = Math.max(0, Math.min(1, ease(Math.max(0, t))));
  return cents(from + (to - from) * p) / 100;
}
