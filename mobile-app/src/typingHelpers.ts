// Version 3 (Cath, 2026-10-19): small helpers for what people type.
// Plain functions with no app imports, so tests/typingHelpers.test.mjs can check them.

// ---- Recovery key: dashes appear by themselves ----
// The key is 16 characters shown as XXXX-XXXX-XXXX-XXXX. As someone types (or pastes,
// with or without dashes or spaces), keep only letters and numbers, make them capitals,
// and put a dash after every 4. Stops at 16 characters.
export function formatRecoveryKeyInput(text: string): string {
  const raw = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
  return raw.match(/.{1,4}/g)?.join('-') ?? '';
}

// ---- Email: format check and "Did you mean ...?" ----
export function isEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(email.trim());
}

// Popular email providers people mistype.
const POPULAR = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'ymail.com'];
// Real providers that happen to look close to a popular one: never "corrected".
const REAL = new Set([
  ...POPULAR,
  'mail.com', 'gmx.com', 'gmx.net', 'aol.com', 'live.com', 'msn.com', 'me.com', 'mac.com',
  'proton.me', 'protonmail.com', 'yahoo.com.ph', 'yahoo.co.uk', 'hotmail.co.uk', 'zoho.com', 'yandex.com',
  'email.com', 'outlook.ph', 'live.com.ph',
]);

function distance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      // two letters swapped (gmial) counts as one mistake
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

// Returns the corrected email when the part after @ looks like a typo of a popular
// provider (gmial.com, gmail.con, gmai.com, yaho.com, hotmial.com, outlok.com),
// otherwise null. Work and school addresses are left alone.
export function emailTypoSuggestion(email: string): string | null {
  const e = email.trim();
  const at = e.lastIndexOf('@');
  if (at < 1) return null;
  const name = e.slice(0, at);
  const domain = e.slice(at + 1).toLowerCase();
  if (!domain || REAL.has(domain)) return null;
  let best: string | null = null;
  let bestD = 3;
  for (const p of POPULAR) {
    const dd = distance(domain, p);
    if (dd < bestD) {
      bestD = dd;
      best = p;
    }
  }
  // "gmail" with no ending, or a wrong ending (gmail.co, gmail.cm)
  const stem = domain.split('.')[0];
  if (!best) {
    const p = POPULAR.find((x) => x.split('.')[0] === stem);
    if (p) best = p;
  }
  return best ? `${name}@${best}` : null;
}
