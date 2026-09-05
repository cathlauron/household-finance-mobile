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
import type { Debt, HouseholdModel, PaymentMethod } from '../types';
import PaymentMethodPicker from '../components/PaymentMethodPicker';
import BottomSheet from '../components/BottomSheet';
import CollapsibleRow from '../components/CollapsibleRow';
import { makeId } from '../utils';
import DateField from '../components/DateField';

function debtAmount(debt: Debt): number {
  const first = debt.cycles[0];
  return first && typeof first.amountDue === 'number' ? first.amountDue : 0;
}

// Sorts debts by next due date (soonest first); debts with no computable
// due date yet sort to the bottom.
function sortByNextDue(debts: Debt[]): Debt[] {
  return [...debts].sort((a, b) => {
    const da = getNextDueDate(a.recurringType, a.dueDate);
    const db = getNextDueDate(b.recurringType, b.dueDate);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da.getTime() - db.getTime();
  });
}

function paymentMethodLabel(pm: PaymentMethod | undefined, model: HouseholdModel): string {
  if (!pm) return 'Not set';
  if (pm.type === 'cash') return 'Cash';
  const list = pm.type === 'debit' ? model.balanceAccounts.debit : model.balanceAccounts.credit;
  const acct = list.find((a) => a.id === pm.accountId);
  const label = pm.type === 'debit' ? 'Debit' : 'Credit';
  return acct ? `${label} — ${acct.name || 'Unnamed'}` : label;
}

function fullRecurrenceDetail(debt: Debt): string {
  const d = debt.dueDate || {};
  if (debt.recurringType === 'monthly') {
    return d.day ? `Every month on day ${d.day}` : 'Monthly';
  }
  if (debt.recurringType === 'annual') {
    if (d.month && d.day) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mName = monthNames[(d.month as number) - 1] || `Month ${d.month}`;
      return `Every year on ${mName} ${d.day}`;
    }
    return d.day ? `Every year on day ${d.day}` : 'Annual';
  }
  if (debt.recurringType === 'onetime') {
    return d.date ? `One-time: due ${d.date}` : 'One-time debt';
  }
  if (debt.recurringType === 'custom') {
    return debt.customFreq ? `Custom: every ${debt.customFreq}` : 'Custom schedule';
  }
  return recurringTypeLabel(debt.recurringType);
}

const RECUR_TYPES: RecurringType[] = ['onetime', 'monthly', 'annual'];

export default function DebtsScreen() {
  const { colors } = useTheme();
  const { model, saveModel } = useData();
  const styles = makeStyles(colors);

  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creditorInput, setCreditorInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [interestRateInput, setInterestRateInput] = useState('');
  const [minPaymentInput, setMinPaymentInput] = useState('');
  const [feesPortionInput, setFeesPortionInput] = useState('');
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
    setCreditorInput('');
    setCategoryInput('');
    setAmountInput('');
    setInterestRateInput('');
    setMinPaymentInput('');
    setFeesPortionInput('');
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

  function openEditModal(debt: Debt) {
    setEditingId(debt.id);
    setCreditorInput(debt.creditorOrPerson);
    setCategoryInput(debt.category || '');
    setAmountInput(debtAmount(debt) === 0 ? '' : String(debtAmount(debt)));
    setInterestRateInput(
      typeof debt.interestRate === 'number' ? String(debt.interestRate) : ''
    );
    setMinPaymentInput(
      typeof debt.minPayment === 'number' ? String(debt.minPayment) : ''
    );
    setNotesInput(debt.notes || '');
        setPaymentMethodInput(debt.cycles && debt.cycles[0] ? debt.cycles[0].paymentMethod : undefined);
    setFeesPortionInput(debt.cycles && debt.cycles[0] && debt.cycles[0].feesPortion !== undefined && debt.cycles[0].feesPortion !== '' ? String(debt.cycles[0].feesPortion) : '');
    const rt = (debt.recurringType as RecurringType) || 'onetime';
    setRecurTypeInput(RECUR_TYPES.includes(rt) ? rt : 'onetime');
    const d = debt.dueDate || {};
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

    let dueDate: Record<string, any> = {};
    if (recurTypeInput === 'onetime') {
      const trimmedDate = onetimeDateInput.trim();
      if (trimmedDate && !/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
        setErrorMsg('Enter the date as YYYY-MM-DD, e.g. 2026-08-25.');
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

    const nextDue = getNextDueDate(recurTypeInput, dueDate);
    const nextDueISO = nextDue
      ? nextDue.getFullYear() + '-' + String(nextDue.getMonth() + 1).padStart(2, '0') + '-' + String(nextDue.getDate()).padStart(2, '0')
      : '';

    const updated: HouseholdModel = { ...model, debts: [...model.debts] };

    if (editingId) {
      updated.debts = updated.debts.map((d) => {
        if (d.id !== editingId) return d;
        const parsedFeesPortion = feesPortionInput.trim() === '' ? ('' as const) : parseFloat(feesPortionInput);
        const existingCycle = d.cycles[0];
        const cycle = existingCycle
          ? { ...existingCycle, dueDate: nextDueISO, amountDue: parsedAmount, paymentMethod: paymentMethodInput, feesPortion: parsedFeesPortion }
          : { id: makeId('cycle'), dueDate: nextDueISO, amountDue: parsedAmount, amountPaid: '' as const, paidDate: '', notes: '', paymentMethod: paymentMethodInput, feesPortion: parsedFeesPortion };
        return {
          ...d,
          creditorOrPerson: trimmedCreditor,
          category: categoryInput.trim(),
          notes: notesInput,
          interestRate: parsedInterest,
          minPayment: parsedMinPayment,
          recurringType: recurTypeInput,
          dueDate,
          cycles: [cycle],
        };
      });
    } else {
      const newDebt: Debt = {
        id: makeId('debt'),
        creditorOrPerson: trimmedCreditor,
        category: categoryInput.trim(),
        recurringType: recurTypeInput,
        dueDate,
        cycles: [
          {
            id: makeId('cycle'),
            dueDate: nextDueISO,
            amountDue: parsedAmount,
            amountPaid: '',
            paidDate: '',
            notes: '',
            paymentMethod: paymentMethodInput,
            feesPortion: feesPortionInput.trim() === '' ? '' : parseFloat(feesPortionInput),
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

  async function performDelete() {
    if (!editingId || !model) return;
    const updated: HouseholdModel = {
      ...model,
      debts: model.debts.filter((d) => d.id !== editingId),
    };
    await saveModel(updated);
    closeModal();
  }

  function handleDelete() {
    Alert.alert(
      'Delete this debt?',
      'This will permanently delete the debt and its payment history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: performDelete },
      ]
    );
  }

  const debts = sortByNextDue(model.debts);
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

        {debts.map((debt) => {
          const nextDue = getNextDueDate(debt.recurringType, debt.dueDate);
          const firstCycle = debt.cycles && debt.cycles[0];
          const pm = firstCycle ? firstCycle.paymentMethod : undefined;
          const fees = firstCycle ? firstCycle.feesPortion : undefined;
          const isExpanded = expandedDebtId === debt.id;

          return (
            <CollapsibleRow
              key={debt.id}
              testID={`debt-row-${debt.id}`}
              isExpanded={isExpanded}
              onToggle={() => setExpandedDebtId((prev) => (prev === debt.id ? null : debt.id))}
              onEdit={() => openEditModal(debt)}
              collapsedContent={
                <View style={styles.debtCollapsedRow}>
                  <View style={styles.debtRowMain}>
                    <Text style={styles.debtName} numberOfLines={1}>
                      {debt.creditorOrPerson || 'Untitled debt'}
                    </Text>
                    <Text style={styles.debtSub} numberOfLines={1}>
                      {(debt.category || 'Uncategorized')} · {recurringTypeLabel(debt.recurringType)} · {formatShortDate(nextDue)}
                      {typeof debt.interestRate === 'number' ? ' · ' + debt.interestRate + '% APR' : ''}
                    </Text>
                  </View>
                  <Text style={styles.debtAmount}>{formatPeso(debtAmount(debt))}</Text>
                </View>
              }
              expandedContent={
                <View style={styles.detailContainer}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Schedule</Text>
                    <Text style={styles.detailValue}>{fullRecurrenceDetail(debt)}</Text>
                  </View>

                  {typeof debt.minPayment === 'number' && debt.minPayment > 0 && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Min Payment</Text>
                      <Text style={styles.detailValue}>{formatPeso(debt.minPayment)}</Text>
                    </View>
                  )}

                  {typeof debt.interestRate === 'number' && debt.interestRate > 0 && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Interest Rate</Text>
                      <Text style={styles.detailValue}>{debt.interestRate}% APR</Text>
                    </View>
                  )}

                  {typeof fees === 'number' && fees > 0 && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Fees Portion</Text>
                      <Text style={styles.detailValue}>{formatPeso(fees)}</Text>
                    </View>
                  )}

                  {pm && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Payment Method</Text>
                      <Text style={styles.detailValue}>{paymentMethodLabel(pm, model)}</Text>
                    </View>
                  )}

                  {!!debt.notes?.trim() && (
                    <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
                      <Text style={styles.detailLabel}>Notes</Text>
                      <Text style={styles.detailNotesText}>{debt.notes.trim()}</Text>
                    </View>
                  )}
                </View>
              }
            />
          );
        })}

        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>+ Add debt</Text>
        </TouchableOpacity>
      </ScrollView>

      <BottomSheet
        visible={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Edit debt' : 'New debt'}
      >
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
                  <DateField
                    label="Due date"
                    value={onetimeDateInput}
                    onChange={setOnetimeDateInput}
                    placeholder="2026-08-25"
                    clearable
                    testID="debt-due-date-field"
                  />
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

                <Text style={styles.inputLabel}>Fees included in this payment (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. late fee or interest charged"
                  placeholderTextColor={colors.inkFaint}
                  keyboardType="decimal-pad"
                  value={feesPortionInput}
                  onChangeText={setFeesPortionInput}
                />

                <PaymentMethodPicker
                  value={paymentMethodInput}
                  onChange={setPaymentMethodInput}
                  debitAccounts={model.balanceAccounts.debit}
                  creditAccounts={model.balanceAccounts.credit}
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
    balanceBannerAmount: { fontSize: 22, fontWeight: '700', color: colors.orange },
    emptyText: { fontSize: 12, color: colors.inkFaint, marginBottom: 12, fontStyle: 'italic' },
    debtCollapsedRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flex: 1,
    },
    debtRowMain: { flex: 1, marginRight: 10 },
    debtName: { fontSize: 14, fontWeight: '600', color: colors.ink },
    debtSub: { fontSize: 11.5, color: colors.inkDim, marginTop: 2 },
    debtAmount: { fontSize: 14, fontWeight: '600', color: colors.orange },
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
