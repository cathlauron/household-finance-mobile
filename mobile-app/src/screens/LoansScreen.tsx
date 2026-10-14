import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import { useToPayAddRequest } from '../fabActions';
import PayRow from '../components/PayRow';
import { useNavigation } from '@react-navigation/native';
import { useData } from '../DataContext';
import { PullToRefreshScrollView } from '../PullToRefreshScrollView';
import { formatPeso } from '../balanceProjection';
import { getNextDueDate, formatShortDate, recurringTypeLabel, RecurringType } from '../recurrence';
import type { Loan, HouseholdModel, LoanPayment, PaymentMethod } from '../types';
import LoanPayoffSimulatorModal, { SimLoanInput } from './LoanPayoffSimulatorModal';
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

function loanPaidTotal(loan: Loan): number {
  return loan.actualPayments.reduce((sum, p) => {
    return sum + (typeof p.actual === 'number' ? p.actual : 0);
  }, 0);
}

function loanTotal(loan: Loan): number {
  return typeof loan.totalAmount === 'number' ? loan.totalAmount : 0;
}


function paymentMethodLabel(pm: PaymentMethod | undefined, model: HouseholdModel): string {
  if (!pm) return 'Not set';
  if (pm.type === 'cash') return 'Cash';
  const list = pm.type === 'debit' ? model.balanceAccounts.debit : model.balanceAccounts.credit;
  const acct = list.find((a) => a.id === pm.accountId);
  const label = pm.type === 'debit' ? 'Debit' : 'Credit';
  return acct ? `${label} — ${acct.name || 'Unnamed'}` : label;
}

function fullRecurrenceDetail(loan: Loan): string {
  const rt = (loan.recurringType as RecurringType) || 'onetime';
  const d = loan.dueDate || {};
  if (rt === 'monthly') {
    return d.day ? `Every month on day ${d.day}` : 'Monthly';
  }
  if (rt === 'annual') {
    if (d.month && d.day) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mName = monthNames[(d.month as number) - 1] || `Month ${d.month}`;
      return `Every year on ${mName} ${d.day}`;
    }
    return d.day ? `Every year on day ${d.day}` : 'Annual';
  }
  if (rt === 'onetime') {
    return d.date ? `One-time: due ${d.date}` : 'One-time loan';
  }
  if (rt === 'custom') {
    const freq = loan.customFreq ? loan.customFreq.charAt(0).toUpperCase() + loan.customFreq.slice(1) : 'Custom schedule';
    const start = loan.customStartDate ? `, starting ${loan.customStartDate}` : '';
    const count = typeof loan.customOccurrenceCount === 'number' && loan.customOccurrenceCount > 0
      ? ` (${loan.customOccurrenceCount} payments)`
      : '';
    return `${freq}${start}${count}`;
  }
  return recurringTypeLabel(rt);
}

const RECUR_TYPES: RecurringType[] = ['onetime', 'monthly', 'annual', 'custom'];

// Sorts loans by next due date (soonest first); loans with no computable due date yet
// (e.g. saved before Checkpoint 5.4c, or never given a date) sort to the bottom.
function sortByNextDue(loans: Loan[]): Loan[] {
  return [...loans].sort((a, b) => {
    const da = getNextDueDate(
      (a.recurringType as RecurringType) || 'onetime',
      a.dueDate || {},
      new Date(),
      a.customStartDate,
      a.customFreq,
      a.customOccurrenceCount
    );
    const db = getNextDueDate(
      (b.recurringType as RecurringType) || 'onetime',
      b.dueDate || {},
      new Date(),
      b.customStartDate,
      b.customFreq,
      b.customOccurrenceCount
    );
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da.getTime() - db.getTime();
  });
}

type LoansScreenProps = {
  openLoanId?: string;
  openLoanNonce?: number;
};

export default function LoansScreen({ openLoanId, openLoanNonce }: LoansScreenProps = {}) {
  // Redesign: the floating + adds a loan while this list is showing.
  useToPayAddRequest('loans', () => openAddModal());
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { model, saveModel } = useData();
  const styles = makeStyles(colors);

  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const openedLoanRef = useRef<{ id: string; nonce?: number } | undefined>(undefined);
  useEffect(() => {
    if (!model || !openLoanId) return;
    const prev = openedLoanRef.current;
    if (prev && prev.id === openLoanId && prev.nonce === openLoanNonce) return;
    const target = (model.loans || []).find((l) => l.id === openLoanId);
    if (target) {
      openedLoanRef.current = { id: openLoanId, nonce: openLoanNonce };
      openEditModal(target);
    }
  }, [model, openLoanId, openLoanNonce]);
  const [nameInput, setNameInput] = useState('');
  const [loanTypeInput, setLoanTypeInput] = useState('');
  const [directionInput, setDirectionInput] = useState<'borrowed' | 'lent'>('borrowed');
  const [totalAmountInput, setTotalAmountInput] = useState<number | ''>('');
  const [expectedPaymentInput, setExpectedPaymentInput] = useState<number | ''>('');
  const [interestRateInput, setInterestRateInput] = useState('');
  const [recurTypeInput, setRecurTypeInput] = useState<RecurringType>('onetime');
  const [onetimeDateInput, setOnetimeDateInput] = useState('');
  const [dayInput, setDayInput] = useState('');
  const [monthInput, setMonthInput] = useState('');
  const [customFreqInput, setCustomFreqInput] = useState('monthly');
  const [customStartDateInput, setCustomStartDateInput] = useState('');
  const [customOccurrenceInput, setCustomOccurrenceInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [paymentsInput, setPaymentsInput] = useState<LoanPayment[]>([]);
  const [newPaymentDate, setNewPaymentDate] = useState('');
  const [newPaymentAmount, setNewPaymentAmount] = useState<number | ''>('');
  const [newPaymentMethod, setNewPaymentMethod] = useState<PaymentMethod | undefined>(undefined);
  const [paymentError, setPaymentError] = useState('');
  const [saving, setSaving] = useState(false);

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
    setLoanTypeInput('');
    setDirectionInput('borrowed');
    setTotalAmountInput('');
    setExpectedPaymentInput('');
    setInterestRateInput('');
    setRecurTypeInput('onetime');
    setOnetimeDateInput('');
    setDayInput('');
    setMonthInput('');
    setCustomFreqInput('monthly');
    setCustomStartDateInput('');
    setCustomOccurrenceInput('');
    setErrorMsg('');
    setPaymentsInput([]);
    setNewPaymentDate('');
    setNewPaymentAmount('');
    setNewPaymentMethod(undefined);
    setPaymentError('');
    setModalOpen(true);
  }

  function openEditModal(loan: Loan) {
    setEditingId(loan.id);
    setNameInput(loan.name);
    setLoanTypeInput(loan.loanType || '');
    setDirectionInput(loan.direction === 'lent' ? 'lent' : 'borrowed');
    setTotalAmountInput(loanTotal(loan) === 0 ? '' : loanTotal(loan));
    setExpectedPaymentInput(
      typeof loan.expectedPayment === 'number' ? loan.expectedPayment : ''
    );
    setInterestRateInput(typeof loan.interestRate === 'number' ? String(loan.interestRate) : '');
    const rt = (loan.recurringType as RecurringType) || 'onetime';
    setRecurTypeInput(RECUR_TYPES.includes(rt) ? rt : 'onetime');
    const d = loan.dueDate || {};
    setOnetimeDateInput(d.date || '');
    setDayInput(d.day ? String(d.day) : '');
    setMonthInput(d.month ? String(d.month) : '');
    setCustomFreqInput(loan.customFreq || 'monthly');
    setCustomStartDateInput(loan.customStartDate || '');
    setCustomOccurrenceInput(
      typeof loan.customOccurrenceCount === 'number' ? String(loan.customOccurrenceCount) : ''
    );
    setErrorMsg('');
    setPaymentsInput(loan.actualPayments || []);
    setNewPaymentDate('');
    setNewPaymentAmount('');
    setNewPaymentMethod(undefined);
    setPaymentError('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setErrorMsg('');
  }

  function handleAddPayment() {
    const trimmedDate = newPaymentDate.trim();
    if (!trimmedDate || !/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
      setPaymentError('Enter date as YYYY-MM-DD.');
      return;
    }
    if (newPaymentAmount === '' || newPaymentAmount <= 0) {
      setPaymentError('Enter a valid amount paid.');
      return;
    }
    const newPayment: LoanPayment = {
      id: makeId('lpay'),
      date: trimmedDate,
      actual: newPaymentAmount,
      paymentMethod: newPaymentMethod,
    };
    setPaymentsInput([newPayment, ...paymentsInput]);
    setNewPaymentDate('');
    setNewPaymentAmount('');
    setNewPaymentMethod(undefined);
    setPaymentError('');
  }

  function handleRemovePayment(paymentId: string) {
    setPaymentsInput(paymentsInput.filter((p) => p.id !== paymentId));
  }

  async function handleSave() {
    if (!model) return;
    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      setErrorMsg('Enter a name for this loan.');
      return;
    }
    const parsedTotal: number | '' = totalAmountInput === '' ? '' : totalAmountInput;
    const parsedExpected: number | '' = expectedPaymentInput === '' ? '' : expectedPaymentInput;
    let parsedRate: number | '' = '';
    if (interestRateInput.trim() !== '') {
      const n = parseFloat(interestRateInput);
      if (isNaN(n)) {
        setErrorMsg('Enter a valid interest rate.');
        return;
      }
      parsedRate = n;
    }

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

    let parsedOccurrenceCount: number | '' = '';
    if (recurTypeInput === 'custom') {
      const trimmedStart = customStartDateInput.trim();
      if (!trimmedStart || !/^\d{4}-\d{2}-\d{2}$/.test(trimmedStart)) {
        setErrorMsg('Enter start date as YYYY-MM-DD.');
        return;
      }
      if (customOccurrenceInput.trim()) {
        const n = parseInt(customOccurrenceInput, 10);
        if (isNaN(n) || n <= 0) {
          setErrorMsg('Occurrences must be a positive number.');
          return;
        }
        parsedOccurrenceCount = n;
      }
    }

    const updated: HouseholdModel = { ...model, loans: [...model.loans] };

    if (editingId) {
      updated.loans = updated.loans.map((l) => {
        if (l.id !== editingId) return l;
        return {
          ...l,
          name: trimmedName,
          loanType: loanTypeInput.trim(),
          direction: directionInput,
          totalAmount: parsedTotal,
          expectedPayment: parsedExpected,
          interestRate: parsedRate,
          recurringType: recurTypeInput,
          dueDate,
          customFreq: recurTypeInput === 'custom' ? customFreqInput : undefined,
          customStartDate: recurTypeInput === 'custom' ? customStartDateInput.trim() : undefined,
          customOccurrenceCount: recurTypeInput === 'custom' ? parsedOccurrenceCount : undefined,
          actualPayments: paymentsInput,
        };
      });
    } else {
      const newLoan: Loan = {
        id: makeId('loan'),
        name: trimmedName,
        loanType: loanTypeInput.trim(),
        totalAmount: parsedTotal,
        expectedPayment: parsedExpected,
        interestRate: parsedRate,
        actualPayments: [],
        owner: 'shared',
        direction: directionInput,
        recurringType: recurTypeInput,
        dueDate,
        customFreq: recurTypeInput === 'custom' ? customFreqInput : undefined,
        customStartDate: recurTypeInput === 'custom' ? customStartDateInput.trim() : undefined,
        customOccurrenceCount: recurTypeInput === 'custom' ? parsedOccurrenceCount : undefined,
        createdAt: Date.now(),
      };
      updated.loans = [...updated.loans, newLoan];
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
      loans: model.loans.filter((l) => l.id !== editingId),
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

  function handleDelete() {
    Alert.alert(
      'Delete this loan?',
      'Deletes the loan and all payment history. Cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: performDelete },
      ]
    );
  }

  async function performDeleteLoanById(id: string) {
    if (!model) return;
    const updated: HouseholdModel = {
      ...model,
      loans: model.loans.filter((l) => l.id !== id),
    };
    setSaving(true);
    try {
      await saveModel(updated);
    } catch (e) {
      setErrorMsg('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleSwipeDelete(loan: Loan) {
    Alert.alert(
      'Delete this loan?',
      'Deletes the loan and all payment history. Cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => performDeleteLoanById(loan.id) },
      ]
    );
  }

  const loans = sortByNextDue(model.loans);
  const totalBorrowed = loans
    .filter((l) => l.direction !== 'lent')
    .reduce((sum, l) => sum + (loanTotal(l) - loanPaidTotal(l)), 0);

  // Only borrowed loans with a real remaining balance are worth simulating — a "lent" loan
  // (money owed to you) or a fully-paid loan wouldn't make sense in a payoff projection.
  const simLoans: SimLoanInput[] = loans
    .filter((l) => l.direction !== 'lent')
    .map((l) => {
      const balance = Math.max(0, loanTotal(l) - loanPaidTotal(l));
      return {
        id: l.id,
        name: l.name || 'Untitled loan',
        balance,
        rate: typeof l.interestRate === 'number' ? l.interestRate : 0,
        hasRate: typeof l.interestRate === 'number',
        minPayment: typeof l.expectedPayment === 'number' ? l.expectedPayment : 0,
        hasMinPayment: typeof l.expectedPayment === 'number' && l.expectedPayment > 0,
      };
    })
    .filter((l) => l.balance > 0.01);

  return (
    <SafeAreaView style={styles.container}>
      <PullToRefreshScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.group, styles.summaryRow]}>
          <View style={styles.summaryCell}>
            <Text style={styles.balanceBannerLabel}>You owe (borrowed)</Text>
            <Text style={[styles.balanceBannerAmount, { color: colors.negative }]}>{formatPeso(Math.max(0, totalBorrowed))}</Text>
          </View>
          <View style={[styles.summaryCell, styles.summaryDivider]}>
            <Text style={styles.balanceBannerLabel}>Owed to you (lent)</Text>
            <Text style={[styles.balanceBannerAmount, { color: colors.positive }]}>
              {formatPeso(Math.max(0, loans.filter((l) => l.direction === 'lent').reduce((sum, l) => sum + (loanTotal(l) - loanPaidTotal(l)), 0)))}
            </Text>
          </View>
        </View>

        {simLoans.length > 0 && (
          <TouchableOpacity style={styles.simulatorButton} onPress={() => setSimulatorOpen(true)}>
            <Ionicons name="stats-chart-outline" size={16} color={colors.gold} style={{ marginRight: 6 }} />
            <Text style={styles.simulatorButtonText}>View Payoff Simulator</Text>
          </TouchableOpacity>
        )}

        {loans.length === 0 ? (
          <Text style={styles.emptyText}>No loans yet.</Text>
        ) : (
          <View style={[styles.group, styles.section]}>
          {loans.map((loan, rowIndex) => {
            const remaining = Math.max(0, loanTotal(loan) - loanPaidTotal(loan));
            const isExpanded = expandedLoanId === loan.id;
            const loanRecurType = (loan.recurringType as RecurringType) || 'onetime';
            const loanNextDue = getNextDueDate(
              loanRecurType,
              loan.dueDate || {},
              new Date(),
              loan.customStartDate,
              loan.customFreq,
              loan.customOccurrenceCount
            );
            return (
              <SwipeableRow
                key={loan.id}
                enabled={Boolean(model.settings.swipeToDeleteEnabled)}
                onDelete={() => handleSwipeDelete(loan)}
                testID={`loan-swipe-${loan.id}`}
                flat
              >
              <PayRow
                testID={`loan-row-${loan.id}`}
                icon={loan.direction === 'lent' ? 'arrow-redo-outline' : 'business-outline'}
                title={loan.name || 'Untitled loan'}
                sub={`${loan.direction === 'lent' ? 'You lent' : 'You borrowed'}${loanNextDue ? ` · next ${loanNextDue.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}`}
                amount={formatPeso(remaining)}
                amountColor={loan.direction === 'lent' ? colors.positive : colors.negative}
                divider={rowIndex > 0}
                onPress={() => navigation.navigate('PayDetail', { kind: 'loan', id: loan.id })}
              />
              </SwipeableRow>
            );
          })}
          </View>
        )}

      </PullToRefreshScrollView>

      <BottomSheet
        visible={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Edit loan' : 'New loan'}
      >
                <Text style={styles.inputLabel}>Loan name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Car loan, Motorcycle loan"
                  placeholderTextColor={colors.inkFaint}
                  value={nameInput}
                  onChangeText={setNameInput}
                />

                <Text style={styles.inputLabel}>Loan type (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Car, Motorcycle, Personal, Home"
                  placeholderTextColor={colors.inkFaint}
                  value={loanTypeInput}
                  onChangeText={setLoanTypeInput}
                />

                <Text style={styles.inputLabel}>Direction</Text>
                <View style={styles.pillRow}>
                  <Pill
                    label="Borrowed"
                    tone="sheet"
                    fill
                    active={directionInput === 'borrowed'}
                    onPress={() => setDirectionInput('borrowed')}
                  />
                  <Pill
                    label="Lent"
                    tone="sheet"
                    fill
                    active={directionInput === 'lent'}
                    onPress={() => setDirectionInput('lent')}
                  />
                </View>

                <Text style={styles.inputLabel}>Total loan amount</Text>
                <AmountInput
                  style={styles.amountInput}
                  value={totalAmountInput}
                  onChangeAmount={setTotalAmountInput}
                />

                <Text style={styles.inputLabel}>Expected payment (optional)</Text>
                <AmountInput
                  style={styles.amountInput}
                  value={expectedPaymentInput}
                  onChangeAmount={setExpectedPaymentInput}
                />

                <Text style={styles.inputLabel}>Repeats</Text>
                <View style={styles.pillRow}>
                  {RECUR_TYPES.map((rt) => (
                    <Pill
                      key={rt}
                      label={recurringTypeLabel(rt)}
                      tone="sheet"
                      fill
                      minWidth={80}
                      active={recurTypeInput === rt}
                      onPress={() => setRecurTypeInput(rt)}
                    />
                  ))}
                </View>

                {recurTypeInput === 'onetime' && (
                  <DateField
                    label="Due date"
                    value={onetimeDateInput}
                    onChange={setOnetimeDateInput}
                    placeholder="2026-08-25"
                    clearable
                    testID="loan-due-date-field"
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

                {recurTypeInput === 'custom' && (
                  <>
                    <Text style={styles.inputLabel}>Frequency</Text>
                    <View style={styles.pillRow}>
                      {['daily', 'weekly', 'biweekly', 'monthly', 'yearly'].map((freq) => (
                        <Pill
                          key={freq}
                          label={freq.charAt(0).toUpperCase() + freq.slice(1)}
                          tone="sheet"
                          fill
                          minWidth={80}
                          active={customFreqInput === freq}
                          onPress={() => setCustomFreqInput(freq)}
                        />
                      ))}
                    </View>

                    <DateField
                      label="Starts on"
                      value={customStartDateInput}
                      onChange={setCustomStartDateInput}
                      placeholder="2026-08-25"
                      testID="loan-start-date-field"
                    />

                    <Text style={styles.inputLabel}>Occurrences (optional)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 12"
                      placeholderTextColor={colors.inkFaint}
                      keyboardType="number-pad"
                      value={customOccurrenceInput}
                      onChangeText={setCustomOccurrenceInput}
                    />
                  </>
                )}

                <Text style={styles.inputLabel}>Annual interest rate (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 12"
                  placeholderTextColor={colors.inkFaint}
                  keyboardType="decimal-pad"
                  value={interestRateInput}
                  onChangeText={setInterestRateInput}
                />
                <Text style={styles.fieldHint}>
                  Used by Payoff Simulator. Defaults to 0% if blank.
                </Text>

                {editingId ? (
                  <View style={styles.paymentLogSection}>
                    <Text style={styles.inputLabel}>Payment log</Text>

                    {paymentsInput.length === 0 && (
                      <Text style={styles.emptyText}>No payments logged yet.</Text>
                    )}

                    {paymentsInput.map((p) => (
                      <View key={p.id} style={styles.paymentRow}>
                        <View style={styles.paymentRowMain}>
                          <Text style={styles.paymentRowDate}>{p.date}</Text>
                          <Text style={styles.paymentRowMethod}>{paymentMethodLabel(p.paymentMethod, model)}</Text>
                        </View>
                        <Text style={styles.paymentRowAmount}>
                          {formatPeso(typeof p.actual === 'number' ? p.actual : 0)}
                        </Text>
                        <TouchableOpacity onPress={() => handleRemovePayment(p.id)} style={styles.paymentRemoveBtn}>
                          <Ionicons name="close" size={14} color={colors.inkFaint} />
                        </TouchableOpacity>
                      </View>
                    ))}

                    <View style={styles.paymentAddBox}>
                      <Text style={styles.inputLabel}>Log a new payment</Text>
                      <DateField
                        label="Date"
                        value={newPaymentDate}
                        onChange={setNewPaymentDate}
                        placeholder="2026-08-25"
                        testID="loan-payment-date-field"
                      />
                      <Text style={styles.inputLabel}>Amount paid</Text>
                        <AmountInput
                          style={styles.amountInput}
                          value={newPaymentAmount}
                          onChangeAmount={setNewPaymentAmount}
                        />
                      <PaymentMethodPicker
                        value={newPaymentMethod}
                        onChange={setNewPaymentMethod}
                        debitAccounts={model.balanceAccounts.debit}
                        creditAccounts={model.balanceAccounts.credit}
                      />
                      {!!paymentError && <Text style={styles.errorText}>{paymentError}</Text>}
                      <TouchableOpacity style={styles.paymentAddButton} onPress={handleAddPayment}>
                        <Text style={styles.paymentAddButtonText}>+ Add payment</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.fieldHint}>
                    Save loan first to log payments.
                  </Text>
                )}

                {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

                <Button label="Save" onPress={handleSave} loading={saving} />

                {editingId && <Button label="Delete loan" variant="destructive" onPress={handleDelete} />}

                <Button label="Cancel" variant="quiet" onPress={closeModal} />
      </BottomSheet>

      <LoanPayoffSimulatorModal
        visible={simulatorOpen}
        onClose={() => setSimulatorOpen(false)}
        loans={simLoans}
        colors={colors}
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
    scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 96 },
    // Redesign styles
    group: { backgroundColor: colors.navy3, borderRadius: 12, overflow: 'hidden' },
    summaryCard: { padding: 16, marginBottom: 20 },
    section: { marginBottom: 20 },
    tile: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    summaryRow: { flexDirection: 'row', marginBottom: 12 },
    summaryCell: { flex: 1, paddingVertical: 12, paddingHorizontal: 16 },
    summaryDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.navy4 },
    balanceBannerLabel: { fontSize: 13, color: colors.inkDim, marginBottom: 2 },
    balanceBannerAmount: { fontSize: 20, fontWeight: '700', color: colors.ink },
    simulatorButton: {
      backgroundColor: colors.navy3,
      borderRadius: 10,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 18,
    },
    simulatorButtonText: { fontSize: 13.5, fontWeight: '700', color: colors.gold },
    emptyText: { fontSize: 15, color: colors.inkDim, marginBottom: 12, textAlign: 'center' },
    loanCollapsedWrap: {
      flex: 1,
    },
    loanRowTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    loanRowMain: { flex: 1, marginRight: 10 },
    loanName: { fontSize: 17, fontWeight: '500', color: colors.ink },
    loanSub: { fontSize: 13, color: colors.inkDim, marginTop: 1 },
    loanAmount: { fontSize: 17, fontWeight: '600', color: colors.ink },

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
    fieldHint: { fontSize: 11, color: colors.inkFaint, marginTop: -10, marginBottom: 14, lineHeight: 15 },
    paymentLogSection: {
      marginTop: 4,
      marginBottom: 14,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: colors.navy2,
    },
    paymentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.navy2,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 10,
      marginBottom: 8,
    },
    paymentRowMain: { flex: 1, marginRight: 8 },
    paymentRowDate: { fontSize: 12.5, fontWeight: '600', color: colors.ink },
    paymentRowMethod: { fontSize: 11, color: colors.inkDim, marginTop: 1 },
    paymentRowAmount: { fontSize: 12.5, fontWeight: '600', color: colors.ink, marginRight: 8 },
    paymentRemoveBtn: { paddingHorizontal: 6, paddingVertical: 2 },
    paymentRemoveBtnText: { fontSize: 13, color: colors.inkFaint },
    paymentAddBox: {
      backgroundColor: colors.navy2,
      borderRadius: 10,
      padding: 12,
      marginTop: 4,
    },
    paymentAddButton: {
      backgroundColor: colors.navy3,
      borderRadius: 999,
      paddingVertical: 10,
      alignItems: 'center',
      marginTop: 2,
    },
    paymentAddButtonText: { fontSize: 12.5, fontWeight: '700', color: colors.gold },
    row2: { flexDirection: 'row', gap: 10 },
    row2Item: { flex: 1 },
    pillRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
    errorText: { fontSize: 12, color: colors.error, marginBottom: 10 },
  });
}
