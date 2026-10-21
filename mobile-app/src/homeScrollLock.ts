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
