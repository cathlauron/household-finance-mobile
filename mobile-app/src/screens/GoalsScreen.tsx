import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
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
import type { YearlyGoal, HouseholdModel } from '../types';
import { makeId } from '../utils';

function isValidDateOrEmpty(s: string): boolean {
  if (s.trim() === '') return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
}

function goalPct(g: YearlyGoal): number {
  const target = typeof g.targetAmount === 'number' ? g.targetAmount : 0;
  const current = typeof g.currentAmount === 'number' ? g.currentAmount : 0;
  if (target <= 0) return 0;
  return Math.min(100, (current / target) * 100);
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
  const [targetAmountInput, setTargetAmountInput] = useState('');
  const [currentAmountInput, setCurrentAmountInput] = useState('');
  const [targetDateInput, setTargetDateInput] = useState('');
  const [completedInput, setCompletedInput] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
    setErrorMsg('');
    setModalOpen(true);
  }

  function openEditModal(g: YearlyGoal) {
    setEditingId(g.id);
    setTitleInput(g.title);
    setDescriptionInput(g.description ?? '');
    setModeInput(g.mode);
    setTargetAmountInput(typeof g.targetAmount === 'number' ? String(g.targetAmount) : '');
    setCurrentAmountInput(typeof g.currentAmount === 'number' ? String(g.currentAmount) : '');
    setTargetDateInput(g.targetDate ?? '');
    setCompletedInput(!!g.completed);
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
      setErrorMsg('Target date must be in YYYY-MM-DD format, or left blank.');
      return;
    }

    let targetAmount: number | '' = '';
    let currentAmount: number | '' = '';
    if (modeInput === 'progress') {
      if (targetAmountInput.trim() !== '') {
        const n = parseFloat(targetAmountInput);
        if (isNaN(n)) {
          setErrorMsg('Enter a valid target amount, or leave it blank.');
          return;
        }
        targetAmount = n;
      }
      if (currentAmountInput.trim() !== '') {
        const n = parseFloat(currentAmountInput);
        if (isNaN(n)) {
          setErrorMsg('Enter a valid current amount, or leave it blank.');
          return;
        }
        currentAmount = n;
      }
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
        createdAt: Date.now(),
      };
      updatedList = [...currentList, newGoal];
    }

    const updated: HouseholdModel = { ...model, yearlyGoals: updatedList };
    await saveModel(updated);
    closeModal();
  }

  async function handleDeleteGoal() {
    if (!editingId || !model) return;
    const updated: HouseholdModel = {
      ...model,
      yearlyGoals: (model.yearlyGoals ?? []).filter((g) => g.id !== editingId),
    };
    await saveModel(updated);
    closeModal();
  }

  const doneCount = goals.filter((g) =>
    g.mode === 'progress' ? goalPct(g) >= 100 && typeof g.targetAmount === 'number' && g.targetAmount > 0 : g.completed
  ).length;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.yearBanner}>
          <Text style={styles.yearBannerLabel}>THIS YEAR'S PROGRESS</Text>
          <Text style={styles.yearBannerAmount}>
            {goals.length > 0 ? `${doneCount} of ${goals.length} reached` : 'No goals set yet'}
          </Text>
        </View>

        {goals.length === 0 && (
          <Text style={styles.emptyText}>No goals yet. Add your first one below.</Text>
        )}

        {goals.map((g) => {
          const isProgress = g.mode === 'progress';
          const pct = goalPct(g);
          const reached = isProgress
            ? pct >= 100 && typeof g.targetAmount === 'number' && g.targetAmount > 0
            : g.completed;
          return (
            <TouchableOpacity
              key={g.id}
              style={styles.goalRow}
              activeOpacity={0.7}
              onPress={() => openEditModal(g)}
            >
              <View style={styles.goalRowMain}>
                <Text style={[styles.goalTitle, reached && styles.goalTitleDone]} numberOfLines={1}>
                  {g.title || 'Untitled goal'}
                  {reached ? '  ✓' : ''}
                </Text>
                <Text style={styles.goalSub}>
                  {isProgress ? 'Track progress' : 'Simple checklist'}
                  {g.targetDate ? ' · ' + g.targetDate : ''}
                </Text>
                {isProgress && typeof g.targetAmount === 'number' && g.targetAmount > 0 && (
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${pct}%` }]} />
                  </View>
                )}
              </View>
              {isProgress && typeof g.targetAmount === 'number' && g.targetAmount > 0 ? (
                <Text style={styles.goalAmount}>{Math.round(pct)}%</Text>
              ) : null}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>+ Add year-end goal</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={closeModal}>
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardWrap}
          >
            <Pressable style={styles.modalCard} onPress={() => {}}>
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
                  <TouchableOpacity
                    style={[styles.smallPill, modeInput === 'progress' && styles.smallPillActive]}
                    onPress={() => setModeInput('progress')}
                  >
                    <Text
                      style={[styles.smallPillText, modeInput === 'progress' && styles.smallPillTextActive]}
                    >
                      Track progress
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.smallPill, modeInput === 'checklist' && styles.smallPillActive]}
                    onPress={() => setModeInput('checklist')}
                  >
                    <Text
                      style={[styles.smallPillText, modeInput === 'checklist' && styles.smallPillTextActive]}
                    >
                      Simple checklist
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>Target date (YYYY-MM-DD, optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2026-12-31"
                  placeholderTextColor={colors.inkFaint}
                  value={targetDateInput}
                  onChangeText={setTargetDateInput}
                />

                {modeInput === 'progress' ? (
                  <>
                    <Text style={styles.inputLabel}>Target amount (optional)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0.00"
                      placeholderTextColor={colors.inkFaint}
                      keyboardType="decimal-pad"
                      value={targetAmountInput}
                      onChangeText={setTargetAmountInput}
                    />
                    <Text style={styles.inputLabel}>Current amount (optional)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0.00"
                      placeholderTextColor={colors.inkFaint}
                      keyboardType="decimal-pad"
                      value={currentAmountInput}
                      onChangeText={setCurrentAmountInput}
                    />
                  </>
                ) : (
                  <TouchableOpacity
                    style={[styles.completedToggle, completedInput && styles.completedToggleActive]}
                    onPress={() => setCompletedInput((v) => !v)}
                  >
                    <Text
                      style={[
                        styles.completedToggleText,
                        completedInput && styles.completedToggleTextActive,
                      ]}
                    >
                      {completedInput ? '✓ Completed' : 'Not yet'}
                    </Text>
                  </TouchableOpacity>
                )}

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
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.navy2 },
    loadingContainer: { alignItems: 'center', justifyContent: 'center' },
    scrollContent: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 40 },
    yearBanner: {
      backgroundColor: colors.navy3,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    yearBannerLabel: { fontSize: 10, letterSpacing: 1, color: colors.inkDim, marginBottom: 4 },
    yearBannerAmount: { fontSize: 18, fontWeight: '700', color: colors.ink },
    emptyText: { fontSize: 12, color: colors.inkFaint, marginBottom: 12, fontStyle: 'italic' },
    goalRow: {
      backgroundColor: colors.navy3,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    goalRowMain: { flex: 1, marginRight: 10 },
    goalTitle: { fontSize: 14, fontWeight: '600', color: colors.ink },
    goalTitleDone: { color: '#10b981' },
    goalSub: { fontSize: 11.5, color: colors.inkDim, marginTop: 2 },
    goalAmount: { fontSize: 13.5, fontWeight: '700', color: colors.gold },
    progressTrack: {
      height: 6,
      backgroundColor: colors.navy2,
      borderRadius: 999,
      marginTop: 8,
      overflow: 'hidden',
    },
    progressFill: { height: '100%', backgroundColor: colors.gold, borderRadius: 999 },
    addButton: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 4, marginTop: 4 },
    addButtonText: { fontSize: 13, fontWeight: '600', color: colors.gold },
    inputLabel: {
      fontSize: 11,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: colors.inkDim,
      marginBottom: 6,
      marginTop: 6,
    },
    input: {
      backgroundColor: colors.navy2,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.ink,
      marginBottom: 14,
    },
    pillRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    smallPill: {
      flex: 1,
      backgroundColor: colors.navy2,
      borderRadius: 999,
      paddingVertical: 9,
      alignItems: 'center',
    },
    smallPillActive: { backgroundColor: colors.gold },
    smallPillText: { fontSize: 12, fontWeight: '600', color: colors.inkDim },
    smallPillTextActive: { color: colors.navy2 },
    completedToggle: {
      backgroundColor: colors.navy2,
      borderRadius: 999,
      paddingVertical: 10,
      alignItems: 'center',
      marginBottom: 14,
    },
    completedToggleActive: { backgroundColor: 'rgba(16,185,129,0.15)' },
    completedToggleText: { fontSize: 13, fontWeight: '600', color: colors.inkDim },
    completedToggleTextActive: { color: '#10b981' },
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
