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
  interestRate?: number | '';
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

export type CalculatorInputs = {
  efMonthlyExpenses: number | '';
  efCurrentSavings: number | '';
  fiAnnualExpenses: number | '';
  fiCurrentSavings: number | '';
};

// ---- Checkpoint 8.1: Groceries ----
// A single grocery-list item: what you plan to spend, what you actually spent (only
// meaningful once purchased), and whether it's been bought yet. Intentionally simpler
// than the web app's version for now (no store/aisle/unit-price detail yet) — that can
// be added later without changing this shape, same additive philosophy used elsewhere.
export type GroceryItem = {
  id: string;
  item: string;
  plannedAmount: number | '';
  actualAmount: number | '';
  purchased: boolean;
};

// A scratch-tally entry for the in-store running-total calculator. Not linked to the
// grocery list until "Add all to list" is tapped, which copies these over as planned
// GroceryItems and clears the calculator.
export type GroceryCalcEntry = {
  id: string;
  label: string;
  amount: number;
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
  receiptPhoto?: string;
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
  groceries?: GroceryItem[];
  groceryCalculator?: GroceryCalcEntry[];
};
