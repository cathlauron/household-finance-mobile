import { useEffect, useRef, useState } from 'react';
import { requestToPayTab } from './openToPayTabRequest';

// Redesign: what the floating + button adds depends on where you are.
// - On To-Pay it adds whatever sub-tab is showing: a bill, a debt or a loan.
// - Everywhere else it adds a transaction.
// ToPayScreen reports its sub-tab here; Bills/Debts/Loans listen for "add" requests.

export type ToPaySub = 'bills' | 'debts' | 'loans';

let currentSub: ToPaySub = 'bills';
const subListeners = new Set<(s: ToPaySub) => void>();
const addListeners = new Set<(s: ToPaySub, date?: string) => void>();

export function setToPaySub(sub: ToPaySub) {
  currentSub = sub;
  subListeners.forEach((l) => l(sub));
}

export function useToPaySub(): ToPaySub {
  const [sub, setSub] = useState<ToPaySub>(currentSub);
  useEffect(() => {
    subListeners.add(setSub);
    setSub(currentSub);
    return () => {
      subListeners.delete(setSub);
    };
  }, []);
  return sub;
}

// date (Version 2.2, calendar +): the new bill / debt / loan starts on that day.
export function requestToPayAdd(date?: string) {
  addListeners.forEach((l) => l(currentSub, date));
}

// Used by Bills/Debts/Loans: runs `open` when the + is tapped while that list is showing.
export function useToPayAddRequest(sub: ToPaySub, open: (date?: string) => void) {
  const openRef = useRef(open);
  openRef.current = open;
  useEffect(() => {
    const listener = (s: ToPaySub, date?: string) => {
      if (s === sub) openRef.current(date);
    };
    addListeners.add(listener);
    return () => {
      addListeners.delete(listener);
    };
  }, [sub]);
}

// Version 2.2 (canvas K1): switching a NEW bill / debt / loan form to another kind. The
// amount and name typed so far are carried over; To-Pay shows that list, and its screen
// opens its own add form with them.
export type AddCarry = { amount: number | ''; name: string };
let pendingAdd: { sub: ToPaySub; carry: AddCarry } | null = null;

// Version 2.2 (Cath): To-Pay opens the other kind's form where you are (no jump to that
// list until it's added). Falls back to switching the list if To-Pay isn't listening.
let switchListener: ((sub: ToPaySub, carry: AddCarry) => void) | null = null;
export function onToPaySwitchAdd(l: (sub: ToPaySub, carry: AddCarry) => void): () => void {
  switchListener = l;
  return () => {
    if (switchListener === l) switchListener = null;
  };
}

export function switchToPayAdd(sub: ToPaySub, carry: AddCarry) {
  if (switchListener) {
    switchListener(sub, carry);
    return;
  }
  pendingAdd = { sub, carry };
  requestToPayTab(sub);
}

export function takePendingAdd(sub: ToPaySub): AddCarry | null {
  if (!pendingAdd || pendingAdd.sub !== sub) return null;
  const c = pendingAdd.carry;
  pendingAdd = null;
  return c;
}
