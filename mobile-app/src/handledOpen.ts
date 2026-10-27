// Version 2.2 fix (Cath: "the form still opens from time to time when I tap something
// else"): a request to open an item's form ("Edit" on its page, a swipe, a reminder)
// is handled ONCE for the whole app. Before, each list remembered it only while it was
// on screen, so coming back to the list (or the list being redrawn) opened the form again.
const handled = new Set<string>();

export function firstTimeOpen(kind: string, id: string, nonce?: number | string): boolean {
  const key = `${kind}:${id}:${nonce ?? 'none'}`;
  if (handled.has(key)) return false;
  handled.add(key);
  return true;
}
