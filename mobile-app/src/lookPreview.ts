import { useEffect, useState } from 'react';

// Version 2.2 (Cath: turning Falling leaves off on the set-up screen should show the
// difference right away): while the set-up questions are showing there's no saved
// setting yet, so the screen tells the background what to show here.
export type LookPreview = { fallingLeaves?: boolean };

let current: LookPreview = {};
const listeners = new Set<(p: LookPreview) => void>();

export function setLookPreview(p: LookPreview) {
  current = p;
  listeners.forEach((fn) => fn(current));
}

export function useLookPreview(): LookPreview {
  const [p, setP] = useState<LookPreview>(current);
  useEffect(() => {
    listeners.add(setP);
    setP(current);
    return () => {
      listeners.delete(setP);
    };
  }, []);
  return p;
}
