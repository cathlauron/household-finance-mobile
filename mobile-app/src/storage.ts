import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const PROFILES_INDEX_KEY = 'profiles-index';

export type ProfileIndexEntry = {
  username: string;
  salt: string;
  // Set once this profile is linked to a shared household (Checkpoint 9.2+).
  // Undefined/absent means "not linked — personal data only," same as every
  // profile before this checkpoint.
  householdId?: string;
};

export async function loadProfilesIndex(): Promise<ProfileIndexEntry[]> {
  const raw = await AsyncStorage.getItem(PROFILES_INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export async function saveProfilesIndex(profiles: ProfileIndexEntry[]): Promise<void> {
  await AsyncStorage.setItem(PROFILES_INDEX_KEY, JSON.stringify(profiles));
}

// Updates just one profile's stored salt — used when changing a password, since a new
// password always gets a fresh salt (see encryption.ts's generateSalt()). Does nothing
// if the username isn't found, so a caller can't accidentally add a stray new entry here.
export async function updateProfileSalt(username: string, newSalt: string): Promise<void> {
  const profiles = await loadProfilesIndex();
  const idx = profiles.findIndex((p) => p.username === username);
  if (idx === -1) return;
  profiles[idx] = { ...profiles[idx], salt: newSalt };
  await saveProfilesIndex(profiles);
}

// Records (or clears, by passing undefined) which household this profile is linked to.
// Same "do nothing if username not found" safety as updateProfileSalt above.
export async function updateProfileHouseholdId(username: string, householdId: string | undefined): Promise<void> {
  const profiles = await loadProfilesIndex();
  const idx = profiles.findIndex((p) => p.username === username);
  if (idx === -1) return;
  const next = { ...profiles[idx] };
  if (householdId) next.householdId = householdId;
  else delete next.householdId;
  profiles[idx] = next;
  await saveProfilesIndex(profiles);
}

function profileDataKey(username: string): string {
  return `profile:${username}:app-data`;
}

// Saves already-encrypted data (a string) exactly as given — encryption happens in the
// screen that calls this, using encryptJSON from encryption.ts.
export async function saveEncryptedProfileData(username: string, encryptedPayload: string): Promise<void> {
  await AsyncStorage.setItem(profileDataKey(username), encryptedPayload);
}

// Returns the raw encrypted string for a profile, or null if nothing's saved yet.
// Callers decrypt it themselves with decryptJSON from encryption.ts.
export async function loadEncryptedProfileData(username: string): Promise<string | null> {
  return AsyncStorage.getItem(profileDataKey(username));
}

// ---- Pending host link (fix for lost "finish linking" state) ----
// startHouseholdLink() saves the code + secret here the moment it succeeds, so the host
// can come back and finish linking later even if the app was closed, the phone restarted,
// or (for testing) a different account was signed into in between. finishHostLink() clears
// this once linking actually completes.
// Version 2.2 (Cath: an invite code stayed on Household long after its 15 minutes): `at` is
// when the code was made, so an old code is put away instead of being shown again.
export type PendingHostLink = { code: string; secretHex: string; at?: number };

function pendingHostLinkKey(username: string): string {
  return `profile:${username}:pending-host-link`;
}

// SEC-3 (Cath's OK, 2026-10-27): a waiting invite holds the household key, so it's kept in
// the phone's secure vault (like "stay signed in"), not in ordinary app storage. One saved
// the old way is moved into the vault the first time it's read. (Web has no vault.)
function vaultKey(username: string): string {
  return `pendingHostLink.${username.replace(/[^A-Za-z0-9._-]/g, '_')}`;
}
const vaultOn = Platform.OS !== 'web';
const VAULT_OPTS = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

export async function savePendingHostLink(
  username: string,
  code: string,
  secretHex: string,
  at: number = Date.now()
): Promise<void> {
  const text = JSON.stringify({ code, secretHex, at });
  if (vaultOn) {
    await SecureStore.setItemAsync(vaultKey(username), text, VAULT_OPTS);
    await AsyncStorage.removeItem(pendingHostLinkKey(username)).catch(() => {});
  } else {
    await AsyncStorage.setItem(pendingHostLinkKey(username), text);
  }
}

function parsePending(raw: string | null): PendingHostLink | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.code === 'string' && typeof parsed?.secretHex === 'string') return parsed;
    return null;
  } catch (e) {
    return null;
  }
}

export async function loadPendingHostLink(username: string): Promise<PendingHostLink | null> {
  if (vaultOn) {
    const inVault = parsePending(await SecureStore.getItemAsync(vaultKey(username)).catch(() => null));
    if (inVault) return inVault;
  }
  const old = parsePending(await AsyncStorage.getItem(pendingHostLinkKey(username)));
  if (old && vaultOn) {
    // Moved into the vault (and out of ordinary storage).
    try {
      await SecureStore.setItemAsync(vaultKey(username), JSON.stringify(old), VAULT_OPTS);
      await AsyncStorage.removeItem(pendingHostLinkKey(username));
    } catch (e) {}
  }
  return old;
}

export async function clearPendingHostLink(username: string): Promise<void> {
  if (vaultOn) await SecureStore.deleteItemAsync(vaultKey(username)).catch(() => {});
  await AsyncStorage.removeItem(pendingHostLinkKey(username));
}

// ---- PC.8: pull-to-refresh bookkeeping (unlinked profiles) ----
function cloudSyncAtKey(username: string): string {
  return `profile:${username}:cloud-sync-at`;
}
function backupPendingKey(username: string): string {
  return `profile:${username}:backup-pending`;
}

// The cloud backup's updatedAt as of the last time THIS device uploaded or downloaded it.
export async function saveCloudSyncAt(username: string, updatedAt: number): Promise<void> {
  await AsyncStorage.setItem(cloudSyncAtKey(username), String(updatedAt));
}
export async function loadCloudSyncAt(username: string): Promise<number | null> {
  const raw = await AsyncStorage.getItem(cloudSyncAtKey(username));
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

// True while a local save has not yet reached the cloud backup.
// Version 2.1 (open from the phone first, Cath approved): this phone's own copy of its
// household key, still locked with the account password (the same "wrapped" key that is
// stored online). It lets a linked household open straight from the phone, even offline;
// without the password it is useless. Removed when the household is left or dissolved.
const cachedHouseholdKeyKey = (username: string) => `wrappedHouseholdKey:${username}`;
export async function saveCachedHouseholdKey(username: string, value: { householdId: string; wrappedKey: string } | null): Promise<void> {
  if (value) await AsyncStorage.setItem(cachedHouseholdKeyKey(username), JSON.stringify(value));
  else await AsyncStorage.removeItem(cachedHouseholdKeyKey(username));
}
export async function loadCachedHouseholdKey(username: string): Promise<{ householdId: string; wrappedKey: string } | null> {
  try {
    const raw = await AsyncStorage.getItem(cachedHouseholdKeyKey(username));
    const v = raw ? JSON.parse(raw) : null;
    return v && typeof v.householdId === 'string' && typeof v.wrappedKey === 'string' ? v : null;
  } catch {
    return null;
  }
}

// Version 2.1 (merge before save): while a linked household has changes waiting to be sent,
// the version both phones last agreed on is kept here (encrypted with the personal key), so
// the waiting changes can be merged with the online copy later instead of overwriting it,
// even after the app was closed.
const householdPendingBaseKey = (username: string) => `householdPendingBase:${username}`;
export async function saveHouseholdPendingBase(username: string, encrypted: string | null): Promise<void> {
  if (encrypted) await AsyncStorage.setItem(householdPendingBaseKey(username), encrypted);
  else await AsyncStorage.removeItem(householdPendingBaseKey(username));
}
export async function loadHouseholdPendingBase(username: string): Promise<string | null> {
  return AsyncStorage.getItem(householdPendingBaseKey(username));
}

export async function setBackupPending(username: string, pending: boolean): Promise<void> {
  if (pending) await AsyncStorage.setItem(backupPendingKey(username), 'true');
  else await AsyncStorage.removeItem(backupPendingKey(username));
}
export async function loadBackupPending(username: string): Promise<boolean> {
  return (await AsyncStorage.getItem(backupPendingKey(username))) === 'true';
}