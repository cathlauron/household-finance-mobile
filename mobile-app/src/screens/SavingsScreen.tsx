import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from '../components/BottomSheet';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { formatPeso, computeMonthlyObligationsBaseline } from '../balanceProjection';
import type { SavingsGoal, SavingsContribution, HouseholdModel, Bill, IncomeSource } from '../types';
import CollapsibleRow from '../components/CollapsibleRow';
import SwipeableRow from '../components/SwipeableRow';
import { makeId } from '../utils';
import DateField from '../components/DateField';

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateSafe(d: string): Date | null {
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const dt = new Date(d + 'T00:00:00');
  return isNaN(dt.getTime()) ? null : dt;
}

function formatShortDateLabel(iso: string): string {
  const dt = parseDateSafe(iso);
  if (!dt) return 'No target date';
  return dt.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function contributionsTotal(goal: SavingsGoal): number {
  return goal.contributions.reduce((sum, c) => sum + (typeof c.amount === 'number' ? c.amount : 0), 0);
}

function goalTarget(goal: SavingsGoal): number {
  return typeof goal.targetAmount === 'number' ? goal.targetAmount : 0;
}

function goalProgressPct(goal: SavingsGoal): number {
  const target = goalTarget(goal);
  if (target <= 0) return 0;
  const pct = (contributionsTotal(goal) / target) * 100;
  return Math.min(100, Math.max(0, pct));
}

function sortGoals(goals: SavingsGoal[]): SavingsGoal[] {
  return [...goals].sort((a, b) => {
    const da = parseDateSafe(a.targetDate);
    const db = parseDateSafe(b.targetDate);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da.getTime() - db.getTime();
  });
}

// ---- Auto-suggested expense baseline (pulled from real Bills data) ----
// Mirrors the web app's monthlyBudgetBaseline(): monthly-recurring bills counted at their
// most recently logged cycle amount, plus annual-recurring bills' most recent amount divided
// by 12. One-time/custom bills aren't counted — there's no reliable "typical month" figure
// for those. This never overwrites a saved value; it's only ever shown as a tappable
// suggestion the person can choose to accept.


function incomeSourceMonthlyAmount(source: IncomeSource): number {
  const amount = typeof source.expectedAmount === 'number' ? source.expectedAmount : 0;
  if (amount <= 0) return 0;
  if (source.frequency === 'monthly') return amount;
  if (source.frequency === 'weekly') return amount * 52 / 12;
  if (source.frequency === 'biweekly') return amount * 26 / 12;
  if (source.frequency === 'semimonthly') return amount * 24 / 12;
  return amount;
}

function computeMonthlyIncomeBaseline(income: IncomeSource[]): number {
  return income.reduce((sum, source) => sum + incomeSourceMonthlyAmount(source), 0);
}

function sumAccountEntries(entries: { amount: number | '' }[]): number {
  return entries.reduce((sum, e) => sum + (typeof e.amount === 'number' ? e.amount : 0), 0);
}

function formatYearsMonths(totalMonths: number): string {
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (years === 0) return `${months} mo${months === 1 ? '' : 's'}`;
  if (months === 0) return `${years} yr${years === 1 ? '' : 's'}`;
  return `${years} yr${years === 1 ? '' : 's'} ${months} mo${months === 1 ? '' : 's'}`;
}

type ContribRow = { id: string; date: string; amountInput: string };

type PillTab = 'goals' | 'ef' | 'fi';

export default function SavingsScreen() {
  const { colors } = useTheme();
  const { model, saveModel } = useData();
  const styles = makeStyles(colors);

  const [activeTab, setActiveTab] = useState<PillTab>('goals');

  // ---- Goal add/edit modal state ----
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [targetAmountInput, setTargetAmountInput] = useState('');
  const [targetDateInput, setTargetDateInput] = useState('');
  const [contribRows, setContribRows] = useState<ContribRow[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  function getEfStatus(months: number | null, colors: { error: string; orange: string; ok: string; inkDim: string }) {
  if (months === null) return { color: colors.inkDim, label: null as string | null };
  if (months < 1.5) return { color: colors.error, label: 'Needs attention' };
  if (months < 3.0) return { color: colors.orange, label: 'Growing' };
  return { color: colors.ok, label: 'Fully funded' };
}

  // ---- Emergency Fund calculator local state ----
  const [efExpensesInput, setEfExpensesInput] = useState<string | null>(null);
  const [efSavingsInput, setEfSavingsInput] = useState<string | null>(null);
  const [efSaved, setEfSaved] = useState(false);

  // ---- FI calculator local state ----
  const [fiExpensesInput, setFiExpensesInput] = useState<string | null>(null);
  const [fiSavingsInput, setFiSavingsInput] = useState<string | null>(null);
  const [fiSaved, setFiSaved] = useState(false);
  const [fiSwrInput, setFiSwrInput] = useState<string | null>(null);
  const [fiSwrCustomOpen, setFiSwrCustomOpen] = useState(false);
  const [fiReturnRateInput, setFiReturnRateInput] = useState<string | null>(null);
  const [fiMonthlySavingsInput, setFiMonthlySavingsInput] = useState<string | null>(null);
  const [fiShowDate, setFiShowDate] = useState(true);
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!model) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator color={colors.accent ?? colors.gold} />
      </SafeAreaView>
    );
  }

  // Sync calculator inputs from the model the first time each section is viewed, so
  // typing doesn't get stomped by a stale render — cheap to just do on every render
  // since these are plain string mirrors of the model's own values.
  function calcInputsFromModel() {
    return model!.calculatorInputs || {
      efMonthlyExpenses: '' as const,
      efCurrentSavings: '' as const,
      fiAnnualExpenses: '' as const,
      fiCurrentSavings: '' as const,
      fiWithdrawalRatePct: '' as const,
      fiExpectedReturnPct: '' as const,
      fiMonthlySavings: '' as const,
    };
  }

  function openAddModal() {
    setEditingId(null);
    setNameInput('');
    setTargetAmountInput('');
    setTargetDateInput('');
    setContribRows([]);
    setErrorMsg('');
    setModalOpen(true);
  }

  function openEditModal(goal: SavingsGoal) {
    setEditingId(goal.id);
    setNameInput(goal.name);
    setTargetAmountInput(goalTarget(goal) === 0 ? '' : String(goalTarget(goal)));
    setTargetDateInput(goal.targetDate || '');
    setContribRows(
      goal.contributions.map((c) => ({
        id: c.id,
        date: c.date,
        amountInput: typeof c.amount === 'number' ? String(c.amount) : '',
      }))
    );
    setErrorMsg('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setErrorMsg('');
  }

  function addContribRow() {
    setContribRows((rows) => [...rows, { id: makeId('contrib'), date: todayISO(), amountInput: '' }]);
  }

  function removeContribRow(id: string) {
    setContribRows((rows) => rows.filter((r) => r.id !== id));
  }

  function updateContribDate(id: string, value: string) {
    setContribRows((rows) => rows.map((r) => (r.id === id ? { ...r, date: value } : r)));
  }

  function updateContribAmount(id: string, value: string) {
    setContribRows((rows) => rows.map((r) => (r.id === id ? { ...r, amountInput: value } : r)));
  }

  async function handleSaveGoal() {
    if (!model) return;
    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      setErrorMsg('Enter a name for this goal.');
      return;
    }
    let parsedTarget: number | '' = '';
    if (targetAmountInput.trim() !== '') {
      const n = parseFloat(targetAmountInput);
      if (isNaN(n)) {
        setErrorMsg('Enter a valid target amount, or leave it blank.');
        return;
      }
      parsedTarget = n;
    }
    const trimmedDate = targetDateInput.trim();
    if (trimmedDate && !/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
      setErrorMsg('Enter the target date as YYYY-MM-DD, e.g. 2026-12-31, or leave it blank.');
      return;
    }

    // Build the real contributions list from whatever's currently in the rows — a row
    // with both date and amount blank is treated as "not really added yet" and dropped
    // silently, so an unused blank row someone tapped "+ Add" on doesn't block saving.
    const contributions: SavingsContribution[] = [];
    for (const row of contribRows) {
      const dateTrimmed = row.date.trim();
      const amountTrimmed = row.amountInput.trim();
      if (!dateTrimmed && !amountTrimmed) continue;
      if (dateTrimmed && !/^\d{4}-\d{2}-\d{2}$/.test(dateTrimmed)) {
        setErrorMsg('Each contribution date must be YYYY-MM-DD, e.g. 2026-08-20.');
        return;
      }
      let amount: number | '' = '';
      if (amountTrimmed !== '') {
        const n = parseFloat(amountTrimmed);
        if (isNaN(n)) {
          setErrorMsg('Enter a valid contribution amount, or remove that row.');
          return;
        }
        amount = n;
      }
      contributions.push({ id: row.id, date: dateTrimmed, amount });
    }
    const newCurrentAmount = contributions.reduce(
      (sum, c) => sum + (typeof c.amount === 'number' ? c.amount : 0),
      0
    );

    const updated: HouseholdModel = { ...model, savingsGoals: [...model.savingsGoals] };

    if (editingId) {
      updated.savingsGoals = updated.savingsGoals.map((g) => {
        if (g.id !== editingId) return g;
        return {
          ...g,
          name: trimmedName,
          targetAmount: parsedTarget,
          targetDate: trimmedDate,
          contributions,
          currentAmount: newCurrentAmount,
        };
      });
    } else {
      const newGoal: SavingsGoal = {
        id: makeId('goal'),
        name: trimmedName,
        targetAmount: parsedTarget,
        targetDate: trimmedDate,
        contributions,
        currentAmount: newCurrentAmount,
        createdAt: Date.now(),
      };
      updated.savingsGoals = [...updated.savingsGoals, newGoal];
    }

    setSaving(true);
    try {
      await saveModel(updated);
      closeModal();
    } catch (e) {
      setErrorMsg('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function performDeleteGoal() {
    if (!editingId || !model) return;
    const updated: HouseholdModel = {
      ...model,
      savingsGoals: model.savingsGoals.filter((g) => g.id !== editingId),
    };
    setSaving(true);
    try {
      await saveModel(updated);
      closeModal();
    } catch (e) {
      setErrorMsg('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteGoal() {
    Alert.alert(
      'Delete this savings goal?',
      'This will permanently delete the goal and all logged contributions. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: performDeleteGoal },
      ]
    );
  }

  async function performDeleteGoalById(id: string) {
    if (!model) return;
    const updated: HouseholdModel = {
      ...model,
      savingsGoals: model.savingsGoals.filter((g) => g.id !== id),
      events: (model.events || []).map((ev) =>
        ev.savingsGoalId === id ? { ...ev, savingsGoalId: undefined, trackInSavings: false } : ev
      ),
      travel: (model.travel || []).map((trip) =>
        trip.savingsGoalId === id ? { ...trip, savingsGoalId: undefined, trackInSavings: false } : trip
      ),
    };
    setSaving(true);
    try {
      await saveModel(updated);
    } catch (e) {
      Alert.alert('Failed to delete', 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleSwipeDelete(goal: SavingsGoal) {
    Alert.alert(
      'Delete this savings goal?',
      'This will permanently delete the goal and all logged contributions. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => performDeleteGoalById(goal.id) },
      ]
    );
  }

  async function handleSaveEf() {
    if (!model) return;
    const current = calcInputsFromModel();
    const expenses = efExpensesInput.trim() === '' ? '' : parseFloat(efExpensesInput);
    const savings = efSavingsInput.trim() === '' ? '' : parseFloat(efSavingsInput);
    if (expenses !== '' && isNaN(expenses as number)) return;
    if (savings !== '' && isNaN(savings as number)) return;
    const updated: HouseholdModel = {
      ...model,
      calculatorInputs: {
        ...current,
        efMonthlyExpenses: expenses as number | '',
        efCurrentSavings: savings as number | '',
      },
    };
    await saveModel(updated);
    setEfSaved(true);
    setTimeout(() => setEfSaved(false), 1800);
  }

  async function handleSaveFi() {
    if (!model) return;
    const current = calcInputsFromModel();
    const expensesRaw = (fiExpensesInput ?? fiExpensesDisplay).trim();
    const savingsRaw = (fiSavingsInput ?? fiSavingsDisplay).trim();
    const swrRaw = (fiSwrInput ?? fiSwrDisplay).trim();
    const returnRaw = (fiReturnRateInput ?? fiReturnDisplay).trim();
    const monthlySavingsRaw = (fiMonthlySavingsInput ?? fiMonthlySavingsDisplay).trim();
    const expenses = expensesRaw === '' ? '' : parseFloat(expensesRaw);
    const savings = savingsRaw === '' ? '' : parseFloat(savingsRaw);
    const swr = swrRaw === '' ? '' : parseFloat(swrRaw);
    const returnRate = returnRaw === '' ? '' : parseFloat(returnRaw);
    const monthlySavings = monthlySavingsRaw === '' ? '' : parseFloat(monthlySavingsRaw);
    if (expenses !== '' && isNaN(expenses as number)) return;
    if (savings !== '' && isNaN(savings as number)) return;
    if (swr !== '' && isNaN(swr as number)) return;
    if (returnRate !== '' && isNaN(returnRate as number)) return;
    if (monthlySavings !== '' && isNaN(monthlySavings as number)) return;
    const updated: HouseholdModel = {
      ...model,
      calculatorInputs: {
        ...current,
        fiAnnualExpenses: expenses as number | '',
        fiCurrentSavings: savings as number | '',
        fiWithdrawalRatePct: swr as number | '',
        fiExpectedReturnPct: returnRate as number | '',
        fiMonthlySavings: monthlySavings as number | '',
      },
    };
    await saveModel(updated);
    setFiSaved(true);
    setTimeout(() => setFiSaved(false), 1800);
  }

  const goals = sortGoals(model.savingsGoals);
  const totalSaved = goals.reduce((sum, g) => sum + contributionsTotal(g), 0);

  const suggestedMonthlyExpenses = computeMonthlyObligationsBaseline(
  model.bills,
  model.debts || [],
  model.loans || []
);
const suggestedAnnualExpenses = suggestedMonthlyExpenses * 12;
const suggestedMonthlyIncome = computeMonthlyIncomeBaseline(model.income || []);

  const storedCalc = calcInputsFromModel();
  const efExpensesDisplay =
    efExpensesInput !== null ? efExpensesInput : storedCalc.efMonthlyExpenses === '' ? '' : String(storedCalc.efMonthlyExpenses);
  const efSavingsDisplay =
    efSavingsInput !== null ? efSavingsInput : storedCalc.efCurrentSavings === '' ? '' : String(storedCalc.efCurrentSavings);
  const fiExpensesDisplay =
    fiExpensesInput !== null ? fiExpensesInput : storedCalc.fiAnnualExpenses === '' ? '' : String(storedCalc.fiAnnualExpenses);
  const fiSavingsDisplay =
    fiSavingsInput !== null ? fiSavingsInput : storedCalc.fiCurrentSavings === '' ? '' : String(storedCalc.fiCurrentSavings);

  const efIncomeDisplay =
    suggestedMonthlyIncome > 0 ? `Your income sources add up to ${formatPeso(suggestedMonthlyIncome)}/mo` : '';
  const fiIncomeDisplay =
    suggestedMonthlyIncome > 0 ? `Your income sources add up to ${formatPeso(suggestedMonthlyIncome)}/mo` : '';

  const efExpensesNum = parseFloat(efExpensesDisplay);
  const efSavingsNum = parseFloat(efSavingsDisplay);
  const efMonthsCovered =
    !isNaN(efExpensesNum) && efExpensesNum > 0 && !isNaN(efSavingsNum) ? efSavingsNum / efExpensesNum : null;

  const fiExpensesNum = parseFloat(fiExpensesDisplay);
  const fiSavingsNum = fiSavingsDisplay.trim() === '' ? 0 : parseFloat(fiSavingsDisplay);

  const FI_SWR_PRESETS = ['3.5', '4.0', '4.5'];
  const fiSwrDisplay =
    fiSwrInput !== null
      ? fiSwrInput
      : storedCalc.fiWithdrawalRatePct === '' ? '4.0' : String(storedCalc.fiWithdrawalRatePct);
  const fiSwrIsPreset = FI_SWR_PRESETS.includes(fiSwrDisplay);
  const fiSwrNum = parseFloat(fiSwrDisplay);
  const fiSwrForMath = !isNaN(fiSwrNum) && fiSwrNum > 0 ? fiSwrNum : 4.0;

  const fiReturnDisplay =
    fiReturnRateInput !== null
      ? fiReturnRateInput
      : storedCalc.fiExpectedReturnPct === '' ? '' : String(storedCalc.fiExpectedReturnPct);
  const fiReturnNum = parseFloat(fiReturnDisplay);

  const suggestedMonthlySavings = Math.max(0, suggestedMonthlyIncome - suggestedMonthlyExpenses);
  const fiMonthlySavingsDisplay =
    fiMonthlySavingsInput !== null
      ? fiMonthlySavingsInput
      : storedCalc.fiMonthlySavings === '' ? '' : String(storedCalc.fiMonthlySavings);
  const fiMonthlySavingsNum = parseFloat(fiMonthlySavingsDisplay);

  const suggestedNetWorth =
    sumAccountEntries(model.balanceAccounts?.investment || []) +
    sumAccountEntries(model.balanceAccounts?.cash || []) +
    sumAccountEntries(model.balanceAccounts?.debit || []);

  const fiNumber = !isNaN(fiExpensesNum) && fiExpensesNum > 0 ? fiExpensesNum / (fiSwrForMath / 100) : null;
  const fiProgressPct =
    fiNumber && !isNaN(fiSavingsNum) ? Math.min(100, Math.max(0, (fiSavingsNum / fiNumber) * 100)) : null;

  const fiCanProjectTimeline =
    fiNumber !== null && !isNaN(fiSavingsNum) && !isNaN(fiReturnNum) && !isNaN(fiMonthlySavingsNum) && fiMonthlySavingsNum >= 0;

  let fiMonthsUntilFi: number | null = null;
  if (fiCanProjectTimeline && fiNumber !== null) {
    if (fiSavingsNum >= fiNumber) {
      fiMonthsUntilFi = 0;
    } else {
      const monthlyRate = fiReturnNum / 100 / 12;
      let balance = fiSavingsNum;
      let months = 0;
      const maxMonths = 1200;
      while (balance < fiNumber && months < maxMonths) {
        balance = balance * (1 + monthlyRate) + fiMonthlySavingsNum;
        months++;
      }
      fiMonthsUntilFi = months < maxMonths ? months : null;
    }
  }

  const fiTimelineLabel = fiMonthsUntilFi !== null ? formatYearsMonths(fiMonthsUntilFi) : null;
  const fiProjectedDateLabel = (() => {
    if (fiMonthsUntilFi === null) return '';
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + fiMonthsUntilFi);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  })();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.pillRow}>
        <TouchableOpacity
          style={[styles.pillButton, activeTab === 'goals' && styles.pillButtonActive]}
          onPress={() => setActiveTab('goals')}
        >
          <Text style={[styles.pillButtonText, activeTab === 'goals' && styles.pillButtonTextActive]}>Goals</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pillButton, activeTab === 'ef' && styles.pillButtonActive]}
          onPress={() => setActiveTab('ef')}
        >
          <Text style={[styles.pillButtonText, activeTab === 'ef' && styles.pillButtonTextActive]}>
            Emergency Fund
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pillButton, activeTab === 'fi' && styles.pillButtonActive]}
          onPress={() => setActiveTab('fi')}
        >
          <Text style={[styles.pillButtonText, activeTab === 'fi' && styles.pillButtonTextActive]}>
            FI Calculator
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'goals' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.balanceBanner}>
            <Text style={styles.balanceBannerLabel}>TOTAL SAVED ACROSS GOALS</Text>
            <Text style={styles.balanceBannerAmount}>{formatPeso(totalSaved)}</Text>
          </View>

          {goals.length === 0 && (
            <Text style={styles.emptyText}>No savings goals yet. Add your first one below.</Text>
          )}

          {goals.map((goal) => {
            const saved = contributionsTotal(goal);
            const target = goalTarget(goal);
            const pct = goalProgressPct(goal);
            const isExpanded = expandedGoalId === goal.id;
            const sortedContribs = [...(goal.contributions || [])].sort((a, b) =>
              a.date < b.date ? 1 : -1
            );
            const lastContrib = sortedContribs[0];
            return (
              <SwipeableRow
                key={goal.id}
                enabled={Boolean(model.settings.swipeToDeleteEnabled)}
                onDelete={() => handleSwipeDelete(goal)}
                testID={`goal-swipe-${goal.id}`}
              >
              <CollapsibleRow
                testID={`goal-row-${goal.id}`}
                isExpanded={isExpanded}
                onToggle={() => setExpandedGoalId((prev) => (prev === goal.id ? null : goal.id))}
                onEdit={() => openEditModal(goal)}
                collapsedContent={
                  <View style={styles.goalCollapsedWrap}>
                    <View style={styles.goalRowTop}>
                      <View style={styles.goalRowMain}>
                        <Text style={styles.goalName} numberOfLines={1}>
                          {goal.name || 'Untitled goal'}
                        </Text>
                        <Text style={styles.goalSub} numberOfLines={1}>
                          {formatShortDateLabel(goal.targetDate)}
                        </Text>
                      </View>
                      <Text style={styles.goalAmount}>
                        {formatPeso(saved)}
                        {target > 0 ? ' / ' + formatPeso(target) : ''}
                      </Text>
                    </View>
                    {target > 0 && (
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${pct}%` as const }]} />
                      </View>
                    )}
                  </View>
                }
                expandedContent={
                  <View style={styles.detailContainer}>
                    {target > 0 && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Remaining</Text>
                        <Text style={styles.detailValue}>{formatPeso(Math.max(target - saved, 0))}</Text>
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Contributions Logged</Text>
                      <Text style={styles.detailValue}>{sortedContribs.length}</Text>
                    </View>
                    {lastContrib && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Last Contribution</Text>
                        <Text style={styles.detailValue}>
                          {formatShortDateLabel(lastContrib.date)}
                          {typeof lastContrib.amount === 'number' ? ` · ${formatPeso(lastContrib.amount)}` : ''}
                        </Text>
                      </View>
                    )}
                  </View>
                }
              />
              </SwipeableRow>
            );
          })}

          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Text style={styles.addButtonText}>+ Add goal</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {activeTab === 'ef' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.calcIntro}>
            A rough guide for how many months your current savings would cover, based on your
            typical monthly essential spending. 3–6 months is a commonly used target.
          </Text>

          <Text style={styles.inputLabel}>Monthly essential expenses</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor={colors.inkFaint}
            keyboardType="decimal-pad"
            value={efExpensesDisplay}
            onChangeText={setEfExpensesInput}
          />
          {suggestedMonthlyExpenses > 0 && (
            <TouchableOpacity
              style={styles.suggestionRow}
              onPress={() =>
                setEfExpensesInput(String(Math.round(suggestedMonthlyExpenses * 100) / 100))
              }
            >
              <Text style={styles.suggestionText}>
                Based on your recurring Bills: {formatPeso(suggestedMonthlyExpenses)}/mo — tap to use this
              </Text>
            </TouchableOpacity>
          )}

          {efIncomeDisplay && (
            <View style={styles.suggestionRow}>
              <Text style={styles.suggestionText}>{efIncomeDisplay}</Text>
            </View>
          )}

          <Text style={styles.inputLabel}>Current savings set aside for this</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor={colors.inkFaint}
            keyboardType="decimal-pad"
            value={efSavingsDisplay}
            onChangeText={setEfSavingsInput}
          />

          <View style={styles.resultCard}>
    <Text style={styles.resultLabel}>MONTHS COVERED</Text>
    <Text style={[styles.resultAmount, { color: getEfStatus(efMonthsCovered, colors).color }]}>
      {efMonthsCovered !== null ? efMonthsCovered.toFixed(1) + ' months' : '—'}
    </Text>
    {getEfStatus(efMonthsCovered, colors).label && (
      <Text style={{ color: getEfStatus(efMonthsCovered, colors).color, fontSize: 12, fontWeight: '600', marginTop: 4 }}>
        {getEfStatus(efMonthsCovered, colors).label}
      </Text>
    )}
  </View>

                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
                    saving && { opacity: 0.6 },
                  ]}
                  onPress={handleSaveEf}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color={colors.gold} size="small" />
                  ) : (
                    <>
                      {efSaved && (
                        <Ionicons name="checkmark" size={16} color={colors.navy2} style={{ marginRight: 6 }} />
                      )}
                      <Text style={styles.saveButtonText}>{efSaved ? 'Saved' : 'Save'}</Text>
                    </>
                  )}
                </TouchableOpacity>
        </ScrollView>
      )}

      {activeTab === 'fi' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.calcIntro}>
            Your "FI number" is how much you'd need saved/invested to no longer need a
            paycheck, based on a safe withdrawal rate you choose below. This is just a
            simple estimate, not financial advice.
          </Text>

          <Text style={styles.inputLabel}>Annual expenses</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor={colors.inkFaint}
            keyboardType="decimal-pad"
            value={fiExpensesDisplay}
            onChangeText={setFiExpensesInput}
          />
          {suggestedAnnualExpenses > 0 && (
            <TouchableOpacity
              style={styles.suggestionRow}
              onPress={() =>
                setFiExpensesInput(String(Math.round(suggestedAnnualExpenses * 100) / 100))
              }
            >
              <Text style={styles.suggestionText}>
                Based on your recurring Bills: {formatPeso(suggestedAnnualExpenses)}/yr — tap to use this
              </Text>
            </TouchableOpacity>
          )}

          {fiIncomeDisplay && (
            <View style={styles.suggestionRow}>
              <Text style={styles.suggestionText}>{fiIncomeDisplay}</Text>
            </View>
          )}

          <Text style={styles.inputLabel}>Current savings / investments</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor={colors.inkFaint}
            keyboardType="decimal-pad"
            value={fiSavingsDisplay}
            onChangeText={setFiSavingsInput}
            onBlur={handleSaveFi}
          />
          {suggestedNetWorth > 0 && (
            <TouchableOpacity
              style={styles.suggestionRow}
              onPress={() => {
                setFiSavingsInput(String(Math.round(suggestedNetWorth * 100) / 100));
                handleSaveFi();
              }}
            >
              <Text style={styles.suggestionText}>
                Based on your Cash, Debit &amp; Investment accounts: {formatPeso(suggestedNetWorth)} — tap to use this
              </Text>
            </TouchableOpacity>
          )}

          <Text style={styles.inputLabel}>Safe withdrawal rate</Text>
          <View style={styles.swrPillRow}>
            {FI_SWR_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset}
                style={[
                  styles.swrPillButton,
                  fiSwrDisplay === preset && !fiSwrCustomOpen ? styles.swrPillButtonActive : null,
                ]}
                onPress={() => {
        setFiSwrCustomOpen(false);
        setFiSwrInput(preset);
        handleSaveFi();
      }}
              >
                <Text
                  style={[
                    styles.swrPillButtonText,
                    fiSwrDisplay === preset && !fiSwrCustomOpen ? styles.swrPillButtonTextActive : null,
                  ]}
                >
                  {preset}%
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[
                styles.swrPillButton,
                fiSwrCustomOpen || !fiSwrIsPreset ? styles.swrPillButtonActive : null,
              ]}
              onPress={() => setFiSwrCustomOpen(true)}
            >
              <Text
                style={[
                  styles.swrPillButtonText,
                  fiSwrCustomOpen || !fiSwrIsPreset ? styles.swrPillButtonTextActive : null,
                ]}
              >
                Custom
              </Text>
            </TouchableOpacity>
          </View>
          {(fiSwrCustomOpen || !fiSwrIsPreset) && (
            <TextInput
              style={styles.input}
              placeholder="e.g. 3.8"
              placeholderTextColor={colors.inkFaint}
              keyboardType="decimal-pad"
              value={fiSwrDisplay}
              onChangeText={setFiSwrInput}
              onBlur={handleSaveFi}
            />
          )}

          <Text style={styles.inputLabel}>Expected annual return (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 6"
            placeholderTextColor={colors.inkFaint}
            keyboardType="decimal-pad"
            value={fiReturnDisplay}
            onChangeText={setFiReturnRateInput}
            onBlur={handleSaveFi}
          />

          <Text style={styles.inputLabel}>Monthly savings toward FI (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor={colors.inkFaint}
            keyboardType="decimal-pad"
            value={fiMonthlySavingsDisplay}
            onChangeText={setFiMonthlySavingsInput}
            onBlur={handleSaveFi}
          />
          {suggestedMonthlySavings > 0 && (
            <TouchableOpacity
              style={styles.suggestionRow}
              onPress={() => {
                setFiMonthlySavingsInput(String(Math.round(suggestedMonthlySavings * 100) / 100));
                handleSaveFi();
              }}
            >
              <Text style={styles.suggestionText}>
                Based on your income minus obligations: {formatPeso(suggestedMonthlySavings)}/mo — tap to use this
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>YOUR FI NUMBER</Text>
            <Text style={styles.resultAmount}>{fiNumber !== null ? formatPeso(fiNumber) : '—'}</Text>
            {fiProgressPct !== null && (
              <>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${fiProgressPct}%` as const }]} />
                </View>
                <Text style={styles.resultSub}>{fiProgressPct.toFixed(1)}% of the way there</Text>
              </>
            )}

            <Text style={styles.resultSecondaryLabel}>YEARS UNTIL FI</Text>
            {fiTimelineLabel !== null ? (
              <>
                <Text style={styles.resultSecondary}>
                  {fiTimelineLabel}
                  {fiShowDate && fiProjectedDateLabel ? ` (${fiProjectedDateLabel})` : ''}
                </Text>
                <TouchableOpacity style={styles.toggleLink} onPress={() => setFiShowDate((v) => !v)}>
                  <Text style={styles.toggleLinkText}>
                    {fiShowDate ? 'Hide projected date' : 'Show projected date'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.resultSub}>
                Enter an expected return rate and monthly savings above to see this
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.saveButton, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
            onPress={handleSaveFi}
          >
            {fiSaved && <Ionicons name="checkmark" size={16} color={colors.navy2} style={{ marginRight: 6 }} />}
            <Text style={styles.saveButtonText}>{fiSaved ? 'Saved' : 'Save'}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <BottomSheet
        visible={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Edit goal' : 'New goal'}
      >
        <Text style={styles.inputLabel}>Goal name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Emergency fund, New laptop"
                  placeholderTextColor={colors.inkFaint}
                  value={nameInput}
                  onChangeText={setNameInput}
                />

                <Text style={styles.inputLabel}>Target amount (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor={colors.inkFaint}
                  keyboardType="decimal-pad"
                  value={targetAmountInput}
                  onChangeText={setTargetAmountInput}
                />

                <DateField
                  label="Target date (optional)"
                  value={targetDateInput}
                  onChange={setTargetDateInput}
                  placeholder="2026-12-31"
                  clearable
                  testID="savings-target-date-field"
                />

                <Text style={styles.inputLabel}>Contributions logged</Text>
                {contribRows.length === 0 && (
                  <Text style={styles.fieldHint}>No contributions logged yet.</Text>
                )}
                {contribRows.map((row) => (
                  <View key={row.id} style={styles.contribRow}>
                    <DateField
                      style={styles.contribDateInput}
                      value={row.date}
                      onChange={(v) => updateContribDate(row.id, v)}
                      placeholder="YYYY-MM-DD"
                    />
                    <TextInput
                      style={[styles.input, styles.contribAmountInput]}
                      placeholder="0.00"
                      placeholderTextColor={colors.inkFaint}
                      keyboardType="decimal-pad"
                      value={row.amountInput}
                      onChangeText={(v) => updateContribAmount(row.id, v)}
                    />
                    <TouchableOpacity
                      style={styles.contribRemoveButton}
                      onPress={() => removeContribRow(row.id)}
                    >
                      <Ionicons name="close" size={16} color={colors.inkDim} />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={styles.addContribButton} onPress={addContribRow}>
                  <Text style={styles.addContribButtonText}>+ Add contribution</Text>
                </TouchableOpacity>

                {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

                <TouchableOpacity style={styles.saveButton} onPress={handleSaveGoal}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>

                {editingId && (
                  <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteGoal}>
                    <Text style={styles.deleteButtonText}>Delete this goal</Text>
                  </TouchableOpacity>
                )}

        <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </BottomSheet>
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.navy2 },
    loadingContainer: { alignItems: 'center', justifyContent: 'center' },
    scrollContent: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 40 },
    pillRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 4,
      backgroundColor: colors.navy2,
    },
    pillButton: {
      flex: 1,
      backgroundColor: colors.navy3,
      borderRadius: 999,
      paddingVertical: 9,
      alignItems: 'center',
    },
    pillButtonActive: { backgroundColor: colors.gold },
    pillButtonText: { fontSize: 11.5, fontWeight: '600', color: colors.inkDim },
    pillButtonTextActive: { color: colors.navy2 },
    balanceBanner: {
      backgroundColor: colors.navy3,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    balanceBannerLabel: { fontSize: 10, letterSpacing: 1, color: colors.inkDim, marginBottom: 4 },
    balanceBannerAmount: { fontSize: 22, fontWeight: '700', color: colors.ink },
    emptyText: { fontSize: 12, color: colors.inkFaint, marginBottom: 12, fontStyle: 'italic' },
    goalCollapsedWrap: {},
    detailContainer: { gap: 8 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    detailLabel: { fontSize: 12, color: colors.inkDim },
    detailValue: { fontSize: 12.5, fontWeight: '600', color: colors.ink, flexShrink: 1, textAlign: 'right' },
    goalRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    goalRowMain: { flex: 1, marginRight: 10 },
    goalName: { fontSize: 14, fontWeight: '600', color: colors.ink },
    goalSub: { fontSize: 11.5, color: colors.inkDim, marginTop: 2 },
    goalAmount: { fontSize: 14, fontWeight: '600', color: colors.ink },
    progressTrack: {
      height: 6,
      borderRadius: 999,
      backgroundColor: colors.navy2,
      overflow: 'hidden',
      marginTop: 10,
    },
    progressFill: { height: 6, borderRadius: 999, backgroundColor: colors.gold },
    addButton: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 4, marginTop: 4 },
    addButtonText: { fontSize: 13, fontWeight: '600', color: colors.gold },
    calcIntro: { fontSize: 12.5, color: colors.inkDim, lineHeight: 18, marginBottom: 18 },
    inputLabel: {
      fontSize: 11,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: colors.inkDim,
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.navy3,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.ink,
      marginBottom: 14,
    },
    suggestionRow: { marginTop: -6, marginBottom: 14 },
    suggestionText: { fontSize: 11.5, color: colors.gold, fontStyle: 'italic' },
    fieldHint: { fontSize: 11, color: colors.inkFaint, marginBottom: 10, lineHeight: 15 },
    resultCard: {
      backgroundColor: colors.navy3,
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 16,
      alignItems: 'center',
      marginTop: 4,
      marginBottom: 18,
    },
    resultLabel: { fontSize: 10, letterSpacing: 1, color: colors.inkDim, marginBottom: 6 },
    resultAmount: { fontSize: 22, fontWeight: '700', color: colors.ink },
    resultSub: { fontSize: 11.5, color: colors.inkDim, marginTop: 8 },
    saveButton: {
      backgroundColor: colors.gold,
      borderRadius: 999,
      paddingVertical: 12,
      alignItems: 'center',
      marginBottom: 10,
    },
    saveButtonText: { fontSize: 14, fontWeight: '700', color: colors.navy2 },
swrPillRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
swrPillButton: {
  flex: 1,
  backgroundColor: colors.navy3,
  borderRadius: 999,
  paddingVertical: 8,
  alignItems: 'center',
},
swrPillButtonActive: { backgroundColor: colors.gold },
swrPillButtonText: { fontSize: 11, fontWeight: '600', color: colors.inkDim },
swrPillButtonTextActive: { color: colors.navy2 },
resultSecondaryLabel: { fontSize: 10, letterSpacing: 1, color: colors.inkDim, marginTop: 14, marginBottom: 4 },
resultSecondary: { fontSize: 15, fontWeight: '700', color: colors.ink },
toggleLink: { alignSelf: 'center', marginTop: 8 },
toggleLinkText: { fontSize: 11, color: colors.gold, fontWeight: '600' },
    deleteButton: { alignItems: 'center', paddingVertical: 10, marginBottom: 4 },
    deleteButtonText: { fontSize: 13, color: '#e5484d', fontWeight: '600' },
    cancelButton: { alignItems: 'center', paddingVertical: 8 },
    cancelButtonText: { fontSize: 13, color: colors.inkDim },
    errorText: { fontSize: 12, color: '#e5484d', marginBottom: 10 },
    contribRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    contribDateInput: { flex: 1.3 },
    contribAmountInput: { flex: 1 },
    contribRemoveButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.navy2,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    contribRemoveButtonText: { fontSize: 14, color: colors.inkDim },
    addContribButton: { alignSelf: 'flex-start', paddingVertical: 8, marginBottom: 6, marginTop: -4 },
    addContribButtonText: { fontSize: 12.5, fontWeight: '600', color: colors.gold },
  });
}
