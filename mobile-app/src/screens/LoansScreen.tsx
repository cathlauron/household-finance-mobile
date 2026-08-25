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
import { getNextDueDate, formatShortDate, recurringTypeLabel, RecurringType } from '../recurrence';
import type { Loan, HouseholdModel, LoanPayment, PaymentMethod } from '../types';
import LoanPayoffSimulatorModal, { SimLoanInput } from './LoanPayoffSimulatorModal';
import PaymentMethodPicker from '../components/PaymentMethodPicker';

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

function paymentMethodLabel(pm: PaymentMethod | undefined, model: HouseholdModel): string {
  if (!pm) return 'Not set';
  if (pm.type === 'cash') return 'Cash';
  const list = pm.type === 'debit' ? model.balanceAccounts.debit : model.balanceAccounts.credit;
  const acct = list.find((a) => a.id === pm.accountId);
  const label = pm.type === 'debit' ? 'Debit' : 'Credit';
  return acct ? `${label} — ${acct.name || 'Unnamed'}` : label;
}

const RECUR_TYPES: RecurringType[] = ['onetime', 'monthly', 'annual', 'custom'];

// Sorts loans by next due date (soonest first); loans with no computable due date yet
// (e.g. saved before Checkpoint 5.4c, or never given a date) sort to the bottom.
function sortByNextDue(loans: Loan[]): Loan[] {
  return [...loans].sort((a, b) => {
    const da = getNextDueDate((a.recurringType as RecurringType) || 'onetime', a.dueDate || {});
    const db = getNextDueDate((b.recurringType as RecurringType) || 'onetime', b.dueDate || {});
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da.getTime() - db.getTime();
  });
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
  const [recurTypeInput, setRecurTypeInput] = useState<RecurringType>('onetime');
  const [onetimeDateInput, setOnetimeDateInput] = useState('');
  const [dayInput, setDayInput] = useState('');
  const [monthInput, setMonthInput] = useState('');
  const [customFreqInput, setCustomFreqInput] = useState('monthly');
  const [customStartDateInput, setCustomStartDateInput] = useState('');
  const [customOccurrenceInput, setCustomOccurrenceInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [paymentsInput, setPaymentsInput] = useState<LoanPayment[]>([]);
  const [newPaymentDate, setNewPaymentDate] = useState('');
  const [newPaymentAmount, setNewPaymentAmount] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState<PaymentMethod | undefined>(undefined);
  const [paymentError, setPaymentError] = useState('');

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
    setRecurTypeInput('onetime');
    setOnetimeDateInput('');
    setDayInput('');
    setMonthInput('');
    setCustomFreqInput('monthly');
    setCustomStartDateInput('');
    setCustomOccurrenceInput('');
    setErrorMsg('');
    setPaymentsInput([]);
    setNewPaymentDate('');
    setNewPaymentAmount('');
    setNewPaymentMethod(undefined);
    setPaymentError('');
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
    const rt = (loan.recurringType as RecurringType) || 'onetime';
    setRecurTypeInput(RECUR_TYPES.includes(rt) ? rt : 'onetime');
    const d = loan.dueDate || {};
    setOnetimeDateInput(d.date || '');
    setDayInput(d.day ? String(d.day) : '');
    setMonthInput(d.month ? String(d.month) : '');
    setCustomFreqInput(loan.customFreq || 'monthly');
    setCustomStartDateInput(loan.customStartDate || '');
    setCustomOccurrenceInput(
      typeof loan.customOccurrenceCount === 'number' ? String(loan.customOccurrenceCount) : ''
    );
    setErrorMsg('');
    setPaymentsInput(loan.actualPayments || []);
    setNewPaymentDate('');
    setNewPaymentAmount('');
    setNewPaymentMethod(undefined);
    setPaymentError('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setErrorMsg('');
  }

  function handleAddPayment() {
    const trimmedDate = newPaymentDate.trim();
    if (!trimmedDate || !/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
      setPaymentError('Enter the payment date as YYYY-MM-DD, e.g. 2026-08-25.');
      return;
    }
    const parsedAmount = parseFloat(newPaymentAmount);
    if (newPaymentAmount.trim() === '' || isNaN(parsedAmount) || parsedAmount <= 0) {
      setPaymentError('Enter a valid amount paid.');
      return;
    }
    const newPayment: LoanPayment = {
      id: makeId('lpay'),
      date: trimmedDate,
      actual: parsedAmount,
      paymentMethod: newPaymentMethod,
    };
    setPaymentsInput([newPayment, ...paymentsInput]);
    setNewPaymentDate('');
    setNewPaymentAmount('');
    setNewPaymentMethod(undefined);
    setPaymentError('');
  }

  function handleRemovePayment(paymentId: string) {
    setPaymentsInput(paymentsInput.filter((p) => p.id !== paymentId));
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

    let dueDate: Record<string, any> = {};
    if (recurTypeInput === 'onetime') {
      const trimmedDate = onetimeDateInput.trim();
      if (trimmedDate && !/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
        setErrorMsg('Enter the date as YYYY-MM-DD, e.g. 2026-08-25.');
        return;
      }
      dueDate = { date: trimmedDate };
    } else if (recurTypeInput === 'monthly') {
      const dayNum = parseInt(dayInput, 10);
      if (dayInput.trim() && (isNaN(dayNum) || dayNum < 1 || dayNum > 31)) {
        setErrorMsg('Enter a day of month between 1 and 31.');
        return;
      }
      dueDate = { day: dayInput.trim() };
    } else if (recurTypeInput === 'annual') {
      const dayNum = parseInt(dayInput, 10);
      const monthNum = parseInt(monthInput, 10);
      if (dayInput.trim() && (isNaN(dayNum) || dayNum < 1 || dayNum > 31)) {
        setErrorMsg('Enter a day of month between 1 and 31.');
        return;
      }
      if (monthInput.trim() && (isNaN(monthNum) || monthNum < 1 || monthNum > 12)) {
        setErrorMsg('Enter a month between 1 and 12.');
        return;
      }
      dueDate = { day: dayInput.trim(), month: monthInput.trim() ? monthNum : '' };
    }

    let parsedOccurrenceCount: number | '' = '';
    if (recurTypeInput === 'custom') {
      const trimmedStart = customStartDateInput.trim();
      if (!trimmedStart || !/^\d{4}-\d{2}-\d{2}$/.test(trimmedStart)) {
        setErrorMsg('Enter a start date as YYYY-MM-DD, e.g. 2026-08-25.');
        return;
      }
      if (customOccurrenceInput.trim()) {
        const n = parseInt(customOccurrenceInput, 10);
        if (isNaN(n) || n <= 0) {
          setErrorMsg('Occurrences should be a positive number, or left blank to repeat forever.');
          return;
        }
        parsedOccurrenceCount = n;
      }
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
          recurringType: recurTypeInput,
          dueDate,
          customFreq: recurTypeInput === 'custom' ? customFreqInput : undefined,
          customStartDate: recurTypeInput === 'custom' ? customStartDateInput.trim() : undefined,
          customOccurrenceCount: recurTypeInput === 'custom' ? parsedOccurrenceCount : undefined,
          actualPayments: paymentsInput,
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
        recurringType: recurTypeInput,
        dueDate,
        customFreq: recurTypeInput === 'custom' ? customFreqInput : undefined,
        customStartDate: recurTypeInput === 'custom' ? customStartDateInput.trim() : undefined,
        customOccurrenceCount: recurTypeInput === 'custom' ? parsedOccurrenceCount : undefined,
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

  const loans = sortByNextDue(model.loans);
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
          const nextDue = getNextDueDate((loan.recurringType as RecurringType) || 'onetime', loan.dueDate || {});
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
                    {' · ' + recurringTypeLabel((loan.recurringType as RecurringType) || 'onetime') + ' · ' + formatShortDate(nextDue)}
                    {!isLent && typeof loan.interestRate === 'number' && loan.interestRate > 0
                      ? ' · ' + loan.interestRate + '% APR'
                      : ''}
                  </Text>
                </View>
                <Text style={styles.loanAmount}>{formatPeso(paid)}{total > 0 ? ' / ' + formatPeso(total) : ''}</Text>
              </View>
              {total > 0 && (
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${pct}%` as const }]} />
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

                <Text style={styles.inputLabel}>Repeats</Text>
                <View style={styles.pillRow}>
                  {RECUR_TYPES.map((rt) => (
                    <TouchableOpacity
                      key={rt}
                      style={[styles.pillButton, recurTypeInput === rt && styles.pillButtonActive]}
                      onPress={() => setRecurTypeInput(rt)}
                    >
                      <Text style={[styles.pillButtonText, recurTypeInput === rt && styles.pillButtonTextActive]}>
                        {recurringTypeLabel(rt)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {recurTypeInput === 'onetime' && (
                  <>
                    <Text style={styles.inputLabel}>Due date (YYYY-MM-DD)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="2026-08-25"
                      placeholderTextColor={colors.inkFaint}
                      value={onetimeDateInput}
                      onChangeText={setOnetimeDateInput}
                    />
                  </>
                )}

                {recurTypeInput === 'monthly' && (
                  <>
                    <Text style={styles.inputLabel}>Day of month (1–31)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 15"
                      placeholderTextColor={colors.inkFaint}
                      keyboardType="number-pad"
                      value={dayInput}
                      onChangeText={setDayInput}
                    />
                  </>
                )}

                {recurTypeInput === 'annual' && (
                  <View style={styles.row2}>
                    <View style={styles.row2Item}>
                      <Text style={styles.inputLabel}>Month (1–12)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. 3"
                        placeholderTextColor={colors.inkFaint}
                        keyboardType="number-pad"
                        value={monthInput}
                        onChangeText={setMonthInput}
                      />
                    </View>
                    <View style={styles.row2Item}>
                      <Text style={styles.inputLabel}>Day</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. 15"
                        placeholderTextColor={colors.inkFaint}
                        keyboardType="number-pad"
                        value={dayInput}
                        onChangeText={setDayInput}
                      />
                    </View>
                  </View>
                )}

                {recurTypeInput === 'custom' && (
                  <>
                    <Text style={styles.inputLabel}>Frequency</Text>
                    <View style={styles.pillRow}>
                      {['daily', 'weekly', 'biweekly', 'monthly', 'yearly'].map((freq) => (
                        <TouchableOpacity
                          key={freq}
                          style={[styles.pillButton, customFreqInput === freq && styles.pillButtonActive]}
                          onPress={() => setCustomFreqInput(freq)}
                        >
                          <Text
                            style={[
                              styles.pillButtonText,
                              customFreqInput === freq && styles.pillButtonTextActive,
                            ]}
                          >
                            {freq.charAt(0).toUpperCase() + freq.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.inputLabel}>Starts on (YYYY-MM-DD)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="2026-08-25"
                      placeholderTextColor={colors.inkFaint}
                      value={customStartDateInput}
                      onChangeText={setCustomStartDateInput}
                    />

                    <Text style={styles.inputLabel}>Occurrences (optional)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Leave blank to repeat forever"
                      placeholderTextColor={colors.inkFaint}
                      keyboardType="number-pad"
                      value={customOccurrenceInput}
                      onChangeText={setCustomOccurrenceInput}
                    />
                  </>
                )}

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

                {editingId ? (
                  <View style={styles.paymentLogSection}>
                    <Text style={styles.inputLabel}>Payment log</Text>

                    {paymentsInput.length === 0 && (
                      <Text style={styles.emptyText}>No payments logged yet.</Text>
                    )}

                    {paymentsInput.map((p) => (
                      <View key={p.id} style={styles.paymentRow}>
                        <View style={styles.paymentRowMain}>
                          <Text style={styles.paymentRowDate}>{p.date}</Text>
                          <Text style={styles.paymentRowMethod}>{paymentMethodLabel(p.paymentMethod, model)}</Text>
                        </View>
                        <Text style={styles.paymentRowAmount}>
                          {formatPeso(typeof p.actual === 'number' ? p.actual : 0)}
                        </Text>
                        <TouchableOpacity onPress={() => handleRemovePayment(p.id)} style={styles.paymentRemoveBtn}>
                          <Text style={styles.paymentRemoveBtnText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}

                    <View style={styles.paymentAddBox}>
                      <Text style={styles.inputLabel}>Log a new payment</Text>
                      <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="2026-08-25"
                        placeholderTextColor={colors.inkFaint}
                        value={newPaymentDate}
                        onChangeText={setNewPaymentDate}
                      />
                      <Text style={styles.inputLabel}>Amount paid</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="0.00"
                        placeholderTextColor={colors.inkFaint}
                        keyboardType="decimal-pad"
                        value={newPaymentAmount}
                        onChangeText={setNewPaymentAmount}
                      />
                      <PaymentMethodPicker
                        value={newPaymentMethod}
                        onChange={setNewPaymentMethod}
                        debitAccounts={model.balanceAccounts.debit}
                        creditAccounts={model.balanceAccounts.credit}
                      />
                      {!!paymentError && <Text style={styles.errorText}>{paymentError}</Text>}
                      <TouchableOpacity style={styles.paymentAddButton} onPress={handleAddPayment}>
                        <Text style={styles.paymentAddButtonText}>+ Add payment</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.fieldHint}>
                    Save this loan first, then reopen it to log payments against it.
                  </Text>
                )}

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
    paymentLogSection: {
      marginTop: 4,
      marginBottom: 14,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: colors.navy2,
    },
    paymentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.navy2,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 10,
      marginBottom: 8,
    },
    paymentRowMain: { flex: 1, marginRight: 8 },
    paymentRowDate: { fontSize: 12.5, fontWeight: '600', color: colors.ink },
    paymentRowMethod: { fontSize: 11, color: colors.inkDim, marginTop: 1 },
    paymentRowAmount: { fontSize: 12.5, fontWeight: '600', color: colors.ink, marginRight: 8 },
    paymentRemoveBtn: { paddingHorizontal: 6, paddingVertical: 2 },
    paymentRemoveBtnText: { fontSize: 13, color: colors.inkFaint },
    paymentAddBox: {
      backgroundColor: colors.navy2,
      borderRadius: 10,
      padding: 12,
      marginTop: 4,
    },
    paymentAddButton: {
      backgroundColor: colors.navy3,
      borderRadius: 999,
      paddingVertical: 10,
      alignItems: 'center',
      marginTop: 2,
    },
    paymentAddButtonText: { fontSize: 12.5, fontWeight: '700', color: colors.gold },
    row2: { flexDirection: 'row', gap: 10 },
    row2Item: { flex: 1 },
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
