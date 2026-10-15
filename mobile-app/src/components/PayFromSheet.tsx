import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from './AppText';
import { useTheme } from '../ThemeContext';
import { formatPeso } from '../balanceProjection';
import type { HouseholdModel, PaymentMethod } from '../types';
import BottomSheet from './BottomSheet';
import AccountPicker, { accountProblem } from './AccountPicker';
import AmountInput from './AmountInput';

// Redesign: asks which account a payment comes from (or goes into) before it's logged,
// e.g. "Mark as paid" on a bill. Same rules as a new transaction: required, and cash or
// debit can't go below zero (see AccountPicker).
type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  amount: number;
  direction: 'in' | 'out';
  model: HouseholdModel;
  initial?: PaymentMethod;
  confirmLabel: string;
  // Debts (Round 3): the amount can be changed for a partial payment. `amount` is then
  // the starting amount (the minimum due), `fullAmount` the whole amount due, and an
  // optional late fee can be entered.
  editableAmount?: boolean;
  fullAmount?: number;
  minimumAmount?: number;
  onConfirm: (pm: PaymentMethod, amount: number, lateFee: number) => void;
};

export default function PayFromSheet({ visible, onClose, title, amount, direction, model, initial, confirmLabel, editableAmount, fullAmount, minimumAmount, onConfirm }: Props) {
  const { colors } = useTheme();
  const [pm, setPm] = useState<PaymentMethod | undefined>(initial);
  const [error, setError] = useState('');
  const [payAmount, setPayAmount] = useState<number | ''>(amount);
  const [lateFee, setLateFee] = useState<number | ''>('');
  const effective = editableAmount ? (typeof payAmount === 'number' ? payAmount : 0) : amount;
  const full = typeof fullAmount === 'number' ? fullAmount : amount;
  const minimum = typeof minimumAmount === 'number' ? minimumAmount : full;
  const short = editableAmount && effective < minimum ? Math.round((minimum - effective) * 100) / 100 : 0;

  // Start from the usual account each time it opens, if that one still works.
  useEffect(() => {
    if (!visible) return;
    setError('');
    setPayAmount(amount);
    setLateFee('');
    setPm(initial && initial.accountId && !accountProblem(model, direction, amount, initial) ? initial : undefined);
  }, [visible]);

  function confirm() {
    if (editableAmount && effective <= 0) {
      setError('Enter how much you paid.');
      return;
    }
    const problem = accountProblem(model, direction, effective, pm);
    if (problem) {
      setError(problem);
      return;
    }
    onConfirm(pm as PaymentMethod, effective, editableAmount && typeof lateFee === 'number' ? lateFee : 0);
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      header={
        <View style={styles.bar}>
          <TouchableOpacity onPress={onClose} accessibilityRole="button" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.barBtn, { color: colors.gold }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.barTitle, { color: colors.ink }]} numberOfLines={1}>{title}</Text>
          <TouchableOpacity onPress={confirm} accessibilityRole="button" testID="pay-from-confirm" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.barBtn, { color: colors.gold, fontWeight: '700' }]}>{confirmLabel}</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        {editableAmount ? (
          <>
            {/* Starts at the minimum due; change it for a partial (or bigger) payment. */}
            <Text style={[styles.fieldLabel, { color: colors.inkDim }]}>Amount paid</Text>
            <AmountInput value={payAmount} onChangeAmount={(v) => { setPayAmount(v); setError(''); }} inputStyle={styles.editAmount} />
            <View style={styles.quickRow}>
              {minimum < full && (
                <TouchableOpacity onPress={() => setPayAmount(minimum)} style={[styles.quick, { backgroundColor: colors.navy1 }]} accessibilityRole="button">
                  <Text style={[styles.quickText, { color: colors.ink }]}>Minimum {formatPeso(minimum)}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setPayAmount(full)} style={[styles.quick, { backgroundColor: colors.navy1 }]} accessibilityRole="button">
                <Text style={[styles.quickText, { color: colors.ink }]}>Full {formatPeso(full)}</Text>
              </TouchableOpacity>
            </View>
            {short > 0 && (
              <Text style={[styles.note, { color: colors.orange }]}>
                {formatPeso(short)} of the minimum is unpaid. It will be added to the next amount due.
              </Text>
            )}
            <Text style={[styles.fieldLabel, { color: colors.inkDim }]}>Late fee (only if your lender charged one)</Text>
            <AmountInput value={lateFee} onChangeAmount={setLateFee} placeholder="0.00" />
          </>
        ) : (
          <Text style={[styles.amount, { color: direction === 'in' ? colors.positive : colors.negative }]}>
            {direction === 'in' ? '+' : '−'}
            {formatPeso(amount)}
          </Text>
        )}
        <AccountPicker model={model} direction={direction} amount={effective} value={pm} onChange={(p) => { setPm(p); setError(''); }} />
        {!!error && <Text style={[styles.error, { color: colors.negative }]}>{error}</Text>}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 2, paddingBottom: 12, gap: 12 },
  barBtn: { fontSize: 17 },
  barTitle: { fontSize: 17, fontWeight: '600', flexShrink: 1 },
  amount: { fontSize: 34, fontWeight: '700', textAlign: 'center', marginVertical: 12 },
  error: { fontSize: 14, marginTop: -4 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginLeft: 4, marginTop: 4 },
  editAmount: { fontSize: 24, fontWeight: '700' },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -6, marginBottom: 10 },
  quick: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  quickText: { fontSize: 14, fontWeight: '600' },
  note: { fontSize: 13, marginBottom: 10, marginLeft: 4 },
});
