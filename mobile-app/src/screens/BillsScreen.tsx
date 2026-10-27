import { firstTimeOpen } from '../handledOpen';
import { dateText } from '../dateUtils';
import { redUnlessZero } from '../moneyColor';
import { useToday } from '../useToday';
import ErrorNote from '../components/ErrorNote';
import { notSaved, notDeleted } from '../messages';
import { useArrival } from '../useArrival';
import { useSingleForm } from '../singleForm';
import React, { useState, useEffect, useRef } from 'react';
import { showLeafTick } from '../components/LeafTick';
import { afterSlide } from '../afterSlide';
import { View, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { TouchableOpacity } from '../components/Tap';
import { Text, TextInput } from '../components/AppText';
import { Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import { useToPayAddRequest, takePendingAdd, switchToPayAdd } from '../fabActions';
import KindSwitch from '../components/KindSwitch';
import FormSwapFade from '../components/FormSwapFade';
import { MarkedLabel } from '../components/MarkedLabel';
import { useData } from '../DataContext';
import CountingText from '../components/CountingText';
import { PullToRefreshScrollView } from '../PullToRefreshScrollView';
import { formatPeso } from '../balanceProjection';
import { getNextDueDate, RecurringType, recentOccurrences } from '../recurrence';
import type { Bill, HouseholdModel, BillCycle, PaymentMethod } from '../types';
import BottomSheet, { startSheetHandoff } from '../components/BottomSheet';
import SwipeableRow from '../components/SwipeableRow';
import { makeId } from '../utils';
import DateField from '../components/DateField';
import Button from '../components/Button';
import { getOverdueItems } from '../overdue';
import { currentCycle, withEditedCurrentCycle, isCyclePaid, wasPaidThisMonth, paidCycles } from '../billPayments';
import { paymentToPlace, placePayment } from '../billPayments';
import PlacePaymentSheet, { type PlacePaymentAsk } from '../components/PlacePaymentSheet';
import PayRow from '../components/PayRow';
import CustomScheduleFields, { customFreqLabel, parseCustom } from '../components/CustomScheduleFields';
import { priorityRank } from '../priority';
import { useNavigation } from '@react-navigation/native';
import GradientFill from '../components/GradientFill';
import Guided, { useFieldErrors } from '../components/Guided';
import { SheetBar, BigAmount, FormGroup, InputRow, PickerRow, SwitchRow, Footnote, Choices, DayStrip, AccountChoices, accountName, ordinal, MONTHS_SHORT, ScheduleChoices, OwnChoiceField } from '../components/SimpleForm';
import { paymentMethodColor } from '../components/CardFace';

function billAmount(bill: Bill): number {
  // Redesign: the amount of the cycle that's due next (paid cycles are history).
  const c = currentCycle(bill);
  return c && typeof c.amountDue === 'number' ? c.amountDue : 0;
}



// Sorts bills by next due date (soonest first); bills with no computable
// due date yet sort to the bottom.

const PRIORITIES: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low'];
const RECUR_TYPES: RecurringType[] = ['onetime', 'monthly', 'annual', 'custom'];
// Version 2.2 (Cath): no "Subscription" category any more; the Subscription switch below
// is the one place to say a bill is a subscription (it also puts it on the Subscriptions
// page). Bills saved with that category before keep it (shown as their own category).
const BILL_CATEGORIES = ['Utilities', 'Internet', 'Phone', 'Rent', 'Insurance', 'School', 'Other'];

type BillsScreenProps = {
  // Version 2.2 (Cath: switching Bill / Debt / Loan shouldn't jump to the other list
  // first): the other kind's New form opens right where you are, with what you typed;
  // only once it's added does To-Pay show that list (see ToPayScreen).
  addCarry?: { amount: number | ''; name: string; date?: string; nonce: number };
  onAdded?: () => void;
  // Version 2.2 fix (Cath's video: Edit on a bill's page flashed and closed): the page
  // itself shows this bill's form, with no jump back to the list. formOnly draws just the
  // form (and its pop-ups); onFormClosed says when it has closed.
  formOnly?: boolean;
  onFormClosed?: () => void;
  // Version 2.2: called once the requested item's form has opened, so the request is
  // cleared and the form never pops up again when this list is shown again.
  onOpenHandled?: () => void;
  openBillId?: string;
  // Set only when this bill was requested via a swipe on TransactionsScreen
  // (openBillRequest.ts) — increments every request, even for the same
  // bill id, so the guard below can tell "same request, don't reopen" apart
  // from "a fresh request for the same bill, please open it again."
  openBillNonce?: number;
};

export default function BillsScreen({ openBillId, openBillNonce, onOpenHandled, formOnly, onFormClosed, addCarry, onAdded }: BillsScreenProps = {}) {
  // H-09 (2026-10-22): redraw when the date changes, so Overdue and due dates are
  // right the morning after the app was left open.
  useToday();
  // Redesign: the floating + adds a bill while this list is showing.
  useToPayAddRequest('bills', (date) => {
    if (formOnly) return;
    openAddModal();
    // Version 2.2 (calendar +): starts on the day picked in the calendar.
    if (date) setOnetimeDateInput(date);
  });
  // Version 2.2 (canvas K1): opened from another kind's form; carry what was typed.
  React.useEffect(() => {
    const carry = takePendingAdd('bills');
    if (!carry || formOnly) return;
    openAddModal();
    setAmountInput(carry.amount);
    setNameInput(carry.name);
    // Only when this list first shows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  React.useEffect(() => {
    if (!formOnly || !addCarry) return;
    openAddModal();
    setAmountInput(addCarry.amount);
    setNameInput(addCarry.name);
    // The day picked in the calendar (or carried over from the other form).
    if (addCarry.date) setOnetimeDateInput(addCarry.date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addCarry?.nonce]);
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { model, saveModel, getModel } = useData();
  // Version 2.2 (approved P4): a just-added bill slides in and glows.
  const arrived = useArrival(React.useMemo(() => (model?.bills || []).map((b) => b.id), [model?.bills]), formOnly ? undefined : 'bills');

  // B.14 fast-follow: auto-open a bill's edit sheet when this screen is
  // reached via the subscription-reminder deep link, or via a swipe-to-
  // view request from Transactions. Guarded with a ref (not state) so
  // this only fires once per distinct (id, nonce) pair — without it,
  // closing the sheet manually while the same openBillId is still set on
  // the prop would cause it to immediately reopen. openBillNonce is
  // undefined for the notification deep-link path, so that path keeps its
  // original "skip if same id" behavior; a swipe request always carries a
  // fresh nonce, so it always reopens even for a repeat swipe of the same bill.
  const openedBillRef = useRef<{ id: string; nonce?: number } | undefined>(undefined);
  useEffect(() => {
    if (!model || !openBillId) return;
    const prev = openedBillRef.current;
    if (prev && prev.id === openBillId && prev.nonce === openBillNonce) return;
    const target = (model.bills || []).find((b) => b.id === openBillId);
    if (target) {
      openedBillRef.current = { id: openBillId, nonce: openBillNonce };
      if (formOnly) {
        openEditModal(target);
        return;
      }
      if (!firstTimeOpen('bill', openBillId, openBillNonce)) return;
      afterSlide(() => openEditModal(target));
      onOpenHandled?.();
    }
  }, [model, openBillId, openBillNonce]);
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  const [modalOpen, setModalOpen] = useState(false);
  const singleForm = useSingleForm('bill');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [amountInput, setAmountInput] = useState<number | ''>('');
  const [carriedEdit, setCarriedEdit] = useState(0);
  const [priorityInput, setPriorityInput] = useState<'high' | 'medium' | 'low' | ''>('');
  const [subscriptionInput, setSubscriptionInput] = useState(false);
  const [notesInput, setNotesInput] = useState('');
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
  // Simple form: which row's choices are open (one at a time).
  const [openRow, setOpenRow] = useState<string | null>(null);
  // Version 2.1: tapping Add with something missing takes the person straight to it.
  const fieldErrors = useFieldErrors<'amount' | 'name' | 'due'>();
  const amountRef = useRef<{ focus: () => void }>(null);
  const nameRef = useRef<any>(null);
  const clearFieldError = fieldErrors.clear;
  useEffect(() => {
    if (!modalOpen) setOpenRow(null);
  }, [modalOpen]);
  const toggleRow = (r: string) => setOpenRow((cur) => (cur === r ? null : r));
  const dueLabel =
    recurTypeInput === 'onetime'
      ? onetimeDateInput
        ? dateText(new Date(onetimeDateInput + 'T00:00:00'), { weekday: true })
        : 'Choose'
      : dueNowInput
      ? new Date(dueNowInput + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : recurTypeInput === 'monthly'
      ? dayInput ? `the ${ordinal(parseInt(dayInput, 10))}` : 'Choose'
      : dayInput && monthInput ? `${MONTHS_SHORT[parseInt(monthInput, 10) - 1] ?? ''} ${parseInt(dayInput, 10)}` : 'Choose';
  const nextDueDate =
    recurTypeInput === 'onetime'
      ? (onetimeDateInput ? new Date(onetimeDateInput + 'T00:00:00') : null)
      : dueNowInput
      ? new Date(dueNowInput + 'T00:00:00')
      : getNextDueDate(recurTypeInput, recurTypeInput === 'monthly' ? { day: dayInput } : { day: dayInput, month: monthInput ? parseInt(monthInput, 10) : '' });
  const nextDueText = nextDueDate && !isNaN(nextDueDate.getTime())
    ? `${recurTypeInput === 'onetime' ? 'Due' : 'Next due'} ${dateText(nextDueDate, { weekday: true })}. You'll get a reminder ${model?.settings.notifyDaysBefore ?? 3} days before.`
    : '';

  // The red message goes away as soon as the person changes something.
  useEffect(() => {
    clearFieldError();
  }, [amountInput, nameInput, dayInput, monthInput, onetimeDateInput, recurTypeInput, modalOpen, clearFieldError]);

  // Version 3 (M4): paid, then the due date moved: ask which bill the payment was for.
  const [placeAsk, setPlaceAsk] = useState<PlacePaymentAsk>(null);

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
    setCarriedEdit(0);
    setPriorityInput('');
    setNotesInput('');
    setSubscriptionInput(false);
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

  function openEditModal(bill: Bill) {
    if (!singleForm.claim()) return;
    setEditingId(bill.id);
    setNameInput(bill.name);
    setCategoryInput(bill.category || '');
    // Version 2.1: when part of last bill was carried over, the form asks only for the new
    // charges and adds the carried amount back itself.
    const curCycle = currentCycle(bill);
    const carried = curCycle && !isCyclePaid(curCycle) ? Number(curCycle.carriedIn) || 0 : 0;
    setCarriedEdit(carried);
    const newCharges = Math.round((billAmount(bill) - carried) * 100) / 100;
    setAmountInput(newCharges <= 0 ? '' : newCharges);
    setPriorityInput(bill.priority || '');
    setNotesInput(bill.notes || '');
    setSubscriptionInput(!!bill.isSubscription);
    setPaymentMethodInput(currentCycle(bill)?.paymentMethod);
    const rt = (bill.recurringType as RecurringType) || 'onetime';
    setRecurTypeInput(RECUR_TYPES.includes(rt) ? rt : 'onetime');
    {
      const dd = (bill.dueDate || {}) as Record<string, any>;
      setCustomFreqInput(bill.customFreq || dd.customFreq || 'monthly');
      setCustomStartDateInput(bill.customStartDate || dd.customStartDate || '');
      const cnt = typeof bill.customOccurrenceCount === 'number' ? bill.customOccurrenceCount : dd.customOccurrenceCount;
      setCustomOccurrenceInput(typeof cnt === 'number' ? String(cnt) : '');
    }
    const d = bill.dueDate || {};
    setOnetimeDateInput(d.date || '');
    setDayInput(d.day ? String(d.day) : '');
    setMonthInput(d.month ? String(d.month) : '');
    {
      const c = currentCycle(bill);
      const next = getNextDueDate(bill.recurringType || 'onetime', bill.dueDate);
      const nextIso = next ? `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}` : '';
      const was = c && !isCyclePaid(c) && c.dueDate ? c.dueDate : bill.recurringType && bill.recurringType !== 'onetime' ? nextIso : '';
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
      fieldErrors.show('amount', 'How much is this bill?');
      return;
    }
    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      fieldErrors.show('name', 'Give this bill a name.');
      return;
    }

    let parsedAmount = amountInput;

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

    const nextDue = getNextDueDate(recurTypeInput, dueDate);
    const nextDueISO = nextDue
      ? nextDue.getFullYear() + '-' + String(nextDue.getMonth() + 1).padStart(2, '0') + '-' + String(nextDue.getDate()).padStart(2, '0')
      : '';
    // Version 2.1: an earlier month when you're behind (only one of the recent due dates).
    // Version 2.1 (round 8): the date picked in the date box is the first one due (any month or year).
    const dueNowISO = recurTypeInput !== 'onetime' && recurTypeInput !== 'custom' && /^\d{4}-\d{2}-\d{2}$/.test(dueNowInput) ? dueNowInput : nextDueISO;

    const updated: HouseholdModel = { ...model, bills: [...model.bills] };

    if (editingId) {
      updated.bills = updated.bills.map((b) => {
        if (b.id !== editingId) return b;
        // Redesign: keep paid history; only the current cycle changes, and its due date
        // only moves if the schedule changed.
        const curC = currentCycle(b);
        const scheduleChanged =
          b.recurringType !== recurTypeInput ||
          JSON.stringify(b.dueDate || {}) !== JSON.stringify(dueDate) ||
          (dueNowInput !== dueNowOriginal && !!curC && !isCyclePaid(curC) && !!dueNowISO && curC.dueDate !== dueNowISO);
        const cycles: BillCycle[] = withEditedCurrentCycle(b.cycles, { amountDue: Math.round((parsedAmount + carriedEdit) * 100) / 100, paymentMethod: paymentMethodInput }, dueNowISO, scheduleChanged);
        return {
          ...b,
          name: trimmedName,
          category: categoryInput.trim(),
          priority: priorityInput,
          notes: notesInput,
          recurringType: recurTypeInput,
          ...customFields,
          dueDate,
          cycles,
          isSubscription: subscriptionInput,
          // Only stamp a default status when the toggle is turned ON and it
          // never had one before. Keep/Cancel/Reactivate are the only thing
          // that should change subscriptionStatus after that — resaving the
          // form should never silently reset an already-cancelled bill.
          subscriptionStatus: subscriptionInput ? (b.subscriptionStatus || 'active') : b.subscriptionStatus,
        };
      });
    } else {
      const newBill: Bill = {
        id: makeId('bill'),
        name: trimmedName,
        category: categoryInput.trim(),
        recurringType: recurTypeInput,
        ...customFields,
        dueDate,
        priority: priorityInput,
        owner: 'shared',
        notes: notesInput,
        cycles: [
          { id: makeId('cycle'), dueDate: dueNowISO, amountDue: parsedAmount, amountPaid: '', paidDate: '', notes: '', paymentMethod: paymentMethodInput },
        ],
        createdAt: Date.now(),
        isSubscription: subscriptionInput,
        subscriptionStatus: subscriptionInput ? 'active' : undefined,
      };
      updated.bills = [...updated.bills, newBill];
    }

    let toSave = updated;
    if (editingId) {
      // Version 3 (M4): a payment made before the due date moved gets placed on the right bill.
      const before = model.bills.find((x) => x.id === editingId);
      const edited = updated.bills.find((x) => x.id === editingId);
      const moved =
        !!before &&
        !!edited &&
        (currentCycle(before)?.dueDate !== dueNowISO ||
          before.recurringType !== edited.recurringType ||
          JSON.stringify(before.dueDate || {}) !== JSON.stringify(edited.dueDate || {}));
      const place = moved && edited ? paymentToPlace(edited, dueNowISO) : null;
      if (place && edited) {
        const swap = (rec: typeof edited) => ({ ...updated, bills: updated.bills.map((x) => (x.id === editingId ? rec : x)) });
        if (place.other) {
          setPlaceAsk({
            record: edited,
            placement: place,
            noun: 'bill',
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
      const wasNew = !editingId;
      await saveModel(toSave);
      showLeafTick(editingId ? 'Saved' : 'Added');
      closeModal();
      if (wasNew) onAdded?.();
    } catch (e) {
      setErrorMsg(notSaved('this bill'));
    } finally {
      setSaving(false);
    }
  }

  async function performDelete() {
    // H-21 (2026-10-22): the newest data, not the data from when the pop-up opened.
    const current = getModel() ?? model;
    if (!editingId || !current) return;
    const updated: HouseholdModel = {
      ...current,
      bills: current.bills.filter((b) => b.id !== editingId),
    };
    setSaving(true);
    try {
      await saveModel(updated);
      closeModal();
    } catch (e) {
      setErrorMsg(notDeleted('this bill'));
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert(
      'Delete this bill?',
      'Deletes the bill and all payment history. Cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: performDelete },
      ]
    );
  }
  async function performDeleteById(id: string) {
    // H-21 (2026-10-22): the newest data, not the data from when the pop-up opened.
    const current = getModel() ?? model;
    if (!current) return;
    const updated: HouseholdModel = {
      ...current,
      bills: current.bills.filter((b) => b.id !== id),
    };
    setSaving(true);
    try {
      await saveModel(updated);
    } catch (e) {
      setErrorMsg(notDeleted('this bill'));
    } finally {
      setSaving(false);
    }
  }
  function handleSwipeDelete(bill: Bill) {
    Alert.alert(
      'Delete this bill?',
      'Deletes the bill and all payment history. Cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => performDeleteById(bill.id) },
      ]
    );
  }
  // Redesign: To-Pay > Bills from the Finance Flow mockup. Each bill is due on its
  // current (unpaid) cycle; paid cycles are history. Grouped Overdue / This week /
  // Later this month / Coming up, with a "still to pay this month" card on top.
  const billDue = (b: Bill): Date | null => {
    const cur = currentCycle(b);
    if (cur?.dueDate && !isCyclePaid(cur)) return new Date(cur.dueDate + 'T00:00:00');
    return cur && isCyclePaid(cur) ? null : getNextDueDate(b.recurringType, b.dueDate);
  };
  const bills = [...model.bills].sort((a, b) => {
    const da = billDue(a);
    const db = billDue(b);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    // Version 2.2 (canvas K3): on the same day, High priority comes first.
    return da.getTime() - db.getTime() || priorityRank(a.priority) - priorityRank(b.priority);
  });
  const overdueIds = new Set(getOverdueItems(model).filter((o) => o.kind === 'bill').map((o) => o.id));
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const monthEnd = new Date(todayStart.getFullYear(), todayStart.getMonth() + 1, 0);
  const daysUntil = (d: Date | null) => (d ? Math.round((d.getTime() - todayStart.getTime()) / 86400000) : Infinity);
  const unpaid = bills.filter((b) => billDue(b) !== null);
  const sections: { title: string; items: Bill[] }[] = [
    { title: 'Overdue', items: unpaid.filter((b) => overdueIds.has(b.id)) },
    { title: 'This week', items: unpaid.filter((b) => !overdueIds.has(b.id) && daysUntil(billDue(b)) <= 7) },
    { title: 'Later this month', items: unpaid.filter((b) => !overdueIds.has(b.id) && daysUntil(billDue(b)) > 7 && (billDue(b) as Date) <= monthEnd) },
    { title: 'Coming up', items: unpaid.filter((b) => !overdueIds.has(b.id) && (billDue(b) as Date) > monthEnd && daysUntil(billDue(b)) > 7) },
    // Version 2.1 fix: a bill saved without a due date used to be hidden. It shows here.
    {
      title: 'No due date',
      items: bills.filter((b) => {
        if (billDue(b) !== null) return false;
        const cur = currentCycle(b);
        return !cur || !isCyclePaid(cur);
      }),
    },
  ];
  const paidThisMonth = bills.filter((b) => wasPaidThisMonth(b));
  const dueThisMonth = unpaid.filter((b) => overdueIds.has(b.id) || (billDue(b) as Date) <= monthEnd);
  const stillToPay = dueThisMonth.reduce((sum, b) => sum + billAmount(b), 0);
  const subs = bills.filter((b) => b.isSubscription);
  const subsActive = subs.filter((b) => b.subscriptionStatus !== 'cancelled').length;
  const fmtDue = (d: Date | null) => (d ? dateText(d, { weekday: true }) : 'No date set');
  const openBill = (b: Bill) => navigation.navigate('PayDetail', { kind: 'bill', id: b.id });

  return (
    <SafeAreaView style={styles.container}>
      {!formOnly && (
      <PullToRefreshScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.group, styles.summaryCard]}>
          <GradientFill match={[styles.group, styles.summaryCard]} />
          <Text style={styles.balanceBannerLabel}>Still to pay this month</Text>
          <CountingText style={[styles.balanceBannerAmount, { color: redUnlessZero(stillToPay, colors) }]} value={stillToPay} format={formatPeso} />
          <Text style={styles.summarySub}>
            {paidThisMonth.length} of {paidThisMonth.length + dueThisMonth.length} {paidThisMonth.length + dueThisMonth.length === 1 ? 'bill' : 'bills'} paid
          </Text>
        </View>

        {subs.length > 0 && (
          <TouchableOpacity style={[styles.group, styles.subsRow]} onPress={() => navigation.navigate('Subscriptions')} accessibilityRole="button" testID="topay-subscriptions">
            <GradientFill match={[styles.group, styles.subsRow]} />
            <View style={styles.tile}>
              <GradientFill match={styles.tile} />
              <Ionicons name="repeat" size={17} color={colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.billName}>Subscriptions</Text>
              <Text style={styles.billSub}>{subsActive} active · {formatPeso(subs.filter((b) => b.subscriptionStatus !== 'cancelled').reduce((s2, b) => s2 + billAmount(b), 0)).replace('.00', '')} a month</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
          </TouchableOpacity>
        )}

        {bills.length === 0 && (
          <Text style={styles.emptyText}>No bills yet. Tap + to add one.</Text>
        )}

        {sections.map((sec) => sec.items.length === 0 ? null : (
          <View key={sec.title} style={styles.section}>
            <Text style={[styles.sectionHeader, sec.title === 'Overdue' && { color: colors.negative }]}>{sec.title}</Text>
            <View style={styles.group}>
              <GradientFill match={styles.group} />
              {sec.items.map((bill, rowIndex) => {
                const due = billDue(bill);
                const days = daysUntil(due);
                const isOverdue = overdueIds.has(bill.id);
                const cancelled = bill.isSubscription && bill.subscriptionStatus === 'cancelled';
                return (
                  <SwipeableRow
                    key={bill.id}
                    enabled={Boolean(model.settings.swipeToDeleteEnabled)}
                    onDelete={() => handleSwipeDelete(bill)}
                    testID={`bill-swipe-${bill.id}`}
                    flat
                  >
                    <PayRow
                      testID={`bill-row-${bill.id}`}
                      glow={arrived === bill.id}
                      addedBy={bill.addedBy}
                      icon={bill.isSubscription ? 'repeat' : 'flash-outline'}
                      title={bill.name || 'Untitled bill'}
                      sub={`${!due ? 'Add a due date anytime' : `${isOverdue ? 'Was due' : 'Due'} ${fmtDue(due)}`}${bill.isSubscription ? (cancelled ? ' · Cancelled' : ' · Subscription') : ''}`}
                      amount={formatPeso(billAmount(bill))}
                      amountColor={isOverdue ? colors.negative : colors.ink}
                      badge={isOverdue ? { text: 'Overdue', tone: 'overdue' } : days <= 7 ? { text: days <= 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`, tone: 'soon' } : undefined}
                      divider={rowIndex > 0}
                      priority={bill.priority}
                      onPress={() => openBill(bill)}
                    />
                  </SwipeableRow>
                );
              })}
            </View>
          </View>
        ))}

        {paidThisMonth.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Paid this month</Text>
            <View style={styles.group}>
              <GradientFill match={styles.group} />
              {paidThisMonth.map((bill, rowIndex) => (
                <PayRow
                  key={bill.id}
                  icon={bill.isSubscription ? 'repeat' : 'flash-outline'}
                  title={bill.name || 'Untitled bill'}
                  sub={`Paid ${paidCycles(bill)[0]?.paidDate ?? ''}`}
                  amount={formatPeso(Number(paidCycles(bill)[0]?.amountPaid) || 0)}
                  amountColor={colors.inkDim}
                  badge={{ text: 'Paid', tone: 'paid' }}
                  divider={rowIndex > 0}
                  addedBy={paidCycles(bill)[0]?.paidBy}
                  onPress={() => openBill(bill)}
                />
              ))}
            </View>
          </View>
        )}

      </PullToRefreshScrollView>
      )}

      {/* Approved "Option 2: simple" form (Forms Redesign canvas). */}
      <BottomSheet
        visible={modalOpen}
        onClose={closeModal}
        // One sheet for New bill / debt / loan, so switching only changes the form.
        shared="pay-form"
        grouped
        header={<SheetBar title={editingId ? 'Edit bill' : 'New bill'} onCancel={closeModal} onDone={handleSave} doneLabel={editingId ? 'Save' : 'Add'} busy={saving} />}
      >
        {!editingId && (
          <KindSwitch
            key="pay-form-kind"
            current="bills"
            onSwitch={(to) => {
              const carry = { amount: amountInput, name: nameInput, date: onetimeDateInput || undefined };
              // The other form takes this sheet's place (no close and reopen).
              startSheetHandoff(() => closeModal());
              switchToPayAdd(to, carry);
            }}
          />
        )}
        {/* Same key in the bill, debt and loan forms: switching keeps the very same amount
            box (and the keyboard stays up), even though the loan form has an extra row above. */}
        {/* Smoothness 2026-10-23 (Cath): the fields fade when Bill / Debt / Loan changes. */}
        <FormSwapFade key="pay-form-body" channels={['kind']} swapKey={'bills'}>
          <Guided key="pay-form-amount" {...fieldErrors.props('amount')} focusRef={amountRef} inset={false} radius={22}>
            <BigAmount mark="required" label={carriedEdit > 0 ? 'New charges' : 'Amount due'} value={amountInput} onChange={setAmountInput} color={colors.negative} autoFocus={!editingId} focusRef={amountRef} invalid={fieldErrors.field === 'amount'} />
          </Guided>

          <FormGroup>
            <Guided {...fieldErrors.props('name')} focusRef={nameRef}>
              <InputRow mark="required" label="Name" value={nameInput} onChangeText={setNameInput} placeholder="e.g. Meralco" testID="bill-name-input" inputRef={nameRef} invalid={fieldErrors.field === 'name'} />
            </Guided>
            <PickerRow mark="optional" label="Category" value={categoryInput || 'Choose'} open={openRow === 'category'} onToggle={() => toggleRow('category')}>
              <Choices options={BILL_CATEGORIES.map((c) => ({ id: c, label: c }))} value={categoryInput as any} onChange={(c) => setCategoryInput(c)} />
              <OwnChoiceField style={styles.inlineField} options={BILL_CATEGORIES} value={categoryInput} onChange={setCategoryInput} />
            </PickerRow>
            <PickerRow mark="required" label="Repeats" value={recurTypeInput === 'onetime' ? 'Once' : recurTypeInput === 'monthly' ? 'Every month' : recurTypeInput === 'custom' ? 'Custom' : 'Every year'} open={openRow === 'repeat'} onToggle={() => toggleRow('repeat')}>
              <Choices
                options={[{ id: 'onetime', label: 'Once' }, { id: 'monthly', label: 'Every month' }, { id: 'annual', label: 'Every year' }, { id: 'custom', label: 'Custom' }]}
                value={recurTypeInput as any}
                onChange={(v) => setRecurTypeInput(v as RecurringType)}
              />
            </PickerRow>
            <Guided {...fieldErrors.props('due')} onShow={() => setOpenRow('due')}>
            <PickerRow mark="required" label={recurTypeInput === 'custom' ? 'Schedule' : 'Due on'} value={recurTypeInput === 'custom' ? `${customFreqLabel(customFreqInput)}${customStartDateInput ? ` from ${customStartDateInput}` : ''}` : dueLabel} open={openRow === 'due'} onToggle={() => toggleRow('due')} invalid={fieldErrors.field === 'due'}>
              {recurTypeInput === 'custom' ? (
                <CustomScheduleFields freq={customFreqInput} onFreq={setCustomFreqInput} start={customStartDateInput} onStart={setCustomStartDateInput} count={customOccurrenceInput} onCount={setCustomOccurrenceInput} testID="bill-custom-start" />
              ) : recurTypeInput === 'onetime' ? (
                <DateField value={onetimeDateInput} onChange={setOnetimeDateInput} placeholder="Pick a date" testID="bill-due-date-field" />
              ) : (
                <ScheduleChoices
                  rt={recurTypeInput}
                  date={onetimeDateInput}
                  onDate={setOnetimeDateInput}
                  day={dayInput}
                  onDay={setDayInput}
                  month={monthInput}
                  onMonth={setMonthInput}
                  firstDue={dueNowInput}
                  onFirstDue={setDueNowInput}
                  testID="bill-first-due-field"
                />
              )}
            </PickerRow>
            </Guided>
            <PickerRow mark="optional" label="Paid from" value={accountName(model, paymentMethodInput) ?? 'Choose'} dot={paymentMethodInput ? paymentMethodColor(model, paymentMethodInput) : null} open={openRow === 'account'} onToggle={() => toggleRow('account')}>
              <AccountChoices model={model} value={paymentMethodInput} onChange={setPaymentMethodInput} optional />
            </PickerRow>
          </FormGroup>

          <FormGroup>
            {/* 2.2 (Cath): when to tick it. One piece with the switch, so no line runs
                between the switch and its example (the line clashed with the text). */}
            <View>
              <SwitchRow label="Subscription" value={subscriptionInput} onChange={setSubscriptionInput} />
              <Text style={{ fontSize: 13, lineHeight: 18, color: colors.inkDim, paddingHorizontal: 16, paddingBottom: 12 }}>
                Tick it for things you can cancel anytime, like Netflix, Spotify, YouTube Premium, iCloud or a gym membership. Leave it off for rent, Meralco, water or internet.
              </Text>
            </View>
            <PickerRow mark="optional" label="More details" value={[priorityInput ? 'Priority' : '', notesInput ? 'Note' : ''].filter(Boolean).join(', ') || 'Priority, note'} open={openRow === 'more'} onToggle={() => toggleRow('more')}>
              <MarkedLabel text="Priority" mark="optional" style={styles.inlineLabel} />
              <Choices
                options={PRIORITIES.map((pr) => ({ id: pr, label: pr.charAt(0).toUpperCase() + pr.slice(1) }))}
                value={priorityInput as any}
                onChange={(pr) => setPriorityInput(priorityInput === pr ? '' : pr)}
              />
              <MarkedLabel text="Note" mark="optional" style={[styles.inlineLabel, { marginTop: 12 }]} />
              <TextInput style={styles.inlineField} placeholder="Optional" placeholderTextColor={colors.inkFaint} value={notesInput} onChangeText={setNotesInput} multiline />
            </PickerRow>
          </FormGroup>

          {carriedEdit > 0 && (
            <Footnote>
              {`Plus ${formatPeso(carriedEdit)} carried from last time. Total due ${formatPeso((typeof amountInput === 'number' ? amountInput : 0) + carriedEdit)}.`}
            </Footnote>
          )}
          {!!nextDueText && <Footnote>{nextDueText}</Footnote>}
          <ErrorNote text={errorMsg} />
          {editingId && <Button label="Delete bill" variant="destructive" onPress={handleDelete} />}
        </FormSwapFade>
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
    summarySub: { fontSize: 15, color: colors.inkDim, marginTop: 2 },
    section: { marginBottom: 20 },
    sectionHeader: { fontSize: 13, fontWeight: '600', color: colors.inkDim, textTransform: 'uppercase', letterSpacing: 0.3, marginLeft: 16, marginBottom: 6 },
    tile: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    subsRow: { flexDirection: 'row', alignItems: 'center', minHeight: 60, paddingHorizontal: 16, marginBottom: 20 },
    balanceBannerLabel: { fontSize: 13, color: colors.inkDim, marginBottom: 2 },
    balanceBannerAmount: { fontSize: 22, fontWeight: '700', color: colors.negative },
    emptyText: { fontSize: 15, color: colors.inkDim, marginBottom: 12, textAlign: 'center' },
    billName: { fontSize: 17, fontWeight: '500', color: colors.ink, flexShrink: 1 },
    billSub: { fontSize: 13, color: colors.inkDim, marginTop: 1 },
    inlineLabel: { fontSize: 13, fontWeight: '600', color: colors.inkDim, marginBottom: 6 },
    inlineField: { marginTop: 10, backgroundColor: colors.navy2, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: colors.ink },
    errorText: { fontSize: 12, color: colors.error, marginBottom: 10 },
  });
}
