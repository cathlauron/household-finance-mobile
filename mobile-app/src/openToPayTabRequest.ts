// ============================================================
// Household Finance App — Open To-Pay Tab Request (transient signal)
// ============================================================
// Fired from Home when the person taps "Bills", "Debts" or "Loans" in the
// Amount Owed card. Tells ToPayScreen which sub-tab to show. In-memory only.
//
// If ToPayScreen hasn't mounted yet, nobody is listening, so the request is
// kept as "pending" and ToPayScreen picks it up the moment it mounts.

export type ToPayTab = 'bills' | 'debts' | 'loans';
type ToPayTabListener = (tab: ToPayTab) => void;

const listeners = new Set<ToPayTabListener>();
let pendingTab: ToPayTab | null = null;

export function subscribeToToPayTabRequest(listener: ToPayTabListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function requestToPayTab(tab: ToPayTab): void {
  if (listeners.size > 0) {
    pendingTab = null;
    listeners.forEach((listener) => listener(tab));
  } else {
    pendingTab = tab;
  }
}

export function consumePendingToPayTab(): ToPayTab | null {
  const tab = pendingTab;
  pendingTab = null;
  return tab;
}
