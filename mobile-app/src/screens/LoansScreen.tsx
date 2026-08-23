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
import { formatPeso } from '../balanceProjection';
import type { Loan, HouseholdModel } from '../types';
import LoanPayoffSimulatorModal, { SimLoanInput } from './LoanPayoffSimulatorModal';

function makeId(prefix: string): string {
  return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

function loanPaidTotal(loan: Loan): number {
  return loan.actualPayments.reduce((sum, p) => {
    return sum + (typeof p.actual === 'number' ? p.actual : 0);
  }, 0);
}

function loanTotal(loan: Loan): number {
  return typeof loan.totalAmount === 'number' ? loan.totalAmount : 0;
}

function loanProgressPct(loan: Loan): number {
  const total = loanTotal(loan);
  if (total <= 0) return 0;
  const pct = (loanPaidTotal(loan) / total) * 100;
  return Math.min(100, Math.max(0, pct));
}

// Sorts loans alphabetically by name (loans have no due date to sort by, unlike bills/debts).
function sortByName(loans: Loan[]): Loan[] {
  return [...loans].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

export default function LoansScreen() {
  const { colors } = useTheme();
  const { model, saveModel } = useData();
  const styles = makeStyles(colors);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [loanTypeInput, setLoanTypeInput] = useState('');
  const [directionInput, setDirectionInput] = useState<'borrowed' | 'lent'>('borrowed');
  const [totalAmountInput, setTotalAmountInput] = useState('');
  const [expectedPaymentInput, setExpectedPaymentInput] = useState('');
  const [interestRateInput, setInterestRateInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [simulatorOpen, setSimulatorOpen] = useState(false);

  if (!model) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  function openAddModal() {
    setEditingId(null);
    setNameInput('');
    setLoanTypeInput('');
    setDirectionInput('borrowed');
    setTotalAmountInput('');
    setExpectedPaymentInput('');
    setInterestRateInput('');
    setErrorMsg('');
    setModalOpen(true);
  }

  function openEditModal(loan: Loan) {
    setEditingId(loan.id);
    setNameInput(loan.name);
    setLoanTypeInput(loan.loanType || '');
    setDirectionInput(loan.direction === 'lent' ? 'lent' : 'borrowed');
    setTotalAmountInput(loanTotal(loan) === 0 ? '' : String(loanTotal(loan)));
    setExpectedPaymentInput(
      typeof loan.expectedPayment === 'number' ? String(loan.expectedPayment) : ''
    );
    setInterestRateInput(typeof loan.interestRate === 'number' ? String(loan.interestRate) : '');
    setErrorMsg('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setErrorMsg('');
  }

  async function handleSave() {
    if (!model) return;
    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      setErrorMsg('Enter a name for this loan.');
      return;
    }
    let parsedTotal: number | '' = '';
    if (totalAmountInput.trim() !== '') {
      const n = parseFloat(totalAmountInput);
      if (isNaN(n)) {
        setErrorMsg('Enter a valid total amount, or leave it blank.');
        return;
      }
      parsedTotal = n;
    }
    let parsedExpected: number | '' = '';
    if (expectedPaymentInput.trim() !== '') {
      const n = parseFloat(expectedPaymentInput);
      if (isNaN(n)) {
        setErrorMsg('Enter a valid expected payment, or leave it blank.');
        return;
      }
      parsedExpected = n;
    }
    let parsedRate: number | '' = '';
    if (interestRateInput.trim() !== '') {
      const n = parseFloat(interestRateInput);
      if (isNaN(n)) {
        setErrorMsg('Enter a valid interest rate (e.g. 12), or leave it blank.');
        return;
      }
      parsedRate = n;
    }

    const updated: HouseholdModel = { ...model, loans: [...model.loans] };

    if (editingId) {
      updated.loans = updated.loans.map((l) => {
        if (l.id !== editingId) return l;
        return {
          ...l,
          name: trimmedName,
          loanType: loanTypeInput.trim(),
          direction: directionInput,
          totalAmount: parsedTotal,
          expectedPayment: parsedExpected,
          interestRate: parsedRate,
        };
      });
    } else {
      const newLoan: Loan = {
        id: makeId('loan'),
        name: trimmedName,
        loanType: loanTypeInput.trim(),
        totalAmount: parsedTotal,
        expectedPayment: parsedExpected,
        interestRate: parsedRate,
        actualPayments: [],
        owner: 'shared',
        direction: directionInput,
        createdAt: Date.now(),
      };
      updated.loans = [...updated.loans, newLoan];
    }

    await saveModel(updated);
    closeModal();
  }

  async function handleDelete() {
    if (!editingId || !model) return;
    const updated: HouseholdModel = {
      ...model,
      loans: model.loans.filter((l) => l.id !== editingId),
    };
    await saveModel(updated);
    closeModal();
  }

  const loans = sortByName(model.loans);
  const totalBorrowed = loans
    .filter((l) => l.direction !== 'lent')
    .reduce((sum, l) => sum + (loanTotal(l) - loanPaidTotal(l)), 0);

  // Only borrowed loans with a real remaining balance are worth simulating — a "lent" loan
  // (money owed to you) or a fully-paid loan wouldn't make sense in a payoff projection.
  const simLoans: SimLoanInput[] = loans
    .filter((l) => l.direction !== 'lent')
    .map((l) => {
      const balance = Math.max(0, loanTotal(l) - loanPaidTotal(l));
      return {
        id: l.id,
        name: l.name || 'Untitled loan',
        balance,
        rate: typeof l.interestRate === 'number' ? l.interestRate : 0,
        hasRate: typeof l.interestRate === 'number',
        minPayment: typeof l.expectedPayment === 'number' ? l.expectedPayment : 0,
        hasMinPayment: typeof l.expectedPayment === 'number' && l.expectedPayment > 0,
      };
    })
    .filter((l) => l.balance > 0.01);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.balanceBanner}>
          <Text style={styles.balanceBannerLabel}>REMAINING ON LOANS (BORROWED)</Text>
          <Text style={styles.balanceBannerAmount}>{formatPeso(Math.max(0, totalBorrowed))}</Text>
        </View>

        {simLoans.length > 0 && (
          <TouchableOpacity style={styles.simulatorButton} onPress={() => setSimulatorOpen(true)}>
            <Text style={styles.simulatorButtonText}>📊  View Payoff Simulator</Text>
          </TouchableOpacity>
        )}

        {loans.length === 0 && (
          <Text style={styles.emptyText}>No loans yet. Add your first one below.</Text>
        )}

        {loans.map((loan) => {
          const paid = loanPaidTotal(loan);
          const total = loanTotal(loan);
          const pct = loanProgressPct(loan);
          const isLent = loan.direction === 'lent';
          return (
            <TouchableOpacity
              key={loan.id}
              style={styles.loanRow}
              activeOpacity={0.7}
              onPress={() => openEditModal(loan)}
            >
              <View style={styles.loanRowTop}>
                <View style={styles.loanRowMain}>
                  <Text style={styles.loanName} numberOfLines={1}>
                    {loan.name || 'Untitled loan'}
                  </Text>
                  <Text style={styles.loanSub} numberOfLines={1}>
                    {(loan.loanType || 'Loan')}
                    {isLent ? ' · Lent (owed to you)' : ' · Borrowed'}
                    {!isLent && typeof loan.interestRate === 'number' && loan.interestRate > 0
                      ? ' · ' + loan.interestRate + '% APR'
                      : ''}
                  </Text>
                </View>
                <Text style={styles.loanAmount}>{formatPeso(paid)}{total > 0 ? ' / ' + formatPeso(total) : ''}</Text>
              </View>
              {total > 0 && (
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: pct + '%' }]} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>+ Add loan</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={closeModal}>
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardWrap}
          >
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>{editingId ? 'Edit loan' : 'New loan'}</Text>

                <Text style={styles.inputLabel}>Loan name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Car loan, Motorcycle loan"
                  placeholderTextColor={colors.inkFaint}
                  value={nameInput}
                  onChangeText={setNameInput}
                />

                <Text style={styles.inputLabel}>Loan type (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Car, Motorcycle, Personal, Home"
                  placeholderTextColor={colors.inkFaint}
                  value={loanTypeInput}
                  onChangeText={setLoanTypeInput}
                />

                <Text style={styles.inputLabel}>Direction</Text>
                <View style={styles.pillRow}>
                  <TouchableOpacity
                    style={[styles.pillButton, directionInput === 'borrowed' && styles.pillButtonActive]}
                    onPress={() => setDirectionInput('borrowed')}
                  >
                    <Text
                      style={[styles.pillButtonText, directionInput === 'borrowed' && styles.pillButtonTextActive]}
                    >
                      Borrowed (I owe this)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pillButton, directionInput === 'lent' && styles.pillButtonActive]}
                    onPress={() => setDirectionInput('lent')}
                  >
                    <Text
                      style={[styles.pillButtonText, directionInput === 'lent' && styles.pillButtonTextActive]}
                    >
                      Lent (owed to me)
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>Total loan amount</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor={colors.inkFaint}
                  keyboardType="decimal-pad"
                  value={totalAmountInput}
                  onChangeText={setTotalAmountInput}
                />

                <Text style={styles.inputLabel}>Expected payment per cycle (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor={colors.inkFaint}
                  keyboardType="decimal-pad"
                  value={expectedPaymentInput}
                  onChangeText={setExpectedPaymentInput}
                />

                <Text style={styles.inputLabel}>Interest rate, annual % (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 12"
                  placeholderTextColor={colors.inkFaint}
                  keyboardType="decimal-pad"
                  value={interestRateInput}
                  onChangeText={setInterestRateInput}
                />
                <Text style={styles.fieldHint}>
                  Used by the Payoff Simulator to estimate interest — leave blank if you're not sure,
                  and it'll assume 0%.
                </Text>

                {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>

                {editingId && (
                  <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                    <Text style={styles.deleteButtonText}>Delete this loan</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </ScrollView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      <LoanPayoffSimulatorModal
        visible={simulatorOpen}
        onClose={() => setSimulatorOpen(false)}
        loans={simLoans}
        colors={colors}
      />
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.navy2 },
    loadingContainer: { alignItems: 'center', justifyContent: 'center' },
    scrollContent: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 40 },
    balanceBanner: {
      backgroundColor: colors.navy3,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    balanceBannerLabel: { fontSize: 10, letterSpacing: 1, color: colors.inkDim, marginBottom: 4 },
    balanceBannerAmount: { fontSize: 22, fontWeight: '700', color: colors.ink },
    simulatorButton: {
      backgroundColor: colors.navy3,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      marginBottom: 18,
    },
    simulatorButtonText: { fontSize: 13.5, fontWeight: '700', color: colors.gold },
    emptyText: { fontSize: 12, color: colors.inkFaint, marginBottom: 12, fontStyle: 'italic' },
    loanRow: {
      backgroundColor: colors.navy3,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 8,
    },
    loanRowTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    loanRowMain: { flex: 1, marginRight: 10 },
    loanName: { fontSize: 14, fontWeight: '600', color: colors.ink },
    loanSub: { fontSize: 11.5, color: colors.inkDim, marginTop: 2 },
    loanAmount: { fontSize: 14, fontWeight: '600', color: colors.ink },
    progressTrack: {
      height: 6,
      borderRadius: 999,
      backgroundColor: colors.navy2,
      overflow: 'hidden',
      marginTop: 10,
    },
    progressFill: {
      height: 6,
      borderRadius: 999,
      backgroundColor: colors.gold,
    },
    addButton: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 4, marginTop: 4 },
    addButtonText: { fontSize: 13, fontWeight: '600', color: colors.gold },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    modalKeyboardWrap: { width: '100%', alignItems: 'center', maxHeight: '85%' },
    modalCard: {
      width: '100%',
      maxWidth: 360,
      maxHeight: '100%',
      backgroundColor: colors.navy3,
      borderRadius: 14,
      padding: 20,
    },
    modalTitle: { fontSize: 17, fontWeight: '700', color: colors.ink, marginBottom: 16 },
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
    fieldHint: { fontSize: 11, color: colors.inkFaint, marginTop: -10, marginBottom: 14, lineHeight: 15 },
    pillRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    pillButton: {
      flex: 1,
      backgroundColor: colors.navy2,
      borderRadius: 999,
      paddingVertical: 10,
      alignItems: 'center',
    },
    pillButtonActive: { backgroundColor: colors.gold },
    pillButtonText: { fontSize: 12, fontWeight: '600', color: colors.inkDim },
    pillButtonTextActive: { color: colors.navy2 },
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
  });
}
