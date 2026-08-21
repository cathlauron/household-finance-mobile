// ============================================================
// Household Finance App — Default (empty) data model
// ============================================================
// Every screen we build later starts from this shape when a
// profile is brand new. It matches defaultModel() in the
// original web app, trimmed to what this checkpoint covers.
// ============================================================

import type { HouseholdModel } from './types';

export function defaultModel(): HouseholdModel {
  return {
    settings: {
      currency: 'PHP',
      notifyDaysBefore: 3,
      theme: 'classic',
      colorMode: 'light',
      fontSize: 'md',
      fontFamily: 'rounded',
      layoutMode: 'bottomnav',
      incomeToleranceDays: 2,
    },
    people: [],
    income: [],
    bills: [],
    debts: [],
    loans: [],
    savingsGoals: [],
    balanceAccounts: {
      asOfDate: '',
      cash: [],
      debit: [],
      credit: [],
      investment: [],
      property: [],
      vehicle: [],
    },
    manualTransactions: [],
    categories: [],
    categoryBudgets: [],
  };
}