import type { Debt, HouseholdModel, Loan, ManualTransaction, PaymentMethod } from './types';
import { makeId } from './utils';
import { trace } from './trace';

// Cath, 2026-11-13 (mockup money-batch-5, option B): money you borrowed. It goes into the account
// you pick as money in, and a loan or a debt is added to To-Pay to pay back later. It is not
// income: it carries no income kind, so the Income page never lists it.
export type BorrowedInput = {
  kind: 'loan' | 'debt';
  amount: number;
  from: string;
  account: PaymentMethod;
  date: string;
  payBackBy?: string;
  now?: number;
};

export function addBorrowed(model: HouseholdModel, input: BorrowedInput): { model: HouseholdModel; txnId: string; refId: string } {
  const now = input.now ?? Date.now();
  const from = input.from.trim();
  const due = input.payBackBy || '';
  const refId = makeId(input.kind);
  const txn: ManualTransaction = {
    id: makeId('txn'),
    date: input.date,
    label: from,
    amount: input.amount,
    direction: 'in',
    owner: 'shared',
    category: 'Borrowed',
    notes: '',
    paymentMethod: input.account,
    borrowed: { kind: input.kind, id: refId },
    createdAt: now,
  };
  let next: HouseholdModel = { ...model, manualTransactions: [...(model.manualTransactions || []), txn] };
  if (input.kind === 'loan') {
    const loan: Loan = {
      id: refId,
      name: from,
      loanType: '',
      totalAmount: input.amount,
      expectedPayment: '',
      actualPayments: [],
      owner: 'shared',
      direction: 'borrowed',
      recurringType: 'onetime',
      dueDate: due ? { date: due } : {},
      createdAt: now,
    };
    next = { ...next, loans: [...(model.loans || []), loan] };
  } else {
    const debt: Debt = {
      id: refId,
      creditorOrPerson: from,
      category: '',
      recurringType: 'onetime',
      dueDate: { date: due },
      cycles: [{ id: makeId('cycle'), dueDate: due, amountDue: input.amount, amountPaid: '', paidDate: '', notes: '' } as Debt['cycles'][number]],
      notes: '',
      owner: 'shared',
      createdAt: now,
    };
    next = { ...next, debts: [...(model.debts || []), debt] };
  }
  trace('borrowed', 'built', { kind: input.kind, txnId: txn.id, refId, account: `${input.account.type}:${input.account.accountId}`, hasDue: !!due });
  return { model: next, txnId: txn.id, refId };
}

// Cath, 2026-11-14 (H-78): a Borrowed transaction and its loan or debt follow each other.
function linked(model: HouseholdModel, txnId: string): { txn: ManualTransaction; loan?: Loan; debt?: Debt; paid: boolean } | null {
  const txn = (model.manualTransactions || []).find((t) => t.id === txnId);
  if (!txn?.borrowed) return null;
  const loan = txn.borrowed.kind === 'loan' ? (model.loans || []).find((l) => l.id === txn.borrowed!.id) : undefined;
  const debt = txn.borrowed.kind === 'debt' ? (model.debts || []).find((d) => d.id === txn.borrowed!.id) : undefined;
  if (!loan && !debt) return null;
  const paid = loan ? (loan.actualPayments || []).length > 0 : (debt!.cycles || []).some((c) => !!c.paidDate || (typeof c.amountPaid === 'number' && c.amountPaid > 0));
  return { txn, loan, debt, paid };
}

// What the delete pop-up adds for a Borrowed transaction ('' for any other).
export function borrowedDeleteNote(model: HouseholdModel, txnId: string): string {
  const l = linked(model, txnId);
  if (!l) return '';
  const what = l.loan ? 'loan' : 'debt';
  const where = l.loan ? 'To-Pay › Loans' : 'To-Pay › Debts';
  return l.paid ? `Its ${what} in ${where} already has payments, so the ${what} stays.` : `This also removes its ${what} from ${where}.`;
}

// Deleting the transaction: its loan or debt goes too, unless something was already paid on it.
export function removeBorrowedRef(model: HouseholdModel, txnId: string): HouseholdModel {
  const l = linked(model, txnId);
  if (!l || l.paid) return model;
  trace('borrowed', 'removed with its transaction', { kind: l.loan ? 'loan' : 'debt' });
  return l.loan ? { ...model, loans: model.loans.filter((x) => x.id !== l.loan!.id) } : { ...model, debts: model.debts.filter((x) => x.id !== l.debt!.id) };
}

// After the transaction was edited: who it is from and how much carry over. A debt round
// that is already paid keeps its amount.
export function syncBorrowed(model: HouseholdModel, txnId: string): HouseholdModel {
  const l = linked(model, txnId);
  if (!l) return model;
  const amount = typeof l.txn.amount === 'number' ? l.txn.amount : 0;
  const name = (l.txn.label || '').trim();
  if (l.loan) return { ...model, loans: model.loans.map((x) => (x.id === l.loan!.id ? { ...x, name: name || x.name, totalAmount: amount || x.totalAmount } : x)) };
  return {
    ...model,
    debts: model.debts.map((x) =>
      x.id === l.debt!.id
        ? { ...x, creditorOrPerson: name || x.creditorOrPerson, cycles: x.cycles.map((c, i) => (i === 0 && !c.paidDate && !(typeof c.amountPaid === 'number' && c.amountPaid > 0) && amount ? { ...c, amountDue: amount } : c)) }
        : x
    ),
  };
}
