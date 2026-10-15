import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import { useToPayAddRequest } from '../fabActions';
import { useData } from '../DataContext';
import { PullToRefreshScrollView } from '../PullToRefreshScrollView';
import { formatPeso } from '../balanceProjection';
import { getNextDueDate, formatShortDate, recurringTypeLabel, RecurringType } from '../recurrence';
import type { Bill, HouseholdModel, BillCycle, PaymentMethod } from '../types';
import PaymentMethodPicker from '../components/PaymentMethodPicker';
import BottomSheet from '../components/BottomSheet';
import CollapsibleRow from '../components/CollapsibleRow';
import SwipeableRow from '../components/SwipeableRow';
import { makeId } from '../utils';
import DateField from '../components/DateField';
import Pill from '../components/Pill';
import { hapticSelection } from '../haptics';
import Button from '../components/Button';
import Card from '../components/Card';
import AmountInput from '../components/AmountInput';
import { getOverdueItems } from '../overdue';
import { currentCycle, withEditedCurrentCycle, isCyclePaid, wasPaidThisMonth, paidCycles } from '../billPayments';
import PayRow from '../components/PayRow';
import { useNavigation } from '@react-navigation/native';
import GradientFill from '../components/GradientFill';

function billAmount(bill: Bill): number {
  // Redesign: the amount of the cycle that's due next (paid cycles are history).
  const c = currentCycle(bill);
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

type BillsScreenProps = {
  openBillId?: string;
  // Set only when this bill was requested via a swipe on TransactionsScreen
  // (openBillRequest.ts) — increments every request, even for the same
  // bill id, so the guard below can tell "same request, don't reopen" apart
  // from "a fresh request for the same bill, please open it again."
  openBillNonce?: number;
};

export default function BillsScreen({ openBillId, openBillNonce }: BillsScreenProps = {}) {
  // Redesign: the floating + adds a bill while this list is showing.
  useToPayAddRequest('bills', () => openAddModal());
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { model, saveModel } = useData();

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
      openEditModal(target);
    }
  }, [model, openBillId, openBillNonce]);
  const styles = makeStyles(colors);

  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [amountInput, setAmountInput] = useState<number | ''>('');
  const [priorityInput, setPriorityInput] = useState<'high' | 'medium' | 'low' | ''>('');
  const [subscriptionInput, setSubscriptionInput] = useState(false);
  const [notesInput, setNotesInput] = useState('');
  const [paymentMethodInput, setPaymentMethodInput] = useState<PaymentMethod | undefined>(undefined);
  const [recurTypeInput, setRecurTypeInput] = useState<RecurringType>('onetime');
  const [onetimeDateInput, setOnetimeDateInput] = useState('');
  const [dayInput, setDayInput] = useState('');
  const [monthInput, setMonthInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

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
    setSubscriptionInput(false);
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
    setAmountInput(billAmount(bill) === 0 ? '' : billAmount(bill));
    setPriorityInput(bill.priority || '');
    setNotesInput(bill.notes || '');
    setSubscriptionInput(!!bill.isSubscription);
    setPaymentMethodInput(currentCycle(bill)?.paymentMethod);
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

  async function handleSetSubscriptionStatus(billId: string, status: 'active' | 'cancelled') {
    if (!model) return;
    const updated: HouseholdModel = {
      ...model,
      bills: model.bills.map((b) => (b.id === billId ? { ...b, subscriptionStatus: status } : b)),
    };
    try {
      await saveModel(updated);
    } catch (e) {
      Alert.alert('Failed to update', 'Please try again.');
    }
  }

  async function handleSave() {
    if (!model) return;
    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      setErrorMsg('Enter a name for this bill.');
      return;
    }

    let parsedAmount = amountInput === '' ? 0 : amountInput;

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

    const nextDue = getNextDueDate(recurTypeInput, dueDate);
    const nextDueISO = nextDue
      ? nextDue.getFullYear() + '-' + String(nextDue.getMonth() + 1).padStart(2, '0') + '-' + String(nextDue.getDate()).padStart(2, '0')
      : '';

    const updated: HouseholdModel = { ...model, bills: [...model.bills] };

    if (editingId) {
      updated.bills = updated.bills.map((b) => {
        if (b.id !== editingId) return b;
        // Redesign: keep paid history; only the current cycle changes, and its due date
        // only moves if the schedule changed.
        const scheduleChanged = b.recurringType !== recurTypeInput || JSON.stringify(b.dueDate || {}) !== JSON.stringify(dueDate);
        const cycles: BillCycle[] = withEditedCurrentCycle(b.cycles, { amountDue: parsedAmount, paymentMethod: paymentMethodInput }, nextDueISO, scheduleChanged);
        return {
          ...b,
          name: trimmedName,
          category: categoryInput.trim(),
          priority: priorityInput,
          notes: notesInput,
          recurringType: recurTypeInput,
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
        dueDate,
        priority: priorityInput,
        owner: 'shared',
        notes: notesInput,
        cycles: [
          { id: makeId('cycle'), dueDate: nextDueISO, amountDue: parsedAmount, amountPaid: '', paidDate: '', notes: '', paymentMethod: paymentMethodInput },
        ],
        createdAt: Date.now(),
        isSubscription: subscriptionInput,
        subscriptionStatus: subscriptionInput ? 'active' : undefined,
      };
      updated.bills = [...updated.bills, newBill];
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
      bills: model.bills.filter((b) => b.id !== editingId),
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
      'Delete this bill?',
      'Deletes the bill and all payment history. Cannot be undone.',
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
      bills: model.bills.filter((b) => b.id !== id),
    };
    setSaving(true);
    try {
      await saveModel(updated);
    } catch (e) {
      setErrorMsg('Failed to delete. Please try again.');
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
    return da.getTime() - db.getTime();
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
  ];
  const paidThisMonth = bills.filter((b) => wasPaidThisMonth(b));
  const dueThisMonth = unpaid.filter((b) => overdueIds.has(b.id) || (billDue(b) as Date) <= monthEnd);
  const stillToPay = dueThisMonth.reduce((sum, b) => sum + billAmount(b), 0);
  const subs = bills.filter((b) => b.isSubscription);
  const subsActive = subs.filter((b) => b.subscriptionStatus !== 'cancelled').length;
  const fmtDue = (d: Date | null) => (d ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'No date set');
  const openBill = (b: Bill) => navigation.navigate('PayDetail', { kind: 'bill', id: b.id });

  return (
    <SafeAreaView style={styles.container}>
      <PullToRefreshScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.group, styles.summaryCard]}>
          <GradientFill match={[styles.group, styles.summaryCard]} />
          <Text style={styles.balanceBannerLabel}>Still to pay this month</Text>
          <Text style={styles.balanceBannerAmount}>{formatPeso(stillToPay)}</Text>
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
                      icon={bill.isSubscription ? 'repeat' : 'flash-outline'}
                      title={bill.name || 'Untitled bill'}
                      sub={`${isOverdue ? 'Was due' : 'Due'} ${fmtDue(due)}${bill.isSubscription ? (cancelled ? ' · Cancelled' : ' · Subscription') : ''}`}
                      amount={formatPeso(billAmount(bill))}
                      amountColor={colors.negative}
                      badge={isOverdue ? { text: 'Overdue', tone: 'overdue' } : days <= 7 ? { text: days <= 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`, tone: 'soon' } : undefined}
                      divider={rowIndex > 0}
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
                  onPress={() => openBill(bill)}
                />
              ))}
            </View>
          </View>
        )}

      </PullToRefreshScrollView>

      <BottomSheet
        visible={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Edit bill' : 'New bill'}
      >
        <Text style={styles.inputLabel}>Bill name</Text>
                <TextInput
                  autoFocus={!editingId}
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
                <AmountInput
                  style={styles.amountInput}
                  value={amountInput}
                  onChangeAmount={setAmountInput}
                />

                <Text style={styles.inputLabel}>Repeats</Text>
                <View style={styles.pillRow}>
                  {RECUR_TYPES.map((rt) => (
                    <Pill
                      key={rt}
                      label={recurringTypeLabel(rt)}
                      tone="sheet"
                      fill
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
                  placeholder="2025-03-15"
                  clearable
                  testID="bill-due-date-field"
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

                <Text style={styles.inputLabel}>Priority (optional)</Text>
                <View style={styles.pillRow}>
                  {PRIORITIES.map((p) => (
                    <Pill
                      key={p}
                      label={p.charAt(0).toUpperCase() + p.slice(1)}
                      tone="sheet"
                      fill
                      active={priorityInput === p}
                      onPress={() => setPriorityInput(priorityInput === p ? '' : p)}
                    />
                  ))}
                </View>

                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}
                  onPress={() => { hapticSelection(); setSubscriptionInput((prev) => !prev); }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      borderWidth: 2,
                      borderColor: subscriptionInput ? colors.gold : colors.inkFaint,
                      backgroundColor: subscriptionInput ? colors.gold : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 10,
                    }}
                  >
                    <GradientFill match={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      borderWidth: 2,
                      borderColor: subscriptionInput ? colors.gold : colors.inkFaint,
                      backgroundColor: subscriptionInput ? colors.gold : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 10,
                    }} />
                    {subscriptionInput && <Ionicons name="checkmark" size={14} color={colors.navy2} />}
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>Subscription</Text>
                </TouchableOpacity>

                <PaymentMethodPicker
                  value={paymentMethodInput}
                  onChange={setPaymentMethodInput}
                  debitAccounts={model.balanceAccounts.debit}
                  creditAccounts={model.balanceAccounts.credit}
                />

                <Text style={styles.inputLabel}>Notes (optional)</Text>
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  placeholder="Optional notes"
                  placeholderTextColor={colors.inkFaint}
                  value={notesInput}
                  onChangeText={setNotesInput}
                  multiline
                />

                {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

                <Button label="Save" onPress={handleSave} loading={saving} />

                {editingId && <Button label="Delete bill" variant="destructive" onPress={handleDelete} />}

                <Button label="Cancel" variant="quiet" onPress={closeModal} />
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
    summarySub: { fontSize: 15, color: colors.inkDim, marginTop: 2 },
    section: { marginBottom: 20 },
    sectionHeader: { fontSize: 13, fontWeight: '600', color: colors.inkDim, textTransform: 'uppercase', letterSpacing: 0.3, marginLeft: 16, marginBottom: 6 },
    tile: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    subsRow: { flexDirection: 'row', alignItems: 'center', minHeight: 60, paddingHorizontal: 16, marginBottom: 20 },
    overdueBadge: { marginTop: 3, fontSize: 12, fontWeight: '600', color: colors.negative, backgroundColor: colors.errorBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
    balanceBannerLabel: { fontSize: 13, color: colors.inkDim, marginBottom: 2 },
    balanceBannerAmount: { fontSize: 22, fontWeight: '700', color: colors.negative },
    emptyText: { fontSize: 15, color: colors.inkDim, marginBottom: 12, textAlign: 'center' },
    billCollapsedRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flex: 1,
    },
    billRowMain: { flex: 1, marginRight: 10 },
    billName: { fontSize: 17, fontWeight: '500', color: colors.ink, flexShrink: 1 },
    billSub: { fontSize: 13, color: colors.inkDim, marginTop: 1 },
    billAmount: { fontSize: 17, fontWeight: '600', color: colors.negative },
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
      fontSize: 11,
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
