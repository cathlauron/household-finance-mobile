import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILES_INDEX_KEY = 'profiles-index';

export type ProfileIndexEntry = {
  username: string;
  passwordHash: string;
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

export async function saveProfileData(username: string, data: unknown): Promise<void> {
  await AsyncStorage.setItem(profileDataKey(username), JSON.stringify(data));
}

export async function loadProfileData(username: string): Promise<unknown | null> {
  const raw = await AsyncStorage.getItem(profileDataKey(username));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}
