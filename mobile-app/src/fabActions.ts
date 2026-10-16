import { useEffect, useRef, useState } from 'react';

// Redesign: what the floating + button adds depends on where you are.
// - On To-Pay it adds whatever sub-tab is showing: a bill, a debt or a loan.
// - Everywhere else it adds a transaction.
// ToPayScreen reports its sub-tab here; Bills/Debts/Loans listen for "add" requests.

export type ToPaySub = 'bills' | 'debts' | 'loans';

let currentSub: ToPaySub = 'bills';
const subListeners = new Set<(s: ToPaySub) => void>();
const addListeners = new Set<(s: ToPaySub) => void>();

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

export function requestToPayAdd() {
  addListeners.forEach((l) => l(currentSub));
}

// Used by Bills/Debts/Loans: runs `open` when the + is tapped while that list is showing.
export function useToPayAddRequest(sub: ToPaySub, open: () => void) {
  const openRef = useRef(open);
  openRef.current = open;
  useEffect(() => {
    const listener = (s: ToPaySub) => {
      if (s === sub) openRef.current();
    };
    addListeners.add(listener);
    return () => {
      addListeners.delete(listener);
    };
  }, [sub]);
}
