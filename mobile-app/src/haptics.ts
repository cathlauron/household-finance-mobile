import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Wrapped so every call site can just call these directly, without each one
// having to worry about web (no haptics engine) or a device that errors out.
// Errors are logged (in dev only) instead of being fully silently swallowed,
// so we can actually see why a haptic didn't fire on a real device.
export function hapticSelection() {
  if (Platform.OS === 'web') return;
  Haptics.selectionAsync().catch((e) => {
    if (__DEV__) console.warn('[haptics] selectionAsync failed:', e);
  });
}

export function hapticLight() {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch((e) => {
    if (__DEV__) console.warn('[haptics] impactAsync(Light) failed:', e);
  });
}

export function hapticMedium() {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch((e) => {
    if (__DEV__) console.warn('[haptics] impactAsync(Medium) failed:', e);
  });
}