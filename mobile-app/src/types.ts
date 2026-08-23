// ============================================================
// Household Finance App — Data model types
// ============================================================
// These describe the "shape" of every piece of financial data —
// matching the original web app's model. Later checkpoints
// (Bills, Debts, Loans, etc.) will read and write data using
// these same shapes.
// ============================================================

export type Settings = {
  currency: string;
  notifyDaysBefore: number;
  theme: string;
  colorMode: 'light' | 'dark' | 'device';
  fontSize: string;
  fontFamily: string;
  layoutMode: string;
  incomeToleranceDays: number;
};

export type Person = {
  id: string;
  name: string;
  role?: string;
};

export type PaymentLogEntry = {
  id: string;
  date: string;
  amount: number | '';
};

export type IncomeSource = {
  id: string;
  personId: string;
  category: string;
  sourceName: string;
  expectedAmount: number | '';
  frequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'onetime';
  payDates: string[];
  paymentLog: PaymentLogEntry[];
  destinationAccountId?: string;
  createdAt?: number;
};

export type BillCycle = {
  id: string;
  dueDate: string;
  amountDue: number | '';
  amountPaid: number | '';
  paidDate: string;
  notes: string;
};

export type Bill = {
  id: string;
  name: string;
  category: string;
  recurringType: 'monthly' | 'annual' | 'onetime' | 'custom';
  dueDate: Record<string, any>;
  priority: 'high' | 'medium' | 'low' | '';
  owner: string;
  notes: string;
  cycles: BillCycle[];
  createdAt?: number;
  customFreq?: string;
  customStartDate?: string;
  customOccurrenceCount?: number | '';
};

export type Debt = {
  id: string;
  creditorOrPerson: string;
  category: string;
  recurringType: 'monthly' | 'annual' | 'onetime' | 'custom';
  dueDate: Record<string, any>;
  cycles: BillCycle[];
  notes: string;
  owner: string;
  interestRate?: number | '';
  minPayment?: number | '';
  createdAt?: number;
  customFreq?: string;
  customStartDate?: string;
  customOccurrenceCount?: number | '';
};

export type LoanPayment = {
  id: string;
  date: string;
  actual: number | '';
};

export type Loan = {
  id: string;
  name: string;
  loanType: string;
  totalAmount: number | '';
  expectedPayment: number | '';
  actualPayments: LoanPayment[];
  owner: string;
  direction: 'borrowed' | 'lent';
  // Annual interest rate as a plain percentage (e.g. 12 means 12%). Optional — used by
  // the Payoff Simulator (Checkpoint 5.3c) to estimate interest; blank/0 is treated as
  // no interest, which still lets the simulator run using expectedPayment alone.
  interestRate?: number | '';
  // Recurrence + due date (Checkpoint 5.4c). Optional so loans saved before this change
  // (which have neither field) still load fine — screens fall back to 'onetime' with no
  // date set when either is missing, same pattern Bills/Debts already use.
  recurringType?: 'monthly' | 'annual' | 'onetime' | 'custom';
  dueDate?: Record<string, any>;
  createdAt?: number;
};

export type SavingsContribution = {
  id: string;
  date: string;
  amount: number | '';
};

export type SavingsGoal = {
  id: string;
  name: string;
  targetAmount: number | '';
  targetDate: string;
  currentAmount: number;
  contributions: SavingsContribution[];
  createdAt?: number;
};

// ---- Checkpoint 7.2: Emergency Fund / FI calculator inputs ----
// Purely hand-typed figures for now (no auto-pull from Bills yet — that's a flagged
// follow-up). Optional on HouseholdModel so profiles saved before this checkpoint still
// load fine; screens fall back to '' for any missing field, same pattern used elsewhere.
export type CalculatorInputs = {
  efMonthlyExpenses: number | '';
  efCurrentSavings: number | '';
  fiAnnualExpenses: number | '';
  fiCurrentSavings: number | '';
};

export type BalanceAccountEntry = {
  id: string;
  name: string;
  amount: number | '';
  currency?: string;
  owner?: string;
};

export type BalanceAccounts = {
  asOfDate: string;
  cash: BalanceAccountEntry[];
  debit: BalanceAccountEntry[];
  credit: BalanceAccountEntry[];
  investment: BalanceAccountEntry[];
  property: BalanceAccountEntry[];
  vehicle: BalanceAccountEntry[];
};

export type ManualTransaction = {
  id: string;
  date: string;
  label: string;
  amount: number;
  direction: 'in' | 'out' | 'saving';
  owner: string;
  category?: string;
  receiptPhoto?: string; // base64 data URI of an attached receipt photo, optional
};

export type Category = {
  id: string;
  name: string;
  color: string;
  parentId?: string | null;
};

export type CategoryBudget = {
  id: string;
  category: string;
  monthlyBudget: number | '';
};

export type HouseholdModel = {
  settings: Settings;
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
  calculatorInputs?: CalculatorInputs;
};
