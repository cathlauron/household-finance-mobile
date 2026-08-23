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
import { getNextDueDate, formatShortDate, recurringTypeLabel, RecurringType } from '../recurrence';
import type { Bill, HouseholdModel, BillCycle } from '../types';

function makeId(prefix: string): string {
  return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

function billAmount(bill: Bill): number {
  const c = bill.cycles && bill.cycles[0];
  return c && typeof c.amountDue === 'number' ? c.amountDue : 0;
}

// Sorts bills by next due date (soonest first); bills with no computable
// due date yet sort to the bottom.
function sortByNextDue(bills: Bill[]): Bill[] {
  return [...bills].sort((a, b) => {
    const da = getNextDueDate(a.recurringType, a.dueDate);
    const db = getNextDueDate(b.recurringType, b.dueDate);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da.getTime() - db.getTime();
  });
}

const PRIORITIES: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low'];
const RECUR_TYPES: RecurringType[] = ['onetime', 'monthly', 'annual'];

export default function BillsScreen() {
  const { colors } = useTheme();
  const { model, saveModel } = useData();
  const styles = makeStyles(colors);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [priorityInput, setPriorityInput] = useState<'high' | 'medium' | 'low' | ''>('');
  const [notesInput, setNotesInput] = useState('');
  const [recurTypeInput, setRecurTypeInput] = useState<RecurringType>('onetime');
  const [onetimeDateInput, setOnetimeDateInput] = useState('');
  const [dayInput, setDayInput] = useState('');
  const [monthInput, setMonthInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!model) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  function resetForm() {
    setNameInput('');
    setCategoryInput('');
    setAmountInput('');
    setPriorityInput('');
    setNotesInput('');
    setRecurTypeInput('onetime');
    setOnetimeDateInput('');
    setDayInput('');
    setMonthInput('');
    setErrorMsg('');
  }

  function openAddModal() {
    setEditingId(null);
    resetForm();
    setModalOpen(true);
  }

  function openEditModal(bill: Bill) {
    setEditingId(bill.id);
    setNameInput(bill.name);
    setCategoryInput(bill.category || '');
    setAmountInput(billAmount(bill) === 0 ? '' : String(billAmount(bill)));
    setPriorityInput(bill.priority || '');
    setNotesInput(bill.notes || '');
    const rt = (bill.recurringType as RecurringType) || 'onetime';
    setRecurTypeInput(RECUR_TYPES.includes(rt) ? rt : 'onetime');
    const d = bill.dueDate || {};
    setOnetimeDateInput(d.date || '');
    setDayInput(d.day ? String(d.day) : '');
    setMonthInput(d.month ? String(d.month) : '');
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
      setErrorMsg('Enter a name for this bill.');
      return;
    }

    let parsedAmount = 0;
    if (amountInput.trim() !== '') {
      const n = parseFloat(amountInput);
      if (isNaN(n)) {
        setErrorMsg('Enter a valid amount, or leave it blank.');
        return;
      }
      parsedAmount = n;
    }

    let dueDate: Record<string, any> = {};
    if (recurTypeInput === 'onetime') {
      const trimmedDate = onetimeDateInput.trim();
      if (trimmedDate && !/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
        setErrorMsg('Enter the date as YYYY-MM-DD, e.g. 2025-03-15.');
        return;
      }
      dueDate = { date: trimmedDate };
    } else if (recurTypeInput === 'monthly') {
      const dayNum = parseInt(dayInput, 10);
      if (dayInput.trim() && (isNaN(dayNum) || dayNum < 1 || dayNum > 31)) {
        setErrorMsg('Enter a day of month between 1 and 31.');
        return;
      }
      dueDate = { day: dayInput.trim() };
    } else if (recurTypeInput === 'annual') {
      const dayNum = parseInt(dayInput, 10);
      const monthNum = parseInt(monthInput, 10);
      if (dayInput.trim() && (isNaN(dayNum) || dayNum < 1 || dayNum > 31)) {
        setErrorMsg('Enter a day of month between 1 and 31.');
        return;
      }
      if (monthInput.trim() && (isNaN(monthNum) || monthNum < 1 || monthNum > 12)) {
        setErrorMsg('Enter a month between 1 and 12.');
        return;
      }
      dueDate = { day: dayInput.trim(), month: monthInput.trim() ? monthNum : '' };
    }

    const nextDue = getNextDueDate(recurTypeInput, dueDate);
    const nextDueISO = nextDue
      ? nextDue.getFullYear() + '-' + String(nextDue.getMonth() + 1).padStart(2, '0') + '-' + String(nextDue.getDate()).padStart(2, '0')
      : '';

    const updated: HouseholdModel = { ...model, bills: [...model.bills] };

    if (editingId) {
      updated.bills = updated.bills.map((b) => {
        if (b.id !== editingId) return b;
        const existingCycle = b.cycles && b.cycles[0];
        const cycle: BillCycle = existingCycle
          ? { ...existingCycle, amountDue: parsedAmount, dueDate: nextDueISO }
          : { id: makeId('cycle'), dueDate: nextDueISO, amountDue: parsedAmount, amountPaid: '', paidDate: '', notes: '' };
        return {
          ...b,
          name: trimmedName,
          category: categoryInput.trim(),
          priority: priorityInput,
          notes: notesInput,
          recurringType: recurTypeInput,
          dueDate,
          cycles: [cycle],
        };
      });
    } else {
      const newBill: Bill = {
        id: makeId('bill'),
        name: trimmedName,
        category: categoryInput.trim(),
        recurringType: recurTypeInput,
        dueDate,
        priority: priorityInput,
        owner: 'shared',
        notes: notesInput,
        cycles: [
          { id: makeId('cycle'), dueDate: nextDueISO, amountDue: parsedAmount, amountPaid: '', paidDate: '', notes: '' },
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

  const bills = sortByNextDue(model.bills);
  const totalDue = bills.reduce((sum, b) => sum + billAmount(b), 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.balanceBanner}>
          <Text style={styles.balanceBannerLabel}>TOTAL BILLS</Text>
          <Text style={styles.balanceBannerAmount}>{formatPeso(totalDue)}</Text>
        </View>

        {bills.length === 0 && (
          <Text style={styles.emptyText}>No bills yet. Add your first one below.</Text>
        )}

        {bills.map((bill) => {
          const nextDue = getNextDueDate(bill.recurringType, bill.dueDate);
          return (
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
                  {recurringTypeLabel(bill.recurringType)} · {formatShortDate(nextDue)}
                  {bill.category ? ' · ' + bill.category : ''}
                </Text>
              </View>
              <Text style={styles.billAmount}>{formatPeso(billAmount(bill))}</Text>
            </TouchableOpacity>
          );
        })}

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

                <Text style={styles.inputLabel}>Category (optional)</Text>
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

                <Text style={styles.inputLabel}>Repeats</Text>
                <View style={styles.pillRow}>
                  {RECUR_TYPES.map((rt) => (
                    <TouchableOpacity
                      key={rt}
                      style={[styles.pillButton, recurTypeInput === rt && styles.pillButtonActive]}
                      onPress={() => setRecurTypeInput(rt)}
                    >
                      <Text style={[styles.pillButtonText, recurTypeInput === rt && styles.pillButtonTextActive]}>
                        {recurringTypeLabel(rt)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {recurTypeInput === 'onetime' && (
                  <>
                    <Text style={styles.inputLabel}>Due date (YYYY-MM-DD)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="2025-03-15"
                      placeholderTextColor={colors.inkFaint}
                      value={onetimeDateInput}
                      onChangeText={setOnetimeDateInput}
                    />
                  </>
                )}

                {recurTypeInput === 'monthly' && (
                  <>
                    <Text style={styles.inputLabel}>Day of month (1–31)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 15"
                      placeholderTextColor={colors.inkFaint}
                      keyboardType="number-pad"
                      value={dayInput}
                      onChangeText={setDayInput}
                    />
                  </>
                )}

                {recurTypeInput === 'annual' && (
                  <View style={styles.row2}>
                    <View style={styles.row2Item}>
                      <Text style={styles.inputLabel}>Month (1–12)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. 3"
                        placeholderTextColor={colors.inkFaint}
                        keyboardType="number-pad"
                        value={monthInput}
                        onChangeText={setMonthInput}
                      />
                    </View>
                    <View style={styles.row2Item}>
                      <Text style={styles.inputLabel}>Day</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. 15"
                        placeholderTextColor={colors.inkFaint}
                        keyboardType="number-pad"
                        value={dayInput}
                        onChangeText={setDayInput}
                      />
                    </View>
                  </View>
                )}

                <Text style={styles.inputLabel}>Priority (optional)</Text>
                <View style={styles.pillRow}>
                  {PRIORITIES.map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[styles.pillButton, priorityInput === p && styles.pillButtonActive]}
                      onPress={() => setPriorityInput(priorityInput === p ? '' : p)}
                    >
                      <Text style={[styles.pillButtonText, priorityInput === p && styles.pillButtonTextActive]}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
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
      backgroundColor: colors.navy3,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 8,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
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
    row2: { flexDirection: 'row', gap: 10 },
    row2Item: { flex: 1 },
    pillRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
    pillButton: {
      flex: 1,
      minWidth: 80,
      backgroundColor: colors.navy2,
      borderRadius: 999,
      paddingVertical: 10,
      alignItems: 'center',
    },
    pillButtonActive: { backgroundColor: colors.gold },
    pillButtonText: { fontSize: 12, fontWeight: '600', color: colors.inkDim },
    pillButtonTextActive: { color: colors.navy2 },
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
