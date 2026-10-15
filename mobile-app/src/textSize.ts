import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Text size (Settings › Appearance): Small, Medium or Large. Every Text and TextInput
// in the app comes from components/AppText.tsx, which multiplies its font size (and
// line height) by the scale below, so one setting resizes the whole app.
// Large is the size the app used before this setting existed; Medium (the default) is
// a little smaller, as Cath asked. Saved on this phone only, like the + button side.
// The phone's own font-size setting still applies on top of this.

export type TextSize = 'small' | 'medium' | 'large';

export const TEXT_SIZE_OPTIONS: { id: TextSize; label: string }[] = [
  { id: 'small', label: 'Small' },
  { id: 'medium', label: 'Medium' },
  { id: 'large', label: 'Large' },
];

const SCALE: Record<TextSize, number> = { small: 0.86, medium: 0.93, large: 1 };
const STORAGE_KEY = 'textSizePreference';

let current: TextSize = 'medium';
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

// Started as soon as the app loads; App.tsx waits for it (with the fonts) so text never
// jumps from one size to another on launch.
export const textSizeLoaded: Promise<void> = AsyncStorage.getItem(STORAGE_KEY)
  .then((saved) => {
    if (saved === 'small' || saved === 'medium' || saved === 'large') current = saved;
  })
  .catch(() => {});

export function setTextSize(size: TextSize) {
  current = size;
  emit();
  AsyncStorage.setItem(STORAGE_KEY, size).catch(() => {});
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useTextSize(): TextSize {
  return useSyncExternalStore(subscribe, () => current, () => current);
}

export function useTextScale(): number {
  return SCALE[useTextSize()];
}
