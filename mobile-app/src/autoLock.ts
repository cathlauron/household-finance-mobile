import AsyncStorage from '@react-native-async-storage/async-storage';

// How many minutes the app can sit untouched before it locks itself.
// Stored under this key so a future Settings screen can read and
// change it later with getAutoLockMinutes / setAutoLockMinutes below.
export const DEFAULT_AUTO_LOCK_MINUTES = 5;

const AUTO_LOCK_STORAGE_KEY = 'autoLockMinutes';

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
}
