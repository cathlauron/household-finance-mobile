import * as SecureStore from 'expo-secure-store';
import CryptoJS from 'crypto-js';

// "Sign in once": after a successful sign-in, the account's sign-in details are kept
// in the phone's secure vault (never in plain storage), so the next time the app opens
// it can go straight from the opening screen to Home without asking for a password.
//
// Only ONE account is remembered at a time: the one that was last open.
// The saved copy is removed on: Log out, Switch account, this phone being signed out
// from another device (remote revoke), and a saved password that no longer works.
// A password change replaces the saved password with the new one.
//
// Cath chose this on purpose (2026-10-15): anyone holding the unlocked phone can open
// the app. "Lock app now" and Log out still work whenever she wants them.

export type SavedSession = { email: string; username: string; password: string };

const ITEM_KEY = 'stay_signed_in_session';
// Version 2.2 (Cath chose "best of both" for opening speed, Oct 20): the remembered
// account's UNLOCKED key, so reopening the app skips the slow password-to-key step.
// Same vault and same rules as the saved password above (the key is no more powerful
// than that password); it is wiped together with it (clearSession), and dropped on a
// password change. Only used when it still opens the saved data; otherwise it's wiped
// and the key is made from the password again.
const KEY_ITEM = 'stay_signed_in_key';
// "This device only": never copied to backups or to a new phone (iOS).
const ACCESSIBLE = SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY;

function isSession(v: any): v is SavedSession {
  return (
    !!v &&
    typeof v.email === 'string' &&
    typeof v.username === 'string' &&
    typeof v.password === 'string' &&
    v.email.length > 0 &&
    v.username.length > 0 &&
    v.password.length > 0
  );
}

export async function saveSession(session: SavedSession): Promise<void> {
  try {
    await SecureStore.setItemAsync(ITEM_KEY, JSON.stringify(session), { keychainAccessible: ACCESSIBLE });
  } catch (e) {
    // Not fatal: the app simply asks for the password next time.
  }
}

export async function loadSession(): Promise<SavedSession | null> {
  try {
    const raw = await SecureStore.getItemAsync(ITEM_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isSession(parsed) ? parsed : null;
  } catch (e) {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(ITEM_KEY).catch(() => {});
  await clearSessionKey();
}

// ---- The remembered account's unlocked key ----

type SavedKey = { username: string; salt: string; key: string };

export async function saveSessionKey(username: string, salt: string, key: CryptoJS.lib.WordArray): Promise<void> {
  try {
    if (!username || !salt || !key || key.sigBytes !== 32) return;
    const item: SavedKey = { username, salt, key: key.toString(CryptoJS.enc.Hex) };
    await SecureStore.setItemAsync(KEY_ITEM, JSON.stringify(item), { keychainAccessible: ACCESSIBLE });
  } catch (e) {
    // Not fatal: the next open just takes the slow path.
  }
}

// The key, only if it was saved for this account AND this salt (a new password or a
// recovery gives a new salt, so an old key is never offered).
export async function loadSessionKey(username: string, salt: string): Promise<CryptoJS.lib.WordArray | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEY_ITEM);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v || v.username !== username || v.salt !== salt || typeof v.key !== 'string' || !/^[0-9a-f]{64}$/.test(v.key)) return null;
    return CryptoJS.enc.Hex.parse(v.key);
  } catch (e) {
    return null;
  }
}

export async function clearSessionKey(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_ITEM).catch(() => {});
}

// After a password change: keep the person signed in, with the NEW password.
// Only touches the saved copy if it belongs to this account.
export async function updateSessionPassword(username: string, password: string, email?: string): Promise<void> {
  const current = await loadSession();
  if (!current || current.username !== username) return;
  await saveSession({ ...current, password, email: email || current.email });
  // The new password came with a new salt and key: the next open makes (and keeps) it.
  await clearSessionKey();
}
