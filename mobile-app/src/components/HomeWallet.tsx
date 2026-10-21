import React, { useEffect, useMemo, useRef, useState } from 'react';
import { reduceMotionNow } from '../reduceMotion';
import { holdTabSwipe } from '../navigation/swipeTabs';
import { View, StyleSheet, Animated, Easing, useWindowDimensions, AppState } from 'react-native';
import { TouchableOpacity } from './Tap';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './AppText';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import type { ThemeColors } from '../theme';
import { formatPeso, totalCurrentBalance, accountCurrentBalance } from '../balanceProjection';
import { useHideAmounts } from '../hideAmounts';
import type { HouseholdModel, BalanceAccountEntry } from '../types';
import { DEFAULT_GROUP_COLORS, AccountGroup } from './AccountCard';
import { hapticMedium, hapticSelection } from '../haptics';
import GradientFill from './GradientFill';

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

// Version 2.2 (approved P4): with the phone set to remove animations, the cards move instantly.
const D = (ms: number) => (reduceMotionNow() ? 0 : ms);
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

// 2.2 speed sweep (Cath: "even the card animations is lagging"): the wallet only redraws
// when its own data changes, the moving parts of each card (slant, lift) are built once
// instead of on every redraw (rebuilding them mid-move made the cards hitch), the swipe
// and hold handlers are only rebuilt when the card order changes, and saving the new
// order waits until you've stopped flipping for a few seconds.
export default React.memo(HomeWallet);

function HomeWallet({ model }: { model: HouseholdModel }) {
  const { hidden, money } = useHideAmounts(); // version 3: the Home eye hides these too
  const { colors } = useTheme();
  const { saveModel, getModel } = useData();
  const navigation = useNavigation<any>();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const saved = useMemo(() => orderedCards(model), [model]);
  // Local order so moves feel instant; it follows the saved order when that changes.
  const [order, setOrder] = useState<string[]>(saved.map((c) => c.key));
  useEffect(() => {
    // Don't snap back to the saved order while a newer order is waiting to be saved.
    if (!pendingKeys.current) setOrder(saved.map((c) => c.key));
  }, [saved.map((c) => c.key).join('|')]);
  const cards = order.map((k) => saved.find((c) => c.key === k)).filter(Boolean) as WalletCard[];

  // Per card: an animated "top" (slides when the order changes), a sideways offset and
  // an opacity (for the smooth swipe), so each card can move on its own.
  const tops = useRef(new Map<string, Animated.Value>()).current;
  const xs = useRef(new Map<string, Animated.Value>()).current;
  const fades = useRef(new Map<string, Animated.Value>()).current;
  // Built once per card and reused, so a redraw never swaps them out mid-move.
  const slants = useRef(new Map<string, Animated.AnimatedInterpolation<string>>()).current;
  const heldYs = useRef(new Map<string, Animated.AnimatedAddition<number>>()).current;
  cards.forEach((c, i) => {
    if (!tops.has(c.key)) tops.set(c.key, new Animated.Value(i * PEEK));
    if (!xs.has(c.key)) xs.set(c.key, new Animated.Value(0));
    if (!fades.has(c.key)) fades.set(c.key, new Animated.Value(1));
  });
  const { width: screenW } = useWindowDimensions();
  const busy = useRef(false);
  const holding = useRef(false); // a card is picked up (long-press drag)
  const dragY = useRef(new Animated.Value(0)).current;
  // While held, the card rises a little out of the gap. It stays whole, but it sits
  // behind the cards in front of the gap, so mostly just its top shows: the rest
  // looks already slid in between the cards where it will land.
  const LIFT = 22;
  const liftUp = useRef(new Animated.Value(0)).current;
  // The card that was just dropped, while it settles (so its lift and slant ease out).
  const [settling, setSettling] = useState<string | null>(null);
  // The same slant as a swipe: bottom-left corner up, growing with the lift.
  const liftTilt = useMemo(() => liftUp.interpolate({ inputRange: [-LIFT, 0], outputRange: ['5deg', '0deg'], extrapolate: 'clamp' }), [liftUp]);
  cards.forEach((c) => {
    const x = xs.get(c.key) as Animated.Value;
    if (!slants.has(c.key)) slants.set(c.key, x.interpolate({ inputRange: [-400, 0, 30, 400], outputRange: ['-3deg', '0deg', '5deg', '9deg'], extrapolate: 'clamp' }));
    if (!heldYs.has(c.key)) heldYs.set(c.key, Animated.add(Animated.add(tops.get(c.key) as Animated.Value, dragY), liftUp));
  });
  const [dragging, setDragging] = useState<string | null>(null);
  const [gapAt, setGapAt] = useState<number>(-1); // where the lifted card will land
  const dragTarget = useRef<number>(-1);

  // Slides cards to their places. While dragging, `others` leaves an empty slot at
  // `gap` so you can see where the card will go.
  function slide(keys: string[], gap = -1, duration = 180) {
    return keys.map((k, i) => {
      const slot = gap >= 0 && i >= gap ? i + 1 : i;
      return Animated.timing(tops.get(k) as Animated.Value, { toValue: slot * PEEK, duration: D(duration), easing: Easing.out(Easing.cubic), useNativeDriver: true });
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

  // The new order shows straight away; saving it (which encrypts and syncs your data)
  // waits until you've stopped moving cards, so it never interrupts an animation.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingKeys = useRef<string[] | null>(null);
  const latestModel = useRef(model);
  latestModel.current = model;
  const saveRef = useRef(saveModel);
  saveRef.current = saveModel;
  const getModelRef = useRef(getModel);
  getModelRef.current = getModel;
  function flush() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    const keys = pendingKeys.current;
    pendingKeys.current = null;
    // Always on top of the newest data (anything saved meanwhile on another screen is kept).
    const base = getModelRef.current() ?? latestModel.current;
    if (keys) saveRef.current({ ...base, walletOrder: keys }).catch(() => {});
  }
  function persist(keys: string[]) {
    setOrder(keys);
    pendingKeys.current = keys;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    // Saving encrypts your data, which briefly keeps the phone busy, so it waits until
    // you've stopped flipping (and is never done while a card is moving).
    const later = () => {
      if (busy.current || holding.current) saveTimer.current = setTimeout(later, 800);
      else flush();
    };
    saveTimer.current = setTimeout(later, 3000);
  }
  // Leaving Home before the save happens still saves the order.
  useEffect(() => () => flush(), []);
  // Closing or leaving the app saves it straight away too.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st !== 'active') flush();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swipe right: the front card's bottom-left corner lifts a little (getting ready),
  // then it slides off to the right, still tilted, while the cards behind step down.
  // It comes back in from the right into the slot at the back (top), levelling out
  // so both bottom corners line up as it settles; only its top strip shows.
  // Swipe left (the undo): the card at the back lifts and slides out to the right,
  // the stack steps up, and it comes back in from the right as the new front card,
  // levelling out as it lands.
  const EASE = Easing.bezier(0.25, 0.1, 0.25, 1);
  const SETTLE = Easing.bezier(0.2, 0.8, 0.2, 1);
  function curlOff(x: Animated.Value, from: number) {
    x.setValue(from);
    return Animated.sequence([
      // the little corner lift before it goes
      Animated.timing(x, { toValue: from + 36, duration: D(110), easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(x, { toValue: screenW * 1.1, duration: D(260), easing: EASE, useNativeDriver: true }),
    ]);
  }
  function curlIn(x: Animated.Value, done: () => void) {
    x.setValue(screenW * 1.1);
    Animated.timing(x, { toValue: 0, duration: D(380), easing: SETTLE, useNativeDriver: true }).start(() => {
      x.setValue(0);
      done();
    });
  }
  function cycle(dir: 'left' | 'right', fromX = 0) {
    if (busy.current) return;
    // Version 3 (Cath): with only one card it still plays: it flies off the side you
    // swiped and comes back in, same feel as flipping through several cards.
    if (cards.length === 1) {
      busy.current = true;
      hapticSelection();
      const only = xs.get(order[0]) as Animated.Value;
      const out =
        dir === 'right'
          ? curlOff(only, fromX)
          : Animated.timing(only, { toValue: -screenW * 1.1, duration: D(300), easing: EASE, useNativeDriver: true });
      out.start(() =>
        setTimeout(
          () =>
            curlIn(only, () => {
              busy.current = false;
            }),
          40
        )
      );
      return;
    }
    if (cards.length < 2) return;
    busy.current = true;
    hapticSelection();
    const keys = [...order];
    const finish = () => {
      fades.forEach((v) => v.setValue(1));
      busy.current = false;
    };
    if (dir === 'right') {
      const front = keys.pop() as string;
      const next = [front, ...keys];
      const x = xs.get(front) as Animated.Value;
      Animated.parallel([curlOff(x, fromX), ...slide(keys, 0, 300)], { stopTogether: false }).start(() => {
        // It's off screen now: move it to the back slot, let the stack redraw so it's
        // behind the others, then bring it in from the right.
        (tops.get(front) as Animated.Value).setValue(0);
        persist(next);
        setTimeout(() => curlIn(x, finish), 40);
      });
    } else {
      const back = keys.shift() as string;
      const next = [...keys, back];
      const x = xs.get(back) as Animated.Value;
      const frontX = xs.get(order[order.length - 1]) as Animated.Value;
      Animated.parallel(
        [
          curlOff(x, 0),
          Animated.timing(frontX, { toValue: 0, duration: D(220), easing: EASE, useNativeDriver: true }),
          ...slide(keys, -1, 300),
        ],
        { stopTogether: false }
      ).start(() => {
        (tops.get(back) as Animated.Value).setValue((next.length - 1) * PEEK);
        persist(next);
        setTimeout(() => curlIn(x, finish), 40);
      });
    }
  }

  // A soft wash of each card's own colour (mixed into the card background), kept light
  // so the Left to Spend card and the + button stay the stars of the screen.
  const { isDark } = useTheme();
  // Like a real bank card: the colour deepens from the top-left corner to the
  // bottom-right, with a faint sheen across the top. Still kept soft.
  // A gentle range with in-between steps so it blends evenly (no dark edge).
  const cardShade = (hex: string, t: number) => mixHex(hex, isDark ? '#1C1C1E' : '#FFFFFF', isDark ? 0.14 + t * 0.12 : 0.06 + t * 0.1);

  const total = useMemo(() => totalCurrentBalance(model), [model]);
  const amounts = useMemo(() => {
    const m = new Map<string, number>();
    saved.forEach((c) => m.set(c.key, accountCurrentBalance(model, c.group, c.account)));
    return m;
  }, [model, saved]);
  const openAccounts = () => navigation.navigate('Accounts');
  const amountColor = (n: number) => (n < 0 && !hidden ? colors.negative : colors.positive); // hidden: no red that gives a minus away

  function gestureFor(c: WalletCard, index: number) {
    const tap = Gesture.Tap()
      .runOnJS(true)
      .maxDuration(340) // just under the 350ms hold that starts a drag
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
        else if (reduceMotionNow()) frontX.setValue(0);
        else Animated.spring(frontX, { toValue: 0, friction: 7, useNativeDriver: true }).start();
      });
    const drag = Gesture.Pan()
      .runOnJS(true)
      .activateAfterLongPress(350)
      .onStart(() => {
        holding.current = true;
        hapticMedium();
        dragY.setValue(0);
        liftUp.setValue(0);
        Animated.timing(liftUp, { toValue: -LIFT, duration: D(180), easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
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
        holding.current = false;
        const target = dragTarget.current;
        if (target < 0) return;
        const keys = order.filter((k) => k !== c.key);
        keys.splice(target, 0, c.key);
        const v = tops.get(c.key);
        // Settle the lifted card into its new slot, then save the order.
        // It drops from where you held it, levelling out as it slides into the slot.
        v?.setValue(index * PEEK + (dragY as any)._value);
        dragY.setValue(0);
        dragTarget.current = -1;
        setDragging(null);
        setGapAt(-1);
        setSettling(c.key);
        Animated.parallel([
          ...(v ? [Animated.timing(v, { toValue: target * PEEK, duration: D(200), easing: Easing.out(Easing.cubic), useNativeDriver: true })] : []),
          Animated.timing(liftUp, { toValue: 0, duration: D(200), easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]).start(() => setSettling((k) => (k === c.key ? null : k)));
        if (keys.join('|') !== order.join('|')) persist(keys);
      });
    return Gesture.Race(drag, swipe, tap);
  }
  const orderKey = order.join('|');
  const gestures = useMemo(() => {
    const m = new Map<string, ReturnType<typeof gestureFor>>();
    cards.forEach((c, i) => m.set(c.key, gestureFor(c, i)));
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderKey, cards.length, screenW]);

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        {/* "Accounts" opens the Accounts page (where accounts are added too). */}
        <TouchableOpacity onPress={openAccounts} accessibilityRole="button" accessibilityLabel="Open Accounts" testID="home-wallet-add" style={styles.headerLink}>
          <Text style={styles.header}>Accounts</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.inkDim} />
        </TouchableOpacity>
      </View>

      {cards.length === 0 ? (
        <TouchableOpacity style={styles.emptyCard} onPress={openAccounts} activeOpacity={0.7} accessibilityRole="button">
          <Ionicons name="wallet-outline" size={26} color={colors.gold} />
          <Text style={styles.emptyTitle}>Add your first account</Text>
          <Text style={styles.emptySub}>Cash, debit or credit. Left to Spend starts from these.</Text>
        </TouchableOpacity>
      ) : (
        <View {...holdTabSwipe} style={{ height: CARD_HEIGHT + PEEK * (cards.length - 1) + (dragging && gapAt < cards.length - 1 ? PEEK : 0) }}>
          {cards.map((c, i) => {
            const isFront = i === cards.length - 1;
            const lifted = dragging === c.key;
            const held = lifted || settling === c.key;
            // While dragging, the held card slots into the stack's layering at the gap:
            // above the cards behind it, below the cards in front (which hide its lower part).
            const others = dragging ? order.filter((k) => k !== dragging) : order;
            const j = others.indexOf(c.key);
            const layer = !dragging ? i : lifted ? gapAt : j >= gapAt ? j + 1 : j;
            // Live balance: saved balance plus anything paid from or into it since.
            const amount = amounts.get(c.key) ?? 0;
            const top = tops.get(c.key) as Animated.Value;
            return (
              <GestureDetector key={c.key} gesture={gestures.get(c.key) as ReturnType<typeof gestureFor>}>
                <Animated.View
                  testID={`home-wallet-card-${c.account.id}`}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={`${c.account.name || GROUP_LABEL[c.group]}, ${GROUP_LABEL[c.group]}, ${hidden ? 'amount hidden' : formatPeso(amount)}`}
                  accessibilityHint="Opens the card. Swipe the stack to change the front card; long-press to move it."
                  style={[
                    styles.card,
                    {
                      // Positions move with transforms so the phone's graphics engine animates
                      // them directly (smooth even while the app is busy).
                      top: 0,
                      zIndex: layer,
                      elevation: (lifted ? 3 : 1) + layer * 0.5,
                      // The held card itself goes slightly see-through while you move it.
                      opacity: lifted ? 0.7 : (fades.get(c.key) as Animated.Value),
                      // A faint border and a soft fill in the card's own colour.
                      borderColor: `${c.account.color || DEFAULT_GROUP_COLORS[c.group]}4D`,
                      backgroundColor: cardShade(c.account.color || DEFAULT_GROUP_COLORS[c.group], 0.5),
                      transform: [
                        { translateY: held ? (heldYs.get(c.key) as Animated.AnimatedAddition<number>) : top },
                        { translateX: xs.get(c.key) as Animated.Value },
                        // The lift: as a card moves to the right, its bottom-left corner (A)
                        // rises above its bottom-right corner (B), mostly in the first few
                        // pixels of movement. Coming back in, it levels out until A and B
                        // line up again as it settles.
                        { rotate: slants.get(c.key) as Animated.AnimatedInterpolation<string> },
                        // Held cards get the same slant, as if picked up by a corner.
                        { rotate: held ? liftTilt : '0deg' },
                      ],
                    },
                    lifted && styles.lifted,
                  ]}
                >
                  <GradientFill
                    kind="card"
                    color={c.account.color || DEFAULT_GROUP_COLORS[c.group]}
                    surface={isDark ? '#1C1C1E' : '#FFFFFF'}
                    isDark={isDark}
                    radius={15}
                  />
                  <View style={styles.cardHead}>
                    <View style={styles.nameRow}>
                      <View style={[styles.chip, { backgroundColor: c.account.color || DEFAULT_GROUP_COLORS[c.group] }]} />
                      <Text style={styles.name} numberOfLines={1}>{c.account.name || GROUP_LABEL[c.group]}</Text>
                      {/* Cards behind: the type tag sits next to the name. */}
                      {!isFront && (
                        <View style={[styles.typeTag, { backgroundColor: colors.navy1 }]}>
                          <Ionicons name={GROUP_ICON[c.group]} size={11} color={colors.inkDim} />
                          <Text style={styles.typeTagText}>{GROUP_LABEL[c.group]}</Text>
                        </View>
                      )}
                    </View>
                    {/* Front card: the type tag sits on the right, like the Card page. */}
                    {isFront && (
                      <View style={[styles.typeTag, { backgroundColor: colors.navy1 }]}>
                        <Ionicons name={GROUP_ICON[c.group]} size={11} color={colors.inkDim} />
                        <Text style={styles.typeTagText}>{GROUP_LABEL[c.group]}</Text>
                      </View>
                    )}
                    {!isFront && !lifted && <Text style={[styles.peekAmount, { color: amountColor(amount) }]}>{money(amount)}</Text>}
                  </View>
                  {isFront && (
                    <View style={[styles.front, styles.frontRow]}>
                      <View style={{ flexShrink: 1 }}>
                        <Text style={styles.frontLabel}>Balance</Text>
                        <Text style={[styles.frontAmount, { color: amountColor(amount) }]}>{money(amount)}</Text>
                      </View>
                      {/* Version 2.2 (canvas D1): last 4 digits on the same bottom line, front card only. */}
                      {!!c.account.last4 && c.group !== 'cash' && (
                        <Text style={styles.last4} accessibilityLabel={`ending in ${c.account.last4.split('').join(' ')}`}>•••• {c.account.last4}</Text>
                      )}
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
          {money(total)} across {cards.length} {cards.length === 1 ? 'account' : 'accounts'}
          {cards.length > 1 ? ' · swipe to flip through, hold to move a card' : ' · swipe to flip it'}
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
    headerLink: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
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
      // A minimal shadow, just enough to separate the cards.
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
    },
    lifted: { shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
    cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 28, gap: 8 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
    chip: { width: 10, height: 10, borderRadius: 3 },
    name: { fontSize: 15, fontWeight: '600', color: colors.ink, flexShrink: 1 },
    typeTag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
    typeTagText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase', color: colors.inkDim },
    peekAmount: { fontSize: 15, fontWeight: '600' },
    front: { marginTop: 'auto' },
    frontRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 },
    last4: { fontSize: 15, letterSpacing: 1.5, color: colors.inkDim, paddingBottom: 4 },
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
