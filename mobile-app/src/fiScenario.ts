// ============================================================
// FI scenario math (Checkpoint B.12b-3)
// ============================================================
// Pure, reusable math extracted so SavingsScreen's own live FI Calculator
// and the new scenario-comparison modal always agree on how a set of
// inputs turns into a FI number/timeline. Mirrors the exact calculation
// SavingsScreen.tsx already runs inline for its own FI Calculator section
// — nothing here changes behavior for anyone not using the comparison
// modal; SavingsScreen.tsx's own inline math is untouched.
// ============================================================

export type FiScenarioInputs = {
  annualExpenses: number;
  guaranteedAnnualIncome: number;
  currentSavings: number;
  swrPct: number;
  expectedReturnPct: number;
  monthlySavings: number;
};

export type FiScenarioResult = {
  netAnnualExpenses: number;
  fiNumber: number | null;
  progressPct: number | null;
  canProjectTimeline: boolean;
  monthsUntilFi: number | null;
  timelineLabel: string | null;
  projectedDateLabel: string;
};

function formatYearsMonths(totalMonths: number): string {
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (years === 0) return `${months} mo${months === 1 ? '' : 's'}`;
  if (months === 0) return `${years} yr${years === 1 ? '' : 's'}`;
  return `${years} yr${years === 1 ? '' : 's'} ${months} mo${months === 1 ? '' : 's'}`;
}

export function computeFiScenario(inputs: FiScenarioInputs): FiScenarioResult {
  const expensesNum = inputs.annualExpenses;
  const guaranteedIncomeNum = isNaN(inputs.guaranteedAnnualIncome) ? 0 : inputs.guaranteedAnnualIncome;
  const savingsNum = isNaN(inputs.currentSavings) ? 0 : inputs.currentSavings;
  const swrNum = inputs.swrPct > 0 ? inputs.swrPct : 4.0;
  const returnNum = inputs.expectedReturnPct;
  const monthlySavingsNum = inputs.monthlySavings;

  const netAnnualExpenses = !isNaN(expensesNum) ? Math.max(0, expensesNum - guaranteedIncomeNum) : NaN;
  const fiNumber =
    !isNaN(netAnnualExpenses) && netAnnualExpenses > 0 ? netAnnualExpenses / (swrNum / 100) : null;
  const progressPct =
    fiNumber && !isNaN(savingsNum) ? Math.min(100, Math.max(0, (savingsNum / fiNumber) * 100)) : null;

  const canProjectTimeline =
    fiNumber !== null &&
    !isNaN(savingsNum) &&
    !isNaN(returnNum) &&
    !isNaN(monthlySavingsNum) &&
    monthlySavingsNum >= 0;

  let monthsUntilFi: number | null = null;
  if (canProjectTimeline && fiNumber !== null) {
    if (savingsNum >= fiNumber) {
      monthsUntilFi = 0;
    } else {
      const monthlyRate = returnNum / 100 / 12;
      let balance = savingsNum;
      let months = 0;
      const maxMonths = 1200;
      while (balance < fiNumber && months < maxMonths) {
        balance = balance * (1 + monthlyRate) + monthlySavingsNum;
        months++;
      }
      monthsUntilFi = months < maxMonths ? months : null;
    }
  }

  const timelineLabel = monthsUntilFi !== null ? formatYearsMonths(monthsUntilFi) : null;
  const projectedDateLabel = (() => {
    if (monthsUntilFi === null) return '';
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + monthsUntilFi);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  })();

  return {
    netAnnualExpenses,
    fiNumber,
    progressPct,
    canProjectTimeline,
    monthsUntilFi,
    timelineLabel,
    projectedDateLabel,
  };
}