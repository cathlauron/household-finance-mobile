import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

// Mockup R1 (Cath 2026-10-30): save the Secret Recovery Key in the phone's password manager.
// Only in the installed Android app (modules/ff-keysave); Expo Go and iPhone don't have it
// yet, so the button isn't shown there.
type Native = { savePassword(id: string, password: string): Promise<'saved' | 'cancelled'> };
function load(): Native | null {
  try {
    return Platform.OS === 'android' ? requireOptionalNativeModule<Native>('FFKeySave') : null;
  } catch {
    return null;
  }
}

export function canSaveToPasswordManager(): boolean {
  return !!load();
}

// How it's listed in the password manager: "Finance Flow Recovery Key – cath".
export function recoveryKeyLabel(username: string): string {
  return `Finance Flow Recovery Key – ${username}`;
}

export async function saveRecoveryKey(username: string, key: string): Promise<'saved' | 'cancelled'> {
  const n = load();
  if (!n) throw new Error('Not available on this phone.');
  return n.savePassword(recoveryKeyLabel(username), key);
}
