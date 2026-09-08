import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export type BiometricState = 'UNAVAILABLE' | 'ENABLED' | 'DISABLED';

function biometricsDisabledKey(username: string): string {
  return `profile:${username}:biometrics-disabled`;
}

/**
 * Checks hardware availability, enrollment, and user preference.
 * Defaults to 'ENABLED' whenever supported (opt-out model).
 */
export async function getBiometricState(username: string): Promise<BiometricState> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !isEnrolled) {
      return 'UNAVAILABLE';
    }

    const disabled = await AsyncStorage.getItem(biometricsDisabledKey(username));
    if (disabled === 'true') {
      return 'DISABLED';
    }

    return 'ENABLED';
  } catch {
    return 'UNAVAILABLE';
  }
}

/**
 * Disables or re-enables biometrics for this profile.
 * When enabled (disabled: false), removes the key so absence = enabled.
 */
export async function setBiometricsDisabled(username: string, disabled: boolean): Promise<void> {
  if (disabled) {
    await AsyncStorage.setItem(biometricsDisabledKey(username), 'true');
  } else {
    await AsyncStorage.removeItem(biometricsDisabledKey(username));
  }
}

/**
 * Dynamically resolves "Face ID", "Touch ID", "Fingerprint", or "Biometric Unlock".
 */
export async function getBiometricLabel(): Promise<string> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (Platform.OS === 'ios') {
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        return 'Face ID';
      }
      if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        return 'Touch ID';
      }
    } else {
      if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        return 'Fingerprint';
      }
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        return 'Face Unlock';
      }
    }
    return 'Biometric Unlock';
  } catch {
    return 'Biometric Unlock';
  }
}

/**
 * Executes native biometric authentication with device PIN fallback disabled.
 * Returns true on success, false on failure or cancellation.
 */
export type BiometricAuthResult = { success: boolean; error?: string };

/**
 * Executes native biometric authentication with device PIN fallback disabled.
 * Returns the real success/error result rather than collapsing it to a plain
 * boolean, so callers can tell a genuine failure (locked out, not enrolled,
 * missing Face ID permission, etc.) apart from the user simply cancelling.
 */
export async function attemptBiometricAuth(promptMessage: string): Promise<BiometricAuthResult> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      disableDeviceFallback: true,
    });
    if (result.success) return { success: true };
    return { success: false, error: (result as { error?: string }).error };
  } catch {
    return { success: false, error: 'unknown' };
  }
}

/**
 * Translates a raw biometric error code into a plain-English message. Returns
 * an empty string for a plain user/system cancel, since that isn't a real
 * error worth surfacing — the person just backed out on purpose.
 */
export function biometricErrorMessage(error: string | undefined, label: string): string {
  switch (error) {
    case 'user_cancel':
    case 'system_cancel':
    case 'app_cancel':
      return '';
    case 'lockout':
      return `${label} is temporarily locked — unlock your device with your passcode, then try again.`;
    case 'not_enrolled':
      return `No ${label} is set up on this device.`;
    case 'not_available':
      return `${label} isn't available right now.`;
    case 'missing_usage_description':
      return `${label} isn't available in this preview build — try again once the app is installed normally.`;
    default:
      return `Couldn't verify ${label} — try again.`;
  }
}

