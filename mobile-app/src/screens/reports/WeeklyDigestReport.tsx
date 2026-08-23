// ============================================================
// Household Finance App — Weekly Digest report (Checkpoint 10.2)
// ============================================================
// Last 7 days (today minus 6 days, through today, inclusive) of
// transactions from buildTransactionsList(). Shows Income/Expenses/
// Net, a spending-by-category breakdown, and the individual
// transactions in that window — same visual language as
// MonthlyCloseOutReport.tsx, which this was modeled on directly.
// ============================================================

import React from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useData } from '../../DataContext';
import { useTheme } from '../../ThemeContext';
import { formatPeso } from '../../balanceProjection';
import { buildTransactionsList, transactionTotals } from '../../transactions';
import type { TransactionEntry } from '../../transactions';

type CategoryTotal = {
  category: string;
  amount: number;
};

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatShort(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export default function WeeklyDigestReport() {
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

  const today = new Date();
  const sixDaysAgo = new Date(today);
  sixDaysAgo.setDate(today.getDate() - 6);
  const rangeStartKey = toDateKey(sixDaysAgo);
  const rangeEndKey = toDateKey(today);
  const rangeLabel = `${formatShort(rangeStartKey)} – ${formatShort(rangeEndKey)}`;

  const allTransactions = buildTransactionsList(model);
  const weekTransactions = allTransactions.filter(
    (t) => t.date >= rangeStartKey && t.date <= rangeEndKey
  );
  const weekTotals = transactionTotals(weekTransactions);

  const categoryMap: Record<string, number> = {};
  weekTransactions
    .filter((t) => t.direction === 'out')
    .forEach((t) => {
      const key = t.category || 'Uncategorized';
      categoryMap[key] = (categoryMap[key] || 0) + t.amount;
    });
  const categoryTotals: CategoryTotal[] = Object.entries(categoryMap)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
  const maxCategoryAmount = categoryTotals.length > 0 ? categoryTotals[0].amount : 0;

  const sortedTransactions: TransactionEntry[] = [...weekTransactions].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Weekly Digest — {rangeLabel}</Text>
        <View style={styles.statRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Income</Text>
            <Text style={[styles.statValue, { color: colors.ok }]}>{formatPeso(weekTotals.totalIn)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Expenses</Text>
            <Text style={[styles.statValue, { color: colors.error }]}>{formatPeso(weekTotals.totalOut)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Net</Text>
            <Text style={[styles.statValue, { color: weekTotals.net >= 0 ? colors.ok : colors.error }]}>
              {formatPeso(weekTotals.net)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Spending by Category</Text>
        {categoryTotals.length === 0 ? (
          <Text style={styles.emptyText}>No expenses logged this week yet.</Text>
        ) : (
          categoryTotals.map((c) => {
            const pct = maxCategoryAmount > 0 ? (c.amount / maxCategoryAmount) * 100 : 0;
            return (
              <View key={c.category} style={styles.categoryRow}>
                <View style={styles.categoryHeaderRow}>
                  <Text style={styles.categoryName} numberOfLines={1}>
                    {c.category}
                  </Text>
                  <Text style={styles.categoryAmount}>{formatPeso(c.amount)}</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${pct}%` }]} />
                </View>
              </View>
            );
          })
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Transactions This Week</Text>
        {sortedTransactions.length === 0 ? (
          <Text style={styles.emptyText}>Nothing logged in the last 7 days.</Text>
        ) : (
          sortedTransactions.map((t) => (
            <View key={t.id} style={styles.txnRow}>
              <View style={styles.txnLeft}>
                <Text style={styles.txnLabel} numberOfLines={1}>
                  {t.label}
                </Text>
                <Text style={styles.txnMeta}>
                  {formatShort(t.date)} · {t.category || 'Uncategorized'}
                </Text>
              </View>
              <Text
                style={[
                  styles.txnAmount,
                  { color: t.direction === 'in' ? colors.ok : colors.error },
                ]}
              >
                {t.direction === 'in' ? '+' : '-'}
                {formatPeso(t.amount)}
              </Text>
            </View>
          ))
        )}
      </View>
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
      marginBottom: 8,
    },
    statRow: { flexDirection: 'row', justifyContent: 'space-between' },
    statBox: { flex: 1 },
    statLabel: { fontSize: 11, color: colors.inkFaint, marginBottom: 2 },
    statValue: { fontSize: 15, fontWeight: '700' },
    emptyText: { fontSize: 13, color: colors.inkFaint },
    categoryRow: { marginTop: 12 },
    categoryHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    categoryName: { fontSize: 13, color: colors.ink, flex: 1, marginRight: 8 },
    categoryAmount: { fontSize: 12, color: colors.inkDim },
    progressTrack: { height: 8, borderRadius: 999, backgroundColor: colors.navy4, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: colors.gold, borderRadius: 999 },
    txnRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.navy4,
    },
    txnLeft: { flex: 1, marginRight: 10 },
    txnLabel: { fontSize: 13, color: colors.ink },
    txnMeta: { fontSize: 11, color: colors.inkFaint, marginTop: 2 },
    txnAmount: { fontSize: 13, fontWeight: '700' },
  });
}
