import { firstTimeOpen } from '../handledOpen';
import { toneUnlessZero } from '../moneyColor';
import ErrorNote from '../components/ErrorNote';
import { notSaved, notDeleted } from '../messages';
import React, { useEffect, useRef, useLayoutEffect, useState } from 'react';
import { showLeafTick } from '../components/LeafTick';
import { afterSlide } from '../afterSlide';
import { takeAccountHandoff, cancelAccountHandoff } from '../accountHandoff';
import { MarkedLabel } from '../components/MarkedLabel';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, Platform, UIManager } from 'react-native';
import { TouchableOpacity } from '../components/Tap';
import { Text, TextInput } from '../components/AppText';
import { headerButtonText } from '../navigation/LargeHeader';
import { Alert } from 'react-native';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { PullToRefreshScrollView } from '../PullToRefreshScrollView';
import { formatPeso, totalCurrentBalance, withCurrentBalance, accountCurrentBalance, bakeCurrentBalances } from '../balanceProjection';
import type { BalanceAccountEntry, HouseholdModel } from '../types';
import { DEFAULT_GROUP_COLORS, COLOR_PALETTE } from '../components/AccountCard';
import { cardFaceColors, CardFaceFill, cardColor } from '../components/CardFace';
import { computeNextPayDate, formatShortDate } from '../income';
import SwipeableRow from '../components/SwipeableRow';
import BottomSheet from '../components/BottomSheet';
import Button from '../components/Button';
import AmountInput from '../components/AmountInput';
import { todayISO } from '../dateUtils';
import GradientFill from '../components/GradientFill';
import { CURRENCIES, HOME, currencySymbol, foreignBalance, isForeign, lastRate, pesoFor, showMoney, suggestedRate } from '../fx';
import { trace } from '../trace';
import { animateNextLayout } from '../animateLayout';
import { HIDDEN_AMOUNT, useHideAmounts } from '../hideAmounts';
import Guided, { useFieldErrors } from '../components/Guided';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type AccountGroup = 'cash' | 'debit' | 'credit';

const GROUPS: AccountGroup[] = ['cash', 'debit', 'credit'];
const GROUP_LABELS: Record<AccountGroup, string> = {
  cash: 'Cash',
  debit: 'Debit',
  credit: 'Credit',
};

function accountAmountNumber(entry: BalanceAccountEntry): number {
  return typeof entry.amount === 'number' ? entry.amount : 0;
}

function makeId(): string {
  return 'acct-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

// Version 2.2 (Cath: Edit should open where you are): formOnly draws just the account's
// form, for "Edit card" on a card's page; onFormClosed says when it has closed.
export default function AccountsScreen({ formOnly, editGroup, editAccountId, onFormClosed }: { formOnly?: boolean; editGroup?: AccountGroup; editAccountId?: string; onFormClosed?: () => void } = {}) {
  const { colors, isDark } = useTheme();
  const { model, saveModel, username, getModel } = useData();
  const { hidden } = useHideAmounts();
  const styles = makeStyles(colors);

  // View mode: 'stacked' (Apple Wallet style, default) vs 'list' (flat cards)
  // Redesign: always a plain list here; Home's Wallet already shows the stacked cards.
  // One Add button in the title bar asks which kind of account to add.
  const [chooseTypeOpen, setChooseTypeOpen] = useState(false);
  const navigation = useNavigation<any>();
  // Version 2.1 (Cath): "Edit card" on a card's page comes here and opens that card's sheet.
  const route = useRoute<any>();
  const editNonce = route.params?.nonce;
  // Sweep 2026-11-14: the form starts from what the account has NOW (the list already does).
  // From an account's page it started from the balance as last typed in, and saving even a
  // new name put the balance back to that old number.
  const liveAccount = (g: AccountGroup, a: BalanceAccountEntry): BalanceAccountEntry =>
    model && (g === 'cash' || g === 'debit' || g === 'credit') ? withCurrentBalance(model, g, a) : a;
  const formOnlyOpened = useRef(false);
  React.useEffect(() => {
    if (!formOnly || formOnlyOpened.current || !model || !editGroup || !editAccountId) return;
    const account = model.balanceAccounts[editGroup]?.find((a: BalanceAccountEntry) => a.id === editAccountId);
    if (account) {
      formOnlyOpened.current = true;
      openEditModal(editGroup, liveAccount(editGroup, account));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formOnly, model, editGroup, editAccountId]);
  React.useEffect(() => {
    if (formOnly) return;
    const g = route.params?.editGroup as AccountGroup | undefined;
    const id = route.params?.editId as string | undefined;
    if (!editNonce || !g || !id || !model) return;
    const account = model.balanceAccounts[g]?.find((a: BalanceAccountEntry) => a.id === id);
    if (account && firstTimeOpen('account', id, editNonce)) afterSlide(() => openEditModal(g, liveAccount(g, account)));
    // Only when "Edit card" sends a new request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editNonce]);
  // Cath, 2026-10-23: sent here by + for a transaction with no account yet: "Add an
  // account" (which kind?) opens straight away. Leaving without adding one forgets the
  // waiting transaction.
  const addNonce = route.params?.addNonce;
  React.useEffect(() => {
    if (formOnly || !addNonce) return;
    afterSlide(() => setChooseTypeOpen(true));
    // Only when a new request arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addNonce]);
  React.useEffect(() => {
    if (formOnly) return;
    return () => cancelAccountHandoff();
  }, [formOnly]);
  useLayoutEffect(() => {
    if (formOnly) return;
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setChooseTypeOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Add an account"
          testID="accounts-add"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[headerButtonText, { color: colors.gold }]}>Add</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, colors.gold]);
  // Which account card is currently expanded in stacked view, or null if all collapsed.

  // Which group's add/edit form is open in the modal right now, or null if closed.
  const [activeGroup, setActiveGroup] = useState<AccountGroup | null>(null);
  // The id of the account being edited, or null if this is a brand-new account.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  // Version 2.1: tapping Save/Add with something missing takes the person straight to it.
  const fieldErrors = useFieldErrors<'name'>();
  const clearFieldError = fieldErrors.clear;
  const nameRef = useRef<any>(null);
  const [amountInput, setAmountInput] = useState<number | ''>('');
  // Cath, 2026-11-14 (mockup accounts-foreign): a cash wallet can be in another currency. Its
  // balance is typed in that currency and kept in pesos at its rate (fx.ts), like everywhere else.
  const [currencyInput, setCurrencyInput] = useState<string>(HOME);
  const [rateInput, setRateInput] = useState<number | ''>('');
  const [rateFrom, setRateFrom] = useState<'today' | 'last' | 'none' | ''>('');
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const startForeign = useRef<number | ''>('');
  const [colorInput, setColorInput] = useState<string>(DEFAULT_GROUP_COLORS.cash);
  // Version 2.2 (canvas D2): optional last 4 digits (debit and credit cards only).
  const [last4Input, setLast4Input] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);
  // H-10 (2026-10-22): after a successful save the form is closing; a quick second tap on
  // Save would add the same entry again. Blocked until the form is opened again.
  const savedOnceRef = useRef(false);

  // The red message goes away as soon as the person changes something.
  useEffect(() => {
    clearFieldError();
  }, [nameInput, activeGroup, clearFieldError]);

  const foreignNow = activeGroup === 'cash' && currencyInput !== HOME;
  const currencyName = currencyInput === HOME ? 'Philippine peso (PHP)' : `${CURRENCIES.find((c) => c.code === currencyInput)?.name || currencyInput} (${currencyInput})`;

  if (!model) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  function openAddModal(group: AccountGroup) {
    savedOnceRef.current = false;
    setActiveGroup(group);
    setEditingId(null);
    setNameInput('');
    setAmountInput('');
    setCurrencyInput(HOME);
    setRateInput('');
    setRateFrom('');
    startForeign.current = '';
    setColorInput(DEFAULT_GROUP_COLORS[group]);
    setLast4Input('');
    setErrorMsg('');
  }

  function openEditModal(group: AccountGroup, account: BalanceAccountEntry) {
    savedOnceRef.current = false;
    setActiveGroup(group);
    setEditingId(account.id);
    setNameInput(account.name);
    if (isForeign(account)) {
      const inIts = foreignBalance(account, accountAmountNumber(account));
      setAmountInput(inIts);
      startForeign.current = inIts;
      setCurrencyInput(account.currency as string);
      setRateInput(account.fxRate as number);
    } else {
      setAmountInput(account.amount);
      startForeign.current = '';
      setCurrencyInput(HOME);
      setRateInput('');
    }
    setRateFrom('');
    setColorInput(account.color || DEFAULT_GROUP_COLORS[group]);
    setLast4Input(account.last4 || '');
    setErrorMsg('');
  }

  function pickCurrency(code: string) {
    if ((code === HOME) !== (currencyInput === HOME)) animateNextLayout();
    setCurrencyInput(code);
    setCurrencyOpen(false);
    setRateInput('');
    setRateFrom('');
    trace('fx', 'account currency picked', { code });
    if (code === HOME || !model) return;
    suggestedRate(code, lastRate(model, code), fetch as any).then((r) => {
      setRateFrom(r.from);
      if (r.rate) setRateInput((typed) => (typed === '' ? (r.rate as number) : typed));
    });
  }

  function closeModal() {
    setActiveGroup(null);
    setEditingId(null);
    setErrorMsg('');
    onFormClosed?.();
  }




  async function handleSave() {
    if (savedOnceRef.current) return;
    if (!activeGroup || !model) return;
    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      setErrorMsg(''); fieldErrors.show('name', 'Give this account a name.');
      return;
    }
    const hasLast4 = activeGroup === 'debit' || activeGroup === 'credit';
    if (hasLast4 && last4Input.length > 0 && last4Input.length < 4) {
      setErrorMsg('Type all 4 last digits, or leave it empty.');
      return;
    }
    const last4 = hasLast4 && last4Input.length === 4 ? last4Input : undefined;
    const foreign = activeGroup === 'cash' && currencyInput !== HOME;
    if (foreign && (rateInput === '' || rateInput <= 0)) {
      setErrorMsg('Type the exchange rate: how many pesos one ' + currencyInput + ' is.');
      return;
    }
    if (foreign && !editingId && model.balanceAccounts.cash.some((a) => a.currency === currencyInput && isForeign(a))) {
      setErrorMsg(`You already have a wallet in ${currencyInput}. Cash in ${currencyInput} goes into that one.`);
      return;
    }
    const typedAmount = amountInput === '' ? 0 : amountInput;
    // Kept in pesos, so every total stays right.
    const parsedAmount = foreign ? pesoFor(typedAmount, rateInput as number) : typedAmount;

    // Redesign: balances shown here are live (saved balance + anything paid since).
    // If the balance was changed, every spending account's saved balance becomes its
    // live balance first, so nothing paid since the last update is lost when the
    // "as of" moment moves to now. A name or colour change leaves balances alone.
    const isSpendingGroup = activeGroup === 'cash' || activeGroup === 'debit' || activeGroup === 'credit';
    let newId: string | null = null;
    const previous = editingId ? model.balanceAccounts[activeGroup].find((a) => a.id === editingId) : undefined;
    const previousLive = previous ? accountCurrentBalance(model, activeGroup, previous) : 0;
    // A foreign wallet: changed only if the amount in its currency or its rate was changed
    // (its peso value has more decimals than what is shown).
    const balanceChanged = !editingId || !previous || (foreign && isForeign(previous) ? typedAmount !== startForeign.current || rateInput !== previous.fxRate : Number(previousLive) !== Number(parsedAmount || 0));

    const updated: HouseholdModel = {
      ...model,
      balanceAccounts: isSpendingGroup && balanceChanged ? bakeCurrentBalances(model) : { ...model.balanceAccounts },
    };
    const currentList = updated.balanceAccounts[activeGroup];

    // Version 2.2 (canvas B1): a balance typed in by hand is recorded on the account.
    const logEntry = (from: number | null) => ({ at: Date.now(), from, to: Number(parsedAmount || 0), ...(username ? { by: username } : {}) });
    if (editingId) {
      updated.balanceAccounts[activeGroup] = currentList.map((a) =>
        a.id === editingId
          ? {
              ...a,
              name: trimmedName,
              amount: balanceChanged ? parsedAmount : a.amount,
              color: colorInput,
              last4,
              ...(foreign ? { fxRate: rateInput as number } : {}),
              ...(balanceChanged && isSpendingGroup ? { balanceLog: [logEntry(Number(previousLive) || 0), ...(a.balanceLog || [])].slice(0, 50) } : {}),
            }
          : a
      );
    } else {
      newId = makeId();
      const newAccount: BalanceAccountEntry = {
        id: newId,
        name: trimmedName,
        amount: parsedAmount,
        color: colorInput,
        ...(last4 ? { last4 } : {}),
        ...(foreign ? { currency: currencyInput, fxRate: rateInput as number } : {}),
        ...(isSpendingGroup ? { balanceLog: [logEntry(null)] } : {}),
      };
      updated.balanceAccounts[activeGroup] = [...currentList, newAccount];
    }

    // Left to Spend fix: remember the day the spending balances (Cash, Debit, Credit)
    // were last brought up to date. Left to Spend treats these balances as true as of
    // that day, so any transaction dated AFTER it moves Left to Spend until the next
    // balance update. Same idea as the web app's "balance as of" date.
    if (isSpendingGroup && balanceChanged) {
      updated.balanceAccounts.asOfDate = todayISO();
      updated.balanceAccounts.asOfAt = Date.now();
    }

    setSaving(true);
    try {
      await saveModel(updated);
      savedOnceRef.current = true;
      showLeafTick(editingId ? 'Saved' : 'Added');
      closeModal();
      // Came here from New transaction (no account yet): straight back to it, with this
      // account picked.
      const next = !editingId && newId && isSpendingGroup ? takeAccountHandoff() : null;
      if (next && newId) {
        const account = { type: activeGroup as 'cash' | 'debit' | 'credit', accountId: newId };
        navigation.goBack();
        afterSlide(() => next(account));
      }
    } catch (e) {
      setErrorMsg(notSaved('this account'));
    } finally {
      setSaving(false);
    }
  }

  async function performDelete() {
    // H-21 (2026-10-22): the newest data, not the data from when the pop-up opened.
    const current = getModel() ?? model;
    if (!activeGroup || !editingId || !current) return;
    const updated: HouseholdModel = {
      ...current,
      balanceAccounts: { ...current.balanceAccounts },
    };
    updated.balanceAccounts[activeGroup] = updated.balanceAccounts[activeGroup].filter(
      (a) => a.id !== editingId
    );
    setSaving(true);
    try {
      await saveModel(updated);
      closeModal();
    } catch (e) {
      setErrorMsg(notDeleted('this account'));
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert(
      'Remove this account?',
      'Removes the account and its balance. Cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: performDelete },
      ]
    );
  }

  async function performDeleteAccountById(group: AccountGroup, id: string) {
    // H-21 (2026-10-22): the newest data, not the data from when the pop-up opened.
    const current = getModel() ?? model;
    if (!current) return;
    const updated: HouseholdModel = {
      ...current,
      balanceAccounts: { ...current.balanceAccounts },
    };
    updated.balanceAccounts[group] = (updated.balanceAccounts[group] ?? []).filter((a) => a.id !== id);
    await saveModel(updated);
  }

  function handleSwipeDeleteAccount(group: AccountGroup, account: BalanceAccountEntry) {
    Alert.alert(
      'Remove this account?',
      'Removes the account and its balance. Cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => performDeleteAccountById(group, account.id),
        },
      ]
    );
  }

  const totalBalance = totalCurrentBalance(model);
  // Money colours: green for money you have, red for money owed, grey for nothing.
  // Cath, 2026-11-24 (H-86): Home's eye covers this list too (no amounts, no red that gives a minus away).
  const moneyColor = (n: number) => (hidden ? colors.inkDim : n > 0.004 ? colors.positive : n < -0.004 ? colors.negative : colors.inkDim);
  const hp = (n: number) => (hidden ? HIDDEN_AMOUNT : formatPeso(n));
  const accountCount = GROUPS.reduce((n, g) => n + model.balanceAccounts[g].length, 0);
  const creditOwed = model.balanceAccounts.credit
    .map((a) => accountCurrentBalance(model, 'credit', a))
    .reduce((sum, b) => sum + (b < 0 ? -b : 0), 0);
  // The soonest payday across all income sources.
  const nextPay = (model.income || [])
    .map((src) => ({ date: computeNextPayDate(src.frequency as any, src.payDates || []), amount: typeof src.expectedAmount === 'number' ? src.expectedAmount : 0 }))
    .filter((x): x is { date: Date; amount: number } => !!x.date)
    .sort((x, y) => x.date.getTime() - y.date.getTime())[0];

  return (
    <SafeAreaView style={styles.container}>
      {!formOnly && (
      <PullToRefreshScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Total balance: soft white card (money colours on the number), with the next
            payday as a quiet row at the bottom that opens Income. */}
        <View style={styles.totalCard}>
          <GradientFill match={styles.totalCard} />
          <View style={styles.totalTop}>
            <Text style={styles.balanceBannerLabel}>TOTAL BALANCE</Text>
            <Text style={[styles.balanceBannerAmount, { color: moneyColor(totalBalance) }]}>{hp(totalBalance)}</Text>
            <Text style={styles.totalSub}>
              {`Across ${accountCount} ${accountCount === 1 ? 'account' : 'accounts'}`}
              {creditOwed > 0 ? ' · Credit owed ' : ''}
              {creditOwed > 0 ? <Text style={{ color: hidden ? colors.inkDim : colors.negative, fontWeight: '700' }}>{hp(creditOwed)}</Text> : null}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.incomeRow}
            onPress={() => navigation.navigate('Income')}
            accessibilityRole="button"
            testID="accounts-income"
          >
            <View style={[styles.incomeIcon, { backgroundColor: colors.indigoBg }]}>
              <Ionicons name="trending-up" size={16} color={colors.planned} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.incomeTitle}>Income</Text>
              <Text style={styles.incomeSub} numberOfLines={1}>
                {nextPay ? `Next payday ${formatShortDate(nextPay.date)}` : (model.income || []).length === 0 ? 'Add where your money comes from' : 'No payday scheduled'}
              </Text>
            </View>
            {!!nextPay && <Text style={[styles.incomeAmount, { color: toneUnlessZero(nextPay.amount, colors.planned, colors) }]}>{hidden ? HIDDEN_AMOUNT : `+${formatPeso(nextPay.amount)}`}</Text>}
            <Ionicons name="chevron-forward" size={17} color={colors.inkFaint} />
          </TouchableOpacity>
        </View>

        {GROUPS.map((group) => {
          // Live balances (saved balance + anything paid from or into it since).
          const accounts = model.balanceAccounts[group].map((a) => withCurrentBalance(model, group, a));
          const groupTotal = accounts.reduce((sum, a) => sum + accountAmountNumber(a), 0);
          return (
            <View key={group} style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>{GROUP_LABELS[group].toUpperCase()}</Text>
                <Text style={styles.sectionTotal}>{hp(groupTotal)}</Text>
              </View>
              <View style={styles.listGroup}>
                <GradientFill match={styles.listGroup} />
                {accounts.length === 0 && (
                  <TouchableOpacity style={styles.accountRow} onPress={() => openAddModal(group)} accessibilityRole="button">
                    <Text style={[styles.accountName, { color: colors.gold }]}>Add a {GROUP_LABELS[group].toLowerCase()} account</Text>
                  </TouchableOpacity>
                )}
                {accounts.map((account, i) => {
                  const bal = accountAmountNumber(account);
                  const tint = cardColor(account, group);
                  return (
                    <SwipeableRow
                      key={account.id}
                      enabled={Boolean(model.settings.swipeToDeleteEnabled)}
                      onDelete={() => handleSwipeDeleteAccount(group, account)}
                      testID={`account-swipe-${account.id}`}
                    >
                      <TouchableOpacity
                        style={[styles.accountRow, i > 0 && styles.accountRowDivider]}
                        onPress={() => navigation.navigate('CardDetail', { group, id: account.id, backTitle: 'Accounts' })}
                        onLongPress={() => openEditModal(group, account)}
                        accessibilityRole="button"
                        accessibilityLabel={`${account.name}, ${hidden ? 'amount hidden' : showMoney(account, bal)}`}
                      >
                        <View style={[styles.accountChip, cardFaceColors(tint, isDark)]}>
                          <CardFaceFill color={tint} radius={6} />
                        </View>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={styles.accountName} numberOfLines={1}>{account.name || GROUP_LABELS[group]}</Text>
                          <Text style={styles.accountSub} numberOfLines={1}>{isForeign(account) ? CURRENCIES.find((c) => c.code === account.currency)?.name || account.currency : GROUP_LABELS[group]}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', flexShrink: 1 }}>
                          <Text style={[styles.accountAmount, { color: moneyColor(bal) }]}>{hidden ? HIDDEN_AMOUNT : showMoney(account, bal)}</Text>
                          {isForeign(account) && !hidden && (
                            <Text style={styles.accountSub} numberOfLines={1}>{`about ${formatPeso(bal)} · ${currencySymbol(account.currency)}1 = ₱${account.fxRate}`}</Text>
                          )}
                        </View>
                        <Ionicons name="chevron-forward" size={17} color={colors.inkFaint} style={{ marginLeft: 6 }} />
                      </TouchableOpacity>
                    </SwipeableRow>
                  );
                })}
              </View>
            </View>
          );
        })}
      </PullToRefreshScrollView>
      )}

      <BottomSheet visible={chooseTypeOpen} onClose={() => setChooseTypeOpen(false)} title="Add an account">
        {GROUPS.map((g, i) => (
          <TouchableOpacity
            key={g}
            style={[styles.typeRow, i > 0 && styles.typeRowTop]}
            onPress={() => {
              setChooseTypeOpen(false);
              // Let the chooser close before the account form opens.
              setTimeout(() => openAddModal(g), 250);
            }}
            accessibilityRole="button"
            testID={`accounts-add-${g}`}
          >
            <Ionicons
              name={g === 'cash' ? 'wallet-outline' : 'card-outline'}
              size={22}
              color={colors.gold}
              style={{ marginRight: 12 }}
            />
            <Text style={styles.typeRowText}>{GROUP_LABELS[g]}</Text>
          </TouchableOpacity>
        ))}
      </BottomSheet>

      <BottomSheet
        visible={activeGroup !== null}
        onClose={closeModal}
        title={
          editingId
            ? 'Edit account'
            : `New ${activeGroup ? GROUP_LABELS[activeGroup].toLowerCase() : ''} account`
        }
      >
        <Guided {...fieldErrors.props('name')} focusRef={nameRef} inset={false} radius={12}>
        <MarkedLabel text="Account name" mark="required" style={[styles.inputLabel, fieldErrors.field === 'name' && { color: colors.error, fontWeight: '700' }]} />
        <TextInput
          ref={nameRef}
          autoFocus={!editingId}
          style={styles.input}
          placeholder="e.g. GCash, BPI Savings"
          placeholderTextColor={colors.inkFaint}
          value={nameInput}
          onChangeText={setNameInput}
        />
        </Guided>

        {activeGroup === 'cash' && (
          <>
            <MarkedLabel text="Currency" mark="required" style={styles.inputLabel} />
            {editingId ? (
              <Text style={[styles.input, { paddingVertical: 12, color: colors.inkDim }]}>{currencyName}</Text>
            ) : (
              <TouchableOpacity style={[styles.input, { paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} onPress={() => setCurrencyOpen(true)} accessibilityRole="button" testID="account-currency-row">
                <Text style={{ fontSize: 16, color: colors.ink }}>{currencyName}</Text>
                <Ionicons name="chevron-down" size={17} color={colors.inkFaint} />
              </TouchableOpacity>
            )}
          </>
        )}

        <MarkedLabel text="Balance" mark="optional" style={styles.inputLabel} />
          <AmountInput
            style={styles.amountInput}
            value={amountInput}
            onChangeAmount={setAmountInput}
            allowNegative
            prefix={foreignNow ? currencySymbol(currencyInput) : '₱'}
            testID="account-balance"
          />

        {foreignNow && (
          <>
            <MarkedLabel text={`Exchange rate (${currencySymbol(currencyInput)}1 in ₱)`} mark="required" style={styles.inputLabel} />
            <AmountInput style={styles.amountInput} value={rateInput} onChangeAmount={(v) => { setRateInput(v); setRateFrom(''); }} testID="account-rate" />
            <Text style={[styles.inputLabel, { marginTop: -6, fontWeight: '400', color: colors.inkDim }]} testID="account-peso-note">
              {rateFrom === 'today' ? "Suggested: today's rate. " : rateFrom === 'last' ? 'Suggested: the rate you used last. ' : rateFrom === 'none' ? "Couldn't get a rate: type it in. " : ''}
              {typeof amountInput === 'number' && typeof rateInput === 'number' && rateInput > 0 ? `About ${formatPeso(pesoFor(amountInput, rateInput))}. ` : ''}
              {'Your totals and Left to Spend use the peso value.'}
            </Text>
            {!!editingId && <Text style={[styles.inputLabel, { fontWeight: '400', color: colors.inkDim }]}>A wallet keeps the currency it was started with.</Text>}
          </>
        )}

        {(activeGroup === 'debit' || activeGroup === 'credit') && (
          <>
            <MarkedLabel text="Last 4 digits" mark="optional" style={styles.inputLabel} />
            <TextInput
              style={[styles.input, { letterSpacing: 3 }]}
              placeholder="e.g. 4821"
              placeholderTextColor={colors.inkFaint}
              value={last4Input}
              onChangeText={(t) => setLast4Input(t.replace(/[^0-9]/g, '').slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
              testID="account-last4"
            />
            <Text style={[styles.inputLabel, { marginTop: -6, fontWeight: '400', color: colors.inkDim }]}>Just the last 4, to tell your cards apart. Never type the full card number.</Text>
          </>
        )}

        <MarkedLabel text="Card color" mark="optional" style={styles.inputLabel} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.swatchRow}
        >
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
        </ScrollView>

        <ErrorNote text={errorMsg} />

        <Button label="Save" onPress={handleSave} loading={saving} testID="account-save" />

        {editingId && <Button label="Remove account" variant="destructive" onPress={handleDelete} />}

        <Button label="Cancel" variant="quiet" onPress={closeModal} />
      </BottomSheet>

      <BottomSheet visible={currencyOpen} onClose={() => setCurrencyOpen(false)} title="Currency">
        {[{ code: HOME, name: 'Philippine peso', symbol: '₱' }, ...CURRENCIES.filter((c) => c.code !== HOME)].map((c, i) => (
          <TouchableOpacity key={c.code} style={[styles.typeRow, i > 0 && styles.typeRowTop]} onPress={() => pickCurrency(c.code)} accessibilityRole="button" accessibilityState={{ selected: currencyInput === c.code }} testID={`account-currency-${c.code}`}>
            <Text style={[styles.typeRowText, { flex: 1 }]} numberOfLines={1}>{c.name}</Text>
            <Text style={[styles.accountSub, currencyInput === c.code && { color: colors.gold, fontWeight: '700' }]}>{c.code} · {c.symbol}</Text>
          </TouchableOpacity>
        ))}
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
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollContent: {
      paddingHorizontal: 16, // same side margins as every other page (review 10-27)
      paddingTop: 16,
      paddingBottom: 40,
    },
    totalCard: { borderRadius: 20, backgroundColor: colors.navy3, marginBottom: 22, overflow: 'hidden' },
    totalTop: { paddingTop: 18, paddingBottom: 14, paddingHorizontal: 20 },
    totalSub: { fontSize: 13, color: colors.inkDim, marginTop: 4 },
    incomeAmount: { fontSize: 15, fontWeight: '700', marginRight: 6 },
    listGroup: { backgroundColor: colors.navy3, borderRadius: 16, overflow: 'hidden' },
    accountRow: { flexDirection: 'row', alignItems: 'center', minHeight: 60, paddingVertical: 10, paddingHorizontal: 16, backgroundColor: colors.navy3 },
    accountRowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    accountChip: { width: 40, height: 28, borderRadius: 6, marginRight: 12, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
    accountName: { fontSize: 17, color: colors.ink },
    accountSub: { fontSize: 13, color: colors.inkDim, marginTop: 1 },
    accountAmount: { fontSize: 17, fontWeight: '600' },
    balanceBannerLabel: {
      fontSize: 13,
      letterSpacing: 0.3,
      color: colors.inkDim,
      marginBottom: 4,
    },
    balanceBannerAmount: {
      fontSize: 32,
      fontWeight: '800',
      letterSpacing: -0.5,
      color: colors.ink,
    },
    section: {
      marginBottom: 22,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
      paddingHorizontal: 16,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 0.3,
      color: colors.inkDim,
    },
    sectionTotal: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.inkDim,
    },
    incomeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.navy4,
    },
    incomeIcon: {
      width: 30,
      height: 30,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    incomeTitle: { fontSize: 15, color: colors.ink, fontWeight: '600' },
    incomeSub: { fontSize: 13, color: colors.inkDim, marginTop: 1 },
    typeRow: { flexDirection: 'row', alignItems: 'center', minHeight: 54 },
    typeRowTop: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    typeRowText: { fontSize: 17, color: colors.ink },
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
    amountInput: {
      backgroundColor: colors.navy2,
    },
    swatchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 16,
      paddingVertical: 4,
    },
    swatch: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    swatchActive: {
      borderWidth: 3,
      borderColor: colors.ink,
    },
    errorText: {
      fontSize: 13,
      color: colors.error,
      marginBottom: 10,
    },
  });
}