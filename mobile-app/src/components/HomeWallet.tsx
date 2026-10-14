import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Easing, useWindowDimensions } from 'react-native';
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
//  - Swipe right to bring the next card forward; swipe left to bring the last one back.
//  - Long-press a card to pick it up and drag it up or down. The other cards part to
//    open a gap, with a dashed outline showing exactly where it will land; let go to
//    drop it in.
//  - Each card has a faint border in its own colour.
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

// Blends a colour into a background colour (amount 0..1 of the colour), giving a solid
// result so cards underneath never show through.
function mixHex(hex: string, base: string, amount: number): string {
  const p = (h: string) => {
    const v = h.replace('#', '');
    const full = v.length === 3 ? v.split('').map((x) => x + x).join('') : v.slice(0, 6);
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  };
  const a = p(hex);
  const b = p(base);
  if (a.some(isNaN) || b.some(isNaN)) return base;
  return '#' + a.map((v, i) => Math.round(v * amount + b[i] * (1 - amount)).toString(16).padStart(2, '0')).join('');
}

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

  // Per card: an animated "top" (slides when the order changes), a sideways offset and
  // an opacity (for the smooth swipe), so each card can move on its own.
  const tops = useRef(new Map<string, Animated.Value>()).current;
  const xs = useRef(new Map<string, Animated.Value>()).current;
  const fades = useRef(new Map<string, Animated.Value>()).current;
  cards.forEach((c, i) => {
    if (!tops.has(c.key)) tops.set(c.key, new Animated.Value(i * PEEK));
    if (!xs.has(c.key)) xs.set(c.key, new Animated.Value(0));
    if (!fades.has(c.key)) fades.set(c.key, new Animated.Value(1));
  });
  const { width: screenW } = useWindowDimensions();
  const busy = useRef(false);
  const dragY = useRef(new Animated.Value(0)).current;
  const swipeX = useRef(new Animated.Value(0)).current;
  const [dragging, setDragging] = useState<string | null>(null);
  const [gapAt, setGapAt] = useState<number>(-1); // where the lifted card will land
  const dragTarget = useRef<number>(-1);

  // Slides cards to their places. While dragging, `others` leaves an empty slot at
  // `gap` so you can see where the card will go.
  function slide(keys: string[], gap = -1, duration = 180) {
    return keys.map((k, i) => {
      const slot = gap >= 0 && i >= gap ? i + 1 : i;
      return Animated.timing(tops.get(k) as Animated.Value, { toValue: slot * PEEK, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    });
  }
  function layout(keys: string[], gap = -1) {
    Animated.parallel(slide(keys, gap)).start();
  }
  useEffect(() => {
    if (!dragging) layout(order);
  }, [order.join('|'), dragging]);
  // Safety net: once things settle, make sure no card is left faded out or pushed aside.
  useEffect(() => {
    const t = setTimeout(() => {
      if (busy.current || dragging) return;
      fades.forEach((v) => v.setValue(1));
      xs.forEach((v) => v.setValue(0));
    }, 700);
    return () => clearTimeout(t);
  }, [order.join('|'), dragging]);

  function persist(keys: string[]) {
    setOrder(keys);
    saveModel({ ...model, walletOrder: keys }).catch(() => {});
  }

  // Swipe right: the front card glides off to the right while the cards behind move
  // down a step; it then fades back in at the back of the stack.
  // Swipe left: the card at the back fades away, the others move up a step, and it
  // glides in from the left as the new front card.
  const EASE = Easing.bezier(0.25, 0.1, 0.25, 1);
  function cycle(dir: 'left' | 'right', fromX = 0) {
    if (cards.length < 2 || busy.current) return;
    busy.current = true;
    hapticSelection();
    const keys = [...order];
    if (dir === 'right') {
      const front = keys.pop() as string;
      const next = [front, ...keys];
      const x = xs.get(front) as Animated.Value;
      const f = fades.get(front) as Animated.Value;
      x.setValue(fromX);
      Animated.parallel([
        Animated.timing(x, { toValue: screenW, duration: 260, easing: EASE, useNativeDriver: false }),
        Animated.timing(f, { toValue: 0, duration: 260, easing: EASE, useNativeDriver: false }),
        ...slide(keys, 0, 280),
      ], { stopTogether: false }).start(() => {
        // Tuck it in behind the stack while it's invisible, then let the re-ordered
        // stack draw (so it's already behind the others) before it fades back in —
        // that way only its top strip ever shows, sliding down into place.
        (tops.get(front) as Animated.Value).setValue(-12);
        x.setValue(0);
        persist(next);
        // The fade runs on its own (not grouped with the slide) so nothing else that
        // moves the cards can stop it halfway and leave the card invisible.
        setTimeout(() => {
          Animated.timing(tops.get(front) as Animated.Value, { toValue: 0, duration: 260, easing: EASE, useNativeDriver: false }).start();
          Animated.timing(f, { toValue: 1, duration: 240, easing: EASE, useNativeDriver: false }).start(() => {
            f.setValue(1);
            busy.current = false;
          });
        }, 60);
      });
    } else {
      const back = keys.shift() as string;
      const next = [...keys, back];
      const x = xs.get(back) as Animated.Value;
      const f = fades.get(back) as Animated.Value;
      const frontX = xs.get(order[order.length - 1]) as Animated.Value;
      Animated.parallel([
        Animated.timing(f, { toValue: 0, duration: 160, easing: EASE, useNativeDriver: false }),
        Animated.timing(frontX, { toValue: 0, duration: 200, easing: EASE, useNativeDriver: false }),
        ...slide(keys, -1, 260),
      ], { stopTogether: false }).start(() => {
        (tops.get(back) as Animated.Value).setValue((next.length - 1) * PEEK);
        x.setValue(-screenW * 0.6);
        persist(next);
        Animated.timing(x, { toValue: 0, duration: 280, easing: EASE, useNativeDriver: false }).start(() => x.setValue(0));
        Animated.timing(f, { toValue: 1, duration: 240, easing: EASE, useNativeDriver: false }).start(() => {
          f.setValue(1);
          busy.current = false;
        });
      });
    }
  }

  // A soft wash of each card's own colour (mixed into the card background), kept light
  // so the Left to Spend card and the + button stay the stars of the screen.
  const { isDark } = useTheme();
  const cardFill = (hex: string) => mixHex(hex, isDark ? '#1C1C1E' : '#FFFFFF', isDark ? 0.2 : 0.1);

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
      // The front card follows your finger, then finishes the move smoothly.
      .onUpdate((e) => {
        if (!busy.current) (xs.get(order[order.length - 1]) as Animated.Value).setValue(e.translationX * 0.8);
      })
      .onEnd((e) => {
        const frontX = xs.get(order[order.length - 1]) as Animated.Value;
        if (Math.abs(e.translationX) > 50 || Math.abs(e.velocityX) > 500) cycle(e.translationX < 0 ? 'left' : 'right', e.translationX * 0.8);
        else Animated.spring(frontX, { toValue: 0, friction: 7, useNativeDriver: false }).start();
      });
    const drag = Gesture.Pan()
      .runOnJS(true)
      .activateAfterLongPress(350)
      .onStart(() => {
        hapticMedium();
        dragY.setValue(0);
        dragTarget.current = index;
        setDragging(c.key);
        setGapAt(index);
        layout(order.filter((k) => k !== c.key), index);
      })
      .onUpdate((e) => {
        dragY.setValue(e.translationY);
        const target = Math.max(0, Math.min(cards.length - 1, Math.round((index * PEEK + e.translationY) / PEEK)));
        if (target !== dragTarget.current) {
          dragTarget.current = target;
          hapticSelection();
          setGapAt(target);
          layout(order.filter((k) => k !== c.key), target);
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
        setGapAt(-1);
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
        <View style={{ height: CARD_HEIGHT + PEEK * (cards.length - 1) + (dragging && gapAt < cards.length - 1 ? PEEK : 0) }}>
          {/* Where the lifted card will land: a dashed outline in the gap. */}
          {dragging && gapAt >= 0 && (
            <View
              pointerEvents="none"
              style={[
                styles.slot,
                {
                  top: gapAt * PEEK,
                  height: gapAt === cards.length - 1 ? CARD_HEIGHT : PEEK - 6,
                  borderColor: colors.gold,
                  backgroundColor: colors.accentTint,
                },
              ]}
            >
              {/* A faint preview of the held card's bottom (its balance), since that's
                  the part that slides into the gap first. */}
              {(() => {
                const held = cards.find((x) => x.key === dragging);
                if (!held) return null;
                const amt = typeof held.account.amount === 'number' ? held.account.amount : 0;
                return (
                  <View style={styles.ghost}>
                    <Text style={styles.ghostLabel}>Balance</Text>
                    <Text style={[styles.ghostAmount, { color: amountColor(amt) }]}>{formatPeso(amt)}</Text>
                  </View>
                );
              })()}
            </View>
          )}
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
                      opacity: lifted ? 0.92 : (fades.get(c.key) as Animated.Value),
                      // A faint border and a soft fill in the card's own colour.
                      borderColor: `${c.account.color || DEFAULT_GROUP_COLORS[c.group]}4D`,
                      backgroundColor: cardFill(c.account.color || DEFAULT_GROUP_COLORS[c.group]),
                      transform: [
                        { translateX: xs.get(c.key) as Animated.Value },
                        { rotate: (xs.get(c.key) as Animated.Value).interpolate({ inputRange: [-400, 0, 400], outputRange: ['-6deg', '0deg', '6deg'] }) },
                        { scale: lifted ? 0.94 : 1 },
                      ],
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
      borderWidth: 1,
      borderColor: colors.navy4,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: -1 },
    },
    slot: { position: 'absolute', left: 6, right: 6, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', opacity: 0.85, justifyContent: 'flex-end', paddingHorizontal: 14, paddingBottom: 8, overflow: 'hidden' },
    ghost: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', opacity: 0.55 },
    ghostLabel: { fontSize: 13, color: colors.inkDim },
    ghostAmount: { fontSize: 20, fontWeight: '700' },
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
