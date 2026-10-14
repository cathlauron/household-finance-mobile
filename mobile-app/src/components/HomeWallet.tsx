import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './AppText';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import type { ThemeColors } from '../theme';
import { formatPeso, totalLiquidBalance } from '../balanceProjection';
import type { HouseholdModel, BalanceAccountEntry } from '../types';
import { DEFAULT_GROUP_COLORS, AccountGroup } from './AccountCard';
import { hapticMedium, hapticSelection } from '../haptics';

// Redesign: the Wallet on Home, an interactive card stack like Apple Wallet.
//  - Every card shows its name, a CASH / DEBIT / CREDIT tag and its balance.
//    The front (bottom) card shows the balance large.
//  - Swipe the stack left or right to bring the next or previous card to the front.
//  - Long-press a card to pick it up, drag it up or down, and let go where you
//    want it; the other cards slide out of the way.
//  - Tap a card to open its page.
// The order is saved with your household data (walletOrder), so it stays put.

const PEEK = 52; // how much of each card behind the front one shows
const CARD_HEIGHT = 176;
const GROUP_LABEL: Record<AccountGroup, string> = { cash: 'Cash', debit: 'Debit', credit: 'Credit' };
const GROUP_ICON: Record<AccountGroup, React.ComponentProps<typeof Ionicons>['name']> = {
  cash: 'cash-outline',
  debit: 'card-outline',
  credit: 'card',
};

type WalletCard = { key: string; account: BalanceAccountEntry; group: AccountGroup };

function orderedCards(model: HouseholdModel): WalletCard[] {
  const all: WalletCard[] = (['cash', 'credit', 'debit'] as AccountGroup[]).flatMap((group) =>
    (model.balanceAccounts[group] || []).map((account) => ({ key: `${group}:${account.id}`, account, group }))
  );
  const order = model.walletOrder || [];
  const rank = (k: string) => {
    const i = order.indexOf(k);
    return i < 0 ? order.length + all.findIndex((c) => c.key === k) : i;
  };
  return [...all].sort((a, b) => rank(a.key) - rank(b.key));
}

export default function HomeWallet({ model }: { model: HouseholdModel }) {
  const { colors } = useTheme();
  const { saveModel } = useData();
  const navigation = useNavigation<any>();
  const styles = makeStyles(colors);

  const saved = useMemo(() => orderedCards(model), [model]);
  // Local order so moves feel instant; it follows the saved order when that changes.
  const [order, setOrder] = useState<string[]>(saved.map((c) => c.key));
  useEffect(() => setOrder(saved.map((c) => c.key)), [saved.map((c) => c.key).join('|')]);
  const cards = order.map((k) => saved.find((c) => c.key === k)).filter(Boolean) as WalletCard[];

  // One animated "top" per card, so cards slide when the order changes.
  const tops = useRef(new Map<string, Animated.Value>()).current;
  cards.forEach((c, i) => {
    if (!tops.has(c.key)) tops.set(c.key, new Animated.Value(i * PEEK));
  });
  const dragY = useRef(new Animated.Value(0)).current;
  const swipeX = useRef(new Animated.Value(0)).current;
  const [dragging, setDragging] = useState<string | null>(null);
  const dragTarget = useRef<number>(-1);

  function layout(keys: string[], skip?: string) {
    keys.forEach((k, i) => {
      if (k === skip) return;
      const v = tops.get(k);
      if (v) Animated.timing(v, { toValue: i * PEEK, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
    });
  }
  useEffect(() => {
    if (!dragging) layout(order);
  }, [order.join('|'), dragging]);

  function persist(keys: string[]) {
    setOrder(keys);
    saveModel({ ...model, walletOrder: keys }).catch(() => {});
  }

  // Swipe: left sends the front card to the back; right brings the back card forward.
  function cycle(dir: 'left' | 'right') {
    if (cards.length < 2) return;
    hapticSelection();
    const keys = [...order];
    if (dir === 'left') keys.unshift(keys.pop() as string);
    else keys.push(keys.shift() as string);
    Animated.timing(swipeX, { toValue: dir === 'left' ? -60 : 60, duration: 120, useNativeDriver: false }).start(() => {
      swipeX.setValue(0);
      persist(keys);
    });
  }

  const total = totalLiquidBalance(model);
  const openAccounts = () => navigation.navigate('Accounts');
  const amountColor = (n: number) => (n < 0 ? colors.negative : colors.positive);

  function gestureFor(c: WalletCard, index: number) {
    const tap = Gesture.Tap()
      .runOnJS(true)
      .maxDuration(300)
      .onEnd((_e, ok) => {
        if (ok) navigation.navigate('CardDetail', { group: c.group, id: c.account.id });
      });
    const swipe = Gesture.Pan()
      .runOnJS(true)
      .activeOffsetX([-18, 18])
      .failOffsetY([-12, 12])
      .onUpdate((e) => swipeX.setValue(e.translationX * 0.4))
      .onEnd((e) => {
        if (Math.abs(e.translationX) > 50 || Math.abs(e.velocityX) > 500) cycle(e.translationX < 0 ? 'left' : 'right');
        else Animated.spring(swipeX, { toValue: 0, useNativeDriver: false }).start();
      });
    const drag = Gesture.Pan()
      .runOnJS(true)
      .activateAfterLongPress(350)
      .onStart(() => {
        hapticMedium();
        dragY.setValue(0);
        dragTarget.current = index;
        setDragging(c.key);
      })
      .onUpdate((e) => {
        dragY.setValue(e.translationY);
        const target = Math.max(0, Math.min(cards.length - 1, Math.round((index * PEEK + e.translationY) / PEEK)));
        if (target !== dragTarget.current) {
          dragTarget.current = target;
          hapticSelection();
          const keys = order.filter((k) => k !== c.key);
          keys.splice(target, 0, c.key);
          layout(keys, c.key);
        }
      })
      .onFinalize(() => {
        const target = dragTarget.current;
        if (target < 0) return;
        const keys = order.filter((k) => k !== c.key);
        keys.splice(target, 0, c.key);
        const v = tops.get(c.key);
        // Settle the lifted card into its new slot, then save the order.
        v?.setValue(index * PEEK + (dragY as any)._value);
        dragY.setValue(0);
        dragTarget.current = -1;
        setDragging(null);
        if (v) Animated.timing(v, { toValue: target * PEEK, duration: 160, useNativeDriver: false }).start();
        if (keys.join('|') !== order.join('|')) persist(keys);
      });
    return Gesture.Race(drag, swipe, tap);
  }

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Wallet</Text>
        <TouchableOpacity onPress={openAccounts} accessibilityRole="button" accessibilityLabel="Add card" testID="home-wallet-add">
          <Text style={styles.link}>Add card</Text>
        </TouchableOpacity>
      </View>

      {cards.length === 0 ? (
        <TouchableOpacity style={styles.emptyCard} onPress={openAccounts} activeOpacity={0.7} accessibilityRole="button">
          <Ionicons name="wallet-outline" size={26} color={colors.gold} />
          <Text style={styles.emptyTitle}>Add your first account</Text>
          <Text style={styles.emptySub}>Cash, debit or credit. Left to Spend starts from these.</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ height: CARD_HEIGHT + PEEK * (cards.length - 1) }}>
          {cards.map((c, i) => {
            const isFront = i === cards.length - 1;
            const lifted = dragging === c.key;
            const amount = typeof c.account.amount === 'number' ? c.account.amount : 0;
            const top = tops.get(c.key) as Animated.Value;
            return (
              <GestureDetector key={c.key} gesture={gestureFor(c, i)}>
                <Animated.View
                  testID={`home-wallet-card-${c.account.id}`}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={`${c.account.name || GROUP_LABEL[c.group]}, ${GROUP_LABEL[c.group]}, ${formatPeso(amount)}`}
                  accessibilityHint="Opens the card. Swipe the stack to change the front card; long-press to move it."
                  style={[
                    styles.card,
                    {
                      top: lifted ? Animated.add(top, dragY) : top,
                      zIndex: lifted ? 100 : i,
                      elevation: lifted ? 12 : 2 + i,
                      transform: [{ translateX: isFront && !dragging ? swipeX : 0 }, { scale: lifted ? 1.03 : 1 }],
                    },
                    lifted && styles.lifted,
                  ]}
                >
                  <View style={styles.cardHead}>
                    <View style={styles.nameRow}>
                      <View style={[styles.chip, { backgroundColor: c.account.color || DEFAULT_GROUP_COLORS[c.group] }]} />
                      <Text style={styles.name} numberOfLines={1}>{c.account.name || GROUP_LABEL[c.group]}</Text>
                      <View style={[styles.typeTag, { backgroundColor: colors.navy1 }]}>
                        <Ionicons name={GROUP_ICON[c.group]} size={11} color={colors.inkDim} />
                        <Text style={styles.typeTagText}>{GROUP_LABEL[c.group]}</Text>
                      </View>
                    </View>
                    {!isFront && <Text style={[styles.peekAmount, { color: amountColor(amount) }]}>{formatPeso(amount)}</Text>}
                  </View>
                  {isFront && (
                    <View style={styles.front}>
                      <Text style={styles.frontLabel}>Balance</Text>
                      <Text style={[styles.frontAmount, { color: amountColor(amount) }]}>{formatPeso(amount)}</Text>
                    </View>
                  )}
                </Animated.View>
              </GestureDetector>
            );
          })}
        </View>
      )}

      {cards.length > 0 && (
        <Text style={styles.footer}>
          {formatPeso(total)} across {cards.length} {cards.length === 1 ? 'account' : 'accounts'}
          {cards.length > 1 ? ' · swipe to flip through, hold to move a card' : ''}
        </Text>
      )}
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    section: { marginBottom: 24 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 4, marginBottom: 8 },
    header: { fontSize: 20, fontWeight: '700', color: colors.ink },
    link: { fontSize: 15, fontWeight: '600', color: colors.gold, paddingVertical: 4 },
    card: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: CARD_HEIGHT,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.navy3,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.navy4,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: -1 },
    },
    lifted: { shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } },
    cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 28, gap: 8 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
    chip: { width: 10, height: 10, borderRadius: 3 },
    name: { fontSize: 15, fontWeight: '600', color: colors.ink, flexShrink: 1 },
    typeTag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
    typeTagText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase', color: colors.inkDim },
    peekAmount: { fontSize: 15, fontWeight: '600' },
    front: { marginTop: 'auto' },
    frontLabel: { fontSize: 13, color: colors.inkDim },
    frontAmount: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
    footer: { fontSize: 13, color: colors.inkDim, marginTop: 8, paddingHorizontal: 4 },
    emptyCard: {
      borderRadius: 16,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.navy4,
      paddingVertical: 24,
      paddingHorizontal: 16,
      alignItems: 'center',
      gap: 6,
    },
    emptyTitle: { fontSize: 17, fontWeight: '600', color: colors.ink },
    emptySub: { fontSize: 13, color: colors.inkDim, textAlign: 'center' },
  });
}
