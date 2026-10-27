import { chartPoints } from '../homeChart';
import { dateText } from '../dateUtils';
import { useToday } from '../useToday';
import React, { useMemo, useState } from 'react';
import { holdTabSwipe } from '../navigation/swipeTabs';
import GradientFill from './GradientFill';
import { View, ScrollView, StyleSheet, LayoutChangeEvent } from 'react-native';
import { TouchableOpacity } from './Tap';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polyline, Polygon, Circle } from 'react-native-svg';
import { Text } from './AppText';
import CountingText from './CountingText';
import { useTheme } from '../ThemeContext';
import { formatPeso, LeftToSpendMood, leftToSpendBreakdown } from '../balanceProjection';
import { buildTransactionsList, transactionTotals } from '../transactions';
import type { HouseholdModel } from '../types';
import { useHideAmounts } from '../hideAmounts';
import { hapticSelection } from '../haptics';

// Redesign: the Home hero card from the Finance Flow mockup. Two pages you swipe
// between, with dots underneath:
//   1. Left to spend: amount, status, how much of the money is used.
//   2. This month: spending so far vs last month (solid line = this month, dashed =
//      last month), and In / Out / Saved for the month.
//   3. Where it comes from: what's in your accounts now, minus what's planned to go out
//      before payday, equals Left to spend.
// The card colour follows the mood (green / burnt orange / red).

type Props = {
  model: HouseholdModel;
  amount: number;
  statusLabel: string;
  basis: 'payday' | 'endOfMonth';
  mood: LeftToSpendMood;
  total: number;
  pctUsed: number;
  isDark: boolean;
  fullDate: string;
  targetDate: Date;
};

// Exported for the set-up screen's mood samples (2.2, approved L2).
export const CARD = {
  good: null,
  low: { light: '#A33C00', dark: '#933600' },
  over: { light: '#B30F1F', dark: '#A00D1C' },
} as const;

function pad(n: number) {
  return String(n).padStart(2, '0');
}

// Running total of money out per day of a month ("YYYY-MM").
function cumulativeOut(list: ReturnType<typeof buildTransactionsList>, ym: string, days: number): number[] {
  const perDay = new Array(days + 1).fill(0);
  list.forEach((t) => {
    if (t.direction !== 'out' || !t.date.startsWith(ym)) return;
    const d = parseInt(t.date.slice(8, 10), 10);
    if (d >= 1 && d <= days) perDay[d] += t.amount;
  });
  const out: number[] = [];
  let run = 0;
  for (let d = 1; d <= days; d++) {
    run += perDay[d];
    out.push(run);
  }
  return out;
}

// Speed sweep: only redraws when its own numbers change (not when Home shows the slim
// bar while scrolling).
export default React.memo(HomeHero);

function HomeHero({ model, amount, statusLabel, basis, mood, total, pctUsed, isDark, fullDate, targetDate }: Props) {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  // Version 3: the eye beside "Left to spend" hides the amounts (₱ *****).
  const { hidden, toggle, money } = useHideAmounts();
  // H-09: the month chart follows the date too.
  const today = useToday();

  const cardColor = mood === 'good' ? colors.cardTealEnd : CARD[mood][isDark ? 'dark' : 'light'];
  const dim = mood === 'good' ? colors.cardTealTextDim : 'rgba(255,255,255,0.92)';
  const fill = mood === 'good' ? colors.mintAccent : '#FFFFFF';

  const month = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const ym = `${y}-${pad(m + 1)}`;
    const prev = new Date(y, m - 1, 1);
    const prevYm = `${prev.getFullYear()}-${pad(prev.getMonth() + 1)}`;
    const daysThis = new Date(y, m + 1, 0).getDate();
    const daysPrev = new Date(prev.getFullYear(), prev.getMonth() + 1, 0).getDate();
    const list = buildTransactionsList(model);
    const totals = transactionTotals(list.filter((t) => t.date.startsWith(ym)));
    const thisCum = cumulativeOut(list, ym, daysThis).slice(0, now.getDate());
    const prevCum = cumulativeOut(list, prevYm, daysPrev);
    const sameDayLast = prevCum[Math.min(now.getDate(), daysPrev) - 1] ?? 0;
    const diff = (thisCum[thisCum.length - 1] ?? 0) - sameDayLast;
    return { totals, thisCum, prevCum, daysThis, diff };
  }, [model, today]);

  const breakdown = useMemo(() => leftToSpendBreakdown(model, { amount, targetDate, basis }), [model, amount, targetDate, basis]);
  const untilLabel = dateText(targetDate, { weekday: true });

  const chartW = Math.max(0, width - 40);
  const chartH = 50;
  const maxY = Math.max(1, ...month.thisCum, ...month.prevCum);
  const pts = (arr: number[]) => chartPoints(arr, month.daysThis, chartW, chartH, maxY);
  const thisPts = pts(month.thisCum);
  const prevPts = pts(month.prevCum);
  const lastPt = thisPts[thisPts.length - 1]?.split(',').map(Number);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View
      {...holdTabSwipe}
      style={[styles.card, { backgroundColor: cardColor }, mood === 'good' && !isDark && styles.shadow]}
      onLayout={onLayout}
    >
      <GradientFill kind="solid" color={cardColor} strength={0.26} radius={20} />
      {width > 0 && (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        >
          {/* Page 1: Left to spend */}
          <View style={[styles.page, { width }]}>
            <View style={styles.top}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: dim }]}>Left to spend</Text>
                <TouchableOpacity
                  onPress={() => {
                    hapticSelection();
                    toggle();
                  }}
                  hitSlop={12}
                  style={styles.eye}
                  accessibilityRole="button"
                  accessibilityLabel={hidden ? 'Show amounts' : 'Hide amounts'}
                  testID="home-hide-amounts"
                >
                  <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={19} color={dim} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                testID="home-calendar-shortcut"
                onPress={() => navigation.navigate('Calendar')}
                style={styles.calBtn}
                accessibilityLabel={`Open calendar. Today is ${fullDate}`}
              >
                <Ionicons name="calendar-outline" size={17} color="#FFFFFF" />
                {/* Today's day and date, e.g. "Thu, Oct 15" (approved mockup, option A). */}
                <Text style={styles.calText}>{dateText(new Date(), { weekday: true })}</Text>
              </TouchableOpacity>
            </View>
            {/* Smoothness 2026-10-23 (Cath): counts quickly to the new amount when it changes. */}
            <CountingText style={styles.amount} numberOfLines={1} adjustsFontSizeToFit accessibilityLabel={hidden ? 'Amount hidden' : undefined} value={amount} masked={hidden} format={(n) => money(n)} />
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={[styles.status, { color: dim }]} numberOfLines={1}>
                of {money(total)} · {statusLabel}
              </Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.trackFill, { width: `${Math.max(0, 100 - pctUsed)}%`, backgroundColor: fill }]} />
            </View>
          </View>

          {/* Page 2: This month */}
          <View style={[styles.page, { width }]}>
            <View style={styles.top}>
              <Text style={[styles.label, { color: dim }]}>This month</Text>
              <View style={styles.trend}>
                <Ionicons name={month.diff <= 0 ? 'chevron-down' : 'chevron-up'} size={12} color="#FFFFFF" />
                <Text style={styles.trendText}>
                  {money(Math.abs(month.diff), { noCents: true })} {month.diff <= 0 ? 'less' : 'more'} than last month
                </Text>
              </View>
            </View>
            <Svg
              width={chartW}
              height={chartH}
              style={{ marginTop: 10 }}
              accessibilityLabel={`Spending so far this month is ${hidden ? 'hidden' : formatPeso(Math.abs(month.diff))} ${month.diff <= 0 ? 'below' : 'above'} last month at the same point`}
            >
              {thisPts.length > 1 && (
                <Polygon points={`0,${chartH} ${thisPts.join(' ')} ${thisPts[thisPts.length - 1].split(',')[0]},${chartH}`} fill="rgba(255,255,255,0.10)" />
              )}
              <Polyline points={prevPts.join(' ')} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={1.5} strokeDasharray="3 4" strokeLinecap="round" />
              {thisPts.length > 1 && <Polyline points={thisPts.join(' ')} fill="none" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}
              {lastPt && <Circle cx={lastPt[0]} cy={lastPt[1]} r={4} fill="#FFFFFF" />}
            </Svg>
            <View style={styles.stats}>
              <View style={styles.stat}>
                <Text style={[styles.statLabel, { color: dim }]}>In</Text>
                <Text style={styles.statVal} numberOfLines={1} adjustsFontSizeToFit>{hidden ? '' : '+'}{money(month.totals.totalIn, { noCents: true })}</Text>
              </View>
              <View style={[styles.stat, styles.statDivider]}>
                <Text style={[styles.statLabel, { color: dim }]}>Out</Text>
                <Text style={styles.statVal} numberOfLines={1} adjustsFontSizeToFit>{hidden ? '' : '−'}{money(month.totals.totalOut, { noCents: true })}</Text>
              </View>
              <View style={[styles.stat, styles.statDivider]}>
                <Text style={[styles.statLabel, { color: dim }]}>Saved</Text>
                <Text style={styles.statVal} numberOfLines={1} adjustsFontSizeToFit>{money(month.totals.totalSaving, { noCents: true })}</Text>
              </View>
            </View>
          </View>

          {/* Page 3: Where Left to spend comes from */}
          <View style={[styles.page, { width }]}>
            <Text style={[styles.label, { color: dim }]}>Where it comes from</Text>
            <View style={{ marginTop: 8 }}>
              <View style={styles.bRow}>
                <Text style={[styles.bLabel, { color: dim }]}>In your accounts now</Text>
                <Text style={styles.bVal}>{money(breakdown.now)}</Text>
              </View>
              {breakdown.lines.slice(0, 4).map((l) => (
                <View key={l.label} style={styles.bRow}>
                  <Text style={[styles.bLabel, { color: dim }]} numberOfLines={1}>
                    {l.amount < 0 ? '− ' : '+ '}
                    {l.label} {basis === 'payday' ? 'before payday' : 'this month'}
                  </Text>
                  <Text style={styles.bVal}>{money(Math.abs(l.amount))}</Text>
                </View>
              ))}
              {breakdown.lines.length > 4 && (
                <View style={styles.bRow}>
                  <Text style={[styles.bLabel, { color: dim }]}>{breakdown.lines.slice(4).reduce((s, l) => s + l.amount, 0) < 0 ? '− ' : '+ '}Everything else</Text>
                  <Text style={styles.bVal}>{money(Math.abs(breakdown.lines.slice(4).reduce((s, l) => s + l.amount, 0)))}</Text>
                </View>
              )}
              {breakdown.lines.length === 0 && (
                <Text style={[styles.bLabel, { color: dim, marginVertical: 2 }]}>Nothing planned to go out {basis === 'payday' ? 'before payday' : 'this month'}.</Text>
              )}
              <View style={[styles.bRow, styles.bTotal]}>
                <Text style={styles.bTotalLabel}>Left to spend until {untilLabel}</Text>
                <Text style={styles.bTotalVal}>{money(amount)}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}
      <View style={styles.dots} accessibilityElementsHidden>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.dot, { opacity: i === page ? 1 : 0.35 }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, overflow: 'hidden', marginBottom: 24 },
  shadow: { shadowColor: '#1B3F30', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  page: { paddingTop: 18, paddingHorizontal: 20, paddingBottom: 6, minHeight: 148 },
  bRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 2, gap: 8 },
  bLabel: { fontSize: 14, flexShrink: 1 },
  bVal: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  bTotal: { marginTop: 6, paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.35)' },
  bTotalLabel: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', flexShrink: 1 },
  bTotalVal: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 15, fontWeight: '600' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eye: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginVertical: -4 },
  calBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 36, paddingLeft: 10, paddingRight: 12, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.16)', marginTop: -6, marginRight: -6 },
  calText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  amount: { fontSize: 40, lineHeight: 46, fontWeight: '700', letterSpacing: -0.5, color: '#FFFFFF', marginTop: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF', opacity: 0.85 },
  status: { fontSize: 15, flexShrink: 1 },
  track: { height: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden', marginTop: 12 },
  trackFill: { height: '100%', borderRadius: 999 },
  trend: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  trendText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
  stats: { flexDirection: 'row', marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.14)', paddingTop: 10 },
  stat: { flex: 1 },
  statDivider: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.14)', paddingLeft: 12 },
  statLabel: { fontSize: 13 },
  statVal: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: 4, paddingBottom: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
});
