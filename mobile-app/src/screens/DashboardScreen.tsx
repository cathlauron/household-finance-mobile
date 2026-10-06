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

import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRefresh } from '../useRefresh';
import { PullToRefreshScrollView } from '../PullToRefreshScrollView';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../DataContext';
import { useTheme } from '../ThemeContext';
import {
  computeMonthEvents,
  outstandingBalance,
  loanOutstandingBalance,
  formatPeso,
} from '../balanceProjection';
import { buildTransactionsList, transactionTotals, computeCategorySpend, getCategoryBudgetStatus } from '../transactions';
import { stripTime } from '../recurrence';
import type { HouseholdModel } from '../types';
import { useNavigation } from '@react-navigation/native';
import BottomSheet from '../components/BottomSheet';
import { requestOpenBill } from '../openBillRequest';
import { requestOpenDebt } from '../openDebtRequest';
import { requestOpenLoan } from '../openLoanRequest';
import { requestToPayTab, ToPayTab } from '../openToPayTabRequest';

type DueItem = {
  date: Date;
  label: string;
  amount: number;
  type: 'bill' | 'debt' | 'loan';
  id?: string;
};

export function getUpcomingDue(model: HouseholdModel, daysAhead: number): DueItem[] {
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
        results.push({ date, label: ev.label, amount: ev.amount, type: ev.type, id: ev.id });
      });
    });
  });

  results.sort((a, b) => a.date.getTime() - b.date.getTime());
  return results;
}

function formatDueDate(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

export default function DashboardScreen({
  header,
  onScrollY,
}: { header?: React.ReactNode; onScrollY?: (y: number) => void } = {}) {
  const { model, loading } = useData();
  const { refreshing, onRefresh } = useRefresh();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const navigation = useNavigation<any>();
  const [dueSheetOpen, setDueSheetOpen] = useState(false);

  function goToPay(tab: ToPayTab) {
    requestToPayTab(tab);
    navigation.navigate('To-Pay');
  }

  function openDueItem(item: DueItem) {
    if (item.type === 'bill' && item.id) requestOpenBill(item.id);
    else if (item.type === 'debt' && item.id) requestOpenDebt(item.id);
    else if (item.type === 'loan' && item.id) requestOpenLoan(item.id);
    else requestToPayTab(item.type === 'bill' ? 'bills' : item.type === 'debt' ? 'debts' : 'loans');
    navigation.navigate('To-Pay');
  }

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

  const billsOwed = model.bills.reduce((sum, b) => sum + Math.max(0, outstandingBalance(b)), 0);
  const debtsOwed = model.debts.reduce((sum, d) => sum + Math.max(0, outstandingBalance(d)), 0);
  const loansOwed = (model.loans || [])
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
    <>
    <PullToRefreshScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onScroll={onScrollY ? (e: any) => onScrollY(e.nativeEvent.contentOffset.y) : undefined}
      scrollEventThrottle={16}
    >
      {header}

      {/* This month */}
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('Transactions')}
      >
        <View style={[styles.rowCard, { marginBottom: 10 }]}>
          <View style={[styles.iconBubbleQuiet, { backgroundColor: colors.okBg }]}>
            <Ionicons name="swap-horizontal-outline" size={16} color={colors.ok} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardLabel}>{monthLabel}</Text>
          </View>
        </View>
        <View style={styles.statRow}>
          <View style={styles.statBox}>
            <View style={styles.statIconRow}>
              <View style={[styles.statIconCircle, { backgroundColor: colors.okBg }]}>
                <Ionicons name="arrow-up" size={11} color={colors.ok} />
              </View>
              <Text style={styles.statLabel}>Income</Text>
            </View>
            <Text style={[styles.statValue, { color: colors.ok }]}>{formatPeso(monthTotals.totalIn)}</Text>
          </View>
          <View style={[styles.statBox, styles.statBoxDivider]}>
            <View style={styles.statIconRow}>
              <View style={[styles.statIconCircle, { backgroundColor: colors.errorBg }]}>
                <Ionicons name="arrow-down" size={11} color={colors.error} />
              </View>
              <Text style={styles.statLabel}>Expenses</Text>
            </View>
            <Text style={[styles.statValue, { color: colors.error }]}>{formatPeso(monthTotals.totalOut)}</Text>
          </View>
          <View style={[styles.statBox, styles.statBoxDivider]}>
            <View style={styles.statIconRow}>
              <View
                style={[
                  styles.statIconCircle,
                  { backgroundColor: monthTotals.net >= 0 ? colors.okBg : colors.errorBg },
                ]}
              >
                <Ionicons
                  name={monthTotals.net >= 0 ? 'arrow-up' : 'arrow-down'}
                  size={11}
                  color={monthTotals.net >= 0 ? colors.ok : colors.error}
                />
              </View>
              <Text style={styles.statLabel}>Net</Text>
            </View>
            <Text style={[styles.statValue, { color: monthTotals.net >= 0 ? colors.ok : colors.error }]}>{formatPeso(monthTotals.net)}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Amount owed */}
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.peachCard, borderColor: colors.peachBubble }]}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('To-Pay')}
      >
        <View style={styles.rowCard}>
          <View style={[styles.iconBubbleQuiet, { backgroundColor: colors.peachBubble }]}>
            <Ionicons name="receipt-outline" size={16} color={colors.orange} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardLabel}>Amount Owed</Text>
            <Text style={[styles.bigAmount, { fontSize: 22, color: colors.orange }]}>
              {formatPeso(totalOwed)}
            </Text>
          </View>
        </View>
        <View style={styles.owedBreakdownRow}>
          <TouchableOpacity style={styles.owedPill} onPress={() => goToPay('bills')} activeOpacity={0.7}>
            <View style={styles.owedPillTextWrap}>
              <Text style={styles.owedPillLabel}>Bills</Text>
              <Text style={styles.owedPillAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{formatPeso(billsOwed)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={11} color={colors.orange} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.owedPill} onPress={() => goToPay('debts')} activeOpacity={0.7}>
            <View style={styles.owedPillTextWrap}>
              <Text style={styles.owedPillLabel}>Debts</Text>
              <Text style={styles.owedPillAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{formatPeso(debtsOwed)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={11} color={colors.orange} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.owedPill} onPress={() => goToPay('loans')} activeOpacity={0.7}>
            <View style={styles.owedPillTextWrap}>
              <Text style={styles.owedPillLabel}>Loans</Text>
              <Text style={styles.owedPillAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{formatPeso(loansOwed)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={11} color={colors.orange} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Due soon */}
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        disabled={dueSoon.length === 0}
        onPress={() => setDueSheetOpen(true)}
      >
        <View style={styles.rowCard}>
          <View style={[styles.iconBubbleQuiet, { backgroundColor: colors.indigoBg }]}>
            <Ionicons name="calendar-outline" size={16} color={colors.indigo} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardLabel}>Due Next 14 Days</Text>
          </View>
        </View>
        {dueSoon.length === 0 ? (
          <Text style={styles.emptyText}>Nothing due soon.</Text>
        ) : (
          dueSoon.slice(0, 5).map((item, idx) => (
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
        {dueSoon.length > 5 && (
          <Text style={styles.cardNote}>+{dueSoon.length - 5} more · tap to see all</Text>
        )}
      </TouchableOpacity>

      {/* Savings goals */}
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('Savings')}
      >
        <View style={styles.rowCard}>
          <View style={[styles.iconBubbleQuiet, { backgroundColor: colors.okBg }]}>
            <Ionicons name="flag-outline" size={16} color={colors.ok} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardLabel}>Savings Goals</Text>
          </View>
        </View>
        {goals.length === 0 ? (
          <Text style={styles.emptyText}>No savings goals yet.</Text>
        ) : (
          <>
            <Text style={styles.cardNote}>
              {formatPeso(totalSaved)} of {formatPeso(totalTarget)} saved
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
      </TouchableOpacity>

      {/* Category watchlist */}
      {(model.categoryBudgets || []).length > 0 && (
        <View style={styles.card}>
          <View style={styles.rowCard}>
            <View style={[styles.iconBubbleQuiet, { backgroundColor: colors.okBg }]}>
              <Ionicons name="pricetag-outline" size={16} color={colors.ok} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>Watched Categories</Text>
            </View>
          </View>
          {(model.categoryBudgets || []).map((cb) => {
            const budget = typeof cb.monthlyBudget === 'number' ? cb.monthlyBudget : 0;
            const spent = computeCategorySpend(model, cb.category, monthPrefix);
            const status = getCategoryBudgetStatus(spent, budget, colors);
            return (
              <TouchableOpacity
                key={cb.id}
                style={styles.listRow}
                activeOpacity={0.7}
                onPress={() =>
                  navigation.navigate('Transactions', {
                    categoryFilter: cb.category,
                    monthFilter: monthPrefix,
                    filterNonce: Date.now(),
                  })
                }
              >
                <View style={styles.listRowLeft}>
                  <Text style={styles.listLabel} numberOfLines={1}>{cb.category}</Text>
                  <Text style={{ fontSize: 12, color: status.color, marginLeft: 8 }}>{status.label}</Text>
                </View>
                <Text style={styles.listAmount}>
                  {formatPeso(spent)} / {formatPeso(budget)}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={colors.decor} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </PullToRefreshScrollView>

    <BottomSheet visible={dueSheetOpen} onClose={() => setDueSheetOpen(false)} title="Due Next 14 Days">
      {dueSoon.map((item, idx) => (
        <TouchableOpacity
          key={idx}
          style={styles.listRow}
          onPress={() => {
            setDueSheetOpen(false);
            openDueItem(item);
          }}
        >
          <View style={styles.listRowLeft}>
            <Text style={styles.listDateBadge}>{formatDueDate(item.date)}</Text>
            <Text style={styles.listLabel} numberOfLines={1}>{item.label}</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={colors.decor} style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      ))}
    </BottomSheet>
    </>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    rowCard: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconBubble: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.navy2,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 12,
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
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.navy4,
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
      gap: 6,
      marginTop: 10,
    },
    owedPill: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 4,
      backgroundColor: colors.navy3,
      borderWidth: 1,
      borderColor: colors.navy4,
      paddingHorizontal: 9,
      paddingVertical: 7,
      borderRadius: 14,
    },
    owedPillTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    owedPillLabel: {
      fontSize: 10.5,
      fontWeight: '600',
      color: colors.inkDim,
    },
    owedPillAmount: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.ink,
    },
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    statBox: {
      flex: 1,
    },
    statBoxDivider: {
      borderLeftWidth: 1,
      borderLeftColor: colors.navy4,
      paddingLeft: 10,
    },
    statIconRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginBottom: 4,
    },
    statIconCircle: {
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBubbleSmall: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.navy2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statLabel: {
      fontSize: 11,
      color: colors.inkFaint,
      marginBottom: 2,
    },
    statValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.ink,
    },
    iconBubbleQuiet: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.navy2,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
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
      color: colors.indigo,
      backgroundColor: colors.indigoBg,
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
