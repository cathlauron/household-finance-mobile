// K3 (Cath's OK: "key chain", option A; also when someone leaves by themselves).
// The decisions about a household's key, with no Firebase or phone modules, so the
// automatic checks run them directly. See keyChain.ts for the Firebase side and
// SECURITY-3.2-PLAN.md for the whole design.
//
// households/{id}:
//   keyVersion  0 (or missing) = the key the household was made with; +1 at every re-lock
//   keyMembers  everyone who has ever held the current key (members are added as they join)
//   dataKv / dataAt  every save after a re-lock names the key version and is stamped "now"
// households/{id}/keyChain/{n}: key n, locked with key n-1 (members only, never changed).

import { versionAtLeast } from './partsGate';

// The version a phone reports once it understands the key chain. A household is only
// re-locked when every member's phone reports this or newer (an older phone couldn't
// pick up the new key and would stop syncing).
export const KEYCHAIN_READER_VERSION = '3.2.1';

function uids(list: unknown): string[] {
  return Array.isArray(list) ? list.filter((u): u is string => typeof u === 'string') : [];
}

// Someone who held the current key is no longer a member: the household needs a new key.
export function needsRelock(keyMembers: unknown, members: unknown): boolean {
  const now = new Set(uids(members));
  return uids(keyMembers).some((u) => !now.has(u));
}

// Members who joined since the key was last made are added to keyMembers (never removed
// here: only a re-lock resets the list). Returns null when nothing needs writing.
// A household from before K3 has no list yet: it starts with today's members.
export function keyMembersToWrite(keyMembers: unknown, members: unknown): string[] | null {
  const have = uids(keyMembers);
  const missing = uids(members).filter((u) => !have.includes(u));
  if (Array.isArray(keyMembers) && missing.length === 0) return null;
  return [...have, ...missing];
}

// Only the owner re-locks, only with 2+ members left (with 1 left the household closes, as
// before), and only when every member's phone can pick the new key up.
export function canRelockNow(opts: { myUid: string; owner: unknown; members: unknown; memberVersions: unknown }): boolean {
  const members = uids(opts.members);
  if (opts.owner !== opts.myUid || members.length < 2 || !members.includes(opts.myUid)) return false;
  const v = opts.memberVersions && typeof opts.memberVersions === 'object' ? (opts.memberVersions as Record<string, unknown>) : {};
  return members.every((u) => versionAtLeast(v[u], KEYCHAIN_READER_VERSION));
}

// Walking the chain. links: the chain docs as [n, wrapped]. unwrap(wrapped, key) returns the
// next key or throws when this key doesn't open it. The key we hold is key n-1 for the first
// link it opens; from there each link opens the next. Holding the newest key, no link opens:
// the key is already current.
export function walkChain<K>(
  links: { n: number; wrapped: string }[],
  key: K,
  unwrap: (wrapped: string, key: K) => K
): { key: K; version: number; older: K[] } {
  const sorted = [...links].filter((l) => Number.isInteger(l.n) && l.n > 0).sort((a, b) => a.n - b.n);
  const newest = sorted.length ? sorted[sorted.length - 1].n : 0;
  let start = -1;
  let next: K | null = null;
  for (let i = 0; i < sorted.length; i++) {
    try {
      next = unwrap(sorted[i].wrapped, key);
      start = i;
      break;
    } catch {}
  }
  if (start < 0 || next === null) return { key, version: newest, older: [] };
  const older: K[] = [key];
  let current = next;
  let version = sorted[start].n;
  for (let i = start + 1; i < sorted.length; i++) {
    if (sorted[i].n !== version + 1) break; // a gap: stop at what's certain
    try {
      const k = unwrap(sorted[i].wrapped, current);
      older.push(current);
      current = k;
      version = sorted[i].n;
    } catch {
      break;
    }
  }
  return { key: current, version, older };
}
