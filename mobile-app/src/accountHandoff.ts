// Cath, 2026-10-23: no account yet and you tap + for a transaction: the app takes you to
// adding an account first. Once it's added you come straight back to the New transaction
// form with that account already picked (the same as "Add a salary", salaryHandoff.ts).
import type { PaymentMethod } from './types';

type Back = (account: PaymentMethod) => void;
let back: Back | null = null;

export function startAccountHandoff(fn: Back) {
  back = fn;
}

// Accounts calls this after adding a new account: what to do next (if a form is waiting
// for it), and forgets it.
export function takeAccountHandoff(): Back | null {
  const f = back;
  back = null;
  return f;
}

// A form is waiting to come back with a new account (so its form host stays around).
export function accountHandoffPending(): boolean {
  return back !== null;
}

export function cancelAccountHandoff() {
  back = null;
}
