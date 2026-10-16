import * as SecureStore from 'expo-secure-store';

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
}

// After a password change: keep the person signed in, with the NEW password.
// Only touches the saved copy if it belongs to this account.
export async function updateSessionPassword(username: string, password: string, email?: string): Promise<void> {
  const current = await loadSession();
  if (!current || current.username !== username) return;
  await saveSession({ ...current, password, email: email || current.email });
}
