// ============================================================
// Household Finance App — Cash-Flow Forecast report (Checkpoint 10.2)
// ============================================================
// Projects your balances forward 30/60/90 days using the same day-by-day projection
// as the Calendar (computeRunningBalances). Redesign: matches the Finance Flow "Cash
// flow" mockup — the lowest point and why, a line chart, and the biggest moves.
// ============================================================

import React, { useState } from 'react';
import { dateText } from '../../dateUtils';
import { View, ActivityIndicator, useWindowDimensions } from 'react-native';
import Svg, { Line, Polyline, Circle, Text as SvgText } from 'react-native-svg';
import { Text } from '../../components/AppText';
import SegmentedControl from '../../components/SegmentedControl';
import { useData } from '../../DataContext';
import { useTheme } from '../../ThemeContext';
import { computeRunningBalances, computeMonthEvents, eventDelta, formatPeso, type CalendarEvent } from '../../balanceProjection';
import { stripTime } from '../../recurrence';
import type { HouseholdModel } from '../../types';
import { PullToRefreshScrollView } from '../../PullToRefreshScrollView';
import { Group, useReportStyles } from '../../components/ReportBits';

type Point = { date: Date; balance: number };
type Move = { date: Date; event: CalendarEvent; delta: number };

function shortDate(d: Date): string {
  return dateText(d);
}
function dayDate(d: Date): string {
  return dateText(d, { weekday: true });
}

function forecast(model: HouseholdModel, daysAhead: number): { series: Point[]; moves: Move[] } {
  const today = stripTime(new Date());
  const end = new Date(today);
  end.setDate(end.getDate() + daysAhead);
  const series: Point[] = [];
  const moves: Move[] = [];
  let y = today.getFullYear();
  let m = today.getMonth();
  while (y < end.getFullYear() || (y === end.getFullYear() && m <= end.getMonth())) {
    const balances = computeRunningBalances(model, y, m);
    const events = computeMonthEvents(model, y, m);
    const dim = new Date(y, m + 1, 0).getDate();
    for (let day = 1; day <= dim; day++) {
      const d = stripTime(new Date(y, m, day));
      if (d < today || d > end) continue;
      series.push({ date: d, balance: balances[day] ?? 0 });
      if (d > today) (events[day] || []).forEach((event) => moves.push({ date: d, event, delta: eventDelta(event) }));
    }
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return { series, moves };
}

export default function CashFlowForecastReport() {
  const { model, loading } = useData();
  const { colors } = useTheme();
  const s = useReportStyles();
  const { width } = useWindowDimensions();
  const [days, setDays] = useState<'30' | '60' | '90'>('30');

  if (loading || !model) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  const { series, moves } = forecast(model, Number(days));
  if (series.length === 0) return null;
  const low = series.reduce((a, b) => (b.balance < a.balance ? b : a), series[0]);
  const lowIdx = series.indexOf(low);

  // Why it's lowest: the biggest payment in the few days before, and the next payday after.
  const before = moves
    .filter((mv) => mv.delta < 0 && mv.date <= low.date && (low.date.getTime() - mv.date.getTime()) / 86400000 <= 3)
    .sort((a, b) => a.delta - b.delta)[0];
  const payday = moves.find((mv) => mv.event.type === 'income' && mv.date > low.date);
  const why: string[] = [];
  if (payday) {
    const gap = Math.round((payday.date.getTime() - low.date.getTime()) / 86400000);
    why.push(gap === 1 ? 'The day before payday' : gap <= 7 ? `${['', '', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven'][gap]} days before payday` : '');
  }
  if (before) why.push(`after ${before.event.label}`);
  const whyText = why.filter(Boolean).join(', ');

  const biggest = [...moves].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 5);

  // Chart
  const W = width - 64;
  const H = 120;
  const top = 18;
  const bottom = 110;
  const vals = series.map((p) => p.balance);
  const min = Math.min(0, ...vals);
  const max = Math.max(1, ...vals);
  const x = (i: number) => (series.length === 1 ? 0 : (i / (series.length - 1)) * W);
  const yv = (v: number) => bottom - ((v - min) / (max - min || 1)) * (bottom - top);
  const points = series.map((p, i) => `${x(i).toFixed(1)},${yv(p.balance).toFixed(1)}`).join(' ');
  const lowColor = low.balance < 0 ? colors.negative : colors.orange;
  const lowX = Math.min(W - 30, Math.max(30, x(lowIdx)));

  return (
    <PullToRefreshScrollView contentContainerStyle={s.content}>
      <SegmentedControl<'30' | '60' | '90'>
        accessibilityLabel="Range"
        options={[
          { id: '30', label: '30 days' },
          { id: '60', label: '60 days' },
          { id: '90', label: '90 days' },
        ]}
        value={days}
        onChange={setDays}
      />
      <Group style={[s.pad, { marginTop: 20 }]}>
        <Text style={s.meta}>Lowest point</Text>
        <Text style={[s.title, { color: lowColor }]}>
          {formatPeso(Math.round(low.balance))} on {shortDate(low.date)}
        </Text>
        {!!whyText && <Text style={s.subhead}>{whyText.charAt(0).toUpperCase() + whyText.slice(1)}.</Text>}
        <Svg width={W} height={H + 14} style={{ marginTop: 12 }} accessibilityLabel={`Projected balance for the next ${days} days, lowest ${Math.round(low.balance)} pesos on ${shortDate(low.date)}`}>
          <Line x1={0} y1={bottom} x2={W} y2={bottom} stroke={colors.navy4} />
          <Polyline points={points} fill="none" stroke={colors.buttonFill} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          <Circle cx={x(lowIdx)} cy={yv(low.balance)} r={5} fill={lowColor} />
          <SvgText x={lowX} y={Math.max(12, yv(low.balance) - 10)} textAnchor="middle" fontSize={12} fontWeight="600" fill={lowColor}>
            {formatPeso(Math.round(low.balance)).replace('.00', '')}
          </SvgText>
          <SvgText x={0} y={H + 12} fontSize={11} fill={colors.inkDim}>Today</SvgText>
          {lowIdx > 3 && lowIdx < series.length - 4 && (
            <SvgText x={x(lowIdx)} y={H + 12} textAnchor="middle" fontSize={11} fill={colors.inkDim}>{shortDate(low.date)}</SvgText>
          )}
          <SvgText x={W} y={H + 12} textAnchor="end" fontSize={11} fill={colors.inkDim}>{shortDate(series[series.length - 1].date)}</SvgText>
        </Svg>
      </Group>

      <Text style={s.header}>Biggest moves</Text>
      <Group>
        {biggest.length === 0 && <Text style={[s.meta, { padding: 16 }]}>Nothing planned in this range.</Text>}
        {biggest.map((mv, i) => {
          const color = mv.event.type === 'saving' ? colors.saving : mv.delta > 0 ? colors.positive : colors.negative;
          return (
            <View key={`${mv.date.getTime()}-${i}`} style={[s.row, i > 0 && s.line]}>
              <View style={{ flex: 1 }}>
                <Text style={s.body} numberOfLines={1}>{mv.event.label}</Text>
                <Text style={s.meta}>{dayDate(mv.date)}</Text>
              </View>
              <Text style={[s.amount, { color }]}>
                {mv.event.type === 'saving' ? '' : mv.delta > 0 ? '+' : '−'}
                {formatPeso(Math.abs(mv.delta))}
              </Text>
            </View>
          );
        })}
      </Group>
      <Text style={s.footer}>Based on your bills, loans, pay days and planned spending. Actual spending will move it.</Text>
    </PullToRefreshScrollView>
  );
}
