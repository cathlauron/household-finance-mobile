import { useEffect, useState } from 'react';
import type { LeftToSpendMood } from './balanceProjection';

// Version 2.2 (Cath: turning Falling leaves off on the set-up screen should show the
// difference right away): while the set-up questions are showing there's no saved
// setting yet, so the screen tells the background what to show here.
// mood (2.2, approved L2): the mood sample being looked at on the set-up screen, so the
// whole screen takes its colours before there's any money to work it out from.
// dark (2026-10-31, onboarding O3a): the welcome's night moment shows the app dark without
// changing the saved look; it fades like Day & night at sunset.
export type LookPreview = { fallingLeaves?: boolean; mood?: LeftToSpendMood; dark?: boolean };

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
