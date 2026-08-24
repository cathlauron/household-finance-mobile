// ============================================================
// Household Finance App — Dashboard (Checkpoint 10.1)
// ============================================================
// Pulls together figures already calculated elsewhere in the app
// (balanceProjection.ts, transactions.ts) into one at-a-glance
// screen, rather than recalculating anything from scratch.
//
// Loans are now included in "Amount owed" and "Due soon" —
// borrowed loans only (a loan someone owes you doesn't count as
// an amount you owe). Loans with "Custom" recurrence are still
// skipped, matching the same gap noted in balanceProjection.ts.
// ============================================================

import React from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useData } from '../DataContext';
import { useTheme } from '../ThemeContext';
import {
  totalLiquidBalance,
  computeMonthEvents,
  outstandingBalance,
  loanOutstandingBalance,
  formatPeso,
} from '../balanceProjection';
import { buildTransactionsList, transactionTotals } from '../transactions';
import type { HouseholdModel } from '../types';

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

type DueItem = {
  date: Date;
  label: string;
  amount: number;
  type: 'bill' | 'debt' | 'loan';
};

function getUpcomingDue(model: HouseholdModel, daysAhead: number): DueItem[] {
  const today = stripTime(new Date());
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + daysAhead);

  let nextMonthYear = today.getFullYear();
  let nextMonthIndex = today.getMonth() + 1;
  if (nextMonthIndex > 11) {
    nextMonthIndex = 0;
    nextMonthYear += 1;
  }
  const monthsToCheck = [
    { y: today.getFullYear(), m: today.getMonth() },
    { y: nextMonthYear, m: nextMonthIndex },
  ];

  const results: DueItem[] = [];
  monthsToCheck.forEach(({ y, m }) => {
    const events = computeMonthEvents(model, y, m);
    Object.entries(events).forEach(([dayStr, evs]) => {
      const day = parseInt(dayStr, 10);
      const date = new Date(y, m, day);
      if (date < today || date > cutoff) return;
      evs.forEach((ev) => {
        if (ev.type !== 'bill' && ev.type !== 'debt' && ev.type !== 'loan') return;
        if (ev.amount <= 0) return;
        results.push({ date, label: ev.label, amount: ev.amount, type: ev.type });
      });
    });
  });

  results.sort((a, b) => a.date.getTime() - b.date.getTime());
  return results.slice(0, 5);
}

function formatDueDate(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

export default function DashboardScreen() {
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

  const totalBalance = totalLiquidBalance(model);

  const today = new Date();
  const monthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const monthLabel = today.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
  const allTransactions = buildTransactionsList(model);
  const thisMonthTransactions = allTransactions.filter((t) => t.date.startsWith(monthPrefix));
  const monthTotals = transactionTotals(thisMonthTransactions);

  const billsOwed = model.bills.reduce((sum, b) => sum + Math.max(0, outstandingBalance(b)), 0);
  const debtsOwed = model.debts.reduce((sum, d) => sum + Math.max(0, outstandingBalance(d)), 0);
  const loansOwed = model.loans
    .filter((l) => l.direction !== 'lent')
    .reduce((sum, l) => sum + loanOutstandingBalance(l), 0);
  const totalOwed = billsOwed + debtsOwed + loansOwed;

  const dueSoon = getUpcomingDue(model, 14);

  const goals = model.savingsGoals || [];
  const totalSaved = goals.reduce((sum, g) => sum + (typeof g.currentAmount === 'number' ? g.currentAmount : 0), 0);
  const totalTarget = goals.reduce(
    (sum, g) => sum + (typeof g.targetAmount === 'number' ? g.targetAmount : 0),
    0
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Total balance */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Total Balance</Text>
        <Text style={styles.bigAmount}>{formatPeso(totalBalance)}</Text>
        <Text style={styles.cardNote}>Across Cash, Debit &amp; Credit accounts</Text>
      </View>

      {/* This month */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>{monthLabel}</Text>
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

      {/* Amount owed */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Amount Owed</Text>
        <Text style={[styles.bigAmount, { color: totalOwed > 0 ? colors.orange : colors.ink }]}>
          {formatPeso(totalOwed)}
        </Text>
        <View style={styles.owedBreakdownRow}>
          <Text style={styles.cardNote}>Bills: {formatPeso(billsOwed)}</Text>
          <Text style={styles.cardNote}>Debts: {formatPeso(debtsOwed)}</Text>
          <Text style={styles.cardNote}>Loans: {formatPeso(loansOwed)}</Text>
        </View>
      </View>

      {/* Due soon */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Due in the Next 14 Days</Text>
        {dueSoon.length === 0 ? (
          <Text style={styles.emptyText}>Nothing due soon.</Text>
        ) : (
          dueSoon.map((item, idx) => (
            <View key={idx} style={styles.listRow}>
              <View style={styles.listRowLeft}>
                <Text style={styles.listDateBadge}>{formatDueDate(item.date)}</Text>
                <Text style={styles.listLabel} numberOfLines={1}>
                  {item.label}
                </Text>
              </View>
              <Text style={styles.listAmount}>{formatPeso(item.amount)}</Text>
            </View>
          ))
        )}
      </View>

      {/* Savings goals */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Savings Goals</Text>
        {goals.length === 0 ? (
          <Text style={styles.emptyText}>No savings goals yet.</Text>
        ) : (
          <>
            <Text style={styles.cardNote}>
              {formatPeso(totalSaved)} saved of {formatPeso(totalTarget)} total
            </Text>
            {goals.map((g) => {
              const target = typeof g.targetAmount === 'number' ? g.targetAmount : 0;
              const current = typeof g.currentAmount === 'number' ? g.currentAmount : 0;
              const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
              return (
                <View key={g.id} style={styles.goalRow}>
                  <View style={styles.goalHeaderRow}>
                    <Text style={styles.goalName} numberOfLines={1}>
                      {g.name || 'Untitled goal'}
                    </Text>
                    <Text style={styles.goalAmount}>
                      {formatPeso(current)} / {formatPeso(target)}
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${pct}%` }]} />
                  </View>
                </View>
              );
            })}
          </>
        )}
      </View>
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
    bigAmount: {
      fontSize: 26,
      fontWeight: '700',
      color: colors.ink,
    },
    cardNote: {
      fontSize: 12,
      color: colors.inkFaint,
      marginTop: 4,
    },
    owedBreakdownRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
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
    listRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: colors.navy4,
    },
    listRowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 8,
    },
    listDateBadge: {
      fontSize: 11,
      color: colors.orange,
      backgroundColor: colors.navy2,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      marginRight: 8,
      overflow: 'hidden',
    },
    listLabel: {
      fontSize: 13,
      color: colors.ink,
      flexShrink: 1,
    },
    listAmount: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.ink,
    },
    goalRow: {
      marginTop: 12,
    },
    goalHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    goalName: {
      fontSize: 13,
      color: colors.ink,
      flex: 1,
      marginRight: 8,
    },
    goalAmount: {
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
  });
}
