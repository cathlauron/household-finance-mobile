// ============================================================
// Household Finance App — Merchant Spending report (Checkpoint 10.2)
// ============================================================
// Groups every 'out' transaction from buildTransactionsList() by
// its label field (e.g. "Meralco", "SM Supermarket") — this is
// the closest thing to a "merchant/payee" the data model has today,
// since there's no separate merchant field yet. Ranked by total
// spent, each row also shows transaction count and average amount.
// ============================================================

import React from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useData } from '../../DataContext';
import { useTheme } from '../../ThemeContext';
import { formatPeso } from '../../balanceProjection';
import { buildTransactionsList } from '../../transactions';

type MerchantTotal = {
  label: string;
  total: number;
  count: number;
  average: number;
};

export default function MerchantSpendingReport() {
  const { model, loading } = useData();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  if (loading || !model) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  const allTransactions = buildTransactionsList(model);
  const outTransactions = allTransactions.filter((t) => t.direction === 'out');

  const merchantMap: Record<string, { total: number; count: number }> = {};
  outTransactions.forEach((t) => {
    const key = (t.label || '').trim() || 'Unlabeled';
    if (!merchantMap[key]) {
      merchantMap[key] = { total: 0, count: 0 };
    }
    merchantMap[key].total += t.amount;
    merchantMap[key].count += 1;
  });

  const merchants: MerchantTotal[] = Object.entries(merchantMap)
    .map(([label, v]) => ({
      label,
      total: v.total,
      count: v.count,
      average: v.count > 0 ? v.total / v.count : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const grandTotal = merchants.reduce((s, m) => s + m.total, 0);
  const maxAmount = merchants.length > 0 ? merchants[0].total : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Merchant Spending</Text>
        <Text style={styles.subLabel}>
          {merchants.length === 0
            ? 'No expenses logged yet.'
            : `${merchants.length} merchant${merchants.length === 1 ? '' : 's'} · ${formatPeso(grandTotal)} total`}
        </Text>
      </View>

      {merchants.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptyText}>Nothing to show yet — log a bill payment or manual transaction to see it here.</Text>
        </View>
      ) : (
        merchants.map((m) => {
          const pct = maxAmount > 0 ? (m.total / maxAmount) * 100 : 0;
          return (
            <View key={m.label} style={styles.card}>
              <View style={styles.merchantHeaderRow}>
                <Text style={styles.merchantName} numberOfLines={1}>
                  {m.label}
                </Text>
                <Text style={styles.merchantTotal}>{formatPeso(m.total)}</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.merchantMeta}>
                {m.count} transaction{m.count === 1 ? '' : 's'} · avg {formatPeso(m.average)}
              </Text>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.navy1 },
    contentContainer: { padding: 14, paddingBottom: 32 },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navy1 },
    card: { backgroundColor: colors.navy3, borderRadius: 10, padding: 16, marginBottom: 12 },
    cardLabel: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: colors.inkDim,
      marginBottom: 6,
    },
    subLabel: { fontSize: 12, color: colors.inkFaint },
    emptyText: { fontSize: 13, color: colors.inkFaint },
    merchantHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    merchantName: { fontSize: 14, fontWeight: '600', color: colors.ink, flex: 1, marginRight: 8 },
    merchantTotal: { fontSize: 14, fontWeight: '700', color: colors.ink },
    progressTrack: { height: 8, borderRadius: 999, backgroundColor: colors.navy4, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: colors.gold, borderRadius: 999 },
    merchantMeta: { fontSize: 11, color: colors.inkFaint, marginTop: 8 },
  });
}
