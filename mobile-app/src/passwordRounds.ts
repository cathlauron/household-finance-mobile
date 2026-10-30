// K5 step 2 (Cath's OK, 2026-10-27; SECURITY-3.2-PLAN.md): how many rounds a password key
// takes travels WITH its salt, inside the same text, so every place that already keeps the
// salt (this phone, the online backup, sign-in on a new phone, recovery) keeps the rounds
// too, with no new field anyone could forget.
//   "a1b2..."           an ordinary salt: 100,000 rounds (every account made so far)
//   "r600000$a1b2..."   a salt saved with its own round count (written from step 9 only)
// Never fewer than 100,000 (no one can lower it to make guessing easier), never more than
// 2,000,000 (a damaged value can't freeze the phone). Pure: the checks run it directly.

export const BASE_ROUNDS = 100_000;
export const MAX_ROUNDS = 2_000_000;

export function saltParts(salt: string): { saltHex: string; rounds: number } {
  const m = /^r(\d{1,8})\$(.+)$/.exec(salt ?? '');
  if (!m) return { saltHex: salt, rounds: BASE_ROUNDS };
  const n = Number(m[1]);
  const rounds = Math.min(MAX_ROUNDS, Math.max(BASE_ROUNDS, Number.isFinite(n) ? n : BASE_ROUNDS));
  return { saltHex: m[2], rounds };
}

// Step 9 will use this when a password is upgraded; 100,000 keeps the plain form, so a
// salt written for an ordinary account looks exactly as it always has.
export function saltWithRounds(saltHex: string, rounds: number): string {
  const r = Math.min(MAX_ROUNDS, Math.max(BASE_ROUNDS, Math.round(rounds)));
  return r === BASE_ROUNDS ? saltHex : `r${r}$${saltHex}`;
}
