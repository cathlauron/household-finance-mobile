// H-02 (2026-10-22, Cath chose "switch the bigger storage on for real households"):
// storage in parts was only switched on for test accounts. It is now on for everyone,
// with one safety rule: a household only moves its main copy into the parts (layout 2,
// needed once it's over about 1 MB) when EVERY member's phone has said it runs a version
// that reads parts. A phone that can't (e.g. a 2.1 build with a real username) would
// otherwise keep showing the old copy and miss every new change.
//
// No Firebase imports here, so the checks can run this file directly.

// The version this app reports (households/{id}.memberVersions.{uid}). 2.2 is the first
// version that reads parts for every account.
export const PARTS_READER_VERSION = '2.2';

// 3.0 (Cath, 2026-10-27): receipts on shared expenses, payments and trip items get their
// own parts too, but only once every phone reports 3.0 or newer. A 2.2 phone doesn't know
// those parts and would delete them on its next save, so until then they stay inside the
// main copy (safe on every version, just bigger).
export const EXTRA_RECEIPTS_VERSION = '3.0';

// "2.10" is newer than "2.2"; anything unreadable counts as too old.
export function versionAtLeast(version: unknown, min: string): boolean {
  if (typeof version !== 'string' || !/^\d+(\.\d+)*$/.test(version)) return false;
  const a = version.split('.').map(Number);
  const b = min.split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return true;
}

// True when every member listed on the household has reported a version that reads parts.
export function everyoneReadsParts(members: unknown, memberVersions: unknown, min = PARTS_READER_VERSION): boolean {
  if (!Array.isArray(members) || members.length === 0) return false;
  const versions = memberVersions && typeof memberVersions === 'object' ? (memberVersions as Record<string, unknown>) : {};
  return members.every((uid) => typeof uid === 'string' && versionAtLeast(versions[uid], min));
}

// Before 2.2 this said "only usernames starting with test" (the 2.1 trial). Now: everyone.
export function partsEnabledFor(username: string | null | undefined): boolean {
  return !!username;
}
