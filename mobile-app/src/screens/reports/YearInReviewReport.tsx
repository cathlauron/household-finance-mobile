// ============================================================
// Household Finance App — Year in Review report
// ============================================================
// Redesign: matches the Finance Flow "2026 so far" mockup — four highlight tiles,
// the year's totals, and a way to share the highlights (no amounts).
// ============================================================

import React, { useState } from 'react';
import { View, ActivityIndicator, Share } from 'react-native';
import { TouchableOpacity } from '../../components/Tap';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../components/AppText';
import GradientFill from '../../components/GradientFill';
import { useData } from '../../DataContext';
import { useTheme } from '../../ThemeContext';
import { formatPeso } from '../../balanceProjection';
import { buildTransactionsList, transactionTotals } from '../../transactions';
import { PullToRefreshScrollView } from '../../PullToRefreshScrollView';
import { Group, useReportStyles } from '../../components/ReportBits';

type Props = { activeTag?: string };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function YearInReviewReport({ activeTag }: Props = {}) {
  const { model, loading } = useData();
  const { colors } = useTheme();
  const s = useReportStyles();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());

  if (loading || !model) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  const isThisYear = year === now.getFullYear();
  const lastMonth = isThisYear ? now.getMonth() : 11;
  const all = buildTransactionsList(model).filter((t) => t.date.startsWith(`${year}-`) && (!activeTag || (t.tags || []).includes(activeTag)));
  const totals = transactionTotals(all);

  // Bills paid on time: paid bill/debt cycles due this year, paid on or before the due date.
  let onTime = 0;
  let paidCount = 0;
  [...(model.bills || []), ...(model.debts || [])].forEach((r) =>
    (r.cycles || []).forEach((c) => {
      if (!(typeof c.amountPaid === 'number' && c.amountPaid > 0) || !(c.dueDate || '').startsWith(`${year}-`)) return;
      paidCount += 1;
      if (c.paidDate && c.dueDate && c.paidDate <= c.dueDate) onTime += 1;
    })
  );

  const byCat = new Map<string, number>();
  all.filter((t) => t.direction === 'out').forEach((t) => byCat.set(t.category || 'Other', (byCat.get(t.category || 'Other') || 0) + t.amount));
  const biggestCat = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  // Best month: the one where the most was left after spending and saving.
  let best: { m: number; net: number } | null = null;
  for (let m = 0; m <= lastMonth; m++) {
    const key = `${year}-${String(m + 1).padStart(2, '0')}`;
    const t = transactionTotals(all.filter((x) => x.date.startsWith(key)));
    if (t.totalIn === 0 && t.totalOut === 0) continue;
    const net = t.totalIn - t.totalOut;
    if (!best || net > best.net) best = { m, net };
  }

  const debtPaid = all.filter((t) => t.source === 'debt' || t.source === 'loan');
  const debtTotal = debtPaid.reduce((sum, t) => sum + t.amount, 0);
  const debtNames = [...new Set(debtPaid.map((t) => t.label))].slice(0, 2).join(' and ');
  const monthsCount = lastMonth + 1;

  const tiles = [
    { label: 'Saved', value: formatPeso(totals.totalSaving), color: colors.saving },
    { label: 'Bills paid on time', value: paidCount ? `${onTime} of ${paidCount}` : '—', color: colors.positive },
    { label: 'Biggest category', value: biggestCat || '—', color: colors.ink },
    { label: 'Best month', value: best ? MONTHS[best.m] : '—', color: colors.ink },
  ];

  async function share() {
    const lines = [
      `My ${year}${isThisYear ? ' so far' : ''} with Finance Flow`,
      paidCount ? `Paid ${onTime} of ${paidCount} bills on time` : '',
      best ? `Best month: ${MONTHS[best.m]}` : '',
      biggestCat ? `Most went to: ${biggestCat}` : '',
      totals.totalSaving > 0 ? 'Kept saving every step of the way' : '',
    ].filter(Boolean);
    try {
      await Share.share({ message: lines.join('\n') });
    } catch {
      // Closing the share sheet isn't an error worth showing.
    }
  }

  return (
    <PullToRefreshScrollView contentContainerStyle={s.content}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={() => setYear((y) => y - 1)} accessibilityRole="button" accessibilityLabel="Previous year" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={22} color={colors.gold} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={s.title}>{year}{isThisYear ? ' so far' : ''}</Text>
          <Text style={s.meta}>January to {MONTHS[lastMonth]}</Text>
        </View>
        <TouchableOpacity onPress={() => setYear((y) => Math.min(now.getFullYear(), y + 1))} disabled={isThisYear} accessibilityRole="button" accessibilityLabel="Next year" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-forward" size={22} color={isThisYear ? colors.navy4 : colors.gold} />
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 }}>
        {tiles.map((t) => (
          <Group key={t.label} style={[s.pad, { width: '47.5%', flexGrow: 1 }]}>
            <Text style={s.meta}>{t.label}</Text>
            <Text style={[s.title, { color: t.color }]} numberOfLines={1} adjustsFontSizeToFit>{t.value}</Text>
          </Group>
        ))}
      </View>

      <Text style={s.header}>Totals</Text>
      <Group>
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.body}>Money in</Text>
            <Text style={s.meta}>{monthsCount} {monthsCount === 1 ? 'month' : 'months'}</Text>
          </View>
          <Text style={[s.amount, { color: colors.positive }]}>+{formatPeso(totals.totalIn)}</Text>
        </View>
        <View style={[s.row, s.line]}>
          <View style={{ flex: 1 }}>
            <Text style={s.body}>Money out</Text>
            <Text style={s.meta}>{monthsCount} {monthsCount === 1 ? 'month' : 'months'}</Text>
          </View>
          <Text style={[s.amount, { color: colors.negative }]}>−{formatPeso(totals.totalOut)}</Text>
        </View>
        <View style={[s.row, s.line]}>
          <View style={{ flex: 1 }}>
            <Text style={s.body}>Debt paid down</Text>
            {!!debtNames && <Text style={s.meta} numberOfLines={1}>{debtNames}</Text>}
          </View>
          <Text style={[s.amount, { color: colors.ink }]}>{formatPeso(debtTotal)}</Text>
        </View>
      </Group>

      <TouchableOpacity onPress={share} accessibilityRole="button" style={{ marginTop: 20 }}>
        <Group style={[s.pad, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
          <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <GradientFill kind="tint" color={colors.accentTint} radius={8} />
            <Ionicons name="share-outline" size={20} color={colors.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.headline}>Share your year</Text>
            <Text style={s.subhead}>Just the highlights, with no amounts.</Text>
          </View>
        </Group>
      </TouchableOpacity>
    </PullToRefreshScrollView>
  );
}
