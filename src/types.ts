// ============================================================
// Household Finance App — Data Model (Checkpoint 1.1)
// ============================================================
// This file defines the "shape" of every piece of financial data
// in the app. It doesn't do anything by itself yet — later
// checkpoints will build real screens that read and write data
// matching these shapes.
//
// This matches the behavior of the original web app
// (household-finance-app.html) — see household-finance-app-spec-and-scale.md
// section 3 for the full reference.
// ============================================================

// ---- Shared building blocks ----

/** A household member a bill/debt/loan/income can belong to. */
export interface Person {
  id: string;
  name: string;
  role: string; // informational only, e.g. "primary", "partner"
}

/** One payment/cycle on a Bill or Debt — e.g. "March's electric bill". */
export interface PaymentCycle {
  id: string;
  dueDate: string; // ISO date string, e.g. "2026-03-15"
  amountDue: number | '';
  amountPaid: number | '';
  paidDate: string;
  notes: string;
  paymentMethod: PaymentMethod | null;
}

/** Which of Cash / Debit / Credit funded a payment. */
export interface PaymentMethod {
  type: 'cash' | 'debit' | 'credit' | '';
  accountId: string;
}

/** Custom recurrence settings shared by Bills, Debts, Loans, and Events. */
export interface CustomRecurrence {
  customFreq: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  customStartDate: string;
  customOccurrenceCount: number | '';
}

// ---- Income ----

export interface PaymentLogEntry {
  id: string;
  date: string;
  amount: number | '';
}

export interface IncomeSource {
  id: string;
  personId: string;
  category: string; // e.g. "Salary", "Freelance / Side gig"
  sourceName: string;
  expectedAmount: number | '';
  frequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'onetime';
  payDates: string[]; // meaning depends on frequency (day-of-month, day-of-week, or a date)
  paymentLog: PaymentLogEntry[];
  destinationAccountId: string;
  createdAt: number;
}

// ---- Bills ----

export interface BillDueDate {
  day?: number | 'last' | '';
  month?: number;
  date?: string; // for one-time bills
}

export interface Bill extends CustomRecurrence {
  id: string;
  name: string;
  category: string;
  recurringType: 'monthly' | 'annual' | 'onetime' | 'custom';
  dueDate: BillDueDate;
  priority: 'high' | 'medium' | 'low' | '';
  owner: string; // a Person id, or '' / 'shared'
  notes: string;
  cycles: PaymentCycle[];
  createdAt: number;
}

// ---- Debts ----

export interface Debt extends CustomRecurrence {
  id: string;
  creditorOrPerson: string;
  category: string;
  recurringType: 'monthly' | 'annual' | 'onetime' | 'custom';
  dueDate: BillDueDate;
  cycles: PaymentCycle[];
  notes: string;
  owner: string;
  interestRate: number | '';
  minPayment: number | '';
  balanceMode: 'manual' | 'auto';
  totalAmountDue: number | '';
  isCreditCard: boolean;
  creditLimit: number | '';
  createdAt: number;
}

// ---- Loans ----

export interface LoanPayment {
  id: string;
  date: string;
  actual: number | '';
  paymentMethod: PaymentMethod | null;
}

export interface Loan extends CustomRecurrence {
  id: string;
  name: string;
  loanType: 'car' | 'motorcycle' | 'personal' | 'home' | 'other';
  customTypeLabel: string;
  totalAmount: number | '';
  expectedPayment: number | '';
  actualPayments: LoanPayment[];
  owner: string;
  recurringType: 'monthly' | 'annual' | 'onetime' | 'custom';
  dueDate: BillDueDate;
  direction: 'borrowed' | 'lent'; // 'lent' = money someone owes YOU
  interestRate: number | '';
  createdAt: number;
}

// ---- Savings goals ----

export interface Contribution {
  id: string;
  date: string;
  amount: number | '';
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number | '';
  targetDate: string;
  currentAmount: number;
  contributions: Contribution[];
  createdAt: number;
}

// ---- Balance accounts (Calendar / Accounts tab) ----

export type BalanceGroupKey =
  | 'cash' | 'debit' | 'credit' | 'investment' | 'property' | 'vehicle';

export interface BalanceAccount {
  id: string;
  name: string;
  amount: number | '';
  currency: string; // e.g. "PHP", "USD"
  owner: string;
  startingBalance?: number | '';
  startingBalanceDate?: string;
  creditLimit?: number | ''; // credit accounts only
}

export interface BalanceAccounts {
  asOfDate: string;
  cash: BalanceAccount[]; // enforced to exactly one entry
  debit: BalanceAccount[];
  credit: BalanceAccount[];
  investment: BalanceAccount[];
  property: BalanceAccount[];
  vehicle: BalanceAccount[];
}

// ---- Transactions logged directly (not derived from a bill/debt/etc) ----

export interface ManualTransaction {
  id: string;
  date: string;
  label: string;
  amount: number | '';
  direction: 'in' | 'out' | 'saving';
  owner: string;
  category: string;
  tags: string[];
  paymentMethod: PaymentMethod | null;
}

// ---- Categories ----

export interface Category {
  id: string;
  name: string;
  color: string; // hex
  parentId: string | null; // for one level of subcategory nesting
}

export interface CategoryBudget {
  id: string;
  category: string;
  monthlyBudget: number | '';
}

// ---- App settings ----

export interface AppSettings {
  currency: string;
  notifyDaysBefore: number;
  theme: string;
  colorMode: 'light' | 'dark' | 'device';
  fontSize: string;
  fontFamily: string;
  layoutMode: 'bottomnav' | 'topmenu' | 'sidebar' | 'scrollabletabs';
  incomeToleranceDays: number;
}

// ---- The whole household's data, in one place ----

export interface HouseholdModel {
  settings: AppSettings;
  people: Person[];
  income: IncomeSource[];
  bills: Bill[];
  debts: Debt[];
  loans: Loan[];
  savingsGoals: SavingsGoal[];
  balanceAccounts: BalanceAccounts;
  manualTransactions: ManualTransaction[];
  categories: Category[];
  categoryBudgets: CategoryBudget[];
}