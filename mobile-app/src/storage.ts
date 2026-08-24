import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILES_INDEX_KEY = 'profiles-index';

export type ProfileIndexEntry = {
  username: string;
  salt: string;
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

// Updates just one profile's stored salt — used when changing a passphrase, since a new
// passphrase always gets a fresh salt (see encryption.ts's generateSalt()). Does nothing
// if the username isn't found, so a caller can't accidentally add a stray new entry here.
export async function updateProfileSalt(username: string, newSalt: string): Promise<void> {
  const profiles = await loadProfilesIndex();
  const idx = profiles.findIndex((p) => p.username === username);
  if (idx === -1) return;
  profiles[idx] = { ...profiles[idx], salt: newSalt };
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
