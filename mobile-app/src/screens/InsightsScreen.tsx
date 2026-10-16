import React, { useMemo } from 'react';
import LoadingView from '../components/LoadingView';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/AppText';
import GradientFill from '../components/GradientFill';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { formatPeso } from '../balanceProjection';
import { buildTransactionsList } from '../transactions';
import type { ThemeColors } from '../theme';

// Redesign: Insights (Home › Insights › See all, or Reports), matching the Finance Flow
// mockup: spending over the last 6 months, where this month's money went, and the
// reports, each opening on its own page.

export type ReportId = 'monthly' | 'yearly' | 'forecast' | 'person' | 'weekly' | 'merchant' | 'subscription' | 'tax' | 'paymentMethod';

export const REPORT_TITLES: Record<ReportId, string> = {
  monthly: 'Monthly close-out',
  yearly: 'Year in review',
  forecast: 'Cash flow',
  person: 'Spending by person',
  weekly: 'Weekly digest',
  merchant: 'Spending by merchant',
  subscription: 'Subscription audit',
  tax: 'Tax summary',
  paymentMethod: 'Payment methods',
};

export const MORE_REPORTS: ReportId[] = ['yearly', 'weekly', 'paymentMethod', 'tax', 'subscription'];

function ym(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function InsightsScreen() {
  const { colors } = useTheme();
  const { model } = useData();
  const navigation = useNavigation<any>();
  const styles = makeStyles(colors);

  const data = useMemo(() => {
    if (!model) return null;
    const out = buildTransactionsList(model).filter((t) => t.direction === 'out');
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const key = ym(d);
      return {
        key,
        label: d.toLocaleDateString('en-US', { month: 'short' }),
        long: d.toLocaleDateString('en-US', { month: 'long' }),
        total: out.filter((t) => t.date.startsWith(key)).reduce((s, t) => s + t.amount, 0),
      };
    });
    const thisKey = ym(now);
    const byCat = new Map<string, number>();
    out.filter((t) => t.date.startsWith(thisKey)).forEach((t) => byCat.set(t.category || 'Other', (byCat.get(t.category || 'Other') || 0) + t.amount));
    const cats = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
    const monthTotal = cats.reduce((s, [, v]) => s + v, 0);
    const last = months[4];
    const before = months[3];
    let compare = '';
    if (before.total > 0 && last.total > 0) {
      const pct = Math.round(((last.total - before.total) / before.total) * 100);
      compare = pct === 0 ? `${last.long} was about the same as ${before.long}.` : `${last.long} was ${Math.abs(pct)}% ${pct < 0 ? 'lower' : 'higher'} than ${before.long}.`;
    }
    return { months, cats: cats.slice(0, 5), monthTotal, compare, lastMonth: last.long };
  }, [model]);

  if (!model || !data) return <LoadingView />;
  const max = Math.max(1, ...data.months.map((m) => m.total));

  const reportRow = (id: ReportId | 'more', title: string, sub: string | undefined, first: boolean) => (
    <TouchableOpacity
      key={id}
      style={[styles.row, !first && styles.line]}
      onPress={() => (id === 'more' ? navigation.navigate('MoreReports') : navigation.navigate('Report', { id }))}
      accessibilityRole="button"
      testID={`insights-${id}`}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {!!sub && <Text style={styles.meta}>{sub}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.inkDim} />
    </TouchableOpacity>
  );

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.group, { padding: 16 }]}>
        <GradientFill match={styles.group} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text style={styles.headline}>Spending by month</Text>
          <Text style={styles.meta}>Last 6 months</Text>
        </View>
        <View style={styles.cols} accessibilityLabel={`Monthly spending: ${data.months.map((m) => `${m.label} ${Math.round(m.total)} pesos`).join(', ')}`}>
          {data.months.map((m, i) => {
            const now = i === data.months.length - 1;
            return (
              <View key={m.key} style={styles.col}>
                <View style={[styles.colBar, { height: Math.max(4, (m.total / max) * 84), backgroundColor: now ? colors.buttonFill : colors.navy1 }]} />
                <Text style={[styles.colLabel, now && { color: colors.ink, fontWeight: '700' }]}>{m.label}</Text>
              </View>
            );
          })}
        </View>
        {!!data.compare && <Text style={[styles.subhead, { marginTop: 12 }]}>{data.compare}</Text>}
      </View>

      <Text style={styles.header}>Where it went this month</Text>
      <View style={styles.group}>
        <GradientFill match={styles.group} />
        {data.cats.length === 0 ? (
          <Text style={[styles.meta, { padding: 16 }]}>No spending yet this month.</Text>
        ) : (
          data.cats.map(([name, value], i) => (
            <View key={name} style={[styles.catRow, i > 0 && styles.line]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.title}>{name}</Text>
                <Text style={[styles.amount, { color: colors.negative }]}>{formatPeso(value)}</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.trackFill, { width: `${Math.round((value / Math.max(1, data.monthTotal)) * 100)}%` }]} />
              </View>
            </View>
          ))
        )}
      </View>

      <Text style={styles.header}>Reports</Text>
      <View style={styles.group}>
        <GradientFill match={styles.group} />
        {reportRow('monthly', 'Monthly close-out', `${data.lastMonth} is ready`, true)}
        {reportRow('forecast', 'Cash flow forecast', undefined, false)}
        {reportRow('merchant', 'Spending by merchant', undefined, false)}
        {reportRow('person', 'Spending by person', undefined, false)}
        {reportRow('more', 'More reports', 'Payment methods, tax summary, weekly digest, year in review', false)}
      </View>
    </ScrollView>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 4 },
    group: { backgroundColor: colors.navy3, borderRadius: 12, overflow: 'hidden' },
    headline: { fontSize: 17, fontWeight: '600', color: colors.ink },
    meta: { fontSize: 13, color: colors.inkDim },
    subhead: { fontSize: 15, color: colors.inkDim },
    cols: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 110, marginTop: 14 },
    col: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
    colBar: { width: '100%', borderTopLeftRadius: 6, borderTopRightRadius: 6, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
    colLabel: { fontSize: 12, fontWeight: '500', color: colors.inkDim },
    header: { fontSize: 13, fontWeight: '600', color: colors.inkDim, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 22, marginBottom: 6, marginHorizontal: 16 },
    catRow: { paddingHorizontal: 16, paddingVertical: 12 },
    line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    title: { fontSize: 17, color: colors.ink },
    amount: { fontSize: 17, fontWeight: '600' },
    track: { height: 8, borderRadius: 999, backgroundColor: colors.navy1, overflow: 'hidden', marginTop: 6 },
    trackFill: { height: '100%', borderRadius: 999, backgroundColor: colors.buttonFill },
    row: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  });
}
