// ============================================================
// Household Finance App — Monthly Close-out report
// ============================================================
// Redesign: matches the Finance Flow "September" close-out mockup. Shows last month
// by default (the one that's "ready"), with arrows to look at other months.
// ============================================================

import React, { useState } from 'react';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../components/AppText';
import { useData } from '../../DataContext';
import { useTheme } from '../../ThemeContext';
import { formatPeso } from '../../balanceProjection';
import { buildTransactionsList, transactionTotals } from '../../transactions';
import { PullToRefreshScrollView } from '../../PullToRefreshScrollView';
import { Group, Trio, useReportStyles } from '../../components/ReportBits';

type Props = { activeTag?: string };

function ym(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function MonthlyCloseOutReport({ activeTag }: Props = {}) {
  const { model, loading } = useData();
  const { colors } = useTheme();
  const s = useReportStyles();
  const [offset, setOffset] = useState(-1); // 0 = this month, -1 = last month

  if (loading || !model) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  const now = new Date();
  const month = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const prev = new Date(month.getFullYear(), month.getMonth() - 1, 1);
  const key = ym(month);
  const prevKey = ym(prev);
  const name = month.toLocaleDateString('en-US', { month: 'long', year: month.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
  const prevName = prev.toLocaleDateString('en-US', { month: 'long' });
  const isCurrent = offset === 0;

  const all = buildTransactionsList(model).filter((t) => !activeTag || (t.tags || []).includes(activeTag));
  const inMonth = all.filter((t) => t.date.startsWith(key));
  const totals = transactionTotals(inMonth);
  const isBill = (src: string) => src === 'bill' || src === 'debt' || src === 'loan';
  const bills = inMonth.filter((t) => t.direction === 'out' && isBill(t.source)).reduce((sum, t) => sum + t.amount, 0);
  const spending = totals.totalOut - bills;

  const budgets = (model.categoryBudgets || []).filter((b) => typeof b.monthlyBudget === 'number' && b.monthlyBudget > 0);
  // Category budgets if there are any, otherwise the monthly spending target from setup.
  const catBudgets = budgets.reduce((sum, b) => sum + (b.monthlyBudget as number), 0);
  const target = typeof model.settings.monthlySpendingBudget === 'number' ? model.settings.monthlySpendingBudget : 0;
  const budgetTotal = catBudgets > 0 ? catBudgets : target;
  const left = budgetTotal - spending;

  const byCat = (list: typeof all) => {
    const m = new Map<string, number>();
    list.filter((t) => t.direction === 'out').forEach((t) => m.set(t.category || 'Other', (m.get(t.category || 'Other') || 0) + t.amount));
    return m;
  };
  const cats = [...byCat(inMonth).entries()].sort((a, b) => b[1] - a[1]);
  const prevCats = byCat(all.filter((t) => t.date.startsWith(prevKey)));
  const maxCat = Math.max(1, ...cats.map(([, v]) => v));

  let badge = isCurrent ? 'In progress' : 'Closed';
  let badgeColor = colors.inkDim;
  let badgeBg = colors.navy1;
  if (budgetTotal > 0) {
    badge += left >= 0 ? ' · under budget' : ' · over budget';
    badgeColor = left >= 0 ? colors.positive : colors.negative;
    badgeBg = left >= 0 ? colors.okBg : colors.errorBg;
  }

  return (
    <PullToRefreshScrollView contentContainerStyle={s.content}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <TouchableOpacity onPress={() => setOffset((o) => o - 1)} accessibilityRole="button" accessibilityLabel="Previous month" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={22} color={colors.gold} />
        </TouchableOpacity>
        <Text style={s.title}>{name}</Text>
        <TouchableOpacity
          onPress={() => setOffset((o) => Math.min(0, o + 1))}
          disabled={isCurrent}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-forward" size={22} color={isCurrent ? colors.navy4 : colors.gold} />
        </TouchableOpacity>
      </View>

      <Group style={s.pad}>
        <View style={[s.badge, { backgroundColor: badgeBg }]}>
          <Text style={[s.badgeText, { color: badgeColor }]}>{badge}</Text>
        </View>
        <Text style={[s.title, { marginTop: 8 }]}>
          You spent {formatPeso(spending)}
          {budgetTotal > 0 ? ` of ${formatPeso(budgetTotal)}` : ''}
        </Text>
        <Text style={s.subhead}>
          {budgetTotal > 0
            ? left >= 0
              ? `${formatPeso(left)} left over.${isCurrent ? '' : ' Nice month.'}`
              : `${formatPeso(-left)} over your budgets.`
            : 'Set category budgets in Settings › Budgeting to compare.'}
        </Text>
        <Trio
          items={[
            { label: 'In', value: '+' + formatPeso(totals.totalIn), color: colors.positive },
            { label: 'Out', value: '−' + formatPeso(totals.totalOut), color: colors.negative },
            { label: 'Saved', value: formatPeso(totals.totalSaving), color: colors.saving },
          ]}
        />
      </Group>

      <Text style={s.header}>Where it went</Text>
      <Group>
        {cats.length === 0 && <Text style={[s.meta, { padding: 16 }]}>No spending this month.</Text>}
        {cats.map(([cat, value], i) => {
          const limit = budgets.find((b) => b.category === cat)?.monthlyBudget as number | undefined;
          const before = prevCats.get(cat) || 0;
          const diff = value - before;
          const note =
            limit && value > limit
              ? `Over its ${formatPeso(limit)} limit`
              : before > 0 && Math.abs(diff) >= 1
                ? `${formatPeso(Math.abs(diff))} ${diff > 0 ? 'more' : 'less'} than ${prevName}`
                : '';
          return (
            <View key={cat} style={[{ paddingHorizontal: 16, paddingVertical: 12 }, i > 0 && s.line]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <Text style={s.body}>{cat}</Text>
                <Text style={[s.amount, { color: colors.negative }]}>{formatPeso(value)}</Text>
              </View>
              {!!note && <Text style={[s.meta, { marginTop: 2, fontSize: 15 }, limit && value > limit ? { color: colors.negative } : null]}>{note}</Text>}
              <View style={s.track}>
                <View style={[s.trackFill, { width: `${Math.round((value / maxCat) * 100)}%` }]} />
              </View>
            </View>
          );
        })}
      </Group>
      {bills > 0 && <Text style={s.footer}>Bills ({formatPeso(bills)}) are counted in Out but not in your spending.</Text>}
    </PullToRefreshScrollView>
  );
}
