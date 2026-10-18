import React, { useLayoutEffect, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/AppText';
import { headerButtonText } from '../navigation/LargeHeader';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { formatPeso, accountCurrentBalance } from '../balanceProjection';
import { buildTransactionsList } from '../transactions';
import { DEFAULT_GROUP_COLORS, AccountGroup } from '../components/AccountCard';
import type { ThemeColors } from '../theme';
import type { HouseholdModel, PaymentMethod } from '../types';
import GradientFill from '../components/GradientFill';
import { cardFaceColors, CardFaceFill } from '../components/CardFace';

// Redesign: the Card page from the Finance Flow mockup, opened by tapping a card in
// Home's Wallet. Shows the card with its balance, how much was spent from it this
// week (a bar per day), and its latest transactions. "Move money" moves money
// between your accounts; "Edit card" opens Accounts.

const GROUP_LABEL: Record<AccountGroup, string> = { cash: 'Cash', debit: 'Debit', credit: 'Credit' };
const GROUP_ICON: Record<AccountGroup, React.ComponentProps<typeof Ionicons>['name']> = {
  cash: 'cash-outline',
  debit: 'card-outline',
  credit: 'card',
};
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Every transaction (id from the Transactions list) paid from this account.
export function idsForAccount(model: HouseholdModel, group: AccountGroup, accountId: string): Set<string> {
  const match = (pm?: PaymentMethod) => !!pm && pm.type === group && (group === 'cash' ? !pm.accountId || pm.accountId === accountId : pm.accountId === accountId);
  const ids = new Set<string>();
  (model.manualTransactions || []).forEach((t) => match(t.paymentMethod) && ids.add(t.id));
  [...model.bills, ...model.debts].forEach((r) => (r.cycles || []).forEach((c) => match(c.paymentMethod) && ids.add((model.bills.includes(r as any) ? 'bill-' : 'debt-') + c.id)));
  (model.loans || []).forEach((l) => (l.actualPayments || []).forEach((p) => match(p.paymentMethod) && ids.add('loan-' + p.id)));
  return ids;
}

export default function CardDetailScreen() {
  const { colors, isDark } = useTheme();
  const { model } = useData();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const group: AccountGroup = route.params?.group;
  const accountId: string = route.params?.id;
  const styles = makeStyles(colors);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: '',
      headerBackTitle: 'Home',
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate('Transfer', { fromGroup: group, fromId: accountId })} accessibilityRole="button" testID="card-move-money">
          <Text style={[headerButtonText, { color: colors.gold }]}>Move money</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, colors.gold, group, accountId]);

  const account = model?.balanceAccounts[group]?.find((a) => a.id === accountId);

  const data = useMemo(() => {
    if (!model || !account) return null;
    const ids = idsForAccount(model, group, accountId);
    const list = buildTransactionsList(model).filter((t) => ids.has(t.rawId ?? t.id) || ids.has(t.id));
    list.sort((a, b) => (a.date < b.date ? 1 : -1));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay()); // Sunday
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = iso(d);
      const v = list.filter((t) => t.date === key && t.direction !== 'in').reduce((s, t) => s + t.amount, 0);
      return { key, v, isToday: key === iso(today), future: d > today };
    });
    return { list, days, week: days.reduce((s, d) => s + d.v, 0) };
  }, [model, account, group, accountId]);

  if (!model || !account || !data) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>This card isn't here any more.</Text>
      </View>
    );
  }

  // Live balance: saved balance plus anything paid from or into it since.
  const amount = accountCurrentBalance(model, group, account);
  const chip = account.color || DEFAULT_GROUP_COLORS[group];
  const maxDay = Math.max(1, ...data.days.map((d) => d.v));

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {/* The same colour and gradient as this card in Home's Wallet. */}
      <View style={[styles.card, cardFaceColors(chip, isDark)]}>
        <CardFaceFill color={chip} radius={17} />
        <View style={styles.cardHead}>
          <View style={styles.nameRow}>
            <View style={[styles.chip, { backgroundColor: chip }]} />
            <Text style={styles.cardName} numberOfLines={1}>{account.name || GROUP_LABEL[group]}</Text>
          </View>
          <View style={[styles.typeTag, { backgroundColor: colors.navy1 }]}>
            <Ionicons name={GROUP_ICON[group]} size={11} color={colors.inkDim} />
            <Text style={styles.type}>{GROUP_LABEL[group]}</Text>
          </View>
        </View>
        <View style={{ marginTop: 'auto' }}>
          <Text style={styles.meta}>Balance</Text>
          <Text style={[styles.balance, { color: amount < 0 ? colors.negative : colors.positive }]}>{formatPeso(amount)}</Text>
        </View>
      </View>

      <View style={[styles.group, { padding: 16, marginTop: 20 }]}>
        <GradientFill match={[styles.group, { padding: 16, marginTop: 20 }]} />
        <Text style={styles.meta}>This week</Text>
        <Text style={styles.week}>{formatPeso(data.week)}</Text>
        <Text style={styles.meta}>spent from this card</Text>
        <View style={styles.bars} accessibilityLabel={`Spending each day this week: ${data.days.map((d) => Math.round(d.v)).join(', ')} pesos`}>
          {data.days.map((d, i) => (
            <View key={d.key} style={styles.barCol}>
              <View
                style={[
                  styles.bar,
                  { height: Math.max(4, (d.v / maxDay) * 56), backgroundColor: d.isToday ? colors.gold : d.future ? colors.navy1 : `${colors.gold}55` },
                ]}
              />
              <Text style={[styles.dayLetter, d.isToday && { color: colors.ink, fontWeight: '700' }]}>{DAY_LETTERS[i]}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.sectionHead}>
        <Text style={styles.header}>Latest transactions</Text>
        {data.list.length > 0 && (
          <TouchableOpacity
            onPress={() => navigation.navigate('Main', { screen: 'Transactions', params: { accountFilter: `${group}:${accountId}`, accountFilterName: account.name || GROUP_LABEL[group], filterNonce: Date.now() } })}
            accessibilityRole="button"
          >
            <Text style={styles.link}>See all</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.group}>
        <GradientFill match={styles.group} />
        {data.list.length === 0 ? (
          <Text style={[styles.meta, { padding: 16 }]}>Nothing paid from this card yet. Pick it as the account when you add a transaction.</Text>
        ) : (
          data.list.slice(0, 3).map((t, i) => {
            const color = t.direction === 'in' ? colors.positive : t.direction === 'saving' ? colors.saving : colors.negative;
            const d = new Date(t.date + 'T00:00:00');
            const diff = Math.round((new Date().setHours(0, 0, 0, 0) - d.getTime()) / 86400000);
            const when = diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.row, i > 0 && styles.line]}
                onPress={() => navigation.navigate('TransactionDetail', { id: t.id })}
                accessibilityRole="button"
              >
                <View style={[styles.tile, { backgroundColor: t.direction === 'in' ? colors.okBg : t.direction === 'saving' ? colors.warnBg : colors.errorBg }]}>
                  <Ionicons name={t.direction === 'in' ? 'arrow-down' : t.direction === 'saving' ? 'leaf-outline' : 'arrow-up'} size={17} color={color} />
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{t.label}</Text>
                  <Text style={styles.meta} numberOfLines={1}>{when} · {t.category}</Text>
                </View>
                <Text style={[styles.rowAmount, { color }]}>
                  {t.direction === 'in' ? '+' : t.direction === 'saving' ? '' : '−'}
                  {formatPeso(t.amount)}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      <TouchableOpacity style={[styles.group, styles.action]} onPress={() => navigation.navigate('Accounts', { editGroup: group, editId: accountId, nonce: Date.now() })} accessibilityRole="button">
        <GradientFill match={[styles.group, styles.action]} />
        <Text style={[styles.actionText, { color: colors.gold }]}>Edit card</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: { paddingHorizontal: 16, paddingBottom: 40 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    emptyText: { fontSize: 17, color: colors.inkDim },
    card: {
      height: 190,
      borderRadius: 18,
      padding: 18,
      borderWidth: 1,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
    chip: { width: 12, height: 12, borderRadius: 3 },
    cardName: { fontSize: 17, fontWeight: '600', color: colors.ink, flexShrink: 1 },
    typeTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
    type: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase', color: colors.inkDim },
    balance: { fontSize: 30, lineHeight: 36, fontWeight: '700' },
    group: { backgroundColor: colors.navy3, borderRadius: 12, overflow: 'hidden' },
    meta: { fontSize: 13, color: colors.inkDim },
    week: { fontSize: 22, fontWeight: '700', color: colors.ink, marginVertical: 2 },
    bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 76, marginTop: 14 },
    barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
    bar: { width: '100%', borderRadius: 6 },
    dayLetter: { fontSize: 11, color: colors.inkDim },
    sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 24, marginBottom: 6, marginHorizontal: 16 },
    header: { fontSize: 13, fontWeight: '600', color: colors.inkDim, textTransform: 'uppercase', letterSpacing: 0.3 },
    link: { fontSize: 15, fontWeight: '600', color: colors.gold },
    row: { flexDirection: 'row', alignItems: 'center', minHeight: 60, paddingHorizontal: 16, paddingVertical: 10 },
    line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    tile: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    rowTitle: { fontSize: 17, color: colors.ink },
    rowAmount: { fontSize: 17, fontWeight: '600' },
    action: { minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
    actionText: { fontSize: 17 },
  });
}
