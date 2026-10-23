import type { TravelChecklistItem, ManualTransaction, PaymentMethod } from './types';
import { makeId } from './utils';
import { todayISO } from './dateUtils';

// A change to an account's saved balance: positive takes money off, negative gives it back.
export type BalanceTakeOff = { pm: PaymentMethod; amount: number };

function samePm(a?: PaymentMethod, b?: PaymentMethod): boolean {
  if (!a || !b) return !a && !b;
  return a.type === b.type && (a.accountId || '') === (b.accountId || '');
}
function costOf(item: TravelChecklistItem): number {
  return typeof item.cost === 'number' && item.cost > 0 ? item.cost : 0;
}

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
// Version 2.2 (review fixes):
// - Ticked again with a different answer (in the trip form: untick, then tick choosing
//   another account, day, or "Just mark it paid"): the old payment goes and the new answer
//   counts (before, the old one stayed).
// - "Take it off my balance" is remembered on the item (takenOff), and given back when the
//   item is unticked, answered again, removed, or its cost changes (before, the money was
//   never given back).
export function reconcileTravelChecklistTransactions(
  priorChecklist: TravelChecklistItem[],
  newChecklist: TravelChecklistItem[],
  transactions: ManualTransaction[],
  tripName: string
): { checklist: TravelChecklistItem[]; transactions: ManualTransaction[]; takeOffs: BalanceTakeOff[] } {
  let txns = [...transactions];
  const takeOffs: BalanceTakeOff[] = [];
  const priorById = new Map(priorChecklist.map((i) => [i.id, i]));
  const giveBack = (item: TravelChecklistItem | undefined) => {
    if (item && item.paidWith && typeof item.takenOff === 'number' && item.takenOff > 0) {
      takeOffs.push({ pm: item.paidWith, amount: -item.takenOff });
    }
  };
  const removeTxn = (id: string | undefined) => {
    if (id) txns = txns.filter((t) => t.id !== id);
  };

  // A fresh tick: the payment it describes.
  const freshTick = (item: TravelChecklistItem, takeOff: boolean | undefined): TravelChecklistItem => {
    const cost = costOf(item);
    if (!cost || item.markedOnly) return item; // nothing to log ("Just mark it paid", or no cost)
    const newTxn: ManualTransaction = {
      id: makeId('txn'),
      date: item.completedDate || todayISO(),
      label: tripName + ': ' + item.title,
      amount: cost,
      direction: 'out',
      owner: 'shared',
      category: 'Travel',
      ...(item.paidWith ? { paymentMethod: item.paidWith } : {}),
    };
    txns = [...txns, newTxn];
    if (takeOff && item.paidWith) {
      takeOffs.push({ pm: item.paidWith, amount: cost });
      return { ...item, expenseTransactionId: newTxn.id, takenOff: cost };
    }
    return { ...item, expenseTransactionId: newTxn.id };
  };

  const updatedChecklist = newChecklist.map((raw) => {
    // "take it off my balance" is only needed while saving; it's never kept on the item.
    const { takeOffBalance, ...item } = raw;
    const prior = priorById.get(item.id);
    const wasChecked = prior?.checked ?? false;
    const hasCost = costOf(item) > 0;

    if (item.checked && wasChecked && prior) {
      const answeredAgain =
        !!prior.markedOnly !== !!item.markedOnly ||
        !samePm(prior.paidWith, item.paidWith) ||
        (prior.completedDate || '') !== (item.completedDate || '');
      if (answeredAgain) {
        removeTxn(item.expenseTransactionId);
        giveBack(prior);
        return freshTick({ ...item, expenseTransactionId: undefined, takenOff: undefined }, takeOffBalance);
      }
    }

    if (item.checked && !wasChecked && hasCost && !item.expenseTransactionId) {
      return freshTick({ ...item, takenOff: undefined }, takeOffBalance);
    }

    if (!item.checked && wasChecked) {
      removeTxn(item.expenseTransactionId);
      giveBack(prior);
      return { ...item, expenseTransactionId: undefined, paidWith: undefined, markedOnly: undefined, takenOff: undefined };
    }

    if (item.checked && item.expenseTransactionId && hasCost) {
      const cost = costOf(item);
      txns = txns.map((t) =>
        t.id === item.expenseTransactionId ? { ...t, amount: cost, label: tripName + ': ' + item.title } : t
      );
      // The cost changed after "take it off my balance": the balance follows.
      if (item.paidWith && typeof item.takenOff === 'number' && item.takenOff > 0 && item.takenOff !== cost) {
        takeOffs.push({ pm: item.paidWith, amount: cost - item.takenOff });
        return { ...item, takenOff: cost };
      }
    }

    return item;
  });

  // Items that existed before but are gone now were deleted outright (not just
  // unchecked) — clean up any transaction they were linked to, and give back anything
  // taken off a balance, the same way unchecking one does above.
  const newIds = new Set(newChecklist.map((i) => i.id));
  for (const gone of priorChecklist.filter((i) => !newIds.has(i.id))) {
    removeTxn(gone.expenseTransactionId);
    if (gone.checked) giveBack(gone);
  }

  return { checklist: updatedChecklist, transactions: txns, takeOffs };
}
