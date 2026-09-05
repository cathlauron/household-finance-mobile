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
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { formatPeso } from '../balanceProjection';
import { getNextDueDate, formatShortDate, recurringTypeLabel, RecurringType } from '../recurrence';
import type { Bill, HouseholdModel, BillCycle, PaymentMethod } from '../types';
import PaymentMethodPicker from '../components/PaymentMethodPicker';
import BottomSheet from '../components/BottomSheet';
import CollapsibleRow from '../components/CollapsibleRow';
import { makeId } from '../utils';

function billAmount(bill: Bill): number {
  const c = bill.cycles && bill.cycles[0];
  return c && typeof c.amountDue === 'number' ? c.amountDue : 0;
}

function paymentMethodLabel(pm: PaymentMethod | undefined, model: HouseholdModel): string {
  if (!pm) return 'Not set';
  if (pm.type === 'cash') return 'Cash';
  const list = pm.type === 'debit' ? model.balanceAccounts.debit : model.balanceAccounts.credit;
  const acct = list.find((a) => a.id === pm.accountId);
  const label = pm.type === 'debit' ? 'Debit' : 'Credit';
  return acct ? `${label} — ${acct.name || 'Unnamed'}` : label;
}

function fullRecurrenceDetail(bill: Bill): string {
  const d = bill.dueDate || {};
  if (bill.recurringType === 'monthly') {
    return d.day ? `Every month on day ${d.day}` : 'Monthly';
  }
  if (bill.recurringType === 'annual') {
    if (d.month && d.day) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mName = monthNames[(d.month as number) - 1] || `Month ${d.month}`;
      return `Every year on ${mName} ${d.day}`;
    }
    return d.day ? `Every year on day ${d.day}` : 'Annual';
  }
  if (bill.recurringType === 'onetime') {
    return d.date ? `One-time: due ${d.date}` : 'One-time bill';
  }
  if (bill.recurringType === 'custom') {
    return bill.customFreq ? `Custom: every ${bill.customFreq}` : 'Custom schedule';
  }
  return recurringTypeLabel(bill.recurringType);
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

  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [priorityInput, setPriorityInput] = useState<'high' | 'medium' | 'low' | ''>('');
  const [notesInput, setNotesInput] = useState('');
  const [paymentMethodInput, setPaymentMethodInput] = useState<PaymentMethod | undefined>(undefined);
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
    setPaymentMethodInput(undefined);
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
    setPaymentMethodInput(bill.cycles && bill.cycles[0] ? bill.cycles[0].paymentMethod : undefined);
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
          ? { ...existingCycle, amountDue: parsedAmount, dueDate: nextDueISO, paymentMethod: paymentMethodInput }
          : { id: makeId('cycle'), dueDate: nextDueISO, amountDue: parsedAmount, amountPaid: '', paidDate: '', notes: '', paymentMethod: paymentMethodInput };
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
          { id: makeId('cycle'), dueDate: nextDueISO, amountDue: parsedAmount, amountPaid: '', paidDate: '', notes: '', paymentMethod: paymentMethodInput },
        ],
        createdAt: Date.now(),
      };
      updated.bills = [...updated.bills, newBill];
    }

    await saveModel(updated);
    closeModal();
  }

  async function performDelete() {
    if (!editingId || !model) return;
    const updated: HouseholdModel = {
      ...model,
      bills: model.bills.filter((b) => b.id !== editingId),
    };
    await saveModel(updated);
    closeModal();
  }

  function handleDelete() {
    Alert.alert(
      'Delete this bill?',
      'This will permanently delete the bill and its payment history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: performDelete },
      ]
    );
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
          const pm = bill.cycles && bill.cycles[0] ? bill.cycles[0].paymentMethod : undefined;
          const isExpanded = expandedBillId === bill.id;

          return (
            <CollapsibleRow
              key={bill.id}
              testID={`bill-row-${bill.id}`}
              isExpanded={isExpanded}
              onToggle={() => setExpandedBillId((prev) => (prev === bill.id ? null : bill.id))}
              onEdit={() => openEditModal(bill)}
              collapsedContent={
                <View style={styles.billCollapsedRow}>
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
                </View>
              }
              expandedContent={
                <View style={styles.detailContainer}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Schedule</Text>
                    <Text style={styles.detailValue}>{fullRecurrenceDetail(bill)}</Text>
                  </View>

                  {pm && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Payment Method</Text>
                      <Text style={styles.detailValue}>{paymentMethodLabel(pm, model)}</Text>
                    </View>
                  )}

                  {!!bill.priority && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Priority</Text>
                      <View
                        style={[
                          styles.priorityBadge,
                          bill.priority === 'high'
                            ? styles.priorityHigh
                            : bill.priority === 'medium'
                            ? styles.priorityMedium
                            : styles.priorityLow,
                        ]}
                      >
                        <Text
                          style={[
                            styles.priorityBadgeText,
                            bill.priority === 'high'
                              ? styles.priorityHighText
                              : bill.priority === 'medium'
                              ? styles.priorityMediumText
                              : styles.priorityLowText,
                          ]}
                        >
                          {bill.priority.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  )}

                  {!!bill.notes?.trim() && (
                    <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
                      <Text style={styles.detailLabel}>Notes</Text>
                      <Text style={styles.detailNotesText}>{bill.notes.trim()}</Text>
                    </View>
                  )}
                </View>
              }
            />
          );
        })}

        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>+ Add bill</Text>
        </TouchableOpacity>
      </ScrollView>

      <BottomSheet
        visible={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Edit bill' : 'New bill'}
      >
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

                <PaymentMethodPicker
                  value={paymentMethodInput}
                  onChange={setPaymentMethodInput}
                  debitAccounts={model.balanceAccounts.debit}
                  creditAccounts={model.balanceAccounts.credit}
                />

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
      </BottomSheet>
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
    billCollapsedRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flex: 1,
    },
    billRowMain: { flex: 1, marginRight: 10 },
    billName: { fontSize: 14, fontWeight: '600', color: colors.ink },
    billSub: { fontSize: 11.5, color: colors.inkDim, marginTop: 2 },
    billAmount: { fontSize: 14, fontWeight: '600', color: colors.ink },
    detailContainer: {
      gap: 6,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 2,
    },
    detailLabel: {
      fontSize: 11,
      color: colors.inkDim,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontWeight: '600',
    },
    detailValue: {
      fontSize: 12.5,
      color: colors.ink,
      fontWeight: '500',
    },
    detailNotesText: {
      fontSize: 12.5,
      color: colors.inkDim,
      lineHeight: 17,
      flex: 1,
      textAlign: 'right',
      marginLeft: 12,
    },
    priorityBadge: {
      paddingHorizontal: 6,
      paddingVertical: 1.5,
      borderRadius: 4,
    },
    priorityBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    priorityHigh: {
      backgroundColor: colors.errorBg,
    },
    priorityHighText: {
      color: colors.error,
    },
    priorityMedium: {
      backgroundColor: colors.navy2,
    },
    priorityMediumText: {
      color: colors.orange,
    },
    priorityLow: {
      backgroundColor: colors.navy2,
    },
    priorityLowText: {
      color: colors.inkDim,
    },
    addButton: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 4, marginTop: 4 },
    addButtonText: { fontSize: 13, fontWeight: '600', color: colors.gold },
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
