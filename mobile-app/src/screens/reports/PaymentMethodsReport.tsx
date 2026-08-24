// ============================================================
// Household Finance App — Payment Methods report (Checkpoint 10.2)
// ============================================================
// Groups every logged "out" payment — paid bill cycles, paid debt cycles,
// borrowed-loan payments (lent loans excluded, same as everywhere else money
// coming IN isn't a spend), and manual transactions — by which Cash/Debit/
// Credit payment method was used, via each record's optional `paymentMethod`
// field (see PaymentMethod in types.ts). Anything logged before payment
// methods existed, or left unset since, falls into its own "Not set" group
// rather than being silently skipped, so the total here can be compared
// against other reports' totals.
//
// This can't reuse buildTransactionsList() (transactions.ts) because that
// helper doesn't carry paymentMethod through — so this walks the same raw
// records buildTransactionsList() does, directly off the model.
// ============================================================

import React from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useData } from '../../DataContext';
import { useTheme } from '../../ThemeContext';
import { formatPeso } from '../../balanceProjection';
import type { PaymentMethod, BalanceAccountEntry } from '../../types';

type MethodTotal = {
  key: string;
  label: string;
  total: number;
  count: number;
};

function accountName(accounts: BalanceAccountEntry[], accountId: string): string {
  const acct = accounts.find((a) => a.id === accountId);
  return acct ? acct.name || 'Unnamed account' : 'Unknown account';
}

function methodKeyAndLabel(
  pm: PaymentMethod | undefined,
  debitAccounts: BalanceAccountEntry[],
  creditAccounts: BalanceAccountEntry[]
): { key: string; label: string } {
  if (!pm) return { key: 'unset', label: 'Not set' };
  if (pm.type === 'cash') return { key: 'cash', label: 'Cash' };
  if (pm.type === 'debit') {
    return { key: 'debit-' + pm.accountId, label: 'Debit — ' + accountName(debitAccounts, pm.accountId) };
  }
  return { key: 'credit-' + pm.accountId, label: 'Credit — ' + accountName(creditAccounts, pm.accountId) };
}

export default function PaymentMethodsReport() {
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

  const debitAccounts = model.balanceAccounts.debit || [];
  const creditAccounts = model.balanceAccounts.credit || [];
  const methodMap: Record<string, MethodTotal> = {};

  function addAmount(amt: number, pm: PaymentMethod | undefined) {
    if (!amt || amt <= 0) return;
    const { key, label } = methodKeyAndLabel(pm, debitAccounts, creditAccounts);
    if (!methodMap[key]) methodMap[key] = { key, label, total: 0, count: 0 };
    methodMap[key].total += amt;
    methodMap[key].count += 1;
  }

  model.bills.forEach((bill) => {
    bill.cycles.forEach((cycle) => {
      const amt = typeof cycle.amountPaid === 'number' ? cycle.amountPaid : 0;
      const date = cycle.paidDate || cycle.dueDate;
      if (!date || amt <= 0) return;
      addAmount(amt, cycle.paymentMethod);
    });
  });

  model.debts.forEach((debt) => {
    debt.cycles.forEach((cycle) => {
      const amt = typeof cycle.amountPaid === 'number' ? cycle.amountPaid : 0;
      const date = cycle.paidDate || cycle.dueDate;
      if (!date || amt <= 0) return;
      addAmount(amt, cycle.paymentMethod);
    });
  });

  model.loans.forEach((loan) => {
    if (loan.direction === 'lent') return; // money coming in, not a spend
    loan.actualPayments.forEach((p) => {
      const amt = typeof p.actual === 'number' ? p.actual : 0;
      if (!p.date || amt <= 0) return;
      addAmount(amt, p.paymentMethod);
    });
  });

  (model.manualTransactions || []).forEach((t) => {
    if (t.direction !== 'out') return;
    const amt = typeof t.amount === 'number' ? t.amount : 0;
    if (!t.date || amt <= 0) return;
    addAmount(amt, t.paymentMethod);
  });

  // "Not set" sinks to the bottom regardless of amount — everything else sorts by total desc.
  const methods = Object.values(methodMap).sort((a, b) => {
    if (a.key === 'unset') return 1;
    if (b.key === 'unset') return -1;
    return b.total - a.total;
  });

  const grandTotal = methods.reduce((s, m) => s + m.total, 0);
  const maxAmount = methods.reduce((m, x) => (x.key === 'unset' ? m : Math.max(m, x.total)), 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Payment Methods</Text>
        <Text style={styles.subLabel}>
          {methods.length === 0
            ? 'No expenses logged yet.'
            : `${formatPeso(grandTotal)} total across ${methods.length} method${methods.length === 1 ? '' : 's'}`}
        </Text>
      </View>

      {methods.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptyText}>
            Nothing to show yet — pay a bill, debt, or loan (or log a manual transaction) with a payment method set.
          </Text>
        </View>
      ) : (
        methods.map((m) => {
          const pct = maxAmount > 0 && m.key !== 'unset' ? (m.total / maxAmount) * 100 : 0;
          const pctOfTotal = grandTotal > 0 ? (m.total / grandTotal) * 100 : 0;
          return (
            <View key={m.key} style={styles.card}>
              <View style={styles.methodHeaderRow}>
                <Text
                  style={[styles.methodName, m.key === 'unset' && styles.methodNameMuted]}
                  numberOfLines={1}
                >
                  {m.label}
                </Text>
                <Text style={styles.methodTotal}>{formatPeso(m.total)}</Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${pct}%`, backgroundColor: m.key === 'unset' ? colors.inkFaint : colors.gold },
                  ]}
                />
              </View>
              <Text style={styles.methodMeta}>
                {m.count} payment{m.count === 1 ? '' : 's'} · {pctOfTotal.toFixed(0)}% of total
              </Text>
            </View>
          );
        })
      )}

      {methods.some((m) => m.key === 'unset') && (
        <Text style={styles.footnote}>
          "Not set" covers payments logged before payment methods existed, or where none was picked.
        </Text>
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
    methodHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    methodName: { fontSize: 14, fontWeight: '600', color: colors.ink, flex: 1, marginRight: 8 },
    methodNameMuted: { color: colors.inkFaint, fontStyle: 'italic' },
    methodTotal: { fontSize: 14, fontWeight: '700', color: colors.ink },
    progressTrack: { height: 8, borderRadius: 999, backgroundColor: colors.navy4, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 999 },
    methodMeta: { fontSize: 11, color: colors.inkFaint, marginTop: 8 },
    footnote: { fontSize: 11, color: colors.inkFaint, fontStyle: 'italic', paddingHorizontal: 4, marginTop: 2 },
  });
}
