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
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'Face ID';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
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
export async function attemptBiometricAuth(promptMessage: string): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      disableDeviceFallback: true,
    });
    return result.success === true;
  } catch {
    return false;
  }
}
