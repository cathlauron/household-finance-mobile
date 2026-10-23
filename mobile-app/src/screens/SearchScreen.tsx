import React, { useEffect, useMemo, useRef, useState } from 'react';
import { dateText } from '../dateUtils';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { View, ScrollView, StyleSheet, Animated, Easing, BackHandler, useWindowDimensions } from 'react-native';
import { reduceMotionNow } from '../reduceMotion';
import { TouchableOpacity } from '../components/Tap';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, TextInput } from '../components/AppText';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { formatPeso } from '../balanceProjection';
import { buildTransactionsList, TransactionEntry } from '../transactions';
import { accountLabel } from '../transactionActions';
import type { ThemeColors } from '../theme';
import GradientFill from '../components/GradientFill';

// Redesign: Search, from the Finance Flow mockup. Type to find transactions by name,
// category or note; narrow with the period, account and amount chips. Matching
// categories show first (tap one to see them all), then matching transactions with a
// count and total. Your last few searches are remembered on this phone.

const RECENT_KEY = 'recentSearches';
type Period = 'month' | 'all';
type AmountFilter = 'any' | 'over1000' | 'under500';
const AMOUNT_LABEL: Record<AmountFilter, string> = { any: 'Any amount', over1000: 'Over ₱1,000', under500: 'Under ₱500' };
const NEXT_AMOUNT: Record<AmountFilter, AmountFilter> = { any: 'over1000', over1000: 'under500', under500: 'any' };

function shortDate(date: string): string {
  const d = new Date(date + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return dateText(d);
}

export default function SearchScreen() {
  const { colors } = useTheme();
  const { model } = useData();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors);

  const [query, setQuery] = useState('');
  const [period, setPeriod] = useState<Period>('month');
  const [accountIdx, setAccountIdx] = useState(-1); // -1 = any account
  const [amount, setAmount] = useState<AmountFilter>('any');
  const [recent, setRecent] = useState<string[]>([]);

  // Search drops down from the top of the screen (over Transactions) and slides back up
  // when you close it, like pulling down to search on an iPhone.
  const { height } = useWindowDimensions();
  const drop = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);
  useEffect(() => {
    Animated.timing(drop, { toValue: 1, duration: reduceMotionNow() ? 0 : 300, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true }).start();
  }, [drop]);
  function close() {
    if (closingRef.current) return;
    closingRef.current = true;
    Animated.timing(drop, { toValue: 0, duration: reduceMotionNow() ? 0 : 200, easing: Easing.bezier(0.23, 1, 0.32, 1), useNativeDriver: true }).start(() => navigation.goBack());
  }
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY)
      .then((v) => setRecent(v ? JSON.parse(v) : []))
      .catch(() => {});
  }, []);

  function remember(q: string) {
    const t = q.trim();
    if (!t) return;
    const next = [t, ...recent.filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(0, 6);
    setRecent(next);
    AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
  }

  const accounts = useMemo(() => {
    if (!model) return [] as { key: string; label: string }[];
    return [
      ...model.balanceAccounts.cash.map((a) => ({ key: `cash:${a.id}`, label: a.name || 'Cash' })),
      ...model.balanceAccounts.debit.map((a) => ({ key: `debit:${a.id}`, label: a.name || 'Debit' })),
      ...model.balanceAccounts.credit.map((a) => ({ key: `credit:${a.id}`, label: a.name || 'Credit card' })),
    ];
  }, [model]);

  const { categories, results, total } = useMemo(() => {
    if (!model) return { categories: [] as { name: string; count: number }[], results: [] as TransactionEntry[], total: 0 };
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const q = query.trim().toLowerCase();
    const manual = new Map((model.manualTransactions || []).map((m) => [m.id, m]));
    const acct = accountIdx >= 0 ? accounts[accountIdx] : null;
    let list = buildTransactionsList(model).filter((t) => period === 'all' || t.date.startsWith(ym));
    if (acct) {
      list = list.filter((t) => {
        const pm = t.rawId ? manual.get(t.rawId)?.paymentMethod : undefined;
        return pm ? `${pm.type}:${pm.accountId}` === acct.key : false;
      });
    }
    if (amount === 'over1000') list = list.filter((t) => t.amount > 1000);
    if (amount === 'under500') list = list.filter((t) => t.amount < 500);
    const catCount = new Map<string, number>();
    list.forEach((t) => catCount.set(t.category, (catCount.get(t.category) ?? 0) + 1));
    const hits = q
      ? list.filter((t) => {
          const note = t.rawId ? manual.get(t.rawId)?.notes ?? '' : '';
          return t.label.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || note.toLowerCase().includes(q);
        })
      : [];
    hits.sort((a, b) => (a.date < b.date ? 1 : -1));
    const cats = q
      ? [...catCount.entries()].filter(([name]) => name.toLowerCase().includes(q)).map(([name, count]) => ({ name, count }))
      : [];
    const sum = hits.reduce((s, t) => s + (t.direction === 'in' ? t.amount : -t.amount), 0);
    return { categories: cats, results: hits, total: sum };
  }, [model, query, period, accountIdx, amount, accounts]);

  const searching = query.trim().length > 0;
  const shown = results.slice(0, 50);

  return (
    <Animated.View
      style={[
        styles.container,
        { paddingTop: insets.top + 8, backgroundColor: colors.navy2 },
        { transform: [{ translateY: drop.interpolate({ inputRange: [0, 1], outputRange: [-height, 0] }) }] },
      ]}
    >
      <View style={styles.bar}>
        <View style={styles.field}>
          <Ionicons name="search" size={18} color={colors.inkDim} />
          <TextInput
            testID="search-input"
            autoFocus
            style={styles.input}
            placeholder="Search transactions"
            placeholderTextColor={colors.inkFaint}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => remember(query)}
            returnKeyType="search"
            autoCorrect={false}
          />
          {!!query && (
            <TouchableOpacity onPress={() => setQuery('')} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={colors.inkFaint} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={close} accessibilityRole="button">
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.chips}>
        <TouchableOpacity style={[styles.chip, period === 'month' && styles.chipOn]} onPress={() => setPeriod(period === 'month' ? 'all' : 'month')}>
          <GradientFill match={[styles.chip, period === 'month' && styles.chipOn]} />
          <Text style={[styles.chipText, period === 'month' && styles.chipTextOn]}>{period === 'month' ? 'This month' : 'All time'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, accountIdx >= 0 && styles.chipOn]}
          onPress={() => setAccountIdx(accounts.length ? (accountIdx + 2) % (accounts.length + 1) - 1 : -1)}
        >
          <GradientFill match={[styles.chip, accountIdx >= 0 && styles.chipOn]} />
          <Text style={[styles.chipText, accountIdx >= 0 && styles.chipTextOn]} numberOfLines={1}>
            {accountIdx >= 0 ? accounts[accountIdx]?.label : 'Any account'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.chip, amount !== 'any' && styles.chipOn]} onPress={() => setAmount(NEXT_AMOUNT[amount])}>
          <GradientFill match={[styles.chip, amount !== 'any' && styles.chipOn]} />
          <Text style={[styles.chipText, amount !== 'any' && styles.chipTextOn]}>{AMOUNT_LABEL[amount]}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView pageBounce keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        {searching && categories.length > 0 && (
          <>
            <Text style={styles.header}>Categories</Text>
            <View style={styles.group}>
              <GradientFill match={styles.group} />
              {categories.map((c, i) => (
                <TouchableOpacity
                  key={c.name}
                  style={[styles.row, i > 0 && styles.line]}
                  onPress={() => {
                    remember(query);
                    const now = new Date();
                    navigation.navigate('Main', {
                      screen: 'Transactions',
                      params: {
                        categoryFilter: c.name,
                        monthFilter: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
                        filterNonce: Date.now(),
                      },
                    });
                  }}
                >
                  <View style={styles.tile}>
                    <GradientFill match={styles.tile} />
                    <Ionicons name="pricetag-outline" size={17} color={colors.gold} />
                  </View>
                  <Text style={styles.rowTitle}>{c.name}</Text>
                  <Text style={styles.rowMeta}>{c.count} {period === 'month' ? 'this month' : 'in all'}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {searching && (
          <>
            <Text style={styles.header}>Transactions</Text>
            {shown.length === 0 ? (
              <Text style={styles.empty}>No matches.</Text>
            ) : (
              <View style={styles.group}>
                <GradientFill match={styles.group} />
                {shown.map((t, i) => {
                  const raw = t.rawId ? (model?.manualTransactions || []).find((m) => m.id === t.rawId) : undefined;
                  const acct = raw && model ? accountLabel(model, raw.paymentMethod) : null;
                  const color = t.direction === 'in' ? colors.positive : t.direction === 'saving' ? colors.saving : colors.negative;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.row, i > 0 && styles.line]}
                      onPress={() => {
                        remember(query);
                        navigation.navigate('TransactionDetail', { id: t.id });
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle} numberOfLines={1}>{t.label}</Text>
                        <Text style={styles.rowSub} numberOfLines={1}>
                          {[shortDate(t.date), t.category, acct, t.owner === 'shared' ? 'shared' : null].filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                      <Text style={[styles.amount, { color }]}>
                        {t.direction === 'in' ? '+' : t.direction === 'saving' ? '' : '−'}
                        {formatPeso(t.amount)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            {results.length > 0 && (
              <Text style={styles.footer}>
                {shown.length} of {results.length} · total {total < 0 ? '−' : '+'}
                {formatPeso(Math.abs(total))}
              </Text>
            )}
          </>
        )}

        {!searching && recent.length > 0 && (
          <>
            <Text style={styles.header}>Recent searches</Text>
            <View style={styles.group}>
              <GradientFill match={styles.group} />
              {recent.map((r, i) => (
                <TouchableOpacity key={r} style={[styles.row, i > 0 && styles.line]} onPress={() => setQuery(r)}>
                  <Ionicons name="time-outline" size={18} color={colors.inkDim} style={{ marginRight: 12 }} />
                  <Text style={styles.rowTitle}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </KeyboardAwareScrollView>
    </Animated.View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    bar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
    field: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.navy1, borderRadius: 12, paddingHorizontal: 12, minHeight: 40 },
    input: { flex: 1, fontSize: 17, color: colors.ink, paddingVertical: 8 },
    cancel: { fontSize: 17, color: colors.gold },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
    chip: { minHeight: 34, paddingHorizontal: 12, borderRadius: 999, backgroundColor: colors.navy3, justifyContent: 'center', maxWidth: 180 },
    chipOn: { backgroundColor: colors.accentTint },
    chipText: { fontSize: 15, fontWeight: '500', color: colors.ink },
    chipTextOn: { color: colors.gold, fontWeight: '600' },
    content: { paddingHorizontal: 16, paddingBottom: 40 },
    header: { fontSize: 13, fontWeight: '600', color: colors.inkDim, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 20, marginBottom: 6, marginLeft: 16 },
    group: { backgroundColor: colors.navy3, borderRadius: 12, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: 16, paddingVertical: 10 },
    line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    tile: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    rowTitle: { fontSize: 17, color: colors.ink, flexShrink: 1 },
    rowSub: { fontSize: 13, color: colors.inkDim, marginTop: 1 },
    rowMeta: { fontSize: 15, color: colors.inkDim, marginLeft: 'auto', marginRight: 4 },
    amount: { fontSize: 17, fontWeight: '600', marginLeft: 8 },
    empty: { fontSize: 15, color: colors.inkDim, textAlign: 'center', marginTop: 8 },
    footer: { fontSize: 13, color: colors.inkDim, marginTop: 6, marginHorizontal: 16 },
  });
}
