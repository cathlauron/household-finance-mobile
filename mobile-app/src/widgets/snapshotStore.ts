import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WidgetSnapshot } from './widgetData';

// The widgets' summary on this phone (display numbers only; •••• with Hide amounts on).
// Removed on sign out, so the widgets go back to "Open the app once".
const KEY = 'widgetSnapshotV1';
export async function saveWidgetSnapshot(s: WidgetSnapshot | null): Promise<void> {
  if (s) await AsyncStorage.setItem(KEY, JSON.stringify(s));
  else await AsyncStorage.removeItem(KEY);
}
export async function loadWidgetSnapshot(): Promise<WidgetSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as WidgetSnapshot) : null;
  } catch {
    return null;
  }
}
