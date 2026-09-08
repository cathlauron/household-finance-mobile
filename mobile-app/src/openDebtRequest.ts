// ============================================================
// Household Finance App — Open Debt Request (transient signal)
// ============================================================
// Fired when the person swipes a Debt-sourced transaction row on
// TransactionsScreen and taps "View Debt". Lets ToPayScreen/DebtsScreen
// jump straight to that debt's edit sheet. In-memory only, not persisted.
//
// The nonce exists so swiping the SAME debt twice in a row still opens
// it the second time — DebtsScreen's guard only skips a request if both
// the debt id AND the nonce match the last one it already handled.

export type OpenDebtRequest = { debtId: string; nonce: number };
type OpenDebtRequestListener = (request: OpenDebtRequest) => void;

const listeners = new Set<OpenDebtRequestListener>();
let nonceCounter = 0;

export function subscribeToOpenDebtRequest(listener: OpenDebtRequestListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function requestOpenDebt(debtId: string): void {
  nonceCounter += 1;
  const request: OpenDebtRequest = { debtId, nonce: nonceCounter };
  listeners.forEach((listener) => listener(request));
}