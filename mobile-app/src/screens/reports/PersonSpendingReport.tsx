// ============================================================
// Household Finance App — Person Spending report (Checkpoint 10.2)
// ============================================================
// One card per person in model.people, plus a "Shared" card for
// anything with owner === 'shared' (the default for bills/debts/
// loans/manual transactions unless assigned to a specific person).
// Each card shows total spent and a per-category breakdown, same
// visual language as the other report pages.
//
// Reuses buildTransactionsList() directly — no new balance math.
// Carries the same "Income" limitation as Dashboard/Year in Review
// (Income sources aren't in buildTransactionsList() yet), but this
// report only looks at money OUT, so that limitation doesn't apply
// here the way it does elsewhere.
// ============================================================

import React from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useData } from '../../DataContext';
import { useTheme } from '../../ThemeContext';
import { formatPeso } from '../../balanceProjection';
import { buildTransactionsList } from '../../transactions';
import type { TransactionEntry } from '../../transactions';
import type { Person } from '../../types';

const CATEGORY_COLOR_KEYS = ['gold', 'orange', 'error', 'ok'] as const;

type PersonGroup = {
  id: string;
  name: string;
  total: number;
  categories: { category: string; amount: number }[];
};

function buildPersonGroup(id: string, name: string, transactions: TransactionEntry[]): PersonGroup {
  const outTx = transactions.filter((t) => t.owner === id && t.direction === 'out');
  const total = outTx.reduce((s, t) => s + t.amount, 0);
  const categoryMap: Record<string, number> = {};
  outTx.forEach((t) => {
    const key = t.category || 'Uncategorized';
    categoryMap[key] = (categoryMap[key] || 0) + t.amount;
  });
  const categories = Object.entries(categoryMap)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
  return { id, name, total, categories };
}

export default function PersonSpendingReport() {
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

  const allTransactions = buildTransactionsList(model);
  const people: Person[] = model.people || [];

  const groups: PersonGroup[] = [
    ...people.map((p) => buildPersonGroup(p.id, p.name || 'Unnamed', allTransactions)),
    buildPersonGroup('shared', 'Shared', allTransactions),
  ].filter((g) => g.total > 0 || g.id === 'shared');

  const grandTotal = groups.reduce((s, g) => s + g.total, 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {groups.length === 0 || grandTotal === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptyText}>No expenses logged yet.</Text>
        </View>
      ) : (
        groups.map((g) => {
          const pct = grandTotal > 0 ? Math.round((g.total / grandTotal) * 100) : 0;
          const maxCategoryAmount = g.categories.length > 0 ? g.categories[0].amount : 0;
          return (
            <View key={g.id} style={styles.card}>
              <View style={styles.personHeaderRow}>
                <Text style={styles.personName}>{g.name}</Text>
                <Text style={styles.personTotal}>{formatPeso(g.total)}</Text>
              </View>
              <Text style={styles.personShareNote}>
                {pct}% of total spending{g.total === 0 ? ' — nothing logged yet' : ''}
              </Text>
              {g.categories.length > 0 && (
                <View style={styles.categoryList}>
                  {g.categories.map((c, idx) => {
                    const barPct = maxCategoryAmount > 0 ? (c.amount / maxCategoryAmount) * 100 : 0;
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
                          <View
                            style={[
                              styles.progressFill,
                              { width: `${barPct}%`, backgroundColor: colors[colorKey] },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })
      )}

      <Text style={styles.footerNote}>
        "Shared" covers bills, debts, loans, and manual transactions not assigned to one person —
        which right now is most manual entries, since there's no per-transaction "who's this for"
        picker yet.
      </Text>
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.navy1 },
    contentContainer: { padding: 14, paddingBottom: 32 },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navy1 },
    card: { backgroundColor: colors.navy3, borderRadius: 10, padding: 16, marginBottom: 12 },
    personHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    personName: { fontSize: 15, fontWeight: '700', color: colors.ink },
    personTotal: { fontSize: 15, fontWeight: '700', color: colors.ink },
    personShareNote: { fontSize: 11, color: colors.inkFaint, marginTop: 2, marginBottom: 4 },
    emptyText: { fontSize: 13, color: colors.inkFaint },
    categoryList: { marginTop: 8 },
    categoryRow: { marginTop: 10 },
    categoryHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    categoryName: { fontSize: 13, color: colors.ink, flex: 1, marginRight: 8 },
    categoryAmount: { fontSize: 12, color: colors.inkDim },
    progressTrack: { height: 8, borderRadius: 999, backgroundColor: colors.navy4, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 999 },
    footerNote: { fontSize: 11, color: colors.inkFaint, textAlign: 'center', marginTop: 4, marginBottom: 12, lineHeight: 16 },
  });
}
