// ============================================================
// Household Finance App — Merging two people's data (Checkpoint 9.2c)
// ============================================================
// Used by linking.ts's finishJoinerLink() when someone picks "Merge both"
// on the linking comparison screen. Combines two separate HouseholdModels
// into one:
//   - People are matched by name (case-insensitive, trimmed) so the same
//     person isn't duplicated — everything that references a person by id
//     (income, bills, debts, loans, manual transactions) gets remapped to
//     point at the matched person instead of creating a duplicate.
//   - Everything else (bills, debts, loans, savings goals, transactions,
//     categories, etc.) is simply combined — nothing from either side is
//     lost. A few name-based lists (categories, payees, category budgets)
//     are de-duplicated by name so you don't end up with two "Groceries"
//     categories after merging.
//   - Settings (currency, theme, etc.) come from whichever model is
//     passed in first ("a") — there's no meaningful way to "merge" a
//     single setting like currency, so one side has to be picked.
// ============================================================

import type {
  HouseholdModel,
  Person,
  Category,
  Payee,
  CategoryBudget,
} from './types';

function normalizedName(name: string | undefined): string {
  return (name || '').trim().toLowerCase();
}

function makeUniqueId(existing: Set<string>, prefix: string, index: number): string {
  let candidate = `${prefix}-${index}`;
  let attempt = 1;
  while (existing.has(candidate)) {
    candidate = `${prefix}-${index}-${attempt}`;
    attempt += 1;
  }
  return candidate;
}

function sanitizeIdList<T extends { id: string }>(
  items: T[] | undefined,
  prefix: string,
  seenSet?: Set<string>
): T[] {
  const normalized: T[] = (items ?? []).map((item) => ({ ...item }));
  const seen = seenSet ?? new Set<string>();
  return normalized.map((item, index) => {
    const raw = item.id && item.id.trim() ? item.id : makeUniqueId(seen, prefix, index);
    if (!seen.has(raw)) {
      seen.add(raw);
      return item;
    }

    const uniqueId = makeUniqueId(seen, prefix, index);
    seen.add(uniqueId);
    return { ...item, id: uniqueId } as T;
  });
}

export function sanitizeModelIds(model: HouseholdModel): HouseholdModel {
  const seenBillCycles = new Set<string>();
  const seenDebtCycles = new Set<string>();
  const seenLoanPayments = new Set<string>();
  const seenSavingsContribs = new Set<string>();
  const seenIncomeLogs = new Set<string>();
  const seenTravelItems = new Set<string>();

  return {
    ...model,
    people: sanitizeIdList(model.people, 'person'),
    income: sanitizeIdList(model.income, 'income').map((source) => ({
      ...source,
      paymentLog: sanitizeIdList(source.paymentLog, 'paylog', seenIncomeLogs),
    })),
    bills: sanitizeIdList(model.bills, 'bill').map((bill) => ({
      ...bill,
      cycles: sanitizeIdList(bill.cycles, 'cycle', seenBillCycles),
    })),
    debts: sanitizeIdList(model.debts, 'debt').map((debt) => ({
      ...debt,
      cycles: sanitizeIdList(debt.cycles, 'cycle', seenDebtCycles),
    })),
    loans: sanitizeIdList(model.loans, 'loan').map((loan) => ({
      ...loan,
      actualPayments: sanitizeIdList(loan.actualPayments, 'lpay', seenLoanPayments),
    })),
    savingsGoals: sanitizeIdList(model.savingsGoals, 'goal').map((goal) => ({
      ...goal,
      contributions: sanitizeIdList(goal.contributions, 'contrib', seenSavingsContribs),
    })),
    balanceAccounts: {
      ...model.balanceAccounts,
      cash: sanitizeIdList(model.balanceAccounts.cash, 'cash-account'),
      debit: sanitizeIdList(model.balanceAccounts.debit, 'debit-account'),
      credit: sanitizeIdList(model.balanceAccounts.credit, 'credit-account'),
      investment: sanitizeIdList(model.balanceAccounts.investment, 'investment-account'),
      property: sanitizeIdList(model.balanceAccounts.property, 'property-account'),
      vehicle: sanitizeIdList(model.balanceAccounts.vehicle, 'vehicle-account'),
    },
    manualTransactions: sanitizeIdList(model.manualTransactions, 'txn'),
    categories: sanitizeIdList(model.categories, 'cat'),
    categoryBudgets: sanitizeIdList(model.categoryBudgets, 'budget'),
    groceries: sanitizeIdList(model.groceries ?? [], 'grocery'),
    groceryCalculator: sanitizeIdList(model.groceryCalculator ?? [], 'grocery-calc'),
    travel: sanitizeIdList(model.travel ?? [], 'trip').map((trip) => ({
      ...trip,
      checklist: sanitizeIdList(trip.checklist, 'travelitem', seenTravelItems),
    })),
    events: sanitizeIdList(model.events ?? [], 'event'),
    yearlyGoals: sanitizeIdList(model.yearlyGoals ?? [], 'ygoal'),
    payees: sanitizeIdList(model.payees ?? [], 'payee'),
    categorizationRules: sanitizeIdList(model.categorizationRules ?? [], 'rule'),
  };
}

// Combines two lists of {name}-having items, matching by normalized name.
// Anything from listA is always kept; anything from listB whose name
// already exists in listA is skipped (listA's version wins on a clash).
function mergeByName<T extends { name: string }>(listA: T[], listB: T[]): T[] {
  const seen = new Set(listA.map((x) => normalizedName(x.name)));
  const merged = [...listA];
  listB.forEach((item) => {
    const key = normalizedName(item.name);
    if (key && seen.has(key)) return;
    seen.add(key);
    merged.push(item);
  });
  return merged;
}

export function mergeModels(a: HouseholdModel, b: HouseholdModel): HouseholdModel {
  // ---- People: match by name, remember how to remap b's ids ----
  const mergedPeople: Person[] = [...a.people];
  const personIdMap: Record<string, string> = {};

  b.people.forEach((bp) => {
    const key = normalizedName(bp.name);
    const match = key ? mergedPeople.find((ap) => normalizedName(ap.name) === key) : undefined;
    if (match) {
      personIdMap[bp.id] = match.id;
    } else {
      mergedPeople.push(bp);
      personIdMap[bp.id] = bp.id;
    }
  });

  function remapPersonId(id: string): string {
    if (!id) return id;
    return personIdMap[id] ?? id;
  }

  const mergedIncome = [
    ...a.income,
    ...b.income.map((s) => ({ ...s, personId: remapPersonId(s.personId) })),
  ];

  const mergedBills = [
    ...a.bills,
    ...b.bills.map((bill) => ({ ...bill, owner: remapPersonId(bill.owner) })),
  ];

  const mergedDebts = [
    ...a.debts,
    ...b.debts.map((d) => ({ ...d, owner: remapPersonId(d.owner) })),
  ];

  const mergedLoans = [
    ...a.loans,
    ...b.loans.map((l) => ({ ...l, owner: remapPersonId(l.owner) })),
  ];

  const mergedManualTransactions = [
    ...a.manualTransactions,
    ...b.manualTransactions.map((t) => ({ ...t, owner: remapPersonId(t.owner) })),
  ];

  // ---- Categories & Payees: de-duped by name, "a" wins on a name clash ----
  const mergedCategories: Category[] = mergeByName(a.categories, b.categories);
  const mergedPayees: Payee[] = mergeByName(a.payees ?? [], b.payees ?? []);

  // ---- Category budgets: de-duped by category name, "a" wins ----
  const seenBudgetCategories = new Set(a.categoryBudgets.map((cb) => normalizedName(cb.category)));
  const mergedCategoryBudgets: CategoryBudget[] = [
    ...a.categoryBudgets,
    ...b.categoryBudgets.filter((cb) => {
      const key = normalizedName(cb.category);
      if (key && seenBudgetCategories.has(key)) return false;
      seenBudgetCategories.add(key);
      return true;
    }),
  ];

  const mergedModel: HouseholdModel = {
    settings: a.settings,
    people: mergedPeople,
    income: mergedIncome,
    bills: mergedBills,
    debts: mergedDebts,
    loans: mergedLoans,
    savingsGoals: [...a.savingsGoals, ...b.savingsGoals],
    balanceAccounts: {
      asOfDate: a.balanceAccounts.asOfDate || b.balanceAccounts.asOfDate,
      cash: [...a.balanceAccounts.cash, ...b.balanceAccounts.cash],
      debit: [...a.balanceAccounts.debit, ...b.balanceAccounts.debit],
      credit: [...a.balanceAccounts.credit, ...b.balanceAccounts.credit],
      investment: [...a.balanceAccounts.investment, ...b.balanceAccounts.investment],
      property: [...a.balanceAccounts.property, ...b.balanceAccounts.property],
      vehicle: [...a.balanceAccounts.vehicle, ...b.balanceAccounts.vehicle],
    },
    manualTransactions: mergedManualTransactions,
    categories: mergedCategories,
    categoryBudgets: mergedCategoryBudgets,
    calculatorInputs: a.calculatorInputs ?? b.calculatorInputs,
    groceries: [...(a.groceries ?? []), ...(b.groceries ?? [])],
    groceryCalculator: [...(a.groceryCalculator ?? []), ...(b.groceryCalculator ?? [])],
    travel: [...(a.travel ?? []), ...(b.travel ?? [])],
    events: [...(a.events ?? []), ...(b.events ?? [])],
    yearlyGoals: [...(a.yearlyGoals ?? []), ...(b.yearlyGoals ?? [])],
    payees: mergedPayees,
    categorizationRules: [...(a.categorizationRules ?? []), ...(b.categorizationRules ?? [])],
  };

  return sanitizeModelIds(mergedModel);
}
