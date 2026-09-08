// ============================================================
// Household Finance App — Open Bill Request (transient signal)
// ============================================================
// Fired when the person swipes a Bill-sourced transaction row on
// TransactionsScreen and taps "View Bill". Lets ToPayScreen/BillsScreen
// jump straight to that bill's edit sheet without going through the
// notification-only openBillId deep-link chain (navigate('Main', ...)),
// which forces a full tab-bar remount and isn't safe to reuse from
// inside an already-open app. This is in-memory only, not persisted —
// it's a "do this once, right now" signal, not a saved preference.
//
// The nonce exists so swiping the SAME bill twice in a row still opens
// it the second time — BillsScreen's guard only skips a request if both
// the bill id AND the nonce match the last one it already handled.

export type OpenBillRequest = { billId: string; nonce: number };
type OpenBillRequestListener = (request: OpenBillRequest) => void;

const listeners = new Set<OpenBillRequestListener>();
let nonceCounter = 0;

export function subscribeToOpenBillRequest(listener: OpenBillRequestListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function requestOpenBill(billId: string): void {
  nonceCounter += 1;
  const request: OpenBillRequest = { billId, nonce: nonceCounter };
  listeners.forEach((listener) => listener(request));
}