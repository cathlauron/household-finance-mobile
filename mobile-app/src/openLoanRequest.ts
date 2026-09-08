// ============================================================
// Household Finance App — Open Loan Request (transient signal)
// ============================================================
// Fired when the person swipes a Loan-sourced transaction row on
// TransactionsScreen and taps "View Loan". Lets ToPayScreen/LoansScreen
// jump straight to that loan's edit sheet. In-memory only, not persisted.
//
// The nonce exists so swiping the SAME loan twice in a row still opens
// it the second time — LoansScreen's guard only skips a request if both
// the loan id AND the nonce match the last one it already handled.

export type OpenLoanRequest = { loanId: string; nonce: number };
type OpenLoanRequestListener = (request: OpenLoanRequest) => void;

const listeners = new Set<OpenLoanRequestListener>();
let nonceCounter = 0;

export function subscribeToOpenLoanRequest(listener: OpenLoanRequestListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function requestOpenLoan(loanId: string): void {
  nonceCounter += 1;
  const request: OpenLoanRequest = { loanId, nonce: nonceCounter };
  listeners.forEach((listener) => listener(request));
}