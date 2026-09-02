import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../ThemeContext';
import type { PaymentMethod, BalanceAccountEntry } from '../types';

// ---- Checkpoint 10.2b: reusable Cash/Debit/Credit picker ----
// Used anywhere a payment gets logged — Bill cycles, Debt cycles, Loan payments, and the
// manual Transaction form. Tapping "Debit" or "Credit" reveals a second row of the
// person's actual accounts of that type to choose from; if that list is empty, the second
// row is skipped rather than showing nothing to pick.
type Props = {
  value: PaymentMethod | undefined;
  onChange: (value: PaymentMethod | undefined) => void;
  debitAccounts: BalanceAccountEntry[];
  creditAccounts: BalanceAccountEntry[];
};

const TYPES: Array<{ key: PaymentMethod['type']; label: string }> = [
  { key: 'cash', label: 'Cash' },
  { key: 'debit', label: 'Debit' },
  { key: 'credit', label: 'Credit' },
];

export default function PaymentMethodPicker({ value, onChange, debitAccounts, creditAccounts }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  function selectType(type: PaymentMethod['type']) {
    if (type === 'cash') {
      onChange({ type: 'cash', accountId: '' });
      return;
    }
    onChange({ type, accountId: '' });
  }

  function selectAccount(accountId: string) {
    if (!value) return;
    onChange({ type: value.type, accountId });
  }

  const accountsToShow = value?.type === 'debit' ? debitAccounts : value?.type === 'credit' ? creditAccounts : [];

  return (
    <View>
      <Text style={styles.label}>Paid with (optional)</Text>
      <View style={styles.pillRow}>
        {TYPES.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.pillButton, value?.type === t.key && styles.pillButtonActive]}
            onPress={() => selectType(t.key)}
          >
            <Text style={[styles.pillButtonText, value?.type === t.key && styles.pillButtonTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {value && value.type !== 'cash' && (
        accountsToShow.length > 0 ? (
          <View style={styles.pillRow}>
            {accountsToShow.map((acct) => (
              <TouchableOpacity
                key={acct.id}
                style={[styles.pillButton, value.accountId === acct.id && styles.pillButtonActive]}
                onPress={() => selectAccount(acct.id)}
              >
                <Text
                  style={[styles.pillButtonText, value.accountId === acct.id && styles.pillButtonTextActive]}
                  numberOfLines={1}
                >
                  {acct.name || 'Unnamed'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyHint}>
            No {value.type} accounts added yet — add one under Accounts first.
          </Text>
        )
      )}
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    label: {
      fontSize: 11,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: colors.inkDim,
      marginBottom: 6,
    },
    pillRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
    pillButton: {
      flex: 1,
      minWidth: 80,
      backgroundColor: colors.navy2,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 10,
      alignItems: 'center',
    },
    pillButtonActive: { backgroundColor: colors.gold },
    pillButtonText: { fontSize: 12, fontWeight: '600', color: colors.inkDim },
    pillButtonTextActive: { color: colors.navy2 },
    emptyHint: {
      fontSize: 11.5,
      color: colors.inkFaint,
      fontStyle: 'italic',
      marginTop: -6,
      marginBottom: 14,
    },
  });
}
