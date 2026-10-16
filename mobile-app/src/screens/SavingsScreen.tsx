import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from '../components/BottomSheet';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { PullToRefreshScrollView } from '../PullToRefreshScrollView';
import { formatPeso, computeMonthlyObligationsBaseline } from '../balanceProjection';
import type { SavingsGoal, SavingsContribution, HouseholdModel, IncomeSource, CalculatorInputs } from '../types';
import SwipeableRow from '../components/SwipeableRow';
import { makeId } from '../utils';
import DateField from '../components/DateField';
import SegmentedControl from '../components/SegmentedControl';
import SavingsFiComparisonModal from './SavingsFiComparisonModal';
import { hapticLight } from '../haptics';
import Button from '../components/Button';
import AmountInput from '../components/AmountInput';
import GradientFill from '../components/GradientFill';
import { potTarget, isEmergencyPot, monthsCovered, addedThisMonth, efTargetMonths } from '../savingsPots';
import { useStickyState } from '../stickyState';

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



type ContribRow = { id: string; date: string; amountInput: string };

type PillTab = 'goals' | 'ef' | 'fi';

type SavingsScreenProps = {
  openSavingsId?: string;
  openSavingsNonce?: number;
};

export default function SavingsScreen({ openSavingsId, openSavingsNonce }: SavingsScreenProps = {}) {
  const { colors } = useTheme();
  const { model, saveModel } = useData();

  const openedSavingsRef = useRef<{ id: string; nonce?: number } | undefined>(undefined);
  useEffect(() => {
    if (!model || !openSavingsId) return;
    const prev = openedSavingsRef.current;
    if (prev && prev.id === openSavingsId && prev.nonce === openSavingsNonce) return;
    const target = (model.savingsGoals || []).find((g) => g.id === openSavingsId);
    if (target) {
      openedSavingsRef.current = { id: openSavingsId, nonce: openSavingsNonce };
      openEditModal(target);
    }
  }, [model, openSavingsId, openSavingsNonce]);
  const styles = makeStyles(colors);
  const navigation = useNavigation<any>();

  const [activeTab, setActiveTab] = useStickyState<PillTab>('savings.tab', 'goals');

  // Redesign: one sheet edits any Emergency / FI value.
  type EditField = { key: keyof CalculatorInputs; title: string; kind: 'peso' | 'pct' | 'months'; hint?: string; value: number; suggest?: { label: string; value: number } };
  const [editField, setEditField] = useState<EditField | null>(null);
  const [editVal, setEditVal] = useState<number | ''>('');
  function openEdit(f: EditField) {
    setEditVal(isNaN(f.value) ? '' : f.value);
    setEditField(f);
  }
  async function saveEdit() {
    if (!editField || !model) return;
    hapticLight();
    await saveModel({ ...model, calculatorInputs: { ...calcInputsFromModel(), [editField.key]: editVal } as CalculatorInputs });
    setEditField(null);
  }

  // Redesign: Add in the top bar starts a new pot (the mockup's "Add a savings pot").
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={openAddModal} accessibilityRole="button" accessibilityLabel="Add a savings pot" testID="savings-add-pot" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.gold }}>Add</Text>
        </TouchableOpacity>
      ),
    });
  });

  // ---- Goal add/edit modal state ----
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [targetAmountInput, setTargetAmountInput] = useState('');
  const [targetDateInput, setTargetDateInput] = useState('');
  const [contribRows, setContribRows] = useState<ContribRow[]>([]);
  const [errorMsg, setErrorMsg] = useState('');


  // ---- Emergency Fund calculator local state ----
  const [efExpensesInput, setEfExpensesInput] = useState<string | null>(null);
  const [efSavingsInput, setEfSavingsInput] = useState<string | null>(null);

  // ---- FI calculator local state ----
  const [fiExpensesInput, setFiExpensesInput] = useState<string | null>(null);
  const [fiGuaranteedIncomeInput, setFiGuaranteedIncomeInput] = useState<string | null>(null);
  const [fiSavingsInput, setFiSavingsInput] = useState<string | null>(null);
  const [fiSaved, setFiSaved] = useState(false);
  const [fiSwrInput, setFiSwrInput] = useState<string | null>(null);
  const [fiReturnRateInput, setFiReturnRateInput] = useState<string | null>(null);
  const [fiMonthlySavingsInput, setFiMonthlySavingsInput] = useState<string | null>(null);
  const [fiAccountPickerOpen, setFiAccountPickerOpen] = useState(false);
  const [fiCompareOpen, setFiCompareOpen] = useState(false);
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
    return {
      efMonthlyExpenses: '' as const,
      efCurrentSavings: '' as const,
      fiAnnualExpenses: '' as const,
      fiGuaranteedAnnualIncome: '' as const,
      fiCurrentSavings: '' as const,
      fiWithdrawalRatePct: '' as const,
      fiExpectedReturnPct: '' as const,
      fiMonthlySavings: '' as const,
      fiSelectedAccountIds: [] as string[],
      ...(model!.calculatorInputs || {}),
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
      setErrorMsg('Enter a goal name.');
      return;
    }
    let parsedTarget: number | '' = '';
    if (targetAmountInput.trim() !== '') {
      const n = parseFloat(targetAmountInput);
      if (isNaN(n)) {
        setErrorMsg('Enter a valid target amount.');
        return;
      }
      parsedTarget = n;
    }
    const trimmedDate = targetDateInput.trim();
    if (trimmedDate && !/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
      setErrorMsg('Target date must be YYYY-MM-DD, e.g. 2026-12-31.');
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
        setErrorMsg('Contribution date must be YYYY-MM-DD, e.g. 2026-08-20.');
        return;
      }
      let amount: number | '' = '';
      if (amountTrimmed !== '') {
        const n = parseFloat(amountTrimmed);
        if (isNaN(n)) {
          setErrorMsg('Enter a valid contribution amount.');
          return;
        }
        amount = n;
      }
      // Keep anything else stored on the contribution (account, added on payday).
      const orig = editingId ? model.savingsGoals.find((g) => g.id === editingId)?.contributions.find((c) => c.id === row.id) : undefined;
      contributions.push({ ...(orig || {}), id: row.id, date: dateTrimmed, amount });
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
      'Delete savings goal?',
      'Permanently delete this goal and all logged contributions? This cannot be undone.',
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
      'Delete savings goal?',
      'Permanently delete this goal and all logged contributions? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => performDeleteGoalById(goal.id) },
      ]
    );
  }


  async function handleSaveFi(overrides?: {
    expenses?: string;
    guaranteedIncome?: string;
    savings?: string;
    swr?: string;
    returnRate?: string;
    monthlySavings?: string;
    selectedAccountIds?: string[];
  }) {
    if (!model) return;
    const current = calcInputsFromModel();
    const expensesRaw = (overrides?.expenses ?? fiExpensesInput ?? fiExpensesDisplay).trim();
    const guaranteedIncomeRaw = (
      overrides?.guaranteedIncome ?? fiGuaranteedIncomeInput ?? fiGuaranteedIncomeDisplay
    ).trim();
    const savingsRaw = (overrides?.savings ?? fiSavingsInput ?? fiSavingsDisplay).trim();
    const swrRaw = (overrides?.swr ?? fiSwrInput ?? fiSwrDisplay).trim();
    const returnRaw = (overrides?.returnRate ?? fiReturnRateInput ?? fiReturnDisplay).trim();
    const monthlySavingsRaw = (overrides?.monthlySavings ?? fiMonthlySavingsInput ?? fiMonthlySavingsDisplay).trim();
    const expenses = expensesRaw === '' ? '' : parseFloat(expensesRaw);
    const guaranteedIncome = guaranteedIncomeRaw === '' ? '' : parseFloat(guaranteedIncomeRaw);
    const savings = savingsRaw === '' ? '' : parseFloat(savingsRaw);
    const swr = swrRaw === '' ? '' : parseFloat(swrRaw);
    const returnRate = returnRaw === '' ? '' : parseFloat(returnRaw);
    const monthlySavings = monthlySavingsRaw === '' ? '' : parseFloat(monthlySavingsRaw);
    if (expenses !== '' && isNaN(expenses as number)) return;
    if (guaranteedIncome !== '' && isNaN(guaranteedIncome as number)) return;
    if (savings !== '' && isNaN(savings as number)) return;
    if (swr !== '' && isNaN(swr as number)) return;
    if (returnRate !== '' && isNaN(returnRate as number)) return;
    if (monthlySavings !== '' && isNaN(monthlySavings as number)) return;
    const updated: HouseholdModel = {
      ...model,
      calculatorInputs: {
        ...current,
        fiAnnualExpenses: expenses as number | '',
        fiGuaranteedAnnualIncome: guaranteedIncome as number | '',
        fiCurrentSavings: savings as number | '',
        fiWithdrawalRatePct: swr as number | '',
        fiExpectedReturnPct: returnRate as number | '',
        fiMonthlySavings: monthlySavings as number | '',
        fiSelectedAccountIds: overrides?.selectedAccountIds ?? current.fiSelectedAccountIds,
      },
    };
    await saveModel(updated);
    setFiSaved(true);
    setTimeout(() => setFiSaved(false), 1800);
  }

  function toggleFiAccountSelection(accountId: string) {
    const current = calcInputsFromModel().fiSelectedAccountIds;
    const base = current.length > 0 ? current : fiAllAccounts.map((a) => a.id);
    const next = base.includes(accountId)
      ? base.filter((id) => id !== accountId)
      : [...base, accountId];
    handleSaveFi({ selectedAccountIds: next });
  }

  const goals = sortGoals(model.savingsGoals);
  const totalSaved = goals.reduce((sum, g) => sum + contributionsTotal(g), 0);
  const thisMonth = addedThisMonth(model);

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


  const efExpensesNum = parseFloat(efExpensesDisplay);
  const efSavingsNum = parseFloat(efSavingsDisplay);

  const fiExpensesNum = parseFloat(fiExpensesDisplay);
  const fiGuaranteedIncomeDisplay =
    fiGuaranteedIncomeInput !== null
      ? fiGuaranteedIncomeInput
      : storedCalc.fiGuaranteedAnnualIncome === '' ? '' : String(storedCalc.fiGuaranteedAnnualIncome);
  const fiGuaranteedIncomeNum = parseFloat(fiGuaranteedIncomeDisplay);
  const fiSavingsNum = fiSavingsDisplay.trim() === '' ? 0 : parseFloat(fiSavingsDisplay);

  const fiSwrDisplay =
    fiSwrInput !== null
      ? fiSwrInput
      : storedCalc.fiWithdrawalRatePct === '' ? '4.0' : String(storedCalc.fiWithdrawalRatePct);
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

  const fiAllAccounts: { id: string; name: string; amount: number | ''; group: string }[] = [
    ...(model.balanceAccounts?.cash || []).map((a) => ({ ...a, group: 'Cash' })),
    ...(model.balanceAccounts?.debit || []).map((a) => ({ ...a, group: 'Debit' })),
    ...(model.balanceAccounts?.investment || []).map((a) => ({ ...a, group: 'Investment' })),
  ];
  const fiSelectedAccountIds =
    calcInputsFromModel().fiSelectedAccountIds.length > 0
      ? calcInputsFromModel().fiSelectedAccountIds
      : fiAllAccounts.map((a) => a.id);
  const suggestedNetWorth = fiAllAccounts
    .filter((a) => fiSelectedAccountIds.includes(a.id))
    .reduce((sum, a) => sum + (typeof a.amount === 'number' ? a.amount : 0), 0);

  const fiNetAnnualExpenses = !isNaN(fiExpensesNum)
    ? Math.max(0, fiExpensesNum - (isNaN(fiGuaranteedIncomeNum) ? 0 : fiGuaranteedIncomeNum))
    : NaN;
  const fiNumber =
    !isNaN(fiNetAnnualExpenses) && fiNetAnnualExpenses > 0 ? fiNetAnnualExpenses / (fiSwrForMath / 100) : null;

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


  // Redesign: Emergency tab. Saved so far comes from the Emergency Fund pot when there is one.
  const efPot = goals.find(isEmergencyPot);
  const efSavedNow = efPot ? contributionsTotal(efPot) : isNaN(efSavingsNum) ? 0 : efSavingsNum;
  const efTarget = efTargetMonths(model);
  const efMonths = efExpensesNum > 0 ? efSavedNow / efExpensesNum : null;
  const efToGo = efExpensesNum > 0 ? Math.max(0, efTarget * efExpensesNum - efSavedNow) : 0;

  // One tappable row in the Emergency / FI lists.
  const calcRow = (label: string, value: string, valueColor: string | undefined, onPress: () => void, divider = false) => (
    <TouchableOpacity style={[styles.calcRow, divider && styles.potDivider]} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}${value ? ', ' + value : ''}`}>
      <Text style={styles.calcRowLabel}>{label}</Text>
      {!!value && <Text style={[styles.calcRowValue, valueColor ? { color: valueColor } : null]}>{value}</Text>}
      <Ionicons name="chevron-forward" size={16} color={colors.inkDim} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.pillRow}>
        <SegmentedControl<PillTab>
          accessibilityLabel="Savings view"
          options={[
            { id: 'goals', label: 'Pots' },
            { id: 'ef', label: 'Emergency' },
            { id: 'fi', label: 'FI' },
          ]}
          value={activeTab}
          onChange={setActiveTab}
        />
      </View>

      {activeTab === 'goals' && (
        <PullToRefreshScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.summaryCard}>
            <GradientFill match={styles.summaryCard} />
            <Text style={styles.balanceBannerLabel}>Set aside in total</Text>
            <Text style={[styles.potsTotal, { color: colors.saving }]}>{formatPeso(totalSaved)}</Text>
            {thisMonth !== 0 && (
              <Text style={[styles.potsThisMonth, { color: colors.saving }]}>
                {thisMonth > 0 ? '+' : '−'}
                {formatPeso(Math.abs(thisMonth))} this month
              </Text>
            )}
          </View>

          {goals.length === 0 ? (
            <Text style={styles.emptyText}>No pots yet. Tap Add to start one, like an emergency fund or a trip.</Text>
          ) : (
            <>
              <Text style={styles.potsHeader}>Pots</Text>
              <View style={styles.listGroup}>
                <GradientFill match={styles.listGroup} />
                {goals.map((goal, rowIndex) => {
                  const saved = contributionsTotal(goal);
                  const target = potTarget(goal, model);
                  const pct = target > 0 ? Math.min(100, Math.max(0, (saved / target) * 100)) : 0;
                  const covered = isEmergencyPot(goal) ? monthsCovered(goal, model) : null;
                  const subParts: string[] = [];
                  if (target > 0) subParts.push('of ' + formatPeso(target));
                  if (covered !== null) subParts.push(covered.toFixed(1) + ' months covered');
                  else if (goal.targetDate) subParts.push('by ' + formatShortDateLabel(goal.targetDate));
                  else if (target > 0) subParts.push('no date');
                  return (
                    <SwipeableRow
                      key={goal.id}
                      enabled={Boolean(model.settings.swipeToDeleteEnabled)}
                      onDelete={() => handleSwipeDelete(goal)}
                      testID={`goal-swipe-${goal.id}`}
                      flat
                    >
                      <TouchableOpacity
                        testID={`goal-row-${goal.id}`}
                        style={[styles.potRow, rowIndex > 0 && styles.potDivider]}
                        onPress={() => navigation.navigate('PotDetail', { id: goal.id })}
                        accessibilityRole="button"
                        accessibilityLabel={`${goal.name || 'Untitled pot'}, ${formatPeso(saved)} saved`}
                      >
                        <View style={styles.goalRowTop}>
                          <Text style={[styles.goalName, { flex: 1, marginRight: 8 }]} numberOfLines={1}>
                            {goal.name || 'Untitled pot'}
                          </Text>
                          <Text style={[styles.potAmount, { color: colors.saving }]}>{formatPeso(saved)}</Text>
                        </View>
                        {subParts.length > 0 && <Text style={styles.goalSub} numberOfLines={1}>{subParts.join(' · ')}</Text>}
                        {target > 0 && (
                          <View style={styles.progressTrack}>
                            <View style={[styles.progressFill, { width: `${pct}%` as const }]} />
                          </View>
                        )}
                      </TouchableOpacity>
                    </SwipeableRow>
                  );
                })}
              </View>
              <Text style={styles.potsFooter}>Tap a pot to add money or see its history. Add savings here rather than with + on Home, so the money isn't counted twice.</Text>
            </>
          )}
        </PullToRefreshScrollView>
      )}

      {activeTab === 'ef' && (
        <PullToRefreshScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.summaryCard, { alignItems: 'center', paddingVertical: 18 }]}>
            <GradientFill match={styles.summaryCard} />
            <Text style={styles.balanceBannerLabel}>Your emergency fund covers</Text>
            <Text style={styles.potsTotal}>{efMonths !== null ? `${efMonths.toFixed(1)} months` : '—'}</Text>
            <Text style={styles.calcSub}>
              {efMonths === null
                ? 'Add your essential expenses below'
                : efToGo > 0
                  ? `Aim for ${efTarget} months · ${formatPeso(efToGo)} to go`
                  : `You've reached ${efTarget} months`}
            </Text>
            {efMonths !== null && (
              <View style={[styles.progressTrack, { alignSelf: 'stretch', marginTop: 14 }]}>
                <View style={[styles.progressFill, { width: `${Math.min(100, (efMonths / efTarget) * 100)}%` as const }]} />
              </View>
            )}
          </View>
          <View style={styles.listGroup}>
            <GradientFill match={styles.listGroup} />
            {calcRow('Essential expenses', efExpensesNum > 0 ? `${formatPeso(efExpensesNum)} / mo` : 'Not set', colors.error, () =>
              openEdit({ key: 'efMonthlyExpenses', title: 'Essential expenses', kind: 'peso', hint: 'What you need each month for the basics', value: efExpensesNum, suggest: suggestedMonthlyExpenses > 0 ? { label: `From your bills: ${formatPeso(suggestedMonthlyExpenses)}/mo`, value: Math.round(suggestedMonthlyExpenses * 100) / 100 } : undefined })
            )}
            {calcRow('Saved so far', formatPeso(efSavedNow), colors.saving, () =>
              efPot ? navigation.navigate('PotDetail', { id: efPot.id }) : openEdit({ key: 'efCurrentSavings', title: 'Saved so far', kind: 'peso', hint: 'Start an "Emergency Fund" pot to track this automatically', value: efSavingsNum }),
              true
            )}
            {calcRow('Target', `${efTarget} months`, undefined, () => openEdit({ key: 'efTargetMonths', title: 'Target', kind: 'months', value: efTarget }), true)}
          </View>
          <Text style={styles.potsFooter}>
            {efPot ? 'Saved so far comes from your Emergency Fund pot. ' : ''}Essential expenses are suggested from your bills. Tap to change.
          </Text>
        </PullToRefreshScrollView>
      )}

      {activeTab === 'fi' && (
        <PullToRefreshScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.summaryCard, { alignItems: 'center', paddingVertical: 18 }]}>
            <GradientFill match={styles.summaryCard} />
            <Text style={styles.balanceBannerLabel}>{fiMonthsUntilFi === 0 ? 'You could be' : 'Financially independent in about'}</Text>
            <Text style={styles.potsTotal}>
              {fiMonthsUntilFi === null ? '—' : fiMonthsUntilFi === 0 ? 'there now' : fiMonthsUntilFi >= 12 ? `${Math.round(fiMonthsUntilFi / 12)} years` : `${fiMonthsUntilFi} months`}
            </Text>
            <Text style={styles.calcSub}>
              {fiNumber !== null ? `You'd need ${formatPeso(Math.round(fiNumber))} invested` : 'Fill in the rows below to see your estimate'}
            </Text>
          </View>
          <View style={styles.listGroup}>
            <GradientFill match={styles.listGroup} />
            {calcRow('Yearly expenses', !isNaN(fiExpensesNum) ? formatPeso(fiExpensesNum) : 'Not set', colors.error, () =>
              openEdit({ key: 'fiAnnualExpenses', title: 'Yearly expenses', kind: 'peso', value: fiExpensesNum, suggest: suggestedAnnualExpenses > 0 ? { label: `From your bills: ${formatPeso(suggestedAnnualExpenses)}/yr`, value: Math.round(suggestedAnnualExpenses * 100) / 100 } : undefined })
            )}
            {calcRow('Pension or other income', !isNaN(fiGuaranteedIncomeNum) && fiGuaranteedIncomeNum > 0 ? `${formatPeso(fiGuaranteedIncomeNum)} / yr` : 'None', undefined, () =>
              openEdit({ key: 'fiGuaranteedAnnualIncome', title: 'Pension or other income', kind: 'peso', hint: 'Yearly income you\'ll get without working (optional)', value: fiGuaranteedIncomeNum }),
              true
            )}
            {calcRow('Invested now', formatPeso(isNaN(fiSavingsNum) ? 0 : fiSavingsNum), colors.saving, () =>
              openEdit({ key: 'fiCurrentSavings', title: 'Invested now', kind: 'peso', value: fiSavingsNum, suggest: suggestedNetWorth > 0 ? { label: `Your chosen accounts: ${formatPeso(suggestedNetWorth)}`, value: Math.round(suggestedNetWorth * 100) / 100 } : undefined }),
              true
            )}
            {calcRow('Saving each month', !isNaN(fiMonthlySavingsNum) ? formatPeso(fiMonthlySavingsNum) : 'Not set', colors.saving, () =>
              openEdit({ key: 'fiMonthlySavings', title: 'Saving each month', kind: 'peso', value: fiMonthlySavingsNum, suggest: suggestedMonthlySavings > 0 ? { label: `Income minus bills: ${formatPeso(suggestedMonthlySavings)}/mo`, value: Math.round(suggestedMonthlySavings * 100) / 100 } : undefined }),
              true
            )}
            {calcRow('Expected return', !isNaN(fiReturnNum) ? `${fiReturnNum}% a year` : 'Not set', undefined, () =>
              openEdit({ key: 'fiExpectedReturnPct', title: 'Expected return', kind: 'pct', hint: 'Average yearly growth of your investments', value: fiReturnNum }),
              true
            )}
            {calcRow('Safe withdrawal rate', `${fiSwrForMath}%`, undefined, () =>
              openEdit({ key: 'fiWithdrawalRatePct', title: 'Safe withdrawal rate', kind: 'pct', hint: 'How much you take out each year. 4% is the usual rule of thumb.', value: fiSwrForMath }),
              true
            )}
          </View>
          <Text style={styles.potsFooter}>An estimate, not advice.</Text>
          <View style={styles.listGroup}>
            <GradientFill match={styles.listGroup} />
            {calcRow('Accounts counted', `${fiSelectedAccountIds.length} of ${fiAllAccounts.length}`, undefined, () => setFiAccountPickerOpen(true))}
            {calcRow('Compare scenarios', '', undefined, () => setFiCompareOpen(true), true)}
          </View>
        </PullToRefreshScrollView>
      )}

      <BottomSheet
        visible={editField !== null}
        onClose={() => setEditField(null)}
        header={
          <View style={styles.sheetBar}>
            <TouchableOpacity onPress={() => setEditField(null)} accessibilityRole="button" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.sheetBarBtn}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.sheetBarTitle}>{editField?.title}</Text>
            <TouchableOpacity onPress={saveEdit} accessibilityRole="button" testID="calc-edit-done" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.sheetBarBtn, { fontWeight: '700' }]}>Done</Text>
            </TouchableOpacity>
          </View>
        }
      >
        <View style={{ paddingHorizontal: 16, paddingBottom: 24, gap: 12 }}>
          {!!editField?.hint && <Text style={styles.calcSub}>{editField.hint}</Text>}
          {editField?.kind === 'months' ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[3, 6, 9, 12].map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setEditVal(m)}
                  style={[styles.monthChip, editVal === m && { backgroundColor: colors.buttonFill }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: editVal === m }}
                >
                  <GradientFill match={[styles.monthChip, editVal === m && { backgroundColor: colors.buttonFill }]} />
                  <Text style={{ fontSize: 17, fontWeight: '600', color: editVal === m ? colors.onButton : colors.ink }}>{m} months</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <AmountInput
              autoFocus
              value={editVal}
              onChangeAmount={setEditVal}
              prefix={editField?.kind === 'pct' ? null : undefined}
              suffix={editField?.kind === 'pct' ? '%' : undefined}
              placeholder="0"
            />
          )}
          {!!editField?.suggest && (
            <TouchableOpacity onPress={() => setEditVal(editField.suggest!.value)} accessibilityRole="button">
              <Text style={styles.suggestionText}>{editField.suggest.label} — tap to use</Text>
            </TouchableOpacity>
          )}
        </View>
      </BottomSheet>

      <BottomSheet
        visible={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Edit savings' : 'Save'}
      >
        <Text style={styles.inputLabel}>Title</Text>
                <TextInput
                  autoFocus={!editingId}
                  style={styles.input}
                  placeholder="e.g. Emergency fund, New laptop"
                  placeholderTextColor={colors.inkFaint}
                  value={nameInput}
                  onChangeText={setNameInput}
                />

                <Text style={styles.inputLabel}>Target amount (optional)</Text>
                <AmountInput
                  value={targetAmountInput === '' ? '' : parseFloat(targetAmountInput)}
                  onChangeAmount={(v) => setTargetAmountInput(v === '' ? '' : String(v))}
                />

                <DateField
                  label="Target date (optional)"
                  value={targetDateInput}
                  onChange={setTargetDateInput}
                  placeholder="2026-12-31"
                  clearable
                  testID="savings-target-date-field"
                />

                <Text style={styles.inputLabel}>Contributions</Text>
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
                    <AmountInput
                      style={styles.contribAmountInput}
                      value={row.amountInput === '' ? '' : parseFloat(row.amountInput)}
                      onChangeAmount={(v) => updateContribAmount(row.id, v === '' ? '' : String(v))}
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

                <Button label="Save" onPress={handleSaveGoal} />

                {editingId && <Button label="Delete goal" variant="destructive" onPress={handleDeleteGoal} />}

                <Button label="Cancel" variant="quiet" onPress={closeModal} />
      </BottomSheet>

      <BottomSheet
        visible={fiAccountPickerOpen}
        onClose={() => setFiAccountPickerOpen(false)}
        title="Choose accounts"
      >
        <Text style={styles.fieldHint}>
          Pick which accounts count toward the "current savings" suggestion above. Leave all
          selected to include everything, same as before.
        </Text>
        {fiAllAccounts.map((account) => {
          const checked = fiSelectedAccountIds.includes(account.id);
          return (
            <TouchableOpacity
              key={account.id}
              style={styles.accountPickerRow}
              onPress={() => toggleFiAccountSelection(account.id)}
            >
              <View style={styles.accountPickerRowLeft}>
                <Text style={styles.accountPickerRowName}>{account.name || 'Untitled account'}</Text>
                <Text style={styles.accountPickerRowGroup}>{account.group}</Text>
              </View>
              <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                <GradientFill match={[styles.checkbox, checked && styles.checkboxChecked]} />
                {checked && <Ionicons name="checkmark" size={14} color={colors.navy2} />}
              </View>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity style={styles.cancelButton} onPress={() => setFiAccountPickerOpen(false)}>
          <Text style={styles.cancelButtonText}>Done</Text>
        </TouchableOpacity>
      </BottomSheet>

      <SavingsFiComparisonModal
        visible={fiCompareOpen}
        onClose={() => setFiCompareOpen(false)}
        colors={colors}
        baseInputs={{
          annualExpenses: fiExpensesNum,
          guaranteedAnnualIncome: fiGuaranteedIncomeNum,
          currentSavings: fiSavingsNum,
          swrPct: fiSwrForMath,
          expectedReturnPct: fiReturnNum,
          monthlySavings: fiMonthlySavingsNum,
        }}
      />
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    loadingContainer: { alignItems: 'center', justifyContent: 'center' },
    scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
    // Redesign styles
    listGroup: { backgroundColor: colors.navy3, borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
    summaryCard: { backgroundColor: colors.navy3, borderRadius: 12, padding: 16, marginBottom: 20 },
    potsTotal: { fontSize: 34, lineHeight: 40, fontWeight: '700' },
    potsThisMonth: { fontSize: 15, marginTop: 2 },
    potsHeader: { fontSize: 13, fontWeight: '600', color: colors.inkDim, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6, marginHorizontal: 16 },
    potsFooter: { fontSize: 13, color: colors.inkDim, marginTop: -6, marginBottom: 12, marginHorizontal: 16 },
    potRow: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'transparent' },
    potDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    potAmount: { fontSize: 17, fontWeight: '600' },
    calcSub: { fontSize: 15, color: colors.inkDim, marginTop: 2, textAlign: 'center' },
    calcRow: { flexDirection: 'row', alignItems: 'center', minHeight: 50, paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
    calcRowLabel: { flex: 1, fontSize: 17, color: colors.ink },
    calcRowValue: { fontSize: 17, color: colors.inkDim },
    monthChip: { flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navy3 },
    sheetBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 2, paddingBottom: 12 },
    sheetBarBtn: { fontSize: 17, color: colors.gold },
    sheetBarTitle: { fontSize: 17, fontWeight: '600', color: colors.ink },

    pillRow: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 4,
      backgroundColor: colors.navy2,
    },
    balanceBannerLabel: { fontSize: 13, color: colors.inkDim, marginBottom: 2 },
    emptyText: { fontSize: 15, color: colors.inkDim, marginBottom: 12, textAlign: 'center' },
    goalRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    goalName: { fontSize: 17, fontWeight: '500', color: colors.ink },
    goalSub: { fontSize: 13, color: colors.inkDim, marginTop: 1 },
    progressTrack: {
      height: 6,
      borderRadius: 999,
      backgroundColor: colors.navy2,
      overflow: 'hidden',
      marginTop: 10,
    },
    progressFill: { height: 6, borderRadius: 999, backgroundColor: colors.saving },
    inputLabel: {
      // Redesign: sentence-case grey labels, like iPhone forms.
      fontSize: 13,
      fontWeight: '600',
      marginLeft: 4,
      color: colors.inkDim,
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.navy3,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      minHeight: 48,
      fontSize: 17,
      color: colors.ink,
      marginBottom: 14,
    },
    suggestionText: { fontSize: 15, color: colors.gold },
    fieldHint: { fontSize: 13, color: colors.inkFaint, marginBottom: 10, lineHeight: 15 },
    cancelButton: { alignItems: 'center', paddingVertical: 8 },
    cancelButtonText: { fontSize: 13, color: colors.inkDim },
    errorText: { fontSize: 13, color: colors.error, marginBottom: 10 },
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
    addContribButton: { alignSelf: 'flex-start', paddingVertical: 8, marginBottom: 6, marginTop: -4 },
    addContribButtonText: { fontSize: 15, fontWeight: '600', color: colors.gold },
    accountPickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.navy4,
    },
    accountPickerRowLeft: { flex: 1, marginRight: 10 },
    accountPickerRowName: { fontSize: 15, color: colors.ink },
    accountPickerRowGroup: { fontSize: 13, color: colors.inkDim, marginTop: 2 },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: colors.inkFaint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: { backgroundColor: colors.buttonFill, borderColor: colors.gold },
  });
}
