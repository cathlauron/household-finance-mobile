// ============================================================
// Household Finance App — Tax Summary report (Checkpoint 10.2)
// ============================================================
// A plain, printable-style roundup for a chosen year: total
// income, total expenses (by category), interest & fees paid,
// and total saved. This is NOT a finished tax form or tax
// advice — just your own numbers organized in one place.
//
// "Interest & fees paid" counts loan late fees (a logged loan payment
// that came in higher than that loan's expected payment) plus any
// feesPortion manually logged on a paid debt cycle via DebtsScreen's
// "Fees included in this payment" field. Debt fees are opt-in/manual —
// nothing infers them automatically.
// ============================================================

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useData } from '../../DataContext';
import { useTheme } from '../../ThemeContext';
import { formatPeso } from '../../balanceProjection';
import { buildTransactionsList, transactionTotals } from '../../transactions';
import type { TransactionEntry } from '../../transactions';
import type { HouseholdModel } from '../../types';

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

// Loan late fees only — see file header comment for why debt-side fees
// aren't included yet.
function loanLateFeesInYear(model: HouseholdModel, year: number): number {
  const prefix = `${year}-`;
  let total = 0;
  (model.loans || []).forEach((loan) => {
    if (loan.direction === 'lent') return; // repayments received aren't a cost to you
    const expected = typeof loan.expectedPayment === 'number' ? loan.expectedPayment : 0;
    (loan.actualPayments || []).forEach((p) => {
      const actual = typeof p.actual === 'number' ? p.actual : 0;
      if (!p.date || !p.date.startsWith(prefix)) return;
      if (actual > expected) total += actual - expected;
    });
  });
  return total;
}

// Fees portion logged directly on a paid debt cycle (late fees, interest
// charged, etc.) — see BillCycle.feesPortion in types.ts.
function debtFeesInYear(model: HouseholdModel, year: number): number {
  const prefix = `${year}-`;
  let total = 0;
  (model.debts || []).forEach((debt) => {
    (debt.cycles || []).forEach((cycle) => {
      if (!cycle.paidDate || !cycle.paidDate.startsWith(prefix)) return;
      const fees = typeof cycle.feesPortion === 'number' ? cycle.feesPortion : 0;
      total += fees;
    });
  });
  return total;
}
export default function TaxSummaryReport() {
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
  const interestFees = loanLateFeesInYear(model, year) + debtFeesInYear(model, year);

  const categoryMap: Record<string, number> = {};
  yearTransactions
    .filter((t) => t.direction === 'out')
    .forEach((t) => {
      const key = t.category || 'Uncategorized';
      categoryMap[key] = (categoryMap[key] || 0) + t.amount;
    });
  const categories = Object.entries(categoryMap)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
  const maxCategoryAmount = categories.length > 0 ? categories[0].amount : 0;

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

      <Text style={styles.introNote}>
        A plain summary of income, spending by category, interest &amp; fees, and savings for {year} —
        handy to have on hand at tax time. This isn't tax advice or a finished tax form, just your own
        numbers organized in one place.
      </Text>

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
        <Text style={styles.cardLabel}>Interest &amp; Fees Paid</Text>
        <View style={styles.feesBanner}>
          <View>
            <Text style={styles.feesBannerLabel}>{year}</Text>
            <Text style={styles.feesBannerNote}>Loan late fees + debt fees you've logged</Text>
          </View>
          <Text style={[styles.feesBannerAmount, { color: colors.orange }]}>{formatPeso(interestFees)}</Text>
        </View>
        <Text style={styles.footerNote}>
          Includes loan payments logged higher than their expected amount, plus any "Fees included in this
          payment" amount logged on a paid debt cycle. If you didn't log fees on a debt payment, they won't
          show up here — this isn't automatic.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Expenses by Category</Text>
        {categories.length === 0 ? (
          <Text style={styles.emptyText}>No spending logged this year.</Text>
        ) : (
          categories.map((c, idx) => {
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
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.navy1 },
    contentContainer: { padding: 14, paddingBottom: 32 },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navy1 },
    yearNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10, gap: 16 },
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
    introNote: { fontSize: 12, color: colors.inkDim, lineHeight: 17, marginBottom: 14, textAlign: 'center' },
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
    card: { backgroundColor: colors.navy3, borderRadius: 10, padding: 16, marginBottom: 12 },
    cardLabel: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: colors.inkDim,
      marginBottom: 12,
    },
    feesBanner: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.navy2,
      borderRadius: 8,
      padding: 14,
    },
    feesBannerLabel: { fontSize: 13, fontWeight: '700', color: colors.ink },
    feesBannerNote: { fontSize: 11, color: colors.inkFaint, marginTop: 2 },
    feesBannerAmount: { fontSize: 18, fontWeight: '700' },
    footerNote: { fontSize: 11, color: colors.inkFaint, marginTop: 10, lineHeight: 16 },
    emptyText: { fontSize: 13, color: colors.inkFaint },
    categoryRow: { marginTop: 12 },
    categoryHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    categoryName: { fontSize: 13, color: colors.ink, flex: 1, marginRight: 8 },
    categoryAmount: { fontSize: 12, color: colors.inkDim },
    progressTrack: { height: 8, borderRadius: 999, backgroundColor: colors.navy4, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 999 },
  });
}
