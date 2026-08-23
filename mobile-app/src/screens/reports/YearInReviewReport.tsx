// ============================================================
// Household Finance App — Year in Review report (Checkpoint 10.2)
// ============================================================
// Whole-year rollup: total income/expenses/saved, a 12-month
// income-vs-expenses bar chart, top spending categories, debt
// paid down, and how many savings goals have been reached.
//
// Reuses buildTransactionsList()/transactionTotals() exactly
// like Dashboard and Monthly Close-out do. "Income" here now
// includes logged income paydays (via each IncomeSource's
// paymentLog), not just manual "money in" entries and loan
// repayments received.
// ============================================================

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useData } from '../../DataContext';
import { useTheme } from '../../ThemeContext';
import { formatPeso } from '../../balanceProjection';
import { buildTransactionsList, transactionTotals } from '../../transactions';
import type { TransactionEntry } from '../../transactions';
import type { HouseholdModel } from '../../types';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CATEGORY_COLOR_KEYS = ['gold', 'orange', 'error', 'ok'] as const;

function transactionsInYear(all: TransactionEntry[], year: number): TransactionEntry[] {
  const prefix = `${year}-`;
  return all.filter((t) => t.date.startsWith(prefix));
}

function savingsContributedInYear(model: HouseholdModel, year: number): number {
  const prefix = `${year}-`;
  return (model.savingsGoals || []).reduce((sum, g) => {
    return (
      sum +
      (g.contributions || []).reduce((s, c) => {
        if (!c.date || !c.date.startsWith(prefix)) return s;
        return s + (typeof c.amount === 'number' ? c.amount : 0);
      }, 0)
    );
  }, 0);
}

export default function YearInReviewReport() {
  const { model, loading } = useData();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [year, setYear] = useState(new Date().getFullYear());

  if (loading || !model) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  const allTransactions = buildTransactionsList(model);
  const yearTransactions = transactionsInYear(allTransactions, year);
  const yearTotals = transactionTotals(yearTransactions);
  const totalSaved = savingsContributedInYear(model, year);

  const monthlyData = Array.from({ length: 12 }, (_, m) => {
    const prefix = `${year}-${String(m + 1).padStart(2, '0')}`;
    const monthTx = allTransactions.filter((t) => t.date.startsWith(prefix));
    const totals = transactionTotals(monthTx);
    return { label: MONTH_LABELS[m], income: totals.totalIn, expenses: totals.totalOut };
  });
  const maxMonthValue = Math.max(1, ...monthlyData.map((d) => Math.max(d.income, d.expenses)));

  const categoryMap: Record<string, number> = {};
  yearTransactions
    .filter((t) => t.direction === 'out')
    .forEach((t) => {
      const key = t.category || 'Uncategorized';
      categoryMap[key] = (categoryMap[key] || 0) + t.amount;
    });
  const topCategories = Object.entries(categoryMap)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);
  const maxCategoryAmount = topCategories.length > 0 ? topCategories[0].amount : 0;

  const debtPaid = yearTransactions.filter((t) => t.source === 'debt').reduce((sum, t) => sum + t.amount, 0);

  const goals = model.savingsGoals || [];
  const goalsReached = goals.filter((g) => {
    const target = typeof g.targetAmount === 'number' ? g.targetAmount : 0;
    const current = typeof g.currentAmount === 'number' ? g.currentAmount : 0;
    return target > 0 && current >= target;
  }).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.yearNavRow}>
        <TouchableOpacity style={styles.yearNavBtn} onPress={() => setYear(year - 1)}>
          <Text style={styles.yearNavBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.yearNavLabel}>{year}</Text>
        <TouchableOpacity style={styles.yearNavBtn} onPress={() => setYear(year + 1)}>
          <Text style={styles.yearNavBtnText}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statCardLabel}>Total Income</Text>
          <Text style={[styles.statCardAmount, { color: colors.ok }]}>{formatPeso(yearTotals.totalIn)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statCardLabel}>Total Expenses</Text>
          <Text style={[styles.statCardAmount, { color: colors.error }]}>{formatPeso(yearTotals.totalOut)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statCardLabel}>Total Saved</Text>
          <Text style={styles.statCardAmount}>{formatPeso(totalSaved)}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Income vs. Expenses, Month by Month</Text>
        <View style={styles.chartRow}>
          {monthlyData.map((d) => (
            <View key={d.label} style={styles.chartCol}>
              <View style={styles.chartBarsWrap}>
                <View
                  style={[
                    styles.chartBar,
                    { height: `${(d.income / maxMonthValue) * 100}%`, backgroundColor: colors.ok },
                  ]}
                />
                <View
                  style={[
                    styles.chartBar,
                    { height: `${(d.expenses / maxMonthValue) * 100}%`, backgroundColor: colors.error },
                  ]}
                />
              </View>
              <Text style={styles.chartColLabel}>{d.label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: colors.ok }]} />
            <Text style={styles.legendText}>Income</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: colors.error }]} />
            <Text style={styles.legendText}>Expenses</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Top Categories This Year</Text>
        {topCategories.length === 0 ? (
          <Text style={styles.emptyText}>No spending logged this year.</Text>
        ) : (
          topCategories.map((c, idx) => {
            const pct = maxCategoryAmount > 0 ? (c.amount / maxCategoryAmount) * 100 : 0;
            const colorKey = CATEGORY_COLOR_KEYS[idx % CATEGORY_COLOR_KEYS.length];
            return (
              <View key={c.category} style={styles.categoryRow}>
                <View style={styles.categoryHeaderRow}>
                  <Text style={styles.categoryName} numberOfLines={1}>
                    {c.category}
                  </Text>
                  <Text style={styles.categoryAmount}>{formatPeso(c.amount)}</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: colors[colorKey] }]} />
                </View>
              </View>
            );
          })
        )}
      </View>

      <View style={styles.statGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statCardLabel}>Debt Paid Down</Text>
          <Text style={[styles.statCardAmount, { color: colors.orange }]}>{formatPeso(debtPaid)}</Text>
          <Text style={styles.statCardNote}>Logged debt payments this year</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statCardLabel}>Savings Goals Reached</Text>
          <Text style={styles.statCardAmount}>{goalsReached}</Text>
          <Text style={styles.statCardNote}>
            Of {goals.length} total goal{goals.length === 1 ? '' : 's'}
          </Text>
        </View>
      </View>

    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.navy1 },
    contentContainer: { padding: 14, paddingBottom: 32 },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navy1 },
    yearNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 14, gap: 16 },
    yearNavBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.navy3,
      alignItems: 'center',
      justifyContent: 'center',
    },
    yearNavBtnText: { fontSize: 18, color: colors.ink, fontWeight: '700' },
    yearNavLabel: { fontSize: 18, fontWeight: '700', color: colors.ink, minWidth: 60, textAlign: 'center' },
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
    statCard: { flexGrow: 1, flexBasis: '30%', backgroundColor: colors.navy3, borderRadius: 10, padding: 14 },
    statCardLabel: {
      fontSize: 10,
      color: colors.inkFaint,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    statCardAmount: { fontSize: 17, fontWeight: '700', color: colors.ink },
    statCardNote: { fontSize: 11, color: colors.inkFaint, marginTop: 4 },
    card: { backgroundColor: colors.navy3, borderRadius: 10, padding: 16, marginBottom: 12 },
    cardLabel: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: colors.inkDim,
      marginBottom: 12,
    },
    chartRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 130 },
    chartCol: { flex: 1, alignItems: 'center' },
    chartBarsWrap: { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 2 },
    chartBar: { width: 5, borderRadius: 2, minHeight: 2 },
    chartColLabel: { fontSize: 9, color: colors.inkFaint, marginTop: 6 },
    legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 12 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendSwatch: { width: 10, height: 10, borderRadius: 3 },
    legendText: { fontSize: 11, color: colors.inkDim },
    emptyText: { fontSize: 13, color: colors.inkFaint },
    categoryRow: { marginTop: 12 },
    categoryHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    categoryName: { fontSize: 13, color: colors.ink, flex: 1, marginRight: 8 },
    categoryAmount: { fontSize: 12, color: colors.inkDim },
    progressTrack: { height: 8, borderRadius: 999, backgroundColor: colors.navy4, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 999 },
    footerNote: { fontSize: 11, color: colors.inkFaint, textAlign: 'center', marginTop: 4, marginBottom: 12, lineHeight: 16 },
  });
}
