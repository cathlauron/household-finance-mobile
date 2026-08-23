import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
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
import type { GroceryItem, GroceryCalcEntry, HouseholdModel } from '../types';

function makeId(prefix: string): string {
  return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

function plannedTotal(items: GroceryItem[]): number {
  return items.reduce((sum, g) => sum + (typeof g.plannedAmount === 'number' ? g.plannedAmount : 0), 0);
}

function actualTotal(items: GroceryItem[]): number {
  return items
    .filter((g) => g.purchased)
    .reduce((sum, g) => sum + (typeof g.actualAmount === 'number' ? g.actualAmount : 0), 0);
}

function calcTotal(entries: GroceryCalcEntry[]): number {
  return entries.reduce((sum, e) => sum + (typeof e.amount === 'number' ? e.amount : 0), 0);
}

type PillTab = 'list' | 'calculator';

export default function GroceriesScreen() {
  const { colors } = useTheme();
  const { model, saveModel } = useData();
  const styles = makeStyles(colors);

  const [activeTab, setActiveTab] = useState<PillTab>('list');

  // ---- Item add/edit modal state ----
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemNameInput, setItemNameInput] = useState('');
  const [plannedInput, setPlannedInput] = useState('');
  const [actualInput, setActualInput] = useState('');
  const [purchasedInput, setPurchasedInput] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // ---- Calculator add-entry inputs ----
  const [calcLabelInput, setCalcLabelInput] = useState('');
  const [calcAmountInput, setCalcAmountInput] = useState('');
  const [calcErrorMsg, setCalcErrorMsg] = useState('');

  if (!model) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator color={colors.accent ?? colors.gold} />
      </SafeAreaView>
    );
  }

  const groceries: GroceryItem[] = model.groceries ?? [];
  const calcEntries: GroceryCalcEntry[] = model.groceryCalculator ?? [];

  function openAddModal() {
    setEditingId(null);
    setItemNameInput('');
    setPlannedInput('');
    setActualInput('');
    setPurchasedInput(false);
    setErrorMsg('');
    setModalOpen(true);
  }

  function openEditModal(g: GroceryItem) {
    setEditingId(g.id);
    setItemNameInput(g.item);
    setPlannedInput(typeof g.plannedAmount === 'number' ? String(g.plannedAmount) : '');
    setActualInput(typeof g.actualAmount === 'number' ? String(g.actualAmount) : '');
    setPurchasedInput(!!g.purchased);
    setErrorMsg('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setErrorMsg('');
  }

  async function handleSaveItem() {
    if (!model) return;
    const trimmedName = itemNameInput.trim();
    if (!trimmedName) {
      setErrorMsg('Enter an item name.');
      return;
    }
    let planned: number | '' = '';
    if (plannedInput.trim() !== '') {
      const n = parseFloat(plannedInput);
      if (isNaN(n)) {
        setErrorMsg('Enter a valid planned amount, or leave it blank.');
        return;
      }
      planned = n;
    }
    let actual: number | '' = '';
    if (actualInput.trim() !== '') {
      const n = parseFloat(actualInput);
      if (isNaN(n)) {
        setErrorMsg('Enter a valid actual amount, or leave it blank.');
        return;
      }
      actual = n;
    }

    const currentList = model.groceries ?? [];
    let updatedList: GroceryItem[];
    if (editingId) {
      updatedList = currentList.map((g) =>
        g.id === editingId
          ? { ...g, item: trimmedName, plannedAmount: planned, actualAmount: actual, purchased: purchasedInput }
          : g
      );
    } else {
      const newItem: GroceryItem = {
        id: makeId('grocery'),
        item: trimmedName,
        plannedAmount: planned,
        actualAmount: actual,
        purchased: purchasedInput,
      };
      updatedList = [...currentList, newItem];
    }

    const updated: HouseholdModel = { ...model, groceries: updatedList };
    await saveModel(updated);
    closeModal();
  }

  async function handleDeleteItem() {
    if (!editingId || !model) return;
    const updated: HouseholdModel = {
      ...model,
      groceries: (model.groceries ?? []).filter((g) => g.id !== editingId),
    };
    await saveModel(updated);
    closeModal();
  }

  async function handleAddCalcEntry() {
    if (!model) return;
    setCalcErrorMsg('');
    const amountTrimmed = calcAmountInput.trim();
    if (amountTrimmed === '') {
      setCalcErrorMsg('Enter an amount.');
      return;
    }
    const n = parseFloat(amountTrimmed);
    if (isNaN(n) || n <= 0) {
      setCalcErrorMsg('Enter a valid amount greater than 0.');
      return;
    }
    const newEntry: GroceryCalcEntry = {
      id: makeId('calc'),
      label: calcLabelInput.trim() || 'Item',
      amount: n,
    };
    const updated: HouseholdModel = {
      ...model,
      groceryCalculator: [...(model.groceryCalculator ?? []), newEntry],
    };
    await saveModel(updated);
    setCalcLabelInput('');
    setCalcAmountInput('');
  }

  async function handleRemoveCalcEntry(id: string) {
    if (!model) return;
    const updated: HouseholdModel = {
      ...model,
      groceryCalculator: (model.groceryCalculator ?? []).filter((e) => e.id !== id),
    };
    await saveModel(updated);
  }

  async function handleAddCalcToList() {
    if (!model) return;
    const entries = model.groceryCalculator ?? [];
    if (entries.length === 0) return;
    const newItems: GroceryItem[] = entries.map((e) => ({
      id: makeId('grocery'),
      item: e.label,
      plannedAmount: e.amount,
      actualAmount: '',
      purchased: false,
    }));
    const updated: HouseholdModel = {
      ...model,
      groceries: [...(model.groceries ?? []), ...newItems],
      groceryCalculator: [],
    };
    await saveModel(updated);
    setActiveTab('list');
  }

  async function handleClearCalc() {
    if (!model) return;
    const updated: HouseholdModel = { ...model, groceryCalculator: [] };
    await saveModel(updated);
  }

  const planned = plannedTotal(groceries);
  const actual = actualTotal(groceries);
  const runningTotal = calcTotal(calcEntries);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.pillRow}>
        <TouchableOpacity
          style={[styles.pillButton, activeTab === 'list' && styles.pillButtonActive]}
          onPress={() => setActiveTab('list')}
        >
          <Text style={[styles.pillButtonText, activeTab === 'list' && styles.pillButtonTextActive]}>
            Grocery List
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pillButton, activeTab === 'calculator' && styles.pillButtonActive]}
          onPress={() => setActiveTab('calculator')}
        >
          <Text style={[styles.pillButtonText, activeTab === 'calculator' && styles.pillButtonTextActive]}>
            Calculator
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'list' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.balanceBanner}>
            <Text style={styles.balanceBannerLabel}>BUDGET VS ACTUAL</Text>
            <Text style={styles.balanceBannerAmount}>
              {formatPeso(actual)} <Text style={styles.balanceBannerSub}>/ {formatPeso(planned)}</Text>
            </Text>
            <Text style={styles.balanceBannerHint}>Actual only counts items marked "Bought"</Text>
          </View>

          {groceries.length === 0 && (
            <Text style={styles.emptyText}>No items yet. Add your first one below.</Text>
          )}

          {groceries.map((g) => (
            <TouchableOpacity
              key={g.id}
              style={styles.groceryRow}
              activeOpacity={0.7}
              onPress={() => openEditModal(g)}
            >
              <View style={styles.groceryRowMain}>
                <Text style={[styles.groceryName, g.purchased && styles.groceryNamePurchased]} numberOfLines={1}>
                  {g.item || 'Untitled item'}
                </Text>
                <Text style={styles.grocerySub}>
                  {typeof g.plannedAmount === 'number' ? 'Planned ' + formatPeso(g.plannedAmount) : 'No budget set'}
                  {typeof g.actualAmount === 'number' && g.purchased ? ' · Actual ' + formatPeso(g.actualAmount) : ''}
                </Text>
              </View>
              <View style={[styles.purchasedPill, g.purchased && styles.purchasedPillActive]}>
                <Text style={[styles.purchasedPillText, g.purchased && styles.purchasedPillTextActive]}>
                  {g.purchased ? 'Bought' : 'Planned'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Text style={styles.addButtonText}>+ Add grocery item</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {activeTab === 'calculator' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.calcIntro}>
            Handy for tallying while you're actually at the store — add each item as you toss
            it in the cart, then send the whole batch to your grocery list when you're done.
          </Text>

          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>RUNNING TOTAL</Text>
            <Text style={styles.resultAmount}>{formatPeso(runningTotal)}</Text>
          </View>

          {calcEntries.length === 0 && (
            <Text style={styles.emptyText}>Nothing added yet — tally items below as you shop.</Text>
          )}

          {calcEntries.map((e) => (
            <View key={e.id} style={styles.calcRow}>
              <Text style={styles.calcRowLabel} numberOfLines={1}>
                {e.label}
              </Text>
              <Text style={styles.calcRowAmount}>{formatPeso(e.amount)}</Text>
              <TouchableOpacity style={styles.calcRemoveButton} onPress={() => handleRemoveCalcEntry(e.id)}>
                <Text style={styles.calcRemoveButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          <Text style={styles.inputLabel}>Item (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Rice, eggs"
            placeholderTextColor={colors.inkFaint}
            value={calcLabelInput}
            onChangeText={setCalcLabelInput}
          />
          <Text style={styles.inputLabel}>Amount</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor={colors.inkFaint}
            keyboardType="decimal-pad"
            value={calcAmountInput}
            onChangeText={setCalcAmountInput}
          />
          {!!calcErrorMsg && <Text style={styles.errorText}>{calcErrorMsg}</Text>}
          <TouchableOpacity style={styles.saveButton} onPress={handleAddCalcEntry}>
            <Text style={styles.saveButtonText}>Add</Text>
          </TouchableOpacity>

          {calcEntries.length > 0 && (
            <>
              <TouchableOpacity style={styles.addToListButton} onPress={handleAddCalcToList}>
                <Text style={styles.addToListButtonText}>Add all to grocery list</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.clearButton} onPress={handleClearCalc}>
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={closeModal}>
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardWrap}
          >
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>{editingId ? 'Edit item' : 'New item'}</Text>

                <Text style={styles.inputLabel}>Item name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Rice, eggs, dish soap"
                  placeholderTextColor={colors.inkFaint}
                  value={itemNameInput}
                  onChangeText={setItemNameInput}
                />

                <Text style={styles.inputLabel}>Planned amount (budget)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor={colors.inkFaint}
                  keyboardType="decimal-pad"
                  value={plannedInput}
                  onChangeText={setPlannedInput}
                />

                <Text style={styles.inputLabel}>Actual amount</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor={colors.inkFaint}
                  keyboardType="decimal-pad"
                  value={actualInput}
                  onChangeText={setActualInput}
                />

                <TouchableOpacity
                  style={[styles.purchasedToggle, purchasedInput && styles.purchasedToggleActive]}
                  onPress={() => setPurchasedInput((v) => !v)}
                >
                  <Text
                    style={[
                      styles.purchasedToggleText,
                      purchasedInput && styles.purchasedToggleTextActive,
                    ]}
                  >
                    {purchasedInput ? '✓ Marked as bought' : 'Mark as bought'}
                  </Text>
                </TouchableOpacity>

                {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

                <TouchableOpacity style={styles.saveButton} onPress={handleSaveItem}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>

                {editingId && (
                  <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteItem}>
                    <Text style={styles.deleteButtonText}>Delete this item</Text>
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
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.navy2 },
    loadingContainer: { alignItems: 'center', justifyContent: 'center' },
    scrollContent: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 40 },
    pillRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 4,
      backgroundColor: colors.navy2,
    },
    pillButton: {
      flex: 1,
      backgroundColor: colors.navy3,
      borderRadius: 999,
      paddingVertical: 9,
      alignItems: 'center',
    },
    pillButtonActive: { backgroundColor: colors.gold },
    pillButtonText: { fontSize: 11.5, fontWeight: '600', color: colors.inkDim },
    pillButtonTextActive: { color: colors.navy2 },
    balanceBanner: {
      backgroundColor: colors.navy3,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    balanceBannerLabel: { fontSize: 10, letterSpacing: 1, color: colors.inkDim, marginBottom: 4 },
    balanceBannerAmount: { fontSize: 22, fontWeight: '700', color: colors.ink },
    balanceBannerSub: { fontSize: 14, fontWeight: '400', color: colors.inkDim },
    balanceBannerHint: { fontSize: 11, color: colors.inkFaint, marginTop: 6 },
    emptyText: { fontSize: 12, color: colors.inkFaint, marginBottom: 12, fontStyle: 'italic' },
    groceryRow: {
      backgroundColor: colors.navy3,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    groceryRowMain: { flex: 1, marginRight: 10 },
    groceryName: { fontSize: 14, fontWeight: '600', color: colors.ink },
    groceryNamePurchased: { textDecorationLine: 'line-through', color: colors.inkFaint },
    grocerySub: { fontSize: 11.5, color: colors.inkDim, marginTop: 2 },
    purchasedPill: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: colors.navy2,
    },
    purchasedPillActive: { backgroundColor: colors.gold },
    purchasedPillText: { fontSize: 11, fontWeight: '600', color: colors.inkDim },
    purchasedPillTextActive: { color: colors.navy2 },
    addButton: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 4, marginTop: 4 },
    addButtonText: { fontSize: 13, fontWeight: '600', color: colors.gold },
    calcIntro: { fontSize: 12.5, color: colors.inkDim, lineHeight: 18, marginBottom: 18 },
    resultCard: {
      backgroundColor: colors.navy3,
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 16,
      alignItems: 'center',
      marginBottom: 16,
    },
    resultLabel: { fontSize: 10, letterSpacing: 1, color: colors.inkDim, marginBottom: 6 },
    resultAmount: { fontSize: 22, fontWeight: '700', color: colors.ink },
    calcRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.navy3,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
      marginBottom: 8,
      gap: 8,
    },
    calcRowLabel: { flex: 1, fontSize: 13.5, color: colors.ink },
    calcRowAmount: { fontSize: 13.5, color: colors.inkDim, fontWeight: '600' },
    calcRemoveButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.navy2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    calcRemoveButtonText: { fontSize: 13, color: colors.inkDim },
    inputLabel: {
      fontSize: 11,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: colors.inkDim,
      marginBottom: 6,
      marginTop: 6,
    },
    input: {
      backgroundColor: colors.navy3,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.ink,
      marginBottom: 14,
    },
    purchasedToggle: {
      backgroundColor: colors.navy2,
      borderRadius: 999,
      paddingVertical: 10,
      alignItems: 'center',
      marginBottom: 14,
    },
    purchasedToggleActive: { backgroundColor: 'rgba(16,185,129,0.15)' },
    purchasedToggleText: { fontSize: 13, fontWeight: '600', color: colors.inkDim },
    purchasedToggleTextActive: { color: '#10b981' },
    saveButton: {
      backgroundColor: colors.gold,
      borderRadius: 999,
      paddingVertical: 12,
      alignItems: 'center',
      marginBottom: 10,
    },
    saveButtonText: { fontSize: 14, fontWeight: '700', color: colors.navy2 },
    addToListButton: {
      backgroundColor: 'rgba(16,185,129,0.15)',
      borderRadius: 999,
      paddingVertical: 12,
      alignItems: 'center',
      marginBottom: 10,
    },
    addToListButtonText: { fontSize: 13.5, fontWeight: '700', color: '#10b981' },
    clearButton: { alignItems: 'center', paddingVertical: 8, marginBottom: 4 },
    clearButtonText: { fontSize: 13, color: colors.inkDim },
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
    modalKeyboardWrap: { width: '100%', alignItems: 'center', maxHeight: '85%' },
    modalCard: {
      width: '100%',
      maxWidth: 360,
      maxHeight: '100%',
      backgroundColor: colors.navy3,
      borderRadius: 14,
      padding: 20,
    },
    modalTitle: { fontSize: 17, fontWeight: '700', color: colors.ink, marginBottom: 16 },
  });
}
