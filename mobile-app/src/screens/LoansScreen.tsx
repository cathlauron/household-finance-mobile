import { useSingleForm } from '../singleForm';
import { loanPaymentToPlace, placeLoanPayment } from '../loanSchedule';
import PlacePaymentSheet, { type PlacePaymentAsk } from '../components/PlacePaymentSheet';
import React, { useState, useRef, useEffect } from 'react';
import { showLeafTick } from '../components/LeafTick';
import { afterSlide } from '../afterSlide';
import { View, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { Text } from '../components/AppText';
import { Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import { useToPayAddRequest } from '../fabActions';
import PayRow from '../components/PayRow';
import { useNavigation } from '@react-navigation/native';
import { useData } from '../DataContext';
import { PullToRefreshScrollView } from '../PullToRefreshScrollView';
import { formatPeso } from '../balanceProjection';
import { getNextDueDate, RecurringType } from '../recurrence';
import type { Loan, HouseholdModel, LoanPayment, PaymentMethod } from '../types';
import LoanPayoffSimulatorModal, { SimLoanInput } from './LoanPayoffSimulatorModal';
import AccountPicker, { accountProblem } from '../components/AccountPicker';
import BottomSheet from '../components/BottomSheet';
import SwipeableRow from '../components/SwipeableRow';
import { makeId } from '../utils';
import DateField from '../components/DateField';
import Button from '../components/Button';
import AmountInput from '../components/AmountInput';
import GradientFill from '../components/GradientFill';
import Guided, { useFieldErrors } from '../components/Guided';
import SegmentedControl from '../components/SegmentedControl';
import { SheetBar, BigAmount, FormGroup, InputRow, AmountRow, PickerRow, Footnote, Choices, useOpenRow, repeatLabel, REPEAT_CHOICES, scheduleLabel, nextDateFor, nextDateText, ScheduleChoices, InlineField, OwnChoiceField } from '../components/SimpleForm';
const LOAN_TYPES = ['Car', 'Motorcycle', 'Home', 'Personal', 'Business', 'Other'];

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
  // Version 2.2: called once the requested item's form has opened, so the request is
  // cleared and the form never pops up again when this list is shown again.
  onOpenHandled?: () => void;
  openLoanId?: string;
  openLoanNonce?: number;
};

export default function LoansScreen({ openLoanId, openLoanNonce, onOpenHandled }: LoansScreenProps = {}) {
  // Redesign: the floating + adds a loan while this list is showing.
  useToPayAddRequest('loans', () => openAddModal());
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { model, saveModel } = useData();
  const styles = makeStyles(colors);

  const [modalOpen, setModalOpen] = useState(false);
  const singleForm = useSingleForm('loan');
  const [editingId, setEditingId] = useState<string | null>(null);

  const openedLoanRef = useRef<{ id: string; nonce?: number } | undefined>(undefined);
  useEffect(() => {
    if (!model || !openLoanId) return;
    const prev = openedLoanRef.current;
    if (prev && prev.id === openLoanId && prev.nonce === openLoanNonce) return;
    const target = (model.loans || []).find((l) => l.id === openLoanId);
    if (target) {
      openedLoanRef.current = { id: openLoanId, nonce: openLoanNonce };
      afterSlide(() => openEditModal(target));
      onOpenHandled?.();
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
  // Version 2.1 (Cath, round 8): the first payment of a repeating loan (any month or year).
  const [firstDateInput, setFirstDateInput] = useState('');
  const [customOccurrenceInput, setCustomOccurrenceInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [paymentsInput, setPaymentsInput] = useState<LoanPayment[]>([]);
  const [newPaymentDate, setNewPaymentDate] = useState('');
  const [newPaymentAmount, setNewPaymentAmount] = useState<number | ''>('');
  const [newPaymentMethod, setNewPaymentMethod] = useState<PaymentMethod | undefined>(undefined);
  const [paymentError, setPaymentError] = useState('');
  const [saving, setSaving] = useState(false);
  const [openRow, toggleRow] = useOpenRow(modalOpen);
  // Version 2.1: tapping Save/Add with something missing takes the person straight to it.
  const fieldErrors = useFieldErrors<'amount' | 'name' | 'due' | 'interest'>();
  const amountRef = useRef<{ focus: () => void }>(null);
  const clearFieldError = fieldErrors.clear;
  const nameRef = useRef<any>(null);
  const interestRef = useRef<any>(null);
  // Simple form footnote: the next payment, and for monthly loans a payoff estimate.
  const loanFootnote = (() => {
    if (recurTypeInput === 'custom') return editingId ? '' : 'After you add it, log each payment from the loan.';
    const next = nextDateFor(recurTypeInput, onetimeDateInput, dayInput, monthInput, firstDateInput);
    const parts = [nextDateText(recurTypeInput === 'onetime' ? 'Due' : 'Next payment', next)];
    const P = typeof totalAmountInput === 'number' ? totalAmountInput : 0;
    const A = typeof expectedPaymentInput === 'number' ? expectedPaymentInput : 0;
    if (recurTypeInput === 'monthly' && P > 0 && A > 0 && next) {
      const r = (parseFloat(interestRateInput) || 0) / 1200;
      let n = r > 0 ? (1 - (r * P) / A > 0 ? Math.ceil(-Math.log(1 - (r * P) / A) / Math.log(1 + r)) : Infinity) : Math.ceil(P / A);
      if (!isFinite(n)) parts.push("This payment doesn't cover the interest, so the loan would never be paid off.");
      else {
        const end = new Date(next.getFullYear(), next.getMonth() + n - 1, 1);
        const interest = Math.max(0, n * A - P);
        parts.push(`${n} payments, paid off around ${end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}.${interest >= 1 ? ` About ${formatPeso(Math.round(interest))} of that is interest.` : ''}`);
      }
    }
    return parts.filter(Boolean).join(' ');
  })();

  // The red message goes away as soon as the person changes something.
  useEffect(() => {
    clearFieldError();
  }, [totalAmountInput, nameInput, interestRateInput, onetimeDateInput, dayInput, monthInput, recurTypeInput, customStartDateInput, customOccurrenceInput, modalOpen, clearFieldError]);

  if (!model) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  function openAddModal() {
    if (!singleForm.claim()) return;
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
    setFirstDateInput('');
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
    if (!singleForm.claim()) return;
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
    {
      // The first payment if one was picked, else the next one on the schedule.
      const next = rt === 'monthly' || rt === 'annual' ? getNextDueDate(rt, d) : null;
      const nextIso = next ? `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}` : '';
      setFirstDateInput(typeof d.firstDate === 'string' && d.firstDate ? d.firstDate : nextIso);
    }
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
    singleForm.release();
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
    // Redesign: the account is required; paying a loan can't overdraw cash or debit.
    const acctProblem = model
      ? accountProblem(model, directionInput === 'lent' ? 'in' : 'out', newPaymentAmount, newPaymentMethod)
      : null;
    if (acctProblem) {
      setPaymentError(acctProblem);
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

  // Version 3 (M4c): "Which payment was this?" when the first payment date moves.
  const [placeAsk, setPlaceAsk] = useState<PlacePaymentAsk>(null);

  async function handleSave() {
    if (!model) return;
    setErrorMsg('');
    // The amount comes first, like on the form. Editing can keep ₱0 (e.g. paid off).
    if (totalAmountInput === '' || (!editingId && totalAmountInput <= 0)) {
      fieldErrors.show('amount', 'How much is the loan?');
      return;
    }
    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      fieldErrors.show('name', 'Give this loan a name.');
      return;
    }
    const parsedTotal: number | '' = totalAmountInput;
    const parsedExpected: number | '' = expectedPaymentInput === '' ? '' : expectedPaymentInput;
    let parsedRate: number | '' = '';
    if (interestRateInput.trim() !== '') {
      const n = parseFloat(interestRateInput);
      if (isNaN(n)) {
        fieldErrors.show('interest', 'Type the interest as a number, e.g. 12.');
        return;
      }
      parsedRate = n;
    }

    let dueDate: Record<string, any> = {};
    if (recurTypeInput === 'onetime') {
      const trimmedDate = onetimeDateInput.trim();
      if (trimmedDate && !/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
        fieldErrors.show('due', 'Pick the date it\'s due.');
        return;
      }
      dueDate = { date: trimmedDate };
    } else if (recurTypeInput === 'monthly') {
      const dayNum = parseInt(dayInput, 10);
      if (dayInput.trim() && (isNaN(dayNum) || dayNum < 1 || dayNum > 31)) {
        fieldErrors.show('due', 'Pick a day between 1 and 31.');
        return;
      }
      dueDate = { day: dayInput.trim(), ...(firstDateInput ? { firstDate: firstDateInput } : {}) };
    } else if (recurTypeInput === 'annual') {
      const dayNum = parseInt(dayInput, 10);
      const monthNum = parseInt(monthInput, 10);
      if (dayInput.trim() && (isNaN(dayNum) || dayNum < 1 || dayNum > 31)) {
        fieldErrors.show('due', 'Pick a day between 1 and 31.');
        return;
      }
      if (monthInput.trim() && (isNaN(monthNum) || monthNum < 1 || monthNum > 12)) {
        fieldErrors.show('due', 'Pick the month it\'s due.');
        return;
      }
      dueDate = { day: dayInput.trim(), month: monthInput.trim() ? monthNum : '', ...(firstDateInput ? { firstDate: firstDateInput } : {}) };
    }

    let parsedOccurrenceCount: number | '' = '';
    if (recurTypeInput === 'custom') {
      const trimmedStart = customStartDateInput.trim();
      if (!trimmedStart || !/^\d{4}-\d{2}-\d{2}$/.test(trimmedStart)) {
        fieldErrors.show('due', 'Pick the date payments start.');
        return;
      }
      if (customOccurrenceInput.trim()) {
        const n = parseInt(customOccurrenceInput, 10);
        if (isNaN(n) || n <= 0) {
          fieldErrors.show('due', 'How many payments? Type a number above 0.');
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

    let toSave = updated;
    if (editingId) {
      // Version 3 (canvas M4c): the first payment moved to before a logged payment: which
      // scheduled payment was it?
      const before = model.loans.find((x) => x.id === editingId);
      const edited = updated.loans.find((x) => x.id === editingId);
      const newFirst = edited?.dueDate?.firstDate;
      const moved = !!before && !!edited && (before.dueDate?.firstDate !== newFirst || before.recurringType !== edited.recurringType);
      const place = moved && edited && typeof newFirst === 'string' ? loanPaymentToPlace(edited, newFirst) : null;
      if (place && edited) {
        setPlaceAsk({
          loan: edited,
          placement: place,
          onPick: (forISO) => {
            setPlaceAsk(null);
            commitSave({ ...updated, loans: updated.loans.map((x) => (x.id === editingId ? placeLoanPayment(edited, place, forISO) : x)) });
          },
        });
        return;
      }
    }
    await commitSave(toSave);
  }

  async function commitSave(toSave: HouseholdModel) {
    setSaving(true);
    try {
      await saveModel(toSave);
      showLeafTick(editingId ? 'Saved' : 'Added');
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
          <GradientFill match={[styles.group, styles.summaryRow]} />
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
            <GradientFill match={styles.simulatorButton} />
            <Ionicons name="stats-chart-outline" size={16} color={colors.gold} style={{ marginRight: 6 }} />
            <Text style={styles.simulatorButtonText}>View Payoff Simulator</Text>
          </TouchableOpacity>
        )}

        {loans.length === 0 ? (
          <Text style={styles.emptyText}>No loans yet.</Text>
        ) : (
          <View style={[styles.group, styles.section]}>
            <GradientFill match={[styles.group, styles.section]} />
          {loans.map((loan, rowIndex) => {
            const remaining = Math.max(0, loanTotal(loan) - loanPaidTotal(loan));
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

      {/* Approved "Option 2: simple" form (Forms Redesign canvas). */}
      <BottomSheet
        visible={modalOpen}
        onClose={closeModal}
        grouped
        header={<SheetBar title={editingId ? 'Edit loan' : 'New loan'} onCancel={closeModal} onDone={handleSave} doneLabel={editingId ? 'Save' : 'Add'} busy={saving} />}
      >
        <View style={{ marginBottom: 12 }}>
          <SegmentedControl<'borrowed' | 'lent'>
            accessibilityLabel="Borrowed or lent"
            options={[{ id: 'borrowed', label: 'I borrowed' }, { id: 'lent', label: 'I lent' }]}
            value={directionInput}
            onChange={setDirectionInput}
          />
        </View>
        <Guided {...fieldErrors.props('amount')} focusRef={amountRef} inset={false} radius={22}>
          <BigAmount label="Loan amount" value={totalAmountInput} onChange={setTotalAmountInput} color={directionInput === 'lent' ? colors.positive : colors.negative} autoFocus={!editingId} focusRef={amountRef} invalid={fieldErrors.field === 'amount'} />
        </Guided>

        <FormGroup>
          <Guided {...fieldErrors.props('name')} focusRef={nameRef}>
            <InputRow label="Name" value={nameInput} onChangeText={setNameInput} placeholder="e.g. Car loan" testID="loan-name-input" inputRef={nameRef} invalid={fieldErrors.field === 'name'} />
          </Guided>
          <PickerRow label="Type" value={loanTypeInput || 'Choose'} open={openRow === 'type'} onToggle={() => toggleRow('type')}>
            <Choices options={LOAN_TYPES.map((c) => ({ id: c, label: c }))} value={loanTypeInput as any} onChange={(c) => setLoanTypeInput(c)} />
            <View style={{ height: 10 }} />
            <OwnChoiceField options={LOAN_TYPES} value={loanTypeInput} onChange={setLoanTypeInput} />
          </PickerRow>
          <AmountRow label={directionInput === 'lent' ? 'They pay' : 'You pay'} value={expectedPaymentInput} onChange={setExpectedPaymentInput} />
          <PickerRow label="Repeats" value={repeatLabel(recurTypeInput)} open={openRow === 'repeat'} onToggle={() => toggleRow('repeat')}>
            <Choices options={[...REPEAT_CHOICES, { id: 'custom' as RecurringType, label: 'Custom' }]} value={recurTypeInput} onChange={(v) => setRecurTypeInput(v as RecurringType)} />
          </PickerRow>
          {recurTypeInput === 'custom' ? (
            <Guided {...fieldErrors.props('due')} onShow={() => { if (openRow !== 'due') toggleRow('due'); }}>
            <PickerRow label="Schedule" value={`${customFreqInput.charAt(0).toUpperCase() + customFreqInput.slice(1)}${customStartDateInput ? ` from ${customStartDateInput}` : ''}`} open={openRow === 'due'} invalid={fieldErrors.field === 'due'} onToggle={() => toggleRow('due')}>
              <Choices
                options={['daily', 'weekly', 'biweekly', 'monthly', 'yearly'].map((f) => ({ id: f, label: f.charAt(0).toUpperCase() + f.slice(1) }))}
                value={customFreqInput}
                onChange={setCustomFreqInput}
              />
              <View style={{ height: 10 }} />
              <DateField label="Starts on" value={customStartDateInput} onChange={setCustomStartDateInput} placeholder="Pick a date" testID="loan-start-date-field" />
              <InlineField label="How many payments (optional)" value={customOccurrenceInput} onChangeText={setCustomOccurrenceInput} placeholder="e.g. 12" keyboardType="number-pad" />
            </PickerRow>
            </Guided>
          ) : (
            <Guided {...fieldErrors.props('due')} onShow={() => { if (openRow !== 'due') toggleRow('due'); }}>
            <PickerRow label={recurTypeInput === 'monthly' || recurTypeInput === 'annual' ? 'First payment' : 'Due on'} value={scheduleLabel(recurTypeInput, onetimeDateInput, dayInput, monthInput, firstDateInput)} open={openRow === 'due'} invalid={fieldErrors.field === 'due'} onToggle={() => toggleRow('due')}>
              <ScheduleChoices rt={recurTypeInput} date={onetimeDateInput} onDate={setOnetimeDateInput} day={dayInput} onDay={setDayInput} month={monthInput} onMonth={setMonthInput} firstDue={firstDateInput} onFirstDue={setFirstDateInput} testID="loan-due-date-field" />
            </PickerRow>
            </Guided>
          )}
          <Guided {...fieldErrors.props('interest')} focusRef={interestRef}>
            <InputRow label="Interest a year (%)" value={interestRateInput} onChangeText={setInterestRateInput} placeholder="0" keyboardType="decimal-pad" inputRef={interestRef} invalid={fieldErrors.field === 'interest'} />
          </Guided>
        </FormGroup>

        {editingId && (
          <FormGroup>
            <PickerRow label="Payments" value={`${paymentsInput.length} logged`} open={openRow === 'payments'} onToggle={() => toggleRow('payments')}>
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
                      <AccountPicker
                        model={model}
                        direction={directionInput === 'lent' ? 'in' : 'out'}
                        amount={newPaymentAmount}
                        value={newPaymentMethod}
                        onChange={setNewPaymentMethod}
                      />
                      {!!paymentError && <Text style={styles.errorText}>{paymentError}</Text>}
                      <TouchableOpacity style={styles.paymentAddButton} onPress={handleAddPayment}>
                        <GradientFill match={styles.paymentAddButton} />
                        <Text style={styles.paymentAddButtonText}>+ Add payment</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
            </PickerRow>
          </FormGroup>
        )}

        {!!loanFootnote && <Footnote>{loanFootnote}</Footnote>}
        {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
        {editingId && <Button label="Delete loan" variant="destructive" onPress={handleDelete} />}
      </BottomSheet>
      <PlacePaymentSheet value={placeAsk} onClose={() => setPlaceAsk(null)} />

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
    section: { marginBottom: 20 },
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
    inputLabel: {
      // Redesign: sentence-case grey labels, like iPhone forms.
      fontSize: 13,
      fontWeight: '600',
      marginLeft: 4,
      color: colors.inkDim,
      marginBottom: 6,
    },
    amountInput: {
      backgroundColor: colors.navy2,
    },
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
    errorText: { fontSize: 12, color: colors.error, marginBottom: 10 },
  });
}
