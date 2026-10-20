import type { HouseholdModel, PaymentMethod } from './types';

// Version 2.1 (canvas S4): "It isn't included, take it off my balance": a payment dated before
// balances were last updated is otherwise treated as already in them, so take it off the
// saved balance of the account it was paid from. (Version 2.2: shared by bills, loans and
// Travel's checklist; it used to live in PayDetailScreen.)
export function takeOffSavedBalance<M extends HouseholdModel>(model: M, pm: PaymentMethod, amount: number): M {
  const group = pm.type as 'cash' | 'debit' | 'credit';
  const list = (model.balanceAccounts as any)[group] as { id: string; amount: number | '' }[] | undefined;
  if (!list || !list.length) return model;
  const targetId = pm.accountId || (group === 'cash' ? list[0].id : undefined);
  if (!targetId) return model;
  const nextList = list.map((a) => (a.id === targetId ? { ...a, amount: Math.round(((Number(a.amount) || 0) - amount) * 100) / 100 } : a));
  return { ...model, balanceAccounts: { ...model.balanceAccounts, [group]: nextList } };
}
