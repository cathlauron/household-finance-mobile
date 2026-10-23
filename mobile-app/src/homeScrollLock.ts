// Version 2.2 (Cath: holding a Home card and moving it froze after a few seconds): while a
// card is held, Home's page must not scroll, or the page takes over the finger and the
// card stops following it. HomeWallet locks the page; Home's scroll view listens.
type Listener = (locked: boolean) => void;
const listeners = new Set<Listener>();

export function setHomeScrollLocked(locked: boolean) {
  listeners.forEach((l) => l(locked));
}

export function onHomeScrollLock(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

// Version 2.2 (Cath: a held card dragged to the top or bottom of the screen should
// scroll the page along): Home's page lets the Wallet move it while a card is held.
type Scroller = { scrollBy: (dy: number) => number };
let scroller: Scroller | null = null;
export function registerHomeScroller(s: Scroller | null) {
  scroller = s;
}
// Scrolls Home by up to dy points; returns how far it actually moved (0 at the ends).
export function scrollHomeBy(dy: number): number {
  return scroller ? scroller.scrollBy(dy) : 0;
}
