import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AvatarConfig } from './types';

// A small, unencrypted local record of which accounts have recently signed
// in on THIS device, purely so the account-switcher screen can draw a list
// of avatars before asking for fingerprint/PIN. Nothing secret lives here.
// The real data stays encrypted as it always has.
export type RecentAccount = {
  username: string;
  uid: string;
  householdId?: string;
  avatarConfig?: AvatarConfig;
  lastUsedAt: number;
  hasPin: boolean;
  biometricsEnabled: boolean;
};

const RECENT_ACCOUNTS_KEY = '@recent_accounts';

// Same as the household member limit.
export const MAX_RECENT_ACCOUNTS = 5;

// Newest first.
export async function loadRecentAccounts(): Promise<RecentAccount[]> {
  const raw = await AsyncStorage.getItem(RECENT_ACCOUNTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort(
      (a: RecentAccount, b: RecentAccount) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0)
    );
  } catch (e) {
    return [];
  }
}

async function saveRecentAccounts(accounts: RecentAccount[]): Promise<void> {
  // TEMP (Step 2 check, remove in Step 4): shows what was saved, without photo data.
  console.log(
    '[recent accounts] saved:',
    JSON.stringify(
      accounts.map((a) => ({
        username: a.username,
        uid: a.uid ? 'yes' : 'NO',
        hasPin: a.hasPin,
        bio: a.biometricsEnabled,
        avatar: a.avatarConfig ? a.avatarConfig.type : 'none',
      }))
    )
  );
  await AsyncStorage.setItem(RECENT_ACCOUNTS_KEY, JSON.stringify(accounts));
}

// Adds or updates one account, keeping any field that is not passed in
// (a field passed as undefined counts as "not passed in").
// Only the 5 most recently used accounts are kept. Returns the usernames
// that were pushed off the list, so the caller can also wipe their
// quick-unlock data (added in Step 3).
export async function upsertRecentAccount(
  patch: Partial<RecentAccount> & { username: string }
): Promise<string[]> {
  const cleaned: any = {};
  for (const k of Object.keys(patch)) {
    const v = (patch as any)[k];
    if (v !== undefined) cleaned[k] = v;
  }

  const accounts = await loadRecentAccounts();
  const idx = accounts.findIndex((a) => a.username === patch.username);
  if (idx === -1) {
    accounts.push({
      username: patch.username,
      uid: '',
      lastUsedAt: Date.now(),
      hasPin: false,
      biometricsEnabled: false,
      ...cleaned,
    });
  } else {
    accounts[idx] = { ...accounts[idx], ...cleaned };
  }

  accounts.sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0));
  const kept = accounts.slice(0, MAX_RECENT_ACCOUNTS);
  const evicted = accounts.slice(MAX_RECENT_ACCOUNTS).map((a) => a.username);
  await saveRecentAccounts(kept);
  return evicted;
}

// Updates an account ONLY if it is already in the list. Used for background
// changes (PIN, fingerprint, avatar) so they never create a half-empty entry
// (no uid) for an account that has not signed in since this feature existed.
export async function updateRecentAccountIfPresent(
  username: string,
  patch: Partial<RecentAccount>
): Promise<void> {
  const accounts = await loadRecentAccounts();
  if (!accounts.some((a) => a.username === username)) return;
  await upsertRecentAccount({ ...patch, username });
}

// Removes one account from the switcher entirely. Used on explicit log out
// and remote revoke: those mean "full password sign-in only" from then on.
export async function removeRecentAccount(username: string): Promise<void> {
  const accounts = await loadRecentAccounts();
  await saveRecentAccounts(accounts.filter((a) => a.username !== username));
}
