// ============================================================
// Household Finance App — Leaf "wind" signal (transient)
// ============================================================
// App.tsx fires this when you switch tabs (or open Settings). The falling leaves
// behind the app (src/components/FallingLeaves.tsx) listen and get blown sideways.
// `push` is in pixels for a middle-depth leaf: negative blows the leaves left
// (you moved right along the tab bar), positive blows them right.
// In-memory only, and it never delays or blocks navigation.

import { useEffect, useRef } from 'react';

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

// Onboarding: each step forward is a gust to the left, each step back a gust to the
// right, like switching tabs. Pass the current step number.
export function useLeafGustOnStep(step: number): void {
  const prev = useRef(step);
  useEffect(() => {
    if (step !== prev.current) {
      triggerLeafTransition(step > prev.current ? -150 : 150);
      prev.current = step;
    }
  }, [step]);
}
