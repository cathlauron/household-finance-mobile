// Cath, 2026-11-03 (mockup PW1): how strong a new password is, shown as a 4-part bar and a word
// under it, like other apps. It only guides: saving still needs at least 6 characters, as before.
// Plain logic only, so tests/passwordStrength.test.mjs can check it.

export type Strength = { level: 0 | 1 | 2 | 3 | 4; word: string; tip: string };

const WORDS = ['Too short', 'Weak', 'Okay', 'Good', 'Strong'] as const;
const TIPS = ['At least 6 characters', 'Make it longer', 'Add a number or a symbol', 'Nearly there', 'Great'] as const;
const COMMON = ['password', '123456', 'qwerty', 'iloveyou', 'admin', 'welcome', 'letmein', 'abc123', '111111', 'financeflow'];

export function passwordStrength(p: string): Strength | null {
  if (!p) return null;
  const pick = (level: Strength['level'], tip?: string): Strength => ({ level, word: WORDS[level], tip: tip ?? TIPS[level] });
  if (p.length < 6) return pick(0);
  const low = p.toLowerCase();
  if (COMMON.some((c) => low.includes(c))) return pick(1, 'Avoid common passwords');
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(p)).length;
  let points = 1;
  if (p.length >= 8) points++;
  if (p.length >= 12) points++;
  if (kinds >= 3) points++;
  if (p.length >= 16 || kinds === 4) points++;
  return pick(Math.min(4, points) as Strength['level']);
}
