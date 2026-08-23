import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { formatPeso } from '../balanceProjection';
import {
  buildTransactionsList,
  sortTransactions,
  transactionTotals,
  TransactionEntry,
} from '../transactions';

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const SOURCE_LABELS: Record<string, string> = { bill: 'Bill', debt: 'Debt', loan: 'Loan' };

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const { model } = useData();
  const styles = makeStyles(colors);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const transactions = useMemo(() => {
    if (!model) return [];
    return sortTransactions(buildTransactionsList(model), sortOrder);
  }, [model, sortOrder]);

  const totals = useMemo(() => transactionTotals(transactions), [transactions]);

  if (!model) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>TOTAL IN</Text>
            <Text style={[styles.statAmount, { color: '#2f9e44' }]}>{formatPeso(totals.totalIn)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>TOTAL OUT</Text>
            <Text style={[styles.statAmount, { color: '#e5484d' }]}>{formatPeso(totals.totalOut)}</Text>
          </View>
        </View>
        <View style={styles.netBanner}>
          <Text style={styles.netLabel}>NET</Text>
          <Text style={styles.netAmount}>{formatPeso(totals.net)}</Text>
        </View>

        <View style={styles.pillRow}>
          <TouchableOpacity
            style={[styles.pillButton, sortOrder === 'newest' && styles.pillButtonActive]}
            onPress={() => setSortOrder('newest')}
          >
            <Text style={[styles.pillButtonText, sortOrder === 'newest' && styles.pillButtonTextActive]}>
              Newest first
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pillButton, sortOrder === 'oldest' && styles.pillButtonActive]}
            onPress={() => setSortOrder('oldest')}
          >
            <Text style={[styles.pillButtonText, sortOrder === 'oldest' && styles.pillButtonTextActive]}>
              Oldest first
            </Text>
          </TouchableOpacity>
        </View>

        {transactions.length === 0 && (
          <Text style={styles.emptyText}>
            Nothing recorded yet. Mark a bill, debt, or loan as paid and it'll show up here.
          </Text>
        )}

        {transactions.map((t: TransactionEntry) => (
          <View key={t.id} style={styles.txnRow}>
            <View style={styles.txnMain}>
              <Text style={styles.txnLabel} numberOfLines={1}>{t.label}</Text>
              <Text style={styles.txnSub} numberOfLines={1}>
                {t.category} · {formatDateLabel(t.date)} · {SOURCE_LABELS[t.source]}
              </Text>
            </View>
            <Text style={[styles.txnAmount, { color: t.direction === 'in' ? '#2f9e44' : '#e5484d' }]}>
              {t.direction === 'in' ? '+' : '−'}{formatPeso(t.amount)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.navy2 },
    loadingContainer: { alignItems: 'center', justifyContent: 'center' },
    scrollContent: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 40 },
    statRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    statCard: {
      flex: 1,
      backgroundColor: colors.navy3,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 14,
    },
    statLabel: { fontSize: 10, letterSpacing: 1, color: colors.inkDim, marginBottom: 4 },
    statAmount: { fontSize: 17, fontWeight: '700' },
    netBanner: {
      backgroundColor: colors.navy3,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginBottom: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    netLabel: { fontSize: 10, letterSpacing: 1, color: colors.inkDim },
    netAmount: { fontSize: 20, fontWeight: '700', color: colors.ink },
    pillRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    pillButton: {
      flex: 1,
      backgroundColor: colors.navy3,
      borderRadius: 999,
      paddingVertical: 9,
      alignItems: 'center',
    },
    pillButtonActive: { backgroundColor: colors.gold },
    pillButtonText: { fontSize: 12, fontWeight: '600', color: colors.inkDim },
    pillButtonTextActive: { color: colors.navy2 },
    emptyText: { fontSize: 12, color: colors.inkFaint, fontStyle: 'italic', marginTop: 6 },
    txnRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.navy3,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 8,
    },
    txnMain: { flex: 1, marginRight: 10 },
    txnLabel: { fontSize: 13.5, fontWeight: '600', color: colors.ink },
    txnSub: { fontSize: 11, color: colors.inkFaint, marginTop: 2 },
    txnAmount: { fontSize: 13.5, fontWeight: '700' },
  });
}
