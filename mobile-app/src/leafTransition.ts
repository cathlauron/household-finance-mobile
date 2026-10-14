// ============================================================
// Household Finance App — Leaf "wind" signal (transient)
// ============================================================
// App.tsx fires this when you switch tabs (or open Settings). The falling leaves
// behind the app (src/components/FallingLeaves.tsx) listen and get blown sideways.
// `push` is in pixels for a middle-depth leaf: negative blows the leaves left
// (you moved right along the tab bar), positive blows them right.
// In-memory only, and it never delays or blocks navigation.

type LeafTransitionListener = (push: number) => void;

const listeners = new Set<LeafTransitionListener>();

export function subscribeToLeafTransition(listener: LeafTransitionListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function triggerLeafTransition(push: number): void {
  listeners.forEach((listener) => listener(push));
}
