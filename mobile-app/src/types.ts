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
  pushNotificationsEnabled: boolean;
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

// ---- Checkpoint 10.2a: payment method tracking ----
// A shared shape used anywhere something gets paid — Bill cycles, Debt cycles (which reuse
// BillCycle), Loan payments, and manual Transactions. accountId points at whichever
// BalanceAccountEntry (from balanceAccounts.debit or balanceAccounts.credit) was used —
// left blank for 'cash' since Cash is tracked as a single running total, not individual
// accounts.
export type PaymentMethod = {
  type: 'cash' | 'debit' | 'credit';
  accountId: string;
};

export type BillCycle = {
  id: string;
  dueDate: string;
  amountDue: number | '';
  amountPaid: number | '';
  paidDate: string;
  notes: string;
  paymentMethod?: PaymentMethod;
  feesPortion?: number | '';
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
  paymentMethod?: PaymentMethod;
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
  customFreq?: string;
  customStartDate?: string;
  customOccurrenceCount?: number | '';
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
export type GroceryItem = {
  id: string;
  item: string;
  plannedAmount: number | '';
  actualAmount: number | '';
  purchased: boolean;
};

export type GroceryCalcEntry = {
  id: string;
  label: string;
  amount: number;
};

// ---- Checkpoint 8.2: Travel ----
export type TravelChecklistItem = {
  id: string;
  title: string;
  cost: number | '';
  checked: boolean;
  completedDate?: string;
  // Set once this item is checked (with a cost) and a matching ManualTransaction has been
  // logged for it — lets us find and remove that transaction if the item gets unchecked.
  expenseTransactionId?: string;
};

export type TravelTrip = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  checklist: TravelChecklistItem[];
  // ---- Flagged follow-up: Travel savings-goal auto-sync ----
  // budget is auto-computed from the FULL checklist (every item, not just checked ones —
  // see tripFullChecklistTotal() in TravelScreen.tsx, distinct from the "committed" total
  // shown in the modal banner which only sums checked items). trackInSavings/savingsGoalId
  // mirror the same pattern Events uses for its own goal-sync: turning the toggle on
  // creates/updates a matching SavingsGoal named "Travel: {trip name}" with that budget as
  // its target, turning it off (or the budget dropping to 0) removes the linked goal.
  budget?: number | '';
  trackInSavings?: boolean;
  savingsGoalId?: string;
  createdAt?: number;
};

// ---- Checkpoint 8.3: Events ----
// Recurrence is deliberately just Annual or One-time for now (no Custom, matching the
// "basic add/edit works" bar for this checkpoint) — Annual events store month+day and
// repeat every year; One-time events store a single full date. No per-event checklist
// and no automatic savings-goal syncing yet, same flagged-follow-up treatment as Travel's
// savings sync.
export type EventItem = {
  id: string;
  name: string;
  type: 'birthday' | 'anniversary' | 'other';
  recurrence: 'annual' | 'onetime';
  month?: number | '';
  day?: number | '';
  onetimeDate?: string;
  budget: number | '';
  completed: boolean;
  completedDate?: string;
  trackInSavings?: boolean;
  savingsGoalId?: string;
  createdAt?: number;
  // Set once this event is marked Completed (with a budget) and a matching
  // ManualTransaction has been logged for it — lets us find and remove that transaction
  // if it gets un-marked.
  expenseTransactionId?: string;
};

// ---- Checkpoint 8.3: Year-End Goals ----
// Mode mirrors the web app: 'progress' goals track a target amount against a running
// current amount (with a progress bar); 'checklist' goals are just a plain Completed
// toggle, for goals that aren't about a dollar figure at all.
export type YearlyGoal = {
  id: string;
  title: string;
  description: string;
  mode: 'progress' | 'checklist';
  targetAmount: number | '';
  currentAmount: number | '';
  targetDate: string;
  completed: boolean;
  createdAt?: number;
};

export type BalanceAccountEntry = {
  id: string;
  name: string;
  amount: number | '';
  currency?: string;
  owner?: string;
  color?: string;
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
  paymentMethod?: PaymentMethod;
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

export type Payee = {
  id: string;
  name: string;
  defaultCategory: string;
};

export type CategorizationRule = {
  id: string;
  labelContains: string;
  amountMin: number | '';
  amountMax: number | '';
  category: string;
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
  travel?: TravelTrip[];
  events?: EventItem[];
    yearlyGoals?: YearlyGoal[];
  payees?: Payee[];
  categorizationRules?: CategorizationRule[];
};
