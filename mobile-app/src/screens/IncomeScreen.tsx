import { firstTimeOpen } from '../handledOpen';
import { toneUnlessZero } from '../moneyColor';
import ErrorNote from '../components/ErrorNote';
import { notSaved, alertNotDeleted } from '../messages';
import { WhoFootnote, useWho } from '../components/WhoLogged';
import React, { useState, useRef, useEffect } from 'react';
import { showLeafTick } from '../components/LeafTick';
import { afterSlide } from '../afterSlide';
import { takeSalaryHandoff, cancelSalaryHandoff } from '../salaryHandoff';
import { MarkedLabel } from '../components/MarkedLabel';
import { View, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { TouchableOpacity } from '../components/Tap';
import { Text } from '../components/AppText';
import { headerButtonText } from '../navigation/LargeHeader';
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
  DOW_LABELS, computeNextPayDate,
  formatShortDate
} from '../income';
import type { IncomeSource, Person, HouseholdModel, PaymentLogEntry, PaymentMethod } from '../types';
import SwipeableRow from '../components/SwipeableRow';
import { makeId } from '../utils';
import DateField from '../components/DateField';
import Button from '../components/Button';
import AmountInput from '../components/AmountInput';
import GradientFill from '../components/GradientFill';
import Guided, { useFieldErrors } from '../components/Guided';
import { monthTotals, sourcesByPerson } from '../incomeMonth';
import { extraIncome, incomeKindLabel } from '../incomeKinds';
import { todayISO, dateText } from '../dateUtils';
import { useNavigation } from '@react-navigation/native';
import { SheetBar, BigAmount, FormGroup, InputRow, PickerRow, Footnote, Choices, DayStrip, AccountChoices, accountName, useOpenRow, ordinal, InlineField, OwnChoiceField } from '../components/SimpleForm';
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
  // Version 2.2: opens the "Add income" form straight away (from a New transaction's
  // "Add a salary").
  openAddNonce?: number;
  openIncomeId?: string;
  openIncomeNonce?: number;
  // Set on one person's income page ('__none' = sources with nobody picked).
  personId?: string;
};

const NO_PERSON = '__none';
const AVATAR_COLORS = ['#2E6B47', '#5B6CC9', '#D47A9B', '#C2410C', '#0E7490'];
const dayOf = (d: Date) => dateText(d, { weekday: true });
const shortDay = (iso: string) => dateText(new Date(iso + 'T00:00:00'), { weekday: true });

export default function IncomeScreen({ openIncomeId, openIncomeNonce, personId, openAddNonce }: IncomeScreenProps = {}) {
  const { colors } = useTheme();
  const { model, saveModel, getModel } = useData();
  const who = useWho();
  const navigation = useNavigation<any>();

  const openedIncomeRef = useRef<{ id: string; nonce?: number } | undefined>(undefined);
  useEffect(() => {
    if (!model || !openIncomeId) return;
    const prev = openedIncomeRef.current;
    if (prev && prev.id === openIncomeId && prev.nonce === openIncomeNonce) return;
    const target = (model.income || []).find((s) => s.id === openIncomeId);
    if (target) {
      openedIncomeRef.current = { id: openIncomeId, nonce: openIncomeNonce };
      if (!firstTimeOpen('income', openIncomeId, openIncomeNonce)) return;
      afterSlide(() => openEditModal(target));
    }
  }, [model, openIncomeId, openIncomeNonce]);
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

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
  const [saving, setSaving] = useState(false);
  const [openRow, toggleRow] = useOpenRow(modalOpen);
  // Version 2.1: tapping Save/Add with something missing takes the person straight to it.
  const fieldErrors = useFieldErrors<'payday' | 'log' | 'account'>();
  const clearFieldError = fieldErrors.clear;
  const paydayLabel = (() => {
    if (frequencyInput === 'monthly') return monthlyDayInput ? `the ${ordinal(parseInt(monthlyDayInput, 10))}` : 'Choose';
    if (frequencyInput === 'semimonthly') return semiDay1Input && semiDay2Input ? `${ordinal(parseInt(semiDay1Input, 10))} and ${ordinal(parseInt(semiDay2Input, 10))}` : 'Choose';
    if (frequencyInput === 'weekly') return weeklyDowInput !== null ? `${DOW_LABELS[weeklyDowInput]}s` : 'Choose';
    const d = frequencyInput === 'onetime' ? onetimeDateInput : biweeklyAnchorInput;
    return d ? dateText(new Date(d + 'T00:00:00'), { weekday: true }) : 'Choose';
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
    return next ? `Next payday ${dateText(next, { weekday: true })}.` : '';
  })();

  // Logging one payday (from a row in "Paydays this month"): the same record as
  // + › Money in › Salary, so it is counted once and shows in Transactions too.
  const [logSheet, setLogSheet] = useState<{ sourceId: string; date: string; amount: number | ''; pm?: PaymentMethod } | null>(null);
  const [logError, setLogError] = useState('');
  const [logSaving, setLogSaving] = useState(false);
  const personMode = personId !== undefined;
  const pagePerson = personMode && personId !== NO_PERSON ? (model?.people || []).find((p) => p.id === personId) : undefined;

  // Add in the header adds an income source (for this person on their page).
  React.useLayoutEffect(() => {
    navigation.setOptions({
      ...(personMode ? { title: pagePerson?.name || 'Not assigned', headerBackTitle: 'Income' } : {}),
      headerRight: () => (
        <TouchableOpacity
          onPress={() => openAddModalRef.current()}
          accessibilityRole="button"
          accessibilityLabel="Add income source"
          testID="income-add"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[headerButtonText, { color: colors.gold }]}>Add</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, colors, personMode, pagePerson?.name]);
  const openAddModalRef = useRef<() => void>(() => {});

  // The red message goes away as soon as the person changes something.
  useEffect(() => {
    clearFieldError();
  }, [monthlyDayInput, semiDay1Input, semiDay2Input, biweeklyAnchorInput, onetimeDateInput, frequencyInput, paymentLogEntries, depositInput, modalOpen, clearFieldError]);

  // Hooks stay above the loading return below, so they run on every render (2026-10-22:
  // they used to sit below it, which can crash the page when the data briefly goes away,
  // e.g. while logging out).
  useEffect(() => {
    if (!openAddNonce) return;
    afterSlide(() => openAddModalRef.current());
  }, [openAddNonce]);
  // Leaving without adding one: nothing waits for it any more.
  useEffect(() => () => cancelSalaryHandoff(), []);

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

  openAddModalRef.current = () => {
    openAddModal();
    if (pagePerson) setPersonInput(pagePerson.name);
  };

  async function saveLoggedPayday() {
    if (!model || !logSheet) return;
    if (logSheet.amount === '' || logSheet.amount <= 0) {
      setLogError('Enter the amount that arrived.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(logSheet.date)) {
      setLogError('Pick the date it arrived.');
      return;
    }
    if (!logSheet.pm) {
      setLogError('Pick the account it went into.');
      return;
    }
    const entry = { id: makeId('paylog'), date: logSheet.date, amount: logSheet.amount, paymentMethod: logSheet.pm, createdAt: Date.now() };
    setLogSaving(true);
    try {
      await saveModel({
        ...model,
        income: (model.income || []).map((src) => (src.id === logSheet.sourceId ? { ...src, paymentLog: [entry, ...(src.paymentLog || [])] } : src)),
      });
      showLeafTick('Added');
      setLogSheet(null);
    } catch {
      setLogError(notSaved('this payday'));
    } finally {
      setLogSaving(false);
    }
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
    setErrorMsg('');
    let addedId: string | null = null;

    const parsedAmount: number | '' = amountInput === '' ? '' : amountInput;

    let payDates: string[] = [];
    if (frequencyInput === 'monthly') {
      if (monthlyDayInput.trim()) {
        const d = parseInt(monthlyDayInput, 10);
        if (isNaN(d) || d < 1 || d > 31) {
          fieldErrors.show('payday', 'Pick a day between 1 and 31.');
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
            fieldErrors.show('payday', 'Pick a day between 1 and 31.');
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
        fieldErrors.show('payday', 'Pick a date.');
        return;
      }
      payDates = trimmedDate ? [trimmedDate] : [];
    } else if (frequencyInput === 'onetime') {
      const trimmedDate = onetimeDateInput.trim();
      if (trimmedDate && !/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
        fieldErrors.show('payday', 'Pick a date.');
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
        fieldErrors.show('log', 'Each payday needs a date and an amount.');
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateTrim)) {
        fieldErrors.show('log', 'Pick a date for each payday.');
        return;
      }
      // A payday is real money: it goes into an account (the one chosen above, unless
      // it was already logged into another one).
      const pm = entry.paymentMethod?.accountId ? entry.paymentMethod : depositInput;
      if (!pm?.accountId) {
        fieldErrors.show('account', 'Choose which account your paydays go into.');
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
      addedId = newSource.id;
    }

    setSaving(true);
    try {
      await saveModel(updated);
      showLeafTick(editingId ? 'Saved' : 'Added');
      closeModal();
      // Came here from a New transaction's "Add a salary": go straight back to it.
      const next = addedId ? takeSalaryHandoff() : null;
      if (next && addedId) {
        const id = addedId;
        navigation.goBack();
        afterSlide(() => next(id));
      }
    } catch (e) {
      setErrorMsg(notSaved('this income'));
    } finally {
      setSaving(false);
    }
  }

  async function performDelete() {
    // H-21 (2026-10-22): the newest data, not the data from when the pop-up opened.
    const current = getModel() ?? model;
    if (!editingId || !current) return;
    const updated: HouseholdModel = {
      ...current,
      income: current.income.filter((s) => s.id !== editingId),
    };
    setSaving(true);
    try {
      await saveModel(updated);
      closeModal();
    } catch (e) {
      setErrorMsg(notSaved('this income'));
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
    // H-21 (2026-10-22): the newest data, not the data from when the pop-up opened.
    const current = getModel() ?? model;
    if (!current) return;
    const updated: HouseholdModel = {
      ...current,
      income: current.income.filter((s) => s.id !== id),
    };
    setSaving(true);
    try {
      await saveModel(updated);
    } catch (e) {
      Alert.alert(...alertNotDeleted('this income'));
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

  // Expected this calendar month: every scheduled payday that falls in it (so a month with
  // three bi-weekly paydays shows all three).
  const nowDate = new Date();
  const monthName = nowDate.toLocaleString('en-US', { month: 'long' });

  const extras = extraIncome(model);
  const ymNow = todayISO().slice(0, 7);
  const extraMonth = extras.filter((t) => t.date.startsWith(ymNow)).reduce((sum, t) => sum + t.amount, 0);
  const extraYear = extras.filter((t) => t.date.startsWith(ymNow.slice(0, 4))).reduce((sum, t) => sum + t.amount, 0);

  return (
    <SafeAreaView style={styles.container}>
      <PullToRefreshScrollView contentContainerStyle={styles.scrollContent}>
        {(() => {
          const now = new Date();
          const y = now.getFullYear();
          const mi = now.getMonth();
          const todayIso = todayISO();
          const pageSources = personMode
            ? sources.filter((src) => (src.personId || NO_PERSON) === (personId || NO_PERSON) || (personId === NO_PERSON && !src.personId))
            : sources;
          const totals = monthTotals(pageSources, y, mi);
          const pct = totals.expected > 0 ? Math.min(1, totals.received / totals.expected) : 0;
          const nextOf = (list: IncomeSource[]) =>
            list
              .map((src) => computeNextPayDate((src.frequency as Frequency) || 'monthly', src.payDates || []))
              .filter((d): d is Date => !!d)
              .sort((p, q) => p.getTime() - q.getTime())[0];
          return (
            <>
              {/* Expected this month (projected, blue); received so far (real, green). */}
              <View style={styles.heroCard}>
                <GradientFill match={styles.heroCard} />
                <Text style={styles.heroLabel}>EXPECTED IN {monthName.toUpperCase()}</Text>
                <Text style={[styles.heroAmount, { color: toneUnlessZero(totals.expected, colors.planned, colors) }]}>{formatPeso(totals.expected)}</Text>
                <Text style={styles.heroSub}>
                  <Text style={{ color: toneUnlessZero(totals.received, colors.positive, colors), fontWeight: '700' }}>{formatPeso(totals.received)} received</Text>
                  {` · ${formatPeso(totals.toCome)} still to come`}
                </Text>
                <View style={[styles.heroTrack, { backgroundColor: colors.indigoBg }]}>
                  <View style={{ width: `${Math.round(pct * 100)}%`, height: '100%', backgroundColor: colors.positive, borderRadius: 4 }} />
                </View>
              </View>

              {pageSources.length === 0 && (
                <Text style={styles.emptyText}>No income sources yet. Tap Add to add where money comes from.</Text>
              )}

              {/* Main page: one row per person (stays short for the whole household). */}
              {!personMode && pageSources.length > 0 && (
                <>
                  <Text style={styles.groupLabel}>BY PERSON</Text>
                  <View style={styles.group}>
                    <GradientFill match={styles.group} />
                    {sourcesByPerson({ ...model, income: pageSources }).map((g, i) => {
                      const p = model.people.find((x) => x.id === g.personId);
                      const name = p?.name || 'Not assigned';
                      const t = monthTotals(g.sources, y, mi);
                      const next = nextOf(g.sources);
                      const names = g.sources.map((src) => src.sourceName || src.category || 'Income').join(', ');
                      const share = t.expected > 0 ? Math.min(1, t.received / t.expected) : 0;
                      return (
                        <TouchableOpacity
                          key={g.personId || NO_PERSON}
                          style={[styles.personRow, i > 0 && styles.divider]}
                          onPress={() => navigation.push('IncomePerson', { personId: g.personId || NO_PERSON })}
                          accessibilityRole="button"
                          accessibilityLabel={`${name}, ${formatPeso(t.received)} of ${formatPeso(t.expected)} received`}
                        >
                          <View style={[styles.personAvatar, { backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }]}>
                            <Text style={styles.personInitial}>{name.trim().charAt(0).toUpperCase() || '?'}</Text>
                          </View>
                          <View style={{ flex: 1, marginRight: 6 }}>
                            <View style={styles.personTop}>
                              <Text style={styles.rowName} numberOfLines={1}>{name}</Text>
                              <Text style={styles.personAmounts}>
                                <Text style={{ color: toneUnlessZero(t.received, colors.positive, colors) }}>{formatPeso(t.received)}</Text>
                                <Text style={{ color: colors.inkFaint, fontWeight: '500' }}> / </Text>
                                <Text style={{ color: toneUnlessZero(t.expected, colors.planned, colors) }}>{formatPeso(t.expected)}</Text>
                              </Text>
                            </View>
                            <Text style={styles.rowSub} numberOfLines={1}>
                              {names}
                              {t.toCome <= 0 && t.expected > 0 ? ' · all in this month' : next ? ` · next ${dayOf(next)}` : ''}
                            </Text>
                            <View style={[styles.personTrack, { backgroundColor: colors.indigoBg }]}>
                              <View style={{ width: `${Math.round(share * 100)}%`, height: '100%', backgroundColor: colors.positive }} />
                            </View>
                          </View>
                          <Ionicons name="chevron-forward" size={17} color={colors.inkFaint} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={styles.groupFoot}>Tap someone to see their paydays and log one.</Text>
                </>
              )}

              {/* One person's page: their paydays this month, then their sources. */}
              {personMode && totals.rows.length > 0 && (
                <>
                  <Text style={styles.groupLabel}>PAYDAYS THIS MONTH</Text>
                  <View style={styles.group}>
                    <GradientFill match={styles.group} />
                    {totals.rows.map((r, i) => {
                      const src = pageSources.find((x) => x.id === r.sourceId);
                      const srcName = src?.sourceName || src?.category || 'Income';
                      const got = r.logged ? (r.logged.amount as number) : 0;
                      const diff = r.logged && r.expected > 0 ? got - r.expected : 0;
                      const note = r.logged
                        ? r.expected === 0
                          ? 'Extra payday'
                          : Math.abs(diff) >= 0.01
                          ? `${formatPeso(Math.abs(diff))} ${diff > 0 ? 'more' : 'less'} than expected`
                          : 'Received'
                        : r.date === todayIso
                        ? 'Today'
                        : r.date < todayIso
                        ? 'Not logged yet'
                        : '';
                      return (
                        <TouchableOpacity
                          key={`${r.sourceId}-${r.date}-${i}`}
                          style={[styles.paydayRow, i > 0 && styles.divider]}
                          disabled={!!r.logged}
                          onPress={() => {
                            setLogError('');
                            setLogSheet({
                              sourceId: r.sourceId,
                              date: r.date,
                              amount: r.expected || '',
                              pm: [...(src?.paymentLog || [])].reverse().find((e) => e.paymentMethod)?.paymentMethod,
                            });
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={r.logged ? `${srcName} ${shortDay(r.date)}, received` : `Log ${srcName} payday ${shortDay(r.date)}`}
                        >
                          {r.logged ? (
                            <View style={[styles.payMark, { backgroundColor: colors.okBg }]}>
                              <Ionicons name="checkmark" size={15} color={colors.positive} />
                            </View>
                          ) : (
                            <View style={[styles.payMark, styles.payMarkOpen, { borderColor: colors.planned }]} />
                          )}
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.rowName}>{shortDay(r.logged ? r.logged.date : r.date)}</Text>
                            <Text style={styles.rowSub} numberOfLines={1}>{srcName}{note ? ` · ${note}` : ''}{who.by(r.logged?.addedBy)}</Text>
                          </View>
                          <Text style={[styles.rowAmount, { color: r.logged ? colors.positive : colors.planned }]}>
                            +{formatPeso(r.logged ? got : r.expected)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={styles.groupFoot}>Tap a payday when the money arrives to log it into an account.</Text>
                </>
              )}

              {personMode && pageSources.length > 0 && (
                <>
                  <Text style={styles.groupLabel}>SOURCES</Text>
                  <View style={styles.group}>
                    <GradientFill match={styles.group} />
                    {pageSources.map((source, i) => {
                      const freq = (source.frequency as Frequency) || 'monthly';
                      const nextDate = computeNextPayDate(freq, source.payDates || []);
                      return (
                        <SwipeableRow
                          key={source.id}
                          enabled={Boolean(model.settings.swipeToDeleteEnabled)}
                          onDelete={() => handleSwipeDelete(source)}
                          testID={`income-swipe-${source.id}`}
                        >
                          <TouchableOpacity
                            testID={`income-row-${source.id}`}
                            style={[styles.paydayRow, { backgroundColor: colors.navy3 }, i > 0 && styles.divider]}
                            onPress={() => openEditModal(source)}
                            accessibilityRole="button"
                          >
                            <View style={{ flex: 1, marginRight: 8 }}>
                              <Text style={styles.rowName} numberOfLines={1}>{source.sourceName || source.category || 'Untitled income'}</Text>
                              <Text style={styles.rowSub} numberOfLines={1}>
                                {PAY_LABEL[freq]}{nextDate ? ` · next ${dayOf(nextDate)}` : ''}{who.by(source.addedBy)}
                              </Text>
                            </View>
                            <Text style={[styles.rowAmount, { color: colors.ink }]}>
                              {typeof source.expectedAmount === 'number' ? formatPeso(source.expectedAmount) : '—'}
                            </Text>
                            <Ionicons name="chevron-forward" size={17} color={colors.inkFaint} style={{ marginLeft: 6 }} />
                          </TouchableOpacity>
                        </SwipeableRow>
                      );
                    })}
                  </View>
                </>
              )}
            </>
          );
        })()}

        {!personMode && (<>
        {/* Extra income: bonuses, side jobs, allowances and gifts added with the + button
            (Money in › What is it?). Real money already in your accounts. */}
        <Text style={styles.extraHeader}>Extra income</Text>
        <View style={styles.extraGroup}>
          <GradientFill match={styles.extraGroup} />
          <View style={styles.extraTotals}>
            <View style={{ flex: 1 }}>
              <Text style={styles.extraMeta}>This month</Text>
              <Text style={[styles.extraTotal, { color: toneUnlessZero(extraMonth, colors.positive, colors) }]}>+{formatPeso(extraMonth)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.extraMeta}>This year</Text>
              <Text style={[styles.extraTotal, { color: toneUnlessZero(extraYear, colors.positive, colors) }]}>+{formatPeso(extraYear)}</Text>
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
                <Text style={[styles.rowAmount, { color: toneUnlessZero(t.amount, colors.positive, colors) }]}>+{formatPeso(t.amount)}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
        </>)}
      </PullToRefreshScrollView>

      {/* Log a payday: amount filled in with what's expected (change it to what arrived). */}
      <BottomSheet
        visible={!!logSheet}
        onClose={() => setLogSheet(null)}
        grouped
        header={<SheetBar title="Log payday" onCancel={() => setLogSheet(null)} onDone={saveLoggedPayday} doneLabel="Save" busy={logSaving} />}
      >
        {!!logSheet && (
          <>
            <BigAmount
              label={`What arrived from ${(model.income || []).find((x) => x.id === logSheet.sourceId)?.sourceName || 'this source'}`}
              mark="required"
              value={logSheet.amount}
              onChange={(v) => setLogSheet((l) => (l ? { ...l, amount: v } : l))}
              color={colors.positive}
            />
            <FormGroup>
              <View style={styles.logDateRow}>
                <MarkedLabel text="Date" mark="required" style={styles.logDateLabel} />
                <DateField value={logSheet.date} onChange={(d: string) => setLogSheet((l) => (l ? { ...l, date: d } : l))} style={{ flex: 1, marginBottom: 0 }} />
              </View>
            </FormGroup>
            <MarkedLabel text="WENT INTO" mark="required" style={styles.logSection} />
            <AccountChoices model={model} value={logSheet.pm} onChange={(pm) => setLogSheet((l) => (l ? { ...l, pm } : l))} />
            <ErrorNote text={logError} />
            <View style={{ height: 16 }} />
          </>
        )}
      </BottomSheet>

      {/* Approved "Option 2: simple" form (Forms Redesign canvas). */}
      <BottomSheet
        visible={modalOpen}
        onClose={closeModal}
        grouped
        header={<SheetBar title={editingId ? 'Edit income' : 'New income'} onCancel={closeModal} onDone={handleSave} doneLabel="Save" busy={saving} />}
      >
        <BigAmount mark="optional" label="Expected each payday" value={amountInput} onChange={setAmountInput} color={colors.planned} autoFocus={!editingId} />

        <FormGroup>
          <InputRow mark="optional" label="Source" value={sourceNameInput} onChangeText={setSourceNameInput} placeholder="e.g. ABC Corp" testID="income-source-input" />
          <PickerRow mark="optional" label="Kind" value={categoryInput || 'Choose'} open={openRow === 'kind'} onToggle={() => toggleRow('kind')}>
            <Choices options={CATEGORY_SUGGESTIONS.map((c) => ({ id: c, label: c }))} value={categoryInput as any} onChange={(c) => setCategoryInput(c)} />
            <View style={{ height: 10 }} />
            <OwnChoiceField options={CATEGORY_SUGGESTIONS} value={categoryInput} onChange={setCategoryInput} />
          </PickerRow>
          <PickerRow mark="optional" label="Belongs to" value={personInput || 'Choose'} open={openRow === 'person'} onToggle={() => toggleRow('person')}>
            {model.people.length > 0 && (
              <Choices options={model.people.map((p) => ({ id: p.name, label: p.name }))} value={personInput} onChange={setPersonInput} />
            )}
            <View style={{ height: 10 }} />
            <InlineField label="Or type a name" value={model.people.some((p) => p.name === personInput) ? '' : personInput} onChangeText={setPersonInput} placeholder="e.g. Miguel" />
          </PickerRow>
          <PickerRow mark="required" label="Paid" value={PAY_LABEL[frequencyInput]} open={openRow === 'freq'} onToggle={() => toggleRow('freq')}>
            <Choices options={FREQUENCIES.map((f) => ({ id: f, label: PAY_LABEL[f] }))} value={frequencyInput} onChange={(f) => setFrequencyInput(f as Frequency)} />
          </PickerRow>
          <Guided {...fieldErrors.props('payday')} onShow={() => { if (openRow !== 'payday') toggleRow('payday'); }}>
          <PickerRow mark="required" label={frequencyInput === 'biweekly' ? 'Last payday' : frequencyInput === 'onetime' ? 'Date' : 'Payday'} value={paydayLabel} open={openRow === 'payday'} invalid={fieldErrors.field === 'payday'} onToggle={() => toggleRow('payday')}>
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
          </Guided>
          <Guided {...fieldErrors.props('account')} onShow={() => { if (openRow !== 'account') toggleRow('account'); }}>
          <PickerRow mark="required" label="Goes into" value={accountName(model, depositInput) ?? 'Choose'} dot={depositInput ? paymentMethodColor(model, depositInput) : null} open={openRow === 'account'} invalid={fieldErrors.field === 'account'} onToggle={() => toggleRow('account')}>
            <AccountChoices model={model} value={depositInput} onChange={setDepositInput} />
          </PickerRow>
          </Guided>
        </FormGroup>
        {!!nextPaydayText && <Footnote>{nextPaydayText}</Footnote>}

        <Text style={styles.groupHeader}>Paydays received</Text>
        <Guided {...fieldErrors.props('log')} radius={16}>
        <FormGroup style={fieldErrors.field === 'log' ? { marginBottom: 0, backgroundColor: 'transparent' } : undefined}>
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
        </Guided>
        <Footnote>You can also log a payday from + › Money in › Salary.</Footnote>

        <ErrorNote text={errorMsg} />
        {/* Version 2.2 (W2 everywhere): who added this income, and who last changed it. */}
        {editingId && (() => {
          const src = model?.income.find((x) => x.id === editingId);
          return src ? <WhoFootnote addedBy={src.addedBy} createdAt={src.createdAt} changedBy={src.changedBy} changedAt={src.changedAt} style={{ marginTop: 0, marginBottom: 14 }} /> : null;
        })()}
        {editingId && <Button label="Delete income source" variant="destructive" onPress={handleDelete} />}
      </BottomSheet>
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    heroCard: { backgroundColor: colors.navy3, borderRadius: 20, paddingVertical: 18, paddingHorizontal: 20, marginBottom: 24, overflow: 'hidden' },
    heroLabel: { fontSize: 13, letterSpacing: 0.3, color: colors.inkDim },
    heroAmount: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5, marginTop: 4 },
    heroSub: { fontSize: 13, color: colors.inkDim, marginTop: 4 },
    heroTrack: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 12 },
    groupLabel: { fontSize: 13, fontWeight: '600', letterSpacing: 0.3, color: colors.inkDim, marginLeft: 16, marginBottom: 6 },
    group: { backgroundColor: colors.navy3, borderRadius: 16, overflow: 'hidden', marginBottom: 8 },
    groupFoot: { fontSize: 13, lineHeight: 18, color: colors.inkDim, marginHorizontal: 16, marginBottom: 24 },
    divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    personRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72, paddingVertical: 10, paddingHorizontal: 16 },
    personAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    personInitial: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
    personTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    personAmounts: { fontSize: 14, fontWeight: '700' },
    personTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 6 },
    paydayRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 10, paddingHorizontal: 16 },
    payMark: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    payMarkOpen: { borderWidth: 2, borderStyle: 'dashed' },
    logDateRow: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 16, gap: 12 },
    logDateLabel: { fontSize: 17, color: colors.ink, width: 60 },
    logSection: { fontSize: 13, fontWeight: '600', letterSpacing: 0.3, color: colors.inkDim, marginLeft: 16, marginBottom: 8 },
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    loadingContainer: { alignItems: 'center', justifyContent: 'center' },
    scrollContent: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 40 },
    emptyText: { fontSize: 13, color: colors.inkFaint, marginBottom: 12 },
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
    amountInput: {
      backgroundColor: colors.navy2,
      marginBottom: 10,
    },
    errorText: { fontSize: 13, color: colors.error, marginBottom: 10 },
    paymentLogEntry: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.navy4 },
    paymentLogRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    paymentLogAmountInput: { flex: 1, marginBottom: 0 },
    paymentLogRemoveBtn: { paddingHorizontal: 8, paddingVertical: 6 },
    addPaymentLogButton: {
      alignSelf: 'flex-start',
      paddingVertical: 8,
      paddingHorizontal: 4,
      marginBottom: 14,
    },
    addPaymentLogButtonText: { fontSize: 13, fontWeight: '600', color: colors.gold },
  });
}
