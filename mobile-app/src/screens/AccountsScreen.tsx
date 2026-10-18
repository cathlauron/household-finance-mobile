import React, { useEffect, useRef, useLayoutEffect, useState } from 'react';
import { afterSlide } from '../afterSlide';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { View, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, Platform, UIManager } from 'react-native';
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

export default function AccountsScreen() {
  const { colors, isDark } = useTheme();
  const { model, saveModel } = useData();
  const styles = makeStyles(colors);

  // View mode: 'stacked' (Apple Wallet style, default) vs 'list' (flat cards)
  // Redesign: always a plain list here; Home's Wallet already shows the stacked cards.
  // One Add button in the title bar asks which kind of account to add.
  const [chooseTypeOpen, setChooseTypeOpen] = useState(false);
  const navigation = useNavigation<any>();
  // Version 2.1 (Cath): "Edit card" on a card's page comes here and opens that card's sheet.
  const route = useRoute<any>();
  const editNonce = route.params?.nonce;
  React.useEffect(() => {
    const g = route.params?.editGroup as AccountGroup | undefined;
    const id = route.params?.editId as string | undefined;
    if (!editNonce || !g || !id || !model) return;
    const account = model.balanceAccounts[g]?.find((a: BalanceAccountEntry) => a.id === id);
    if (account) afterSlide(() => openEditModal(g, account));
    // Only when "Edit card" sends a new request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editNonce]);
  useLayoutEffect(() => {
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
  const [colorInput, setColorInput] = useState<string>(DEFAULT_GROUP_COLORS.cash);
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  // The red message goes away as soon as the person changes something.
  useEffect(() => {
    clearFieldError();
  }, [nameInput, activeGroup, clearFieldError]);

  if (!model) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  function openAddModal(group: AccountGroup) {
    setActiveGroup(group);
    setEditingId(null);
    setNameInput('');
    setAmountInput('');
    setColorInput(DEFAULT_GROUP_COLORS[group]);
    setErrorMsg('');
  }

  function openEditModal(group: AccountGroup, account: BalanceAccountEntry) {
    setActiveGroup(group);
    setEditingId(account.id);
    setNameInput(account.name);
    setAmountInput(account.amount);
    setColorInput(account.color || DEFAULT_GROUP_COLORS[group]);
    setErrorMsg('');
  }

  function closeModal() {
    setActiveGroup(null);
    setEditingId(null);
    setErrorMsg('');
  }




  async function handleSave() {
    if (!activeGroup || !model) return;
    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      setErrorMsg(''); fieldErrors.show('name', 'Give this account a name.');
      return;
    }
    const parsedAmount = amountInput === '' ? 0 : amountInput;

    // Redesign: balances shown here are live (saved balance + anything paid since).
    // If the balance was changed, every spending account's saved balance becomes its
    // live balance first, so nothing paid since the last update is lost when the
    // "as of" moment moves to now. A name or colour change leaves balances alone.
    const isSpendingGroup = activeGroup === 'cash' || activeGroup === 'debit' || activeGroup === 'credit';
    const previous = editingId ? model.balanceAccounts[activeGroup].find((a) => a.id === editingId) : undefined;
    const previousLive = previous ? accountCurrentBalance(model, activeGroup, previous) : 0;
    const balanceChanged = !editingId || !previous || Number(previousLive) !== Number(parsedAmount || 0);

    const updated: HouseholdModel = {
      ...model,
      balanceAccounts: isSpendingGroup && balanceChanged ? bakeCurrentBalances(model) : { ...model.balanceAccounts },
    };
    const currentList = updated.balanceAccounts[activeGroup];

    if (editingId) {
      updated.balanceAccounts[activeGroup] = currentList.map((a) =>
        a.id === editingId
          ? { ...a, name: trimmedName, amount: balanceChanged ? parsedAmount : a.amount, color: colorInput }
          : a
      );
    } else {
      const newAccount: BalanceAccountEntry = {
        id: makeId(),
        name: trimmedName,
        amount: parsedAmount,
        color: colorInput,
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
      closeModal();
    } catch (e) {
      setErrorMsg('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function performDelete() {
    if (!activeGroup || !editingId || !model) return;
    const updated: HouseholdModel = {
      ...model,
      balanceAccounts: { ...model.balanceAccounts },
    };
    updated.balanceAccounts[activeGroup] = updated.balanceAccounts[activeGroup].filter(
      (a) => a.id !== editingId
    );
    setSaving(true);
    try {
      await saveModel(updated);
      closeModal();
    } catch (e) {
      setErrorMsg('Failed to delete. Please try again.');
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
    if (!model) return;
    const updated: HouseholdModel = {
      ...model,
      balanceAccounts: { ...model.balanceAccounts },
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
  const moneyColor = (n: number) => (n > 0.004 ? colors.positive : n < -0.004 ? colors.negative : colors.inkDim);
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
            <Text style={[styles.balanceBannerAmount, { color: moneyColor(totalBalance) }]}>{formatPeso(totalBalance)}</Text>
            <Text style={styles.totalSub}>
              {`Across ${accountCount} ${accountCount === 1 ? 'account' : 'accounts'}`}
              {creditOwed > 0 ? ' · Credit owed ' : ''}
              {creditOwed > 0 ? <Text style={{ color: colors.negative, fontWeight: '700' }}>{formatPeso(creditOwed)}</Text> : null}
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
            {!!nextPay && <Text style={[styles.incomeAmount, { color: colors.planned }]}>+{formatPeso(nextPay.amount)}</Text>}
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
                <Text style={styles.sectionTotal}>{formatPeso(groupTotal)}</Text>
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
                        accessibilityLabel={`${account.name}, ${formatPeso(bal)}`}
                      >
                        <View style={[styles.accountChip, cardFaceColors(tint, isDark)]}>
                          <CardFaceFill color={tint} radius={6} />
                        </View>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={styles.accountName} numberOfLines={1}>{account.name || GROUP_LABELS[group]}</Text>
                          <Text style={styles.accountSub} numberOfLines={1}>{GROUP_LABELS[group]}</Text>
                        </View>
                        <Text style={[styles.accountAmount, { color: moneyColor(bal) }]}>{formatPeso(bal)}</Text>
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
        <Text style={[styles.inputLabel, fieldErrors.field === 'name' && { color: colors.error, fontWeight: '700' }]}>Account name</Text>
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

        <Text style={styles.inputLabel}>Balance</Text>
          <AmountInput
            style={styles.amountInput}
            value={amountInput}
            onChangeAmount={setAmountInput}
            allowNegative
          />

        <Text style={styles.inputLabel}>Card color</Text>
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

        {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

        <Button label="Save" onPress={handleSave} loading={saving} />

        {editingId && <Button label="Remove account" variant="destructive" onPress={handleDelete} />}

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
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollContent: {
      paddingHorizontal: 12,
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