import React, { useLayoutEffect, useRef, useState } from 'react';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { useNavigation } from '@react-navigation/native';
import { todayISO } from '../dateUtils';
import { View, TouchableOpacity, StyleSheet, ScrollView, Modal, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { PullToRefreshScrollView } from '../PullToRefreshScrollView';
import { formatPeso } from '../balanceProjection';
import type {
  TravelTrip,
  TravelChecklistItem,
  HouseholdModel,
  SavingsGoal,
  ManualTransaction,
} from '../types';
import SwipeableRow from '../components/SwipeableRow';
import { makeId } from '../utils';
import DateField from '../components/DateField';
import { hapticSelection } from '../haptics';
import Button from '../components/Button';
import AmountInput from '../components/AmountInput';
import GradientFill from '../components/GradientFill';

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

// Compares a trip's checklist before and after editing, and logs (or removes) a real
// ManualTransaction for each item as it gets checked on/off — so completing a checklist
// item doesn't just move a savings-goal number, it also shows up in Transactions.
// - Item newly checked (with a cost) and no transaction yet -> create one.
// - Item unchecked, and it had a transaction -> remove that transaction.
// - Item still checked and already has a transaction -> keep its amount/label in sync.
function reconcileTravelChecklistTransactions(
  priorChecklist: TravelChecklistItem[],
  newChecklist: TravelChecklistItem[],
  transactions: ManualTransaction[],
  tripName: string
): { checklist: TravelChecklistItem[]; transactions: ManualTransaction[] } {
  let txns = [...transactions];
  const priorById = new Map(priorChecklist.map((i) => [i.id, i]));

  const updatedChecklist = newChecklist.map((item) => {
    const prior = priorById.get(item.id);
    const wasChecked = prior?.checked ?? false;
    const hasCost = typeof item.cost === 'number' && item.cost > 0;

    if (item.checked && !wasChecked && hasCost && !item.expenseTransactionId) {
      const newTxn: ManualTransaction = {
        id: makeId('txn'),
        date: item.completedDate || todayISO(),
        label: tripName + ': ' + item.title,
        amount: item.cost as number,
        direction: 'out',
        owner: 'shared',
        category: 'Travel',
      };
      txns = [...txns, newTxn];
      return { ...item, expenseTransactionId: newTxn.id };
    }

    if (!item.checked && wasChecked && item.expenseTransactionId) {
      txns = txns.filter((t) => t.id !== item.expenseTransactionId);
      return { ...item, expenseTransactionId: undefined };
    }

    if (item.checked && item.expenseTransactionId && hasCost) {
      txns = txns.map((t) =>
        t.id === item.expenseTransactionId
          ? { ...t, amount: item.cost as number, label: tripName + ': ' + item.title }
          : t
      );
    }

    return item;
  });

  // Items that existed before but are gone now were deleted outright (not just
  // unchecked) — clean up any transaction they were linked to, the same way
  // unchecking one does above.
  const newIds = new Set(newChecklist.map((i) => i.id));
  const deletedTxnIds = priorChecklist
    .filter((i) => !newIds.has(i.id) && i.expenseTransactionId)
    .map((i) => i.expenseTransactionId as string);
  if (deletedTxnIds.length) {
    const deletedSet = new Set(deletedTxnIds);
    txns = txns.filter((t) => !deletedSet.has(t.id));
  }

  return { checklist: updatedChecklist, transactions: txns };
}


// Redesign helpers: "Nov 28 – 30 · 3 days", "In 46 days", "Oct 2".
function shortDay(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function niceRange(trip: TravelTrip): string {
  const s = trip.startDate ? new Date(trip.startDate + 'T00:00:00') : null;
  const e = trip.endDate ? new Date(trip.endDate + 'T00:00:00') : null;
  if (!s && !e) return 'No dates yet';
  if (s && e && !isNaN(s.getTime()) && !isNaN(e.getTime())) {
    const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
    const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
    const range = sameMonth ? `${shortDay(trip.startDate)} – ${e.getDate()}` : `${shortDay(trip.startDate)} – ${shortDay(trip.endDate)}`;
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
  const { model, saveModel } = useData();
  const styles = makeStyles(colors);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const itemTitleRef = useRef<any>(null);
  const [nameInput, setNameInput] = useState('');
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [checklist, setChecklist] = useState<TravelChecklistItem[]>([]);
  const [itemTitleInput, setItemTitleInput] = useState('');
  const [itemCostInput, setItemCostInput] = useState<number | ''>('');
  const [errorMsg, setErrorMsg] = useState('');
  const [trackInSavings, setTrackInSavings] = useState(false);
  const [featuredId, setFeaturedId] = useState<string | null>(null);
  const navigation = useNavigation<any>();

  // Redesign: + in the top bar adds a trip.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={openAddModal} accessibilityRole="button" accessibilityLabel="Add a trip" testID="travel-add" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="add" size={28} color={colors.gold} />
        </TouchableOpacity>
      ),
    });
  });

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
  const featured = upcoming.find((t) => t.id === featuredId) ?? upcoming[0];
  const otherUpcoming = upcoming.filter((t) => t !== featured);

  // Ticks an item paid (or unpaid) right from the list, logging or removing its expense.
  async function toggleItem(trip: TravelTrip, item: TravelChecklistItem) {
    if (!model) return;
    hapticSelection();
    const next = (trip.checklist || []).map((i) =>
      i.id === item.id ? { ...i, checked: !i.checked, completedDate: !i.checked ? todayISO() : i.completedDate } : i
    );
    const { checklist: synced, transactions } = reconcileTravelChecklistTransactions(trip.checklist || [], next, model.manualTransactions || [], trip.name);
    await saveModel({
      ...model,
      travel: trips.map((t) => (t.id === trip.id ? { ...t, checklist: synced } : t)),
      manualTransactions: transactions,
    });
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
    setEditingId(null);
    setNameInput('');
    setStartDateInput('');
    setEndDateInput('');
    setChecklist([]);
    setTrackInSavings(false);
    setItemTitleInput('');
    setItemCostInput('');
    setErrorMsg('');
    setModalOpen(true);
  }

  function openEditModal(trip: TravelTrip) {
    setEditingId(trip.id);
    setNameInput(trip.name);
    setStartDateInput(trip.startDate);
    setEndDateInput(trip.endDate);
    setChecklist(trip.checklist ?? []);
    setTrackInSavings(trip.trackInSavings ?? false);
    setItemTitleInput('');
    setItemCostInput('');
    setErrorMsg('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setErrorMsg('');
  }

  function handleAddChecklistItem() {
    const title = itemTitleInput.trim();
    if (!title) {
      setErrorMsg('Enter an item title.');
      return;
    }
    const cost: number | '' = itemCostInput;
    const newItem: TravelChecklistItem = {
      id: makeId('travelitem'),
      title,
      cost,
      checked: false,
    };
    setChecklist((prev) => [...prev, newItem]);
    setItemTitleInput('');
    setItemCostInput('');
    setErrorMsg('');
    // Ready for the next item straight away.
    setTimeout(() => itemTitleRef.current?.focus(), 50);
  }

  function handleToggleChecklistItem(id: string) {
    setChecklist((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, checked: !i.checked, completedDate: !i.checked ? todayISO() : undefined }
          : i
      )
    );
  }

  async function handleRemoveChecklistItem(id: string) {
    const removedItem = checklist.find((i) => i.id === id);
    const newChecklist = checklist.filter((i) => i.id !== id);
    setChecklist(newChecklist);

    // Deleting a checklist item is a one-way, destructive action (unlike editing the
    // trip's name/dates, which only takes effect once "Save trip" is tapped) — so for an
    // existing, already-saved trip, persist the removal (and clean up any linked expense)
    // right away instead of waiting for Save. This matches how every other delete button
    // in the app behaves, and avoids leaving a dangling expenseTransactionId behind if the
    // person cancels out of the modal afterward instead of saving.
    if (!model || !editingId) return;
    const currentList = model.travel ?? [];
    const priorTrip = currentList.find((t) => t.id === editingId);
    if (!priorTrip) return;

    const updatedTrip: TravelTrip = { ...priorTrip, checklist: newChecklist };
    const updated: HouseholdModel = {
      ...model,
      travel: currentList.map((t) => (t.id === editingId ? updatedTrip : t)),
      manualTransactions: removedItem?.expenseTransactionId
        ? (model.manualTransactions ?? []).filter((t) => t.id !== removedItem.expenseTransactionId)
        : model.manualTransactions,
    };
    try {
      await saveModel(updated);
    } catch (e) {
      Alert.alert('Failed to remove item', 'Please try again.');
    }
  }

  async function handleSaveTrip() {
    if (!model) return;
    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      setErrorMsg('Enter a trip name.');
      return;
    }
    if (!isValidDateOrEmpty(startDateInput) || !isValidDateOrEmpty(endDateInput)) {
      setErrorMsg('Enter dates as YYYY-MM-DD.');
      return;
    }

    const currentList = model.travel ?? [];
    const priorTrip = editingId ? currentList.find((t) => t.id === editingId) : undefined;
    const { checklist: reconciledChecklist, transactions: reconciledTransactions } =
      reconcileTravelChecklistTransactions(
        priorTrip?.checklist ?? [],
        checklist,
        model.manualTransactions ?? [],
        trimmedName
      );
    const draftTrip: TravelTrip = {
      id: editingId ?? makeId('trip'),
      name: trimmedName,
      startDate: startDateInput.trim(),
      endDate: endDateInput.trim(),
      checklist: reconciledChecklist,
      trackInSavings,
      savingsGoalId: priorTrip?.savingsGoalId,
      createdAt: priorTrip?.createdAt ?? Date.now(),
    };
    const budget = tripFullChecklistTotal(draftTrip);
    const { goals: syncedGoals, savingsGoalId } = syncTripSavingsGoal(
      draftTrip,
      budget,
      model.savingsGoals ?? []
    );
    const finalTrip: TravelTrip = { ...draftTrip, budget, savingsGoalId };
    const updatedList: TravelTrip[] = editingId
      ? currentList.map((t) => (t.id === editingId ? finalTrip : t))
      : [...currentList, finalTrip];
    const updated: HouseholdModel = {
      ...model,
      travel: updatedList,
      savingsGoals: syncedGoals,
      manualTransactions: reconciledTransactions,
    };
    await saveModel(updated);
    closeModal();
  }

  async function handleDeleteTrip() {
    if (!editingId || !model) return;
    const tripBeingDeleted = (model.travel ?? []).find((t) => t.id === editingId);
    const linkedTxnIds = new Set(
      (tripBeingDeleted?.checklist ?? [])
        .map((i) => i.expenseTransactionId)
        .filter((id): id is string => !!id)
    );
    const updated: HouseholdModel = {
      ...model,
      travel: (model.travel ?? []).filter((t) => t.id !== editingId),
      savingsGoals: tripBeingDeleted?.savingsGoalId
        ? (model.savingsGoals ?? []).filter((g) => g.id !== tripBeingDeleted.savingsGoalId)
        : model.savingsGoals,
      manualTransactions: linkedTxnIds.size
        ? (model.manualTransactions ?? []).filter((t) => !linkedTxnIds.has(t.id))
        : model.manualTransactions,
    };
    await saveModel(updated);
    closeModal();
  }

  async function performDeleteTripById(id: string) {
    if (!model) return;
    const tripBeingDeleted = (model.travel ?? []).find((t) => t.id === id);
    const linkedTxnIds = new Set(
      (tripBeingDeleted?.checklist ?? [])
        .map((i) => i.expenseTransactionId)
        .filter((tid): tid is string => !!tid)
    );
    const updated: HouseholdModel = {
      ...model,
      travel: (model.travel ?? []).filter((t) => t.id !== id),
      savingsGoals: tripBeingDeleted?.savingsGoalId
        ? (model.savingsGoals ?? []).filter((g) => g.id !== tripBeingDeleted.savingsGoalId)
        : model.savingsGoals,
      manualTransactions: linkedTxnIds.size
        ? (model.manualTransactions ?? []).filter((t) => !linkedTxnIds.has(t.id))
        : model.manualTransactions,
    };
    await saveModel(updated);
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

  return (
    <View style={styles.container}>
      <PullToRefreshScrollView contentContainerStyle={styles.scrollContent}>
        {trips.length === 0 && (
          <View style={[styles.listGroup, { padding: 16 }]}>
            <GradientFill match={styles.listGroup} />
            <Text style={styles.tripName}>No trips yet</Text>
            <Text style={[styles.tripSub, { marginTop: 4 }]}>Tap + to plan one. List what it will cost and the budget adds itself up.</Text>
          </View>
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
              <TouchableOpacity style={[styles.listGroup, { padding: 16 }]} onPress={() => openEditModal(t)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={`${t.name}, edit trip`}>
                <GradientFill match={styles.listGroup} />
                <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <Text style={styles.featureTitle} numberOfLines={1}>{t.name || 'Untitled trip'}</Text>
                  {!!badge && (
                    <View style={[styles.badge, { backgroundColor: colors.accentTint }]}>
                      <Text style={[styles.badgeText, { color: colors.gold }]}>{badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.featureSub}>{niceRange(t)}</Text>
                {goal && budget > 0 && (
                  <>
                    <View style={styles.bar}>
                      <View style={[styles.barFill, { width: `${pct}%` }]} />
                    </View>
                    <Text style={[styles.tripSub, { marginTop: 6 }]}>{pct}% saved in your {goal.name} pot</Text>
                  </>
                )}
                <View style={styles.trio}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tripSub}>Budget</Text>
                    <Text style={[styles.trioVal, { color: colors.planned }]}>{formatPeso(budget)}</Text>
                  </View>
                  <View style={styles.trioCell}>
                    <Text style={styles.tripSub}>{goal ? 'Saved' : 'Left'}</Text>
                    <Text style={[styles.trioVal, { color: colors.saving }]}>{formatPeso(goal ? saved : Math.max(0, budget - paid))}</Text>
                  </View>
                  <View style={styles.trioCell}>
                    <Text style={styles.tripSub}>Paid</Text>
                    <Text style={[styles.trioVal, { color: colors.negative }]}>{formatPeso(paid)}</Text>
                  </View>
                </View>
              </TouchableOpacity>

              <Text style={styles.groupHeader}>Checklist</Text>
              <View style={styles.listGroup}>
                <GradientFill match={styles.listGroup} />
                {(t.checklist || []).length === 0 && (
                  <Text style={[styles.tripSub, { padding: 16 }]}>Nothing on this trip's checklist yet. Tap the trip above to add what it will cost.</Text>
                )}
                {(t.checklist || []).map((item, i) => (
                  <View key={item.id} style={[styles.checkRow, i > 0 && styles.rowDivider]}>
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
                    <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }} onPress={() => openEditModal(t)} accessibilityRole="button">
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={[styles.tripName, item.checked && { color: colors.inkDim }]} numberOfLines={1}>{item.title || 'Item'}</Text>
                        <Text style={styles.tripSub}>{item.checked ? `Paid${item.completedDate ? ' ' + shortDay(item.completedDate) : ''}` : 'Not paid yet'}</Text>
                      </View>
                      <Text style={[styles.tripAmount, { color: colors.planned }]}>{typeof item.cost === 'number' ? formatPeso(item.cost) : ''}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              <Text style={styles.groupFooter}>The budget is the total of this checklist. Ticking an item adds it to your spending.</Text>
            </>
          );
        })()}

        {otherUpcoming.length > 0 && (
          <>
            <Text style={styles.groupHeader}>Other trips</Text>
            <View style={styles.listGroup}>
              <GradientFill match={styles.listGroup} />
              {otherUpcoming.map((trip, i) => tripRow(trip, i, () => setFeaturedId(trip.id), `${niceRange(trip)}${tripBadge(trip, today) ? ' · ' + tripBadge(trip, today).toLowerCase() : ''}`, formatPeso(tripFullChecklistTotal(trip)), colors.planned))}
            </View>
          </>
        )}

        {past.length > 0 && (
          <>
            <Text style={styles.groupHeader}>Past trips</Text>
            <View style={styles.listGroup}>
              <GradientFill match={styles.listGroup} />
              {past.map((trip, i) => {
                const budget = tripFullChecklistTotal(trip);
                const paid = tripChecklistTotal(trip);
                const diff = budget - paid;
                const note = budget > 0 ? (diff >= 0 ? `${formatPeso(diff)} under budget` : `${formatPeso(-diff)} over budget`) : '';
                return tripRow(trip, i, () => openEditModal(trip), [niceRange(trip), note].filter(Boolean).join(' · '), formatPeso(paid), colors.negative);
              })}
            </View>
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
                <Text style={styles.modalTitle}>{editingId ? 'Edit trip' : 'New trip'}</Text>

                <Text style={styles.inputLabel}>Trip name</Text>
                <TextInput
                  autoFocus={!editingId}
                  style={styles.input}
                  placeholder="e.g. Japan trip, Beach weekend"
                  placeholderTextColor={colors.inkFaint}
                  value={nameInput}
                  onChangeText={setNameInput}
                />

                <DateField
                  label="Start date (optional)"
                  value={startDateInput}
                  onChange={setStartDateInput}
                  placeholder="2026-03-01"
                  clearable
                  testID="travel-start-date-field"
                />

                <DateField
                  label="End date (optional)"
                  value={endDateInput}
                  onChange={setEndDateInput}
                  placeholder="2026-03-08"
                  clearable
                  testID="travel-end-date-field"
                />

                <View style={styles.budgetBanner}>
                  <Text style={styles.budgetBannerLabel}>COMMITTED BUDGET (CHECKED ITEMS)</Text>
                  <Text style={styles.budgetBannerAmount}>
                    {formatPeso(checklist.filter((i) => i.checked).reduce((s, i) => s + (typeof i.cost === 'number' ? i.cost : 0), 0))}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.trackToggle, trackInSavings && styles.trackToggleActive]}
                  onPress={() => { hapticSelection(); setTrackInSavings((prev) => !prev); }}
                >
                  <GradientFill match={[styles.trackToggle, trackInSavings && styles.trackToggleActive]} />
                  {trackInSavings && (
                    <Ionicons
                      name="checkmark"
                      size={15}
                      color={colors.accent || '#3ecf8e'}
                      style={{ marginRight: 6 }}
                    />
                  )}
                  <Text style={[styles.trackToggleText, trackInSavings && styles.trackToggleTextActive]}>
                    {trackInSavings ? 'Auto-saving to Savings tab' : 'Not tracked in Savings tab'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.trackHint}>
                  {trackInSavings
                    ? 'Synced to a matching savings goal.'
                    : 'Automatically syncs a savings goal with this trip budget.'}
                </Text>

                <Text style={styles.checklistHeading}>Checklist</Text>
                {checklist.length === 0 && (
                  <Text style={styles.emptyText}>No checklist items yet.</Text>
                )}
                {checklist.map((item) => (
                  <View key={item.id} style={styles.checklistRow}>
                    <TouchableOpacity
                      style={[styles.checkbox, item.checked && styles.checkboxChecked]}
                      onPress={() => handleToggleChecklistItem(item.id)}
                    >
                      <GradientFill match={[styles.checkbox, item.checked && styles.checkboxChecked]} />
                      {item.checked && <Ionicons name="checkmark" size={14} color={colors.navy2} />}
                    </TouchableOpacity>
                    <View style={styles.checklistRowMain}>
                      <Text
                        style={[styles.checklistItemTitle, item.checked && styles.checklistItemTitleDone]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      {typeof item.cost === 'number' && (
                        <Text style={styles.checklistItemCost}>{formatPeso(item.cost)}</Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.removeItemButton}
                      onPress={() => handleRemoveChecklistItem(item.id)}
                    >
                      <GradientFill match={styles.removeItemButton} />
                      <Ionicons name="close" size={14} color={colors.inkDim} />
                    </TouchableOpacity>
                  </View>
                ))}

                <Text style={styles.inputLabel}>Item title</Text>
                <TextInput
                  ref={itemTitleRef}
                  style={styles.input}
                  placeholder="e.g. Book flights, Reserve hotel"
                  placeholderTextColor={colors.inkFaint}
                  value={itemTitleInput}
                  onChangeText={setItemTitleInput}
                />
                <Text style={styles.inputLabel}>Cost (optional)</Text>
                <AmountInput style={styles.amountInput} value={itemCostInput} onChangeAmount={setItemCostInput} />
                <TouchableOpacity style={styles.addItemButton} onPress={handleAddChecklistItem}>
                  <Text style={styles.addItemButtonText}>+ Add item</Text>
                </TouchableOpacity>

                {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

                <Button label="Save" onPress={handleSaveTrip} />

                {editingId && <Button label="Delete trip" variant="destructive" onPress={handleDeleteTrip} />}

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
    featureTitle: { fontSize: 22, fontWeight: '700', color: colors.ink, flex: 1, marginRight: 8 },
    featureSub: { fontSize: 15, color: colors.inkDim, marginTop: 2 },
    badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
    badgeText: { fontSize: 12, fontWeight: '600' },
    bar: { height: 6, borderRadius: 999, backgroundColor: colors.navy1, overflow: 'hidden', marginTop: 10 },
    barFill: { height: '100%', borderRadius: 999, backgroundColor: colors.buttonFill },
    trio: { flexDirection: 'row', marginTop: 14, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    trioCell: { flex: 1, paddingLeft: 12, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.navy4 },
    trioVal: { fontSize: 17, fontWeight: '600', marginTop: 2 },
    groupHeader: { fontSize: 13, fontWeight: '600', color: colors.inkDim, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 12, marginBottom: 6, marginHorizontal: 16 },
    groupFooter: { fontSize: 13, color: colors.inkDim, marginTop: -6, marginBottom: 12, marginHorizontal: 16 },
    checkRow: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: 16, paddingVertical: 10 },
    check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.inkDim, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    emptyText: { fontSize: 15, color: colors.inkDim, marginBottom: 12, textAlign: 'center' },
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
    inputLabel: {
      // Redesign: sentence-case grey labels, like iPhone forms.
      fontSize: 13,
      fontWeight: '600',
      marginLeft: 4,
      color: colors.inkDim,
      marginBottom: 6,
      marginTop: 6,
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
    budgetBanner: {
      backgroundColor: colors.navy2,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 16,
    },
    budgetBannerLabel: { fontSize: 11, letterSpacing: 0.8, color: colors.inkDim, marginBottom: 4 },
    budgetBannerAmount: { fontSize: 18, fontWeight: '700', color: colors.ink },
    checklistHeading: { fontSize: 13, fontWeight: '700', color: colors.ink, marginBottom: 8 },
    checklistRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.navy2,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 10,
      marginBottom: 6,
      gap: 8,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: colors.inkFaint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: { backgroundColor: colors.buttonFill, borderColor: colors.gold },
    checklistRowMain: { flex: 1 },
    checklistItemTitle: { fontSize: 13.5, color: colors.ink },
    checklistItemTitleDone: { textDecorationLine: 'line-through', color: colors.inkFaint },
    checklistItemCost: { fontSize: 11.5, color: colors.inkDim, marginTop: 1 },
    removeItemButton: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.navy3,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addItemButton: {
      backgroundColor: colors.navy2,
      borderRadius: 999,
      paddingVertical: 10,
      alignItems: 'center',
      marginBottom: 16,
    },
    addItemButtonText: { fontSize: 12.5, fontWeight: '600', color: colors.gold },
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
    trackToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.navy3,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
      marginTop: 12,
      alignSelf: 'flex-start',
    },
    trackToggleActive: {
      backgroundColor: colors.accent ? colors.accent + '22' : colors.navy3,
    },
    trackToggleText: {
      fontSize: 12.5,
      fontWeight: '600',
      color: colors.inkDim,
    },
    trackToggleTextActive: {
      color: colors.accent || '#3ecf8e',
    },
    trackHint: {
      fontSize: 11.5,
      color: colors.inkFaint,
      marginTop: 6,
      marginBottom: 4,
      lineHeight: 16,
    },
  });
}
