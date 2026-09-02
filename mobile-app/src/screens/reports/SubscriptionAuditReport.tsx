// ============================================================
// Household Finance App — Subscription Audit report
// ============================================================
// Surfaces every recurring bill (monthly/annual/custom — one-time
// bills are excluded, since they're not "subscriptions") ranked by
// monthly-equivalent cost, so subscriptions and recurring charges
// are easy to see and compare at a glance.
//
// Monthly-equivalent cost is derived from the bill's most recent
// cycle amountDue:
//   monthly -> used as-is
//   annual  -> divided by 12
//   custom  -> treated as monthly for now (recurrence.ts doesn't
//              yet implement Custom due-date math in the mobile
//              app, so there's no reliable frequency to convert
//              from — flagged as a simplification, not a bug)
// ============================================================

import React from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useData } from '../../DataContext';
import { useTheme } from '../../ThemeContext';
import { formatPeso } from '../../balanceProjection';
import type { Bill } from '../../types';

type AuditRow = {
  bill: Bill;
  monthlyCost: number;
  recurLabel: string;
};

function latestAmount(bill: Bill): number {
  const cycles = bill.cycles || [];
  if (cycles.length === 0) return 0;

  // Prefer the cycle with the most recent dueDate that has a real amount.
  const dated = cycles.filter((c) => c.dueDate && (parseFloat(String(c.amountDue)) || 0) > 0);
  if (dated.length > 0) {
    const sorted = [...dated].sort((a, b) => (a.dueDate < b.dueDate ? 1 : -1));
    return parseFloat(String(sorted[0].amountDue)) || 0;
  }

  // Fall back to any cycle with an amount at all.
  const anyWithAmount = cycles.find((c) => (parseFloat(String(c.amountDue)) || 0) > 0);
  return anyWithAmount ? parseFloat(String(anyWithAmount.amountDue)) || 0 : 0;
}

function monthlyEquivalent(bill: Bill): number {
  const amt = latestAmount(bill);
  if (amt <= 0) return 0;
  if (bill.recurringType === 'annual') return amt / 12;
  // 'monthly' and 'custom' (fallback) both treated as monthly-equivalent.
  return amt;
}

function recurLabel(bill: Bill): string {
  if (bill.recurringType === 'annual') return 'Annual';
  if (bill.recurringType === 'custom') return 'Custom (treated as monthly)';
  return 'Monthly';
}

export default function SubscriptionAuditReport() {
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

  const rows: AuditRow[] = (model.bills || [])
    .filter((b) => b.recurringType !== 'onetime')
    .map((b) => ({
      bill: b,
      monthlyCost: monthlyEquivalent(b),
      recurLabel: recurLabel(b),
    }))
    .filter((r) => r.monthlyCost > 0)
    .sort((a, b) => b.monthlyCost - a.monthlyCost);

  const totalMonthly = rows.reduce((s, r) => s + r.monthlyCost, 0);
  const totalAnnual = totalMonthly * 12;
  const maxMonthly = rows.length > 0 ? rows[0].monthlyCost : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Subscription Audit</Text>
        <Text style={styles.subLabel}>
          Every recurring bill — monthly, annual, or custom — ranked by monthly-equivalent cost.
          One-time bills aren't included, since they're not ongoing charges.
        </Text>
        <View style={styles.statRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Monthly total</Text>
            <Text style={styles.statValue}>{formatPeso(totalMonthly)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Annualized</Text>
            <Text style={[styles.statValue, { color: colors.orange }]}>{formatPeso(totalAnnual)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Recurring bills ({rows.length})</Text>
        {rows.length === 0 ? (
          <Text style={styles.emptyText}>
            No recurring bills with a logged amount yet — log a payment cycle on a monthly or
            annual bill to see it here.
          </Text>
        ) : (
          rows.map((r) => {
            const pct = maxMonthly > 0 ? (r.monthlyCost / maxMonthly) * 100 : 0;
            return (
              <View key={r.bill.id} style={styles.billRow}>
                <View style={styles.billHeaderRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.billName} numberOfLines={1}>
                      {r.bill.name || 'Untitled bill'}
                    </Text>
                    <Text style={styles.billMeta} numberOfLines={1}>
                      {(r.bill.category || 'Uncategorized')} · {r.recurLabel}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.billAmount}>{formatPeso(r.monthlyCost)}/mo</Text>
                    <Text style={styles.billAmountSub}>{formatPeso(r.monthlyCost * 12)}/yr</Text>
                  </View>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${pct}%` }]} />
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
    card: { backgroundColor: colors.navy3, borderRadius: 10, padding: 16, marginBottom: 12 },
    cardLabel: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: colors.inkDim,
      marginBottom: 8,
    },
    subLabel: { fontSize: 12, color: colors.inkFaint, marginBottom: 12, lineHeight: 17 },
    statRow: { flexDirection: 'row', justifyContent: 'space-between' },
    statBox: { flex: 1 },
    statLabel: { fontSize: 11, color: colors.inkFaint, marginBottom: 2 },
    statValue: { fontSize: 15, fontWeight: '700', color: colors.ink },
    emptyText: { fontSize: 13, color: colors.inkFaint },
    billRow: { marginTop: 12 },
    billHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    billName: { fontSize: 13, color: colors.ink, fontWeight: '600' },
    billMeta: { fontSize: 11, color: colors.inkFaint, marginTop: 1 },
    billAmount: { fontSize: 13, color: colors.ink, fontWeight: '700' },
    billAmountSub: { fontSize: 10, color: colors.inkFaint, marginTop: 1 },
    progressTrack: { height: 8, borderRadius: 999, backgroundColor: colors.navy4, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: colors.orange, borderRadius: 999 },
  });
}
