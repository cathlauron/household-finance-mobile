import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cath, 2026-10-30: the "New" tag on Help & FAQ disappears once it has been opened on this
// phone. Until the saved answer is read it counts as seen, so the tag never flashes on and off.
const KEY = 'helpFaqSeenV1';
let seen: boolean | null = null;
const listeners = new Set<(v: boolean) => void>();

// Read as soon as the app loads, so it's known long before About & Help is opened.
AsyncStorage.getItem(KEY)
  .then((r) => {
    if (seen === null) seen = r === '1';
    listeners.forEach((l) => l(!!seen));
  })
  .catch(() => {});

export function markHelpSeen(): void {
  seen = true;
  listeners.forEach((l) => l(true));
  AsyncStorage.setItem(KEY, '1').catch(() => {});
}

export function useHelpSeen(): boolean {
  const [v, setV] = useState<boolean>(seen ?? true);
  useEffect(() => {
    listeners.add(setV);
    if (seen === null) {
      AsyncStorage.getItem(KEY)
        .then((r) => {
          seen = r === '1';
          listeners.forEach((l) => l(!!seen));
        })
        .catch(() => {});
    } else setV(seen);
    return () => {
      listeners.delete(setV);
    };
  }, []);
  return v;
}

// For checks only.
export function resetHelpSeenForTests(): void {
  seen = null;
}
