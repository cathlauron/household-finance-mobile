import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from '../components/BottomSheet';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
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
import type { IncomeSource, Person, HouseholdModel, PaymentLogEntry, PaymentMethod } from '../types';
import AccountPicker from '../components/AccountPicker';
import CollapsibleRow from '../components/CollapsibleRow';
import SwipeableRow from '../components/SwipeableRow';
import { makeId } from '../utils';
import DateField from '../components/DateField';
import Pill from '../components/Pill';
import Button from '../components/Button';
import Card from '../components/Card';
import AmountInput from '../components/AmountInput';
import GradientFill from '../components/GradientFill';
import { extraIncome, incomeKindLabel } from '../incomeKinds';
import { todayISO } from '../dateUtils';
import { useNavigation } from '@react-navigation/native';
import { SheetBar, BigAmount, FormGroup, InputRow, PickerRow, Footnote, Choices, DayStrip, AccountChoices, accountName, useOpenRow, ordinal, InlineField } from '../components/SimpleForm';
import { paymentMethodColor } from '../components/CardFace';

// Local editing shape for one payment-log row in the modal — amount is kept as
// raw text while typing (not a number) so a half-typed value like "1500."
// doesn't get mangled, and is only parsed/validated on Save.
type PaymentLogFormEntry = { id: string; date: string; amount: number | ''; paymentMethod?: PaymentMethod };

const CATEGORY_SUGGESTIONS = ['Salary', 'Freelance / Side gig', 'Business income', 'Rental income', 'Other'];
// Friendlier names for how often pay comes (the simple form).
const PAY_LABEL: Record<Frequency, string> = { weekly: 'Weekly', biweekly: 'Every 2 weeks', semimonthly: 'Twice a month', monthly: 'Monthly', onetime: 'Just once' };

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
  const navigation = useNavigation<any>();

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
  // Redesign: the account logged paydays go into (they add to its balance).
  const [depositInput, setDepositInput] = useState<PaymentMethod | undefined>(undefined);
  const [expandedIncomeId, setExpandedIncomeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [openRow, toggleRow] = useOpenRow(modalOpen);
  const paydayLabel = (() => {
    if (frequencyInput === 'monthly') return monthlyDayInput ? `the ${ordinal(parseInt(monthlyDayInput, 10))}` : 'Choose';
    if (frequencyInput === 'semimonthly') return semiDay1Input && semiDay2Input ? `${ordinal(parseInt(semiDay1Input, 10))} and ${ordinal(parseInt(semiDay2Input, 10))}` : 'Choose';
    if (frequencyInput === 'weekly') return weeklyDowInput !== null ? `${DOW_LABELS[weeklyDowInput]}s` : 'Choose';
    const d = frequencyInput === 'onetime' ? onetimeDateInput : biweeklyAnchorInput;
    return d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Choose';
  })();
  const nextPaydayText = (() => {
    const pd =
      frequencyInput === 'monthly' ? (monthlyDayInput ? [monthlyDayInput] : [])
      : frequencyInput === 'semimonthly' ? (semiDay1Input && semiDay2Input ? [semiDay1Input, semiDay2Input] : [])
      : frequencyInput === 'weekly' ? (weeklyDowInput !== null ? [String(weeklyDowInput)] : [])
      : frequencyInput === 'onetime' ? (onetimeDateInput ? [onetimeDateInput] : [])
      : biweeklyAnchorInput ? [biweeklyAnchorInput] : [];
    if (!pd.length) return '';
    const next = computeNextPayDate(frequencyInput, pd);
    return next ? `Next payday ${next.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}.` : '';
  })();

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
    setDepositInput(undefined);
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
        paymentMethod: e.paymentMethod,
      }))
    );
    setDepositInput(
      source.depositTo ??
        [...(source.paymentLog || [])].reverse().find((e) => e.paymentMethod?.accountId)?.paymentMethod
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
      // A payday is real money: it goes into an account (the one chosen above, unless
      // it was already logged into another one).
      const pm = entry.paymentMethod?.accountId ? entry.paymentMethod : depositInput;
      if (!pm?.accountId) {
        setErrorMsg('Choose which account your paydays go into.');
        return;
      }
      validPaymentLog.push({ id: entry.id, date: dateTrim, amount: entry.amount as number, paymentMethod: pm });
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
              ...(depositInput?.accountId ? { depositTo: depositInput } : {}),
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
        ...(depositInput?.accountId ? { depositTo: depositInput } : {}),
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

  const extras = extraIncome(model);
  const ymNow = todayISO().slice(0, 7);
  const extraMonth = extras.filter((t) => t.date.startsWith(ymNow)).reduce((sum, t) => sum + t.amount, 0);
  const extraYear = extras.filter((t) => t.date.startsWith(ymNow.slice(0, 4))).reduce((sum, t) => sum + t.amount, 0);

  return (
    <SafeAreaView style={styles.container}>
      <PullToRefreshScrollView contentContainerStyle={styles.scrollContent}>
        <Card variant="banner" style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 13, letterSpacing: 0.3, color: colors.inkDim, marginBottom: 4 }}>EXPECTED MONTHLY INCOME</Text>
          {/* Redesign: expected income is a projection (blue). It shows on the Calendar, and
              only becomes real money when you log a payday into an account. */}
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.planned }}>{formatPeso(totalMonthlyIncome)}</Text>
          <Text style={{ fontSize: 13, color: colors.inkDim, marginTop: 4 }}>
            Not in your balance yet. Log a payday when the money arrives.
          </Text>
        </Card>
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

        {/* Extra income: bonuses, side jobs, allowances and gifts added with the + button
            (Money in › What is it?). Real money already in your accounts. */}
        <Text style={styles.extraHeader}>Extra income</Text>
        <View style={styles.extraGroup}>
          <GradientFill match={styles.extraGroup} />
          <View style={styles.extraTotals}>
            <View style={{ flex: 1 }}>
              <Text style={styles.extraMeta}>This month</Text>
              <Text style={[styles.extraTotal, { color: colors.positive }]}>+{formatPeso(extraMonth)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.extraMeta}>This year</Text>
              <Text style={[styles.extraTotal, { color: colors.positive }]}>+{formatPeso(extraYear)}</Text>
            </View>
          </View>
          {extras.length === 0 ? (
            <Text style={[styles.extraMeta, styles.extraEmpty]}>
              Got a bonus, side-job pay or an allowance? Tap + and choose Money in, then pick what it is. It will show up here.
            </Text>
          ) : (
            extras.slice(0, 10).map((t) => (
              <TouchableOpacity
                key={t.id}
                style={styles.extraRow}
                onPress={() => navigation.navigate('TransactionDetail', { id: t.id })}
                accessibilityRole="button"
              >
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.rowName} numberOfLines={1}>{t.label}</Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {t.incomeKind ? incomeKindLabel(t.incomeKind) : 'Other'} · {formatShortDate(new Date(t.date + 'T00:00:00'))}
                  </Text>
                </View>
                <Text style={[styles.rowAmount, { color: colors.positive }]}>+{formatPeso(t.amount)}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </PullToRefreshScrollView>

      {/* Approved "Option 2: simple" form (Forms Redesign canvas). */}
      <BottomSheet
        visible={modalOpen}
        onClose={closeModal}
        grouped
        header={<SheetBar title={editingId ? 'Edit income' : 'New income'} onCancel={closeModal} onDone={handleSave} doneLabel="Save" busy={saving} />}
      >
        <BigAmount label="Expected each payday" value={amountInput} onChange={setAmountInput} color={colors.planned} autoFocus={!editingId} />

        <FormGroup>
          <InputRow label="Source" value={sourceNameInput} onChangeText={setSourceNameInput} placeholder="e.g. ABC Corp" testID="income-source-input" />
          <PickerRow label="Kind" value={categoryInput || 'Choose'} open={openRow === 'kind'} onToggle={() => toggleRow('kind')}>
            <Choices options={CATEGORY_SUGGESTIONS.map((c) => ({ id: c, label: c }))} value={categoryInput as any} onChange={(c) => setCategoryInput(c)} />
            <View style={{ height: 10 }} />
            <InlineField label="Or type your own" value={CATEGORY_SUGGESTIONS.includes(categoryInput) ? '' : categoryInput} onChangeText={setCategoryInput} />
          </PickerRow>
          <PickerRow label="Belongs to" value={personInput || 'Choose'} open={openRow === 'person'} onToggle={() => toggleRow('person')}>
            {model.people.length > 0 && (
              <Choices options={model.people.map((p) => ({ id: p.name, label: p.name }))} value={personInput} onChange={setPersonInput} />
            )}
            <View style={{ height: 10 }} />
            <InlineField label="Or type a name" value={model.people.some((p) => p.name === personInput) ? '' : personInput} onChangeText={setPersonInput} placeholder="e.g. Miguel" />
          </PickerRow>
          <PickerRow label="Paid" value={PAY_LABEL[frequencyInput]} open={openRow === 'freq'} onToggle={() => toggleRow('freq')}>
            <Choices options={FREQUENCIES.map((f) => ({ id: f, label: PAY_LABEL[f] }))} value={frequencyInput} onChange={(f) => setFrequencyInput(f as Frequency)} />
          </PickerRow>
          <PickerRow label={frequencyInput === 'biweekly' ? 'Last payday' : frequencyInput === 'onetime' ? 'Date' : 'Payday'} value={paydayLabel} open={openRow === 'payday'} onToggle={() => toggleRow('payday')}>
            {frequencyInput === 'monthly' && <DayStrip value={parseInt(monthlyDayInput, 10) || null} onChange={(d) => setMonthlyDayInput(String(d))} />}
            {frequencyInput === 'semimonthly' && (
              <>
                <Text style={styles.inlineLabel}>First payday</Text>
                <DayStrip value={parseInt(semiDay1Input, 10) || null} onChange={(d) => setSemiDay1Input(String(d))} />
                <Text style={[styles.inlineLabel, { marginTop: 12 }]}>Second payday</Text>
                <DayStrip value={parseInt(semiDay2Input, 10) || null} onChange={(d) => setSemiDay2Input(String(d))} />
              </>
            )}
            {frequencyInput === 'weekly' && (
              <Choices options={DOW_LABELS.map((l, i) => ({ id: String(i), label: l }))} value={weeklyDowInput === null ? '' : String(weeklyDowInput)} onChange={(v) => setWeeklyDowInput(parseInt(v, 10))} />
            )}
            {frequencyInput === 'onetime' && <DateField value={onetimeDateInput} onChange={setOnetimeDateInput} placeholder="Pick a date" testID="income-onetime-date-field" />}
            {frequencyInput === 'biweekly' && <DateField value={biweeklyAnchorInput} onChange={setBiweeklyAnchorInput} placeholder="Pick your last payday" testID="income-biweekly-anchor-field" />}
          </PickerRow>
          <PickerRow label="Goes into" value={accountName(model, depositInput) ?? 'Choose'} dot={depositInput ? paymentMethodColor(model, depositInput) : null} open={openRow === 'account'} onToggle={() => toggleRow('account')}>
            <AccountChoices model={model} value={depositInput} onChange={setDepositInput} />
          </PickerRow>
        </FormGroup>
        {!!nextPaydayText && <Footnote>{nextPaydayText}</Footnote>}

        <Text style={styles.groupHeader}>Paydays received</Text>
        <FormGroup>
          <View style={{ paddingHorizontal: 16, paddingTop: paymentLogEntries.length ? 12 : 0 }}>
                {paymentLogEntries.map((entry) => (
                  <View key={entry.id} style={styles.paymentLogEntry}>
                    {/* Date on its own full-width line, so its calendar has room to open. */}
                    <DateField
                      value={entry.date}
                      onChange={(v) => updatePaymentLogDate(entry.id, v)}
                      placeholder="Payday date"
                    />
                    <View style={styles.paymentLogRow}>
                      <AmountInput
                        style={[styles.amountInput, styles.paymentLogAmountInput]}
                        placeholder="Amount received"
                        value={entry.amount}
                        onChangeAmount={(v) => updatePaymentLogAmount(entry.id, v)}
                      />
                      <TouchableOpacity
                        style={styles.paymentLogRemoveBtn}
                        onPress={() => removePaymentLogEntry(entry.id)}
                        accessibilityRole="button"
                        accessibilityLabel="Remove this payday"
                      >
                        <Ionicons name="close-circle" size={24} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                <TouchableOpacity style={styles.addPaymentLogButton} onPress={addPaymentLogEntry}>
                  <Text style={styles.addPaymentLogButtonText}>+ Log a payday</Text>
                </TouchableOpacity>
          </View>
        </FormGroup>
        <Footnote>You can also log a payday from + › Money in › Salary.</Footnote>

        {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
        {editingId && <Button label="Delete income source" variant="destructive" onPress={handleDelete} />}
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
    emptyText: { fontSize: 13, color: colors.inkFaint, marginBottom: 12 },
    rowCollapsedRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    detailContainer: { gap: 8 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    detailLabel: { fontSize: 13, color: colors.inkDim },
    detailValue: { fontSize: 15, fontWeight: '600', color: colors.ink, flexShrink: 1, textAlign: 'right' },
    rowMain: { flex: 1, marginRight: 10 },
    rowName: { fontSize: 15, fontWeight: '600', color: colors.ink },
    rowSub: { fontSize: 15, color: colors.inkDim, marginTop: 2 },
    rowAmount: { fontSize: 15, fontWeight: '600', color: colors.planned },
    inlineLabel: { fontSize: 13, fontWeight: '600', color: colors.inkDim, marginBottom: 6 },
    groupHeader: { fontSize: 13, color: colors.inkDim, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6, marginLeft: 16 },
    extraHeader: { fontSize: 13, fontWeight: '600', color: colors.inkDim, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 28, marginBottom: 6, marginLeft: 4 },
    extraGroup: { backgroundColor: colors.navy3, borderRadius: 12, overflow: 'hidden', marginBottom: 24 },
    extraTotals: { flexDirection: 'row', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.navy4 },
    extraMeta: { fontSize: 13, color: colors.inkDim },
    extraTotal: { fontSize: 20, fontWeight: '700', marginTop: 2 },
    extraEmpty: { padding: 16, lineHeight: 19 },
    extraRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    addButton: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 4, marginTop: 4 },
    addButtonText: { fontSize: 13, fontWeight: '600', color: colors.gold },
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
    chipText: { fontSize: 15, fontWeight: '500', color: colors.inkDim },
    row2: { flexDirection: 'row', gap: 10 },
    row2Item: { flex: 1 },
    pillRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
    hintText: { fontSize: 13, color: colors.inkFaint, marginBottom: 14, lineHeight: 17 },
    errorText: { fontSize: 13, color: colors.error, marginBottom: 10 },
    paymentLogEntry: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.navy4 },
    paymentLogRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    paymentLogDateInput: { flex: 1.3, marginBottom: 0 },
    paymentLogAmountInput: { flex: 1, marginBottom: 0 },
    paymentLogRemoveBtn: { paddingHorizontal: 8, paddingVertical: 6 },
    paymentLogRemoveText: { fontSize: 18, color: colors.error, fontWeight: '600' },
    addPaymentLogButton: {
      alignSelf: 'flex-start',
      paddingVertical: 8,
      paddingHorizontal: 4,
      marginBottom: 14,
    },
    addPaymentLogButtonText: { fontSize: 13, fontWeight: '600', color: colors.gold },
  });
}
