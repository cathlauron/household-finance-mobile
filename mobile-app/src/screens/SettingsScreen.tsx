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
} from 'react-native';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { formatPeso } from '../balanceProjection';
import type { Category, Payee, CategorizationRule, HouseholdModel } from '../types';

function makeId(prefix: string): string {
  return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

// A small fixed palette to pick from — mirrors the set of colors the original web app
// auto-assigns to new categories, just offered as tappable swatches here instead ofa
// native color picker (React Native has no built-in one).
const COLOR_PALETTE = [
  '#E76F51', '#2A9D8F', '#264653', '#E9C46A', '#F4A261',
  '#6D28D9', '#2563EB', '#EA580C', '#059669', '#DC2626',
  '#9333EA', '#0891B2', '#D97706', '#DB2777', '#78716C',
];

function amountRangeLabel(rule: CategorizationRule): string {
  const min = rule.amountMin === '' || rule.amountMin === undefined ? null : Number(rule.amountMin);
  const max = rule.amountMax === '' || rule.amountMax === undefined ? null : Number(rule.amountMax);
  if (min !== null && max !== null) return `${formatPeso(min)}–${formatPeso(max)}`;
  if (min !== null) return `${formatPeso(min)} or more`;
  if (max !== null) return `Up to ${formatPeso(max)}`;
  return '';
}

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { model, saveModel } = useData();
  const styles = makeStyles(colors);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [colorInput, setColorInput] = useState(COLOR_PALETTE[0]);
  const [errorMsg, setErrorMsg] = useState('');
  const [notifyDaysInput, setNotifyDaysInput] = useState(
    String(model?.settings?.notifyDaysBefore ?? 3)
  );

  // ---- Merchants & Payees ----
  const [payeeModalOpen, setPayeeModalOpen] = useState(false);
  const [editingPayeeId, setEditingPayeeId] = useState<string | null>(null);
  const [payeeNameInput, setPayeeNameInput] = useState('');
  const [payeeCategoryInput, setPayeeCategoryInput] = useState('');
  const [payeeErrorMsg, setPayeeErrorMsg] = useState('');

  // ---- Categorization Rules ----
  // Same tap-row-to-edit pattern as Categories/Payees above, plus up/down reorder arrows
  // since rules are checked in order and the first match wins — reordering genuinely
  // changes behavior, unlike the alphabetical Categories/Payees lists.
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleContainsInput, setRuleContainsInput] = useState('');
  const [ruleMinInput, setRuleMinInput] = useState('');
  const [ruleMaxInput, setRuleMaxInput] = useState('');
  const [ruleCategoryInput, setRuleCategoryInput] = useState('');
  const [ruleErrorMsg, setRuleErrorMsg] = useState('');

  if (!model) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  const categories = [...model.categories].sort((a, b) => a.name.localeCompare(b.name));
  const payees = [...(model.payees ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  const rules = model.categorizationRules ?? []; // NOT sorted — array order is match order

  function openAddModal() {
    setEditingId(null);
    setNameInput('');
    setColorInput(COLOR_PALETTE[model!.categories.length % COLOR_PALETTE.length]);
    setErrorMsg('');
    setModalOpen(true);
  }

  function openEditModal(cat: Category) {
    setEditingId(cat.id);
    setNameInput(cat.name);
    setColorInput(cat.color);
    setErrorMsg('');
    setModalOpen(true);
  }

  async function saveNotifyDays() {
    if (!model) return;
    const n = parseInt(notifyDaysInput, 10);
    const value = isNaN(n) || n < 0 ? 0 : n;
    setNotifyDaysInput(String(value));
    const updated: HouseholdModel = {
      ...model,
      settings: { ...model.settings, notifyDaysBefore: value },
    };
    await saveModel(updated);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setErrorMsg('');
  }

  async function handleSave() {
    if (!model) return;
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setErrorMsg('Give the category a name.');
      return;
    }
    const duplicate = model.categories.find(
      (c) => c.id !== editingId && c.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setErrorMsg('You already have a category with that name.');
      return;
    }

    let updatedCategories: Category[];
    if (editingId) {
      updatedCategories = model.categories.map((c) =>
        c.id === editingId ? { ...c, name: trimmed, color: colorInput } : c
      );
    } else {
      const newCat: Category = {
        id: makeId('cat'),
        name: trimmed,
        color: colorInput,
        parentId: null,
      };
      updatedCategories = [...model.categories, newCat];
    }

    const updated: HouseholdModel = { ...model, categories: updatedCategories };
    await saveModel(updated);
    closeModal();
  }

  async function handleDelete() {
    if (!editingId || !model) return;
    const updated: HouseholdModel = {
      ...model,
      categories: model.categories.filter((c) => c.id !== editingId),
    };
    await saveModel(updated);
    closeModal();
  }

  // ---- Merchants & Payees handlers ----
  function openAddPayeeModal() {
    setEditingPayeeId(null);
    setPayeeNameInput('');
    setPayeeCategoryInput('');
    setPayeeErrorMsg('');
    setPayeeModalOpen(true);
  }

  function openEditPayeeModal(payee: Payee) {
    setEditingPayeeId(payee.id);
    setPayeeNameInput(payee.name);
    setPayeeCategoryInput(payee.defaultCategory ?? '');
    setPayeeErrorMsg('');
    setPayeeModalOpen(true);
  }

  function closePayeeModal() {
    setPayeeModalOpen(false);
    setEditingPayeeId(null);
    setPayeeErrorMsg('');
  }

  async function handleSavePayee() {
    if (!model) return;
    const trimmed = payeeNameInput.trim();
    if (!trimmed) {
      setPayeeErrorMsg('Give the merchant or payee a name.');
      return;
    }
    const existing = model.payees ?? [];
    const duplicate = existing.find(
      (p) => p.id !== editingPayeeId && p.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setPayeeErrorMsg('You already have a payee with that name.');
      return;
    }

    let updatedPayees: Payee[];
    if (editingPayeeId) {
      updatedPayees = existing.map((p) =>
        p.id === editingPayeeId
          ? { ...p, name: trimmed, defaultCategory: payeeCategoryInput.trim() }
          : p
      );
    } else {
      const newPayee: Payee = {
        id: makeId('payee'),
        name: trimmed,
        defaultCategory: payeeCategoryInput.trim(),
      };
      updatedPayees = [...existing, newPayee];
    }

    const updated: HouseholdModel = { ...model, payees: updatedPayees };
    await saveModel(updated);
    closePayeeModal();
  }

  async function handleDeletePayee() {
    if (!editingPayeeId || !model) return;
    const updated: HouseholdModel = {
      ...model,
      payees: (model.payees ?? []).filter((p) => p.id !== editingPayeeId),
    };
    await saveModel(updated);
    closePayeeModal();
  }

  // ---- Categorization Rules handlers ----
  function openAddRuleModal() {
    setEditingRuleId(null);
    setRuleContainsInput('');
    setRuleMinInput('');
    setRuleMaxInput('');
    setRuleCategoryInput('');
    setRuleErrorMsg('');
    setRuleModalOpen(true);
  }

  function openEditRuleModal(rule: CategorizationRule) {
    setEditingRuleId(rule.id);
    setRuleContainsInput(rule.labelContains);
    setRuleMinInput(rule.amountMin === '' || rule.amountMin === undefined ? '' : String(rule.amountMin));
    setRuleMaxInput(rule.amountMax === '' || rule.amountMax === undefined ? '' : String(rule.amountMax));
    setRuleCategoryInput(rule.category);
    setRuleErrorMsg('');
    setRuleModalOpen(true);
  }

  function closeRuleModal() {
    setRuleModalOpen(false);
    setEditingRuleId(null);
    setRuleErrorMsg('');
  }

  async function handleSaveRule() {
    if (!model) return;
    const trimmedContains = ruleContainsInput.trim();
    const trimmedCategory = ruleCategoryInput.trim();
    if (!trimmedContains) {
      setRuleErrorMsg('Enter text to match in the label.');
      return;
    }
    if (!trimmedCategory) {
      setRuleErrorMsg('Choose a category to set when this rule matches.');
      return;
    }
    const minVal: number | '' = ruleMinInput.trim() === '' ? '' : parseFloat(ruleMinInput);
    const maxVal: number | '' = ruleMaxInput.trim() === '' ? '' : parseFloat(ruleMaxInput);
    if (minVal !== '' && isNaN(minVal)) {
      setRuleErrorMsg('Minimum amount must be a number.');
      return;
    }
    if (maxVal !== '' && isNaN(maxVal)) {
      setRuleErrorMsg('Maximum amount must be a number.');
      return;
    }
    if (minVal !== '' && maxVal !== '' && minVal > maxVal) {
      setRuleErrorMsg('Minimum amount must be less than maximum.');
      return;
    }

    const existing = model.categorizationRules ?? [];
    let updatedRules: CategorizationRule[];
    if (editingRuleId) {
      updatedRules = existing.map((r) =>
        r.id === editingRuleId
          ? {
              ...r,
              labelContains: trimmedContains,
              amountMin: minVal,
              amountMax: maxVal,
              category: trimmedCategory,
            }
          : r
      );
    } else {
      const newRule: CategorizationRule = {
        id: makeId('catrule'),
        labelContains: trimmedContains,
        amountMin: minVal,
        amountMax: maxVal,
        category: trimmedCategory,
      };
      updatedRules = [...existing, newRule];
    }

    const updated: HouseholdModel = { ...model, categorizationRules: updatedRules };
    await saveModel(updated);
    closeRuleModal();
  }

  async function handleDeleteRule() {
    if (!editingRuleId || !model) return;
    const updated: HouseholdModel = {
      ...model,
      categorizationRules: (model.categorizationRules ?? []).filter((r) => r.id !== editingRuleId),
    };
    await saveModel(updated);
    closeRuleModal();
  }

  async function moveRule(id: string, direction: 'up' | 'down') {
    if (!model) return;
    const list = [...(model.categorizationRules ?? [])];
    const idx = list.findIndex((r) => r.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (idx === -1 || swapIdx < 0 || swapIdx >= list.length) return;
    const tmp = list[idx];
    list[idx] = list[swapIdx];
    list[swapIdx] = tmp;
    const updated: HouseholdModel = { ...model, categorizationRules: list };
    await saveModel(updated);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <Text style={styles.sectionSub}>
          How many days before something's due should it count as "due soon"?
        </Text>
        <View style={styles.row}>
          <Text style={styles.rowName}>Alert me</Text>
          <TextInput
            style={styles.notifyInput}
            value={notifyDaysInput}
            onChangeText={setNotifyDaysInput}
            onBlur={saveNotifyDays}
            keyboardType="number-pad"
            maxLength={2}
          />
          <Text style={styles.rowName}>day(s) before due</Text>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Categories</Text>
        <Text style={styles.sectionSub}>
          Manage the category names and colors used across Bills, Debts, and Transactions.
        </Text>

        {categories.length === 0 && (
          <Text style={styles.emptyText}>No categories yet. Add your first one below.</Text>
        )}

        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => openEditModal(cat)}
          >
            <View style={[styles.colorDot, { backgroundColor: cat.color }]} />
            <Text style={styles.rowName} numberOfLines={1}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>+ Add category</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Merchants &amp; Payees</Text>
        <Text style={styles.sectionSub}>
          Save names you use often so they're quicker to enter on transactions. Set a default
          category and it'll auto-fill whenever you type that exact name on a new transaction.
        </Text>

        {payees.length === 0 && (
          <Text style={styles.emptyText}>No payees yet. Add your first one below.</Text>
        )}

        {payees.map((payee) => (
          <TouchableOpacity
            key={payee.id}
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => openEditPayeeModal(payee)}
          >
            <Text style={styles.rowName} numberOfLines={1}>
              {payee.name}
            </Text>
            {!!payee.defaultCategory && (
              <Text style={styles.rowSubText} numberOfLines={1}>
                {payee.defaultCategory}
              </Text>
            )}
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.addButton} onPress={openAddPayeeModal}>
          <Text style={styles.addButtonText}>+ Add payee</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Categorization Rules</Text>
        <Text style={styles.sectionSub}>
          Auto-fill a category when a transaction's label contains some text, optionally
          within an amount range. Checked top to bottom — the first matching rule wins, and
          a saved payee's own default category above always takes priority over these.
        </Text>

        {rules.length === 0 && (
          <Text style={styles.emptyText}>No rules yet. Add your first one below.</Text>
        )}

        {rules.map((rule, idx) => (
          <View key={rule.id} style={styles.ruleRow}>
            <View style={styles.reorderCol}>
              <TouchableOpacity
                onPress={() => moveRule(rule.id, 'up')}
                disabled={idx === 0}
                style={styles.reorderBtn}
              >
                <Text style={[styles.reorderBtnText, idx === 0 && styles.reorderBtnDisabled]}>▲</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => moveRule(rule.id, 'down')}
                disabled={idx === rules.length - 1}
                style={styles.reorderBtn}
              >
                <Text
                  style={[
                    styles.reorderBtnText,
                    idx === rules.length - 1 && styles.reorderBtnDisabled,
                  ]}
                >
                  ▼
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.ruleRowMain}
              activeOpacity={0.7}
              onPress={() => openEditRuleModal(rule)}
            >
              <Text style={styles.rowName} numberOfLines={1}>
                "{rule.labelContains}" → {rule.category}
              </Text>
              {!!amountRangeLabel(rule) && (
                <Text style={styles.rowSubText} numberOfLines={1}>
                  {amountRangeLabel(rule)}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.addButton} onPress={openAddRuleModal}>
          <Text style={styles.addButtonText}>+ Add rule</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={closeModal}>
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{editingId ? 'Edit category' : 'New category'}</Text>

            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Groceries, Utilities"
              placeholderTextColor={colors.inkFaint}
              value={nameInput}
              onChangeText={setNameInput}
            />

            <Text style={styles.inputLabel}>Color</Text>
            <View style={styles.swatchRow}>
              {COLOR_PALETTE.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.swatch,
                    { backgroundColor: c },
                    colorInput === c && styles.swatchActive,
                  ]}
                  onPress={() => setColorInput(c)}
                />
              ))}
            </View>

            {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>

            {editingId && (
              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <Text style={styles.deleteButtonText}>Delete this category</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={payeeModalOpen}
        transparent
        animationType="fade"
        onRequestClose={closePayeeModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closePayeeModal}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>
              {editingPayeeId ? 'Edit payee' : 'New payee'}
            </Text>

            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. SM Supermarket, Meralco"
              placeholderTextColor={colors.inkFaint}
              value={payeeNameInput}
              onChangeText={setPayeeNameInput}
            />

            <Text style={styles.inputLabel}>Default category (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Groceries, Utilities"
              placeholderTextColor={colors.inkFaint}
              value={payeeCategoryInput}
              onChangeText={setPayeeCategoryInput}
            />

            {!!payeeErrorMsg && <Text style={styles.errorText}>{payeeErrorMsg}</Text>}

            <TouchableOpacity style={styles.saveButton} onPress={handleSavePayee}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>

            {editingPayeeId && (
              <TouchableOpacity style={styles.deleteButton} onPress={handleDeletePayee}>
                <Text style={styles.deleteButtonText}>Delete this payee</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.cancelButton} onPress={closePayeeModal}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={ruleModalOpen}
        transparent
        animationType="fade"
        onRequestClose={closeRuleModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeRuleModal}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{editingRuleId ? 'Edit rule' : 'New rule'}</Text>

            <Text style={styles.inputLabel}>If the label contains</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. jollibee, meralco, grab"
              placeholderTextColor={colors.inkFaint}
              value={ruleContainsInput}
              onChangeText={setRuleContainsInput}
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Minimum amount (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="No minimum"
              placeholderTextColor={colors.inkFaint}
              keyboardType="decimal-pad"
              value={ruleMinInput}
              onChangeText={setRuleMinInput}
            />

            <Text style={styles.inputLabel}>Maximum amount (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="No maximum"
              placeholderTextColor={colors.inkFaint}
              keyboardType="decimal-pad"
              value={ruleMaxInput}
              onChangeText={setRuleMaxInput}
            />

            <Text style={styles.inputLabel}>Set category to</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Groceries, Utilities"
              placeholderTextColor={colors.inkFaint}
              value={ruleCategoryInput}
              onChangeText={setRuleCategoryInput}
            />

            {!!ruleErrorMsg && <Text style={styles.errorText}>{ruleErrorMsg}</Text>}

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveRule}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>

            {editingRuleId && (
              <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteRule}>
                <Text style={styles.deleteButtonText}>Delete this rule</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.cancelButton} onPress={closeRuleModal}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
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
    sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.ink, marginBottom: 4 },
    sectionSub: { fontSize: 12.5, color: colors.inkDim, marginBottom: 16, lineHeight: 17 },
    emptyText: { fontSize: 12, color: colors.inkFaint, marginBottom: 12, fontStyle: 'italic' },
    row: {
      backgroundColor: colors.navy3,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    colorDot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
    notifyInput: {
      borderWidth: 1,
      borderColor: colors.navy2,
      borderRadius: 8,
      paddingVertical: 4,
      paddingHorizontal: 10,
      marginHorizontal: 8,
      minWidth: 40,
      textAlign: 'center',
      fontSize: 14,
      color: colors.ink,
    },
    rowName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.ink },
    rowSubText: {
      fontSize: 12,
      color: colors.inkDim,
      marginLeft: 8,
      flexShrink: 1,
      textAlign: 'right',
    },
    addButton: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 4, marginTop: 4 },
    addButtonText: { fontSize: 13, fontWeight: '600', color: colors.gold },
    ruleRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      backgroundColor: colors.navy3,
      borderRadius: 10,
      marginBottom: 8,
      overflow: 'hidden',
    },
    reorderCol: {
      justifyContent: 'center',
      paddingHorizontal: 4,
      backgroundColor: colors.navy2,
    },
    reorderBtn: { paddingVertical: 4, paddingHorizontal: 6 },
    reorderBtnText: { fontSize: 11, color: colors.inkDim },
    reorderBtnDisabled: { opacity: 0.3 },
    ruleRowMain: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 14,
      justifyContent: 'center',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    modalCard: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: colors.navy3,
      borderRadius: 14,
      padding: 20,
    },
    modalTitle: { fontSize: 17, fontWeight: '700', color: colors.ink, marginBottom: 16 },
    inputLabel: {
      fontSize: 11,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: colors.inkDim,
      marginBottom: 6,
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
    swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    swatch: { width: 30, height: 30, borderRadius: 15 },
    swatchActive: { borderWidth: 3, borderColor: colors.ink },
    errorText: { fontSize: 12, color: '#e5484d', marginBottom: 10 },
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
  });
}