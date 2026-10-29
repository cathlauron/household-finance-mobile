import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { TouchableOpacity } from '../components/Tap';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { Text } from '../components/AppText';
import GradientFill from '../components/GradientFill';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { useToday } from '../useToday';
import { useHideAmounts } from '../hideAmounts';
import { computeLeftToSpend, getLeftToSpendStatus, accountCurrentBalance, type SpendingGroup } from '../balanceProjection';
import { leftToSpendItems, type LeftToSpendItem } from '../leftToSpendExtras';
import { dateText } from '../dateUtils';
import { CARD } from '../components/HomeHero';
import type { ThemeColors } from '../theme';

// H-54 (Cath, 2026-10-29, canvas L4): tapping Left to Spend shows WHY it is what it is: the
// card, a two-line "why", small bars (what you have, then what comes off), every account,
// and every item still to go out before payday. Each item opens its own page.

const PLAN = new Set(['Groceries list', 'Trips', 'Events']);
const GROUP_OF = (g: string) => (PLAN.has(g) ? 'Plans' : g === 'Savings top-ups' || g === 'Planned transactions' ? 'Other' : g);
const BAR_ORDER = ['Past due', 'Bills', 'Debts', 'Loans', 'Plans', 'Other'];

export default function LeftToSpendScreen() {
  const { colors, isDark } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { model } = useData();
  const navigation = useNavigation<any>();
  const today = useToday();
  const { money } = useHideAmounts();
  const data = useMemo(() => {
    if (!model) return null;
    const lts = computeLeftToSpend(model);
    const items = leftToSpendItems(model, new Date(), lts.targetDate);
    const accounts = (['cash', 'debit', 'credit'] as SpendingGroup[]).flatMap((g) =>
      (model.balanceAccounts[g] || []).map((a) => ({ group: g, id: a.id, name: a.name || 'Account', balance: accountCurrentBalance(model, g, a) }))
    );
    const have = Math.round(accounts.reduce((t, a) => t + a.balance, 0) * 100) / 100;
    return { lts, items, accounts, have };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, today]);
  if (!model || !data) return null;
  const { lts, items, accounts, have } = data;
  const status = getLeftToSpendStatus(lts.amount, model, colors);
  const cardColor = status.mood === 'good' ? colors.cardTealEnd : CARD[status.mood][isDark ? 'dark' : 'light'];
  const outs = items.filter((i) => i.amount < 0).sort((a, b) => rank(a) - rank(b));
  const ins = items.filter((i) => i.amount > 0);
  const outTotal = -outs.reduce((t, i) => t + i.amount, 0);
  const inTotal = ins.reduce((t, i) => t + i.amount, 0);
  const until = dateText(lts.targetDate, { weekday: true });
  const biggest = outs.reduce<LeftToSpendItem | undefined>((b, i) => (!b || i.amount < b.amount ? i : b), undefined);
  const why =
    lts.amount < 0
      ? `You have ${money(have)}. Before payday ${money(outTotal)} still goes out${inTotal > 0 ? ` and ${money(inTotal)} comes in` : ''}${biggest ? `, the biggest part ${biggest.group === 'Past due' ? `${biggest.name}'s past-due payment` : biggest.name} (${money(-biggest.amount)})` : ''}.`
      : `You have ${money(have)}. Before payday ${money(outTotal)} still goes out${inTotal > 0 ? ` and ${money(inTotal)} comes in` : ''}, so ${money(lts.amount)} is left to spend until ${until}.`;
  const bars = BAR_ORDER.map((g) => ({ label: g, amount: -outs.filter((i) => GROUP_OF(i.group) === g).reduce((t, i) => t + i.amount, 0) })).filter((b) => b.amount > 0.005);
  const scale = Math.max(1, Math.abs(have), ...bars.map((b) => b.amount));
  const open = (it: LeftToSpendItem) => {
    const r = it.ref;
    if (!r) return;
    if (r.kind === 'bill' || r.kind === 'debt' || r.kind === 'loan') navigation.navigate('PayDetail', { kind: r.kind, id: (r as any).id, backTitle: 'Left to spend' });
    else if (r.kind === 'trip') navigation.navigate('Travel');
    else if (r.kind === 'event') navigation.navigate('Events');
    else if (r.kind === 'groceries') navigation.navigate('Groceries');
    else if (r.kind === 'savings') navigation.navigate('Savings');
    else if (r.kind === 'income') navigation.navigate('Income');
  };
  const amountColor = (it: LeftToSpendItem) => (it.amount > 0 ? colors.positive : PLAN.has(it.group) ? colors.planned : colors.negative);
  return (
    <KeyboardAwareScrollView pageBounce contentContainerStyle={s.content}>
      <View style={[s.card, { backgroundColor: cardColor }]} testID="lts-card">
        <GradientFill kind="solid" color={cardColor} strength={0.26} radius={24} />
        <Text style={s.cardLabel}>Left to spend until {until} · {status.label}</Text>
        <Text style={s.cardAmount} numberOfLines={1} adjustsFontSizeToFit>{money(lts.amount)}</Text>
      </View>
      <Text style={s.why} testID="lts-why">{why}</Text>

      {(bars.length > 0 || have !== 0) && (
        <View style={s.group} testID="lts-bars">
          <GradientFill match={s.group} />
          <View style={s.bars}>
            <Bar s={s} label="You have" value={money(have)} width={Math.abs(have) / scale} color={have >= 0 ? colors.positive : colors.negative} track={colors.navy1} />
            {bars.map((b) => (
              <Bar key={b.label} s={s} label={b.label} value={`−${money(b.amount)}`} width={b.amount / scale} color={b.label === 'Plans' ? colors.planned : colors.negative} track={colors.navy1} />
            ))}
          </View>
        </View>
      )}

      <Text style={s.header}>In your accounts now</Text>
      <View style={s.group}>
        <GradientFill match={s.group} />
        {accounts.length === 0 && <Text style={[s.rowSub, { padding: 16 }]}>No accounts yet.</Text>}
        {accounts.map((a, i) => (
          <TouchableOpacity key={`${a.group}-${a.id}`} style={[s.row, i > 0 && s.line]} onPress={() => navigation.navigate('CardDetail', { group: a.group, id: a.id, backTitle: 'Left to spend' })} accessibilityRole="button">
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle} numberOfLines={1}>{a.name}</Text>
              <Text style={s.rowSub}>{a.group === 'cash' ? 'Cash' : a.group === 'debit' ? 'Debit' : 'Credit'}</Text>
            </View>
            <Text style={[s.rowAmount, { color: a.balance < 0 ? colors.negative : colors.positive }]}>{money(a.balance)}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        ))}
      </View>

      {ins.length > 0 && (
        <>
          <Text style={s.header}>Coming in before payday</Text>
          <ItemList s={s} items={ins} money={money} color={amountColor} onOpen={open} colors={colors} />
        </>
      )}

      <Text style={s.header}>Still to go out before payday</Text>
      {outs.length === 0 ? (
        <Text style={s.empty}>Nothing left to pay before payday.</Text>
      ) : (
        <ItemList s={s} items={outs} money={money} color={amountColor} onOpen={open} colors={colors} />
      )}
      <Text style={s.footer}>Debts with no due date aren't counted here. They have their own total on Debts.</Text>
    </KeyboardAwareScrollView>
  );
}

function rank(i: LeftToSpendItem): number {
  const groupRank = i.group === 'Past due' ? 0 : PLAN.has(i.group) ? 2 : 1;
  return groupRank * 1e9 + (i.date ? Number(i.date.replace(/-/g, '')) : 9e8);
}

function Bar({ s, label, value, width, color, track }: { s: any; label: string; value: string; width: number; color: string; track: string }) {
  return (
    <View style={s.barRow} testID={`lts-bar-${label}`}>
      <Text style={s.barLabel} numberOfLines={1}>{label}</Text>
      <View style={[s.barTrack, { backgroundColor: track }]}>
        <View style={[s.barFill, { width: `${Math.max(2, Math.min(100, width * 100))}%`, backgroundColor: color }]} />
      </View>
      <Text style={[s.barValue, { color }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function ItemList({ s, items, money, color, onOpen, colors }: { s: any; items: LeftToSpendItem[]; money: (n: number) => string; color: (i: LeftToSpendItem) => string; onOpen: (i: LeftToSpendItem) => void; colors: ThemeColors }) {
  return (
    <View style={s.group}>
      <GradientFill match={s.group} />
      {items.map((it, i) => (
        <TouchableOpacity key={`${it.group}-${it.name}-${it.date ?? i}-${i}`} style={[s.row, i > 0 && s.line]} onPress={() => onOpen(it)} disabled={!it.ref} accessibilityRole="button" testID={`lts-item-${i}`}>
          <View style={{ flex: 1 }}>
            <Text style={s.rowTitle} numberOfLines={1}>{it.name}</Text>
            <Text style={s.rowSub} numberOfLines={1}>{it.sub}</Text>
          </View>
          <Text style={[s.rowAmount, { color: color(it) }]}>{it.amount < 0 ? '−' : '+'}{money(Math.abs(it.amount))}</Text>
          {!!it.ref && <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} style={{ marginLeft: 6 }} />}
        </TouchableOpacity>
      ))}
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 },
    card: { borderRadius: 24, paddingHorizontal: 20, paddingVertical: 16, overflow: 'hidden' },
    cardLabel: { fontSize: 15, color: 'rgba(255,255,255,0.92)' },
    cardAmount: { fontSize: 36, fontWeight: '700', color: '#FFFFFF', marginTop: 2 },
    why: { fontSize: 15, lineHeight: 21, color: colors.ink, marginTop: 12, marginHorizontal: 4 },
    group: { backgroundColor: colors.navy3, borderRadius: 16, overflow: 'hidden', marginTop: 12 },
    bars: { paddingHorizontal: 14, paddingVertical: 10 },
    barRow: { flexDirection: 'row', alignItems: 'center', height: 24, gap: 8 },
    barLabel: { width: 76, fontSize: 13, color: colors.inkDim },
    barTrack: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
    barFill: { height: 10, borderRadius: 5 },
    barValue: { width: 92, fontSize: 13, fontWeight: '600', textAlign: 'right' },
    header: { fontSize: 13, fontWeight: '600', color: colors.inkDim, textTransform: 'uppercase', letterSpacing: 0.3, marginLeft: 16, marginTop: 24, marginBottom: -6 },
    row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: 16, paddingVertical: 10 },
    line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy1 },
    rowTitle: { fontSize: 17, fontWeight: '500', color: colors.ink },
    rowSub: { fontSize: 13, color: colors.inkDim, marginTop: 1 },
    rowAmount: { fontSize: 17, fontWeight: '600' },
    empty: { fontSize: 15, color: colors.inkDim, marginTop: 12, marginHorizontal: 16 },
    footer: { fontSize: 13, lineHeight: 18, color: colors.inkDim, marginTop: 10, marginHorizontal: 16 },
  });
}
