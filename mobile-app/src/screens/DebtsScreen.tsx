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
import type { Debt, HouseholdModel } from '../types';

function makeId(prefix: string): string {
  return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

function debtAmount(debt: Debt): number {
  const first = debt.cycles[0];
  return first && typeof first.amountDue === 'number' ? first.amountDue : 0;
}

function debtDueDateText(debt: Debt): string {
  return (debt.dueDate && debt.dueDate.date) || '';
}

// Sorts debts with a due date first (earliest first), undated debts at the end.
function sortByDueDate(debts: Debt[]): Debt[] {
  return [...debts].sort((a, b) => {
    const da = debtDueDateText(a);
    const db = debtDueDateText(b);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da < db ? -1 : da > db ? 1 : 0;
  });
}

export default function DebtsScreen() {
  const { colors } = useTheme();
  const { model, saveModel } = useData();
  const styles = makeStyles(colors);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creditorInput, setCreditorInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [dueDateInput, setDueDateInput] = useState('');
  const [interestRateInput, setInterestRateInput] = useState('');
  const [minPaymentInput, setMinPaymentInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!model) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  function openAddModal() {
    setEditingId(null);
    setCreditorInput('');
    setCategoryInput('');
    setAmountInput('');
    setDueDateInput('');
    setInterestRateInput('');
    setMinPaymentInput('');
    setNotesInput('');
    setErrorMsg('');
    setModalOpen(true);
  }

  function openEditModal(debt: Debt) {
    setEditingId(debt.id);
    setCreditorInput(debt.creditorOrPerson);
    setCategoryInput(debt.category || '');
    setAmountInput(debtAmount(debt) === 0 ? '' : String(debtAmount(debt)));
    setDueDateInput(debtDueDateText(debt));
    setInterestRateInput(
      typeof debt.interestRate === 'number' ? String(debt.interestRate) : ''
    );
    setMinPaymentInput(
      typeof debt.minPayment === 'number' ? String(debt.minPayment) : ''
    );
    setNotesInput(debt.notes || '');
    setErrorMsg('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setErrorMsg('');
  }

  async function handleSave() {
    if (!model) return;
    const trimmedCreditor = creditorInput.trim();
    if (!trimmedCreditor) {
      setErrorMsg('Enter who or what this debt is owed to.');
      return;
    }
    const parsedAmount = amountInput.trim() === '' ? 0 : parseFloat(amountInput);
    if (isNaN(parsedAmount)) {
      setErrorMsg('Enter a valid amount.');
      return;
    }
    const trimmedDate = dueDateInput.trim();
    if (trimmedDate && !/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
      setErrorMsg('Due date should look like 2026-08-25 (YYYY-MM-DD), or leave it blank.');
      return;
    }
    let parsedInterest: number | '' = '';
    if (interestRateInput.trim() !== '') {
      const n = parseFloat(interestRateInput);
      if (isNaN(n)) {
        setErrorMsg('Enter a valid interest rate, or leave it blank.');
        return;
      }
      parsedInterest = n;
    }
    let parsedMinPayment: number | '' = '';
    if (minPaymentInput.trim() !== '') {
      const n = parseFloat(minPaymentInput);
      if (isNaN(n)) {
        setErrorMsg('Enter a valid minimum payment, or leave it blank.');
        return;
      }
      parsedMinPayment = n;
    }

    const updated: HouseholdModel = { ...model, debts: [...model.debts] };

    if (editingId) {
      updated.debts = updated.debts.map((d) => {
        if (d.id !== editingId) return d;
        const existingCycle = d.cycles[0];
        const cycle = existingCycle
          ? { ...existingCycle, dueDate: trimmedDate, amountDue: parsedAmount }
          : { id: makeId('cycle'), dueDate: trimmedDate, amountDue: parsedAmount, amountPaid: '' as const, paidDate: '', notes: '' };
        return {
          ...d,
          creditorOrPerson: trimmedCreditor,
          category: categoryInput.trim(),
          notes: notesInput,
          interestRate: parsedInterest,
          minPayment: parsedMinPayment,
          dueDate: { date: trimmedDate },
          cycles: [cycle],
        };
      });
    } else {
      const newDebt: Debt = {
        id: makeId('debt'),
        creditorOrPerson: trimmedCreditor,
        category: categoryInput.trim(),
        recurringType: 'onetime',
        dueDate: { date: trimmedDate },
        cycles: [
          {
            id: makeId('cycle'),
            dueDate: trimmedDate,
            amountDue: parsedAmount,
            amountPaid: '',
            paidDate: '',
            notes: '',
          },
        ],
        notes: notesInput,
        owner: 'shared',
        interestRate: parsedInterest,
        minPayment: parsedMinPayment,
        createdAt: Date.now(),
      };
      updated.debts = [...updated.debts, newDebt];
    }

    await saveModel(updated);
    closeModal();
  }

  async function handleDelete() {
    if (!editingId || !model) return;
    const updated: HouseholdModel = {
      ...model,
      debts: model.debts.filter((d) => d.id !== editingId),
    };
    await saveModel(updated);
    closeModal();
  }

  const debts = sortByDueDate(model.debts);
  const totalOwed = debts.reduce((sum, d) => sum + debtAmount(d), 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.balanceBanner}>
          <Text style={styles.balanceBannerLabel}>TOTAL DEBT LOGGED</Text>
          <Text style={styles.balanceBannerAmount}>{formatPeso(totalOwed)}</Text>
        </View>

        {debts.length === 0 && (
          <Text style={styles.emptyText}>No debts yet. Add your first one below.</Text>
        )}

        {debts.map((debt) => (
          <TouchableOpacity
            key={debt.id}
            style={styles.debtRow}
            activeOpacity={0.7}
            onPress={() => openEditModal(debt)}
          >
            <View style={styles.debtRowMain}>
              <Text style={styles.debtName} numberOfLines={1}>
                {debt.creditorOrPerson || 'Untitled debt'}
              </Text>
              <Text style={styles.debtSub} numberOfLines={1}>
                {(debt.category || 'Uncategorized')}
                {debtDueDateText(debt) ? ' · Due ' + debtDueDateText(debt) : ' · No due date set'}
                {typeof debt.interestRate === 'number' ? ' · ' + debt.interestRate + '% APR' : ''}
              </Text>
            </View>
            <Text style={styles.debtAmount}>{formatPeso(debtAmount(debt))}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>+ Add debt</Text>
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
                <Text style={styles.modalTitle}>{editingId ? 'Edit debt' : 'New debt'}</Text>

                <Text style={styles.inputLabel}>Creditor or person</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. BDO Credit Card, GCredit, Ate Fely"
                  placeholderTextColor={colors.inkFaint}
                  value={creditorInput}
                  onChangeText={setCreditorInput}
                />

                <Text style={styles.inputLabel}>Category</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Credit card, Lending app, Personal loan"
                  placeholderTextColor={colors.inkFaint}
                  value={categoryInput}
                  onChangeText={setCategoryInput}
                />

                <Text style={styles.inputLabel}>Amount owed</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor={colors.inkFaint}
                  keyboardType="decimal-pad"
                  value={amountInput}
                  onChangeText={setAmountInput}
                />

                <Text style={styles.inputLabel}>Due date (YYYY-MM-DD, optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2026-08-25"
                  placeholderTextColor={colors.inkFaint}
                  value={dueDateInput}
                  onChangeText={setDueDateInput}
                />

                <Text style={styles.inputLabel}>Interest rate % (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 24"
                  placeholderTextColor={colors.inkFaint}
                  keyboardType="decimal-pad"
                  value={interestRateInput}
                  onChangeText={setInterestRateInput}
                />

                <Text style={styles.inputLabel}>Minimum payment (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor={colors.inkFaint}
                  keyboardType="decimal-pad"
                  value={minPaymentInput}
                  onChangeText={setMinPaymentInput}
                />

                <Text style={styles.inputLabel}>Notes (optional)</Text>
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  placeholder="Anything worth remembering about this debt"
                  placeholderTextColor={colors.inkFaint}
                  value={notesInput}
                  onChangeText={setNotesInput}
                  multiline
                />

                {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>

                {editingId && (
                  <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                    <Text style={styles.deleteButtonText}>Delete this debt</Text>
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
    balanceBanner: {
      backgroundColor: colors.navy3,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginBottom: 18,
    },
    balanceBannerLabel: { fontSize: 10, letterSpacing: 1, color: colors.inkDim, marginBottom: 4 },
    balanceBannerAmount: { fontSize: 22, fontWeight: '700', color: colors.ink },
    emptyText: { fontSize: 12, color: colors.inkFaint, marginBottom: 12, fontStyle: 'italic' },
    debtRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.navy3,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 8,
    },
    debtRowMain: { flex: 1, marginRight: 10 },
    debtName: { fontSize: 14, fontWeight: '600', color: colors.ink },
    debtSub: { fontSize: 11.5, color: colors.inkDim, marginTop: 2 },
    debtAmount: { fontSize: 14, fontWeight: '600', color: colors.ink },
    addButton: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 4, marginTop: 4 },
    addButtonText: { fontSize: 13, fontWeight: '600', color: colors.gold },
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
    inputLabel: {
      fontSize: 11,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: colors.inkDim,
      marginBottom: 6,
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
    notesInput: { minHeight: 60, textAlignVertical: 'top' },
    errorText: { fontSize: 12, color: '#e5484d', marginBottom: 10 },
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
  });
}
