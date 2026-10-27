// ============================================================
// Household Finance App — Data model types
// ============================================================
// These describe the "shape" of every piece of financial data —
// matching the original web app's model. Later checkpoints
// (Bills, Debts, Loans, etc.) will read and write data using
// these same shapes.
// ============================================================

export type Settings = {
  // Redesign (Recurring page): when on, repeats are still added on the day but marked
  // "To review" so you can check each one.
  recurringAskFirst?: boolean;
  currency: string;
  notifyDaysBefore: number;
  cautionThresholdPercent: number;
  theme: string;
  colorMode: 'light' | 'dark' | 'device';
  fontSize: string;
  fontFamily: string;
  layoutMode: string;
  incomeToleranceDays: number;
  pushNotificationsEnabled: boolean;
  weeklyRecapEnabled: boolean;
  // Payday nudge: a 6:00 PM "Did it come in?" reminder on each expected payday that
  // hasn't been logged yet. Missing means on (needs "Notify me on this phone").
  paydayNudgeEnabled?: boolean;
  // Envelope alerts: a notification when an envelope reaches 80% and 100% of what it has
  // this month (once each per month). Missing means on.
  envelopeAlertsEnabled?: boolean;
  // Month-end summary: on the 1st at 9:00 AM, "<last month> is done" opening the close-out.
  // Missing means on.
  closeOutReminderEnabled?: boolean;
  weeklyRecapDay: number;
  weeklyRecapHour: number;
  swipeToDeleteEnabled: boolean;
  // Redesign: buttons, links, tabs and background leaves follow the Left to Spend mood
  // (green / burnt orange / red). Missing means on.
  moodColorsEnabled?: boolean;
  // Redesign: slowly drifting background leaves. Missing means on.
  fallingLeavesEnabled?: boolean;
  // Redesign (onboarding): what you want to spend each month after bills, and a name
  // for the household's wallet.
  monthlySpendingBudget?: number | '';
  // Redesign (Envelopes): roll what is left in each envelope into the next month,
  // counting from envelopeRolloverFrom ("YYYY-MM", the month it was switched on).
  envelopeRollover?: boolean;
  envelopeRolloverFrom?: string;
  walletName?: string;
};

// Shared Expenses: one thing someone paid for that a few people share.
export type SharedExpense = {
  id: string;
  date: string;
  label: string;
  amount: number;
  paidBy: string; // Person id
  // How much each person's share is (Person id + amount); together they add up to amount.
  shares: { personId: string; amount: number }[];
  splitMode: 'equal' | 'custom';
  note?: string;
  createdAt?: number;
  // Made from a transaction's "Split with others": that transaction's id.
  transactionId?: string;
};

// Shared Expenses: one person paying another back ("Settle up").
export type SharedSettlement = {
  id: string;
  date: string;
  from: string; // Person id who paid
  to: string; // Person id who was paid
  amount: number;
  note?: string;
  createdAt?: number;
  // When you paid or were paid from one of your accounts, the money in/out transaction
  // logged with it (removed again if the payment is undone).
  transactionId?: string;
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
  // Redesign: the account this payday went into. A logged payday is real money, so it
  // adds to that account's balance; the expected amount is only a projection.
  paymentMethod?: PaymentMethod;
  createdAt?: number; // when it was logged (stamped on save)
  // Version 2.2 (W1/W2 everywhere): who added it, who last changed it and when (whoStamp.ts).
  addedBy?: string;
  changedBy?: string;
  changedAt?: number;
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
  // Redesign: the account paydays usually go into (preselected when logging one).
  depositTo?: PaymentMethod;
  createdAt?: number;
  // Version 2.2 (W1/W2 everywhere): who added it, who last changed it and when (whoStamp.ts).
  addedBy?: string;
  changedBy?: string;
  changedAt?: number;
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
  // Redesign: the exact moment it was marked paid (for Left to Spend's same-day check).
  paidAt?: number;
  // Cath, 2026-10-27 (canvas R4): "Just record it": kept in the history as paid, with no
  // account and no effect on any balance or spending. `feePaid`: a fee paid with it.
  recordedOnly?: boolean;
  feePaid?: number;
  // Partial debt payments (Round 3). On a cycle paid with less than was due, amountDue
  // is lowered to what was paid (so the cycle counts as settled everywhere) and the
  // original due amount is kept here, for history and Undo.
  dueBefore?: number;
  // On the NEXT cycle: how much of its amountDue is unpaid minimum plus any late fee
  // carried over from the cycle before.
  carriedIn?: number;
  // A late fee the lender charged for this cycle's short or late payment (added to the
  // next amount due).
  lateFee?: number;
  // Version 2.2 (W1/W2 everywhere): who marked this cycle paid (cleared when unpaid).
  paidBy?: string;
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
  // B.14: opt-in flag distinguishing a subscription (Netflix) from a plain
  // recurring bill (Rent). Only subscriptions get cancel-reminders.
  isSubscription?: boolean;
  // Cath, 2026-10-27 (canvas P2): money you send regularly that isn't a bill (monthly
  // money for family). Works like a bill (Left to Spend, calendar, reminders), shown
  // in its own "Regular payments" section, marked Sent instead of Paid.
  regular?: boolean;
  // Undefined/'active' = normal, reminders keep firing each cycle.
  // 'cancelled' = person tapped Cancel; bill stays in the list (for
  // history/reports) but stops generating future reminders.
  subscriptionStatus?: 'active' | 'cancelled';
  // Redesign (Subscriptions page): when it was cancelled (YYYY-MM-DD), and an optional
  // "cancel by" date the person wants to be reminded of.
  cancelledOn?: string;
  cancelBy?: string;
  // Version 2.2 (W1/W2 everywhere): who added it, who last changed it and when (whoStamp.ts).
  addedBy?: string;
  changedBy?: string;
  changedAt?: number;
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
  // Version 2.2 (canvas K2): High / Medium / Low.
  priority?: 'high' | 'medium' | 'low' | '';
  createdAt?: number;
  customFreq?: string;
  customStartDate?: string;
  customOccurrenceCount?: number | '';
  // Version 2.2 (W1/W2 everywhere): who added it, who last changed it and when (whoStamp.ts).
  addedBy?: string;
  changedBy?: string;
  changedAt?: number;
};

export type LoanPayment = {
  id: string;
  date: string;
  actual: number | '';
  // Version 3: which scheduled payment this covers (YYYY-MM-DD), when chosen; payments
  // without one cover the oldest scheduled payment not yet covered (loanSchedule.ts).
  forDate?: string;
  paymentMethod?: PaymentMethod;
  // Cath, 2026-10-27 (canvas R4): "Just record it" (no account, no balance change) and a
  // fee paid with it.
  recordedOnly?: boolean;
  fee?: number;
  // When it was logged (stamped on save), so a card's balance knows whether it came
  // after the balances were last updated that same day.
  createdAt?: number;
  // Version 2.2 (W1/W2 everywhere): who added it, who last changed it and when (whoStamp.ts).
  addedBy?: string;
  changedBy?: string;
  changedAt?: number;
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
  // Version 2.2 (canvas K2): High / Medium / Low.
  priority?: 'high' | 'medium' | 'low' | '';
  recurringType?: 'monthly' | 'annual' | 'onetime' | 'custom';
  dueDate?: Record<string, any>;
  customFreq?: string;
  customStartDate?: string;
  customOccurrenceCount?: number | '';
  createdAt?: number;
  // Version 2.2 (W1/W2 everywhere): who added it, who last changed it and when (whoStamp.ts).
  addedBy?: string;
  changedBy?: string;
  changedAt?: number;
};

export type SavingsContribution = {
  id: string;
  date: string;
  // Redesign: negative = money moved out of the pot.
  amount: number | '';
  paymentMethod?: PaymentMethod;
  auto?: boolean; // added automatically on a payday
  createdAt?: number; // when it was logged (stamped on save)
  // Version 2.2 (W1/W2 everywhere): who added it, who last changed it and when (whoStamp.ts).
  addedBy?: string;
  changedBy?: string;
  changedAt?: number;
};

export type SavingsGoal = {
  id: string;
  name: string;
  targetAmount: number | '';
  targetDate: string;
  currentAmount: number;
  contributions: SavingsContribution[];
  createdAt?: number;
  // Redesign (pots): where the money is kept, and an amount added every payday.
  keptIn?: PaymentMethod;
  autoAdd?: { enabled: boolean; amount: number; since: string };
  isEmergency?: boolean;
  // Version 2.2 (W1/W2 everywhere): who added it, who last changed it and when (whoStamp.ts).
  addedBy?: string;
  changedBy?: string;
  changedAt?: number;
};

export type CalculatorInputs = {
  efMonthlyExpenses: number | '';
  efCurrentSavings: number | '';
  efTargetMonths?: number;
  fiAnnualExpenses: number | '';
  fiGuaranteedAnnualIncome: number | '';
  fiCurrentSavings: number | '';
  fiWithdrawalRatePct: number | '';
  fiExpectedReturnPct: number | '';
  fiMonthlySavings: number | '';
  fiSelectedAccountIds: string[];
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
  // Redesign: quantity and price each (amount = qty × unitPrice).
  qty?: number;
  unitPrice?: number;
};

// Redesign: a meal idea in Groceries; it costs the total of its ingredients.
export type MealIdea = {
  id: string;
  name: string;
  ingredients: { id: string; name: string; price: number | '' }[];
};

// ---- Checkpoint 8.2: Travel ----
// Version 2.1 (Cath, canvas T1): a trip's to-do list, next to its budget. Plain notes with
// tick boxes and an optional date; nothing here touches money.
export type TravelTodo = { id: string; text: string; done: boolean; date?: string };

export type TravelChecklistItem = {
  id: string;
  title: string;
  cost: number | '';
  // Optional short note shown under the item (booking details, what to bring...).
  note?: string;
  checked: boolean;
  completedDate?: string;
  // Set once this item is checked (with a cost) and a matching ManualTransaction has been
  // logged for it — lets us find and remove that transaction if the item gets unchecked.
  expenseTransactionId?: string;
  // Version 2.2 (Cath, canvas P1-P3): how a ticked item was paid. paidWith: the account it
  // came off (its transaction says the same). markedOnly: "Just mark it paid", so there is
  // no transaction and no balance or spending changes; it still counts as Paid in the trip.
  paidWith?: PaymentMethod;
  markedOnly?: boolean;
  // How much "take it off my balance" took off paidWith's saved balance, so it can be given
  // back if the item is unticked, answered again or removed.
  takenOff?: number;
  // Only on the way to being saved: "take it off my balance" for a payment dated before
  // balances were last updated (never kept on a saved item).
  takeOffBalance?: boolean;
  // Version 2.2 (W1/W2 everywhere): who added it, who last changed it and when (whoStamp.ts).
  addedBy?: string;
  changedBy?: string;
  changedAt?: number;
};

export type TravelTrip = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  checklist: TravelChecklistItem[];
  todos?: TravelTodo[];
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
  // Version 2.2 (W1/W2 everywhere): who added it, who last changed it and when (whoStamp.ts).
  addedBy?: string;
  changedBy?: string;
  changedAt?: number;
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
  // Redesign: what the budget is made of (the budget is their total when there are any),
  // and past years of an event that repeats every year.
  items?: { id: string; name: string; cost: number | '' }[];
  history?: { date: string; budget: number; spent: number }[];
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
  // Redesign: a progress goal can follow a savings pot (saved so far) or a debt/loan
  // (how much of it is paid off); and when a checklist goal was ticked off.
  linkedTo?: { kind: 'pot' | 'debt' | 'loan'; id: string };
  completedDate?: string;
};

// Redesign (Move money): one move between two of your accounts. The balances are
// changed when it's saved; this keeps a record of it.
export type Transfer = {
  id: string;
  date: string;
  from: string; // "debit:<accountId>" style key
  to: string;
  amount: number;
  fee?: number;
  note?: string;
  // Cath, 2026-10-27 (Undo, until a balance is typed in again): when it was made, its fee's
  // own Fees entry, and whether the fee came straight off the saved balance.
  createdAt?: number;
  feeTxnId?: string;
  feeOffSaved?: boolean;
};

export type BalanceAccountEntry = {
  id: string;
  name: string;
  amount: number | '';
  currency?: string;
  owner?: string;
  color?: string;
  // Version 3, credit cards only. `amount` stays what you can still use (approved K3);
  // with a limit the card page also shows what you owe (limit minus what you can use).
  creditLimit?: number;
  statementDueDay?: number; // day of the month the statement is due (1-31)
  minPayment?: number; // usual minimum payment
  // Version 2.2 (canvas B1): every time the balance was typed in by hand, newest first
  // (kept to the last 50). from is null for the first balance.
  balanceLog?: { at: number; from: number | null; to: number; by?: string }[];
  // Version 2.2 (canvas D1-D3): optional last 4 digits of a debit or credit card, to tell
  // cards apart. Exactly 4 numbers; never the full card number.
  last4?: string;
};

export type BalanceAccounts = {
  asOfDate: string;
  // The exact moment (milliseconds since 1970) the spending balances were last updated.
  // Pairs with asOfDate; see computeRunningBalances().
  asOfAt?: number;
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
  notes?: string;
  // Freeform labels the person can attach to a transaction, e.g. "vacation",
  // "tax-deductible" — used to filter reports by tag (B.13).
  tags?: string[];
  receiptPhoto?: string;
  paymentMethod?: PaymentMethod;
  // Set when this (expense) transaction is expected to be refunded — the amount currently
  // expected back (supports partial refunds). Only meaningful for direction: 'out'.
  refundExpectedAmount?: number;
  // Set once the refund is actually received — points at the real, linked ManualTransaction
  // (direction: 'in') created for it. Presence of this (not refundExpectedAmount) means
  // "Refunded" rather than "Pending" — mirrors the expenseTransactionId pattern already used
  // by Travel checklist items and Events.
  refundTransactionId?: string;
  // Version 3 (approved K5): a credit card purchase split into 3, 6 or 12 monthly payments.
  // Spending counts the whole amount on the day of purchase; this only tracks the parts.
  installments?: number;
  // When this transaction was first saved (milliseconds since 1970). Lets Left to Spend
  // tell whether spending logged on the same day as a balance update came before or
  // after that update. Older transactions don't have it and are treated as "before".
  createdAt?: number;
  // Redesign ("To review"): set when the category wasn't chosen by hand — filled in by
  // a rule, or imported from a spreadsheet — so the person can check it with one tap.
  // reviewWhy says why, e.g. 'Filled in by your rule' or 'Imported from a spreadsheet'.
  needsReview?: boolean;
  reviewWhy?: string;
  // Money in only: what kind of extra income this is (see incomeKinds.ts). Shown under
  // "Extra income" on the Income page.
  incomeKind?: 'bonus' | 'side' | 'allowance' | 'gift' | 'other';
  // Redesign ("Make it repeat"): set on transactions added by a repeat, pointing at it.
  recurringId?: string;
  // Version 2.2 (canvas W1 B + W2): who added it (username), and who last changed it and
  // when. Stamped on save; shown only in a shared household.
  addedBy?: string;
  changedBy?: string;
  changedAt?: number;
};

// Redesign ("Make it repeat" / Recurring page): a transaction that is added for you on a
// schedule. Made from an existing transaction (its first occurrence). nextDate is the
// next day one should be added; src/recurring.ts adds every one that has come due.
export type RecurringFrequency = 'weekly' | 'every2weeks' | 'monthly' | 'yearly';

export type RecurringRule = {
  id: string;
  label: string;
  amount: number;
  direction: 'in' | 'out' | 'saving';
  owner: string;
  category?: string;
  notes?: string;
  paymentMethod?: PaymentMethod;
  frequency: RecurringFrequency;
  startDate: string; // the first occurrence (the transaction it was made from)
  nextDate: string; // the next date to add
  sourceTxnId?: string;
  createdAt?: number;
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

// ---- PC.5a: avatars ----
// Stored inside the encrypted household model, keyed by username, so linked
// members can see each other's. 'initials' is the default when nothing is set.
// photoDataUri is a small (192px) JPEG data URI made by makeAvatarDataUri().
export type AvatarConfig = {
  type: 'initials' | 'preset' | 'photo';
  presetId?: string;
  photoDataUri?: string;
  updatedAt?: number;
};

// A photo someone uploaded, kept so they can switch back to it later.
export const MAX_SAVED_AVATAR_PHOTOS = 4;
export type SavedAvatarPhoto = {
  id: string;
  dataUri: string;
  addedAt: number;
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
  // Redesign (Move money): money moved between your own accounts. Not spending.
  transfers?: Transfer[];
  // Redesign: the order of cards in Home's Wallet ("debit:<id>" keys), set by dragging.
  walletOrder?: string[];
  categories: Category[];
  categoryBudgets: CategoryBudget[];
  calculatorInputs?: CalculatorInputs;
  groceries?: GroceryItem[];
  groceryCalculator?: GroceryCalcEntry[];
  mealIdeas?: MealIdea[];
  travel?: TravelTrip[];
  events?: EventItem[];
  recurring?: RecurringRule[];
  // Shared Expenses (Plan): who is in the group (Person ids), what was paid and how it
  // was split, and payments between people that settle balances.
  sharedMembers?: string[];
  sharedExpenses?: SharedExpense[];
  sharedSettlements?: SharedSettlement[];
    yearlyGoals?: YearlyGoal[];
  payees?: Payee[];
  categorizationRules?: CategorizationRule[];
  avatars?: Record<string, AvatarConfig>;
  // Uploaded profile photos per username, newest first (encrypted and synced with the rest).
  avatarPhotos?: Record<string, SavedAvatarPhoto[]>;
  // "What should we call you?": the name each person wants on Home, keyed by username
  // (encrypted and synced with the rest, like avatars).
  preferredNames?: Record<string, PreferredName>;
};

export type PreferredName = {
  name: string;
  updatedAt: number;
};
