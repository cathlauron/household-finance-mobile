import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from './AppText';
import { useTheme } from '../ThemeContext';
import { formatPeso } from '../balanceProjection';
import type { HouseholdModel, PaymentMethod } from '../types';
import BottomSheet from './BottomSheet';
import AccountPicker, { accountProblem } from './AccountPicker';

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
  onConfirm: (pm: PaymentMethod) => void;
};

export default function PayFromSheet({ visible, onClose, title, amount, direction, model, initial, confirmLabel, onConfirm }: Props) {
  const { colors } = useTheme();
  const [pm, setPm] = useState<PaymentMethod | undefined>(initial);
  const [error, setError] = useState('');

  // Start from the usual account each time it opens, if that one still works.
  useEffect(() => {
    if (!visible) return;
    setError('');
    setPm(initial && initial.accountId && !accountProblem(model, direction, amount, initial) ? initial : undefined);
  }, [visible]);

  function confirm() {
    const problem = accountProblem(model, direction, amount, pm);
    if (problem) {
      setError(problem);
      return;
    }
    onConfirm(pm as PaymentMethod);
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
        <Text style={[styles.amount, { color: direction === 'in' ? colors.positive : colors.negative }]}>
          {direction === 'in' ? '+' : '−'}
          {formatPeso(amount)}
        </Text>
        <AccountPicker model={model} direction={direction} amount={amount} value={pm} onChange={(p) => { setPm(p); setError(''); }} />
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
});
