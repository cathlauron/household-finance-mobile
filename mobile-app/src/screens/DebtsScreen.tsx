import { firstTimeOpen } from '../handledOpen';
import { useArrival } from '../useArrival';
import { useSingleForm } from '../singleForm';
import React, { useState, useRef, useEffect } from 'react';
import { showLeafTick } from '../components/LeafTick';
import { afterSlide } from '../afterSlide';
import { View, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { Text } from '../components/AppText';
import { Alert } from 'react-native';
import { useTheme } from '../ThemeContext';
import { useToPayAddRequest } from '../fabActions';
import { SheetBar, BigAmount, FormGroup, InputRow, AmountRow, PickerRow, Footnote, Choices, AccountChoices, accountName, useOpenRow, repeatLabel, REPEAT_CHOICES, scheduleLabel, nextDateFor, nextDateText, ScheduleChoices, InlineField, InlineAmount, OwnChoiceField } from '../components/SimpleForm';
import { paymentMethodColor } from '../components/CardFace';
import PayRow from '../components/PayRow';
import CustomScheduleFields, { customFreqLabel, parseCustom } from '../components/CustomScheduleFields';
import PriorityPick from '../components/PriorityPick';
import { Priority, priorityRank } from '../priority';
import { getOverdueItems } from '../overdue';
import { useNavigation } from '@react-navigation/native';
import { currentCycle, withEditedCurrentCycle, isCyclePaid } from '../billPayments';
import { paymentToPlace, placePayment } from '../billPayments';
import PlacePaymentSheet, { type PlacePaymentAsk } from '../components/PlacePaymentSheet';
import { useData } from '../DataContext';
import { PullToRefreshScrollView } from '../PullToRefreshScrollView';
import { formatPeso } from '../balanceProjection';
import { getNextDueDate, RecurringType, recentOccurrences } from '../recurrence';
import type { Debt, HouseholdModel, PaymentMethod } from '../types';
import BottomSheet from '../components/BottomSheet';
import SwipeableRow from '../components/SwipeableRow';
import { makeId } from '../utils';
import Button from '../components/Button';
import GradientFill from '../components/GradientFill';
import Guided, { useFieldErrors } from '../components/Guided';
const DEBT_TYPES = ['Credit card', 'Lending app', 'Family or friend', 'Personal loan', 'Other'];

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



const RECUR_TYPES: RecurringType[] = ['onetime', 'monthly', 'annual', 'custom'];

type DebtsScreenProps = {
  // Version 2.2 fix (Cath's video: Edit on a debt's page flashed and closed): the page
  // itself shows this debt's form, with no jump back to the list. formOnly draws just the
  // form (and its pop-ups); onFormClosed says when it has closed.
  formOnly?: boolean;
  onFormClosed?: () => void;
  // Version 2.2: called once the requested item's form has opened, so the request is
  // cleared and the form never pops up again when this list is shown again.
  onOpenHandled?: () => void;
  openDebtId?: string;
  openDebtNonce?: number;
};

export default function DebtsScreen({ openDebtId, openDebtNonce, onOpenHandled, formOnly, onFormClosed }: DebtsScreenProps = {}) {
  // Redesign: the floating + adds a debt while this list is showing.
  useToPayAddRequest('debts', () => {
    if (!formOnly) openAddModal();
  });
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { model, saveModel } = useData();
  // Version 2.2 (approved P4): a just-added debt slides in and glows.
  const arrived = useArrival((model?.debts || []).map((d) => d.id));
  const styles = makeStyles(colors);

  const [modalOpen, setModalOpen] = useState(false);
  const singleForm = useSingleForm('debt');
  const [editingId, setEditingId] = useState<string | null>(null);

  const openedDebtRef = useRef<{ id: string; nonce?: number } | undefined>(undefined);
  useEffect(() => {
    if (!model || !openDebtId) return;
    const prev = openedDebtRef.current;
    if (prev && prev.id === openDebtId && prev.nonce === openDebtNonce) return;
    const target = (model.debts || []).find((d) => d.id === openDebtId);
    if (target) {
      openedDebtRef.current = { id: openDebtId, nonce: openDebtNonce };
      if (formOnly) {
        openEditModal(target);
        return;
      }
      if (!firstTimeOpen('debt', openDebtId, openDebtNonce)) return;
      afterSlide(() => openEditModal(target));
      onOpenHandled?.();
    }
  }, [model, openDebtId, openDebtNonce]);
  const [creditorInput, setCreditorInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [amountInput, setAmountInput] = useState<number | ''>('');
  const [interestRateInput, setInterestRateInput] = useState('');
  const [minPaymentInput, setMinPaymentInput] = useState<number | ''>('');
  const [feesPortionInput, setFeesPortionInput] = useState<number | ''>('');
  const [notesInput, setNotesInput] = useState('');
  const [priorityInput, setPriorityInput] = useState<Priority>('');
  const [paymentMethodInput, setPaymentMethodInput] = useState<PaymentMethod | undefined>(undefined);
  const [recurTypeInput, setRecurTypeInput] = useState<RecurringType>('onetime');
  // Version 2.2 (Cath): Custom repeat, same as loans.
  const [customFreqInput, setCustomFreqInput] = useState('monthly');
  const [customStartDateInput, setCustomStartDateInput] = useState('');
  const [customOccurrenceInput, setCustomOccurrenceInput] = useState('');
  const [onetimeDateInput, setOnetimeDateInput] = useState('');
  const [dayInput, setDayInput] = useState('');
  // Version 2.1: which due date is the current one (an earlier month when behind). '' = the next one.
  const [dueNowInput, setDueNowInput] = useState('');
  const [dueNowOriginal, setDueNowOriginal] = useState(''); // what it was when the form opened
  const [monthInput, setMonthInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [openRow, toggleRow] = useOpenRow(modalOpen);
  // Version 2.1: tapping Save/Add with something missing takes the person straight to it.
  const fieldErrors = useFieldErrors<'amount' | 'creditor' | 'due' | 'more'>();
  const amountRef = useRef<{ focus: () => void }>(null);
  const clearFieldError = fieldErrors.clear;
  const creditorRef = useRef<any>(null);
  const debtNext = nextDateFor(recurTypeInput, onetimeDateInput, dayInput, monthInput, dueNowInput);
  const debtMonths =
    recurTypeInput === 'monthly' && typeof amountInput === 'number' && typeof minPaymentInput === 'number' && minPaymentInput > 0 && amountInput > minPaymentInput
      ? Math.ceil(amountInput / minPaymentInput)
      : 0;
  const debtFootnote = [
    nextDateText(recurTypeInput === 'onetime' ? 'Due' : 'Next payment', debtNext),
    debtMonths ? `At ${formatPeso(minPaymentInput as number)} a month it's paid off in about ${debtMonths} months.` : '',
  ].filter(Boolean).join(' ');

  // The red message goes away as soon as the person changes something.
  useEffect(() => {
    clearFieldError();
  }, [amountInput, creditorInput, onetimeDateInput, dayInput, monthInput, recurTypeInput, interestRateInput, modalOpen, clearFieldError]);

  // Version 3 (M4): paid, then the due date moved: ask which payment it was.
  const [placeAsk, setPlaceAsk] = useState<PlacePaymentAsk>(null);

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
    setPriorityInput('');
    setMinPaymentInput('');
    setFeesPortionInput('');
    setNotesInput('');
    setPaymentMethodInput(undefined);
    setRecurTypeInput('onetime');
    setCustomFreqInput('monthly');
    setCustomStartDateInput('');
    setCustomOccurrenceInput('');
    setOnetimeDateInput('');
    setDayInput('');
    setMonthInput('');
    setDueNowInput('');
    setDueNowOriginal('');
    setErrorMsg('');
  }

  function openAddModal() {
    if (!singleForm.claim()) return;
    setEditingId(null);
    resetForm();
    setModalOpen(true);
  }

  function openEditModal(debt: Debt) {
    if (!singleForm.claim()) return;
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
    setPriorityInput(debt.priority || '');
    const cur = currentCycle(debt);
    setPaymentMethodInput(cur?.paymentMethod);
    setFeesPortionInput(cur && cur.feesPortion !== undefined && cur.feesPortion !== '' ? cur.feesPortion : '');
    const rt = (debt.recurringType as RecurringType) || 'onetime';
    setRecurTypeInput(RECUR_TYPES.includes(rt) ? rt : 'onetime');
    {
      const dd = (debt.dueDate || {}) as Record<string, any>;
      setCustomFreqInput(debt.customFreq || dd.customFreq || 'monthly');
      setCustomStartDateInput(debt.customStartDate || dd.customStartDate || '');
      const cnt = typeof debt.customOccurrenceCount === 'number' ? debt.customOccurrenceCount : dd.customOccurrenceCount;
      setCustomOccurrenceInput(typeof cnt === 'number' ? String(cnt) : '');
    }
    const d = debt.dueDate || {};
    setOnetimeDateInput(d.date || '');
    setDayInput(d.day ? String(d.day) : '');
    setMonthInput(d.month ? String(d.month) : '');
    {
      const c = currentCycle(debt);
      const next = getNextDueDate(debt.recurringType || 'onetime', debt.dueDate);
      const nextIso = next ? `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}` : '';
      const was = c && !isCyclePaid(c) && c.dueDate ? c.dueDate : debt.recurringType && debt.recurringType !== 'onetime' ? nextIso : '';
      setDueNowInput(was);
      setDueNowOriginal(was);
    }
    setErrorMsg('');
    setModalOpen(true);
  }

  function closeModal() {
    singleForm.release();
    setModalOpen(false);
    setEditingId(null);
    setErrorMsg('');
    onFormClosed?.();
  }

  async function handleSave() {
    if (!model) return;
    setErrorMsg('');
    // The amount comes first, like on the form. Editing can keep ₱0 (e.g. paid off).
    if (amountInput === '' || (!editingId && amountInput <= 0)) {
      fieldErrors.show('amount', 'How much is owed?');
      return;
    }
    const trimmedCreditor = creditorInput.trim();
    if (!trimmedCreditor) {
      fieldErrors.show('creditor', 'Who is this owed to?');
      return;
    }
    const parsedAmount = amountInput;

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
      dueDate = { day: dayInput.trim() };
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
      dueDate = { day: dayInput.trim(), month: monthInput.trim() ? monthNum : '' };
    }
    // Custom: kept both on the record and in dueDate, so every place that works out the
    // next date finds it.
    let customFields: { customFreq?: string; customStartDate?: string; customOccurrenceCount?: number | '' } = {
      customFreq: undefined,
      customStartDate: undefined,
      customOccurrenceCount: undefined,
    };
    if (recurTypeInput === 'custom') {
      const parsed = parseCustom(customStartDateInput, customOccurrenceInput);
      if ('error' in parsed) {
        fieldErrors.show('due', parsed.error);
        return;
      }
      customFields = { customFreq: customFreqInput, customStartDate: customStartDateInput.trim(), customOccurrenceCount: parsed.count };
      dueDate = { ...customFields };
    }

    let parsedInterest: number | '' = '';
    if (interestRateInput.trim() !== '') {
      const n = parseFloat(interestRateInput);
      if (isNaN(n)) {
        fieldErrors.show('more', 'Type the interest as a number, e.g. 24.');
        return;
      }
      parsedInterest = n;
    }
    const parsedMinPayment: number | '' = minPaymentInput === '' ? '' : minPaymentInput;

    const nextDue = getNextDueDate(recurTypeInput, dueDate);
    const nextDueISO = nextDue
      ? nextDue.getFullYear() + '-' + String(nextDue.getMonth() + 1).padStart(2, '0') + '-' + String(nextDue.getDate()).padStart(2, '0')
      : '';
    // Version 2.1: an earlier month when you're behind (only one of the recent due dates).
    // Version 2.1 (round 8): the date picked in the date box is the first one due (any month or year).
    const dueNowISO = recurTypeInput !== 'onetime' && recurTypeInput !== 'custom' && /^\d{4}-\d{2}-\d{2}$/.test(dueNowInput) ? dueNowInput : nextDueISO;

    const updated: HouseholdModel = { ...model, debts: [...model.debts] };

    if (editingId) {
      updated.debts = updated.debts.map((d) => {
        if (d.id !== editingId) return d;
        const parsedFeesPortion = feesPortionInput === '' ? ('' as const) : feesPortionInput;
        // Redesign: keep paid history; only the current cycle changes.
        const curC = currentCycle(d);
        const scheduleChanged =
          d.recurringType !== recurTypeInput ||
          JSON.stringify(d.dueDate || {}) !== JSON.stringify(dueDate) ||
          (dueNowInput !== dueNowOriginal && !!curC && !isCyclePaid(curC) && !!dueNowISO && curC.dueDate !== dueNowISO);
        const cycles = withEditedCurrentCycle(d.cycles, { amountDue: parsedAmount, paymentMethod: paymentMethodInput, feesPortion: parsedFeesPortion }, dueNowISO, scheduleChanged);
        return {
          ...d,
          creditorOrPerson: trimmedCreditor,
          category: categoryInput.trim(),
          notes: notesInput,
          interestRate: parsedInterest,
          priority: priorityInput,
          minPayment: parsedMinPayment,
          recurringType: recurTypeInput,
          ...customFields,
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
        ...customFields,
        dueDate,
        cycles: [
          {
            id: makeId('cycle'),
            dueDate: dueNowISO,
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
        priority: priorityInput,
        minPayment: parsedMinPayment,
        createdAt: Date.now(),
      };
      updated.debts = [...updated.debts, newDebt];
    }

    let toSave = updated;
    if (editingId) {
      // Version 3 (M4): a payment made before the due date moved gets placed on the right payment.
      const before = model.debts.find((x) => x.id === editingId);
      const edited = updated.debts.find((x) => x.id === editingId);
      const moved =
        !!before &&
        !!edited &&
        (currentCycle(before)?.dueDate !== dueNowISO ||
          before.recurringType !== edited.recurringType ||
          JSON.stringify(before.dueDate || {}) !== JSON.stringify(edited.dueDate || {}));
      const place = moved && edited ? paymentToPlace(edited, dueNowISO) : null;
      if (place && edited) {
        const swap = (rec: typeof edited) => ({ ...updated, debts: updated.debts.map((x) => (x.id === editingId ? rec : x)) });
        if (place.other) {
          setPlaceAsk({
            record: edited,
            placement: place,
            noun: 'payment',
            onPick: (forISO) => {
              setPlaceAsk(null);
              commitSave(swap(placePayment(edited, place, forISO)));
            },
          });
          return;
        }
        toSave = swap(placePayment(edited, place, place.newDue));
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

  // Version 2.2 fix (Cath: no Overdue tag on a debt that was past its due date): overdue
  // debts come first and say so, like bills; on the same day High priority comes first.
  const overdueDebtIds = new Set(getOverdueItems(model).filter((o) => o.kind === 'debt').map((o) => o.id));
  const debtDueTime = (d: Debt) => {
    const cur = currentCycle(d);
    const dt = cur?.dueDate ? new Date(cur.dueDate + 'T00:00:00') : getNextDueDate(d.recurringType, d.dueDate);
    return dt ? dt.getTime() : Infinity;
  };
  const debts = sortByNextDue(model.debts)
    .map((d, i) => ({ d, i }))
    .sort((a, b) => {
      const oa = overdueDebtIds.has(a.d.id) ? 0 : 1;
      const ob = overdueDebtIds.has(b.d.id) ? 0 : 1;
      if (oa !== ob) return oa - ob;
      const ta = debtDueTime(a.d);
      const tb = debtDueTime(b.d);
      if (ta === tb) return priorityRank(a.d.priority) - priorityRank(b.d.priority) || a.i - b.i;
      return a.i - b.i;
    })
    .map((x) => x.d);
  const totalOwed = debts.reduce((sum, d) => sum + debtAmount(d), 0);

  return (
    <SafeAreaView style={styles.container}>
      {!formOnly && (
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
              glow={arrived === debt.id}
              addedBy={debt.addedBy}
              icon="people-outline"
              title={debt.creditorOrPerson || 'Debt'}
              sub={(() => {
                const cur = currentCycle(debt);
                const d = cur?.dueDate ? new Date(cur.dueDate + 'T00:00:00') : nextDue;
                return d ? `${overdueDebtIds.has(debt.id) ? 'Was due' : 'Due'} ${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}` : 'No date set';
              })()}
              badge={(() => {
                if (overdueDebtIds.has(debt.id)) return { text: 'Overdue', tone: 'overdue' as const };
                const t = debtDueTime(debt);
                if (!isFinite(t)) return undefined;
                const today = new Date(); today.setHours(0, 0, 0, 0);
                const days = Math.round((t - today.getTime()) / 86400000);
                return days <= 7 && days >= 0 ? { text: days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`, tone: 'soon' as const } : undefined;
              })()}
              priority={debt.priority}
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
      )}

      {/* Approved "Option 2: simple" form (Forms Redesign canvas). */}
      <BottomSheet
        visible={modalOpen}
        onClose={closeModal}
        grouped
        header={<SheetBar title={editingId ? 'Edit debt' : 'New debt'} onCancel={closeModal} onDone={handleSave} doneLabel={editingId ? 'Save' : 'Add'} busy={saving} />}
      >
        <Guided {...fieldErrors.props('amount')} focusRef={amountRef} inset={false} radius={22}>
          <BigAmount label="Amount owed" value={amountInput} onChange={setAmountInput} color={colors.negative} autoFocus={!editingId} focusRef={amountRef} invalid={fieldErrors.field === 'amount'} />
        </Guided>

        <FormGroup>
          <Guided {...fieldErrors.props('creditor')} focusRef={creditorRef}>
            <InputRow label="Owed to" value={creditorInput} onChangeText={setCreditorInput} placeholder="e.g. BDO, Ate Fely" testID="debt-creditor-input" inputRef={creditorRef} invalid={fieldErrors.field === 'creditor'} />
          </Guided>
          <PickerRow label="Type" value={categoryInput || 'Choose'} open={openRow === 'type'} onToggle={() => toggleRow('type')}>
            <Choices options={DEBT_TYPES.map((c) => ({ id: c, label: c }))} value={categoryInput as any} onChange={(c) => setCategoryInput(c)} />
            <View style={{ height: 10 }} />
            <OwnChoiceField options={DEBT_TYPES} value={categoryInput} onChange={setCategoryInput} />
          </PickerRow>
          <AmountRow label="Pay at least" value={minPaymentInput} onChange={setMinPaymentInput} />
          <PickerRow label="Repeats" value={repeatLabel(recurTypeInput)} open={openRow === 'repeat'} onToggle={() => toggleRow('repeat')}>
            <Choices options={[...REPEAT_CHOICES, { id: 'custom' as RecurringType, label: 'Custom' }]} value={recurTypeInput} onChange={(v) => setRecurTypeInput(v as RecurringType)} />
          </PickerRow>
          <Guided {...fieldErrors.props('due')} onShow={() => { if (openRow !== 'due') toggleRow('due'); }}>
          {recurTypeInput === 'custom' ? (
            <PickerRow label="Schedule" value={`${customFreqLabel(customFreqInput)}${customStartDateInput ? ` from ${customStartDateInput}` : ''}`} open={openRow === 'due'} invalid={fieldErrors.field === 'due'} onToggle={() => toggleRow('due')}>
              <CustomScheduleFields freq={customFreqInput} onFreq={setCustomFreqInput} start={customStartDateInput} onStart={setCustomStartDateInput} count={customOccurrenceInput} onCount={setCustomOccurrenceInput} testID="debt-custom-start" />
            </PickerRow>
          ) : (
          <PickerRow label="Due on" value={scheduleLabel(recurTypeInput, onetimeDateInput, dayInput, monthInput, dueNowInput)} open={openRow === 'due'} invalid={fieldErrors.field === 'due'} onToggle={() => toggleRow('due')}>
            <ScheduleChoices rt={recurTypeInput} date={onetimeDateInput} onDate={setOnetimeDateInput} day={dayInput} onDay={setDayInput} month={monthInput} onMonth={setMonthInput} firstDue={dueNowInput} onFirstDue={setDueNowInput} testID="debt-due-date-field" />
          </PickerRow>
          )}
          </Guided>
          <PickerRow label="Paid from" value={accountName(model, paymentMethodInput) ?? 'Choose'} dot={paymentMethodInput ? paymentMethodColor(model, paymentMethodInput) : null} open={openRow === 'account'} onToggle={() => toggleRow('account')}>
            <AccountChoices model={model} value={paymentMethodInput} onChange={setPaymentMethodInput} optional />
          </PickerRow>
        </FormGroup>

        <FormGroup>
          <Guided {...fieldErrors.props('more')} onShow={() => { if (openRow !== 'more') toggleRow('more'); }}>
          <PickerRow label="More details" value={[priorityInput ? 'Priority' : '', interestRateInput ? 'Interest' : '', feesPortionInput !== '' ? 'Fees' : '', notesInput ? 'Note' : ''].filter(Boolean).join(', ') || 'Priority, interest, note'} open={openRow === 'more'} invalid={fieldErrors.field === 'more'} onToggle={() => toggleRow('more')}>
            <PriorityPick value={priorityInput} onChange={setPriorityInput} />
            <InlineField label="Interest (% a year)" value={interestRateInput} onChangeText={setInterestRateInput} placeholder="e.g. 24" keyboardType="decimal-pad" />
            <InlineAmount label="Fees in this amount (late fee or interest charged)" value={feesPortionInput} onChange={setFeesPortionInput} />
            <InlineField label="Note" value={notesInput} onChangeText={setNotesInput} placeholder="Optional" multiline />
          </PickerRow>
          </Guided>
        </FormGroup>

        {!!debtFootnote && <Footnote>{debtFootnote}</Footnote>}
        {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
        {editingId && <Button label="Delete debt" variant="destructive" onPress={handleDelete} />}
      </BottomSheet>
      <PlacePaymentSheet value={placeAsk} onClose={() => setPlaceAsk(null)} />
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
    balanceBannerLabel: { fontSize: 13, color: colors.inkDim, marginBottom: 2 },
    balanceBannerAmount: { fontSize: 22, fontWeight: '700', color: colors.negative },
    emptyText: { fontSize: 15, color: colors.inkDim, marginBottom: 12, textAlign: 'center' },
    errorText: { fontSize: 12, color: colors.error, marginBottom: 10 },
  });
}
