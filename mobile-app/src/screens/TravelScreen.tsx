import React, { useEffect, useRef, useLayoutEffect, useState } from 'react';
import { animateNextLayout } from '../animateLayout';
import { redUnlessZero, toneUnlessZero } from '../moneyColor';
import { useArrival } from '../useArrival';
import ArrivalGlow from '../components/ArrivalGlow';
import { showLeafTick } from '../components/LeafTick';
import { SwipeTabs } from '../navigation/swipeTabs';
import SlidingPages from '../components/SlidingPages';
import { useNavigation, useRoute } from '@react-navigation/native';
import { todayISO, dateText } from '../dateUtils';
import { View, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { TouchableOpacity } from '../components/Tap';
import { Text } from '../components/AppText';
import { headerButtonText } from '../navigation/LargeHeader';
import { Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { PullToRefreshScrollView } from '../PullToRefreshScrollView';
import { formatPeso } from '../balanceProjection';
import type {
  TravelTrip,
  TravelChecklistItem, TravelTodo,
  HouseholdModel,
  SavingsGoal,
  ManualTransaction,
  PaymentMethod,
} from '../types';
import SwipeableRow from '../components/SwipeableRow';
import AppSwitch from '../components/AppSwitch';
import DeleteRow from '../components/DeleteRow';
import { WhoFootnote, useWho } from '../components/WhoLogged';
import { withoutTrip } from '../deleteRecords';
import { takeOffSavedBalance } from '../takeOffBalance';
import { reconcileTravelChecklistTransactions } from '../travelChecklist';
import { accountLabel } from '../transactionActions';
import PayFromSheet from '../components/PayFromSheet';
import { ReceiptViewer } from '../components/ReceiptField';
import { makeId } from '../utils';
import { useStickyState } from '../stickyState';
import DateField from '../components/DateField';
import { hapticSelection } from '../haptics';
import GradientFill from '../components/GradientFill';
import Guided, { useFieldErrors } from '../components/Guided';
import BottomSheet from '../components/BottomSheet';
import { SheetBar, FormGroup, InputRow, PickerRow, SwitchRow, Footnote, useOpenRow } from '../components/SimpleForm';
import TripItemDrop, { type TripDraft } from '../components/TripItemDrop';

import { PaidLine, paidRowContent } from '../components/PaidLine';
function tripChecklistTotal(trip: TravelTrip): number {
  return (trip.checklist ?? [])
    .filter((i) => i.checked)
    .reduce((sum, i) => sum + (typeof i.cost === 'number' ? i.cost : 0), 0);
}

// Budget is auto-derived from the FULL checklist (every item, checked or not) — matches
// the original web app's syncTravelSavingsGoal(), which budgets for everything planned,
// not just what's already been paid for. Distinct from tripChecklistTotal() above, which
// only sums checked items for the "committed so far" banner in the modal.
function tripFullChecklistTotal(trip: TravelTrip): number {
  return (trip.checklist ?? []).reduce(
    (sum, i) => sum + (typeof i.cost === 'number' ? i.cost : 0),
    0
  );
}
// Mirrors the web app's syncTravelSavingsGoal(): while trackInSavings is on and the trip
// has a positive budget, keeps a SavingsGoal named "Travel: {name}" in sync with that
// budget as its target (creating it on first use, updating name/target on every save).
// Turning the toggle off, or the budget dropping to 0, removes the linked goal instead.
function syncTripSavingsGoal(
  trip: TravelTrip,
  budget: number,
  allGoals: SavingsGoal[]
): { goals: SavingsGoal[]; savingsGoalId: string | undefined } {
  const shouldTrack = !!trip.trackInSavings && budget > 0;
  if (!shouldTrack) {
    if (trip.savingsGoalId) {
      return {
        goals: allGoals.filter((g) => g.id !== trip.savingsGoalId),
        savingsGoalId: undefined,
      };
    }
    return { goals: allGoals, savingsGoalId: undefined };
  }
  const goalName = 'Travel: ' + trip.name;
  const existing = trip.savingsGoalId
    ? allGoals.find((g) => g.id === trip.savingsGoalId)
    : undefined;
  if (existing) {
    const goals = allGoals.map((g) =>
      g.id === existing.id ? { ...g, name: goalName, targetAmount: budget } : g
    );
    return { goals, savingsGoalId: existing.id };
  }
  const newGoal: SavingsGoal = {
    id: makeId('goal'),
    name: goalName,
    targetAmount: budget,
    targetDate: trip.startDate || '',
    contributions: [],
    currentAmount: 0,
    createdAt: Date.now(),
  };
  return { goals: [...allGoals, newGoal], savingsGoalId: newGoal.id };
}

// Redesign helpers: "Nov 28 – 30 · 3 days", "In 46 days", "Oct 2".
function shortDay(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return isNaN(d.getTime()) ? iso : dateText(d);
}
function niceRange(trip: TravelTrip): string {
  const s = trip.startDate ? new Date(trip.startDate + 'T00:00:00') : null;
  const e = trip.endDate ? new Date(trip.endDate + 'T00:00:00') : null;
  if (!s && !e) return 'No dates yet';
  if (s && e && !isNaN(s.getTime()) && !isNaN(e.getTime())) {
    const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
    const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
    // The year once, at the end, when it isn't this year: "Apr 2 – 9, 2027".
    const yr = s.getFullYear() !== new Date().getFullYear() ? `, ${s.getFullYear()}` : '';
    const monthDay = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const range = sameMonth ? `${monthDay} – ${e.getDate()}${yr}` : `${shortDay(trip.startDate)} – ${shortDay(trip.endDate)}`;
    return `${range} · ${days} ${days === 1 ? 'day' : 'days'}`;
  }
  return shortDay(trip.startDate || trip.endDate);
}
function tripBadge(trip: TravelTrip, today: string): string {
  if (!trip.startDate) return '';
  const days = Math.round((new Date(trip.startDate + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000);
  if (days > 1) return `In ${days} days`;
  if (days === 1) return 'Tomorrow';
  if (days === 0) return 'Today';
  return 'On the trip';
}

function isValidDateOrEmpty(s: string): boolean {
  if (s.trim() === '') return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
}

export default function TravelScreen() {
  const { colors } = useTheme();
  const { model, saveModel, getModel } = useData();
  // Version 2.2 (approved P4): a just-added trip item slides in and glows.
  const arrived = useArrival((model?.travel || []).flatMap((t) => (t.checklist || []).map((i) => i.id)));
  const who = useWho();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  const [modalOpen, setModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [trackInSavings, setTrackInSavings] = useState(false);
  const [featuredId, setFeaturedId] = useState<string | null>(null);
  // 2026-11-03 (mockup P2): To-Pay and Home's Due soon open a trip straight on its Budget.
  const routeTripId = (useRoute() as any)?.params?.tripId as string | undefined;
  useEffect(() => {
    if (!routeTripId) return;
    setFeaturedId(routeTripId);
    setPageTab('budget');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeTripId]);
  // Version 2.1 (approved T1): Budget | To-do on the Travel page itself, under the trip.
  const [pageTab, setPageTab] = useStickyState<'budget' | 'todo'>('travel.pageTab', 'budget');
  // Cath, 2026-11-06 (mockup scenes 3 and 4): one drop-down open at a time: an item's id, a
  // to-do's id, 'new-item' or 'new-todo'.
  const [dropOpen, setDropOpen] = useState<string | null>(null);
  // Cath, 2026-11-06 (mockup scene 2): tap the trip name to change it.
  const [nameTripId, setNameTripId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [nameError, setNameError] = useState('');
  // Version 2.2 (Cath): tap the dates on a trip ("No dates yet") to set them right there.
  const [datesTripId, setDatesTripId] = useState<string | null>(null);
  const [datesStart, setDatesStart] = useState('');
  const [datesEnd, setDatesEnd] = useState('');
  const [datesError, setDatesError] = useState('');
  // Version 2.2 (Cath, canvas P1-P3): "How was it paid?" for a ticked item.
  const [payAsk, setPayAsk] = useState<{ tripId: string; itemId: string } | null>(null);
  // Cath, 2026-10-27 (canvas R3): a paid item's receipt, open full size.
  const [viewReceipt, setViewReceipt] = useState<string | null>(null);
  const [openRow, toggleRow] = useOpenRow(modalOpen);
  // Version 2.1: tapping Save/Add with something missing takes the person straight to it.
  const fieldErrors = useFieldErrors<'name' | 'dates'>();
  const clearFieldError = fieldErrors.clear;
  const nameRef = useRef<any>(null);
  const navigation = useNavigation<any>();

  // Version 2.2 (Cath, canvas T1-T4): Travel lists your trips; tapping one opens it (its
  // name becomes the title, "‹ Travel" goes back to the list).
  const openTrip = featuredId ? (model?.travel ?? []).find((x) => x.id === featuredId) : undefined;
  useLayoutEffect(() => {
    navigation.setOptions({
      title: openTrip ? openTrip.name || 'Trip' : 'Travel',
      headerBackTitle: openTrip ? 'Travel' : 'Plan',
      // Cath, 2026-11-06 (mockup scene 2): no Edit button; everything on a trip is edited by
      // tapping it, and tapping the name changes the name.
      headerRight: openTrip
        ? undefined
        : () => (
            <TouchableOpacity onPress={openAddModal} accessibilityRole="button" accessibilityLabel="Add a trip" testID="travel-add" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[headerButtonText, { color: colors.gold }]}>Add</Text>
            </TouchableOpacity>
          ),
      headerTitlePress: openTrip ? () => openTripName(openTrip) : undefined,
    } as any);
  });
  // A drop-down belongs to the trip it was opened on.
  useEffect(() => {
    setDropOpen(null);
  }, [featuredId]);
  // Back (the top-left link or the phone's Back button) from a trip returns to the list.
  useEffect(() => {
    return navigation.addListener('beforeRemove', (e: any) => {
      if (!featuredId || !openTrip) return;
      e.preventDefault();
      setFeaturedId(null);
    });
  }, [navigation, featuredId, openTrip]);

  // The red message goes away as soon as the person changes something.
  useEffect(() => {
    clearFieldError();
  }, [nameInput, startDateInput, endDateInput, modalOpen, clearFieldError]);

  if (!model) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator color={colors.accent ?? colors.gold} />
      </View>
    );
  }

  const trips: TravelTrip[] = model.travel ?? [];
  // Redesign: the next trip is featured (or the one you picked); past trips are listed below.
  const today = todayISO();
  const isPast = (t: TravelTrip) => !!(t.endDate || t.startDate) && (t.endDate || t.startDate) < today;
  const upcoming = trips.filter((t) => !isPast(t)).sort((a, b) => (a.startDate || '9999') < (b.startDate || '9999') ? -1 : 1);
  const past = trips.filter(isPast).sort((a, b) => ((a.endDate || a.startDate) < (b.endDate || b.startDate) ? 1 : -1));
  const featured = featuredId ? trips.find((t) => t.id === featuredId) : undefined;
  const otherUpcoming = featured ? [] : upcoming;

  // Ticks an item paid (or unpaid) right from the list. Version 2.2 (canvas P1-P3): an item
  // with a cost first asks how it was paid; unticking takes the payment back off.
  async function toggleItem(trip: TravelTrip, item: TravelChecklistItem) {
    if (!model) return;
    hapticSelection();
    if (!item.checked && typeof item.cost === 'number' && item.cost > 0) {
      setPayAsk({ tripId: trip.id, itemId: item.id });
      return;
    }
    commitChecklist(trip.id, (list) =>
      list.map((i) => (i.id === item.id ? (i.checked ? { ...i, checked: false, receiptPhoto: undefined } : { ...i, checked: true, completedDate: todayISO() }) : i))
    );
  }

  // Saves a trip's checklist change straight away, with its transactions, balances, budget and
  // savings pot. (2026-11-06) A pot stays when the budget drops to nothing: only the switch or
  // Delete trip removes a pot, because it can hold money.
  function commitChecklist(tripId: string, change: (list: TravelChecklistItem[]) => TravelChecklistItem[], newName?: string) {
    const latest = getModel() ?? model;
    const trip = latest ? (latest.travel ?? []).find((x) => x.id === tripId) : undefined;
    if (!latest || !trip) return;
    const prior = trip.checklist || [];
    const name = newName ?? trip.name;
    const { checklist: synced, transactions, takeOffs } = reconcileTravelChecklistTransactions(prior, change(prior), latest.manualTransactions || [], name);
    const next: TravelTrip = { ...trip, name, checklist: synced };
    const budget = tripFullChecklistTotal(next);
    const pots = latest.savingsGoals ?? [];
    const { goals, savingsGoalId } =
      budget > 0
        ? syncTripSavingsGoal(next, budget, pots)
        : { goals: pots.map((g) => (g.id === trip.savingsGoalId ? { ...g, name: 'Travel: ' + name } : g)), savingsGoalId: trip.savingsGoalId };
    let updated: HouseholdModel = {
      ...latest,
      savingsGoals: goals,
      travel: (latest.travel ?? []).map((x) => (x.id === tripId ? { ...next, budget, savingsGoalId } : x)),
      manualTransactions: transactions,
    };
    for (const k of takeOffs) updated = takeOffSavedBalance(updated, k.pm, k.amount);
    saveModel(updated);
  }

  function toggleDrop(id: string) {
    animateNextLayout();
    setDropOpen((cur) => (cur === id ? null : id));
  }
  function closeDrop() {
    animateNextLayout();
    setDropOpen(null);
  }
  // Saves a budget item from its drop-down (itemId null = a new one).
  function saveItem(tripId: string, itemId: string | null, d: TripDraft) {
    hapticSelection();
    closeDrop();
    const extras = { ...(d.note ? { note: d.note } : {}), ...(d.date ? { dueDate: d.date } : {}) };
    const typed: number | '' = typeof d.cost === 'number' && d.cost > 0 ? Math.round(d.cost * 100) / 100 : '';
    commitChecklist(tripId, (list) =>
      itemId === null
        ? [...list, { id: makeId('travelitem'), title: d.title, cost: typed, checked: false, ...extras }]
        : list.map((i) => {
            if (i.id !== itemId) return i;
            const { note: _note, dueDate: _due, ...rest } = i;
            // A paid item keeps an amount (clearing it would leave its payment behind).
            const cost = typed === '' && i.checked && typeof i.cost === 'number' && i.cost > 0 ? i.cost : typed;
            return { ...rest, title: d.title, cost, ...extras };
          })
    );
  }
  function removeItem(tripId: string, item: TravelChecklistItem) {
    return {
      title: `Remove "${item.title || 'this item'}"?`,
      note: item.checked ? 'It comes off this trip now, with its payment.' : 'It comes off this trip now.',
      onYes: () => {
        closeDrop();
        commitChecklist(tripId, (list) => list.filter((i) => i.id !== item.id));
      },
    };
  }

  // The "How was it paid?" sheet's two answers.
  function payAskItem(): TravelChecklistItem | undefined {
    if (!payAsk) return undefined;
    return (model?.travel ?? []).find((x) => x.id === payAsk.tripId)?.checklist?.find((i) => i.id === payAsk.itemId);
  }
  function answerPaid(paid: Partial<TravelChecklistItem>) {
    const ask = payAsk;
    setPayAsk(null);
    if (!ask) return;
    const apply = (i: TravelChecklistItem): TravelChecklistItem => (i.id === ask.itemId ? { ...i, checked: true, paidWith: undefined, markedOnly: undefined, receiptPhoto: undefined, ...paid } : i);
    commitChecklist(ask.tripId, (list) => list.map(apply));
    showLeafTick('Paid');
  }
  // The account used last on this trip is picked to start with.
  function lastPaidWith(list: TravelChecklistItem[]): PaymentMethod | undefined {
    const withPm = list.filter((i) => i.checked && i.expenseTransactionId);
    for (let k = withPm.length - 1; k >= 0; k--) {
      const pm = (model?.manualTransactions || []).find((x) => x.id === withPm[k].expenseTransactionId)?.paymentMethod;
      if (pm) return pm;
    }
    return undefined;
  }
  // "Paid from BPI Savings · Today", "Marked paid · not in spending" (canvas P3).
  function paidLine(item: TravelChecklistItem): string {
    if (item.markedOnly) return 'Marked paid · not in spending';
    const txn = item.expenseTransactionId ? (model?.manualTransactions || []).find((x) => x.id === item.expenseTransactionId) : undefined;
    const day = (iso?: string) => (!iso ? '' : iso === todayISO() ? 'Today' : shortDay(iso));
    if (txn?.paymentMethod && model) return `Paid from ${accountLabel(model, txn.paymentMethod) ?? 'an account'} · ${day(txn.date)}`;
    const when = day(item.completedDate);
    return when ? `Paid ${when}` : 'Paid';
  }

  // To-do changes on the Travel page save straight away (they never touch money).
  function saveTripTodos(tripId: string, change: (list: TravelTodo[]) => TravelTodo[]) {
    const latest = getModel() ?? model;
    if (!latest) return;
    saveModel({ ...latest, travel: (latest.travel ?? []).map((t) => (t.id === tripId ? { ...t, todos: change(t.todos || []) } : t)) });
  }
  // Saves a to-do from its drop-down (todoId null = a new one). Its cost is only a reminder.
  function saveTodo(tripId: string, todoId: string | null, d: TripDraft) {
    hapticSelection();
    closeDrop();
    const extras = { ...(typeof d.cost === 'number' && d.cost > 0 ? { cost: Math.round(d.cost * 100) / 100 } : {}), ...(d.note ? { note: d.note } : {}), ...(d.date ? { date: d.date } : {}) };
    saveTripTodos(tripId, (list) =>
      todoId === null
        ? [...list, { id: makeId('todo'), text: d.title, done: false, ...extras }]
        : list.map((x) => {
            if (x.id !== todoId) return x;
            const { cost: _cost, note: _note, date: _date, ...rest } = x;
            return { ...rest, text: d.title, ...extras };
          })
    );
  }
  function removeTodo(tripId: string, td: TravelTodo) {
    return {
      title: `Remove "${td.text}"?`,
      note: 'It comes off this trip\'s to-do list.',
      onYes: () => {
        closeDrop();
        saveTripTodos(tripId, (list) => list.filter((x) => x.id !== td.id));
      },
    };
  }

  function openTripName(trip: TravelTrip) {
    setNameDraft(trip.name);
    setNameError('');
    setNameTripId(trip.id);
  }
  function saveTripName() {
    const name = nameDraft.trim();
    if (!name) {
      setNameError('Give this trip a name.');
      return;
    }
    const tripId = nameTripId;
    setNameTripId(null);
    if (!tripId) return;
    hapticSelection();
    commitChecklist(tripId, (list) => list, name);
    showLeafTick('Saved');
  }

  function openTripDates(trip: TravelTrip) {
    setDatesStart(trip.startDate || '');
    setDatesEnd(trip.endDate || '');
    setDatesError('');
    setDatesTripId(trip.id);
  }
  function saveTripDates() {
    const latest = getModel() ?? model;
    const trip = latest ? (latest.travel ?? []).find((x) => x.id === datesTripId) : undefined;
    if (!latest || !trip) {
      setDatesTripId(null);
      return;
    }
    if (datesStart && datesEnd && datesEnd < datesStart) {
      setDatesError('The end is before the start.');
      return;
    }
    hapticSelection();
    setDatesTripId(null);
    const next: TravelTrip = { ...trip, startDate: datesStart, endDate: datesEnd };
    saveModel({ ...latest, travel: (latest.travel ?? []).map((x) => (x.id === trip.id ? next : x)) });
    showLeafTick('Saved');
  }
  function confirmDeleteTripFromPage(trip: TravelTrip) {
    Alert.alert('Delete this trip?', 'Deletes the trip and any linked savings goal or expenses. Cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const latest = getModel() ?? model;
          if (!latest) return;
          setFeaturedId(null);
          saveModel(withoutTrip(latest, trip.id));
        },
      },
    ]);
  }

  // Canvas T2: one card per coming trip: name, dates, when, and a thin bar while saving.
  function tripCard(trip: TravelTrip) {
    const budget = tripFullChecklistTotal(trip);
    const goal = trip.savingsGoalId ? (model!.savingsGoals || []).find((g) => g.id === trip.savingsGoalId) : undefined;
    const saved = goal ? goal.contributions.reduce((s2, c) => s2 + (typeof c.amount === 'number' ? c.amount : 0), 0) : 0;
    const pct = goal && budget > 0 ? Math.min(100, Math.round((saved / budget) * 100)) : 0;
    const badge = tripBadge(trip, today);
    return (
      <SwipeableRow key={trip.id} enabled={Boolean(model!.settings.swipeToDeleteEnabled)} onDelete={() => handleSwipeDeleteTrip(trip)} testID={`trip-swipe-${trip.id}`} flat>
        <TouchableOpacity style={[styles.listGroup, { padding: 16 }]} activeOpacity={0.8} onPress={() => setFeaturedId(trip.id)} accessibilityRole="button" accessibilityLabel={`Open ${trip.name}`}>
          <GradientFill match={styles.listGroup} />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureTitle} numberOfLines={1}>{trip.name || 'Untitled trip'}</Text>
              <Text style={styles.featureSub}>{niceRange(trip)}{who.by(trip.addedBy)}</Text>
            </View>
            {!!badge && (
              <View style={[styles.badge, { backgroundColor: colors.accentTint, marginRight: 6 }]}>
                <Text style={[styles.badgeText, { color: colors.gold }]}>{badge}</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={18} color={colors.inkDim} />
          </View>
          {goal && budget > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
              <View style={[styles.bar, { flex: 1, height: 4, marginTop: 0 }]}>
                <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: colors.saving }]} />
              </View>
              <Text style={[styles.tripSub, { marginLeft: 10, marginTop: 0 }]}>{pct}% saved</Text>
            </View>
          )}
        </TouchableOpacity>
      </SwipeableRow>
    );
  }

  // Canvas T3b: the "Save for this trip in Savings?" switch on the trip page itself.
  async function setTripSaving(trip: TravelTrip, on: boolean) {
    if (!model) return;
    const goal = trip.savingsGoalId ? (model.savingsGoals || []).find((g) => g.id === trip.savingsGoalId) : undefined;
    const saved = goal ? goal.contributions.reduce((s2, c) => s2 + (typeof c.amount === 'number' ? c.amount : 0), 0) : 0;
    const apply = async () => {
      hapticSelection();
      const draft: TravelTrip = { ...trip, trackInSavings: on };
      const budget = tripFullChecklistTotal(draft);
      const { goals, savingsGoalId } = syncTripSavingsGoal(draft, budget, model.savingsGoals ?? []);
      await saveModel({ ...model, savingsGoals: goals, travel: trips.map((x) => (x.id === trip.id ? { ...draft, savingsGoalId } : x)) });
    };
    if (!on && goal && saved > 0) {
      // Turning it off removes the pot: ask first when there's money in it.
      Alert.alert('Stop saving for this trip?', `This removes the "${goal.name}" pot and the ${formatPeso(saved)} recorded in it.`, [
        { text: 'Keep saving', style: 'cancel' },
        { text: 'Stop saving', style: 'destructive', onPress: () => { apply(); } },
      ]);
      return;
    }
    await apply();
  }

  function tripRow(trip: TravelTrip, i: number, onPress: () => void, sub: string, amount: string, amountColor: string) {
    return (
      <SwipeableRow key={trip.id} enabled={Boolean(model!.settings.swipeToDeleteEnabled)} onDelete={() => handleSwipeDeleteTrip(trip)} testID={`trip-swipe-${trip.id}`} flat>
        <TouchableOpacity style={[styles.tripRow, i > 0 && styles.rowDivider]} activeOpacity={0.7} onPress={onPress} accessibilityRole="button">
          <GradientFill match={[styles.tripRow, i > 0 && styles.rowDivider]} />
          <View style={styles.tripRowMain}>
            <Text style={styles.tripName} numberOfLines={1}>{trip.name || 'Untitled trip'}</Text>
            {!!sub && <Text style={styles.tripSub} numberOfLines={1}>{sub}</Text>}
          </View>
          <Text style={[styles.tripAmount, { color: amountColor }]}>{amount}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.inkDim} style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </SwipeableRow>
    );
  }

  function openAddModal() {
    setNameInput('');
    setStartDateInput('');
    setEndDateInput('');
    setTrackInSavings(false);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  // Cath, 2026-11-06 (mockup scene 1): a new trip is only its name, dates and the Savings switch;
  // its Budget and To-do are on the trip itself, which opens straight away.
  async function handleAddTrip() {
    const current = getModel() ?? model;
    if (!current) return;
    const name = nameInput.trim();
    if (!name) {
      fieldErrors.show('name', 'Give this trip a name.');
      return;
    }
    if (!isValidDateOrEmpty(startDateInput) || !isValidDateOrEmpty(endDateInput)) {
      fieldErrors.show('dates', 'Pick the trip dates.');
      return;
    }
    if (startDateInput && endDateInput && endDateInput < startDateInput) {
      fieldErrors.show('dates', 'The end is before the start.');
      return;
    }
    const trip: TravelTrip = { id: makeId('trip'), name, startDate: startDateInput.trim(), endDate: endDateInput.trim(), checklist: [], trackInSavings, budget: 0, createdAt: Date.now() };
    await saveModel({ ...current, travel: [...(current.travel ?? []), trip] });
    showLeafTick('Added');
    closeModal();
    setPageTab('budget');
    setFeaturedId(trip.id);
  }

  async function performDeleteTripById(id: string) {
    // H-21 (2026-10-22): the newest data, not the data from when the pop-up opened.
    const current = getModel() ?? model;
    if (!current) return;
    await saveModel(withoutTrip(current, id));
  }

  function handleSwipeDeleteTrip(trip: TravelTrip) {
    Alert.alert(
      'Delete this trip?',
      'Deletes the trip and any linked savings goal or expenses. Cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => performDeleteTripById(trip.id) },
      ]
    );
  }

  const formDates = startDateInput || endDateInput ? niceRange({ startDate: startDateInput, endDate: endDateInput } as TravelTrip) : 'Optional';

  const payItem = payAskItem();
  const paySheet = (visible: boolean, list: TravelChecklistItem[]) => (
    <PayFromSheet
      visible={visible}
      onClose={() => setPayAsk(null)}
      title={payItem?.title || 'Item'}
      amount={typeof payItem?.cost === 'number' ? payItem.cost : 0}
      direction="out"
      model={model}
      initial={lastPaidWith(list)}
      confirmLabel="Mark paid"
      noFees
      allowNoAmount
      // Cath, 2026-10-27 (canvas R4): the amount can be changed (the item's cost becomes what
      // was paid), and "Just record it" keeps it as paid with no account or spending.
      withReceipt
      onRecord={(paid, _fee, date, receiptPhoto) => answerPaid({ markedOnly: true, completedDate: date, ...(paid > 0 ? { cost: paid } : {}), ...(receiptPhoto ? { receiptPhoto } : {}) })}
      recordNote="It still counts as Paid in this trip's budget."
      recordLabel="Mark paid"
      onConfirm={(pm, paid, _lateFee, date, takeOff, _fee, receiptPhoto) => answerPaid({ paidWith: pm, completedDate: date, takeOffBalance: takeOff || undefined, ...(paid > 0 ? { cost: paid } : {}), ...(receiptPhoto ? { receiptPhoto } : {}) })}
    />
  );

  return (
    <View style={styles.container}>
      <ReceiptViewer photo={viewReceipt} onClose={() => setViewReceipt(null)} />
      {/* Version 2.2 (Cath: Budget / To-do on a trip didn't swipe): the whole trip page
          swipes between Budget and To-do, not just the boxes at the top. */}
      <SwipeTabs inner enabled={!!openTrip} onSwipe={(d) => setPageTab(d > 0 ? 'todo' : 'budget')}>
      <View style={{ flex: 1 }} collapsable={false}>
      <PullToRefreshScrollView contentContainerStyle={styles.scrollContent}>
        {trips.length === 0 && (
          <TouchableOpacity style={[styles.listGroup, { padding: 16, flexDirection: 'row', alignItems: 'center' }]} onPress={openAddModal} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Plan a trip" testID="travel-empty-add">
            <GradientFill match={styles.listGroup} />
            <View style={{ flex: 1 }}>
              <Text style={styles.tripName}>No trips yet</Text>
              <Text style={[styles.tripSub, { marginTop: 4 }]}>Tap here to plan one. List what it will cost and the budget adds itself up.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.inkDim} style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        )}

        {featured && (() => {
          const t = featured;
          const budget = tripFullChecklistTotal(t);
          const paid = tripChecklistTotal(t);
          const goal = t.savingsGoalId ? (model.savingsGoals || []).find((g) => g.id === t.savingsGoalId) : undefined;
          const saved = goal ? goal.contributions.reduce((s2, c) => s2 + (typeof c.amount === 'number' ? c.amount : 0), 0) : 0;
          const pct = goal && budget > 0 ? Math.min(100, Math.round((saved / budget) * 100)) : 0;
          const badge = tripBadge(t, today);
          return (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 4 }}>
                <TouchableOpacity
                  onPress={() => openTripDates(t)}
                  accessibilityRole="button"
                  accessibilityLabel={t.startDate || t.endDate ? `Dates: ${niceRange(t)}. Change` : 'No dates yet. Add dates'}
                  testID="travel-trip-dates"
                  hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}
                >
                  <Text style={styles.featureSub}>{niceRange(t)}</Text>
                  {!t.startDate && !t.endDate ? (
                    <Text style={[styles.featureSub, { color: colors.gold, fontWeight: '700' }]}>· Add dates</Text>
                  ) : (
                    <Ionicons name="calendar-outline" size={15} color={colors.inkDim} />
                  )}
                </TouchableOpacity>
                {!!badge && (
                  <View style={[styles.badge, { backgroundColor: colors.accentTint }]}>
                    <Text style={[styles.badgeText, { color: colors.gold }]}>{badge}</Text>
                  </View>
                )}
              </View>
              {/* Smoothness 2026-10-23 (Cath picked "follows your finger"): Budget and To-do
                  slide with your finger; the height glides between them. */}
              <SlidingPages<'budget' | 'todo'>
                inline
                testID="travel-pages"
                accessibilityLabel="Trip view"
                options={[
                    { id: 'budget', label: 'Budget', testID: 'travel-page-budget-tab' },
                    { id: 'todo', label: `To-do${(t.todos || []).length ? ` (${(t.todos || []).filter((x) => !x.done).length})` : ''}`, testID: 'travel-page-todo-tab' },
                  ]}
                value={pageTab}
                onChange={setPageTab}
                switcherWrapStyle={{ marginTop: 14, marginBottom: 4 }}
                renderPage={(id) =>
                  id === 'budget' ? (
                  <>
                  <View style={[styles.listGroup, { padding: 16, marginTop: 12 }]}>
                    <GradientFill match={styles.listGroup} />
                    <View style={[styles.trio, { marginTop: 0, paddingTop: 0, borderTopWidth: 0 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tripSub}>Budget</Text>
                        <Text style={[styles.trioVal, { color: toneUnlessZero(budget, colors.planned, colors) }]}>{formatPeso(budget)}</Text>
                      </View>
                      <View style={styles.trioCell}>
                        <Text style={styles.tripSub}>Left</Text>
                        <Text style={[styles.trioVal, { color: toneUnlessZero(Math.max(0, budget - paid), colors.saving, colors) }]}>{formatPeso(Math.max(0, budget - paid))}</Text>
                      </View>
                      <View style={styles.trioCell}>
                        <Text style={styles.tripSub}>Paid</Text>
                        <Text style={[styles.trioVal, { color: redUnlessZero(paid, colors) }]}>{formatPeso(paid)}</Text>
                      </View>
                    </View>
                    {/* Canvas T3a option B: a thin bar while it's saving in Savings. */}
                    {goal && budget > 0 && (
                      <>
                        <View style={[styles.bar, { height: 4, marginTop: 14 }]}>
                          <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: colors.saving }]} />
                        </View>
                        <Text style={[styles.tripSub, { marginTop: 6 }]}>{pct}% saved in Savings</Text>
                      </>
                    )}
                  </View>
                  {/* Canvas T3b option E: a plain line with a small switch, just under the numbers. */}
                  <View style={styles.saveLine}>
                    <Text style={[styles.tripSub, { flex: 1, fontSize: 14, marginTop: 0 }]}>Save for this trip in Savings?</Text>
                    <AppSwitch value={!!t.trackInSavings} onValueChange={(on) => setTripSaving(t, on)} accessibilityLabel="Save for this trip in Savings" />
                  </View>
                  {!!t.trackInSavings && budget <= 0 && (
                    <Text style={[styles.groupFooter, { marginTop: 0 }]}>The pot appears once the checklist has a cost.</Text>
                  )}
                  <Text style={styles.groupHeader}>Checklist</Text>
                    <View style={styles.listGroup}>
                      <GradientFill match={styles.listGroup} />
                      {(t.checklist || []).length === 0 && (
                        <Text style={[styles.tripSub, { paddingHorizontal: 16, paddingTop: 14 }]}>What will it cost? Flights, hotel, food…</Text>
                      )}
                      {(t.checklist || []).map((item, i) => (
                        <React.Fragment key={item.id}>
                        <View style={[styles.checkRow, i > 0 && styles.rowDivider]}>
                          {arrived === item.id && <ArrivalGlow />}
                          <TouchableOpacity
                            onPress={() => toggleItem(t, item)}
                            style={[styles.check, item.checked && { backgroundColor: colors.buttonFill, borderColor: colors.buttonFill }]}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: item.checked }}
                            accessibilityLabel={`Mark ${item.title} as paid`}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            {item.checked && <Ionicons name="checkmark" size={15} color={colors.onButton} />}
                          </TouchableOpacity>
                          <TouchableOpacity style={[{ flex: 1, flexDirection: 'row', alignItems: 'center' }, item.checked && paidRowContent]} onPress={() => toggleDrop(item.id)} accessibilityRole="button" accessibilityHint="Edit this item" testID={`travel-item-${item.id}`}>
                            {item.checked && <PaidLine testID={`travel-item-paid-${item.id}`} />}
                            <View style={{ flex: 1, marginRight: 8 }}>
                              <Text style={styles.tripName} numberOfLines={1}>{item.title || 'Item'}</Text>
                              <Text style={styles.tripSub} numberOfLines={2}>
                                {[item.checked ? paidLine(item) : '', !item.checked && item.dueDate ? `Due ${shortDay(item.dueDate)}${typeof item.cost === 'number' && item.cost > 0 ? ' · on To-Pay' : ''}` : '', item.note?.trim() || '', who.others(item.addedBy) ? `added by ${who.nameOf(item.addedBy)}` : ''].filter(Boolean).join(' · ') || 'Not paid yet'}
                              </Text>
                            </View>
                            {item.checked && !!item.receiptPhoto && (
                              <TouchableOpacity onPress={() => setViewReceipt(item.receiptPhoto || null)} accessibilityRole="imagebutton" accessibilityLabel={`Receipt for ${item.title || 'this item'}. Tap to see it full size`} testID="travel-item-receipt" hitSlop={6} style={{ marginRight: 10 }}>
                                <Image source={{ uri: item.receiptPhoto }} style={styles.itemReceipt} resizeMode="cover" />
                              </TouchableOpacity>
                            )}
                            {/* Blue while it's only planned; crossed out in red once it's paid (it now counts as money out). */}
                            <Text style={[styles.tripAmount, item.checked ? { color: colors.negative } : { color: toneUnlessZero(typeof item.cost === 'number' ? item.cost : 0, colors.planned, colors) }]}>{typeof item.cost === 'number' ? formatPeso(item.cost) : ''}</Text>
                          </TouchableOpacity>
                        </View>
                        {dropOpen === item.id && (
                          <TripItemDrop
                            kind="item"
                            paid={item.checked}
                            initial={{ title: item.title, cost: item.cost, note: item.note, date: item.dueDate }}
                            onSave={(d) => saveItem(t.id, item.id, d)}
                            onCancel={closeDrop}
                            remove={removeItem(t.id, item)}
                          />
                        )}
                        </React.Fragment>
                      ))}
                      <TouchableOpacity style={[styles.checkRow, (t.checklist || []).length > 0 && styles.rowDivider]} onPress={() => toggleDrop('new-item')} accessibilityRole="button" testID="travel-add-item">
                        <Ionicons name="add" size={22} color={colors.gold} style={{ marginRight: 10 }} />
                        <Text style={[styles.tripName, { color: colors.gold }]}>Add an item</Text>
                      </TouchableOpacity>
                      {dropOpen === 'new-item' && <TripItemDrop kind="item" isNew onSave={(d) => saveItem(t.id, null, d)} onCancel={closeDrop} />}
                    </View>
                    <Text style={styles.groupFooter}>Blue is planned. Tick an item once it's paid and choose the account it came from (or just mark it paid). Paid for something on this list? Tick it here instead of adding it with + on Home, so it isn't counted twice.</Text>
                  </>
                  ) : (
                  <>
                  <Text style={styles.groupHeader}>To-do</Text>
                  <View style={styles.listGroup}>
                    <GradientFill match={styles.listGroup} />
                    {(t.todos || []).map((td, i) => (
                      <React.Fragment key={td.id}>
                      <View style={[styles.checkRow, i > 0 && styles.rowDivider]}>
                        <TouchableOpacity
                          onPress={() => { hapticSelection(); saveTripTodos(t.id, (list) => list.map((x) => (x.id === td.id ? { ...x, done: !x.done } : x))); }}
                          style={[styles.check, td.done && { backgroundColor: colors.buttonFill, borderColor: colors.buttonFill }]}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: td.done }}
                          accessibilityLabel={td.text}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          {td.done && <Ionicons name="checkmark" size={15} color={colors.onButton} />}
                        </TouchableOpacity>
                        {/* Cath, 2026-11-06 (mockup scene 4): tap it to open it right here. */}
                        <TouchableOpacity style={{ flex: 1, marginRight: 8 }} onPress={() => toggleDrop(td.id)} accessibilityRole="button" accessibilityHint="Edit this to-do" testID={`travel-page-todo-edit-${td.id}`}>
                          <Text style={[styles.tripName, td.done && { color: colors.inkDim, textDecorationLine: 'line-through' }]}>{td.text}</Text>
                          {(() => {
                            const line = [td.done ? 'Done' : td.date ? shortDay(td.date) : '', typeof td.cost === 'number' ? formatPeso(td.cost) : '', td.note || '', who.others(td.addedBy) ? `added by ${who.nameOf(td.addedBy)}` : ''].filter(Boolean).join(' · ');
                            return line ? <Text style={styles.tripSub} numberOfLines={2}>{line}</Text> : null;
                          })()}
                        </TouchableOpacity>
                      </View>
                      {dropOpen === td.id && (
                        <TripItemDrop
                          kind="todo"
                          initial={{ title: td.text, cost: td.cost ?? '', note: td.note, date: td.date }}
                          onSave={(d) => saveTodo(t.id, td.id, d)}
                          onCancel={closeDrop}
                          remove={removeTodo(t.id, td)}
                        />
                      )}
                      </React.Fragment>
                    ))}
                    <TouchableOpacity style={[styles.checkRow, (t.todos || []).length > 0 && styles.rowDivider]} onPress={() => toggleDrop('new-todo')} accessibilityRole="button" testID="travel-add-todo">
                      <Ionicons name="add" size={22} color={colors.gold} style={{ marginRight: 10 }} />
                      <Text style={[styles.tripName, { color: colors.gold }]}>Add to the list</Text>
                    </TouchableOpacity>
                    {dropOpen === 'new-todo' && <TripItemDrop kind="todo" isNew onSave={(d) => saveTodo(t.id, null, d)} onCancel={closeDrop} />}
                  </View>
                  <Text style={styles.groupFooter}>Your notes for this trip, with tick boxes. Nothing here touches your money.</Text>
                  </>
                  )
                }
              />
              {/* Version 2.2 (Cath): Delete at the bottom of the trip, not only inside Edit. */}
              {/* Version 2.2 (W2 everywhere): who added the trip, and who last changed it. */}
              <WhoFootnote addedBy={t.addedBy} createdAt={t.createdAt} changedBy={t.changedBy} changedAt={t.changedAt} style={{ marginTop: 4, marginBottom: 12 }} />
              <DeleteRow label="Delete trip" testID="travel-trip-delete" onPress={() => confirmDeleteTripFromPage(t)} />
            </>
          );
        })()}

        {otherUpcoming.length > 0 && (
          <>
            <Text style={styles.groupHeader}>Coming up</Text>
            {otherUpcoming.map((trip) => tripCard(trip))}
          </>
        )}

        {!featured && past.length > 0 && (
          <>
            <Text style={styles.groupHeader}>Past trips</Text>
            <View style={styles.listGroup}>
              <GradientFill match={styles.listGroup} />
              {past.map((trip, i) => {
                const budget = tripFullChecklistTotal(trip);
                const paid = tripChecklistTotal(trip);
                const diff = budget - paid;
                const note = budget > 0 ? (diff >= 0 ? `${formatPeso(diff)} under budget` : `${formatPeso(-diff)} over budget`) : '';
                return tripRow(trip, i, () => setFeaturedId(trip.id), [niceRange(trip), note].filter(Boolean).join(' · '), formatPeso(paid), colors.negative);
              })}
            </View>
          </>
        )}
      </PullToRefreshScrollView>
      </View>
      </SwipeTabs>

      <BottomSheet
        visible={datesTripId !== null}
        onClose={() => setDatesTripId(null)}
        grouped
        header={<SheetBar title="Trip dates" onCancel={() => setDatesTripId(null)} onDone={saveTripDates} doneLabel="Save" />}
      >
        <FormGroup>
          <View style={{ padding: 12, gap: 8 }}>
            <DateField mark="optional" label="Start" value={datesStart} onChange={(d) => { setDatesStart(d); setDatesError(''); }} placeholder="Pick a date" clearable testID="travel-dates-start" />
            <DateField mark="optional" label="End" value={datesEnd} onChange={(d) => { setDatesEnd(d); setDatesError(''); }} placeholder="Pick a date" clearable testID="travel-dates-end" minimumDate={datesStart ? new Date(datesStart + 'T00:00:00') : undefined} />
          </View>
        </FormGroup>
        {!!datesError && <Text style={[styles.groupFooter, { color: colors.negative }]}>{datesError}</Text>}
      </BottomSheet>

      <BottomSheet
        visible={nameTripId !== null}
        onClose={() => setNameTripId(null)}
        grouped
        header={<SheetBar title="Trip name" onCancel={() => setNameTripId(null)} onDone={saveTripName} doneLabel="Save" />}
      >
        <FormGroup>
          <InputRow mark="required" label="Trip name" value={nameDraft} onChangeText={(t) => { setNameDraft(t); setNameError(''); }} placeholder="e.g. Baguio weekend" autoFocus testID="travel-rename-input" invalid={!!nameError} />
        </FormGroup>
        {!!nameError && <Text style={[styles.groupFooter, { color: colors.negative, marginTop: 0 }]}>{nameError}</Text>}
      </BottomSheet>

      <BottomSheet
        visible={modalOpen}
        onClose={closeModal}
        grouped
        header={<SheetBar title="New trip" onCancel={closeModal} onDone={handleAddTrip} doneLabel="Add" />}
      >
        <FormGroup>
          <Guided {...fieldErrors.props('name')} focusRef={nameRef}>
            <InputRow mark="required" label="Trip name" value={nameInput} onChangeText={setNameInput} placeholder="e.g. Baguio weekend" autoFocus testID="travel-name-input" inputRef={nameRef} invalid={fieldErrors.field === 'name'} />
          </Guided>
          <Guided {...fieldErrors.props('dates')} onShow={() => { if (openRow !== 'dates') toggleRow('dates'); }}>
          <PickerRow mark="optional" label="Dates" value={formDates} open={openRow === 'dates'} invalid={fieldErrors.field === 'dates'} onToggle={() => toggleRow('dates')} testID="travel-dates-row">
            <DateField label="Start" value={startDateInput} onChange={setStartDateInput} placeholder="Pick a date" clearable testID="travel-start-date-field" />
            <DateField label="End" value={endDateInput} onChange={setEndDateInput} placeholder="Pick a date" clearable testID="travel-end-date-field" />
          </PickerRow>
          </Guided>
        </FormGroup>
        <FormGroup>
          <SwitchRow label="Save for this trip in Savings?" value={trackInSavings} onChange={setTrackInSavings} />
        </FormGroup>
        <Footnote>{trackInSavings ? 'Makes a pot for this trip that fills up before you go.' : 'Turn on to make a savings pot for this trip.'}</Footnote>
      </BottomSheet>
      {/* Version 2.2 (canvas P1-P2): ticking an item on the trip page asks here. */}
      {paySheet(!!payAsk && payAsk.tripId !== null, (model.travel ?? []).find((x) => x.id === payAsk?.tripId)?.checklist ?? [])}
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
    featureTitle: { fontSize: 22, fontWeight: '700', color: colors.ink, flex: 1, marginRight: 8 },
    featureSub: { fontSize: 15, color: colors.inkDim, marginTop: 2 },
    badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
    badgeText: { fontSize: 12, fontWeight: '600' },
    bar: { height: 6, borderRadius: 999, backgroundColor: colors.navy1, overflow: 'hidden', marginTop: 10 },
    barFill: { height: '100%', borderRadius: 999, backgroundColor: colors.buttonFill },
    trio: { flexDirection: 'row', marginTop: 14, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    trioCell: { flex: 1, paddingLeft: 12, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.navy4 },
    trioVal: { fontSize: 17, fontWeight: '600', marginTop: 2 },
    saveLine: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: -2, marginBottom: 6 },
    groupHeader: { fontSize: 13, fontWeight: '600', color: colors.inkDim, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 12, marginBottom: 6, marginHorizontal: 16 },
    groupFooter: { fontSize: 13, color: colors.inkDim, marginTop: -6, marginBottom: 12, marginHorizontal: 16 },
    checkRow: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: 16, paddingVertical: 10 },
    check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.inkDim, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    tripRow: {
      backgroundColor: colors.navy3,
      minHeight: 60,
      paddingVertical: 10,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    tripRowMain: { flex: 1, marginRight: 10 },
    tripName: { fontSize: 17, fontWeight: '500', color: colors.ink },
    tripSub: { fontSize: 13, color: colors.inkDim, marginTop: 1 },
    tripAmount: { fontSize: 17, fontWeight: '600', color: colors.planned },
    itemReceipt: { width: 30, height: 38, borderRadius: 5, backgroundColor: colors.navy2, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.navy4 },
  });
}
