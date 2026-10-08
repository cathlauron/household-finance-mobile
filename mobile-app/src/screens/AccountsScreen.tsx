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
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { Alert } from 'react-native';
import IconLabelHint from '../components/IconLabelHint';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { PullToRefreshScrollView } from '../PullToRefreshScrollView';
import { totalLiquidBalance, formatPeso } from '../balanceProjection';
import type { BalanceAccountEntry, HouseholdModel } from '../types';
import AccountCard, { DEFAULT_GROUP_COLORS, COLOR_PALETTE } from '../components/AccountCard';
import SwipeableRow from '../components/SwipeableRow';
import BottomSheet from '../components/BottomSheet';
import Button from '../components/Button';
import Card from '../components/Card';
import AmountInput from '../components/AmountInput';

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
  const [viewMode, setViewMode] = useState<'stacked' | 'list'>('stacked');
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

    const updated: HouseholdModel = {
      ...model,
      balanceAccounts: { ...model.balanceAccounts },
    };
    const currentList = updated.balanceAccounts[activeGroup];

    if (editingId) {
      updated.balanceAccounts[activeGroup] = currentList.map((a) =>
        a.id === editingId ? { ...a, name: trimmedName, amount: parsedAmount, color: colorInput } : a
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

  const totalBalance = totalLiquidBalance(model);

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
          <View style={styles.viewToggleWrap}>
  <View style={[styles.toggleBtn, viewMode === 'stacked' && styles.toggleBtnActive]}>
    <IconLabelHint
      name="albums"
      label="Stacked card view"
      size={15}
      color={viewMode === 'stacked' ? colors.navy2 : colors.inkDim}
      position="below"
      onPress={() => handleToggleViewMode('stacked')}
    />
  </View>
  <View style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}>
    <IconLabelHint
      name="reorder-three"
      label="List card view"
      size={15}
      color={viewMode === 'list' ? colors.navy2 : colors.inkDim}
      position="below"
      onPress={() => handleToggleViewMode('list')}
    />
  </View>
          </View>
        </Card>

        {GROUPS.map((group) => {
          const accounts = model.balanceAccounts[group];
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

              <TouchableOpacity style={styles.addButton} onPress={() => openAddModal(group)}>
                <Text style={styles.addButtonText}>
                  + Add {GROUP_LABELS[group].toLowerCase()} account
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </PullToRefreshScrollView>

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
      backgroundColor: colors.gold,
    },
    toggleBtnText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.inkDim,
    },
    toggleBtnTextActive: {
      color: colors.navy2,
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
      fontSize: 11,
      fontWeight: '600',
      color: colors.gold,
    },
    balanceBannerLabel: {
      fontSize: 11,
      letterSpacing: 1,
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
      fontSize: 12,
      color: colors.inkFaint,
      marginBottom: 8,
      fontStyle: 'italic',
    },
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
      fontSize: 12,
      color: colors.error,
      marginBottom: 10,
    },
  });
}