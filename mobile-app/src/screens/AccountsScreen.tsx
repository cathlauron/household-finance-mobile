import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { totalLiquidBalance, formatPeso } from '../balanceProjection';
import type { BalanceAccountEntry, HouseholdModel } from '../types';
import AccountCard, { DEFAULT_GROUP_COLORS, COLOR_PALETTE } from '../components/AccountCard';

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

  // Which group's add/edit form is open in the modal right now, or null if closed.
  const [activeGroup, setActiveGroup] = useState<AccountGroup | null>(null);
  // The id of the account being edited, or null if this is a brand-new account.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [colorInput, setColorInput] = useState<string>(DEFAULT_GROUP_COLORS.cash);
  const [errorMsg, setErrorMsg] = useState('');

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
    setAmountInput(account.amount === '' ? '' : String(account.amount));
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
      setErrorMsg('Give this account a name.');
      return;
    }
    const parsedAmount = amountInput.trim() === '' ? 0 : parseFloat(amountInput);
    if (isNaN(parsedAmount)) {
      setErrorMsg('Enter a valid amount.');
      return;
    }

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

    await saveModel(updated);
    closeModal();
  }

  async function handleDelete() {
    if (!activeGroup || !editingId || !model) return;
    const updated: HouseholdModel = {
      ...model,
      balanceAccounts: { ...model.balanceAccounts },
    };
    updated.balanceAccounts[activeGroup] = updated.balanceAccounts[activeGroup].filter(
      (a) => a.id !== editingId
    );
    await saveModel(updated);
    closeModal();
  }

  const totalBalance = totalLiquidBalance(model);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.balanceBanner}>
          <Text style={styles.balanceBannerLabel}>TOTAL BALANCE</Text>
          <Text style={styles.balanceBannerAmount}>{formatPeso(totalBalance)}</Text>
        </View>

        {GROUPS.map((group) => {
          const accounts = model.balanceAccounts[group];
          const groupTotal = accounts.reduce((sum, a) => sum + accountAmountNumber(a), 0);
          return (
            <View key={group} style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>{GROUP_LABELS[group]}</Text>
                <Text style={styles.sectionTotal}>{formatPeso(groupTotal)}</Text>
              </View>

              {accounts.length === 0 && (
                <Text style={styles.emptyText}>
                  No {GROUP_LABELS[group].toLowerCase()} accounts yet.
                </Text>
              )}

              {accounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  group={group}
                  onPress={() => openEditModal(group, account)}
                />
              ))}

              <TouchableOpacity style={styles.addButton} onPress={() => openAddModal(group)}>
                <Text style={styles.addButtonText}>
                  + Add {GROUP_LABELS[group].toLowerCase()} account
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={activeGroup !== null} transparent animationType="fade" onRequestClose={closeModal}>
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardWrap}
          >
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <Text style={styles.modalTitle}>
                {editingId
                  ? 'Edit account'
                  : `New ${activeGroup ? GROUP_LABELS[activeGroup].toLowerCase() : ''} account`}
              </Text>

              <Text style={styles.inputLabel}>Account name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. GCash, BPI Savings"
                placeholderTextColor={colors.inkFaint}
                value={nameInput}
                onChangeText={setNameInput}
              />

              <Text style={styles.inputLabel}>Balance</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={colors.inkFaint}
                keyboardType="decimal-pad"
                value={amountInput}
                onChangeText={setAmountInput}
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

              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>

              {editingId && (
                <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                  <Text style={styles.deleteButtonText}>Remove this account</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.navy2,
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
    balanceBanner: {
      backgroundColor: colors.navy3,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginBottom: 18,
    },
    balanceBannerLabel: {
      fontSize: 10,
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
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    modalKeyboardWrap: {
      width: '100%',
      alignItems: 'center',
    },
    modalCard: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: colors.navy3,
      borderRadius: 14,
      padding: 20,
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.ink,
      marginBottom: 16,
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
      color: '#e5484d',
      marginBottom: 10,
    },
    saveButton: {
      backgroundColor: colors.gold,
      borderRadius: 999,
      paddingVertical: 12,
      alignItems: 'center',
      marginBottom: 10,
    },
    saveButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.navy2,
    },
    deleteButton: {
      alignItems: 'center',
      paddingVertical: 10,
      marginBottom: 4,
    },
    deleteButtonText: {
      fontSize: 13,
      color: '#e5484d',
      fontWeight: '600',
    },
    cancelButton: {
      alignItems: 'center',
      paddingVertical: 8,
    },
    cancelButtonText: {
      fontSize: 13,
      color: colors.inkDim,
    },
  });
}