import React, { useLayoutEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import Svg, { Circle } from 'react-native-svg';
import { formatPeso, outstandingBalance, loanOutstandingBalance } from '../balanceProjection';
import { potSaved } from '../savingsPots';
import { todayISO } from '../dateUtils';
import { View, TouchableOpacity, StyleSheet, ScrollView, Modal, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { PullToRefreshScrollView } from '../PullToRefreshScrollView';
import type { YearlyGoal, HouseholdModel } from '../types';
import CollapsibleRow from '../components/CollapsibleRow';
import SwipeableRow from '../components/SwipeableRow';
import { makeId } from '../utils';
import DateField from '../components/DateField'
import Pill from '../components/Pill';
import Button from '../components/Button';
import { hapticSelection } from '../haptics';
import Card from '../components/Card';
import AmountInput from '../components/AmountInput';
import GradientFill from '../components/GradientFill';

function isValidDateOrEmpty(s: string): boolean {
  if (s.trim() === '') return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
}

// Redesign: a linked goal reads its progress from the pot / debt / loan it follows.
type Linked = { current: number; target: number; label: string; left?: number } | null;
function linkedProgress(g: YearlyGoal, model: HouseholdModel): Linked {
  const l = g.linkedTo;
  if (!l) return null;
  const target = typeof g.targetAmount === 'number' ? g.targetAmount : 0;
  if (l.kind === 'pot') {
    const pot = (model.savingsGoals || []).find((p) => p.id === l.id);
    if (!pot) return null;
    const potTarget = typeof pot.targetAmount === 'number' && pot.targetAmount > 0 ? pot.targetAmount : target;
    return { current: potSaved(pot), target: target || potTarget, label: `linked to your ${pot.name} pot` };
  }
  const rec = l.kind === 'debt' ? (model.debts || []).find((d) => d.id === l.id) : (model.loans || []).find((x) => x.id === l.id);
  if (!rec) return null;
  const left = Math.max(0, l.kind === 'debt' ? outstandingBalance(rec as any) : loanOutstandingBalance(rec as any));
  const total = target > 0 ? target : left;
  return { current: Math.max(0, total - left), target: total, left, label: '' };
}

function goalNumbers(g: YearlyGoal, model: HouseholdModel): { current: number; target: number } {
  const lp = linkedProgress(g, model);
  if (lp) return { current: lp.current, target: lp.target };
  return { current: typeof g.currentAmount === 'number' ? g.currentAmount : 0, target: typeof g.targetAmount === 'number' ? g.targetAmount : 0 };
}

function goalPct(g: YearlyGoal, model?: HouseholdModel): number {
  const { current, target } = model ? goalNumbers(g, model) : { current: typeof g.currentAmount === 'number' ? g.currentAmount : 0, target: typeof g.targetAmount === 'number' ? g.targetAmount : 0 };
  if (target <= 0) return 0;
  return Math.min(100, (current / target) * 100);
}

function monthName(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'long' });
}
function shortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function GoalsScreen() {
  const { colors } = useTheme();
  const { model, saveModel } = useData();
  const styles = makeStyles(colors);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [modeInput, setModeInput] = useState<YearlyGoal['mode']>('progress');
  const [targetAmountInput, setTargetAmountInput] = useState<number | ''>('');
  const [currentAmountInput, setCurrentAmountInput] = useState<number | ''>('');
  const [targetDateInput, setTargetDateInput] = useState('');
  const [completedInput, setCompletedInput] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [linkInput, setLinkInput] = useState<YearlyGoal['linkedTo']>(undefined);
  const navigation = useNavigation<any>();

  // Redesign: + in the top bar adds a goal.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={openAddModal} accessibilityRole="button" accessibilityLabel="Add a goal" testID="goals-add" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="add" size={28} color={colors.gold} />
        </TouchableOpacity>
      ),
    });
  });

  if (!model) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator color={colors.accent ?? colors.gold} />
      </View>
    );
  }

  const goals: YearlyGoal[] = model.yearlyGoals ?? [];

  function openAddModal() {
    setEditingId(null);
    setTitleInput('');
    setDescriptionInput('');
    setModeInput('progress');
    setTargetAmountInput('');
    setCurrentAmountInput('');
    setTargetDateInput('');
    setCompletedInput(false);
    setLinkInput(undefined);
    setErrorMsg('');
    setModalOpen(true);
  }

  function openEditModal(g: YearlyGoal) {
    setEditingId(g.id);
    setTitleInput(g.title);
    setDescriptionInput(g.description ?? '');
    setModeInput(g.mode);
    setTargetAmountInput(typeof g.targetAmount === 'number' ? g.targetAmount : '');
    setCurrentAmountInput(typeof g.currentAmount === 'number' ? g.currentAmount : '');
    setTargetDateInput(g.targetDate ?? '');
    setCompletedInput(!!g.completed);
    setLinkInput(g.linkedTo);
    setErrorMsg('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setErrorMsg('');
  }

  async function handleSaveGoal() {
    if (!model) return;
    const trimmedTitle = titleInput.trim();
    if (!trimmedTitle) {
      setErrorMsg('Enter a goal title.');
      return;
    }
    if (!isValidDateOrEmpty(targetDateInput)) {
      setErrorMsg('Enter date as YYYY-MM-DD.');
      return;
    }

    let targetAmount: number | '' = '';
    let currentAmount: number | '' = '';
    if (modeInput === 'progress') {
      targetAmount = targetAmountInput;
      currentAmount = currentAmountInput;
    }

    const currentList = model.yearlyGoals ?? [];
    let updatedList: YearlyGoal[];
    if (editingId) {
      updatedList = currentList.map((g) =>
        g.id === editingId
          ? {
              ...g,
              title: trimmedTitle,
              description: descriptionInput.trim(),
              mode: modeInput,
              targetAmount,
              currentAmount,
              targetDate: targetDateInput.trim(),
              completed: completedInput,
              completedDate: completedInput ? g.completedDate || todayISO() : undefined,
              linkedTo: modeInput === 'progress' ? linkInput : undefined,
            }
          : g
      );
    } else {
      const newGoal: YearlyGoal = {
        id: makeId('ygoal'),
        title: trimmedTitle,
        description: descriptionInput.trim(),
        mode: modeInput,
        targetAmount,
        currentAmount,
        targetDate: targetDateInput.trim(),
        completed: completedInput,
        completedDate: completedInput ? todayISO() : undefined,
        linkedTo: modeInput === 'progress' ? linkInput : undefined,
        createdAt: Date.now(),
      };
      updatedList = [...currentList, newGoal];
    }

    const updated: HouseholdModel = { ...model, yearlyGoals: updatedList };
    try {
      await saveModel(updated);
      closeModal();
    } catch (e) {
      setErrorMsg('Failed to save. Please try again.');
    }
  }

  async function handleDeleteGoal() {
    if (!editingId || !model) return;
    const updated: HouseholdModel = {
      ...model,
      yearlyGoals: (model.yearlyGoals ?? []).filter((g) => g.id !== editingId),
    };
    try {
      await saveModel(updated);
      closeModal();
    } catch (e) {
      setErrorMsg('Failed to delete. Please try again.');
    }
  }

  async function performDeleteGoalById(id: string) {
    if (!model) return;
    const updated: HouseholdModel = {
      ...model,
      yearlyGoals: (model.yearlyGoals ?? []).filter((g) => g.id !== id),
    };
    try {
      await saveModel(updated);
    } catch (e) {
      Alert.alert('Failed to delete', 'Please try again.');
    }
  }

  function handleSwipeDeleteGoal(goal: YearlyGoal) {
    Alert.alert(
      'Delete this goal?',
      'Deletes the goal. Cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => performDeleteGoalById(goal.id) },
      ]
    );
  }

  const isDone = (g: YearlyGoal) => {
    if (g.mode !== 'progress') return g.completed;
    const { current, target } = goalNumbers(g, model);
    return g.completed || (target > 0 && current >= target);
  };
  const doneCount = goals.filter(isDone).length;
  const progressGoals = goals.filter((g) => g.mode === 'progress');
  const checkGoals = goals.filter((g) => g.mode !== 'progress');
  const year = new Date().getFullYear();
  const daysLeft = Math.max(0, Math.round((new Date(year, 11, 31).getTime() - new Date(todayISO() + 'T00:00:00').getTime()) / 86400000));
  const RING = 2 * Math.PI * 27;

  async function toggleDone(g: YearlyGoal) {
    if (!model) return;
    hapticSelection();
    const on = !g.completed;
    await saveModel({ ...model, yearlyGoals: goals.map((x) => (x.id === g.id ? { ...x, completed: on, completedDate: on ? todayISO() : undefined } : x)) });
  }

  return (
    <View style={styles.container}>
      <PullToRefreshScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.summaryCard, styles.ringCard]}>
          <GradientFill match={styles.summaryCard} />
          <Svg width={64} height={64} viewBox="0 0 64 64" accessibilityLabel={`${doneCount} of ${goals.length} goals done`}>
            <Circle cx={32} cy={32} r={27} fill="none" stroke={colors.navy1} strokeWidth={7} />
            {goals.length > 0 && (
              <Circle
                cx={32}
                cy={32}
                r={27}
                fill="none"
                stroke={colors.buttonFill}
                strokeWidth={7}
                strokeLinecap="round"
                strokeDasharray={`${(doneCount / goals.length) * RING} ${RING}`}
                transform="rotate(-90 32 32)"
              />
            )}
          </Svg>
          <View style={{ flex: 1 }}>
            <Text style={styles.ringTitle}>{goals.length > 0 ? `${doneCount} of ${goals.length} done` : 'No goals yet'}</Text>
            <Text style={styles.goalSub}>For {year} · {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left in the year</Text>
          </View>
        </View>

        {goals.length === 0 && <Text style={styles.emptyText}>Tap + to add what you want to achieve this year.</Text>}

        {progressGoals.length > 0 && (
          <>
            <Text style={styles.groupHeader}>Tracking progress</Text>
            <View style={styles.listGroup}>
              <GradientFill match={styles.listGroup} />
              {progressGoals.map((g, rowIndex) => {
                const lp = linkedProgress(g, model);
                const { current, target } = goalNumbers(g, model);
                const pct = goalPct(g, model);
                const isDebt = g.linkedTo && g.linkedTo.kind !== 'pot';
                const parts: string[] = [];
                if (isDebt && lp) parts.push(`${formatPeso(current)} of ${formatPeso(target)} paid`);
                else if (target > 0) parts.push(`of ${formatPeso(target)}`);
                if (lp?.label) parts.push(lp.label);
                if (g.targetDate) parts.push(`by ${shortDate(g.targetDate)}`);
                return (
                  <SwipeableRow key={g.id} enabled={Boolean(model.settings.swipeToDeleteEnabled)} onDelete={() => handleSwipeDeleteGoal(g)} testID={`goal-swipe-${g.id}`} flat>
                    <TouchableOpacity style={[styles.goalRow, rowIndex > 0 && styles.rowDivider, { flexDirection: 'column', alignItems: 'stretch' }]} activeOpacity={0.7} onPress={() => openEditModal(g)}>
                      <GradientFill match={[styles.goalRow, rowIndex > 0 && styles.rowDivider]} />
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                        <Text style={[styles.goalTitle, { flex: 1 }]} numberOfLines={2}>{g.title || 'Untitled goal'}</Text>
                        <Text style={[styles.goalAmount, { color: isDebt ? colors.negative : colors.saving }]}>
                          {isDebt && lp ? `${formatPeso(lp.left ?? 0)} left` : formatPeso(current)}
                        </Text>
                      </View>
                      {parts.length > 0 && <Text style={styles.goalSub}>{parts.join(' · ')}</Text>}
                      {target > 0 && (
                        <View style={styles.progressTrack}>
                          <View style={[styles.progressFill, { width: `${pct}%` }]} />
                        </View>
                      )}
                    </TouchableOpacity>
                  </SwipeableRow>
                );
              })}
            </View>
          </>
        )}

        {checkGoals.length > 0 && (
          <>
            <Text style={styles.groupHeader}>Checklist</Text>
            <View style={styles.listGroup}>
              <GradientFill match={styles.listGroup} />
              {checkGoals.map((g, rowIndex) => (
                <SwipeableRow key={g.id} enabled={Boolean(model.settings.swipeToDeleteEnabled)} onDelete={() => handleSwipeDeleteGoal(g)} testID={`goal-swipe-${g.id}`} flat>
                  <View style={[styles.goalRow, rowIndex > 0 && styles.rowDivider]}>
                    <GradientFill match={[styles.goalRow, rowIndex > 0 && styles.rowDivider]} />
                    <TouchableOpacity
                      onPress={() => toggleDone(g)}
                      style={[styles.check, g.completed && { backgroundColor: colors.buttonFill, borderColor: colors.buttonFill }]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: g.completed }}
                      accessibilityLabel={`Mark ${g.title} as done`}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      {g.completed && <Ionicons name="checkmark" size={15} color={colors.onButton} />}
                    </TouchableOpacity>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => openEditModal(g)} accessibilityRole="button">
                      <Text style={[styles.goalTitle, g.completed && styles.goalTitleDone]} numberOfLines={2}>{g.title || 'Untitled goal'}</Text>
                      <Text style={styles.goalSub}>
                        {g.completed ? (g.completedDate ? `Done in ${monthName(g.completedDate)}` : 'Done') : g.targetDate ? `By ${shortDate(g.targetDate)}` : g.description || 'No date'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </SwipeableRow>
              ))}
            </View>
          </>
        )}
        {goals.length > 0 && <Text style={styles.groupFooter}>A goal can track an amount or just be ticked off. Tap a goal to edit it.</Text>}
      </PullToRefreshScrollView>

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={closeModal}>
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardWrap}
          >
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <GradientFill match={styles.modalCard} />
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>{editingId ? 'Edit goal' : 'New goal'}</Text>

                <Text style={styles.inputLabel}>Title</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Pay off credit card, Save 3-month emergency fund"
                  placeholderTextColor={colors.inkFaint}
                  value={titleInput}
                  onChangeText={setTitleInput}
                />

                <Text style={styles.inputLabel}>Description (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Optional detail"
                  placeholderTextColor={colors.inkFaint}
                  value={descriptionInput}
                  onChangeText={setDescriptionInput}
                />

                <Text style={styles.inputLabel}>Mode</Text>
                <View style={styles.pillRow}>
                  <Pill
                    label="Track progress"
                    tone="sheet"
                    fill
                    active={modeInput === 'progress'}
                    onPress={() => setModeInput('progress')}
                  />
                  <Pill
                    label="Simple checklist"
                    tone="sheet"
                    fill
                    active={modeInput === 'checklist'}
                    onPress={() => setModeInput('checklist')}
                  />
                </View>

                <DateField
                  label="Target date (optional)"
                  value={targetDateInput}
                  onChange={setTargetDateInput}
                  placeholder="2026-12-31"
                  clearable
                  testID="goal-target-date-field"
                />

                {modeInput === 'progress' ? (
                  <>
                    <Text style={styles.inputLabel}>Follow (optional)</Text>
                    <View style={[styles.pillRow, { flexWrap: 'wrap' }]}>
                      <Pill label="Nothing" tone="sheet" active={!linkInput} onPress={() => setLinkInput(undefined)} />
                      {(model.savingsGoals || []).map((p) => (
                        <Pill key={p.id} label={p.name || 'Pot'} tone="sheet" active={linkInput?.kind === 'pot' && linkInput.id === p.id} onPress={() => setLinkInput({ kind: 'pot', id: p.id })} />
                      ))}
                      {(model.debts || []).map((d) => (
                        <Pill key={d.id} label={d.creditorOrPerson || 'Debt'} tone="sheet" active={linkInput?.kind === 'debt' && linkInput.id === d.id} onPress={() => setLinkInput({ kind: 'debt', id: d.id })} />
                      ))}
                      {(model.loans || []).map((l) => (
                        <Pill key={l.id} label={l.name || 'Loan'} tone="sheet" active={linkInput?.kind === 'loan' && linkInput.id === l.id} onPress={() => setLinkInput({ kind: 'loan', id: l.id })} />
                      ))}
                    </View>
                    <Text style={[styles.goalSub, { marginBottom: 8 }]}>
                      {linkInput?.kind === 'pot' ? 'Progress comes from what is saved in this pot.' : linkInput ? 'Progress is how much of it you have paid off. Set the target to the full amount you started with.' : 'Or type the amounts yourself.'}
                    </Text>
                    <Text style={styles.inputLabel}>Target amount (optional)</Text>
                    <AmountInput style={styles.amountInput} value={targetAmountInput} onChangeAmount={setTargetAmountInput} />
                    {!linkInput && (
                      <>
                        <Text style={styles.inputLabel}>Current amount (optional)</Text>
                        <AmountInput style={styles.amountInput} value={currentAmountInput} onChangeAmount={setCurrentAmountInput} />
                      </>
                    )}
                  </>
                ) : (
                  <TouchableOpacity
                    style={[styles.completedToggle, completedInput && styles.completedToggleActive]}
                    onPress={() => { hapticSelection(); setCompletedInput((v) => !v); }}
                  >
                    {completedInput && (
                      <Ionicons name="checkmark" size={15} color="#10b981" style={{ marginRight: 6 }} />
                    )}
                    <Text
                      style={[
                        styles.completedToggleText,
                        completedInput && styles.completedToggleTextActive,
                      ]}
                    >
                      {completedInput ? 'Completed' : 'Not yet'}
                    </Text>
                  </TouchableOpacity>
                )}

                {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

                <Button label="Save" onPress={handleSaveGoal} />

                {editingId && <Button label="Delete goal" variant="destructive" onPress={handleDeleteGoal} />}

                <Button label="Cancel" variant="quiet" onPress={closeModal} />
              </ScrollView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
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
    ringCard: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    ringTitle: { fontSize: 22, fontWeight: '700', color: colors.ink },
    groupHeader: { fontSize: 13, fontWeight: '600', color: colors.inkDim, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6, marginHorizontal: 16 },
    groupFooter: { fontSize: 13, color: colors.inkDim, marginTop: -6, marginBottom: 12, marginHorizontal: 16 },
    check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.inkDim, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },

    yearBannerLabel: { fontSize: 13, color: colors.inkDim, marginBottom: 2 },
    yearBannerAmount: { fontSize: 20, fontWeight: '700', color: colors.ink },
    emptyText: { fontSize: 15, color: colors.inkDim, marginBottom: 12, textAlign: 'center' },
    goalRow: {
      backgroundColor: colors.navy3,
      minHeight: 60,
      paddingVertical: 10,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    goalRowMain: { flex: 1, marginRight: 10 },
    goalTitleRow: { flexDirection: 'row', alignItems: 'center' },
    goalTitle: { fontSize: 17, fontWeight: '500', color: colors.ink, flexShrink: 1 },
    goalTitleDone: { color: '#10b981' },
    goalSub: { fontSize: 13, color: colors.inkDim, marginTop: 1 },
    goalAmount: { fontSize: 17, fontWeight: '600', color: colors.planned },
    progressTrack: {
      height: 6,
      backgroundColor: colors.navy2,
      borderRadius: 999,
      marginTop: 8,
      overflow: 'hidden',
    },
    progressFill: { height: '100%', backgroundColor: colors.planned, borderRadius: 999 },
    addButton: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 4, marginTop: 4 },
    addButtonText: { fontSize: 15, fontWeight: '600', color: colors.gold },
    inputLabel: {
      // Redesign: sentence-case grey labels, like iPhone forms.
      fontSize: 13,
      fontWeight: '600',
      marginLeft: 4,
      color: colors.inkDim,
      marginBottom: 6,
      marginTop: 6,
    },
    amountInput: { backgroundColor: colors.navy2 },
    input: {
      backgroundColor: colors.navy2,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      minHeight: 48,
      fontSize: 17,
      color: colors.ink,
      marginBottom: 14,
    },
    pillRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    completedToggle: {
      flexDirection: 'row',
      backgroundColor: colors.navy2,
      borderRadius: 999,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    completedToggleActive: { backgroundColor: 'rgba(16,185,129,0.15)' },
    completedToggleText: { fontSize: 13, fontWeight: '600', color: colors.inkDim },
    completedToggleTextActive: { color: '#10b981' },
    errorText: { fontSize: 12, color: colors.error, marginBottom: 10 },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    modalKeyboardWrap: { width: '100%', alignItems: 'center', maxHeight: '88%' },
    modalCard: {
      width: '100%',
      maxWidth: 380,
      maxHeight: '100%',
      backgroundColor: colors.navy3,
      borderRadius: 14,
      padding: 20,
    },
    modalTitle: { fontSize: 17, fontWeight: '700', color: colors.ink, marginBottom: 16 },
  });
}
