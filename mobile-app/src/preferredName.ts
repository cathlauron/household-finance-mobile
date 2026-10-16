import type { HouseholdModel } from './types';

// "What should we call you?": the name someone picked for the Home greeting.
// Kept in the household model keyed by username, so it syncs to their other phones
// and linked members see it too. Empty means "not set": fall back to the username.

export const MAX_PREFERRED_NAME_LENGTH = 30;

export function getPreferredName(model: HouseholdModel | null | undefined, username: string | null | undefined): string {
  if (!model || !username) return '';
  return (model.preferredNames?.[username]?.name ?? '').trim();
}

// What Home calls this person: their chosen name, or their username if they haven't picked one.
export function getCallName(model: HouseholdModel | null | undefined, username: string | null | undefined): string {
  return getPreferredName(model, username) || username || '';
}

// A copy of the model with this person's name set. Clearing keeps an empty entry with a
// fresh time, so a clear on one phone wins over an older name on another when they merge.
// Returns null when nothing would change, so callers can skip the save.
export function withPreferredName(model: HouseholdModel, username: string, name: string): HouseholdModel | null {
  const clean = name.trim().replace(/\s+/g, ' ').slice(0, MAX_PREFERRED_NAME_LENGTH);
  if (clean === getPreferredName(model, username)) return null;
  return {
    ...model,
    preferredNames: { ...(model.preferredNames ?? {}), [username]: { name: clean, updatedAt: Date.now() } },
  };
}
