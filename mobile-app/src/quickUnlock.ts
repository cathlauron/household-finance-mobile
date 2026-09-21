import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deriveKey, encryptJSON, decryptJSON, generateSalt } from './encryption';

// Quick unlock storage. For each account, up to two locked copies of that
// account's { email, username, password } can sit in the phone's secure vault:
//   1. FINGERPRINT copy: the phone itself demands a fingerprint to hand it back.
//   2. PIN copy: scrambled with a key made from the Quick PIN.
// The stored password is the REAL account password, so both copies must be
// wiped on log out, remote revoke, 5 wrong PINs, a password change, and when
// the account drops off the recent-accounts list. Nothing here is called yet
// (Step 3a); later steps call it.

export type QuickUnlockCredentials = {
  email: string;
  username: string;
  password: string;
};

export const MAX_PIN_ATTEMPTS = 5;

// "This device only": never copied to backups or a new phone (iOS).
const ACCESSIBLE = SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY;

// SecureStore key names may only contain letters, digits, ".", "-" and "_".
// Usernames already follow that rule (sanitizeUsername).
function fingerprintItemKey(username: string): string {
  return `qu_fp_${username}`;
}
function pinItemKey(username: string): string {
  return `qu_pin_${username}`;
}
// Plain markers in AsyncStorage, so the app can ask "is there a copy?"
// without triggering a fingerprint prompt.
function fingerprintMarkerKey(username: string): string {
  return `quickunlock:${username}:fp`;
}
function pinSaltKey(username: string): string {
  return `quickunlock:${username}:pin-salt`;
}
function pinFailsKey(username: string): string {
  return `quickunlock:${username}:pin-fails`;
}

function isCredentials(v: any, username: string): v is QuickUnlockCredentials {
  return (
    !!v &&
    typeof v.email === 'string' &&
    typeof v.password === 'string' &&
    typeof v.username === 'string' &&
    v.email.length > 0 &&
    v.password.length > 0 &&
    v.username === username
  );
}

// Android: "User canceled the authentication". iOS: "User canceled the operation."
function isCancel(e: any): boolean {
  return /cancel/i.test(String((e && e.message) || e || ''));
}

// Tells the app which copies exist WITHOUT any prompt. This is only a hint:
// if the phone's fingerprints changed, the fingerprint copy can exist here
// but be unreadable.
export async function getQuickUnlockPresence(
  username: string
): Promise<{ fingerprint: boolean; pin: boolean }> {
  try {
    const [fp, salt] = await Promise.all([
      AsyncStorage.getItem(fingerprintMarkerKey(username)),
      AsyncStorage.getItem(pinSaltKey(username)),
    ]);
    return { fingerprint: fp === 'true', pin: !!salt };
  } catch (e) {
    return { fingerprint: false, pin: false };
  }
}

// ---------- Fingerprint copy ----------

export type SaveResult = 'saved' | 'cancelled' | 'failed';

// On Android, saving itself shows a fingerprint prompt.
export async function saveFingerprintCopy(creds: QuickUnlockCredentials): Promise<SaveResult> {
  try {
    await SecureStore.setItemAsync(fingerprintItemKey(creds.username), JSON.stringify(creds), {
      requireAuthentication: true,
      authenticationPrompt: 'Turn on quick unlock',
      keychainAccessible: ACCESSIBLE,
    });
    await AsyncStorage.setItem(fingerprintMarkerKey(creds.username), 'true');
    return 'saved';
  } catch (e) {
    return isCancel(e) ? 'cancelled' : 'failed';
  }
}

export type FingerprintLoadResult =
  | { status: 'ok'; creds: QuickUnlockCredentials }
  | { status: 'cancelled' }
  | { status: 'missing' } // nothing stored, or the phone's fingerprints changed (Android returns nothing)
  | { status: 'error' };

// Calling this is what shows the phone's fingerprint prompt.
export async function loadFingerprintCopy(username: string): Promise<FingerprintLoadResult> {
  try {
    const raw = await SecureStore.getItemAsync(fingerprintItemKey(username), {
      requireAuthentication: true,
      authenticationPrompt: 'Unlock Finance Flow',
    });
    if (!raw) return { status: 'missing' };
    const parsed = JSON.parse(raw);
    if (!isCredentials(parsed, username)) return { status: 'missing' };
    return { status: 'ok', creds: parsed };
  } catch (e) {
    return isCancel(e) ? { status: 'cancelled' } : { status: 'error' };
  }
}

export async function removeFingerprintCopy(username: string): Promise<void> {
  await SecureStore.deleteItemAsync(fingerprintItemKey(username)).catch(() => {});
  await AsyncStorage.removeItem(fingerprintMarkerKey(username)).catch(() => {});
}

// ---------- PIN copy ----------

// The PIN itself is never stored. Only a key made from it (same stretching as
// the real password) scrambles the credentials before they are saved.
export async function savePinCopy(creds: QuickUnlockCredentials, pin: string): Promise<boolean> {
  try {
    const salt = await generateSalt();
    const pinKey = deriveKey(pin, salt);
    const wrapped = await encryptJSON(pinKey, creds);
    await SecureStore.setItemAsync(pinItemKey(creds.username), wrapped, {
      keychainAccessible: ACCESSIBLE,
    });
    await AsyncStorage.setItem(pinSaltKey(creds.username), salt);
    await AsyncStorage.removeItem(pinFailsKey(creds.username)).catch(() => {});
    return true;
  } catch (e) {
    return false;
  }
}

export async function removePinCopy(username: string): Promise<void> {
  await SecureStore.deleteItemAsync(pinItemKey(username)).catch(() => {});
  await AsyncStorage.removeItem(pinSaltKey(username)).catch(() => {});
  await AsyncStorage.removeItem(pinFailsKey(username)).catch(() => {});
}

// ---------- Wrong-PIN counter ----------

async function readPinFailures(username: string): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(pinFailsKey(username));
    return parseInt(raw ?? '0', 10) || 0;
  } catch (e) {
    return 0;
  }
}

// Call after ANY successful unlock (fingerprint, PIN or password).
export async function resetPinFailures(username: string): Promise<void> {
  await AsyncStorage.removeItem(pinFailsKey(username)).catch(() => {});
}

// For a PIN check done somewhere else (for example the lock screen, Step 3c):
// counts one wrong PIN, and on the 5th wipes both copies.
export async function registerPinFailure(
  username: string
): Promise<{ wiped: boolean; attemptsLeft: number }> {
  const fails = (await readPinFailures(username)) + 1;
  if (fails >= MAX_PIN_ATTEMPTS) {
    await wipeQuickUnlock(username);
    return { wiped: true, attemptsLeft: 0 };
  }
  await AsyncStorage.setItem(pinFailsKey(username), String(fails)).catch(() => {});
  return { wiped: false, attemptsLeft: MAX_PIN_ATTEMPTS - fails };
}

export type PinAttemptResult =
  | { status: 'ok'; creds: QuickUnlockCredentials }
  | { status: 'wrong'; attemptsLeft: number }
  | { status: 'wiped' } // 5th wrong PIN: both copies are gone, full password needed
  | { status: 'missing' }; // no PIN copy on this phone

// Tries the PIN against the PIN copy. The wrong-PIN count goes up BEFORE the
// check and resets on success, so force-closing the app mid-attempt cannot
// skip a strike.
export async function attemptPinUnlock(username: string, pin: string): Promise<PinAttemptResult> {
  try {
    const [salt, wrapped] = await Promise.all([
      AsyncStorage.getItem(pinSaltKey(username)),
      SecureStore.getItemAsync(pinItemKey(username)),
    ]);
    if (!salt || !wrapped) return { status: 'missing' };

    const attemptNumber = (await readPinFailures(username)) + 1;
    if (attemptNumber > MAX_PIN_ATTEMPTS) {
      await wipeQuickUnlock(username);
      return { status: 'wiped' };
    }
    await AsyncStorage.setItem(pinFailsKey(username), String(attemptNumber)).catch(() => {});

    let creds: QuickUnlockCredentials | null = null;
    try {
      const parsed = decryptJSON<any>(deriveKey(pin, salt), wrapped);
      if (isCredentials(parsed, username)) creds = parsed;
    } catch (e) {
      // wrong PIN: decryption fails
    }

    if (creds) {
      await resetPinFailures(username);
      return { status: 'ok', creds };
    }
    if (attemptNumber >= MAX_PIN_ATTEMPTS) {
      await wipeQuickUnlock(username);
      return { status: 'wiped' };
    }
    return { status: 'wrong', attemptsLeft: MAX_PIN_ATTEMPTS - attemptNumber };
  } catch (e) {
    return { status: 'missing' };
  }
}

// ---------- Wipe ----------

// Removes BOTH copies and the wrong-PIN counter for one account. Called on
// explicit log out, remote revoke, the 5th wrong PIN, and when the account
// drops off the recent-accounts list. Never throws. Deleting needs no
// fingerprint.
export async function wipeQuickUnlock(username: string): Promise<void> {
  await removeFingerprintCopy(username);
  await removePinCopy(username);
}
