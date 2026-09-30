import AsyncStorage from '@react-native-async-storage/async-storage';

// Per-profile list of bell items the person has tapped (read).
// Same pattern as reportVisibility.ts: per-profile key, try/catch, plain JSON array.
const keyFor = (username: string) => `profile:${username}:bell-read`;

export async function loadBellRead(username: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(username));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function markBellRead(username: string, itemKey: string): Promise<string[]> {
  try {
    const current = await loadBellRead(username);
    if (current.includes(itemKey)) return current;
    const next = [...current, itemKey];
    await AsyncStorage.setItem(keyFor(username), JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
}

// Drops read marks for items that no longer exist, so the list can't grow forever.
export async function pruneBellRead(username: string, validKeys: string[]): Promise<string[]> {
  try {
    const current = await loadBellRead(username);
    const valid = new Set(validKeys);
    const next = current.filter(k => valid.has(k));
    if (next.length !== current.length) {
      await AsyncStorage.setItem(keyFor(username), JSON.stringify(next));
    }
    return next;
  } catch {
    return [];
  }
}
