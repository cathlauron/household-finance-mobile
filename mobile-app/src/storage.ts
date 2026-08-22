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
