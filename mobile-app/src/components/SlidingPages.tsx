import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager, LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { cancelAnimation, Easing, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import SegmentedControl from './SegmentedControl';
import { holdForSubPages, heldOnUI, SwipeTabsContext } from '../navigation/swipeTabs';
import { commitTabDrag, edgeGive, releaseTabDrag, setTabDrag } from '../navigation/tabDrag';
import { hapticSelection } from '../haptics';
import { useReduceMotion } from '../reduceMotion';
import { CURVE, SUBPAGE_MS } from '../motion';
import { dragPosition, settleTarget } from '../subPages';
import { QuietWhenHidden } from '../DataContext';
import { QuietThemeWhenHidden } from '../ThemeContext';
import { PageActiveContext, usePageActive } from '../pageActive';
import { movesQuiet } from '../quietMoves';

// Smoothness 2026-10-23 (Cath picked sample B, "follows your finger"): every page with
// sub-pages (To-Pay Bills / Debts / Loans, Savings, Groceries, Events, Travel, Loans
// Borrowed / Lent) uses this, so they all move the same way:
// - swipe sideways: the pages move with your finger, and the switcher's highlight with them;
//   let go and they settle on the nearest page (or the next one after a quarter of the
//   screen or a quick flick), with the app's usual curve and speed (src/motion.ts);
// - tap a choice in the switcher: the same slide;
// - past the first or last page: a soft bounce, never a jump to another main tab;
// - a quick flick across a swipe-to-delete row turns the page too.
// The neighbouring pages are built once the screen has settled, so they're ready to be
// dragged into view; pages that aren't showing don't redraw at full priority.

type Option<T extends string> = { id: T; label: string; testID?: string };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (id: T) => void;
  renderPage: (id: T, active: boolean) => React.ReactNode;
  accessibilityLabel?: string;
  // The row the switcher sits in (padding); the switcher's own style.
  switcherWrapStyle?: StyleProp<ViewStyle>;
  switcherStyle?: StyleProp<ViewStyle>;
  // Hide the switcher (and stop swiping), e.g. while a page shows only a form.
  hideSwitcher?: boolean;
  // Anything shown between the switcher and the pages.
  between?: React.ReactNode;
  // Pages inside a scrolling page with more below them (Travel's trip page): the pages
  // take their own height, and the height glides between them as you swipe, so what's
  // below moves smoothly instead of jumping.
  inline?: boolean;
  // On a main tab (To-Pay, Cath 2026-10-23): past the first or last page the swipe moves
  // the main tabs instead (the next tab comes in with your finger) and letting go far
  // enough goes there. Without it, the ends bounce (Savings, Groceries...).
  edgeToTabs?: { index: number; count: number; go: (direction: 1 | -1) => void };
  testID?: string;
};

const BOUNCE = 0.06; // how far a flick past the end nudges the page (of a page width)

export default function SlidingPages<T extends string>({
  options,
  value,
  onChange,
  renderPage,
  accessibilityLabel,
  switcherWrapStyle,
  switcherStyle,
  hideSwitcher,
  between,
  inline,
  edgeToTabs,
  testID,
}: Props<T>) {
  const count = options.length;
  const index = Math.max(0, options.findIndex((o) => o.id === value));
  const reduce = useReduceMotion();
  // Inside a tab that isn't showing, no page is.
  const parentShowing = usePageActive();
  const pos = useSharedValue(index);
  const startPos = useSharedValue(index);
  const ignoring = useSharedValue(false);
  const widthSV = useSharedValue(0);
  const reduceSV = useSharedValue(reduce);
  const [width, setWidth] = useState(0);
  const heights = useSharedValue<number[]>(options.map(() => 0));
  const [warm, setWarm] = useState(false);
  const visited = useRef(new Set<number>([index]));
  visited.current.add(index);
  // The page a swipe has already slid to, so the change that follows doesn't slide again.
  const slidTo = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    reduceSV.value = reduce;
  }, [reduce, reduceSV]);

  // Build the other pages once the screen has settled.
  useEffect(() => {
    // Or after 1.5 s at the latest (an endless animation can keep the app from ever
    // counting as settled; same as the main tabs).
    const h = InteractionManager.runAfterInteractions(() => setWarm(true));
    const t = setTimeout(() => setWarm(true), 1500);
    return () => {
      h.cancel();
      clearTimeout(t);
    };
  }, []);

  // A tap on the switcher, or another screen asking for a page: slide there.
  useEffect(() => {
    if (slidTo.current === index) {
      slidTo.current = null;
      return;
    }
    slidTo.current = null;
    cancelAnimation(pos);
    pos.value = reduce || movesQuiet() ? index : withTiming(index, { duration: SUBPAGE_MS, easing: Easing.bezier(...CURVE) });
  }, [index, reduce, pos]);

  const commit = useCallback((target: number) => {
    const next = optionsRef.current[target];
    if (!next) return;
    slidTo.current = target;
    hapticSelection();
    onChangeRef.current(next.id);
  }, []);
  const warmUp = useCallback(() => setWarm(true), []);

  // Past the ends on a main tab: the overflow moves the tabs (TabPage reads tabDrag).
  const edgeRef = useRef(edgeToTabs);
  edgeRef.current = edgeToTabs;
  const hasEdge = !!edgeToTabs;
  const tabsDragging = useSharedValue(false);
  // Smoothness sweep 2026-10-26: the tabs move on the animation thread, straight from the
  // finger (not via the app's JavaScript side, which can be busy).
  const edgeIndex = edgeToTabs ? edgeToTabs.index : 0;
  const edgeCount = edgeToTabs ? edgeToTabs.count : 0;
  const endTabs = useCallback((px: number, vx: number) => {
    const e = edgeRef.current;
    if (!e) return;
    const width = widthSV.value;
    const dir: 1 | -1 = px < 0 ? 1 : -1;
    const next = e.index + dir;
    const far = Math.abs(px) > width * 0.25 || (Math.abs(vx) > 600 && Math.abs(px) > 24 && Math.sign(vx) === Math.sign(px));
    if (width > 0 && far && next >= 0 && next < e.count) {
      hapticSelection();
      commitTabDrag(edgeGive(px, e.index, e.count));
      e.go(dir);
    } else {
      releaseTabDrag();
    }
  }, [widthSV]);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .withTestId(testID ? `${testID}-pan` : 'sliding-pages-pan')
        .enabled(!hideSwitcher && count > 1)
        .activeOffsetX([-12, 12])
        .failOffsetY([-12, 12])
        .onStart(() => {
          // A swipe-to-delete row or a card that swipes by itself has this touch.
          ignoring.value = heldOnUI.value;
          if (ignoring.value) return;
          cancelAnimation(pos);
          startPos.value = Math.round(pos.value);
          runOnJS(warmUp)();
        })
        .onUpdate((e) => {
          if (ignoring.value) return;
          if (hasEdge && widthSV.value > 0) {
            // Past the first or last page: the page stays at the end, the tabs move.
            const raw = startPos.value - e.translationX / widthSV.value;
            const edge = raw < 0 ? 0 : raw > count - 1 ? count - 1 : raw;
            const over = -(raw - edge) * widthSV.value;
            pos.value = edge;
            if (over !== 0 || tabsDragging.value) {
              tabsDragging.value = over !== 0;
              setTabDrag(edgeGive(over, edgeIndex, edgeCount));
            }
            return;
          }
          pos.value = dragPosition(startPos.value, e.translationX, widthSV.value, count);
        })
        .onEnd((e) => {
          if (ignoring.value) return;
          if (hasEdge && tabsDragging.value) {
            tabsDragging.value = false;
            const raw = startPos.value - e.translationX / widthSV.value;
            const edge = raw < 0 ? 0 : count - 1;
            runOnJS(endTabs)(-(raw - edge) * widthSV.value, e.velocityX);
            return;
          }
          const from = startPos.value;
          const target = settleTarget(from, e.translationX, e.velocityX, widthSV.value, count);
          pos.value = reduceSV.value ? target : withTiming(target, { duration: SUBPAGE_MS, easing: Easing.bezier(...CURVE) });
          if (target !== from) runOnJS(commit)(target);
        }),
    [count, hideSwitcher, testID, commit, warmUp, ignoring, pos, startPos, widthSV, reduceSV, hasEdge, tabsDragging, edgeIndex, edgeCount, endTabs]
  );

  // A quick flick across a swipe-to-delete row (SwipeableRow asks through this).
  const flick = useCallback(
    (dir: 1 | -1) => {
      const target = index + dir;
      if (target >= 0 && target < count) {
        commit(target);
        pos.value = reduce ? target : withTiming(target, { duration: SUBPAGE_MS, easing: Easing.bezier(...CURVE) });
        return;
      }
      if (edgeRef.current) {
        const next = edgeRef.current.index + dir;
        if (next >= 0 && next < edgeRef.current.count) {
          hapticSelection();
          edgeRef.current.go(dir);
          return;
        }
      }
      if (reduce) return;
      // Past the end: a small nudge and back.
      pos.value = withSequence(
        withTiming(index + dir * BOUNCE, { duration: SUBPAGE_MS / 2, easing: Easing.bezier(...CURVE) }),
        withTiming(index, { duration: SUBPAGE_MS, easing: Easing.bezier(...CURVE) })
      );
    },
    [index, count, commit, pos, reduce]
  );

  const stripStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -pos.value * widthSV.value }] }));
  const heightStyle = useAnimatedStyle(() => {
    if (!inline) return {};
    const hs = heights.value;
    const p = Math.max(0, Math.min(hs.length - 1, pos.value));
    const lo = Math.floor(p);
    const hi = Math.min(hs.length - 1, lo + 1);
    const a = hs[lo] || hs[hi];
    const b = hs[hi] || a;
    if (!a) return {};
    return { height: interpolate(p, [lo, lo === hi ? lo + 1 : hi], [a, b]) };
  }, [inline]);
  const measurePage = (k: number) => (e: LayoutChangeEvent) => {
    if (!inline) return;
    const h = e.nativeEvent.layout.height;
    const next = heights.value.slice();
    if (next[k] === h) return;
    next[k] = h;
    heights.value = next;
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    // Travel's page area reports its size on every frame while its height glides.
    if (w === widthSV.value) return;
    widthSV.value = w;
    setWidth(w);
  };

  const pages = options.map((opt, k) => {
    const active = k === index;
    const built = active || warm || visited.current.has(k);
    return (
      <View
        key={opt.id}
        testID={testID ? `${testID}-page-${opt.id}` : undefined}
        style={[inline ? styles.pageInline : styles.page, width > 0 && { width }]}
        onLayout={measurePage(k)}
        accessibilityElementsHidden={!active}
        importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
      >
        {built && (
          <QuietThemeWhenHidden active={active}>
            <QuietWhenHidden active={active}>
              <PageActiveContext.Provider value={active && parentShowing}>{renderPage(opt.id, active)}</PageActiveContext.Provider>
            </QuietWhenHidden>
          </QuietThemeWhenHidden>
        )}
      </View>
    );
  });

  return (
    <View style={inline ? undefined : styles.wrap} testID={testID}>
      {!hideSwitcher && (
        <View style={switcherWrapStyle}>
          <SegmentedControl<T>
            accessibilityLabel={accessibilityLabel}
            options={options}
            value={value}
            onChange={onChange}
            style={switcherStyle}
            progress={pos}
          />
        </View>
      )}
      {between}
      <SwipeTabsContext.Provider value={hideSwitcher ? null : flick}>
        <GestureDetector gesture={gesture}>
          <Reanimated.View
            testID={testID ? `${testID}-viewport` : undefined}
            style={[inline ? styles.viewportInline : styles.viewport, heightStyle]}
            onLayout={onLayout}
            {...holdForSubPages}
            collapsable={false}
          >
            {width > 0 ? (
              <Reanimated.View style={[inline ? styles.stripInline : styles.strip, { width: width * count }, stripStyle]}>{pages}</Reanimated.View>
            ) : (
              // Not measured yet (its first moment on screen): just the page that's showing.
              pages[index]
            )}
          </Reanimated.View>
        </GestureDetector>
      </SwipeTabsContext.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  viewport: { flex: 1, overflow: 'hidden' },
  strip: { flex: 1, flexDirection: 'row' },
  page: { flex: 1 },
  viewportInline: { overflow: 'hidden' },
  stripInline: { flexDirection: 'row', alignItems: 'flex-start' },
  pageInline: {},
});
