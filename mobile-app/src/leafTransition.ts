// ============================================================
// Household Finance App — Leaf Transition Signal (transient)
// ============================================================
// App.tsx fires this whenever the visible screen or tab changes.
// LeafTransitionOverlay listens and plays the drifting-leaves animation.
// In-memory only, and it never delays or blocks navigation.

type LeafTransitionListener = () => void;

const listeners = new Set<LeafTransitionListener>();

export function subscribeToLeafTransition(listener: LeafTransitionListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function triggerLeafTransition(): void {
  listeners.forEach((listener) => listener());
}
