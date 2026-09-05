import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Alert } from 'react-native';
import BottomSheet from '../components/BottomSheet';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
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
import { makeId } from '../utils';
import DateField from '../components/DateField';

// Local editing shape for one payment-log row in the modal — amount is kept as
// raw text while typing (not a number) so a half-typed value like "1500."
// doesn't get mangled, and is only parsed/validated on Save.
type PaymentLogFormEntry = { id: string; date: string; amountText: string };

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

export default function IncomeScreen() {
  const { colors } = useTheme();
  const { model, saveModel } = useData();
  const styles = makeStyles(colors);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [personInput, setPersonInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [sourceNameInput, setSourceNameInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [frequencyInput, setFrequencyInput] = useState<Frequency>('monthly');
  const [monthlyDayInput, setMonthlyDayInput] = useState('');
  const [semiDay1Input, setSemiDay1Input] = useState('');
  const [semiDay2Input, setSemiDay2Input] = useState('');
  const [weeklyDowInput, setWeeklyDowInput] = useState<number | null>(null);
  const [onetimeDateInput, setOnetimeDateInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [paymentLogEntries, setPaymentLogEntries] = useState<PaymentLogFormEntry[]>([]);
const [expandedIncomeId, setExpandedIncomeId] = useState<string | null>(null);

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
    setOnetimeDateInput('');
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
      typeof source.expectedAmount === 'number' ? String(source.expectedAmount) : ''
    );
    const freq = (source.frequency as Frequency) || 'monthly';
    setFrequencyInput(freq);
    const pd = source.payDates || [];
    setMonthlyDayInput(freq === 'monthly' ? pd[0] || '' : '');
    setSemiDay1Input(freq === 'semimonthly' ? pd[0] || '' : '');
    setSemiDay2Input(freq === 'semimonthly' ? pd[1] || '' : '');
    setWeeklyDowInput(freq === 'weekly' && pd[0] !== undefined ? parseInt(pd[0], 10) : null);
    setOnetimeDateInput(freq === 'onetime' ? pd[0] || '' : '');
    setPaymentLogEntries(
      (source.paymentLog || []).map((e) => ({
        id: e.id,
        date: e.date,
        amountText: typeof e.amount === 'number' ? String(e.amount) : '',
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
    setPaymentLogEntries((prev) => [{ id: makeId('paylog'), date: '', amountText: '' }, ...prev]);
  }

  function updatePaymentLogDate(id: string, date: string) {
    setPaymentLogEntries((prev) => prev.map((e) => (e.id === id ? { ...e, date } : e)));
  }

  function updatePaymentLogAmount(id: string, amountText: string) {
    setPaymentLogEntries((prev) => prev.map((e) => (e.id === id ? { ...e, amountText } : e)));
  }

  function removePaymentLogEntry(id: string) {
    setPaymentLogEntries((prev) => prev.filter((e) => e.id !== id));
  }

  async function handleSave() {
    if (!model) return;

    let parsedAmount: number | '' = '';
    if (amountInput.trim() !== '') {
      const n = parseFloat(amountInput);
      if (isNaN(n)) {
        setErrorMsg('Enter a valid amount, or leave it blank.');
        return;
      }
      parsedAmount = n;
    }

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
            setErrorMsg('Enter each payday as a day of month between 1 and 31.');
            return;
          }
        }
      }
      payDates = [semiDay1Input.trim(), semiDay2Input.trim()];
    } else if (frequencyInput === 'weekly') {
      payDates = weeklyDowInput !== null ? [String(weeklyDowInput)] : [];
    } else if (frequencyInput === 'onetime') {
      const trimmedDate = onetimeDateInput.trim();
      if (trimmedDate && !/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
        setErrorMsg('Enter the date as YYYY-MM-DD, e.g. 2025-03-15.');
        return;
      }
      payDates = [trimmedDate];
    }
    // biweekly: no schedule fields collected in this version — payDates stays [].

    const validPaymentLog: PaymentLogEntry[] = [];
    for (const entry of paymentLogEntries) {
      const dateTrim = entry.date.trim();
      const amtTrim = entry.amountText.trim();
      if (!dateTrim && !amtTrim) continue; // fully blank row — quietly dropped
      if (!dateTrim || !amtTrim) {
        setErrorMsg('Each payment log entry needs both a date and an amount — or leave both blank to remove it.');
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateTrim)) {
        setErrorMsg('Enter each payment log date as YYYY-MM-DD, e.g. 2025-03-24.');
        return;
      }
      const amtNum = parseFloat(amtTrim);
      if (isNaN(amtNum)) {
        setErrorMsg('Enter a valid amount for each payment log entry.');
        return;
      }
      validPaymentLog.push({ id: entry.id, date: dateTrim, amount: amtNum });
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

    await saveModel(updated);
    closeModal();
  }

  async function performDelete() {
    if (!editingId || !model) return;
    const updated: HouseholdModel = {
      ...model,
      income: model.income.filter((s) => s.id !== editingId),
    };
    await saveModel(updated);
    closeModal();
  }

  function handleDelete() {
    Alert.alert(
      'Delete this income source?',
      'This will permanently delete the source and its logged payments. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: performDelete },
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={{ backgroundColor: colors.navy3, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <Text style={{ fontSize: 10, letterSpacing: 1, color: colors.inkDim, marginBottom: 4 }}>TOTAL MONTHLY INCOME</Text>
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.ok }}>{formatPeso(totalMonthlyIncome)}</Text>
        </View>
        {sources.length === 0 && (
          <Text style={styles.emptyText}>No income sources yet. Add your first one below.</Text>
        )}

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
            <CollapsibleRow
              key={source.id}
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
          );
        })}

        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>+ Add income</Text>
        </TouchableOpacity>
      </ScrollView>

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

                <Text style={styles.inputLabel}>Source name (optional detail)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Freelance design, ABC Corp"
                  placeholderTextColor={colors.inkFaint}
                  value={sourceNameInput}
                  onChangeText={setSourceNameInput}
                />

                <Text style={styles.inputLabel}>Expected amount</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor={colors.inkFaint}
                  keyboardType="decimal-pad"
                  value={amountInput}
                  onChangeText={setAmountInput}
                />

                <Text style={styles.inputLabel}>Frequency</Text>
                <View style={styles.pillRow}>
                  {FREQUENCIES.map((f) => (
                    <TouchableOpacity
                      key={f}
                      style={[styles.pillButton, frequencyInput === f && styles.pillButtonActive]}
                      onPress={() => setFrequencyInput(f)}
                    >
                      <Text
                        style={[
                          styles.pillButtonText,
                          frequencyInput === f && styles.pillButtonTextActive,
                        ]}
                      >
                        {frequencyLabel(f)}
                      </Text>
                    </TouchableOpacity>
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
                        <TouchableOpacity
                          key={label}
                          style={[styles.pillButtonSmall, weeklyDowInput === idx && styles.pillButtonActive]}
                          onPress={() => setWeeklyDowInput(idx)}
                        >
                          <Text
                            style={[
                              styles.pillButtonText,
                              weeklyDowInput === idx && styles.pillButtonTextActive,
                            ]}
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>
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
                  <Text style={styles.hintText}>
                    No fixed schedule needed — just log each payday below as it happens.
                  </Text>
                )}

                <Text style={styles.inputLabel}>Payment log</Text>
                <Text style={styles.hintText}>
                  Log each actual payday as it happens — this feeds your Transactions list and
                  reports.
                </Text>
                {paymentLogEntries.map((entry) => (
                  <View key={entry.id} style={styles.paymentLogRow}>
                    <DateField
                      style={styles.paymentLogDateInput}
                      value={entry.date}
                      onChange={(v) => updatePaymentLogDate(entry.id, v)}
                      placeholder="YYYY-MM-DD"
                    />
                    <TextInput
                      style={[styles.input, styles.paymentLogAmountInput]}
                      placeholder="Amount"
                      placeholderTextColor={colors.inkFaint}
                      keyboardType="decimal-pad"
                      value={entry.amountText}
                      onChangeText={(v) => updatePaymentLogAmount(entry.id, v)}
                    />
                    <TouchableOpacity
                      style={styles.paymentLogRemoveBtn}
                      onPress={() => removePaymentLogEntry(entry.id)}
                    >
                      <Text style={styles.paymentLogRemoveText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={styles.addPaymentLogButton} onPress={addPaymentLogEntry}>
                  <Text style={styles.addPaymentLogButtonText}>+ Log a payday</Text>
                </TouchableOpacity>

                {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>

                {editingId && (
                  <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                    <Text style={styles.deleteButtonText}>Delete this income source</Text>
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
    pillButton: {
      flex: 1,
      minWidth: 80,
      backgroundColor: colors.navy2,
      borderRadius: 999,
      paddingVertical: 10,
      alignItems: 'center',
    },
    pillButtonSmall: {
      minWidth: 42,
      backgroundColor: colors.navy2,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 10,
      alignItems: 'center',
    },
    pillButtonActive: { backgroundColor: colors.gold },
    pillButtonText: { fontSize: 12, fontWeight: '600', color: colors.inkDim },
    pillButtonTextActive: { color: colors.navy2 },
    hintText: { fontSize: 12, color: colors.inkFaint, marginBottom: 14, lineHeight: 17 },
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
