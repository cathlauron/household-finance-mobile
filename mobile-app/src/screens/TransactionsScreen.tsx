import { firstTimeOpen } from '../handledOpen';
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { showLeafTick } from '../components/LeafTick';
import { afterSlide } from '../afterSlide';
import AppSwitch from '../components/AppSwitch';
import { View, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Image, Alert } from 'react-native';
import { Text, TextInput } from '../components/AppText';
import * as ImagePicker from 'expo-image-picker';
import { makeReceiptDataUri } from '../avatars';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { setAutoLockSuppressed } from '../autoLockSuppress';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { PullToRefreshScrollView } from '../PullToRefreshScrollView';
import { usePullDownToOpen } from '../pullDownToOpen';
import { INCOME_KINDS, IncomeKind, incomeKindLabel } from '../incomeKinds';
import AccountPicker, { accountProblem } from '../components/AccountPicker';
import { requestOpenBill } from '../openBillRequest';
import { accountLabel } from '../transactionActions';
import { requestOpenDebt } from '../openDebtRequest';
import { requestOpenLoan } from '../openLoanRequest';
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
import BottomSheet from '../components/BottomSheet';
import { makeId } from '../utils';
import SwipeableRow from '../components/SwipeableRow';
import DateField from '../components/DateField';
import { hapticSelection } from '../haptics';
import AmountInput from '../components/AmountInput';
import { reviewCount } from './ReviewScreen';
import { idsForAccount } from './CardDetailScreen';
import SegmentedControl from '../components/SegmentedControl';
import GradientFill from '../components/GradientFill';
import Guided, { useFieldErrors } from '../components/Guided';

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


const TX_MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatTxMonthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  const name = TX_MONTH_NAMES[parseInt(m, 10) - 1];
  return name ? name + ' ' + y : ym;
}

function todayISO(): string {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

const SOURCE_LABELS: Record<string, string> = { bill: 'Bill', debt: 'Debt', loan: 'Loan', manual: 'Manual' };

function amountColor(direction: string, colors: { positive: string; saving: string; negative: string }): string {
  if (direction === 'in') return colors.positive;
  if (direction === 'saving') return colors.saving;
  return colors.negative;
}

// Redesign: icon tile for each row, tinted by direction.
const DIRECTION_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  in: 'arrow-down',
  out: 'arrow-up',
  saving: 'leaf-outline',
};
function tileBg(direction: string, colors: { okBg: string; errorBg: string; warnBg: string }): string {
  if (direction === 'in') return colors.okBg;
  if (direction === 'saving') return colors.warnBg;
  return colors.errorBg;
}

// Redesign: transactions are shown under date headings (Today, Yesterday, Mon, Oct 12).
// The list is already sorted, so this keeps that order and just starts a new group
// whenever the date changes.
function groupByDate(list: TransactionEntry[]): { date: string; items: TransactionEntry[] }[] {
  const groups: { date: string; items: TransactionEntry[] }[] = [];
  list.forEach((t) => {
    const last = groups[groups.length - 1];
    if (last && last.date === t.date) last.items.push(t);
    else groups.push({ date: t.date, items: [t] });
  });
  return groups;
}
function dayHeading(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff === -1) return 'Tomorrow';
  const sameYear = d.getFullYear() === today.getFullYear();
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
}

// Bill-sourced TransactionEntry ids are built as 'bill-' + cycle.id
// (see transactions.ts). This walks that back to the real Bill it came
// from, so a swipe on the row can jump straight to it.
function findBillIdForTransaction(model: HouseholdModel, txnId: string): string | null {
  const cycleId = txnId.slice(5);
  const bill = (model.bills || []).find((b) => (b.cycles || []).some((c) => c.id === cycleId));
  return bill ? bill.id : null;
}

// Debt-sourced TransactionEntry ids are built as 'debt-' + cycle.id
// (see transactions.ts) — same shape as bills.
function findDebtIdForTransaction(model: HouseholdModel, txnId: string): string | null {
  const cycleId = txnId.slice(5);
  const debt = (model.debts || []).find((d) => (d.cycles || []).some((c) => c.id === cycleId));
  return debt ? debt.id : null;
}

// Loan-sourced TransactionEntry ids are built as 'loan-' + p.id, where p is
// a LoanPayment inside loan.actualPayments (see transactions.ts).
function findLoanIdForTransaction(model: HouseholdModel, txnId: string): string | null {
  const paymentId = txnId.slice(5);
  const loan = (model.loans || []).find((l) => (l.actualPayments || []).some((p) => p.id === paymentId));
  return loan ? loan.id : null;
}

// Income-sourced TransactionEntry ids are built as 'income-' + entry.id,
// where entry is a PaymentLogEntry inside source.paymentLog (see transactions.ts).
function findIncomeSourceIdForTransaction(model: HouseholdModel, txnId: string): string | null {
  const entryId = txnId.slice(7);
  const source = (model.income || []).find((s) => (s.paymentLog || []).some((e) => e.id === entryId));
  return source ? source.id : null;
}

// Savings-sourced TransactionEntry ids are built as 'saving-' + c.id, where c
// is a SavingsContribution inside goal.contributions (see transactions.ts).
function findSavingsGoalIdForTransaction(model: HouseholdModel, txnId: string): string | null {
  const contribId = txnId.slice(7);
  const goal = (model.savingsGoals || []).find((g) => (g.contributions || []).some((c) => c.id === contribId));
  return goal ? goal.id : null;
}

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const { model, saveModel } = useData();
  const navigation = useNavigation();
  // Pull the list down from the top to open Search (like the iPhone).
  const pullToSearch = usePullDownToOpen(() => (navigation as any).navigate('Search'));
  const route = useRoute<any>();
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [monthSheetOpen, setMonthSheetOpen] = useState(false);
  const filterNonce = route.params?.filterNonce;
  // Redesign: "See all" on a Card page filters to that card ({ accountFilter }).
  const [accountFilter, setAccountFilter] = useState<{ key: string; name: string } | null>(null);
  useEffect(() => {
    const p = route.params;
    if (p?.categoryFilter && p?.monthFilter) {
      setCategoryFilter(p.categoryFilter);
      setMonthFilter(p.monthFilter);
    }
    if (p?.accountFilter) {
      setAccountFilter({ key: p.accountFilter, name: p.accountFilterName ?? 'This card' });
      setMonthFilter('all');
    }
  }, [filterNonce]);
  // Redesign: the floating + button opens this tab with { addNonce } to show the
  // "New transaction" sheet straight away.
  const addNonce = route.params?.addNonce;
  useEffect(() => {
    if (addNonce) openAddModal();
  }, [addNonce]);
  // Redesign: search button in the title bar (opens Search).
  React.useLayoutEffect(() => {
    // Version 2.1 (S9): the two icons sit on the "Transactions" title line, not the empty row above.
    navigation.setOptions({
      headerTitleRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
          {/* Redesign: repeating transactions (Recurring page). */}
          <TouchableOpacity
            testID="transactions-recurring"
            onPress={() => (navigation as any).navigate('Recurring')}
            accessibilityRole="button"
            accessibilityLabel="Recurring transactions"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="repeat" size={24} color={colors.gold} />
          </TouchableOpacity>
          <TouchableOpacity
            testID="transactions-search"
            onPress={() => (navigation as any).navigate('Search')}
            accessibilityRole="button"
            accessibilityLabel="Search"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="search" size={22} color={colors.gold} />
          </TouchableOpacity>
        </View>
      ),
    } as any);
  }, [navigation, colors.gold]);
  // Redesign: the Transaction page's "Edit" comes back here with { editId } to open the form.
  const editNonce = route.params?.editNonce;
  useEffect(() => {
    const editId = route.params?.editId;
    if (!editNonce || !editId || !model) return;
    const t = buildTransactionsList(model).find((x) => x.rawId === editId && x.source === 'manual');
    if (t && firstTimeOpen('txn', editId, editNonce)) afterSlide(() => openEditModal(t));
  }, [editNonce]);
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      setCategoryFilter(null);
      setAccountFilter(null);
    });
    return unsubscribe;
  }, [navigation]);
  const styles = makeStyles(colors);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [amountInput, setAmountInput] = useState<number | ''>('');
  const [dateInput, setDateInput] = useState('');
  const [directionInput, setDirectionInput] = useState<'out' | 'in' | 'saving'>('out');
  // Money in: "What is it?" (Salary logs a payday on an Income source).
  const [incomeKindInput, setIncomeKindInput] = useState<IncomeKind | null>(null);
  const [incomeSourceIdInput, setIncomeSourceIdInput] = useState<string | null>(null);
  const salaryEntry = !editingId && directionInput === 'in' && incomeKindInput === 'salary';
  // Version 2.1: tapping Add with something missing takes the person straight to it.
  const fieldErrors = useFieldErrors<'salary' | 'amount' | 'label' | 'date' | 'account' | 'refund'>();
  const clearFieldError = fieldErrors.clear;
  const amountRef = useRef<{ focus: () => void }>(null);
  const labelRef = useRef<any>(null);
  const [refundTrackingEnabled, setRefundTrackingEnabled] = useState(false);
  const [refundAmountInput, setRefundAmountInput] = useState<number | ''>('');
  const [receiptPhoto, setReceiptPhoto] = useState<string | null>(null);
  const [personInput, setPersonInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [paymentMethodInput, setPaymentMethodInput] = useState<PaymentMethod | undefined>(undefined);
  // Version 3 (approved K5): split a credit card purchase into 3, 6 or 12 payments (0 = no).
  const [installmentsInput, setInstallmentsInput] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // Redesign: quick-add sheet extras.
  const [moreOpen, setMoreOpen] = useState(false);
  const [ruleFilled, setRuleFilled] = useState(false);
  const transactions = useMemo(() => {
    if (!model) return [];
    let list = buildTransactionsList(model);
    if (monthFilter !== 'all') {
      list = list.filter((t) => t.date.startsWith(monthFilter));
    }
    if (categoryFilter) {
      list = list.filter((t) => t.direction === 'out' && t.category === categoryFilter);
    }
    if (accountFilter) {
      const [g, id] = accountFilter.key.split(':');
      const ids = idsForAccount(model, g as any, id);
      list = list.filter((t) => ids.has(t.rawId ?? t.id) || ids.has(t.id));
    }
    return sortTransactions(list, sortOrder);
  }, [model, sortOrder, categoryFilter, monthFilter, accountFilter]);

  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    if (model) {
      for (const t of buildTransactionsList(model)) {
        if (t.date && t.date.length >= 7) months.add(t.date.slice(0, 7));
      }
    }
    if (monthFilter !== 'all') months.add(monthFilter);
    return Array.from(months).sort().reverse();
  }, [model, monthFilter]);

  const totals = useMemo(() => transactionTotals(transactions), [transactions]);
  const editingRawTxn = editingId ? (model?.manualTransactions || []).find((m) => m.id === editingId) : undefined;
  const alreadyRefunded = !!editingRawTxn?.refundTransactionId;

  // The red message goes away as soon as the person changes something.
  useEffect(() => {
    clearFieldError();
  }, [amountInput, labelInput, dateInput, paymentMethodInput, incomeSourceIdInput, directionInput, incomeKindInput, modalOpen, clearFieldError]);

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
    setIncomeKindInput(null);
    setIncomeSourceIdInput(null);
    setRefundTrackingEnabled(false);
    setRefundAmountInput('');
    setReceiptPhoto(null);
    setPersonInput('');
    setNotesInput('');
    setTagsInput('');
    setPaymentMethodInput(undefined);
    setInstallmentsInput(0);
    setErrorMsg('');
  }

  function openAddModal() {
    setMoreOpen(false);
    setRuleFilled(false);
    setEditingId(null);
    resetForm();
    setModalOpen(true);
  }

  function openEditModal(t: TransactionEntry) {
    if (t.source !== 'manual' || !t.rawId) return;
    const raw = (model?.manualTransactions || []).find((m) => m.id === t.rawId);
    if (!raw) return;
    setEditingId(raw.id);
    setRuleFilled(false);
    setMoreOpen(!!(raw.tags?.length || raw.receiptPhoto || (raw.owner && raw.owner !== 'shared')));
    setLabelInput(raw.label || '');
    setCategoryInput(raw.category || '');
    setPersonInput(personName(model?.people || [], raw.owner || ''));
    setNotesInput(raw.notes || '');
    setTagsInput((raw.tags || []).join(', '));
    setAmountInput(typeof raw.amount === 'number' ? raw.amount : '');
    setDateInput(raw.date || todayISO());
    setDirectionInput((raw.direction as 'out' | 'in' | 'saving') || 'out');
    setIncomeKindInput(raw.incomeKind ?? null);
    setIncomeSourceIdInput(null);
    setRefundTrackingEnabled(typeof raw.refundExpectedAmount === 'number' && !raw.refundTransactionId);
    setRefundAmountInput(typeof raw.refundExpectedAmount === 'number' ? raw.refundExpectedAmount : '');
    setReceiptPhoto(raw.receiptPhoto || null);
    setPaymentMethodInput(raw.paymentMethod);
    setInstallmentsInput(raw.installments ?? 0);
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
    const amt = typeof amountInput === 'number' ? amountInput : NaN;
    const auto = computeAutoCategory(model, text, amt);
    if (auto) { setCategoryInput(auto); setRuleFilled(true); }
  }

  function handleAmountChange(val: number | '') {
    setAmountInput(val);
    if (!model || categoryInput.trim()) return;
    const auto = computeAutoCategory(model, labelInput, val === '' ? NaN : val);
    if (auto) { setCategoryInput(auto); setRuleFilled(true); }
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
        quality: 1,
      });
      if (result.canceled || !result.assets || !result.assets[0]) return;
      const asset = result.assets[0];
      // Shrunk before it's kept: a full-size photo could stop the household from syncing.
      try {
        setReceiptPhoto(await makeReceiptDataUri(asset.uri, asset.width));
      } catch (e: any) {
        Alert.alert("Couldn't add that photo", e?.message || 'Try picking a different one.');
      }
    } finally {
      setAutoLockSuppressed(false);
    }
  }

  function handleRemoveReceipt() {
    setReceiptPhoto(null);
  }

  // Money in › Salary: logs a payday on the chosen Income source (the same as logging
  // it on the Income page), into the chosen account.
  async function saveSalary() {
    if (!model) return;
    const source = (model.income || []).find((s) => s.id === incomeSourceIdInput);
    setErrorMsg('');
    if (!source) {
      fieldErrors.show('salary', 'Pick which salary this is.');
      return;
    }
    if (amountInput === '' || amountInput <= 0) {
      fieldErrors.show('amount', 'How much was it?');
      return;
    }
    const trimmedDate = dateInput.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
      fieldErrors.show('date', 'Pick a date.');
      return;
    }
    const acctProblem = accountProblem(model, 'in', amountInput, paymentMethodInput);
    if (acctProblem) {
      fieldErrors.show('account', acctProblem);
      return;
    }
    const entry = { id: makeId('paylog'), date: trimmedDate, amount: amountInput, paymentMethod: paymentMethodInput, createdAt: Date.now() };
    const updated: HouseholdModel = {
      ...model,
      income: (model.income || []).map((s) => (s.id === source.id ? { ...s, paymentLog: [entry, ...(s.paymentLog || [])] } : s)),
    };
    setSaving(true);
    try {
      await saveModel(updated);
      showLeafTick('Added');
      closeModal();
    } catch (e) {
      setErrorMsg('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!model) return;
    if (!editingId && directionInput === 'in' && incomeKindInput === 'salary') return saveSalary();
    // Extra income with no description gets the kind's name (e.g. "Bonus").
    const extraKind = directionInput === 'in' && incomeKindInput && incomeKindInput !== 'salary' ? incomeKindInput : undefined;
    const trimmedLabel = labelInput.trim() || (extraKind ? incomeKindLabel(extraKind) : '');
    setErrorMsg('');
    // Checked top to bottom, the same order as the form.
    if (amountInput === '' || amountInput <= 0) {
      fieldErrors.show('amount', 'How much was it?');
      return;
    }
    if (!trimmedLabel) {
      fieldErrors.show('label', 'What was it for?');
      return;
    }
    const parsedAmount = amountInput;
    const acctProblem = accountProblem(model, directionInput, parsedAmount, paymentMethodInput, editingId);
    if (acctProblem) {
      fieldErrors.show('account', acctProblem);
      return;
    }
    const trimmedDate = dateInput.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
      fieldErrors.show('date', 'Pick a date.');
      return;
    }

    const refundAmountToSave =
      directionInput === 'out' && refundTrackingEnabled && typeof refundAmountInput === 'number' && refundAmountInput > 0
        ? refundAmountInput
        : undefined;
    // Version 2.1 (Cath): a refund is the full amount or part of it, never more.
    if (directionInput === 'out' && refundTrackingEnabled && !alreadyRefunded) {
      if (refundAmountToSave === undefined) {
        fieldErrors.show('refund', 'How much are you getting back?');
        return;
      }
      if (refundAmountToSave > parsedAmount) {
        fieldErrors.show('refund', `A refund can't be more than the ${formatPeso(parsedAmount)} paid.`);
        return;
      }
    }

    // Only a credit card purchase can be split into payments.
    const installmentsToSave = directionInput === 'out' && paymentMethodInput?.type === 'credit' && installmentsInput > 1 ? installmentsInput : undefined;
    const { people: peopleWithPerson, personId } = findOrCreatePerson(model.people, personInput);
    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

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
            category: categoryInput.trim() || (extraKind && extraKind !== 'other' ? incomeKindLabel(extraKind) : ''),
            notes: notesInput.trim(),
            tags: parsedTags.length > 0 ? parsedTags : undefined,
            paymentMethod: paymentMethodInput,
          };
        if (extraKind) next.incomeKind = extraKind;
        else delete next.incomeKind;
        if (installmentsToSave) next.installments = installmentsToSave;
        else delete next.installments;
        // Saving an edit counts as checking it.
        delete next.needsReview;
        delete next.reviewWhy;
        if (receiptPhoto) {
          next.receiptPhoto = receiptPhoto;
        } else {
          delete next.receiptPhoto;
        }
        if (directionInput === 'out' && !t.refundTransactionId) {
          if (refundAmountToSave !== undefined) {
            next.refundExpectedAmount = refundAmountToSave;
          } else {
            delete next.refundExpectedAmount;
          }
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
          category: categoryInput.trim() || (extraKind && extraKind !== 'other' ? incomeKindLabel(extraKind) : ''),
          notes: notesInput.trim(),
          ...(extraKind ? { incomeKind: extraKind, createdAt: Date.now() } : {}),
          ...(parsedTags.length > 0 ? { tags: parsedTags } : {}),
          paymentMethod: paymentMethodInput,
          ...(receiptPhoto ? { receiptPhoto } : {}),
          ...(refundAmountToSave !== undefined ? { refundExpectedAmount: refundAmountToSave } : {}),
          ...(installmentsToSave ? { installments: installmentsToSave } : {}),
          ...(ruleFilled && categoryInput.trim() ? { needsReview: true, reviewWhy: 'Filled in by your rule' } : {}),
        };
      updated.manualTransactions = [...updated.manualTransactions, newTxn];
    }

    setSaving(true);
    try {
      await saveModel(updated);
      showLeafTick(editingId ? 'Saved' : 'Added');
      closeModal();
    } catch (e) {
      setErrorMsg('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function performDelete() {
    if (!editingId || !model) return;
    const deletedTxn = (model.manualTransactions || []).find((t) => t.id === editingId);
    const updated: HouseholdModel = {
      ...model,
      manualTransactions: (model.manualTransactions || [])
        .filter((t) => t.id !== editingId)
        .filter((t) => !(deletedTxn?.refundTransactionId && t.id === deletedTxn.refundTransactionId)),
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
      'Delete this transaction?',
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: performDelete },
      ]
    );
  }

  async function performDeleteTxnById(id: string) {
    if (!model) return;
    const deletedTxn = (model.manualTransactions || []).find((t) => t.id === id);
    const updated: HouseholdModel = {
      ...model,
      manualTransactions: (model.manualTransactions || [])
        .filter((t) => t.id !== id)
        .filter((t) => !(deletedTxn?.refundTransactionId && t.id === deletedTxn.refundTransactionId)),
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

  function handleSwipeDelete(rawId: string) {
    Alert.alert(
      'Delete this transaction?',
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => performDeleteTxnById(rawId) },
      ]
    );
  }

  // Marks a pending refund as received: creates a real, linked "money in" transaction for the
  // amount expected back, and stamps refundTransactionId on the original expense so we know
  // it's been resolved. Mirrors reconcileTravelChecklistTransactions / reconcileEventTransaction.

  // Undoes a "marked received" refund: removes the linked income transaction it created, and
  // clears refundTransactionId so it goes back to showing as Pending.

  return (
    <SafeAreaView style={styles.container}>
      <PullToRefreshScrollView contentContainerStyle={styles.scrollContent} refreshControl={pullToSearch}>
        {/* Redesign: filter chips (month, newest/oldest, category) */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            testID="transactions-month-filter"
            style={[styles.filterChip, monthFilter !== 'all' && styles.filterChipOn]}
            onPress={() => setMonthSheetOpen(true)}
            accessibilityRole="button"
          >
            <GradientFill match={[styles.filterChip, monthFilter !== 'all' && styles.filterChipOn]} />
            <Text style={[styles.filterChipText, monthFilter !== 'all' && styles.filterChipTextOn]}>
              {monthFilter === 'all' ? 'All time' : formatTxMonthLabel(monthFilter)}
            </Text>
            <Ionicons name="chevron-down" size={14} color={monthFilter !== 'all' ? colors.gold : colors.inkDim} />
          </TouchableOpacity>
          <TouchableOpacity
            testID="transactions-sort"
            style={styles.filterChip}
            onPress={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
            accessibilityRole="button"
            accessibilityLabel={`Sorted ${sortOrder} first. Tap to switch.`}
          >
            <GradientFill match={styles.filterChip} />
            <Text style={styles.filterChipText}>{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</Text>
            <Ionicons name="swap-vertical" size={14} color={colors.inkDim} />
          </TouchableOpacity>
          {accountFilter && (
            <TouchableOpacity
              style={[styles.filterChip, styles.filterChipOn]}
              onPress={() => setAccountFilter(null)}
              accessibilityRole="button"
              accessibilityLabel={`Showing ${accountFilter.name} only. Tap to clear.`}
            >
              <GradientFill match={[styles.filterChip, styles.filterChipOn]} />
              <Text style={[styles.filterChipText, styles.filterChipTextOn]}>{accountFilter.name}</Text>
              <Ionicons name="close-circle" size={15} color={colors.gold} />
            </TouchableOpacity>
          )}
          {categoryFilter && (
            <TouchableOpacity
              style={[styles.filterChip, styles.filterChipOn]}
              onPress={() => setCategoryFilter(null)}
              accessibilityRole="button"
              accessibilityLabel={`Showing ${categoryFilter} only. Tap to clear.`}
            >
              <GradientFill match={[styles.filterChip, styles.filterChipOn]} />
              <Text style={[styles.filterChipText, styles.filterChipTextOn]}>{categoryFilter}</Text>
              <Ionicons name="close-circle" size={15} color={colors.gold} />
            </TouchableOpacity>
          )}
        </View>

        {/* Redesign: "To review" card (spending whose category wasn't picked by hand). */}
        {reviewCount(model) > 0 && (
          <TouchableOpacity
            testID="transactions-review"
            style={[styles.group, styles.reviewCard]}
            onPress={() => (navigation as any).navigate('Review')}
            accessibilityRole="button"
          >
            <GradientFill match={[styles.group, styles.reviewCard]} />
            <View style={[styles.tile, { backgroundColor: colors.accentTint }]}>
              <GradientFill match={[styles.tile, { backgroundColor: colors.accentTint }]} />
              <Ionicons name="checkmark-done-outline" size={17} color={colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.txnLabel}>To review</Text>
              <Text style={styles.txnSub}>
                {reviewCount(model)} {reviewCount(model) === 1 ? 'needs' : 'need'} a quick look
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
          </TouchableOpacity>
        )}

        {/* Redesign: In / Out summary (just totals; Income is reached from Accounts). */}
        <View style={[styles.group, styles.summary]}>
          <GradientFill match={[styles.group, styles.summary]} />
          <View style={styles.summaryCell} accessible accessibilityLabel={`Money in, ${formatPeso(totals.totalIn)}`}>
            <Text style={styles.summaryLabel}>In</Text>
            <Text style={[styles.summaryAmount, { color: colors.positive }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>+{formatPeso(totals.totalIn)}</Text>
          </View>
          <View style={[styles.summaryCell, styles.summaryDivider]}>
            <Text style={styles.summaryLabel}>Out</Text>
            <Text style={[styles.summaryAmount, { color: colors.negative }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>−{formatPeso(totals.totalOut)}</Text>
          </View>
        </View>

        <BottomSheet visible={monthSheetOpen} onClose={() => setMonthSheetOpen(false)} title="Filter by month">
          <TouchableOpacity
            onPress={() => {
              hapticSelection();
              setMonthFilter('all');
              setMonthSheetOpen(false);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: colors.navy4,
            }}
          >
            <Text style={{ fontSize: 15, color: colors.ink }}>All time</Text>
            {monthFilter === 'all' && <Ionicons name="checkmark" size={20} color={colors.gold} />}
          </TouchableOpacity>
          {monthOptions.map((ym) => (
            <TouchableOpacity
              key={ym}
              onPress={() => {
                hapticSelection();
                setMonthFilter(ym);
                setMonthSheetOpen(false);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: colors.navy4,
              }}
            >
              <Text style={{ fontSize: 15, color: colors.ink }}>{formatTxMonthLabel(ym)}</Text>
              {monthFilter === ym && <Ionicons name="checkmark" size={20} color={colors.gold} />}
            </TouchableOpacity>
          ))}
        </BottomSheet>

        {transactions.length === 0 && (
          <Text style={styles.emptyText}>Nothing recorded yet.</Text>
        )}

        {groupByDate(transactions).map((day) => (
        <View key={day.date} style={styles.daySection}>
        <Text style={styles.dayHeader}>{dayHeading(day.date)}</Text>
        <View style={styles.group}>
          <GradientFill match={styles.group} />
        {day.items.map((t: TransactionEntry, rowIndex: number) => {
          const isManual = t.source === 'manual';
          const rawManual = isManual ? (model.manualTransactions || []).find((m) => m.id === t.rawId) : undefined;
          const refundExpected = rawManual?.refundExpectedAmount;
          const isRefundPending = typeof refundExpected === 'number' && !rawManual?.refundTransactionId;
          const isRefundReceived = typeof refundExpected === 'number' && !!rawManual?.refundTransactionId;
          const billId = t.source === 'bill' ? findBillIdForTransaction(model, t.id) : null;
          const debtId = t.source === 'debt' ? findDebtIdForTransaction(model, t.id) : null;
          const loanId = t.source === 'loan' ? findLoanIdForTransaction(model, t.id) : null;
          const incomeSourceId = t.source === 'income' ? findIncomeSourceIdForTransaction(model, t.id) : null;
          const savingsGoalId = t.source === 'saving' ? findSavingsGoalIdForTransaction(model, t.id) : null;
          const viewAction = billId
            ? {
                label: 'View Bill',
                icon: 'receipt-outline' as const,
                onPress: () => {
                  requestOpenBill(billId);
                  navigation.navigate('To-Pay' as never);
                },
              }
            : debtId
            ? {
                label: 'View Debt',
                icon: 'card-outline' as const,
                onPress: () => {
                  requestOpenDebt(debtId);
                  navigation.navigate('To-Pay' as never);
                },
              }
            : loanId
            ? {
                label: 'View Loan',
                icon: 'business-outline' as const,
                onPress: () => {
                  requestOpenLoan(loanId);
                  navigation.navigate('To-Pay' as never);
                },
              }
            : incomeSourceId
            ? {
                label: 'View Income',
                icon: 'cash-outline' as const,
                onPress: () => {
                  (navigation as any).navigate('Income', {
                    openIncomeId: incomeSourceId,
                    openIncomeNonce: Date.now(),
                  });
                },
              }
            : savingsGoalId
            ? {
                label: 'View Goal',
                icon: 'trending-up-outline' as const,
                onPress: () => {
                  (navigation as any).navigate('Savings', {
                    openSavingsId: savingsGoalId,
                    openSavingsNonce: Date.now(),
                  });
                },
              }
            : undefined;
          return (
            <SwipeableRow
              key={t.id}
              enabled={(isManual && Boolean(model.settings.swipeToDeleteEnabled)) || Boolean(viewAction)}
              onDelete={() => handleSwipeDelete(t.rawId as string)}
              viewAction={viewAction}
              testID={`txn-swipe-${t.id}`}
              flat
            >
            <TouchableOpacity
              testID={`txn-row-${t.id}`}
              style={[styles.txnRow, rowIndex > 0 && styles.txnRowDivider]}
              activeOpacity={0.6}
              onPress={() => (navigation as any).navigate('TransactionDetail', { id: t.id })}
              accessibilityRole="button"
              accessibilityLabel={`${t.label}, ${t.direction === 'in' ? 'plus' : 'minus'} ${formatPeso(t.amount)}, ${t.category}`}
            >
              <GradientFill match={[styles.txnRow, rowIndex > 0 && styles.txnRowDivider]} />
              <View style={[styles.tile, { backgroundColor: tileBg(t.direction, colors) }]}>
                <Ionicons name={DIRECTION_ICON[t.direction] ?? 'swap-vertical'} size={17} color={amountColor(t.direction, colors)} />
              </View>
              <View style={styles.txnMain}>
                <Text style={styles.txnLabel} numberOfLines={1}>{t.label}</Text>
                <Text style={styles.txnSub} numberOfLines={1}>
                  {[t.category, rawManual ? accountLabel(model, rawManual.paymentMethod) : SOURCE_LABELS[t.source]].filter(Boolean).join(' · ')}
                  {isRefundPending ? ' · Refund pending' : ''}
                  {isRefundReceived ? ' · Refunded' : ''}
                </Text>
              </View>
              <Text style={[styles.txnAmount, { color: amountColor(t.direction, colors) }]}>
                {t.direction === 'in' ? '+' : t.direction === 'saving' ? '' : '−'}{formatPeso(t.amount)}
              </Text>
            </TouchableOpacity>
            </SwipeableRow>
          );
        })}
        </View>
        </View>
        ))}

        {/* Redesign: adding is done with the floating + button; importing a spreadsheet
            moved to Settings › Backup & Data. */}
      </PullToRefreshScrollView>

      <CsvImportModal visible={csvModalOpen} onClose={() => setCsvModalOpen(false)} />

      {/* Redesign: the quick "New transaction" sheet from the Finance Flow mockup:
          Cancel / title / Add bar, Money out-in switch, big amount, then Description,
          Category, Note, Account, Date and Expecting a refund. Less-used fields
          (Belongs to, Tags, Receipt) sit under "More details". */}
      <BottomSheet
        visible={modalOpen}
        onClose={closeModal}
        header={
          <View style={styles.sheetBar}>
            <TouchableOpacity onPress={closeModal} accessibilityRole="button" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.sheetBarBtn}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.sheetBarTitle}>{editingId ? 'Edit transaction' : 'New transaction'}</Text>
            <TouchableOpacity testID="txn-save" onPress={handleSave} disabled={saving} accessibilityRole="button" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              {saving ? <ActivityIndicator color={colors.gold} /> : <Text style={[styles.sheetBarBtn, { fontWeight: '700' }]}>{editingId ? 'Save' : 'Add'}</Text>}
            </TouchableOpacity>
          </View>
        }
      >
        <SegmentedControl<'out' | 'in' | 'saving'>
          accessibilityLabel="Direction"
          options={[
            { id: 'out', label: 'Money out' },
            { id: 'in', label: 'Money in' },
            ...(directionInput === 'saving' ? [{ id: 'saving' as const, label: 'Saved' }] : []),
          ]}
          value={directionInput}
          onChange={setDirectionInput}
        />

        <Guided {...fieldErrors.props('amount')} focusRef={amountRef} inset={false} radius={22}>
          <AmountInput
            autoFocus={!editingId}
            centered
            focusRef={amountRef}
            style={styles.bigAmountWrap}
            inputStyle={[styles.bigAmountInput, { color: fieldErrors.field === 'amount' ? colors.error : amountColor(directionInput, colors) }]}
            value={amountInput}
            onChangeAmount={handleAmountChange}
          />
        </Guided>

        {/* Trip items and savings have their own places, so they aren't counted twice. */}
        {directionInput === 'out' && !editingId && (
          <Text style={[styles.formFooter, { textAlign: 'center' }]}>Paid for something on a trip checklist? Tick it on Travel instead. Adding to savings? Do it from the pot's page.</Text>
        )}

        {directionInput === 'in' && (
          <>
            <Text style={styles.inputLabel}>What is it?</Text>
            <View style={styles.chipRow}>
              {INCOME_KINDS.filter((k) => k.id !== 'salary' || !editingId).map((k) => {
                const on = incomeKindInput === k.id;
                return (
                  <TouchableOpacity
                    key={k.id}
                    testID={`txn-kind-${k.id}`}
                    style={[styles.chip, on && { backgroundColor: colors.accentTint }]}
                    onPress={() => { setIncomeKindInput(on ? null : k.id); setErrorMsg(''); }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <Text style={[styles.chipText, on && { color: colors.gold }]}>{k.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {incomeKindInput === 'salary' && !editingId && (
              (model.income || []).length === 0 ? (
                <Text style={styles.formFooter}>Add your salary on the Income page first (Home › Wallet › Add account › Income).</Text>
              ) : (
                <Guided {...fieldErrors.props('salary')} inset={false} radius={12}>
                  <Text style={[styles.inputLabel, fieldErrors.field === 'salary' && { color: colors.error, fontWeight: '700' }]}>Which salary?</Text>
                  <View style={styles.chipRow}>
                    {(model.income || []).map((src) => {
                      const on = incomeSourceIdInput === src.id;
                      const who = personName(model.people || [], src.personId);
                      return (
                        <TouchableOpacity
                          key={src.id}
                          style={[styles.chip, on && { backgroundColor: colors.accentTint }]}
                          onPress={() => {
                            setIncomeSourceIdInput(src.id);
                            setErrorMsg('');
                            if (amountInput === '' && typeof src.expectedAmount === 'number') setAmountInput(src.expectedAmount);
                            if (!paymentMethodInput && src.depositTo) setPaymentMethodInput(src.depositTo);
                          }}
                          accessibilityRole="button"
                          accessibilityState={{ selected: on }}
                        >
                          <Text style={[styles.chipText, on && { color: colors.gold }]}>{src.sourceName || src.category || 'Salary'}{who ? ` · ${who}` : ''}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={styles.formFooter}>This logs the payday on the Income page, so it replaces the expected one instead of counting twice.</Text>
                </Guided>
              )
            )}
          </>
        )}

        {!salaryEntry && (
        <View style={styles.formGroup}>
          <Guided {...fieldErrors.props('label')} focusRef={labelRef}>
          <View style={styles.formRow}>
            <Text style={[styles.formLabel, fieldErrors.field === 'label' && { color: colors.error, fontWeight: '700' }]}>Description</Text>
            <TextInput
              ref={labelRef}
              testID="txn-label-input"
              style={styles.formInput}
              placeholder="e.g. SM Hypermarket"
              placeholderTextColor={colors.inkFaint}
              value={labelInput}
              onChangeText={handleLabelChange}
            />
          </View>
          </Guided>
          <View style={[styles.formRow, styles.formRowLine]}>
            <Text style={styles.formLabel}>Category</Text>
            <TextInput
              style={styles.formInput}
              placeholder="e.g. Groceries"
              placeholderTextColor={colors.inkFaint}
              value={categoryInput}
              onChangeText={(t) => { setCategoryInput(t); setRuleFilled(false); }}
            />
          </View>
          <View style={[styles.formRow, styles.formRowLine]}>
            <Text style={styles.formLabel}>Note</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Optional"
              placeholderTextColor={colors.inkFaint}
              value={notesInput}
              onChangeText={setNotesInput}
            />
          </View>
        </View>
        )}
        {ruleFilled && !!categoryInput && (
          <Text style={styles.formFooter}>Category was filled in by one of your rules.</Text>
        )}

        <View style={{ marginTop: 20 }}>
          {/* Redesign: the account is required. Money out can't overdraw cash or debit. */}
          <Guided {...fieldErrors.props('account')} inset={false} radius={12}>
            <AccountPicker
              model={model}
              direction={directionInput}
              amount={amountInput}
              value={paymentMethodInput}
              onChange={setPaymentMethodInput}
              excludeTxnId={editingId}
            />
          </Guided>
          {/* Version 3 (approved K5): only when Paid with is a credit card. */}
          {directionInput === 'out' && paymentMethodInput?.type === 'credit' && (() => {
            const card = model.balanceAccounts.credit.find((a) => a.id === paymentMethodInput.accountId);
            const per = typeof amountInput === 'number' && installmentsInput > 1 ? Math.round((amountInput / installmentsInput) * 100) / 100 : 0;
            return (
              <View style={[styles.formGroup, { marginTop: -4, marginBottom: 14 }]}>
                <View style={[styles.formRow, { justifyContent: 'space-between' }]}>
                  <Text style={styles.formLabel}>Split into payments</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {[0, 3, 6, 12].map((n) => {
                      const on = installmentsInput === n;
                      return (
                        <TouchableOpacity
                          key={n}
                          onPress={() => { hapticSelection(); setInstallmentsInput(n); }}
                          style={{ minWidth: 40, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, alignItems: 'center', backgroundColor: on ? colors.buttonFill : colors.navy4 }}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: on }}
                          accessibilityLabel={n === 0 ? 'No split' : `${n} payments`}
                          testID={`txn-installments-${n}`}
                        >
                          <Text style={{ fontSize: 15, fontWeight: '700', color: on ? colors.onButton : colors.ink }}>{n === 0 ? 'No' : n}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
                {installmentsInput > 1 && (
                  <Text style={[styles.formFooter, { marginBottom: 8 }]}>
                    {per > 0 ? `${formatPeso(per)} a month for ${installmentsInput} months on ${card?.name || 'this card'}. ` : ''}Your spending counts the whole amount today.
                  </Text>
                )}
              </View>
            );
          })()}
        </View>

        <Guided {...fieldErrors.props('date')} inset={false} radius={12}>
          <DateField
            label="Date"
            value={dateInput}
            onChange={setDateInput}
            testID="txn-date-field"
          />
        </Guided>

        {directionInput === 'out' && !alreadyRefunded && (
          <View style={[styles.formGroup, { marginTop: 4 }]}>
            <View style={styles.formRow}>
              <Text style={[styles.formLabel, { flex: 1 }]}>Expecting a refund</Text>
              <AppSwitch
                value={refundTrackingEnabled}
                onValueChange={(v) => { hapticSelection(); setRefundTrackingEnabled(v); }}
                trackColor={{ true: colors.gold, false: colors.navy4 }}
                accessibilityLabel="Expecting a refund"
              />
            </View>
            {refundTrackingEnabled && (
              <Guided {...fieldErrors.props('refund')}>
                <View style={[styles.formRow, styles.formRowLine]}>
                  <Text style={[styles.formLabel, fieldErrors.field === 'refund' && { color: colors.error, fontWeight: '700' }]}>Amount back</Text>
                  <AmountInput
                    autoFocus={!refundAmountInput}
                    style={styles.inlineAmount}
                    value={refundAmountInput}
                    onChangeAmount={(v) => {
                      setRefundAmountInput(v);
                      if (fieldErrors.field === 'refund') clearFieldError();
                    }}
                  />
                </View>
                {typeof amountInput === 'number' && amountInput > 0 && (() => {
                  // A refund is the full amount or part of it: more than was paid turns this red.
                  const over = typeof refundAmountInput === 'number' && refundAmountInput > amountInput;
                  return (
                    <Text style={[styles.formFooter, { marginTop: 4 }, over && { color: colors.error, fontWeight: '700' }]}>
                      {over ? `Too much: a refund can be up to ${formatPeso(amountInput)}, the full amount.` : `Up to ${formatPeso(amountInput)}, the full amount.`}
                    </Text>
                  );
                })()}
              </Guided>
            )}
          </View>
        )}
        {directionInput === 'out' && alreadyRefunded && (
          <Text style={styles.formFooter}>Already marked as refunded. Undo it on the transaction's page to change the amount.</Text>
        )}

        {!salaryEntry && (
        <TouchableOpacity style={styles.moreToggle} onPress={() => setMoreOpen((v) => !v)} accessibilityRole="button">
          <Text style={styles.moreToggleText}>More details</Text>
          <Ionicons name={moreOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.gold} />
        </TouchableOpacity>
        )}
        {moreOpen && !salaryEntry && (
          <>
            <Text style={styles.inputLabel}>Belongs to</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Miguel, Ana"
              placeholderTextColor={colors.inkFaint}
              value={personInput}
              onChangeText={setPersonInput}
            />
            {model.people.length > 0 && (
              <View style={styles.chipRow}>
                {model.people.map((p) => (
                  <TouchableOpacity key={p.id} style={styles.chip} onPress={() => setPersonInput(p.name)}>
                    <Text style={styles.chipText}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <Text style={styles.inputLabel}>Tags</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. vacation, tax-deductible"
              placeholderTextColor={colors.inkFaint}
              value={tagsInput}
              onChangeText={setTagsInput}
            />
            <Text style={styles.formFooter}>Separate tags with commas.</Text>
            <Text style={[styles.inputLabel, { marginTop: 14 }]}>Receipt photo</Text>
            {receiptPhoto ? (
              <View style={styles.receiptPreviewWrap}>
                <Image source={{ uri: receiptPhoto }} style={styles.receiptThumb} />
                <TouchableOpacity style={styles.receiptRemoveButton} onPress={handleRemoveReceipt}>
                  <Text style={styles.receiptRemoveButtonText}>Remove photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.receiptPickButton} onPress={handlePickReceipt}>
                <Ionicons name="attach-outline" size={16} color={colors.gold} style={{ marginRight: 6 }} />
                <Text style={styles.receiptPickButtonText}>Attach receipt</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

        {editingId && (
          <TouchableOpacity style={[styles.formGroup, styles.deleteRow]} onPress={handleDelete} accessibilityRole="button">
            <Text style={{ fontSize: 17, color: colors.negative }}>Delete transaction</Text>
          </TouchableOpacity>
        )}
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
    scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 96 },
    // Redesign styles
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    filterChip: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 34, paddingHorizontal: 12, borderRadius: 999, backgroundColor: colors.navy3 },
    filterChipOn: { backgroundColor: colors.accentTint },
    filterChipText: { fontSize: 15, fontWeight: '500', color: colors.ink },
    filterChipTextOn: { color: colors.gold, fontWeight: '600' },
    group: { backgroundColor: colors.navy3, borderRadius: 12, overflow: 'hidden' },
    summary: { flexDirection: 'row', marginBottom: 20 },
    summaryCell: { flex: 1, paddingVertical: 12, paddingHorizontal: 16 },
    summaryDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.navy4 },
    summaryLabel: { fontSize: 13, color: colors.inkDim },
    summaryAmount: { fontSize: 17, fontWeight: '600', marginTop: 2 },
    daySection: { marginBottom: 20 },
    dayHeader: { fontSize: 13, fontWeight: '600', color: colors.inkDim, textTransform: 'uppercase', letterSpacing: 0.3, marginLeft: 16, marginBottom: 6 },
    tile: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    emptyText: { fontSize: 15, color: colors.inkDim, marginTop: 6, marginBottom: 12, textAlign: 'center' },
    txnMain: { flex: 1, marginRight: 10 },
    reviewCard: { flexDirection: 'row', alignItems: 'center', minHeight: 60, paddingHorizontal: 16, marginBottom: 12 },
    // Quick-add sheet
    sheetBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 2, paddingBottom: 12 },
    sheetBarBtn: { fontSize: 17, color: colors.gold },
    sheetBarTitle: { fontSize: 17, fontWeight: '600', color: colors.ink },
    bigAmountWrap: { backgroundColor: 'transparent', justifyContent: 'center', marginTop: 16, marginBottom: 16, minHeight: 64 },
    bigAmountInput: { fontSize: 40, fontWeight: '700', textAlign: 'center', flex: 0, minWidth: 120 },
    // Grey groups on the white sheet, matching the other fields (date, account).
    formGroup: { backgroundColor: colors.navy2, borderRadius: 12, overflow: 'hidden' },
    formRow: { flexDirection: 'row', alignItems: 'center', minHeight: 50, paddingHorizontal: 16 },
    formRowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    formLabel: { fontSize: 17, color: colors.ink, width: 112 },
    formInput: { flex: 1, fontSize: 17, color: colors.ink, textAlign: 'right', paddingVertical: 12 },
    formFooter: { fontSize: 13, color: colors.inkDim, marginTop: 6, marginHorizontal: 16 },
    inlineAmount: { flex: 1, backgroundColor: 'transparent', marginBottom: 0, minHeight: 44, justifyContent: 'flex-end' },
    moreToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 12, marginTop: 8 },
    moreToggleText: { fontSize: 15, fontWeight: '600', color: colors.gold },
    deleteRow: { minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
    txnRow: { flexDirection: 'row', alignItems: 'center', minHeight: 60, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.navy3 },
    txnRowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    txnLabel: { fontSize: 17, fontWeight: '500', color: colors.ink },
    txnSub: { fontSize: 13, color: colors.inkDim, marginTop: 1 },
    txnAmount: { fontSize: 17, fontWeight: '600' },
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
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
    receiptRemoveButtonText: { fontSize: 12, color: colors.error, fontWeight: '600' },
    errorText: { fontSize: 12, color: colors.error, marginBottom: 10 },
  });
}