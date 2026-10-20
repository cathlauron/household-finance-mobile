import type { TravelChecklistItem, ManualTransaction, PaymentMethod } from './types';
import { makeId } from './utils';
import { todayISO } from './dateUtils';

// Compares a trip's checklist before and after editing, and logs (or removes) a real
// ManualTransaction for each item as it gets checked on/off — so completing a checklist
// item doesn't just move a savings-goal number, it also shows up in Transactions.
// - Item newly checked (with a cost) and no transaction yet -> create one.
// - Item unchecked, and it had a transaction -> remove that transaction.
// - Item still checked and already has a transaction -> keep its amount/label in sync.
// Version 2.2 (Cath, canvas P1-P3): a newly ticked item says how it was paid. paidWith:
// its transaction comes off that account, on the day it was paid (completedDate).
// markedOnly ("Just mark it paid"): no transaction at all. Unticking takes the payment
// back off and forgets how it was paid.
export function reconcileTravelChecklistTransactions(
  priorChecklist: TravelChecklistItem[],
  newChecklist: TravelChecklistItem[],
  transactions: ManualTransaction[],
  tripName: string
): { checklist: TravelChecklistItem[]; transactions: ManualTransaction[]; takeOffs: { pm: PaymentMethod; amount: number }[] } {
  let txns = [...transactions];
  const takeOffs: { pm: PaymentMethod; amount: number }[] = [];
  const priorById = new Map(priorChecklist.map((i) => [i.id, i]));

  const updatedChecklist = newChecklist.map((raw) => {
    // "take it off my balance" is only needed while saving; it's never kept on the item.
    const { takeOffBalance, ...item } = raw;
    const prior = priorById.get(item.id);
    const wasChecked = prior?.checked ?? false;
    const hasCost = typeof item.cost === 'number' && item.cost > 0;

    if (item.checked && !wasChecked && hasCost && !item.expenseTransactionId) {
      if (item.markedOnly) return item; // "Just mark it paid": nothing in spending
      const newTxn: ManualTransaction = {
        id: makeId('txn'),
        date: item.completedDate || todayISO(),
        label: tripName + ': ' + item.title,
        amount: item.cost as number,
        direction: 'out',
        owner: 'shared',
        category: 'Travel',
        ...(item.paidWith ? { paymentMethod: item.paidWith } : {}),
      };
      txns = [...txns, newTxn];
      if (takeOffBalance && item.paidWith) takeOffs.push({ pm: item.paidWith, amount: item.cost as number });
      return { ...item, expenseTransactionId: newTxn.id };
    }

    if (!item.checked && wasChecked) {
      if (item.expenseTransactionId) txns = txns.filter((t) => t.id !== item.expenseTransactionId);
      return { ...item, expenseTransactionId: undefined, paidWith: undefined, markedOnly: undefined };
    }

    if (item.checked && item.expenseTransactionId && hasCost) {
      txns = txns.map((t) =>
        t.id === item.expenseTransactionId
          ? { ...t, amount: item.cost as number, label: tripName + ': ' + item.title }
          : t
      );
    }

    return item;
  });

  // Items that existed before but are gone now were deleted outright (not just
  // unchecked) — clean up any transaction they were linked to, the same way
  // unchecking one does above.
  const newIds = new Set(newChecklist.map((i) => i.id));
  const deletedTxnIds = priorChecklist
    .filter((i) => !newIds.has(i.id) && i.expenseTransactionId)
    .map((i) => i.expenseTransactionId as string);
  if (deletedTxnIds.length) {
    const deletedSet = new Set(deletedTxnIds);
    txns = txns.filter((t) => !deletedSet.has(t.id));
  }

  return { checklist: updatedChecklist, transactions: txns, takeOffs };
}


