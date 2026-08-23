// ============================================================
// Household Finance App — Reports (Checkpoint 10.2)
// ============================================================
// First report page: Monthly Close-out — income vs. expenses for
// the current month, plus a spending-by-category breakdown.
//
// Reuses buildTransactionsList()/transactionTotals() from
// transactions.ts, same as Dashboard does, rather than
// recalculating anything from scratch.
//
// More report pages (Year in Review, Cash-Flow Forecast, etc.)
// will be added as additional options here in future checkpoints
// — this file is written so that's a simple extension, not a
// rewrite.
// ============================================================

import React from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useData } from '../DataContext';
import { useTheme } from '../ThemeContext';
import { formatPeso } from '../balanceProjection';
import { buildTransactionsList, transactionTotals } from '../transactions';

type CategoryTotal = {
  category: string;
  amount: number;
};

export default function ReportsScreen() {
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
  const monthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const monthLabel = today.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });

  const allTransactions = buildTransactionsList(model);
  const thisMonthTransactions = allTransactions.filter((t) => t.date.startsWith(monthPrefix));
  const monthTotals = transactionTotals(thisMonthTransactions);

  // Spending by category — only "out" (expense) transactions count here.
  const categoryMap: Record<string, number> = {};
  thisMonthTransactions
    .filter((t) => t.direction === 'out')
    .forEach((t) => {
      const key = t.category || 'Uncategorized';
      categoryMap[key] = (categoryMap[key] || 0) + t.amount;
    });
  const categoryTotals: CategoryTotal[] = Object.entries(categoryMap)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
  const maxCategoryAmount = categoryTotals.length > 0 ? categoryTotals[0].amount : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Monthly Close-out — {monthLabel}</Text>
        <View style={styles.statRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Income</Text>
            <Text style={[styles.statValue, { color: colors.ok }]}>{formatPeso(monthTotals.totalIn)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Expenses</Text>
            <Text style={[styles.statValue, { color: colors.error }]}>{formatPeso(monthTotals.totalOut)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Net</Text>
            <Text style={[styles.statValue, { color: monthTotals.net >= 0 ? colors.ok : colors.error }]}>
              {formatPeso(monthTotals.net)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Spending by Category</Text>
        {categoryTotals.length === 0 ? (
          <Text style={styles.emptyText}>No expenses logged this month yet.</Text>
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

      <Text style={styles.footerNote}>
        More report pages (Year in Review, Cash-Flow Forecast, and others) are coming in future
        updates.
      </Text>
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.navy1,
    },
    contentContainer: {
      padding: 14,
      paddingBottom: 32,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.navy1,
    },
    card: {
      backgroundColor: colors.navy3,
      borderRadius: 10,
      padding: 16,
      marginBottom: 12,
    },
    cardLabel: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: colors.inkDim,
      marginBottom: 8,
    },
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    statBox: {
      flex: 1,
    },
    statLabel: {
      fontSize: 11,
      color: colors.inkFaint,
      marginBottom: 2,
    },
    statValue: {
      fontSize: 15,
      fontWeight: '700',
    },
    emptyText: {
      fontSize: 13,
      color: colors.inkFaint,
    },
    categoryRow: {
      marginTop: 12,
    },
    categoryHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    categoryName: {
      fontSize: 13,
      color: colors.ink,
      flex: 1,
      marginRight: 8,
    },
    categoryAmount: {
      fontSize: 12,
      color: colors.inkDim,
    },
    progressTrack: {
      height: 8,
      borderRadius: 999,
      backgroundColor: colors.navy4,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.gold,
      borderRadius: 999,
    },
    footerNote: {
      fontSize: 12,
      color: colors.inkFaint,
      textAlign: 'center',
      marginTop: 4,
      marginBottom: 12,
    },
  });
}
