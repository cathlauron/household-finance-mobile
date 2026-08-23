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
import type { Bill, HouseholdModel } from '../types';

type Priority = 'high' | 'medium' | 'low' | '';

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: '', label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

function makeId(prefix: string): string {
  return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

function billAmount(bill: Bill): number {
  const first = bill.cycles[0];
  return first && typeof first.amountDue === 'number' ? first.amountDue : 0;
}

function billDueDateText(bill: Bill): string {
  return (bill.dueDate && bill.dueDate.date) || '';
}

// Sorts bills with a due date first (earliest first), undated bills at the end.
function sortByDueDate(bills: Bill[]): Bill[] {
  return [...bills].sort((a, b) => {
    const da = billDueDateText(a);
    const db = billDueDateText(b);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da < db ? -1 : da > db ? 1 : 0;
  });
}

export default function BillsScreen() {
  const { colors } = useTheme();
  const { model, saveModel } = useData();
  const styles = makeStyles(colors);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [dueDateInput, setDueDateInput] = useState('');
  const [priorityInput, setPriorityInput] = useState<Priority>('');
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
    setNameInput('');
    setCategoryInput('');
    setAmountInput('');
    setDueDateInput('');
    setPriorityInput('');
    setNotesInput('');
    setErrorMsg('');
    setModalOpen(true);
  }

  function openEditModal(bill: Bill) {
    setEditingId(bill.id);
    setNameInput(bill.name);
    setCategoryInput(bill.category || '');
    setAmountInput(billAmount(bill) === 0 ? '' : String(billAmount(bill)));
    setDueDateInput(billDueDateText(bill));
    setPriorityInput(bill.priority || '');
    setNotesInput(bill.notes || '');
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
    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      setErrorMsg('Give this bill a name.');
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

    const updated: HouseholdModel = { ...model, bills: [...model.bills] };

    if (editingId) {
      updated.bills = updated.bills.map((b) => {
        if (b.id !== editingId) return b;
        const existingCycle = b.cycles[0];
        const cycle = existingCycle
          ? { ...existingCycle, dueDate: trimmedDate, amountDue: parsedAmount }
          : { id: makeId('cycle'), dueDate: trimmedDate, amountDue: parsedAmount, amountPaid: '' as const, paidDate: '', notes: '' };
        return {
          ...b,
          name: trimmedName,
          category: categoryInput.trim(),
          priority: priorityInput,
          notes: notesInput,
          dueDate: { date: trimmedDate },
          cycles: [cycle],
        };
      });
    } else {
      const newBill: Bill = {
        id: makeId('bill'),
        name: trimmedName,
        category: categoryInput.trim(),
        recurringType: 'onetime',
        dueDate: { date: trimmedDate },
        priority: priorityInput,
        owner: 'shared',
        notes: notesInput,
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
        createdAt: Date.now(),
      };
      updated.bills = [...updated.bills, newBill];
    }

    await saveModel(updated);
    closeModal();
  }

  async function handleDelete() {
    if (!editingId || !model) return;
    const updated: HouseholdModel = {
      ...model,
      bills: model.bills.filter((b) => b.id !== editingId),
    };
    await saveModel(updated);
    closeModal();
  }

  const bills = sortByDueDate(model.bills);
  const totalOwed = bills.reduce((sum, b) => sum + billAmount(b), 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.balanceBanner}>
          <Text style={styles.balanceBannerLabel}>TOTAL BILLS LOGGED</Text>
          <Text style={styles.balanceBannerAmount}>{formatPeso(totalOwed)}</Text>
        </View>

        {bills.length === 0 && (
          <Text style={styles.emptyText}>No bills yet. Add your first one below.</Text>
        )}

        {bills.map((bill) => (
          <TouchableOpacity
            key={bill.id}
            style={styles.billRow}
            activeOpacity={0.7}
            onPress={() => openEditModal(bill)}
          >
            <View style={styles.billRowMain}>
              <Text style={styles.billName} numberOfLines={1}>
                {bill.name || 'Untitled bill'}
              </Text>
              <Text style={styles.billSub} numberOfLines={1}>
                {(bill.category || 'Uncategorized')}
                {billDueDateText(bill) ? ' · Due ' + billDueDateText(bill) : ' · No due date set'}
                {bill.priority ? ' · ' + bill.priority.charAt(0).toUpperCase() + bill.priority.slice(1) + ' priority' : ''}
              </Text>
            </View>
            <Text style={styles.billAmount}>{formatPeso(billAmount(bill))}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>+ Add bill</Text>
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
                <Text style={styles.modalTitle}>{editingId ? 'Edit bill' : 'New bill'}</Text>

                <Text style={styles.inputLabel}>Bill name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Meralco, Netflix, Car insurance"
                  placeholderTextColor={colors.inkFaint}
                  value={nameInput}
                  onChangeText={setNameInput}
                />

                <Text style={styles.inputLabel}>Category</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Utilities, Subscription"
                  placeholderTextColor={colors.inkFaint}
                  value={categoryInput}
                  onChangeText={setCategoryInput}
                />

                <Text style={styles.inputLabel}>Amount</Text>
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

                <Text style={styles.inputLabel}>Priority</Text>
                <View style={styles.priorityRow}>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.label}
                      style={[
                        styles.priorityChip,
                        priorityInput === opt.value && styles.priorityChipActive,
                      ]}
                      onPress={() => setPriorityInput(opt.value)}
                    >
                      <Text
                        style={[
                          styles.priorityChipText,
                          priorityInput === opt.value && styles.priorityChipTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Notes (optional)</Text>
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  placeholder="Anything worth remembering about this bill"
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
                    <Text style={styles.deleteButtonText}>Delete this bill</Text>
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
    billRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.navy3,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 8,
    },
    billRowMain: { flex: 1, marginRight: 10 },
    billName: { fontSize: 14, fontWeight: '600', color: colors.ink },
    billSub: { fontSize: 11.5, color: colors.inkDim, marginTop: 2 },
    billAmount: { fontSize: 14, fontWeight: '600', color: colors.ink },
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
    priorityRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    priorityChip: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: colors.navy2,
    },
    priorityChipActive: { backgroundColor: colors.gold },
    priorityChipText: { fontSize: 12, color: colors.inkDim, fontWeight: '600' },
    priorityChipTextActive: { color: colors.navy2 },
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
