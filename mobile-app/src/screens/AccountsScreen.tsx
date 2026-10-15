import React, { useLayoutEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { View, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, Platform, LayoutAnimation, UIManager } from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { Alert } from 'react-native';
import IconLabelHint from '../components/IconLabelHint';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { PullToRefreshScrollView } from '../PullToRefreshScrollView';
import { formatPeso, totalCurrentBalance, withCurrentBalance, accountCurrentBalance, bakeCurrentBalances } from '../balanceProjection';
import type { BalanceAccountEntry, HouseholdModel } from '../types';
import AccountCard, { DEFAULT_GROUP_COLORS, COLOR_PALETTE } from '../components/AccountCard';
import SwipeableRow from '../components/SwipeableRow';
import BottomSheet from '../components/BottomSheet';
import Button from '../components/Button';
import Card from '../components/Card';
import AmountInput from '../components/AmountInput';
import { todayISO } from '../dateUtils';
import GradientFill from '../components/GradientFill';

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
  const { colors } = useTheme();
  const { model, saveModel } = useData();
  const styles = makeStyles(colors);

  // View mode: 'stacked' (Apple Wallet style, default) vs 'list' (flat cards)
  // Redesign: always a plain list here; Home's Wallet already shows the stacked cards.
  const [viewMode, setViewMode] = useState<'stacked' | 'list'>('list');
  // One + in the title bar asks which kind of account to add.
  const [chooseTypeOpen, setChooseTypeOpen] = useState(false);
  const navigation = useNavigation<any>();
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
          <Ionicons name="add" size={30} color={colors.gold} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, colors.gold]);
  // Which account card is currently expanded in stacked view, or null if all collapsed.
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);

  // Which group's add/edit form is open in the modal right now, or null if closed.
  const [activeGroup, setActiveGroup] = useState<AccountGroup | null>(null);
  // The id of the account being edited, or null if this is a brand-new account.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [amountInput, setAmountInput] = useState<number | ''>('');
  const [colorInput, setColorInput] = useState<string>(DEFAULT_GROUP_COLORS.cash);
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

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

  function handleCardPress(group: AccountGroup, account: BalanceAccountEntry, isAlreadyExpanded: boolean) {
    if (isAlreadyExpanded) {
      // Step 2: tapping the already-expanded card opens the edit modal
      openEditModal(group, account);
    } else {
      // Step 1: tapping a collapsed card brings it to front and expands it
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpandedAccountId(account.id);
    }
  }

  function handleCollapse() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedAccountId(null);
  }

  function handleToggleViewMode(mode: 'stacked' | 'list') {
    setViewMode(mode);
    setExpandedAccountId(null);
  }

  async function handleSave() {
    if (!activeGroup || !model) return;
    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      setErrorMsg('Enter an account name.');
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

  return (
    <SafeAreaView style={styles.container}>
      <PullToRefreshScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Card variant="banner" row style={{ marginBottom: 18 }}>
          <View>
            <Text style={styles.balanceBannerLabel}>TOTAL BALANCE</Text>
            <Text style={styles.balanceBannerAmount}>{formatPeso(totalBalance)}</Text>
          </View>
        </Card>

        {/* Redesign: Income lives with your accounts (money coming in). */}
        <TouchableOpacity
          style={styles.incomeRow}
          onPress={() => navigation.navigate('Income')}
          accessibilityRole="button"
          testID="accounts-income"
        >
          <GradientFill match={styles.incomeRow} />
          <View style={styles.incomeIcon}>
            <Ionicons name="trending-up" size={18} color={colors.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.incomeTitle}>Income</Text>
            <Text style={styles.incomeSub}>
              {(model.income || []).length === 0
                ? 'Add where your money comes from'
                : `${(model.income || []).length} ${(model.income || []).length === 1 ? 'source' : 'sources'} of income`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
        </TouchableOpacity>

        {GROUPS.map((group) => {
          // Live balances (saved balance + anything paid from or into it since).
          const accounts = model.balanceAccounts[group].map((a) => withCurrentBalance(model, group, a));
          const groupTotal = accounts.reduce((sum, a) => sum + accountAmountNumber(a), 0);
          const isStackedSection = viewMode === 'stacked' && accounts.length >= 2;
          const sectionHasExpanded = isStackedSection && accounts.some((a) => a.id === expandedAccountId);
          return (
            <View key={group} style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>{GROUP_LABELS[group]}</Text>
                <View style={styles.sectionHeaderRight}>
                  {sectionHasExpanded && (
                    <IconLabelHint
                      name="chevron-up"
                      label="Collapse"
                      size={15}
                      color={colors.gold}
                      onPress={handleCollapse}
                      style={styles.collapseChip}
                      testID="accounts-collapse-chip"
                    />
                  )}
                  <Text style={styles.sectionTotal}>{formatPeso(groupTotal)}</Text>
                </View>
              </View>

              {accounts.length === 0 && (
                <Text style={styles.emptyText}>
                  No {GROUP_LABELS[group].toLowerCase()} accounts yet.
                </Text>
              )}

              {accounts.map((account, index) => {
                if (!isStackedSection) {
                  return (
                    <SwipeableRow
                      key={account.id}
                      enabled={Boolean(model.settings.swipeToDeleteEnabled)}
                      onDelete={() => handleSwipeDeleteAccount(group, account)}
                      testID={`account-swipe-${account.id}`}
                    >
                      <AccountCard
                        hideTypeBadge
                        account={account}
                        group={group}
                        onPress={() => openEditModal(group, account)}
                      />
                    </SwipeableRow>
                  );
                }

                const isExpanded = expandedAccountId === account.id;
                const expandedIndex = accounts.findIndex((a) => a.id === expandedAccountId);

                let marginTop = 0;
                if (index > 0) {
                  if (expandedIndex !== -1 && index === expandedIndex + 1) {
                    marginTop = 14;
                  } else {
                    marginTop = -72;
                  }
                }

                const isDimmed = expandedIndex !== -1 && !isExpanded;

                return (
                  <AccountCard
                    hideTypeBadge
                    key={account.id}
                    account={account}
                    group={group}
                    isExpanded={isExpanded}
                    style={{
                      marginTop,
                      marginBottom: index === accounts.length - 1 ? 12 : 0,
                      zIndex: isExpanded ? 20 : index + 1,
                      opacity: isDimmed ? 0.78 : 1,
                    }}
                    onPress={() => handleCardPress(group, account, isExpanded)}
                  />
                );
              })}

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
        <Text style={styles.inputLabel}>Account name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. GCash, BPI Savings"
          placeholderTextColor={colors.inkFaint}
          value={nameInput}
          onChangeText={setNameInput}
        />

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
    viewToggleWrap: {
      flexDirection: 'row',
      backgroundColor: colors.navy2,
      borderRadius: 999,
      padding: 3,
    },
    toggleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
    },
    toggleBtnActive: {
      backgroundColor: colors.buttonFill,
    },
    toggleBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.inkDim,
    },
    toggleBtnTextActive: {
      color: colors.onButton,
      fontWeight: '700',
    },
    sectionHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    collapseChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      backgroundColor: 'rgba(233,196,106,0.12)',
    },
    collapseChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.gold,
    },
    balanceBannerLabel: {
      fontSize: 13,
      letterSpacing: 0.3,
      color: colors.inkDim,
      marginBottom: 4,
    },
    balanceBannerAmount: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.ink,
    },
    section: {
      marginBottom: 22,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.ink,
    },
    sectionTotal: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.inkDim,
    },
    emptyText: {
      fontSize: 13,
      color: colors.inkFaint,
      marginBottom: 8,
      fontStyle: 'italic',
    },
    incomeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.navy3,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 18,
      overflow: 'hidden',
    },
    incomeIcon: {
      width: 34,
      height: 34,
      borderRadius: 8,
      backgroundColor: colors.accentTint,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    incomeTitle: { fontSize: 17, color: colors.ink, fontWeight: '600' },
    incomeSub: { fontSize: 13, color: colors.inkDim, marginTop: 1 },
    typeRow: { flexDirection: 'row', alignItems: 'center', minHeight: 54 },
    typeRowTop: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    typeRowText: { fontSize: 17, color: colors.ink },
    addButton: {
      alignSelf: 'flex-start',
      paddingVertical: 8,
      paddingHorizontal: 4,
    },
    addButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.gold,
    },
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