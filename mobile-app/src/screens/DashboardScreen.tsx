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
import { View, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text } from '../components/AppText';
import HomeWallet from '../components/HomeWallet';
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

// Redesign: icons and "In 3 days"-style labels for the Due soon list.
const DUE_ICON: Record<DueItem['type'], keyof typeof Ionicons.glyphMap> = {
  bill: 'flash-outline',
  debt: 'people-outline',
  loan: 'business-outline',
};

function daysFromToday(d: Date): number {
  const today = stripTime(new Date());
  return Math.round((stripTime(d).getTime() - today.getTime()) / 86400000);
}

function relativeDue(days: number): string {
  if (days <= 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
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
        onScroll={onScrollY ? (e: any) => onScrollY(e.nativeEvent.contentOffset.y) : undefined}
      scrollEventThrottle={16}
    >
      {header}

      {/* Redesign: the Wallet (Accounts' new home) */}
      <HomeWallet model={model} />

      {/* Redesign: Due soon (Finance Flow mockup). The next few bills, debts and loans
          as a clean list; "See all" opens the full 14-day list. */}
      <View style={styles.section}>
        <View style={styles.sectionHeadRow}>
          <Text style={styles.sectionHead}>Due soon</Text>
          {dueSoon.length > 0 && (
            <TouchableOpacity onPress={() => setDueSheetOpen(true)} accessibilityRole="button">
              <Text style={styles.sectionLink}>See all {dueSoon.length}</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.group}>
          {dueSoon.length === 0 ? (
            <View style={styles.groupRow}>
              <Text style={styles.emptyText}>Nothing due in the next 14 days.</Text>
            </View>
          ) : (
            dueSoon.slice(0, 3).map((item, idx) => {
              const days = daysFromToday(item.date);
              const urgent = days <= 3;
              return (
                <TouchableOpacity
                  key={idx}
                  style={styles.groupRow}
                  activeOpacity={0.6}
                  onPress={() => openDueItem(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.label}, ${formatPeso(item.amount)}, ${relativeDue(days)}`}
                >
                  <View style={styles.tile}>
                    <Ionicons name={DUE_ICON[item.type]} size={18} color={colors.gold} />
                  </View>
                  <View style={[styles.groupRowBody, idx > 0 && styles.divider]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle} numberOfLines={1}>{item.label}</Text>
                      <Text style={[styles.rowSub, { color: colors.negative }]}>{formatPeso(item.amount)}</Text>
                    </View>
                    <Text
                      style={[
                        styles.badge,
                        urgent
                          ? { color: colors.orange, backgroundColor: colors.warnBg }
                          : { color: colors.inkDim, backgroundColor: colors.navy1 },
                      ]}
                    >
                      {relativeDue(days)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </View>

      {/* This month */}
      <View style={styles.section}>
        <View style={styles.sectionHeadRow}>
          <Text style={styles.sectionHead}>{monthLabel}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Transactions')} accessibilityRole="button">
            <Text style={styles.sectionLink}>Transactions</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.group, styles.statRow]}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>In</Text>
            <Text style={[styles.statValue, { color: colors.positive }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{formatPeso(monthTotals.totalIn)}</Text>
          </View>
          <View style={[styles.statBox, styles.statBoxDivider]}>
            <Text style={styles.statLabel}>Out</Text>
            <Text style={[styles.statValue, { color: colors.negative }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{formatPeso(monthTotals.totalOut)}</Text>
          </View>
          <View style={[styles.statBox, styles.statBoxDivider]}>
            <Text style={styles.statLabel}>Net</Text>
            <Text style={[styles.statValue, { color: monthTotals.net >= 0 ? colors.positive : colors.negative }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{formatPeso(monthTotals.net)}</Text>
          </View>
        </View>
      </View>

      {/* Amount owed */}
      <View style={styles.section}>
        <View style={styles.sectionHeadRow}>
          <Text style={styles.sectionHead}>Amount owed</Text>
          <TouchableOpacity onPress={() => navigation.navigate('To-Pay')} accessibilityRole="button">
            <Text style={styles.sectionLink}>To-Pay</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.group, { padding: 16 }]}>
          <Text style={[styles.bigAmount, { color: colors.negative }]}>{formatPeso(totalOwed)}</Text>
          <View style={styles.owedBreakdownRow}>
            {([
              ['bills', 'Bills', billsOwed],
              ['debts', 'Debts', debtsOwed],
              ['loans', 'Loans', loansOwed],
            ] as [ToPayTab, string, number][]).map(([tab, label, amt]) => (
              <TouchableOpacity key={tab} style={styles.owedPill} onPress={() => goToPay(tab)} activeOpacity={0.7} accessibilityRole="button">
                <Text style={styles.owedPillLabel}>{label}</Text>
                <Text style={styles.owedPillAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{formatPeso(amt)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Savings goals */}
      <View style={styles.section}>
        <View style={styles.sectionHeadRow}>
          <Text style={styles.sectionHead}>Savings</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Savings')} accessibilityRole="button">
            <Text style={styles.sectionLink}>See all</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={[styles.group, { padding: 16 }]} activeOpacity={0.7} onPress={() => navigation.navigate('Savings')}>
          {goals.length === 0 ? (
            <Text style={styles.emptyText}>No savings goals yet.</Text>
          ) : (
            <>
              <Text style={styles.cardNote}>
                <Text style={{ color: colors.saving, fontWeight: '700' }}>{formatPeso(totalSaved)}</Text> of {formatPeso(totalTarget)} saved
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
                        <Text style={{ color: colors.saving, fontWeight: '600' }}>{formatPeso(current)}</Text> / {formatPeso(target)}
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
      </View>

      {/* Redesign: Insights (watched categories + Reports, which now lives here) */}
      <View style={styles.section}>
        <View style={styles.sectionHeadRow}>
          <Text style={styles.sectionHead}>Insights</Text>
        </View>
        <View style={styles.group}>
          {(model.categoryBudgets || []).map((cb, idx) => {
            const budget = typeof cb.monthlyBudget === 'number' ? cb.monthlyBudget : 0;
            const spent = computeCategorySpend(model, cb.category, monthPrefix);
            const status = getCategoryBudgetStatus(spent, budget, colors);
            return (
              <TouchableOpacity
                key={cb.id}
                style={styles.groupRow}
                activeOpacity={0.6}
                onPress={() =>
                  navigation.navigate('Transactions', {
                    categoryFilter: cb.category,
                    monthFilter: monthPrefix,
                    filterNonce: Date.now(),
                  })
                }
                accessibilityRole="button"
              >
                <View style={[styles.tile, { backgroundColor: colors.navy1 }]}>
                  <Ionicons name="pricetag-outline" size={18} color={status.color} />
                </View>
                <View style={[styles.groupRowBody, idx > 0 && styles.divider]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{cb.category}</Text>
                    <Text style={styles.rowSub}>
                      <Text style={{ color: status.color, fontWeight: '600' }}>{status.label}</Text> · {formatPeso(spent)} of {formatPeso(budget)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
                </View>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            testID="home-reports-row"
            style={styles.groupRow}
            activeOpacity={0.6}
            onPress={() => navigation.navigate('Reports')}
            accessibilityRole="button"
          >
            <View style={styles.tile}>
              <Ionicons name="bar-chart-outline" size={18} color={colors.gold} />
            </View>
            <View style={[styles.groupRowBody, (model.categoryBudgets || []).length > 0 && styles.divider]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Reports</Text>
                <Text style={styles.rowSub}>Monthly close-out, trends & audits</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
            </View>
          </TouchableOpacity>
        </View>
      </View>
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
      paddingHorizontal: 16,
      paddingTop: 8,
      // Redesign: room at the bottom so the last section can scroll clear of the + button.
      paddingBottom: 96,
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
      fontSize: 13,
      color: colors.inkDim,
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
      backgroundColor: colors.navy1,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 10,
    },
    owedPillTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    owedPillLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.inkDim,
      marginBottom: 2,
    },
    owedPillAmount: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.ink,
    },
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    statBox: {
      flex: 1,
      paddingVertical: 14,
      paddingHorizontal: 14,
    },
    statBoxDivider: {
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderLeftColor: colors.navy4,
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
      fontSize: 13,
      color: colors.inkDim,
      marginBottom: 2,
    },
    statValue: {
      fontSize: 17,
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
      fontSize: 15,
      color: colors.inkDim,
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
    // Redesign: iPhone-style sections and grouped lists.
    section: { marginBottom: 24 },
    sectionHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 4, marginBottom: 8 },
    sectionHead: { fontSize: 20, fontWeight: '700', color: colors.ink },
    sectionLink: { fontSize: 15, fontWeight: '600', color: colors.gold, paddingVertical: 4 },
    group: { backgroundColor: colors.navy3, borderRadius: 12, overflow: 'hidden' },
    groupRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, minHeight: 60 },
    groupRowBody: { flex: 1, flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', paddingVertical: 10, paddingRight: 16, gap: 8 },
    divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    tile: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.okBg, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    rowTitle: { fontSize: 17, fontWeight: '500', color: colors.ink },
    rowSub: { fontSize: 13, color: colors.inkDim, marginTop: 1 },
    badge: { fontSize: 12, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
    goalHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    goalName: {
      fontSize: 15,
      color: colors.ink,
      flex: 1,
      marginRight: 8,
    },
    goalAmount: {
      fontSize: 13,
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
      backgroundColor: colors.saving,
      borderRadius: 999,
    },
  });
}
