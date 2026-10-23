import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager, LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { cancelAnimation, Easing, runOnJS, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import SegmentedControl from './SegmentedControl';
import { holdForSubPages, heldOnUI, SwipeTabsContext } from '../navigation/swipeTabs';
import { hapticSelection } from '../haptics';
import { useReduceMotion } from '../reduceMotion';
import { CURVE, SUBPAGE_MS } from '../motion';
import { dragPosition, settleTarget } from '../subPages';
import { QuietWhenHidden } from '../DataContext';
import { QuietThemeWhenHidden } from '../ThemeContext';
import { PageActiveContext } from '../pageActive';

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
  testID,
}: Props<T>) {
  const count = options.length;
  const index = Math.max(0, options.findIndex((o) => o.id === value));
  const reduce = useReduceMotion();
  const pos = useSharedValue(index);
  const startPos = useSharedValue(index);
  const ignoring = useSharedValue(false);
  const widthSV = useSharedValue(0);
  const reduceSV = useSharedValue(reduce);
  const [width, setWidth] = useState(0);
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
    const h = InteractionManager.runAfterInteractions(() => setWarm(true));
    return () => h.cancel();
  }, []);

  // A tap on the switcher, or another screen asking for a page: slide there.
  useEffect(() => {
    if (slidTo.current === index) {
      slidTo.current = null;
      return;
    }
    slidTo.current = null;
    cancelAnimation(pos);
    pos.value = reduce ? index : withTiming(index, { duration: SUBPAGE_MS, easing: Easing.bezier(...CURVE) });
  }, [index, reduce, pos]);

  const commit = useCallback((target: number) => {
    const next = optionsRef.current[target];
    if (!next) return;
    slidTo.current = target;
    hapticSelection();
    onChangeRef.current(next.id);
  }, []);
  const warmUp = useCallback(() => setWarm(true), []);

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
          pos.value = dragPosition(startPos.value, e.translationX, widthSV.value, count);
        })
        .onEnd((e) => {
          if (ignoring.value) return;
          const from = startPos.value;
          const target = settleTarget(from, e.translationX, e.velocityX, widthSV.value, count);
          pos.value = reduceSV.value ? target : withTiming(target, { duration: SUBPAGE_MS, easing: Easing.bezier(...CURVE) });
          if (target !== from) runOnJS(commit)(target);
        }),
    [count, hideSwitcher, testID, commit, warmUp, ignoring, pos, startPos, widthSV, reduceSV]
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

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
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
        style={[styles.page, width > 0 && { width }]}
        accessibilityElementsHidden={!active}
        importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
      >
        {built && (
          <QuietThemeWhenHidden active={active}>
            <QuietWhenHidden active={active}>
              <PageActiveContext.Provider value={active}>{renderPage(opt.id, active)}</PageActiveContext.Provider>
            </QuietWhenHidden>
          </QuietThemeWhenHidden>
        )}
      </View>
    );
  });

  return (
    <View style={styles.wrap} testID={testID}>
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
          <View testID={testID ? `${testID}-viewport` : undefined} style={styles.viewport} onLayout={onLayout} {...holdForSubPages} collapsable={false}>
            {width > 0 ? (
              <Reanimated.View style={[styles.strip, { width: width * count }, stripStyle]}>{pages}</Reanimated.View>
            ) : (
              // Not measured yet (its first moment on screen): just the page that's showing.
              pages[index]
            )}
          </View>
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
});
