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
import { getOverdueItems } from '../overdue';
import { PullToRefreshScrollView } from '../PullToRefreshScrollView';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../DataContext';
import { useTheme } from '../ThemeContext';
import {
  computeMonthEvents, formatPeso
} from '../balanceProjection';
import { computeCategorySpend, getCategoryBudgetStatus } from '../transactions';
import { stripTime } from '../recurrence';
import type { HouseholdModel } from '../types';
import { useNavigation } from '@react-navigation/native';
import BottomSheet from '../components/BottomSheet';
import { requestOpenBill } from '../openBillRequest';
import { requestOpenDebt } from '../openDebtRequest';
import { requestOpenLoan } from '../openLoanRequest';
import { requestToPayTab } from '../openToPayTabRequest';
import GradientFill from '../components/GradientFill';

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

function pctOf(spent: number, budget: number): number {
  return budget > 0 ? Math.round((spent / budget) * 100) : 0;
}

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
  footer,
  onScrollY,
}: { header?: React.ReactNode; footer?: React.ReactNode; onScrollY?: (y: number) => void } = {}) {
  const { model, loading } = useData();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const navigation = useNavigation<any>();
  const [dueSheetOpen, setDueSheetOpen] = useState(false);


  function openDueItem(item: DueItem) {
    // Redesign: open the full Bill / Debt / Loan page.
    if (item.id) {
      navigation.navigate('PayDetail', { kind: item.type, id: item.id, backTitle: 'Home' });
      return;
    }
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


  // Redesign: Due soon on Home shows overdue items first (red "Overdue" tag), then
  // what's coming up in the next 14 days, like the mockup.
  const overdueDue: (DueItem & { overdue?: boolean })[] = getOverdueItems(model).map((o) => ({
    date: new Date(o.dueDate + 'T00:00:00'),
    label: o.name,
    amount: o.amountOwed,
    type: o.kind,
    id: o.id,
    overdue: true,
  }));
  const dueSoon: (DueItem & { overdue?: boolean })[] = [...overdueDue, ...getUpcomingDue(model, 14)];


  return (
    <>
    <PullToRefreshScrollView
      style={styles.container}
        contentContainerStyle={styles.contentContainer}
        onScroll={onScrollY ? (e: any) => onScrollY(e.nativeEvent.contentOffset.y) : undefined}
      scrollEventThrottle={16}
    >
      {header}
      {footer}

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
          <GradientFill match={styles.group} />
          {dueSoon.length === 0 ? (
            <View style={styles.groupRow}>
              <Text style={styles.emptyText}>Nothing due in the next 14 days.</Text>
            </View>
          ) : (
            dueSoon.slice(0, 2).map((item, idx) => {
              const days = daysFromToday(item.date);
              const urgent = days <= 3;
              const isOverdue = !!item.overdue;
              return (
                <TouchableOpacity
                  key={idx}
                  style={styles.groupRow}
                  activeOpacity={0.6}
                  onPress={() => openDueItem(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.label}, ${formatPeso(item.amount)}, ${item.overdue ? 'Overdue' : relativeDue(days)}`}
                >
                  <View style={styles.tile}>
                    <GradientFill match={styles.tile} />
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
                        isOverdue
                          ? { color: colors.negative, backgroundColor: colors.errorBg }
                          : urgent
                          ? { color: colors.orange, backgroundColor: colors.warnBg }
                          : { color: colors.inkDim, backgroundColor: colors.navy1 },
                      ]}
                    >
                      {isOverdue ? 'Overdue' : relativeDue(days)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </View>

      {/* Redesign: Insights (watched categories + Reports, which now lives here) */}
      <View style={styles.section}>
        <View style={styles.sectionHeadRow}>
          <Text style={styles.sectionHead}>Insights</Text>
        </View>
        <View style={styles.group}>
          <GradientFill match={styles.group} />
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
                <View style={[styles.tile, { backgroundColor: pctOf(spent, budget) >= 80 ? colors.warnBg : colors.accentTint }]}>
                  <GradientFill match={[styles.tile, { backgroundColor: pctOf(spent, budget) >= 80 ? colors.warnBg : colors.accentTint }]} />
                  <Ionicons name={pctOf(spent, budget) >= 80 ? 'warning-outline' : 'pricetag-outline'} size={18} color={pctOf(spent, budget) >= 80 ? colors.orange : colors.gold} />
                </View>
                <View style={[styles.groupRowBody, idx > 0 && styles.divider]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{cb.category} is at {pctOf(spent, budget)}%</Text>
                    <Text style={styles.rowSub}>
                      {formatPeso(spent)} of your {formatPeso(budget)} limit
                      {status.label ? <Text style={{ color: status.color, fontWeight: '600' }}> · {status.label}</Text> : null}
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
              <GradientFill match={styles.tile} />
              <Ionicons name="bar-chart-outline" size={18} color={colors.gold} />
            </View>
            <View style={[styles.groupRowBody, (model.categoryBudgets || []).length > 0 && styles.divider]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Reports</Text>
                <Text style={styles.rowSub}>Close-outs, trends and audits</Text>
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
    // Redesign: iPhone-style sections and grouped lists.
    section: { marginBottom: 24 },
    sectionHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 4, marginBottom: 8 },
    sectionHead: { fontSize: 20, fontWeight: '700', color: colors.ink },
    sectionLink: { fontSize: 15, fontWeight: '600', color: colors.gold, paddingVertical: 4 },
    group: { backgroundColor: colors.navy3, borderRadius: 12, overflow: 'hidden' },
    groupRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, minHeight: 60 },
    groupRowBody: { flex: 1, flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', paddingVertical: 10, paddingRight: 16, gap: 8 },
    divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    tile: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    rowTitle: { fontSize: 17, fontWeight: '500', color: colors.ink },
    rowSub: { fontSize: 13, color: colors.inkDim, marginTop: 1 },
    badge: { fontSize: 12, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  });
}
