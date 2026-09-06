import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================
// Household Finance App — My Person preference (Checkpoint B.9)
// ============================================================
// Links this profile's username to one specific Person record in
// model.people, so Transactions/Reports can show "Mine" instead of
// just a name — everyone else's entries show their real name, and
// anything owned by 'shared' shows as "Ours". This is a local,
// per-profile preference only (same pattern as pin.ts/onboarding.ts/
// biometrics.ts) — it never touches the encrypted financial data.

function myPersonKey(username: string): string {
  return `profile:${username}:my-person-id`;
}

export async function getMyPersonId(username: string): Promise<string | null> {
  return AsyncStorage.getItem(myPersonKey(username));
}

export async function setMyPersonId(username: string, personId: string): Promise<void> {
  await AsyncStorage.setItem(myPersonKey(username), personId);
}

export async function clearMyPersonId(username: string): Promise<void> {
  await AsyncStorage.removeItem(myPersonKey(username));
}