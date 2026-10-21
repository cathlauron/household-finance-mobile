import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { reduceMotionNow } from '../reduceMotion';
import { holdTabSwipe } from '../navigation/swipeTabs';
import { setHomeScrollLocked, scrollHomeBy } from '../homeScrollLock';
import { View, StyleSheet, useWindowDimensions, AppState } from 'react-native';
import Reanimated, { Easing, Extrapolation, interpolate, SharedValue, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { runOnJS } from 'react-native-worklets';
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

// Version 2.2 (Cath: "go for the card drag"): the cards now move on the phone's graphics
// side (react-native-reanimated). Your finger moving a card, a card flying off and back,
// the stack stepping up or down and a held card lifting all run there, so they keep up
// with your finger even while the app is busy. The app itself is only told about the
// moments that matter (a card picked up, the gap moving, a card dropped, a flip done).
// Each card gets fixed "slots" of moving values from a pool, set up once.
const POOL = 40; // more than anyone's accounts
const EASE = Easing.bezier(0.25, 0.1, 0.25, 1);
const SETTLE = Easing.bezier(0.2, 0.8, 0.2, 1);
const OUT_CUBIC = Easing.out(Easing.cubic);
const LIFT = 22;

function usePool(init: number): SharedValue<number>[] {
  const out: SharedValue<number>[] = [];
  // Always the same number of values, so this is a fixed set of hooks.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  for (let i = 0; i < POOL; i++) out.push(useSharedValue(init));
  return out;
}

export default React.memo(HomeWallet);

function HomeWallet({ model }: { model: HouseholdModel }) {
  const { hidden, money } = useHideAmounts(); // version 3: the Home eye hides these too
  const { colors, isDark } = useTheme();
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
  const orderKey = order.join('|');
  const { width: screenW, height: screenH } = useWindowDimensions();

  // ---- the moving values ----
  const tops = usePool(0); // each card's place in the stack (slides when the order changes)
  const xs = usePool(0); // sideways (the swipe)
  const dragY = useSharedValue(0); // the held card following your finger
  const liftUp = useSharedValue(0); // the held card rising a little
  const heldSlot = useSharedValue(-1); // which card is held (or settling after a drop)
  const frontSlot = useSharedValue(0);
  const busySV = useSharedValue(0);
  const dragTargetSV = useSharedValue(-1);
  // How far Home has scrolled while a card is held near the top or bottom (the held card
  // moves by the same amount, so it stays under your finger).
  const scrollComp = useSharedValue(0);
  const edgeSV = useSharedValue(0);
  const slots = useRef(new Map<string, number>()).current;
  const slotOf = (k: string) => {
    let s = slots.get(k);
    if (s === undefined) {
      const used = new Set(slots.values());
      s = 0;
      while (used.has(s) && s < POOL - 1) s++;
      slots.set(k, s);
    }
    return s;
  };
  // New cards start in their place (no slide in when Home opens).
  const placed = useRef(new Set<string>()).current;
  useLayoutEffect(() => {
    order.forEach((k, i) => {
      if (placed.has(k)) return;
      placed.add(k);
      tops[slotOf(k)].value = i * PEEK;
      xs[slotOf(k)].value = 0;
    });
    frontSlot.value = order.length ? slotOf(order[order.length - 1]) : 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderKey]);

  const busy = useRef(false);
  const holding = useRef(false); // a card is picked up (long-press drag)
  const setBusy = (b: boolean) => {
    busy.current = b;
    busySV.value = b ? 1 : 0;
  };

  const [settling, setSettling] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [gapAt, setGapAt] = useState<number>(-1); // where the lifted card will land

  // Slides cards to their places. While dragging, it leaves an empty slot at `gap` so
  // you can see where the card will go.
  function layout(keys: string[], gap = -1, duration = 180) {
    keys.forEach((k, i) => {
      const slot = gap >= 0 && i >= gap ? i + 1 : i;
      tops[slotOf(k)].value = withTiming(slot * PEEK, { duration: D(duration), easing: OUT_CUBIC });
    });
  }
  useEffect(() => {
    if (!dragging) layout(order);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderKey, dragging]);
  // Safety net: once things settle, make sure no card is left pushed aside.
  useEffect(() => {
    const t = setTimeout(() => {
      if (busy.current || dragging) return;
      order.forEach((k) => {
        xs[slotOf(k)].value = 0;
      });
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderKey, dragging]);

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

  // Swipe right: the front card's bottom-left corner lifts a little, then it slides off to
  // the right while the cards behind step down. It comes back in from the right into the
  // slot at the back, levelling out. Swipe left (the undo): the card at the back slides
  // out and comes back in as the new front card.
  function curlOff(x: SharedValue<number>, from: number, then: () => void) {
    x.value = withSequence(
      withTiming(from + 36, { duration: D(110), easing: Easing.out(Easing.quad) }),
      withTiming(screenW * 1.1, { duration: D(260), easing: EASE }, (finished) => {
        if (finished) runOnJS(then)();
      })
    );
  }
  function curlIn(x: SharedValue<number>, then: () => void) {
    x.value = screenW * 1.1;
    x.value = withTiming(0, { duration: D(380), easing: SETTLE }, (finished) => {
      if (finished) runOnJS(then)();
    });
  }
  function cycle(dir: 'left' | 'right', fromX = 0) {
    if (busy.current) return;
    if (cards.length === 1) {
      // Version 3 (Cath): with only one card it still plays: off the side you swiped and back.
      setBusy(true);
      hapticSelection();
      const only = xs[slotOf(order[0])];
      const back = () => setTimeout(() => curlIn(only, () => setBusy(false)), 40);
      if (dir === 'right') curlOff(only, fromX, back);
      else
        only.value = withTiming(-screenW * 1.1, { duration: D(300), easing: EASE }, (finished) => {
          if (finished) runOnJS(back)();
        });
      return;
    }
    if (cards.length < 2) return;
    setBusy(true);
    hapticSelection();
    const keys = [...order];
    const finish = () => setBusy(false);
    if (dir === 'right') {
      const front = keys.pop() as string;
      const next = [front, ...keys];
      const x = xs[slotOf(front)];
      layout(keys, 0, 300);
      curlOff(x, fromX, () => {
        // It's off screen now: move it to the back slot, let the stack redraw so it's
        // behind the others, then bring it in from the right.
        tops[slotOf(front)].value = 0;
        persist(next);
        setTimeout(() => curlIn(x, finish), 40);
      });
    } else {
      const back = keys.shift() as string;
      const next = [...keys, back];
      const x = xs[slotOf(back)];
      xs[slotOf(order[order.length - 1])].value = withTiming(0, { duration: D(220), easing: EASE });
      layout(keys, -1, 300);
      curlOff(x, 0, () => {
        tops[slotOf(back)].value = (next.length - 1) * PEEK;
        persist(next);
        setTimeout(() => curlIn(x, finish), 40);
      });
    }
  }

  // The app-side steps of a hold (called from the gesture running on the graphics side).
  const cycleRef = useRef(cycle);
  cycleRef.current = cycle;
  const onCycle = useCallback((dir: 'left' | 'right', fromX: number) => cycleRef.current(dir, fromX), []);
  const dragStartRef = useRef((_k: string, _i: number) => {});
  dragStartRef.current = (k: string, index: number) => {
    holding.current = true;
    heldInfo.current = { key: k, index, count: order.length };
    setHomeScrollLocked(true);
    hapticMedium();
    setDragging(k);
    setGapAt(index);
    layout(order.filter((x) => x !== k), index);
  };
  const onDragStart = useCallback((k: string, i: number) => dragStartRef.current(k, i), []);
  // Near the top or bottom edge: scroll Home along, a little every frame.
  const heldInfo = useRef<{ key: string; index: number; count: number } | null>(null);
  const edgeTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopEdge = () => {
    if (edgeTimer.current) clearInterval(edgeTimer.current);
    edgeTimer.current = null;
  };
  const onEdge = useCallback((edge: number) => {
    stopEdge();
    if (!edge) return;
    edgeTimer.current = setInterval(() => {
      const h = heldInfo.current;
      if (!h) return stopEdge();
      const moved = scrollHomeBy(edge * 9);
      if (!moved) return;
      scrollComp.value = scrollComp.value + moved;
      const target = Math.max(0, Math.min(h.count - 1, Math.round((h.index * PEEK + dragY.value + scrollComp.value) / PEEK)));
      if (target !== dragTargetSV.value) {
        dragTargetSV.value = target;
        dragMoveRef.current(h.key, target);
      }
    }, 16);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => () => stopEdge(), []);
  const dragMoveRef = useRef((_k: string, _t: number) => {});
  dragMoveRef.current = (k: string, target: number) => {
    hapticSelection();
    setGapAt(target);
    layout(order.filter((x) => x !== k), target);
  };
  const onDragMove = useCallback((k: string, t: number) => dragMoveRef.current(k, t), []);
  const dragEndRef = useRef((_k: string, _i: number, _t: number, _y: number) => {});
  dragEndRef.current = (k: string, index: number, target: number, y: number) => {
    holding.current = false;
    heldInfo.current = null;
    stopEdge();
    setHomeScrollLocked(false);
    const keys = order.filter((x) => x !== k);
    keys.splice(target, 0, k);
    const slot = slotOf(k);
    // It drops from where you held it, levelling out as it slides into its slot.
    tops[slot].value = index * PEEK + y;
    dragY.value = 0;
    scrollComp.value = 0;
    setDragging(null);
    setGapAt(-1);
    setSettling(k);
    tops[slot].value = withTiming(target * PEEK, { duration: D(200), easing: OUT_CUBIC });
    liftUp.value = withTiming(0, { duration: D(200), easing: OUT_CUBIC }, (finished) => {
      if (finished) runOnJS(settled)(k);
    });
    if (keys.join('|') !== order.join('|')) persist(keys);
  };
  const settled = useCallback((k: string) => {
    heldSlot.value = -1;
    setSettling((s) => (s === k ? null : s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const onDragEnd = useCallback((k: string, i: number, t: number, y: number) => dragEndRef.current(k, i, t, y), []);
  const openCard = useCallback((group: AccountGroup, id: string) => navigation.navigate('CardDetail', { group, id }), [navigation]);

  // Gestures: built once per card order. The moving parts run on the graphics side.
  const gestures = useMemo(() => {
    const m = new Map<string, ReturnType<typeof Gesture.Race>>();
    const count = cards.length;
    const edgeBottom = screenH - 170; // above the tab bar
    cards.forEach((c, index) => {
      const slot = slotOf(c.key);
      const key = c.key;
      const tap = Gesture.Tap()
        .maxDuration(340) // just under the 350ms hold that starts a drag
        .onEnd((_e, ok) => {
          if (ok) runOnJS(openCard)(c.group, c.account.id);
        });
      const swipe = Gesture.Pan()
        .activeOffsetX([-18, 18])
        .failOffsetY([-12, 12])
        // The front card follows your finger, then finishes the move smoothly.
        .onUpdate((e) => {
          if (busySV.value === 0) xs[frontSlot.value].value = e.translationX * 0.8;
        })
        .onEnd((e) => {
          if (Math.abs(e.translationX) > 50 || Math.abs(e.velocityX) > 500) {
            runOnJS(onCycle)(e.translationX < 0 ? 'left' : 'right', e.translationX * 0.8);
          } else if (busySV.value === 0) {
            xs[frontSlot.value].value = withSpring(0, { damping: 16, stiffness: 220 });
          }
        });
      const drag = Gesture.Pan()
        .activateAfterLongPress(350)
        .onStart(() => {
          dragY.value = 0;
          scrollComp.value = 0;
          edgeSV.value = 0;
          liftUp.value = 0;
          liftUp.value = withTiming(-LIFT, { duration: 180, easing: OUT_CUBIC });
          heldSlot.value = slot;
          dragTargetSV.value = index;
          runOnJS(onDragStart)(key, index);
        })
        .onUpdate((e) => {
          dragY.value = e.translationY;
          const edge = e.absoluteY < 150 ? -1 : e.absoluteY > edgeBottom ? 1 : 0;
          if (edge !== edgeSV.value) {
            edgeSV.value = edge;
            runOnJS(onEdge)(edge);
          }
          const target = Math.max(0, Math.min(count - 1, Math.round((index * PEEK + e.translationY + scrollComp.value) / PEEK)));
          if (target !== dragTargetSV.value) {
            dragTargetSV.value = target;
            runOnJS(onDragMove)(key, target);
          }
        })
        .onFinalize(() => {
          const target = dragTargetSV.value;
          if (target < 0) return;
          dragTargetSV.value = -1;
          edgeSV.value = 0;
          runOnJS(onDragEnd)(key, index, target, dragY.value + scrollComp.value);
        });
      m.set(key, Gesture.Race(drag, swipe, tap));
    });
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderKey, screenW, screenH]);

  // A soft wash of each card's own colour (mixed into the card background), kept light
  // so the Left to Spend card and the + button stay the stars of the screen.
  const cardShade = (hex: string, t: number) => mixHex(hex, isDark ? '#1C1C1E' : '#FFFFFF', isDark ? 0.14 + t * 0.12 : 0.06 + t * 0.1);

  const total = useMemo(() => totalCurrentBalance(model), [model]);
  const amounts = useMemo(() => {
    const m = new Map<string, number>();
    saved.forEach((c) => m.set(c.key, accountCurrentBalance(model, c.group, c.account)));
    return m;
  }, [model, saved]);
  const openAccounts = () => navigation.navigate('Accounts');
  const amountColor = (n: number) => (n < 0 && !hidden ? colors.negative : colors.positive); // hidden: no red that gives a minus away

  // Cath: a held card stays in front of everything on Home (Due soon, Insights too), the
  // way it already did over Left to Spend.
  const raised = !!(dragging || settling);
  return (
    <View style={[styles.section, raised && { zIndex: 50, elevation: 50 }]}>
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
            // While dragging, the held card slots into the stack's layering at the gap:
            // above the cards behind it, below the cards in front (which hide its lower part).
            const others = dragging ? order.filter((k) => k !== dragging) : order;
            const j = others.indexOf(c.key);
            const layer = !dragging ? i : lifted ? gapAt : j >= gapAt ? j + 1 : j;
            // Live balance: saved balance plus anything paid from or into it since.
            const amount = amounts.get(c.key) ?? 0;
            const tint = c.account.color || DEFAULT_GROUP_COLORS[c.group];
            return (
              <GestureDetector key={c.key} gesture={gestures.get(c.key) as ReturnType<typeof Gesture.Race>}>
                <MovingCard
                  slot={slotOf(c.key)}
                  tops={tops}
                  xs={xs}
                  dragY={dragY}
                  scrollComp={scrollComp}
                  liftUp={liftUp}
                  heldSlot={heldSlot}
                  lifted={lifted}
                  testID={`home-wallet-card-${c.account.id}`}
                  accessibilityLabel={`${c.account.name || GROUP_LABEL[c.group]}, ${GROUP_LABEL[c.group]}, ${hidden ? 'amount hidden' : formatPeso(amount)}`}
                  style={[
                    styles.card,
                    {
                      zIndex: layer,
                      elevation: (lifted ? 3 : 1) + layer * 0.5,
                      // A faint border and a soft fill in the card's own colour.
                      borderColor: `${tint}4D`,
                      backgroundColor: cardShade(tint, 0.5),
                    },
                    lifted && styles.lifted,
                  ]}
                >
                  <GradientFill kind="card" color={tint} surface={isDark ? '#1C1C1E' : '#FFFFFF'} isDark={isDark} radius={15} />
                  <View style={styles.cardHead}>
                    <View style={styles.nameRow}>
                      <View style={[styles.chip, { backgroundColor: tint }]} />
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
                </MovingCard>
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

// One card's position, worked out on the graphics side every frame.
function MovingCard({
  slot,
  tops,
  xs,
  dragY,
  scrollComp,
  liftUp,
  heldSlot,
  lifted,
  style,
  children,
  testID,
  accessibilityLabel,
}: {
  slot: number;
  tops: SharedValue<number>[];
  xs: SharedValue<number>[];
  dragY: SharedValue<number>;
  scrollComp: SharedValue<number>;
  liftUp: SharedValue<number>;
  heldSlot: SharedValue<number>;
  lifted: boolean;
  style: any;
  children: React.ReactNode;
  testID?: string;
  accessibilityLabel?: string;
}) {
  const top = tops[slot];
  const x = xs[slot];
  const moving = useAnimatedStyle(() => {
    const held = heldSlot.value === slot;
    // The lift: as a card moves to the right, its bottom-left corner rises above its
    // bottom-right corner, mostly in the first few pixels. Held cards get the same slant.
    const slant = interpolate(x.value, [-400, 0, 30, 400], [-3, 0, 5, 9], Extrapolation.CLAMP);
    const tilt = held ? interpolate(liftUp.value, [-LIFT, 0], [5, 0], Extrapolation.CLAMP) : 0;
    return {
      transform: [
        { translateY: held ? top.value + dragY.value + scrollComp.value + liftUp.value : top.value },
        { translateX: x.value },
        { rotate: `${slant}deg` },
        { rotate: `${tilt}deg` },
      ] as const,
    } as any;
  });
  return (
    <Reanimated.View
      testID={testID}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Opens the card. Swipe the stack to change the front card; long-press to move it."
      // The held card itself goes slightly see-through while you move it.
      style={[style, { top: 0, opacity: lifted ? 0.7 : 1 }, moving]}
    >
      {children}
    </Reanimated.View>
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
