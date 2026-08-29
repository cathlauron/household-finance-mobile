import AsyncStorage from '@react-native-async-storage/async-storage';

// How many minutes the app can sit untouched before it locks itself.
// Stored under this key so a future Settings screen can read and
// change it later with getAutoLockMinutes / setAutoLockMinutes below.
export const DEFAULT_AUTO_LOCK_MINUTES = 5;
const AUTO_LOCK_STORAGE_KEY = 'autoLockMinutes';

// The options shown in Settings — kept here (not in the Settings screen itself) so
// anywhere else in the app that needs to know the choices reads from one place.
export const AUTO_LOCK_OPTIONS: { minutes: number; label: string }[] = [
  { minutes: 1, label: '1 min' },
  { minutes: 5, label: '5 min' },
  { minutes: 15, label: '15 min' },
  { minutes: 30, label: '30 min' },
];

type AutoLockListener = (minutes: number) => void;
const listeners = new Set<AutoLockListener>();

// Lets App.tsx (or anything else) find out immediately when the person changes this
// setting in Settings, instead of only picking it up the next time the app is opened.
export function subscribeToAutoLockMinutes(listener: AutoLockListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function getAutoLockMinutes(): Promise<number> {
  try {
    const stored = await AsyncStorage.getItem(AUTO_LOCK_STORAGE_KEY);
    if (stored === null) return DEFAULT_AUTO_LOCK_MINUTES;
    const parsed = parseInt(stored, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_AUTO_LOCK_MINUTES;
  } catch {
    return DEFAULT_AUTO_LOCK_MINUTES;
  }
}

export async function setAutoLockMinutes(minutes: number): Promise<void> {
  await AsyncStorage.setItem(AUTO_LOCK_STORAGE_KEY, String(minutes));
  listeners.forEach((listener) => listener(minutes));
}
