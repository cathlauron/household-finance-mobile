import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { setAutoLockSuppressed } from '../autoLockSuppress';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { formatPeso } from '../balanceProjection';
import {
  buildTransactionsList,
  sortTransactions,
  transactionTotals,
  TransactionEntry,
} from '../transactions';
import { computeAutoCategory } from '../categorization';
import type { ManualTransaction, HouseholdModel, Person, PaymentMethod } from '../types';
import CsvImportModal from './CsvImportModal';
import PaymentMethodPicker from '../components/PaymentMethodPicker';
import BottomSheet from '../components/BottomSheet';
import { makeId } from '../utils';

function personName(people: Person[], id: string): string {
  const p = people.find((x) => x.id === id);
  return p ? p.name : '';
}

// Finds an existing person by name (case-insensitive), or creates a new one.
// Mirrors IncomeScreen's behavior: typing a name that doesn't exist yet quietly
// adds that person, rather than requiring a separate "add a person" step.
function findOrCreatePerson(
  people: Person[],
  typedName: string
): { people: Person[]; personId: string } {
  const trimmed = typedName.trim();
  if (!trimmed) return { people, personId: '' };
  const existing = people.find((p) => p.name.trim().toLowerCase() === trimmed.toLowerCase());
  if (existing) return { people, personId: existing.id };
  const newPerson: Person = {
    id: makeId('person'),
    name: trimmed,
    role: people.length === 0 ? 'primary' : 'partner',
  };
  return { people: [...people, newPerson], personId: newPerson.id };
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function todayISO(): string {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

const SOURCE_LABELS: Record<string, string> = { bill: 'Bill', debt: 'Debt', loan: 'Loan', manual: 'Manual' };
const DIRECTIONS: Array<'out' | 'in' | 'saving'> = ['out', 'in', 'saving'];
const DIRECTION_LABELS: Record<string, string> = { out: 'Money out', in: 'Money in', saving: 'Savings' };

function amountColor(direction: string): string {
  if (direction === 'in') return '#2f9e44';
  if (direction === 'saving') return '#c2410c';
  return '#e5484d';
}

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const { model, saveModel } = useData();
  const styles = makeStyles(colors);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [directionInput, setDirectionInput] = useState<'out' | 'in' | 'saving'>('out');
  const [receiptPhoto, setReceiptPhoto] = useState<string | null>(null);
  const [personInput, setPersonInput] = useState('');
  const [paymentMethodInput, setPaymentMethodInput] = useState<PaymentMethod | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState('');
  const [csvModalOpen, setCsvModalOpen] = useState(false);

  const transactions = useMemo(() => {
    if (!model) return [];
    return sortTransactions(buildTransactionsList(model), sortOrder);
  }, [model, sortOrder]);

  const totals = useMemo(() => transactionTotals(transactions), [transactions]);

  if (!model) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  function resetForm() {
    setLabelInput('');
    setCategoryInput('');
    setAmountInput('');
    setDateInput(todayISO());
    setDirectionInput('out');
    setReceiptPhoto(null);
    setPersonInput('');
    setPaymentMethodInput(undefined);
    setErrorMsg('');
  }

  function openAddModal() {
    setEditingId(null);
    resetForm();
    setModalOpen(true);
  }

  function openEditModal(t: TransactionEntry) {
    if (t.source !== 'manual' || !t.rawId) return;
    const raw = (model?.manualTransactions || []).find((m) => m.id === t.rawId);
    if (!raw) return;
    setEditingId(raw.id);
    setLabelInput(raw.label || '');
    setCategoryInput(raw.category || '');
    setPersonInput(personName(model?.people || [], raw.owner || ''));
    setAmountInput(typeof raw.amount === 'number' ? String(raw.amount) : '');
    setDateInput(raw.date || todayISO());
    setDirectionInput((raw.direction as 'out' | 'in' | 'saving') || 'out');
    setReceiptPhoto(raw.receiptPhoto || null);
    setPaymentMethodInput(raw.paymentMethod);
    setErrorMsg('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setErrorMsg('');
  }

  // ---- Categorization Rules auto-fill ----
  // Only fills the category in when it's still empty, so this never overwrites a category
  // the person already typed by hand. Amount-based rules need the amount too, so both the
  // label and amount fields trigger this — each reading whatever's currently in the other.
  function handleLabelChange(text: string) {
    setLabelInput(text);
    if (!model || categoryInput.trim()) return;
    const amt = parseFloat(amountInput);
    const auto = computeAutoCategory(model, text, amt);
    if (auto) setCategoryInput(auto);
  }

  function handleAmountChange(text: string) {
    setAmountInput(text);
    if (!model || categoryInput.trim()) return;
    const amt = parseFloat(text);
    const auto = computeAutoCategory(model, labelInput, amt);
    if (auto) setCategoryInput(auto);
  }

  async function handlePickReceipt() {
    setAutoLockSuppressed(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission needed',
          'Allow photo library access in your phone settings to attach a receipt.'
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.5,
        base64: true,
      });
      if (result.canceled || !result.assets || !result.assets[0]) return;
      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert("Couldn't read that photo", 'Try picking a different one.');
        return;
      }
      const mime = asset.mimeType || 'image/jpeg';
      setReceiptPhoto(`data:${mime};base64,${asset.base64}`);
    } finally {
      setAutoLockSuppressed(false);
    }
  }

  function handleRemoveReceipt() {
    setReceiptPhoto(null);
  }

  async function handleSave() {
    if (!model) return;
    const trimmedLabel = labelInput.trim();
    if (!trimmedLabel) {
      setErrorMsg('Enter a label for this transaction.');
      return;
    }
    const trimmedDate = dateInput.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
      setErrorMsg('Enter the date as YYYY-MM-DD, e.g. 2025-03-15.');
      return;
    }
    const parsedAmount = parseFloat(amountInput);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Enter an amount greater than 0.');
      return;
    }

    const { people: peopleWithPerson, personId } = findOrCreatePerson(model.people, personInput);

    const updated: HouseholdModel = {
      ...model,
      people: peopleWithPerson,
      manualTransactions: [...(model.manualTransactions || [])],
    };

    if (editingId) {
      updated.manualTransactions = updated.manualTransactions.map((t) => {
        if (t.id !== editingId) return t;
        const next: ManualTransaction = {
          ...t,
          date: trimmedDate,
          label: trimmedLabel,
          amount: parsedAmount,
          direction: directionInput,
          owner: personId || 'shared',
          category: categoryInput.trim(),
          paymentMethod: paymentMethodInput,
        };
        if (receiptPhoto) {
          next.receiptPhoto = receiptPhoto;
        } else {
          delete next.receiptPhoto;
        }
        return next;
      });
    } else {
      const newTxn: ManualTransaction = {
        id: makeId('txn'),
        date: trimmedDate,
        label: trimmedLabel,
        amount: parsedAmount,
        direction: directionInput,
        owner: personId || 'shared',
        category: categoryInput.trim(),
        paymentMethod: paymentMethodInput,
        ...(receiptPhoto ? { receiptPhoto } : {}),
      };
      updated.manualTransactions = [...updated.manualTransactions, newTxn];
    }

    await saveModel(updated);
    closeModal();
  }

  async function handleDelete() {
    if (!editingId || !model) return;
    const updated: HouseholdModel = {
      ...model,
      manualTransactions: (model.manualTransactions || []).filter((t) => t.id !== editingId),
    };
    await saveModel(updated);
    closeModal();
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>TOTAL IN</Text>
            <Text style={[styles.statAmount, { color: '#2f9e44' }]}>{formatPeso(totals.totalIn)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>TOTAL OUT</Text>
            <Text style={[styles.statAmount, { color: '#e5484d' }]}>{formatPeso(totals.totalOut)}</Text>
          </View>
        </View>
        {totals.totalSaving > 0 && (
          <View style={styles.statRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>SAVED</Text>
              <Text style={[styles.statAmount, { color: '#c2410c' }]}>{formatPeso(totals.totalSaving)}</Text>
            </View>
          </View>
        )}
        <View style={styles.netBanner}>
          <Text style={styles.netLabel}>NET (CASH IN HAND)</Text>
          <Text style={styles.netAmount}>{formatPeso(totals.net)}</Text>
        </View>

        <View style={styles.pillRow}>
          <TouchableOpacity
            style={[styles.pillButton, sortOrder === 'newest' && styles.pillButtonActive]}
            onPress={() => setSortOrder('newest')}
          >
            <Text style={[styles.pillButtonText, sortOrder === 'newest' && styles.pillButtonTextActive]}>
              Newest first
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pillButton, sortOrder === 'oldest' && styles.pillButtonActive]}
            onPress={() => setSortOrder('oldest')}
          >
            <Text style={[styles.pillButtonText, sortOrder === 'oldest' && styles.pillButtonTextActive]}>
              Oldest first
            </Text>
          </TouchableOpacity>
        </View>

        {transactions.length === 0 && (
          <Text style={styles.emptyText}>
            Nothing recorded yet. Add one below, or mark a bill/debt/loan as paid elsewhere in the app.
          </Text>
        )}

        {transactions.map((t: TransactionEntry) => {
          const isManual = t.source === 'manual';
          return (
            <TouchableOpacity
              key={t.id}
              style={styles.txnRow}
              activeOpacity={isManual ? 0.7 : 1}
              onPress={() => openEditModal(t)}
              disabled={!isManual}
            >
              <View style={styles.txnMain}>
                <Text style={styles.txnLabel} numberOfLines={1}>{t.label}</Text>
                <Text style={styles.txnSub} numberOfLines={1}>
                  {t.category} · {formatDateLabel(t.date)} · {SOURCE_LABELS[t.source]}
                  {!isManual ? ' (edit on its own tab)' : ''}
                </Text>
              </View>
              <Text style={[styles.txnAmount, { color: amountColor(t.direction) }]}>
                {t.direction === 'in' ? '+' : t.direction === 'saving' ? '↳ ' : '−'}{formatPeso(t.amount)}
              </Text>
            </TouchableOpacity>
          );
        })}

        <View style={styles.addButtonRow}>
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Text style={styles.addButtonText}>+ Add transaction</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.importButton} onPress={() => setCsvModalOpen(true)}>
            <Text style={styles.importButtonText}>Import CSV</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <CsvImportModal visible={csvModalOpen} onClose={() => setCsvModalOpen(false)} />

      <BottomSheet
        visible={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Edit transaction' : 'New transaction'}
      >
                <Text style={styles.inputLabel}>Label</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Coffee, Cash gift, Market run"
                  placeholderTextColor={colors.inkFaint}
                  value={labelInput}
                  onChangeText={handleLabelChange}
                />

                <Text style={styles.inputLabel}>Type</Text>
                <View style={styles.pillRow}>
                  {DIRECTIONS.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[styles.pillButton, directionInput === d && styles.pillButtonActive]}
                      onPress={() => setDirectionInput(d)}
                    >
                      <Text style={[styles.pillButtonText, directionInput === d && styles.pillButtonTextActive]}>
                        {DIRECTION_LABELS[d]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Amount</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor={colors.inkFaint}
                  keyboardType="decimal-pad"
                  value={amountInput}
                  onChangeText={handleAmountChange}
                />

                <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2025-03-15"
                  placeholderTextColor={colors.inkFaint}
                  value={dateInput}
                  onChangeText={setDateInput}
                />

                <Text style={styles.inputLabel}>Belongs to</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Type a name, e.g. Miguel, Ana"
                  placeholderTextColor={colors.inkFaint}
                  value={personInput}
                  onChangeText={setPersonInput}
                />
                {model.people.length > 0 && (
                  <View style={styles.chipRow}>
                    {model.people.map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        style={styles.chip}
                        onPress={() => setPersonInput(p.name)}
                      >
                        <Text style={styles.chipText}>{p.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Text style={styles.inputLabel}>Category (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Groceries, Transportation"
                  placeholderTextColor={colors.inkFaint}
                  value={categoryInput}
                  onChangeText={setCategoryInput}
                />

                <PaymentMethodPicker
                  value={paymentMethodInput}
                  onChange={setPaymentMethodInput}
                  debitAccounts={model.balanceAccounts.debit}
                  creditAccounts={model.balanceAccounts.credit}
                />

                <Text style={styles.inputLabel}>Receipt photo (optional)</Text>
                {receiptPhoto ? (
                  <View style={styles.receiptPreviewWrap}>
                    <Image source={{ uri: receiptPhoto }} style={styles.receiptThumb} />
                    <TouchableOpacity style={styles.receiptRemoveButton} onPress={handleRemoveReceipt}>
                      <Text style={styles.receiptRemoveButtonText}>Remove photo</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.receiptPickButton} onPress={handlePickReceipt}>
                    <Text style={styles.receiptPickButtonText}>📎 Attach a receipt photo</Text>
                  </TouchableOpacity>
                )}

                {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.saveButtonText}>{editingId ? 'Save changes' : 'Add transaction'}</Text>
                </TouchableOpacity>

                {editingId && (
                  <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                    <Text style={styles.deleteButtonText}>Delete this transaction</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
      </BottomSheet>
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.navy2 },
    loadingContainer: { alignItems: 'center', justifyContent: 'center' },
    scrollContent: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 40 },
    statRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    statCard: {
      flex: 1,
      backgroundColor: colors.navy3,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 14,
    },
    statLabel: { fontSize: 10, letterSpacing: 1, color: colors.inkDim, marginBottom: 4 },
    statAmount: { fontSize: 17, fontWeight: '700' },
    netBanner: {
      backgroundColor: colors.navy3,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginBottom: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    netLabel: { fontSize: 10, letterSpacing: 1, color: colors.inkDim },
    netAmount: { fontSize: 20, fontWeight: '700', color: colors.ink },
    pillRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
    pillButton: {
      flex: 1,
      minWidth: 80,
      backgroundColor: colors.navy3,
      borderRadius: 999,
      paddingVertical: 9,
      alignItems: 'center',
    },
    pillButtonActive: { backgroundColor: colors.gold },
    pillButtonText: { fontSize: 12, fontWeight: '600', color: colors.inkDim },
    pillButtonTextActive: { color: colors.navy2 },
    emptyText: { fontSize: 12, color: colors.inkFaint, fontStyle: 'italic', marginTop: 6, marginBottom: 12 },
    txnRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.navy3,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 8,
    },
    txnMain: { flex: 1, marginRight: 10 },
    txnLabel: { fontSize: 13.5, fontWeight: '600', color: colors.ink },
    txnSub: { fontSize: 11, color: colors.inkFaint, marginTop: 2 },
    txnAmount: { fontSize: 13.5, fontWeight: '700' },
    addButtonRow: { flexDirection: 'row', gap: 16, marginTop: 4, flexWrap: 'wrap' },
    addButton: { paddingVertical: 8, paddingHorizontal: 4 },
    addButtonText: { fontSize: 13, fontWeight: '600', color: colors.gold },
    importButton: { paddingVertical: 8, paddingHorizontal: 4 },
    importButtonText: { fontSize: 13, fontWeight: '600', color: colors.inkDim },
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
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
    chip: {
      backgroundColor: colors.navy2,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    chipText: { fontSize: 12.5, color: colors.ink, fontWeight: '600' },
    receiptPickButton: {
      backgroundColor: colors.navy2,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
      marginBottom: 14,
    },
    receiptPickButtonText: { fontSize: 13.5, fontWeight: '600', color: colors.gold },
    receiptPreviewWrap: { marginBottom: 14 },
    receiptThumb: {
      width: '100%',
      height: 140,
      borderRadius: 8,
      backgroundColor: colors.navy2,
      marginBottom: 8,
    },
    receiptRemoveButton: { alignSelf: 'flex-start' },
    receiptRemoveButtonText: { fontSize: 12, color: '#e5484d', fontWeight: '600' },
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