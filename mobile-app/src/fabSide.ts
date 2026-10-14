import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Redesign: which side of the screen the floating + button sits on.
// Right by default; left-handed people can switch it in Settings › Appearance.
// Saved on this phone only (it's a comfort setting, not household data).

export type FabSide = 'left' | 'right';

const STORAGE_KEY = 'fabSidePreference';
let current: FabSide = 'right';
let loaded = false;
const listeners = new Set<(side: FabSide) => void>();

function emit() {
  listeners.forEach((l) => l(current));
}

function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  AsyncStorage.getItem(STORAGE_KEY)
    .then((saved) => {
      if (saved === 'left' || saved === 'right') {
        current = saved;
        emit();
      }
    })
    .catch(() => {});
}

export function setFabSide(side: FabSide) {
  current = side;
  emit();
  AsyncStorage.setItem(STORAGE_KEY, side).catch(() => {});
}

export function useFabSide(): FabSide {
  ensureLoaded();
  const [side, setSide] = useState<FabSide>(current);
  useEffect(() => {
    listeners.add(setSide);
    setSide(current);
    return () => {
      listeners.delete(setSide);
    };
  }, []);
  return side;
}
