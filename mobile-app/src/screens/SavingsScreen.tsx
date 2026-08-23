import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { formatPeso } from '../balanceProjection';
import type { SavingsGoal, SavingsContribution, HouseholdModel } from '../types';

function makeId(prefix: string): string {
  return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

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

  // ---- Emergency Fund calculator local state ----
  const [efExpensesInput, setEfExpensesInput] = useState('');
  const [efSavingsInput, setEfSavingsInput] = useState('');
  const [efSaved, setEfSaved] = useState(false);

  // ---- FI calculator local state ----
  const [fiExpensesInput, setFiExpensesInput] = useState('');
  const [fiSavingsInput, setFiSavingsInput] = useState('');
  const [fiSaved, setFiSaved] = useState(false);

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

    await saveModel(updated);
    closeModal();
  }

  async function handleDeleteGoal() {
    if (!editingId || !model) return;
    const updated: HouseholdModel = {
      ...model,
      savingsGoals: model.savingsGoals.filter((g) => g.id !== editingId),
    };
    await saveModel(updated);
    closeModal();
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
    const expenses = fiExpensesInput.trim() === '' ? '' : parseFloat(fiExpensesInput);
    const savings = fiSavingsInput.trim() === '' ? '' : parseFloat(fiSavingsInput);
    if (expenses !== '' && isNaN(expenses as number)) return;
    if (savings !== '' && isNaN(savings as number)) return;
    const updated: HouseholdModel = {
      ...model,
      calculatorInputs: {
        ...current,
        fiAnnualExpenses: expenses as number | '',
        fiCurrentSavings: savings as number | '',
      },
    };
    await saveModel(updated);
    setFiSaved(true);
    setTimeout(() => setFiSaved(false), 1800);
  }

  const goals = sortGoals(model.savingsGoals);
  const totalSaved = goals.reduce((sum, g) => sum + contributionsTotal(g), 0);

  const storedCalc = calcInputsFromModel();
  const efExpensesDisplay =
    efExpensesInput !== '' ? efExpensesInput : storedCalc.efMonthlyExpenses === '' ? '' : String(storedCalc.efMonthlyExpenses);
  const efSavingsDisplay =
    efSavingsInput !== '' ? efSavingsInput : storedCalc.efCurrentSavings === '' ? '' : String(storedCalc.efCurrentSavings);
  const fiExpensesDisplay =
    fiExpensesInput !== '' ? fiExpensesInput : storedCalc.fiAnnualExpenses === '' ? '' : String(storedCalc.fiAnnualExpenses);
  const fiSavingsDisplay =
    fiSavingsInput !== '' ? fiSavingsInput : storedCalc.fiCurrentSavings === '' ? '' : String(storedCalc.fiCurrentSavings);

  const efExpensesNum = parseFloat(efExpensesDisplay);
  const efSavingsNum = parseFloat(efSavingsDisplay);
  const efMonthsCovered =
    !isNaN(efExpensesNum) && efExpensesNum > 0 && !isNaN(efSavingsNum) ? efSavingsNum / efExpensesNum : null;

  const fiExpensesNum = parseFloat(fiExpensesDisplay);
  const fiSavingsNum = parseFloat(fiSavingsDisplay);
  const fiNumber = !isNaN(fiExpensesNum) && fiExpensesNum > 0 ? fiExpensesNum * 25 : null;
  const fiProgressPct =
    fiNumber && !isNaN(fiSavingsNum) ? Math.min(100, Math.max(0, (fiSavingsNum / fiNumber) * 100)) : null;

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
            return (
              <TouchableOpacity
                key={goal.id}
                style={styles.goalRow}
                activeOpacity={0.7}
                onPress={() => openEditModal(goal)}
              >
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
              </TouchableOpacity>
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
            <Text style={styles.resultAmount}>
              {efMonthsCovered !== null ? efMonthsCovered.toFixed(1) + ' months' : '—'}
            </Text>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSaveEf}>
            <Text style={styles.saveButtonText}>{efSaved ? 'Saved ✓' : 'Save'}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {activeTab === 'fi' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.calcIntro}>
            A rough "FI number" using the common 25× rule of thumb (annual expenses × 25) —
            the amount some people aim to have saved/invested to no longer need a paycheck.
            This is just a simple estimate, not financial advice.
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

          <Text style={styles.inputLabel}>Current savings / investments</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor={colors.inkFaint}
            keyboardType="decimal-pad"
            value={fiSavingsDisplay}
            onChangeText={setFiSavingsInput}
          />

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
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSaveFi}>
            <Text style={styles.saveButtonText}>{fiSaved ? 'Saved ✓' : 'Save'}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={closeModal}>
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardWrap}
          >
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>{editingId ? 'Edit goal' : 'New goal'}</Text>

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

                <Text style={styles.inputLabel}>Target date (optional, YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2026-12-31"
                  placeholderTextColor={colors.inkFaint}
                  value={targetDateInput}
                  onChangeText={setTargetDateInput}
                />

                <Text style={styles.inputLabel}>Contributions logged</Text>
                {contribRows.length === 0 && (
                  <Text style={styles.fieldHint}>No contributions logged yet.</Text>
                )}
                {contribRows.map((row) => (
                  <View key={row.id} style={styles.contribRow}>
                    <TextInput
                      style={[styles.input, styles.contribDateInput]}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.inkFaint}
                      value={row.date}
                      onChangeText={(v) => updateContribDate(row.id, v)}
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
                      <Text style={styles.contribRemoveButtonText}>✕</Text>
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
              </ScrollView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
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
    goalRow: {
      backgroundColor: colors.navy3,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 8,
    },
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
    deleteButton: { alignItems: 'center', paddingVertical: 10, marginBottom: 4 },
    deleteButtonText: { fontSize: 13, color: '#e5484d', fontWeight: '600' },
    cancelButton: { alignItems: 'center', paddingVertical: 8 },
    cancelButtonText: { fontSize: 13, color: colors.inkDim },
    errorText: { fontSize: 12, color: '#e5484d', marginBottom: 10 },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    modalKeyboardWrap: { width: '100%', alignItems: 'center', maxHeight: '85%' },
    modalCard: {
      width: '100%',
      maxWidth: 360,
      maxHeight: '100%',
      backgroundColor: colors.navy3,
      borderRadius: 14,
      padding: 20,
    },
    modalTitle: { fontSize: 17, fontWeight: '700', color: colors.ink, marginBottom: 16 },
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
