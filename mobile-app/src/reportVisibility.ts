import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================
// Household Finance App — Report visibility preference
// ============================================================
// Which report tabs show in ReportsScreen.tsx's pill row. This is a
// local, per-profile preference only (same pattern as myPerson.ts/
// autoLock.ts) — it does not sync across household devices. We store
// the HIDDEN ids rather than the visible ones, so a person who's never
// touched this setting sees every report, same as today.

function reportVisibilityKey(username: string): string {
  return `profile:${username}:hidden-reports`;
}

export async function getHiddenReportIds(username: string): Promise<string[]> {
  try {
    const stored = await AsyncStorage.getItem(reportVisibilityKey(username));
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function setHiddenReportIds(username: string, hiddenIds: string[]): Promise<void> {
  await AsyncStorage.setItem(reportVisibilityKey(username), JSON.stringify(hiddenIds));
}