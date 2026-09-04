// ============================================================
// Household Finance App — Cash-Flow Forecast report (Checkpoint 10.2)
// ============================================================
// Projects your account balances forward 30/60/90 days by
// stitching together computeRunningBalances() (from
// balanceProjection.ts) across however many calendar months the
// chosen range spans — reusing the exact same day-by-day
// projection math the Calendar tab already uses, rather than
// duplicating it.
// ============================================================

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useData } from '../../DataContext';
import { useTheme } from '../../ThemeContext';
import { computeRunningBalances, formatPeso } from '../../balanceProjection';
import { stripTime } from '../../recurrence';
import type { HouseholdModel } from '../../types';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_OPTIONS = [30, 60, 90];

function shortDate(d: Date): string {
  return `${MONTH_LABELS[d.getMonth()]} ${d.getDate()}`;
}

type ForecastPoint = { date: Date; day: number; balance: number };

function computeForecastSeries(model: HouseholdModel, daysAhead: number): ForecastPoint[] {
  const today = stripTime(new Date());
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + daysAhead);

  const series: ForecastPoint[] = [];
  let y = today.getFullYear();
  let m = today.getMonth();
  const endY = endDate.getFullYear();
  const endM = endDate.getMonth();

  while (y < endY || (y === endY && m <= endM)) {
    const balances = computeRunningBalances(model, y, m);
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = stripTime(new Date(y, m, day));
      if (dateObj < today || dateObj > endDate) continue;
      const dayIndex = Math.round((dateObj.getTime() - today.getTime()) / 86400000);
      series.push({ date: dateObj, day: dayIndex, balance: balances[day] ?? 0 });
    }
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return series;
}

function sampleSeries(series: ForecastPoint[], points: number): ForecastPoint[] {
  if (series.length <= points) return series;
  const step = (series.length - 1) / (points - 1);
  const sampled: ForecastPoint[] = [];
  for (let i = 0; i < points; i++) {
    sampled.push(series[Math.round(i * step)]);
  }
  return sampled;
}

export default function CashFlowForecastReport() {
  const { model, loading } = useData();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [days, setDays] = useState(30);

  if (loading || !model) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  const series = computeForecastSeries(model, days);
  const startBalance = series.length > 0 ? series[0].balance : 0;
  const endBalance = series.length > 0 ? series[series.length - 1].balance : 0;
  const lowestPoint = series.reduce(
    (min, p) => (p.balance < min.balance ? p : min),
    series[0] || { date: new Date(), day: 0, balance: 0 }
  );
  const maxAbs = Math.max(1, ...series.map((p) => Math.abs(p.balance)));
  const sampled = sampleSeries(series, 15);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.pillRow}>
        {DAY_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.pill, days === opt && styles.pillActive]}
            onPress={() => setDays(opt)}
          >
            <Text style={[styles.pillText, days === opt && styles.pillTextActive]}>{opt} days</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.statGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statCardLabel}>Today</Text>
          <Text style={styles.statCardAmount}>{formatPeso(startBalance)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statCardLabel}>In {days} Days</Text>
          <Text style={[styles.statCardAmount, { color: endBalance < 0 ? colors.error : colors.ink }]}>
            {formatPeso(endBalance)}
          </Text>
        </View>
      </View>

      {lowestPoint.balance < 0 && (
        <View style={styles.warningCard}>
          <Text style={styles.warningText}>
            Balance dips to {formatPeso(lowestPoint.balance)} around {shortDate(lowestPoint.date)} — plan
            around this if you can.
          </Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Projected Balance</Text>
        <Text style={styles.cardSub}>Day by day, over the next {days} days</Text>
        <View style={styles.chartRow}>
          {sampled.map((p, idx) => (
            <View key={idx} style={styles.chartCol}>
              <View style={styles.chartBarsWrap}>
                <View
                  style={[
                    styles.forecastBar,
                    {
                      height: `${(Math.abs(p.balance) / maxAbs) * 100}%`,
                      backgroundColor: p.balance < 0 ? colors.error : colors.gold,
                    },
                  ]}
                />
              </View>
              <Text style={styles.chartColLabel}>{p.day === 0 ? 'Today' : `+${p.day}d`}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={styles.footerNote}>
        This is a projection based on expected income, bills, debts, and savings contributions — not a
        live bank feed. Keep your "as of" balance on the Calendar tab current for accuracy.
      </Text>
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.navy1 },
    contentContainer: { padding: 14, paddingBottom: 32 },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navy1 },
    pillRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    pill: { flex: 1, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.navy3, alignItems: 'center' },
    pillActive: { backgroundColor: colors.gold },
    pillText: { fontSize: 13, fontWeight: '600', color: colors.inkDim },
    pillTextActive: { color: colors.navy1 },
    statGrid: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    statCard: { flex: 1, backgroundColor: colors.navy3, borderRadius: 10, padding: 14 },
    statCardLabel: {
      fontSize: 10,
      color: colors.inkFaint,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    statCardAmount: { fontSize: 17, fontWeight: '700', color: colors.ink },
    warningCard: {
      backgroundColor: colors.navy3,
      borderLeftWidth: 3,
      borderLeftColor: colors.error,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
    },
    warningText: { fontSize: 12, color: colors.error, lineHeight: 17 },
    card: { backgroundColor: colors.navy3, borderRadius: 10, padding: 16, marginBottom: 12 },
    cardLabel: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: colors.inkDim,
      marginBottom: 2,
    },
    cardSub: { fontSize: 11, color: colors.inkFaint, marginBottom: 12 },
    chartRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 130 },
    chartCol: { flex: 1, alignItems: 'center' },
    chartBarsWrap: { height: 100, justifyContent: 'flex-end', width: '100%', alignItems: 'center' },
    forecastBar: { width: 6, borderRadius: 2, minHeight: 2 },
    chartColLabel: { fontSize: 8, color: colors.inkFaint, marginTop: 6 },
    footerNote: { fontSize: 11, color: colors.inkFaint, textAlign: 'center', marginTop: 4, marginBottom: 12, lineHeight: 16 },
  });
}
