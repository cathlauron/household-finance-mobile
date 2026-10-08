import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from '../components/BottomSheet';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { useRefresh } from '../useRefresh';
import { PullToRefreshScrollView } from '../PullToRefreshScrollView';
import { formatPeso } from '../balanceProjection';
import {
  Frequency,
  FREQUENCIES,
  DOW_LABELS,
  frequencyLabel,
  computeNextPayDate,
  formatShortDate,
} from '../income';
import type { IncomeSource, Person, HouseholdModel, PaymentLogEntry } from '../types';
import CollapsibleRow from '../components/CollapsibleRow';
import SwipeableRow from '../components/SwipeableRow';
import { makeId } from '../utils';
import DateField from '../components/DateField';
import Pill from '../components/Pill';
import Button from '../components/Button';
import Card from '../components/Card';
import AmountInput from '../components/AmountInput';

// Local editing shape for one payment-log row in the modal — amount is kept as
// raw text while typing (not a number) so a half-typed value like "1500."
// doesn't get mangled, and is only parsed/validated on Save.
type PaymentLogFormEntry = { id: string; date: string; amount: number | '' };

const CATEGORY_SUGGESTIONS = ['Salary', 'Freelance / Side gig', 'Business income', 'Rental income', 'Other'];

function personName(people: Person[], id: string): string {
  const p = people.find((x) => x.id === id);
  return p ? p.name : '';
}

// Finds an existing person by name (case-insensitive), or creates a new one.
// Mirrors the web app's behavior: typing a name that doesn't exist yet quietly
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

function sortByNextPayDate(sources: IncomeSource[]): IncomeSource[] {
  return [...sources].sort((a, b) => {
    const da = computeNextPayDate(a.frequency as Frequency, a.payDates || []);
    const db = computeNextPayDate(b.frequency as Frequency, b.payDates || []);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da.getTime() - db.getTime();
  });
}

type IncomeScreenProps = {
  openIncomeId?: string;
  openIncomeNonce?: number;
};

export default function IncomeScreen({ openIncomeId, openIncomeNonce }: IncomeScreenProps = {}) {
  const { colors } = useTheme();
  const { model, saveModel } = useData();
  const { refreshing, onRefresh } = useRefresh();

  const openedIncomeRef = useRef<{ id: string; nonce?: number } | undefined>(undefined);
  useEffect(() => {
    if (!model || !openIncomeId) return;
    const prev = openedIncomeRef.current;
    if (prev && prev.id === openIncomeId && prev.nonce === openIncomeNonce) return;
    const target = (model.income || []).find((s) => s.id === openIncomeId);
    if (target) {
      openedIncomeRef.current = { id: openIncomeId, nonce: openIncomeNonce };
      openEditModal(target);
    }
  }, [model, openIncomeId, openIncomeNonce]);
  const styles = makeStyles(colors);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [personInput, setPersonInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [sourceNameInput, setSourceNameInput] = useState('');
  const [amountInput, setAmountInput] = useState<number | ''>('');
  const [frequencyInput, setFrequencyInput] = useState<Frequency>('monthly');
  const [monthlyDayInput, setMonthlyDayInput] = useState('');
  const [semiDay1Input, setSemiDay1Input] = useState('');
  const [semiDay2Input, setSemiDay2Input] = useState('');
  const [weeklyDowInput, setWeeklyDowInput] = useState<number | null>(null);
  const [biweeklyAnchorInput, setBiweeklyAnchorInput] = useState('');
  const [onetimeDateInput, setOnetimeDateInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [paymentLogEntries, setPaymentLogEntries] = useState<PaymentLogFormEntry[]>([]);
  const [expandedIncomeId, setExpandedIncomeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!model) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  function resetForm() {
    setPersonInput('');
    setCategoryInput('');
    setSourceNameInput('');
    setAmountInput('');
    setFrequencyInput('monthly');
    setMonthlyDayInput('');
    setSemiDay1Input('');
    setSemiDay2Input('');
    setWeeklyDowInput(null);
    setBiweeklyAnchorInput('');
    setErrorMsg('');
    setPaymentLogEntries([]);
  }

  function openAddModal() {
    setEditingId(null);
    resetForm();
    setModalOpen(true);
  }

  function openEditModal(source: IncomeSource) {
    setEditingId(source.id);
    setPersonInput(personName(model!.people, source.personId));
    setCategoryInput(source.category || '');
    setSourceNameInput(source.sourceName || '');
    setAmountInput(
      typeof source.expectedAmount === 'number' ? source.expectedAmount : ''
    );
    const freq = (source.frequency as Frequency) || 'monthly';
    setFrequencyInput(freq);
    const pd = source.payDates || [];
    setMonthlyDayInput(freq === 'monthly' ? pd[0] || '' : '');
    setSemiDay1Input(freq === 'semimonthly' ? pd[0] || '' : '');
    setSemiDay2Input(freq === 'semimonthly' ? pd[1] || '' : '');
    setWeeklyDowInput(freq === 'weekly' && pd[0] !== undefined ? parseInt(pd[0], 10) : null);
    setBiweeklyAnchorInput(freq === 'biweekly' ? pd[0] || '' : '');
    setOnetimeDateInput(freq === 'onetime' ? pd[0] || '' : '');
    setPaymentLogEntries(
      (source.paymentLog || []).map((e) => ({
        id: e.id,
        date: e.date,
        amount: typeof e.amount === 'number' ? e.amount : '',
      }))
    );
    setErrorMsg('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setErrorMsg('');
  }

  function addPaymentLogEntry() {
    setPaymentLogEntries((prev) => [{ id: makeId('paylog'), date: '', amount: '' }, ...prev]);
  }

  function updatePaymentLogDate(id: string, date: string) {
    setPaymentLogEntries((prev) => prev.map((e) => (e.id === id ? { ...e, date } : e)));
  }

  function updatePaymentLogAmount(id: string, amount: number | '') {
    setPaymentLogEntries((prev) => prev.map((e) => (e.id === id ? { ...e, amount } : e)));
  }

  function removePaymentLogEntry(id: string) {
    setPaymentLogEntries((prev) => prev.filter((e) => e.id !== id));
  }

  async function handleSave() {
    if (!model) return;

    const parsedAmount: number | '' = amountInput === '' ? '' : amountInput;

    let payDates: string[] = [];
    if (frequencyInput === 'monthly') {
      if (monthlyDayInput.trim()) {
        const d = parseInt(monthlyDayInput, 10);
        if (isNaN(d) || d < 1 || d > 31) {
          setErrorMsg('Enter a day of month between 1 and 31.');
          return;
        }
      }
      payDates = [monthlyDayInput.trim()];
    } else if (frequencyInput === 'semimonthly') {
      const checks = [semiDay1Input, semiDay2Input];
      for (const v of checks) {
        if (v.trim()) {
          const d = parseInt(v, 10);
          if (isNaN(d) || d < 1 || d > 31) {
            setErrorMsg('Enter a day between 1 and 31.');
            return;
          }
        }
      }
      payDates = [semiDay1Input.trim(), semiDay2Input.trim()];
    } else if (frequencyInput === 'weekly') {
      payDates = weeklyDowInput !== null ? [String(weeklyDowInput)] : [];
    } else if (frequencyInput === 'biweekly') {
      const trimmedDate = biweeklyAnchorInput.trim();
      if (trimmedDate && !/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
        setErrorMsg('Enter date as YYYY-MM-DD.');
        return;
      }
      payDates = trimmedDate ? [trimmedDate] : [];
    } else if (frequencyInput === 'onetime') {
      const trimmedDate = onetimeDateInput.trim();
      if (trimmedDate && !/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
        setErrorMsg('Enter date as YYYY-MM-DD.');
        return;
      }
      payDates = [trimmedDate];
    }

    const validPaymentLog: PaymentLogEntry[] = [];
    for (const entry of paymentLogEntries) {
      const dateTrim = entry.date.trim();
      const hasAmt = typeof entry.amount === 'number' && !isNaN(entry.amount);
      if (!dateTrim && !hasAmt) continue; // fully blank row — quietly dropped
      if (!dateTrim || !hasAmt) {
        setErrorMsg('Each entry requires both date and amount.');
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateTrim)) {
        setErrorMsg('Enter date as YYYY-MM-DD.');
        return;
      }
      validPaymentLog.push({ id: entry.id, date: dateTrim, amount: entry.amount as number });
    }

    const { people: peopleWithPerson, personId } = findOrCreatePerson(model.people, personInput);

    const updated: HouseholdModel = {
      ...model,
      people: peopleWithPerson,
      income: [...model.income],
    };

    if (editingId) {
      updated.income = updated.income.map((s) =>
        s.id === editingId
          ? {
              ...s,
              personId,
              category: categoryInput.trim(),
              sourceName: sourceNameInput.trim(),
              expectedAmount: parsedAmount,
              frequency: frequencyInput,
              payDates,
              paymentLog: validPaymentLog,
            }
          : s
      );
    } else {
      const newSource: IncomeSource = {
        id: makeId('income'),
        personId,
        category: categoryInput.trim(),
        sourceName: sourceNameInput.trim(),
        expectedAmount: parsedAmount,
        frequency: frequencyInput,
        payDates,
        paymentLog: validPaymentLog,
        destinationAccountId: '',
        createdAt: Date.now(),
      };
      updated.income = [...updated.income, newSource];
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
      income: model.income.filter((s) => s.id !== editingId),
    };
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

  function handleDelete() {
    Alert.alert(
      'Delete this income source?',
      'Deletes the source and its logged payments. Cannot be undone.',      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: performDelete },
      ]
    );
  }

  async function performDeleteSourceById(id: string) {
    if (!model) return;
    const updated: HouseholdModel = {
      ...model,
      income: model.income.filter((s) => s.id !== id),
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

  function handleSwipeDelete(source: IncomeSource) {
    Alert.alert(
      'Delete this income source?','Deletes the source and its logged payments. Cannot be undone.'
      ,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => performDeleteSourceById(source.id) },
      ]
    );
  }

  const sources = sortByNextPayDate(model.income);

  const totalMonthlyIncome = sources.reduce((sum, source) => {
    const amount = typeof source.expectedAmount === 'number' ? source.expectedAmount : 0;
    if (amount <= 0) return sum;
    if (source.frequency === 'monthly') return sum + amount;
    if (source.frequency === 'weekly') return sum + (amount * 52) / 12;
    if (source.frequency === 'biweekly') return sum + (amount * 26) / 12;
    if (source.frequency === 'semimonthly') return sum + (amount * 24) / 12;
    return sum + amount;
  }, 0);

  return (
    <SafeAreaView style={styles.container}>
      <PullToRefreshScrollView contentContainerStyle={styles.scrollContent} refreshing={refreshing} onRefresh={onRefresh}>
        <View style={{ backgroundColor: colors.navy3, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <Text style={{ fontSize: 11, letterSpacing: 1, color: colors.inkDim, marginBottom: 4 }}>TOTAL MONTHLY INCOME</Text>
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.ok }}>{formatPeso(totalMonthlyIncome)}</Text>
        </View>
        {sources.length === 0 && (
          <Text style={styles.emptyText}>No income sources yet.</Text>        )}

        {sources.map((source) => {
          const freq = (source.frequency as Frequency) || 'monthly';
          const nextDate = computeNextPayDate(freq, source.payDates || []);
          const person = personName(model.people, source.personId);
          const title = source.sourceName || source.category || 'Untitled income';
          const isExpanded = expandedIncomeId === source.id;
          const loggedPayments = source.paymentLog || [];
          const totalLogged = loggedPayments.reduce(
            (sum, p) => sum + (typeof p.amount === 'number' ? p.amount : 0),
            0
          );
          return (
            <SwipeableRow
              key={source.id}
              enabled={Boolean(model.settings.swipeToDeleteEnabled)}
              onDelete={() => handleSwipeDelete(source)}
              testID={`income-swipe-${source.id}`}
            >
            <CollapsibleRow
              testID={`income-row-${source.id}`}
              isExpanded={isExpanded}
              onToggle={() => setExpandedIncomeId((prev) => (prev === source.id ? null : source.id))}
              onEdit={() => openEditModal(source)}
              collapsedContent={
                <View style={styles.rowCollapsedRow}>
                  <View style={styles.rowMain}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {title}
                    </Text>
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {(person || 'Unassigned')} · {frequencyLabel(freq)} · {formatShortDate(nextDate)}
                    </Text>
                  </View>
                  <Text style={styles.rowAmount}>
    {typeof source.expectedAmount === 'number' ? `+${formatPeso(source.expectedAmount)}` : '—'}
  </Text>
                </View>
              }
              expandedContent={
                <View style={styles.detailContainer}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Category</Text>
                    <Text style={styles.detailValue}>{source.category || '—'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Belongs To</Text>
                    <Text style={styles.detailValue}>{person || 'Unassigned'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Logged Payments</Text>
                    <Text style={styles.detailValue}>
                      {loggedPayments.length} logged
                      {loggedPayments.length > 0 ? ` · ${formatPeso(totalLogged)} total` : ''}
                    </Text>
                  </View>
                </View>
              }
            />
            </SwipeableRow>
          );
        })}

        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>+ Add income</Text>
        </TouchableOpacity>
      </PullToRefreshScrollView>

      <BottomSheet
        visible={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Edit income' : 'New income'}
      >
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

                <Text style={styles.inputLabel}>Category</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Salary, Freelance"
                  placeholderTextColor={colors.inkFaint}
                  value={categoryInput}
                  onChangeText={setCategoryInput}
                />
                <View style={styles.chipRow}>
                  {CATEGORY_SUGGESTIONS.map((c) => (
                    <TouchableOpacity key={c} style={styles.chip} onPress={() => setCategoryInput(c)}>
                      <Text style={styles.chipText}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Source name (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Freelance design, ABC Corp"
                  placeholderTextColor={colors.inkFaint}
                  value={sourceNameInput}
                  onChangeText={setSourceNameInput}
                />

                <Text style={styles.inputLabel}>Expected amount</Text>
                <AmountInput
                  style={styles.amountInput}
                  value={amountInput}
                  onChangeAmount={setAmountInput}
                />

                <Text style={styles.inputLabel}>Frequency</Text>
                <View style={styles.pillRow}>
                  {FREQUENCIES.map((f) => (
                    <Pill
                      key={f}
                      label={frequencyLabel(f)}
                      tone="sheet"
                      fill
                      minWidth={80}
                      active={frequencyInput === f}
                      onPress={() => setFrequencyInput(f)}
                    />
                  ))}
                </View>

                {frequencyInput === 'monthly' && (
                  <>
                    <Text style={styles.inputLabel}>Day of month (1–31)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 30"
                      placeholderTextColor={colors.inkFaint}
                      keyboardType="number-pad"
                      value={monthlyDayInput}
                      onChangeText={setMonthlyDayInput}
                    />
                  </>
                )}

                {frequencyInput === 'semimonthly' && (
                  <View style={styles.row2}>
                    <View style={styles.row2Item}>
                      <Text style={styles.inputLabel}>First payday</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. 15"
                        placeholderTextColor={colors.inkFaint}
                        keyboardType="number-pad"
                        value={semiDay1Input}
                        onChangeText={setSemiDay1Input}
                      />
                    </View>
                    <View style={styles.row2Item}>
                      <Text style={styles.inputLabel}>Second payday</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. 30"
                        placeholderTextColor={colors.inkFaint}
                        keyboardType="number-pad"
                        value={semiDay2Input}
                        onChangeText={setSemiDay2Input}
                      />
                    </View>
                  </View>
                )}

                {frequencyInput === 'weekly' && (
                  <>
                    <Text style={styles.inputLabel}>Pay day</Text>
                    <View style={styles.pillRow}>
                      {DOW_LABELS.map((label, idx) => (
                        <Pill
                          key={label}
                          label={label}
                          tone="sheet"
                          compact
                          minWidth={42}
                          active={weeklyDowInput === idx}
                          onPress={() => setWeeklyDowInput(idx)}
                        />
                      ))}
                    </View>
                  </>
                )}

                {frequencyInput === 'onetime' && (
                  <DateField
                    label="Date"
                    value={onetimeDateInput}
                    onChange={setOnetimeDateInput}
                    placeholder="2025-03-15"
                    testID="income-onetime-date-field"
                  />
                )}

                {frequencyInput === 'biweekly' && (
  <DateField
    label="Most recent payday"
    value={biweeklyAnchorInput}
    onChange={setBiweeklyAnchorInput}
    placeholder="Select recent payday"
    clearable
    testID="income-biweekly-anchor-field"
  />
)}

                <Text style={styles.inputLabel}>Payment log</Text>
                <Text style={styles.hintText}>
                  Log paydays to track in Transactions and reports.
                </Text>
                {paymentLogEntries.map((entry) => (
                  <View key={entry.id} style={styles.paymentLogRow}>
                    <DateField
                      style={styles.paymentLogDateInput}
                      value={entry.date}
                      onChange={(v) => updatePaymentLogDate(entry.id, v)}
                      placeholder="YYYY-MM-DD"
                    />
                    <AmountInput
                      style={[styles.amountInput, styles.paymentLogAmountInput]}
                      placeholder="Amount"
                      value={entry.amount}
                      onChangeAmount={(v) => updatePaymentLogAmount(entry.id, v)}
                    />
                    <TouchableOpacity
                      style={styles.paymentLogRemoveBtn}
                      onPress={() => removePaymentLogEntry(entry.id)}
                    >
                      <Ionicons name="close" size={18} color="#e5484d" />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={styles.addPaymentLogButton} onPress={addPaymentLogEntry}>
                  <Text style={styles.addPaymentLogButtonText}>+ Log a payday</Text>
                </TouchableOpacity>

                {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

                <Button label="Save" onPress={handleSave} loading={saving} />

                {editingId && <Button label="Delete income source" variant="destructive" onPress={handleDelete} />}

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
    scrollContent: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 40 },
    emptyText: { fontSize: 12, color: colors.inkFaint, marginBottom: 12, fontStyle: 'italic' },
    rowCollapsedRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    detailContainer: { gap: 8 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    detailLabel: { fontSize: 12, color: colors.inkDim },
    detailValue: { fontSize: 12.5, fontWeight: '600', color: colors.ink, flexShrink: 1, textAlign: 'right' },
    rowMain: { flex: 1, marginRight: 10 },
    rowName: { fontSize: 14, fontWeight: '600', color: colors.ink },
    rowSub: { fontSize: 11.5, color: colors.inkDim, marginTop: 2 },
    rowAmount: { fontSize: 14, fontWeight: '600', color: colors.ok },
    addButton: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 4, marginTop: 4 },
    addButtonText: { fontSize: 13, fontWeight: '600', color: colors.gold },
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
      marginBottom: 10,
    },
    amountInput: {
      backgroundColor: colors.navy2,
      marginBottom: 10,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
    chip: {
      backgroundColor: colors.navy2,
      borderRadius: 999,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    chipText: { fontSize: 11.5, fontWeight: '500', color: colors.inkDim },
    row2: { flexDirection: 'row', gap: 10 },
    row2Item: { flex: 1 },
    pillRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
    hintText: { fontSize: 12, color: colors.inkFaint, marginBottom: 14, lineHeight: 17 },
    errorText: { fontSize: 12, color: '#e5484d', marginBottom: 10 },
    paymentLogRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    paymentLogDateInput: { flex: 1.3, marginBottom: 0 },
    paymentLogAmountInput: { flex: 1, marginBottom: 0 },
    paymentLogRemoveBtn: { paddingHorizontal: 8, paddingVertical: 6 },
    paymentLogRemoveText: { fontSize: 18, color: '#e5484d', fontWeight: '600' },
    addPaymentLogButton: {
      alignSelf: 'flex-start',
      paddingVertical: 8,
      paddingHorizontal: 4,
      marginBottom: 14,
    },
    addPaymentLogButtonText: { fontSize: 13, fontWeight: '600', color: colors.gold },
  });
}
