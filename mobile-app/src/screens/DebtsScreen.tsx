import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import { useToPayAddRequest } from '../fabActions';
import { SheetBar, BigAmount, FormGroup, InputRow, AmountRow, PickerRow, Footnote, Choices, AccountChoices, accountName, useOpenRow, repeatLabel, REPEAT_CHOICES, scheduleLabel, nextDateFor, nextDateText, ScheduleChoices, InlineField, InlineAmount } from '../components/SimpleForm';
import { paymentMethodColor } from '../components/CardFace';
const DEBT_TYPES = ['Credit card', 'Lending app', 'Family or friend', 'Personal loan', 'Other'];
import PayRow from '../components/PayRow';
import { useNavigation } from '@react-navigation/native';
import { currentCycle, withEditedCurrentCycle } from '../billPayments';
import { useData } from '../DataContext';
import { PullToRefreshScrollView } from '../PullToRefreshScrollView';
import { formatPeso } from '../balanceProjection';
import { getNextDueDate, formatShortDate, recurringTypeLabel, RecurringType } from '../recurrence';
import type { Debt, HouseholdModel, PaymentMethod } from '../types';
import PaymentMethodPicker from '../components/PaymentMethodPicker';
import BottomSheet from '../components/BottomSheet';
import CollapsibleRow from '../components/CollapsibleRow';
import SwipeableRow from '../components/SwipeableRow';
import { makeId } from '../utils';
import DateField from '../components/DateField';
import Pill from '../components/Pill';
import Button from '../components/Button';
import Card from '../components/Card';
import AmountInput from '../components/AmountInput';
import GradientFill from '../components/GradientFill';

function debtAmount(debt: Debt): number {
  // Redesign: the amount of the cycle that's due next (paid cycles are history).
  const first = currentCycle(debt);
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

type DebtsScreenProps = {
  openDebtId?: string;
  openDebtNonce?: number;
};

export default function DebtsScreen({ openDebtId, openDebtNonce }: DebtsScreenProps = {}) {
  // Redesign: the floating + adds a debt while this list is showing.
  useToPayAddRequest('debts', () => openAddModal());
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { model, saveModel } = useData();
  const styles = makeStyles(colors);

  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const openedDebtRef = useRef<{ id: string; nonce?: number } | undefined>(undefined);
  useEffect(() => {
    if (!model || !openDebtId) return;
    const prev = openedDebtRef.current;
    if (prev && prev.id === openDebtId && prev.nonce === openDebtNonce) return;
    const target = (model.debts || []).find((d) => d.id === openDebtId);
    if (target) {
      openedDebtRef.current = { id: openDebtId, nonce: openDebtNonce };
      openEditModal(target);
    }
  }, [model, openDebtId, openDebtNonce]);
  const [creditorInput, setCreditorInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [amountInput, setAmountInput] = useState<number | ''>('');
  const [interestRateInput, setInterestRateInput] = useState('');
  const [minPaymentInput, setMinPaymentInput] = useState<number | ''>('');
  const [feesPortionInput, setFeesPortionInput] = useState<number | ''>('');
  const [notesInput, setNotesInput] = useState('');
  const [paymentMethodInput, setPaymentMethodInput] = useState<PaymentMethod | undefined>(undefined);
  const [recurTypeInput, setRecurTypeInput] = useState<RecurringType>('onetime');
  const [onetimeDateInput, setOnetimeDateInput] = useState('');
  const [dayInput, setDayInput] = useState('');
  const [monthInput, setMonthInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [openRow, toggleRow] = useOpenRow(modalOpen);
  const debtNext = nextDateFor(recurTypeInput, onetimeDateInput, dayInput, monthInput);
  const debtMonths =
    recurTypeInput === 'monthly' && typeof amountInput === 'number' && typeof minPaymentInput === 'number' && minPaymentInput > 0 && amountInput > minPaymentInput
      ? Math.ceil(amountInput / minPaymentInput)
      : 0;
  const debtFootnote = [
    nextDateText(recurTypeInput === 'onetime' ? 'Due' : 'Next payment', debtNext),
    debtMonths ? `At ${formatPeso(minPaymentInput as number)} a month it's paid off in about ${debtMonths} months.` : '',
  ].filter(Boolean).join(' ');

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
    setAmountInput(debtAmount(debt) === 0 ? '' : debtAmount(debt));
    setInterestRateInput(
      typeof debt.interestRate === 'number' ? String(debt.interestRate) : ''
    );
    setMinPaymentInput(
      typeof debt.minPayment === 'number' ? debt.minPayment : ''
    );
    setNotesInput(debt.notes || '');
    const cur = currentCycle(debt);
    setPaymentMethodInput(cur?.paymentMethod);
    setFeesPortionInput(cur && cur.feesPortion !== undefined && cur.feesPortion !== '' ? cur.feesPortion : '');
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
      setErrorMsg('Enter who this debt is owed to.');
      return;
    }
    const parsedAmount = amountInput === '' ? 0 : amountInput;

    let dueDate: Record<string, any> = {};
    if (recurTypeInput === 'onetime') {
      const trimmedDate = onetimeDateInput.trim();
      if (trimmedDate && !/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
        setErrorMsg('Enter date as YYYY-MM-DD.');
        return;
      }
      dueDate = { date: trimmedDate };
    } else if (recurTypeInput === 'monthly') {
      const dayNum = parseInt(dayInput, 10);
      if (dayInput.trim() && (isNaN(dayNum) || dayNum < 1 || dayNum > 31)) {
        setErrorMsg('Enter a day between 1 and 31.');
        return;
      }
      dueDate = { day: dayInput.trim() };
    } else if (recurTypeInput === 'annual') {
      const dayNum = parseInt(dayInput, 10);
      const monthNum = parseInt(monthInput, 10);
      if (dayInput.trim() && (isNaN(dayNum) || dayNum < 1 || dayNum > 31)) {
        setErrorMsg('Enter a day between 1 and 31.');
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
        setErrorMsg('Enter a valid interest rate.');
        return;
      }
      parsedInterest = n;
    }
    const parsedMinPayment: number | '' = minPaymentInput === '' ? '' : minPaymentInput;

    const nextDue = getNextDueDate(recurTypeInput, dueDate);
    const nextDueISO = nextDue
      ? nextDue.getFullYear() + '-' + String(nextDue.getMonth() + 1).padStart(2, '0') + '-' + String(nextDue.getDate()).padStart(2, '0')
      : '';

    const updated: HouseholdModel = { ...model, debts: [...model.debts] };

    if (editingId) {
      updated.debts = updated.debts.map((d) => {
        if (d.id !== editingId) return d;
        const parsedFeesPortion = feesPortionInput === '' ? ('' as const) : feesPortionInput;
        // Redesign: keep paid history; only the current cycle changes.
        const scheduleChanged = d.recurringType !== recurTypeInput || JSON.stringify(d.dueDate || {}) !== JSON.stringify(dueDate);
        const cycles = withEditedCurrentCycle(d.cycles, { amountDue: parsedAmount, paymentMethod: paymentMethodInput, feesPortion: parsedFeesPortion }, nextDueISO, scheduleChanged);
        return {
          ...d,
          creditorOrPerson: trimmedCreditor,
          category: categoryInput.trim(),
          notes: notesInput,
          interestRate: parsedInterest,
          minPayment: parsedMinPayment,
          recurringType: recurTypeInput,
          dueDate,
          cycles,
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
            feesPortion: feesPortionInput === '' ? '' : feesPortionInput,
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

  async function performDelete() {
    if (!editingId || !model) return;
    const updated: HouseholdModel = {
      ...model,
      debts: model.debts.filter((d) => d.id !== editingId),
    };
    setSaving(true);
    try {
      await saveModel(updated);
      closeModal();
    } catch (e) {
      setErrorMsg('Failed to delete. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert(
      'Delete this debt?',
      'Deletes the debt and all payment history. Cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: performDelete },
      ]
    );
  }

  async function performDeleteById(id: string) {
    if (!model) return;
    const updated: HouseholdModel = {
      ...model,
      debts: model.debts.filter((d) => d.id !== id),
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

  function handleSwipeDelete(debt: Debt) {
    Alert.alert(
      'Delete this debt?',
      'Deletes the debt and all payment history. Cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => performDeleteById(debt.id) },
      ]
    );
  }

  const debts = sortByNextDue(model.debts);
  const totalOwed = debts.reduce((sum, d) => sum + debtAmount(d), 0);

  return (
    <SafeAreaView style={styles.container}>
      <PullToRefreshScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.group, styles.summaryCard]}>
          <GradientFill match={[styles.group, styles.summaryCard]} />
          <Text style={styles.balanceBannerLabel}>Total debt logged</Text>
          <Text style={styles.balanceBannerAmount}>{formatPeso(totalOwed)}</Text>
        </View>

        {debts.length === 0 && (
          <Text style={styles.emptyText}>No debts yet.</Text>
        )}

        {debts.length > 0 && (
        <View style={[styles.group, styles.section]}>
          <GradientFill match={[styles.group, styles.section]} />
        {debts.map((debt, rowIndex) => {
          const nextDue = getNextDueDate(debt.recurringType, debt.dueDate);
          const firstCycle = debt.cycles && debt.cycles[0];
          const pm = firstCycle ? firstCycle.paymentMethod : undefined;
          const fees = firstCycle ? firstCycle.feesPortion : undefined;
          const isExpanded = expandedDebtId === debt.id;

          return (
            <SwipeableRow
              key={debt.id}
              enabled={Boolean(model.settings.swipeToDeleteEnabled)}
              onDelete={() => handleSwipeDelete(debt)}
              testID={`debt-swipe-${debt.id}`}
              flat
            >
            <PayRow
              testID={`debt-row-${debt.id}`}
              icon="people-outline"
              title={debt.creditorOrPerson || 'Debt'}
              sub={(() => {
                const cur = currentCycle(debt);
                const d = cur?.dueDate ? new Date(cur.dueDate + 'T00:00:00') : nextDue;
                return d ? `Due ${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}` : 'No date set';
              })()}
              amount={formatPeso(debtAmount(debt))}
              amountColor={colors.negative}
              divider={rowIndex > 0}
              onPress={() => navigation.navigate('PayDetail', { kind: 'debt', id: debt.id })}
            />
            </SwipeableRow>
          );
        })}
        </View>
        )}

      </PullToRefreshScrollView>

      {/* Approved "Option 2: simple" form (Forms Redesign canvas). */}
      <BottomSheet
        visible={modalOpen}
        onClose={closeModal}
        grouped
        header={<SheetBar title={editingId ? 'Edit debt' : 'New debt'} onCancel={closeModal} onDone={handleSave} doneLabel={editingId ? 'Save' : 'Add'} busy={saving} />}
      >
        <BigAmount label="Amount owed" value={amountInput} onChange={setAmountInput} color={colors.negative} autoFocus={!editingId} />

        <FormGroup>
          <InputRow label="Owed to" value={creditorInput} onChangeText={setCreditorInput} placeholder="e.g. BDO, Ate Fely" testID="debt-creditor-input" />
          <PickerRow label="Type" value={categoryInput || 'Choose'} open={openRow === 'type'} onToggle={() => toggleRow('type')}>
            <Choices options={DEBT_TYPES.map((c) => ({ id: c, label: c }))} value={categoryInput as any} onChange={(c) => setCategoryInput(c)} />
            <View style={{ height: 10 }} />
            <InlineField label="Or type your own" value={DEBT_TYPES.includes(categoryInput) ? '' : categoryInput} onChangeText={setCategoryInput} />
          </PickerRow>
          <AmountRow label="Pay at least" value={minPaymentInput} onChange={setMinPaymentInput} />
          <PickerRow label="Repeats" value={repeatLabel(recurTypeInput)} open={openRow === 'repeat'} onToggle={() => toggleRow('repeat')}>
            <Choices options={REPEAT_CHOICES} value={recurTypeInput} onChange={(v) => setRecurTypeInput(v as RecurringType)} />
          </PickerRow>
          <PickerRow label="Due on" value={scheduleLabel(recurTypeInput, onetimeDateInput, dayInput, monthInput)} open={openRow === 'due'} onToggle={() => toggleRow('due')}>
            <ScheduleChoices rt={recurTypeInput} date={onetimeDateInput} onDate={setOnetimeDateInput} day={dayInput} onDay={setDayInput} month={monthInput} onMonth={setMonthInput} testID="debt-due-date-field" />
          </PickerRow>
          <PickerRow label="Paid from" value={accountName(model, paymentMethodInput) ?? 'Choose'} dot={paymentMethodInput ? paymentMethodColor(model, paymentMethodInput) : null} open={openRow === 'account'} onToggle={() => toggleRow('account')}>
            <AccountChoices model={model} value={paymentMethodInput} onChange={setPaymentMethodInput} optional />
          </PickerRow>
        </FormGroup>

        <FormGroup>
          <PickerRow label="More details" value={[interestRateInput ? 'Interest' : '', feesPortionInput !== '' ? 'Fees' : '', notesInput ? 'Note' : ''].filter(Boolean).join(', ') || 'Interest, note'} open={openRow === 'more'} onToggle={() => toggleRow('more')}>
            <InlineField label="Interest (% a year)" value={interestRateInput} onChangeText={setInterestRateInput} placeholder="e.g. 24" keyboardType="decimal-pad" />
            <InlineAmount label="Fees in this amount (late fee or interest charged)" value={feesPortionInput} onChange={setFeesPortionInput} />
            <InlineField label="Note" value={notesInput} onChangeText={setNotesInput} placeholder="Optional" multiline />
          </PickerRow>
        </FormGroup>

        {!!debtFootnote && <Footnote>{debtFootnote}</Footnote>}
        {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
        {editingId && <Button label="Delete debt" variant="destructive" onPress={handleDelete} />}
      </BottomSheet>
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
    scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 96 },
    // Redesign styles
    group: { backgroundColor: colors.navy3, borderRadius: 12, overflow: 'hidden' },
    summaryCard: { padding: 16, marginBottom: 20 },
    section: { marginBottom: 20 },
    tile: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    balanceBannerLabel: { fontSize: 13, color: colors.inkDim, marginBottom: 2 },
    balanceBannerAmount: { fontSize: 22, fontWeight: '700', color: colors.negative },
    emptyText: { fontSize: 15, color: colors.inkDim, marginBottom: 12, textAlign: 'center' },
    debtCollapsedRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flex: 1,
    },
    debtRowMain: { flex: 1, marginRight: 10 },
    debtName: { fontSize: 17, fontWeight: '500', color: colors.ink },
    debtSub: { fontSize: 13, color: colors.inkDim, marginTop: 1 },
    debtAmount: { fontSize: 17, fontWeight: '600', color: colors.negative },
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
    addButtonText: { fontSize: 15, fontWeight: '600', color: colors.gold },
    inputLabel: {
      // Redesign: sentence-case grey labels, like iPhone forms.
      fontSize: 13,
      fontWeight: '600',
      marginLeft: 4,
      color: colors.inkDim,
      marginBottom: 6,
    },
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
    amountInput: {
      backgroundColor: colors.navy2,
    },
    notesInput: { minHeight: 60, textAlignVertical: 'top' },
    row2: { flexDirection: 'row', gap: 10 },
    row2Item: { flex: 1 },
    pillRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
    errorText: { fontSize: 12, color: colors.error, marginBottom: 10 },
  });
}
