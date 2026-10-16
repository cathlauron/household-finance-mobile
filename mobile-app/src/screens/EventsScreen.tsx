import React, { useEffect, useLayoutEffect, useState } from 'react';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import AppSwitch from '../components/AppSwitch';
import { useNavigation } from '@react-navigation/native';
import SegmentedControl from '../components/SegmentedControl';
import { todayISO } from '../dateUtils';
import { View, TouchableOpacity, StyleSheet, ScrollView, Modal, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { headerButtonText } from '../navigation/LargeHeader';
import { Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { PullToRefreshScrollView } from '../PullToRefreshScrollView';
import { formatPeso } from '../balanceProjection';
import type { EventItem, HouseholdModel, SavingsGoal, ManualTransaction } from '../types';
import SwipeableRow from '../components/SwipeableRow';
import { makeId } from '../utils';
import DateField from '../components/DateField';
import Pill from '../components/Pill';
import { hapticSelection } from '../haptics';
import Button from '../components/Button';
import AmountInput from '../components/AmountInput';
import GradientFill from '../components/GradientFill';
import { useStickyState } from '../stickyState';

const EVENT_TYPES: { id: EventItem['type']; label: string }[] = [
  { id: 'birthday', label: 'Birthday' },
  { id: 'anniversary', label: 'Anniversary' },
  { id: 'other', label: 'Other' },
];

function isValidDateOrEmpty(s: string): boolean {
  if (s.trim() === '') return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
}


function typeLabel(t: EventItem['type']): string {
  const found = EVENT_TYPES.find((x) => x.id === t);
  return found ? found.label : 'Event';
}

// ---- Events savings-goal auto-sync (mirrors TravelScreen's syncTripSavingsGoal) ----
// Unlike Travel, an Event has no checklist -- its budget field is used directly as the
// savings goal target. If trackInSavings is off, or there's no budget, any existing
// linked goal is removed. Otherwise the linked goal (matched by savingsGoalId) is
// created or updated to match the event's current name/budget/date.
function syncEventSavingsGoal(
  ev: { name: string; savingsGoalId?: string; onetimeDate?: string },
  trackInSavings: boolean,
  budget: number | '',
  allGoals: SavingsGoal[]
): { goals: SavingsGoal[]; savingsGoalId: string | undefined } {
  const numericBudget = typeof budget === 'number' ? budget : 0;
  const existingIndex = ev.savingsGoalId
    ? allGoals.findIndex((g) => g.id === ev.savingsGoalId)
    : -1;

  if (!trackInSavings || numericBudget <= 0) {
    if (existingIndex === -1) {
      return { goals: allGoals, savingsGoalId: ev.savingsGoalId };
    }
    const goals = allGoals.filter((g) => g.id !== ev.savingsGoalId);
    return { goals, savingsGoalId: undefined };
  }

  const goalName = 'Event: ' + ev.name;
  if (existingIndex === -1) {
    const newGoal: SavingsGoal = {
      id: makeId('savingsgoal'),
      name: goalName,
      targetAmount: numericBudget,
      targetDate: ev.onetimeDate ?? '',
      currentAmount: 0,
      contributions: [],
      createdAt: Date.now(),
    };
    return { goals: [...allGoals, newGoal], savingsGoalId: newGoal.id };
  }

  const goals = allGoals.map((g, i) =>
    i === existingIndex ? { ...g, name: goalName, targetAmount: numericBudget } : g
  );
  return { goals, savingsGoalId: ev.savingsGoalId };
}

// Logs (or removes) a real ManualTransaction as an event is marked Completed / un-marked —
// mirrors reconcileTravelChecklistTransactions in TravelScreen.tsx, one-shot instead of
// per-checklist-item since an Event has a single budget rather than a checklist.
function reconcileEventTransaction(
  priorCompleted: boolean,
  priorTransactionId: string | undefined,
  newCompleted: boolean,
  budget: number | '',
  transactions: ManualTransaction[],
  eventName: string,
  completedDate: string | undefined
): { transactionId: string | undefined; transactions: ManualTransaction[] } {
  const hasBudget = typeof budget === 'number' && budget > 0;
  let txns = [...transactions];

  if (newCompleted && !priorCompleted && hasBudget && !priorTransactionId) {
    const newTxn: ManualTransaction = {
      id: makeId('txn'),
      date: completedDate || todayISO(),
      label: eventName,
      amount: budget as number,
      direction: 'out',
      owner: 'shared',
      category: 'Events',
    };
    txns = [...txns, newTxn];
    return { transactionId: newTxn.id, transactions: txns };
  }

  if (!newCompleted && priorCompleted && priorTransactionId) {
    txns = txns.filter((t) => t.id !== priorTransactionId);
    return { transactionId: undefined, transactions: txns };
  }

  if (newCompleted && priorTransactionId && hasBudget) {
    txns = txns.map((t) =>
      t.id === priorTransactionId ? { ...t, amount: budget as number, label: eventName } : t
    );
    return { transactionId: priorTransactionId, transactions: txns };
  }

  return { transactionId: priorTransactionId, transactions: txns };
}

// ---- Redesign helpers ----
function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
// The next date this event happens (today counts), or null if it has no date.
function nextDate(ev: EventItem, today: string): string | null {
  if (ev.recurrence === 'onetime') return ev.onetimeDate || null;
  if (typeof ev.month !== 'number' || typeof ev.day !== 'number') return null;
  const y = Number(today.slice(0, 4));
  const thisYear = isoOf(new Date(y, ev.month - 1, ev.day));
  return thisYear >= today ? thisYear : isoOf(new Date(y + 1, ev.month - 1, ev.day));
}
function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);
}
function eventBudget(ev: EventItem): number {
  if (ev.items && ev.items.length) return ev.items.reduce((s, i) => s + (typeof i.cost === 'number' ? i.cost : 0), 0);
  return typeof ev.budget === 'number' ? ev.budget : 0;
}
// An event that repeats every year goes back to Upcoming 30 days after it was done,
// keeping a note of that year in its history.
function rollOverAnnualEvents(events: EventItem[], txns: ManualTransaction[], today: string): EventItem[] | null {
  let changed = false;
  const next = events.map((ev) => {
    if (ev.recurrence !== 'annual' || !ev.completed || !ev.completedDate) return ev;
    if (daysBetween(ev.completedDate, today) <= 30) return ev;
    changed = true;
    const spent = txns.find((t) => t.id === ev.expenseTransactionId)?.amount ?? eventBudget(ev);
    return {
      ...ev,
      completed: false,
      completedDate: undefined,
      expenseTransactionId: undefined,
      history: [...(ev.history || []), { date: ev.completedDate, budget: eventBudget(ev), spent }],
    };
  });
  return changed ? next : null;
}

export default function EventsScreen() {
  const { colors } = useTheme();
  const { model, saveModel } = useData();
  const styles = makeStyles(colors);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  // The cost row just added with "+ Add item", so its name field gets the cursor.
  const [focusItemId, setFocusItemId] = useState<string | null>(null);
  useEffect(() => setFocusItemId(null), [modalOpen]);
  const [nameInput, setNameInput] = useState('');
  const [typeInput, setTypeInput] = useState<EventItem['type']>('birthday');
  const [recurrenceInput, setRecurrenceInput] = useState<EventItem['recurrence']>('annual');
  const [monthInput, setMonthInput] = useState('');
  const [dayInput, setDayInput] = useState('');
  const [onetimeDateInput, setOnetimeDateInput] = useState('');
  const [budgetInput, setBudgetInput] = useState<number | ''>('');
  const [completedInput, setCompletedInput] = useState(false);
  const [trackInSavingsInput, setTrackInSavingsInput] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [itemsInput, setItemsInput] = useState<{ id: string; name: string; cost: number | '' }[]>([]);
  const [view, setView] = useStickyState<'up' | 'done'>('events.view', 'up');
  const [openId, setOpenId] = useState<string | null>(null);
  const navigation = useNavigation<any>();

  // Redesign: Add in the top bar adds an event.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={openAddModal} accessibilityRole="button" accessibilityLabel="Add an event" testID="events-add" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[headerButtonText, { fontWeight: '700', color: colors.gold }]}>Add</Text>
        </TouchableOpacity>
      ),
    });
  });

  useEffect(() => {
    if (!model) return;
    const rolled = rollOverAnnualEvents(model.events ?? [], model.manualTransactions ?? [], todayISO());
    if (rolled) saveModel({ ...model, events: rolled });
  }, [model, saveModel]);

  if (!model) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator color={colors.accent ?? colors.gold} />
      </View>
    );
  }

  const events: EventItem[] = model.events ?? [];
  const today = todayISO();
  const upcoming = events
    .filter((ev) => !ev.completed)
    .map((ev) => {
      const date = nextDate(ev, today);
      return { ev, date, days: date ? daysBetween(today, date) : null };
    })
    .filter((x) => x.days === null || x.days >= 0 || x.ev.recurrence === 'annual')
    .sort((a, b) => (a.date || '9999') < (b.date || '9999') ? -1 : 1);
  const toSpend = upcoming.reduce((s2, x) => s2 + eventBudget(x.ev), 0);
  const spentFor = (ev: EventItem) => (model.manualTransactions || []).find((t) => t.id === ev.expenseTransactionId)?.amount ?? eventBudget(ev);
  const doneRows = [
    ...events
      .filter((ev) => ev.completed)
      .map((ev) => ({ key: ev.id, ev, current: true, name: ev.name, date: ev.completedDate || ev.onetimeDate || null, budget: eventBudget(ev), spent: spentFor(ev) })),
    ...events.flatMap((ev) =>
      (ev.history || []).map((h, i) => ({ key: `${ev.id}-h${i}`, ev, current: false, name: ev.name, date: h.date as string | null, budget: h.budget, spent: h.spent }))
    ),
    // One-time events whose day has passed without being marked done.
    ...events
      .filter((ev) => !ev.completed && ev.recurrence === 'onetime' && ev.onetimeDate && ev.onetimeDate < today)
      .map((ev) => ({ key: ev.id + '-past', ev, current: false, name: ev.name, date: ev.onetimeDate || null, budget: eventBudget(ev), spent: 0 })),
  ].sort((a, b) => ((a.date || '') < (b.date || '') ? 1 : -1));

  function dateTile(date: string | null, muted: boolean) {
    const d = date ? new Date(date + 'T00:00:00') : null;
    const ok = d && !isNaN(d.getTime());
    return (
      <View style={[styles.dateTile, { backgroundColor: muted ? colors.navy1 : colors.accentTint }]}>
        {!muted && <GradientFill kind="tint" color={colors.accentTint} radius={10} />}
        <Text style={[styles.dateTileM, { color: muted ? colors.inkDim : colors.gold }]}>{ok ? d!.toLocaleDateString('en-US', { month: 'short' }) : '—'}</Text>
        <Text style={[styles.dateTileD, { color: muted ? colors.inkDim : colors.gold }]}>{ok ? d!.getDate() : ''}</Text>
      </View>
    );
  }

  // Mark done / not done right from the list (logs or removes the event's expense).
  async function markDone(ev: EventItem, done: boolean) {
    if (!model) return;
    hapticSelection();
    const completedDate = done ? todayISO() : undefined;
    const { transactionId, transactions } = reconcileEventTransaction(!!ev.completed, ev.expenseTransactionId, done, eventBudget(ev) || '', model.manualTransactions ?? [], ev.name, completedDate);
    await saveModel({
      ...model,
      events: events.map((e) => (e.id === ev.id ? { ...e, completed: done, completedDate, expenseTransactionId: transactionId } : e)),
      manualTransactions: transactions,
    });
    setOpenId(null);
  }

  async function setTrack(ev: EventItem, on: boolean) {
    if (!model) return;
    const sync = syncEventSavingsGoal({ name: ev.name, savingsGoalId: ev.savingsGoalId, onetimeDate: nextDate(ev, todayISO()) || '' }, on, eventBudget(ev) || '', model.savingsGoals ?? []);
    await saveModel({
      ...model,
      events: events.map((e) => (e.id === ev.id ? { ...e, trackInSavings: on, savingsGoalId: sync.savingsGoalId } : e)),
      savingsGoals: sync.goals,
    });
  }

  function openAddModal() {
    setEditingId(null);
    setNameInput('');
    setTypeInput('birthday');
    setRecurrenceInput('annual');
    setMonthInput('');
    setDayInput('');
    setOnetimeDateInput('');
    setBudgetInput('');
    setCompletedInput(false);
    setTrackInSavingsInput(false);
    setItemsInput([]);
    setErrorMsg('');
    setModalOpen(true);
  }

  function openEditModal(ev: EventItem) {
    setEditingId(ev.id);
    setNameInput(ev.name);
    setTypeInput(ev.type);
    setRecurrenceInput(ev.recurrence);
    setMonthInput(typeof ev.month === 'number' ? String(ev.month) : '');
    setDayInput(typeof ev.day === 'number' ? String(ev.day) : '');
    setOnetimeDateInput(ev.onetimeDate ?? '');
    setBudgetInput(typeof ev.budget === 'number' ? ev.budget : '');
    setCompletedInput(!!ev.completed);
    setTrackInSavingsInput(!!ev.trackInSavings);
    setItemsInput(ev.items ? ev.items.map((i) => ({ ...i })) : []);
    setErrorMsg('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setErrorMsg('');
  }

  async function handleSaveEvent() {
    if (!model) return;
    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      setErrorMsg('Enter an event name.');
      return;
    }

    let month: number | '' = '';
    let day: number | '' = '';
    let onetimeDate = '';

    if (recurrenceInput === 'annual') {
      if (monthInput.trim() !== '') {
        const m = parseInt(monthInput, 10);
        if (isNaN(m) || m < 1 || m > 12) {
          setErrorMsg('Enter a month between 1 and 12.');
          return;
        }
        month = m;
      }
      if (dayInput.trim() !== '') {
        const d = parseInt(dayInput, 10);
        if (isNaN(d) || d < 1 || d > 31) {
          setErrorMsg('Enter a day between 1 and 31.');
          return;
        }
        day = d;
      }
    } else {
      if (!isValidDateOrEmpty(onetimeDateInput)) {
        setErrorMsg('Enter date as YYYY-MM-DD.');
        return;
      }
      onetimeDate = onetimeDateInput.trim();
    }

    const items = itemsInput.filter((i) => i.name.trim()).map((i) => ({ ...i, name: i.name.trim() }));
    const budget: number | '' = items.length ? items.reduce((s2, i) => s2 + (typeof i.cost === 'number' ? i.cost : 0), 0) : budgetInput;

    const currentList = model.events ?? [];
    const existingEvent = editingId ? currentList.find((ev) => ev.id === editingId) : undefined;
    const sync = syncEventSavingsGoal(
      { name: trimmedName, savingsGoalId: existingEvent?.savingsGoalId, onetimeDate },
      trackInSavingsInput,
      budget,
      model.savingsGoals ?? []
    );
    const completedDate = completedInput
      ? existingEvent?.completedDate ?? todayISO()
      : undefined;
    const { transactionId, transactions: reconciledTransactions } = reconcileEventTransaction(
      existingEvent?.completed ?? false,
      existingEvent?.expenseTransactionId,
      completedInput,
      budget,
      model.manualTransactions ?? [],
      trimmedName,
      completedDate
    );

    let updatedList: EventItem[];
    if (editingId) {
      updatedList = currentList.map((ev) =>
        ev.id === editingId
          ? {
              ...ev,
              name: trimmedName,
              type: typeInput,
              recurrence: recurrenceInput,
              month,
              day,
              onetimeDate,
              budget,
              completed: completedInput,
              completedDate,
              trackInSavings: trackInSavingsInput,
              savingsGoalId: sync.savingsGoalId,
              expenseTransactionId: transactionId,
              items,
            }
          : ev
      );
    } else {
      const newEvent: EventItem = {
        id: makeId('event'),
        name: trimmedName,
        type: typeInput,
        recurrence: recurrenceInput,
        month,
        day,
        onetimeDate,
        budget,
        completed: completedInput,
        completedDate,
        trackInSavings: trackInSavingsInput,
        savingsGoalId: sync.savingsGoalId,
        expenseTransactionId: transactionId,
        items,
        createdAt: Date.now(),
      };
      updatedList = [...currentList, newEvent];
    }

    const updated: HouseholdModel = {
      ...model,
      events: updatedList,
      savingsGoals: sync.goals,
      manualTransactions: reconciledTransactions,
    };
    try {
      await saveModel(updated);
      closeModal();
    } catch (e) {
      setErrorMsg('Failed to save. Please try again.');
    }
  }

  async function handleDeleteEvent() {
    if (!editingId || !model) return;
    const deletedEvent = (model.events ?? []).find((ev) => ev.id === editingId);
    const updated: HouseholdModel = {
      ...model,
      events: (model.events ?? []).filter((ev) => ev.id !== editingId),
      savingsGoals: deletedEvent?.savingsGoalId
        ? (model.savingsGoals ?? []).filter((g) => g.id !== deletedEvent.savingsGoalId)
        : model.savingsGoals ?? [],
      manualTransactions: deletedEvent?.expenseTransactionId
        ? (model.manualTransactions ?? []).filter((t) => t.id !== deletedEvent.expenseTransactionId)
        : model.manualTransactions,
    };
    try {
      await saveModel(updated);
      closeModal();
    } catch (e) {
      setErrorMsg('Failed to delete. Please try again.');
    }
  }

  async function performDeleteEventById(id: string) {
    if (!model) return;
    const deletedEvent = (model.events ?? []).find((ev) => ev.id === id);
    const updated: HouseholdModel = {
      ...model,
      events: (model.events ?? []).filter((ev) => ev.id !== id),
      savingsGoals: deletedEvent?.savingsGoalId
        ? (model.savingsGoals ?? []).filter((g) => g.id !== deletedEvent.savingsGoalId)
        : model.savingsGoals ?? [],
      manualTransactions: deletedEvent?.expenseTransactionId
        ? (model.manualTransactions ?? []).filter((t) => t.id !== deletedEvent.expenseTransactionId)
        : model.manualTransactions,
    };
    try {
      await saveModel(updated);
    } catch (e) {
      Alert.alert('Failed to delete', 'Please try again.');
    }
  }

  function handleSwipeDeleteEvent(ev: EventItem) {
    Alert.alert(
      'Delete this event?',
      'Deletes the event and any linked savings goal or expense. Cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => performDeleteEventById(ev.id) },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
        <SegmentedControl<'up' | 'done'>
          accessibilityLabel="Events view"
          options={[
            { id: 'up', label: 'Upcoming' },
            { id: 'done', label: 'Done' },
          ]}
          value={view}
          onChange={setView}
        />
      </View>
      <PullToRefreshScrollView contentContainerStyle={styles.scrollContent}>
        {view === 'up' && (
          <>
            <View style={[styles.listGroup, styles.upSummary]}>
              <GradientFill match={styles.listGroup} />
              <View>
                <Text style={styles.eventSub}>Coming up</Text>
                <Text style={styles.headline}>{upcoming.length} {upcoming.length === 1 ? 'event' : 'events'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.eventSub}>To spend</Text>
                <Text style={[styles.headline, { color: colors.planned }]}>{formatPeso(toSpend)}</Text>
              </View>
            </View>

            {upcoming.length === 0 ? (
              <Text style={styles.emptyText}>Nothing coming up. Tap Add to add a birthday, holiday or celebration.</Text>
            ) : (
              <View style={styles.listGroup}>
                <GradientFill match={styles.listGroup} />
                {upcoming.map(({ ev, date, days }, rowIndex) => {
                  const open = openId === ev.id;
                  const budget = eventBudget(ev);
                  const extra = ev.items && ev.items.length ? `${ev.items.length} ${ev.items.length === 1 ? 'item' : 'items'}` : budget > 0 ? 'flat budget' : 'no budget';
                  const when = days === null ? 'no date' : days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
                  return (
                    <SwipeableRow key={ev.id} enabled={Boolean(model.settings.swipeToDeleteEnabled)} onDelete={() => handleSwipeDeleteEvent(ev)} testID={`event-swipe-${ev.id}`} flat>
                      <View style={[styles.eventRow, { flexDirection: 'column', alignItems: 'stretch', paddingVertical: 0, paddingHorizontal: 0 }, rowIndex > 0 && styles.rowDivider]}>
                        <GradientFill match={styles.eventRow} />
                        <TouchableOpacity style={styles.evHead} onPress={() => setOpenId(open ? null : ev.id)} accessibilityRole="button" accessibilityState={{ expanded: open }}>
                          {dateTile(date, false)}
                          <View style={styles.eventRowMain}>
                            <Text style={styles.eventName} numberOfLines={1}>{ev.name || 'Untitled event'}</Text>
                            <Text style={styles.eventSub} numberOfLines={1}>
                              {typeLabel(ev.type)} · {ev.recurrence === 'annual' ? 'every year' : 'once'} · {open ? extra : when}
                            </Text>
                          </View>
                          <Text style={[styles.eventAmount, { color: colors.planned }]}>{budget > 0 ? formatPeso(budget) : ''}</Text>
                        </TouchableOpacity>
                        {open && (
                          <View style={styles.evMore}>
                            {(ev.items || []).map((it) => (
                              <View key={it.id} style={styles.subLine}>
                                <Text style={styles.subLineText}>{it.name}</Text>
                                <Text style={[styles.subLineText, { color: colors.planned }]}>{typeof it.cost === 'number' ? formatPeso(it.cost) : ''}</Text>
                              </View>
                            ))}
                            <View style={[styles.subLine, { alignItems: 'center', marginTop: 4 }]}>
                              <Text style={styles.subLineText}>Save for this in Savings</Text>
                              <AppSwitch
                                value={!!ev.trackInSavings}
                                onValueChange={(on) => setTrack(ev, on)}
                                disabled={budget <= 0}
                                trackColor={{ true: colors.buttonFill, false: colors.navy4 }}
                                accessibilityLabel={`Save for ${ev.name} in Savings`}
                              />
                            </View>
                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: colors.buttonFill }]} onPress={() => markDone(ev, true)} accessibilityRole="button">
                                <GradientFill color={colors.buttonFill} strength={0.18} />
                                <Text style={[styles.smallBtnText, { color: colors.onButton }]}>Mark as done</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: colors.accentTint }]} onPress={() => openEditModal(ev)} accessibilityRole="button">
                                <GradientFill kind="tint" color={colors.accentTint} />
                                <Text style={[styles.smallBtnText, { color: colors.gold }]}>Edit</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                      </View>
                    </SwipeableRow>
                  );
                })}
              </View>
            )}
            <Text style={styles.groupFooter}>With "Save for this" on, money is set aside in Savings until the day, then counted as spending.</Text>
          </>
        )}

        {view === 'done' && (
          <>
            {doneRows.length === 0 ? (
              <Text style={styles.emptyText}>Nothing done yet. Open an event and tap Mark as done.</Text>
            ) : (
              <View style={styles.listGroup}>
                <GradientFill match={styles.listGroup} />
                {doneRows.map((r, rowIndex) => {
                  const diff = r.budget - r.spent;
                  return (
                    <TouchableOpacity
                      key={r.key}
                      style={[styles.evHead, rowIndex > 0 && styles.rowDivider]}
                      onPress={() => (r.ev && r.current ? Alert.alert(r.name, 'Move this back to Upcoming?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Not done yet', onPress: () => markDone(r.ev!, false) },
                      ]) : undefined)}
                      disabled={!r.current}
                      accessibilityRole="button"
                    >
                      {dateTile(r.date, true)}
                      <View style={styles.eventRowMain}>
                        <Text style={styles.eventName} numberOfLines={1}>{r.name}</Text>
                        <Text style={styles.eventSub}>{r.budget > 0 ? (diff >= 0 ? `${formatPeso(diff)} under budget` : `${formatPeso(-diff)} over budget`) : 'No budget'}</Text>
                      </View>
                      <Text style={[styles.eventAmount, { color: colors.negative }]}>{formatPeso(r.spent)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            <Text style={styles.groupFooter}>Events that repeat every year come back to Upcoming on their own.</Text>
          </>
        )}
      </PullToRefreshScrollView>

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={closeModal}>
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardWrap}
          >
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <GradientFill match={styles.modalCard} />
              <KeyboardAwareScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>{editingId ? 'Edit event' : 'New event'}</Text>

                <Text style={styles.inputLabel}>Event name</Text>
                <TextInput
                  autoFocus={!editingId}
                  style={styles.input}
                  placeholder="e.g. Mom's birthday, Wedding anniversary"
                  placeholderTextColor={colors.inkFaint}
                  value={nameInput}
                  onChangeText={setNameInput}
                />

                <Text style={styles.inputLabel}>Type</Text>
                <View style={styles.pillRow}>
                  {EVENT_TYPES.map((t) => (
                    <Pill
                      key={t.id}
                      label={t.label}
                      tone="sheet"
                      fill
                      active={typeInput === t.id}
                      onPress={() => setTypeInput(t.id)}
                    />
                  ))}
                </View>

                <Text style={styles.inputLabel}>Recurs</Text>
                <View style={styles.pillRow}>
                  <Pill
                    label="Annual"
                    tone="sheet"
                    fill
                    active={recurrenceInput === 'annual'}
                    onPress={() => setRecurrenceInput('annual')}
                  />
                  <Pill
                    label="One-time"
                    tone="sheet"
                    fill
                    active={recurrenceInput === 'onetime'}
                    onPress={() => setRecurrenceInput('onetime')}
                  />
                </View>

                {recurrenceInput === 'annual' ? (
                  <View style={styles.rowTwoCol}>
                    <View style={styles.rowTwoColItem}>
                      <Text style={styles.inputLabel}>Month (1–12)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. 6"
                        placeholderTextColor={colors.inkFaint}
                        keyboardType="number-pad"
                        value={monthInput}
                        onChangeText={setMonthInput}
                      />
                    </View>
                    <View style={styles.rowTwoColItem}>
                      <Text style={styles.inputLabel}>Day (1–31)</Text>
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
                  ) : (
                    <DateField
                      label="Date"
                      value={onetimeDateInput}
                      onChange={setOnetimeDateInput}
                      placeholder="2026-06-15"
                      clearable
                      testID="event-date-field"
                    />
                  )}

                <Text style={styles.inputLabel}>What it will cost (optional)</Text>
                {itemsInput.map((it, i) => (
                  <View key={it.id} style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <TextInput
                      autoFocus={it.id === focusItemId}
                      style={[styles.input, { flex: 3, marginBottom: 0 }]}
                      placeholder={i === 0 ? 'e.g. Cake' : 'Item'}
                      placeholderTextColor={colors.inkFaint}
                      value={it.name}
                      onChangeText={(t) => setItemsInput((rows) => rows.map((r) => (r.id === it.id ? { ...r, name: t } : r)))}
                    />
                    <View style={{ flex: 2 }}>
                      <AmountInput value={it.cost} onChangeAmount={(v) => setItemsInput((rows) => rows.map((r) => (r.id === it.id ? { ...r, cost: v } : r)))} placeholder="0" />
                    </View>
                    <TouchableOpacity onPress={() => setItemsInput((rows) => rows.filter((r) => r.id !== it.id))} accessibilityRole="button" accessibilityLabel="Remove item" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="close-circle" size={20} color={colors.inkDim} />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity onPress={() => { const id = makeId('evitem'); setItemsInput((rows) => [...rows, { id, name: '', cost: '' }]); setFocusItemId(id); }} accessibilityRole="button" style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.gold }}>+ Add an item (cake, gift…)</Text>
                </TouchableOpacity>

                {itemsInput.length === 0 ? (
                  <>
                    <Text style={styles.inputLabel}>Or one budget for the whole event</Text>
                    <AmountInput style={styles.amountInput} value={budgetInput} onChangeAmount={setBudgetInput} />
                  </>
                ) : (
                  <Text style={[styles.inputLabel, { marginBottom: 12 }]}>
                    Budget: {formatPeso(itemsInput.reduce((s2, i) => s2 + (typeof i.cost === 'number' ? i.cost : 0), 0))} (the total of the items)
                  </Text>
                )}

                <TouchableOpacity
                  style={[
                    styles.trackSavingsToggle,
                    trackInSavingsInput && styles.trackSavingsToggleActive,
                  ]}
                  onPress={() => { hapticSelection(); setTrackInSavingsInput((v) => !v); }}
                >
                  {trackInSavingsInput && (
                    <Ionicons name="checkmark" size={15} color="#10b981" style={{ marginRight: 6 }} />
                  )}
                  <Text
                    style={[
                      styles.trackSavingsToggleText,
                      trackInSavingsInput && styles.trackSavingsToggleTextActive,
                    ]}
                  >
                    {trackInSavingsInput ? 'Auto-save to Savings' : "Don't track in Savings"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.completedToggle, completedInput && styles.completedToggleActive]}
                  onPress={() => { hapticSelection(); setCompletedInput((v) => !v); }}
                >
                  {completedInput && (
                    <Ionicons name="checkmark" size={15} color="#10b981" style={{ marginRight: 6 }} />
                  )}
                  <Text
                    style={[
                      styles.completedToggleText,
                      completedInput && styles.completedToggleTextActive,
                    ]}
                  >
                    {completedInput ? 'Completed' : 'Not yet'}
                  </Text>
                </TouchableOpacity>

                {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

                <Button label="Save" onPress={handleSaveEvent} />

                {editingId && <Button label="Delete event" variant="destructive" onPress={handleDeleteEvent} />}

                <Button label="Cancel" variant="quiet" onPress={closeModal} />
              </KeyboardAwareScrollView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    loadingContainer: { alignItems: 'center', justifyContent: 'center' },
    scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
    // Redesign styles
    listGroup: { backgroundColor: colors.navy3, borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
    upSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 14, marginBottom: 20 },
    headline: { fontSize: 17, fontWeight: '600', color: colors.ink, marginTop: 2 },
    evHead: { flexDirection: 'row', alignItems: 'center', minHeight: 64, paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
    evMore: { paddingLeft: 72, paddingRight: 16, paddingBottom: 14, gap: 6 },
    subLine: { flexDirection: 'row', justifyContent: 'space-between' },
    subLineText: { fontSize: 15, color: colors.ink },
    smallBtn: { flex: 1, minHeight: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    smallBtnText: { fontSize: 15, fontWeight: '600' },
    dateTile: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    dateTileM: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
    dateTileD: { fontSize: 18, fontWeight: '700', lineHeight: 20 },
    groupFooter: { fontSize: 13, color: colors.inkDim, marginTop: -6, marginBottom: 12, marginHorizontal: 16 },
    rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    emptyText: { fontSize: 15, color: colors.inkDim, marginBottom: 12, textAlign: 'center' },
    eventRow: {
      backgroundColor: colors.navy3,
      minHeight: 60,
      paddingVertical: 10,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    eventRowMain: { flex: 1, marginRight: 10 },
    eventName: { fontSize: 17, fontWeight: '500', color: colors.ink, flexShrink: 1 },
    eventSub: { fontSize: 13, color: colors.inkDim, marginTop: 1 },
    eventAmount: { fontSize: 17, fontWeight: '600', color: colors.planned },
    inputLabel: {
      // Redesign: sentence-case grey labels, like iPhone forms.
      fontSize: 13,
      fontWeight: '600',
      marginLeft: 4,
      color: colors.inkDim,
      marginBottom: 6,
      marginTop: 6,
    },
        amountInput: { backgroundColor: colors.navy2 },
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
    rowTwoCol: { flexDirection: 'row', gap: 10 },
    rowTwoColItem: { flex: 1 },
    pillRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    trackSavingsToggle: {
      flexDirection: 'row',
      backgroundColor: colors.navy2,
      borderRadius: 999,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    trackSavingsToggleActive: { backgroundColor: 'rgba(16,185,129,0.15)' },
    trackSavingsToggleText: { fontSize: 13, fontWeight: '600', color: colors.inkDim },
    trackSavingsToggleTextActive: { color: '#10b981' },
    completedToggle: {
      flexDirection: 'row',
      backgroundColor: colors.navy2,
      borderRadius: 999,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    completedToggleActive: { backgroundColor: 'rgba(16,185,129,0.15)' },
    completedToggleText: { fontSize: 13, fontWeight: '600', color: colors.inkDim },
    completedToggleTextActive: { color: '#10b981' },
    errorText: { fontSize: 12, color: colors.error, marginBottom: 10 },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    modalKeyboardWrap: { width: '100%', alignItems: 'center', maxHeight: '88%' },
    modalCard: {
      width: '100%',
      maxWidth: 380,
      maxHeight: '100%',
      backgroundColor: colors.navy3,
      borderRadius: 14,
      padding: 20,
    },
    modalTitle: { fontSize: 17, fontWeight: '700', color: colors.ink, marginBottom: 16 },
  });
}
