// Version 3: the new start (approved Option B, design canvas B1-B9).
//
// Someone new goes through Welcome and four short questions, then lands on Home WITHOUT an
// account ("guest"). Only their answers are kept (name, what they want help with, the look,
// whether others use the phone): no money data exists until they have an account. The
// first time they add anything with money (a bill, a transaction, an account...), the app
// asks them to save Finance Flow to their email first; the entry they were adding is then
// saved inside the new, password-locked account.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultModel } from './defaultModel';
import type { HouseholdModel } from './types';

export type HelpWith = 'calm' | 'debt' | 'save' | 'spending';
export type GuestSetup = {
  name: string;
  helpWith: HelpWith[];
  fallingLeaves: boolean;
  moodColors: boolean;
  othersUsePhone: boolean | null;
  step: 'welcome' | 'setup' | 'home';
};

const KEY = 'guestSetupV1';

export function emptyGuestSetup(): GuestSetup {
  return { name: '', helpWith: [], fallingLeaves: true, moodColors: true, othersUsePhone: null, step: 'welcome' };
}

export async function loadGuestSetup(): Promise<GuestSetup | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...emptyGuestSetup(), ...JSON.parse(raw) } : null;
  } catch {
    return null;
  }
}

export async function saveGuestSetup(setup: GuestSetup): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(setup)).catch(() => {});
}

export async function clearGuestSetup(): Promise<void> {
  await AsyncStorage.removeItem(KEY).catch(() => {});
}

// The household a guest starts with: empty, with their look choices applied.
export function guestModel(setup: GuestSetup): HouseholdModel {
  const m = defaultModel();
  return {
    ...m,
    settings: { ...m.settings, fallingLeavesEnabled: setup.fallingLeaves, moodColorsEnabled: setup.moodColors },
  };
}

// A username suggestion from the name: lowercase letters and numbers only.
export function suggestUsername(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20);
}

type Named = { id: string; name?: string; label?: string; creditor?: string; sourceName?: string; title?: string };
const LISTS: { key: keyof HouseholdModel; what: string }[] = [
  { key: 'bills', what: 'bill' },
  { key: 'debts', what: 'debt' },
  { key: 'loans', what: 'loan' },
  { key: 'manualTransactions', what: 'entry' },
  { key: 'income', what: 'income' },
  { key: 'savingsGoals', what: 'savings pot' },
  { key: 'transfers', what: 'transfer' },
  { key: 'travel', what: 'trip' },
  { key: 'events', what: 'event' },
  { key: 'yearlyGoals', what: 'goal' },
  { key: 'groceries', what: 'grocery item' },
  { key: 'sharedExpenses', what: 'shared expense' },
  { key: 'recurring', what: 'repeating entry' },
];

// What was just added, in words ("Meralco bill"), or null when nothing with money (or a
// plan) was added, e.g. Home quietly tidying up. Accounts count too.
export function describeNewEntry(before: HouseholdModel | null, after: HouseholdModel): string | null {
  for (const { key, what } of LISTS) {
    const old = new Set(((before?.[key] as Named[] | undefined) || []).map((x) => x.id));
    const added = ((after[key] as Named[] | undefined) || []).find((x) => x && !old.has(x.id));
    if (added) {
      const label = (added.name || added.label || added.creditor || added.sourceName || added.title || '').trim();
      return label ? `${label} ${what}` : `new ${what}`;
    }
  }
  const count = (m: HouseholdModel | null) =>
    m ? m.balanceAccounts.cash.length + m.balanceAccounts.debit.length + m.balanceAccounts.credit.length : 0;
  if (count(after) > count(before)) return 'new account';
  return null;
}
