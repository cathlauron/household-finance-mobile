import type { HouseholdModel } from './types';
import { accountCurrentBalance, type SpendingGroup } from './balanceProjection';

// Cath, 2026-11-13 (H-75): Move money showed each account's saved balance, not what is in it
// now. "debit:<id>" is how Move money names an account.
export function transferAvailable(model: HouseholdModel, key: string | undefined): number | null {
  if (!key) return null;
  const at = key.indexOf(':');
  const group = key.slice(0, at) as SpendingGroup;
  const account = (model.balanceAccounts[group] || []).find((a) => a.id === key.slice(at + 1));
  return account ? accountCurrentBalance(model, group, account) : null;
}

// More than the account has (Cath: warn, but still allow it).
export function overAvailable(model: HouseholdModel, fromKey: string | undefined, amount: number): boolean {
  const have = transferAvailable(model, fromKey);
  return have !== null && amount > have + 0.004;
}
