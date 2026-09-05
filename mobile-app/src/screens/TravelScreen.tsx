import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { formatPeso } from '../balanceProjection';
import type {
  TravelTrip,
  TravelChecklistItem,
  HouseholdModel,
  SavingsGoal,
  ManualTransaction,
} from '../types';
import CollapsibleRow from '../components/CollapsibleRow';
import { makeId } from '../utils';
import DateField from '../components/DateField';

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
        date: item.completedDate || new Date().toISOString().slice(0, 10),
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

  return { checklist: updatedChecklist, transactions: txns };
}

function tripDateRangeLabel(trip: TravelTrip): string {
  if (trip.startDate && trip.endDate) return trip.startDate + ' – ' + trip.endDate;
  if (trip.startDate) return trip.startDate;
  if (trip.endDate) return trip.endDate;
  return 'No dates set';
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
  const [nameInput, setNameInput] = useState('');
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [checklist, setChecklist] = useState<TravelChecklistItem[]>([]);
  const [itemTitleInput, setItemTitleInput] = useState('');
  const [itemCostInput, setItemCostInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [trackInSavings, setTrackInSavings] = useState(false);

  if (!model) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator color={colors.accent ?? colors.gold} />
      </View>
    );
  }

  const trips: TravelTrip[] = model.travel ?? [];

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
      setErrorMsg('Enter a checklist item title.');
      return;
    }
    let cost: number | '' = '';
    if (itemCostInput.trim() !== '') {
      const n = parseFloat(itemCostInput);
      if (isNaN(n)) {
        setErrorMsg('Enter a valid cost, or leave it blank.');
        return;
      }
      cost = n;
    }
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
  }

  function handleToggleChecklistItem(id: string) {
    setChecklist((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, checked: !i.checked, completedDate: !i.checked ? new Date().toISOString().slice(0, 10) : undefined }
          : i
      )
    );
  }

  function handleRemoveChecklistItem(id: string) {
    setChecklist((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleSaveTrip() {
    if (!model) return;
    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      setErrorMsg('Enter a trip name.');
      return;
    }
    if (!isValidDateOrEmpty(startDateInput) || !isValidDateOrEmpty(endDateInput)) {
      setErrorMsg('Dates must be in YYYY-MM-DD format, or left blank.');
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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionIntro}>
          Plan the trip, break it into checklist items with a rough cost each, and see the
          committed budget build itself as you check things off.
        </Text>

        {trips.length === 0 && (
          <Text style={styles.emptyText}>No trips yet. Add your first one below.</Text>
        )}

        {trips.map((trip) => {
          const total = tripChecklistTotal(trip);
          const checklistCount = (trip.checklist ?? []).length;
          const doneCount = (trip.checklist ?? []).filter((i) => i.checked).length;
          return (
            <TouchableOpacity
              key={trip.id}
              style={styles.tripRow}
              activeOpacity={0.7}
              onPress={() => openEditModal(trip)}
            >
              <View style={styles.tripRowMain}>
                <Text style={styles.tripName} numberOfLines={1}>
                  {trip.name || 'Untitled trip'}
                </Text>
                <Text style={styles.tripSub}>
                  {tripDateRangeLabel(trip)} · {checklistCount} item{checklistCount === 1 ? '' : 's'}
                  {checklistCount > 0 ? ` (${doneCount} done)` : ''}
                </Text>
              </View>
              <Text style={styles.tripAmount}>{formatPeso(total)}</Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>+ Add trip</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={closeModal}>
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardWrap}
          >
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>{editingId ? 'Edit trip' : 'New trip'}</Text>

                <Text style={styles.inputLabel}>Trip name</Text>
                <TextInput
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
                  onPress={() => setTrackInSavings((prev) => !prev)}
                >
                  <View style={[styles.trackToggleDot, trackInSavings && styles.trackToggleDotActive]} />
                  <Text style={[styles.trackToggleText, trackInSavings && styles.trackToggleTextActive]}>
                    {trackInSavings ? 'Auto-saving to Savings tab' : 'Not tracked in Savings tab'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.trackHint}>
                  {trackInSavings
                    ? "Budget is the sum of every checklist item, and stays synced to a matching savings goal."
                    : "Turn this on to automatically create and keep a savings goal in sync with this trip's full checklist total."}
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
                      {item.checked && <Text style={styles.checkboxMark}>✓</Text>}
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
                      <Text style={styles.removeItemButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                <Text style={styles.inputLabel}>Item title</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Book flights, Reserve hotel"
                  placeholderTextColor={colors.inkFaint}
                  value={itemTitleInput}
                  onChangeText={setItemTitleInput}
                />
                <Text style={styles.inputLabel}>Cost (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor={colors.inkFaint}
                  keyboardType="decimal-pad"
                  value={itemCostInput}
                  onChangeText={setItemCostInput}
                />
                <TouchableOpacity style={styles.addItemButton} onPress={handleAddChecklistItem}>
                  <Text style={styles.addItemButtonText}>+ Add checklist item</Text>
                </TouchableOpacity>

                {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

                <TouchableOpacity style={styles.saveButton} onPress={handleSaveTrip}>
                  <Text style={styles.saveButtonText}>Save trip</Text>
                </TouchableOpacity>

                {editingId && (
                  <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteTrip}>
                    <Text style={styles.deleteButtonText}>Delete this trip</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </ScrollView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.navy2 },
    loadingContainer: { alignItems: 'center', justifyContent: 'center' },
    scrollContent: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 40 },
    sectionIntro: { fontSize: 12.5, color: colors.inkDim, lineHeight: 18, marginBottom: 16 },
    emptyText: { fontSize: 12, color: colors.inkFaint, marginBottom: 12, fontStyle: 'italic' },
    tripRow: {
      backgroundColor: colors.navy3,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    tripRowMain: { flex: 1, marginRight: 10 },
    tripName: { fontSize: 14, fontWeight: '600', color: colors.ink },
    tripSub: { fontSize: 11.5, color: colors.inkDim, marginTop: 2 },
    tripAmount: { fontSize: 14, fontWeight: '700', color: colors.ink },
    addButton: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 4, marginTop: 4 },
    addButtonText: { fontSize: 13, fontWeight: '600', color: colors.gold },
    inputLabel: {
      fontSize: 11,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: colors.inkDim,
      marginBottom: 6,
      marginTop: 6,
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
    budgetBanner: {
      backgroundColor: colors.navy2,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 16,
    },
    budgetBannerLabel: { fontSize: 9.5, letterSpacing: 0.8, color: colors.inkDim, marginBottom: 4 },
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
    checkboxChecked: { backgroundColor: colors.gold, borderColor: colors.gold },
    checkboxMark: { fontSize: 13, color: colors.navy2, fontWeight: '700' },
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
    removeItemButtonText: { fontSize: 12, color: colors.inkDim },
    addItemButton: {
      backgroundColor: colors.navy2,
      borderRadius: 999,
      paddingVertical: 10,
      alignItems: 'center',
      marginBottom: 16,
    },
    addItemButtonText: { fontSize: 12.5, fontWeight: '600', color: colors.gold },
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
    errorText: { fontSize: 12, color: '#e5484d', marginBottom: 10 },
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
    trackToggleDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.inkFaint,
      marginRight: 8,
    },
    trackToggleDotActive: {
      backgroundColor: colors.accent || '#3ecf8e',
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
