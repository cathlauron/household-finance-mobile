// Version 2.2 (Cath: after Add she wanted to land on the list and SEE the new one, with
// the same slide-in and glow as Transactions): when a form is opened somewhere else (a
// switch to another kind, the calendar, + on Home), it notes which items already exist.
// The list then knows which one is new when it shows, even if it only appears now, and
// lights it up and scrolls to it.
let pending: { kind: string; before: Set<string>; at: number } | null = null;

export function expectArrival(kind: string, beforeIds: string[]) {
  pending = { kind, before: new Set(beforeIds), at: Date.now() };
}

// The new id for this list, if one was expected and has arrived (forgotten once used).
export function takeExpectedArrival(kind: string, ids: string[]): string | null {
  if (!pending || pending.kind !== kind) return null;
  if (Date.now() - pending.at > 2 * 60 * 1000) {
    pending = null;
    return null;
  }
  const before = pending.before;
  const fresh = ids.find((id) => !before.has(id));
  if (!fresh) return null;
  pending = null;
  return fresh;
}
