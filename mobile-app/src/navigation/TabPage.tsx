import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { useNavigationState } from '@react-navigation/native';
import LargeHeader from './LargeHeader';

// Switching tabs is a soft, minimal fade: the old tab fades out while drifting a few
// pixels away, then the new tab fades in while settling the last few pixels into place
// (from the right when you move right along the tab bar, from the left when you move
// left). The two never overlap, since pages are see-through (the leaves sit behind the
// app), and nothing slides across the screen, so there is never a half-empty screen.
//
// Each tab page moves itself (instead of leaving it to the tab navigator, whose own
// animation restarted and snapped whenever anything redrew mid-change). The navigator
// keeps every visited tab drawn; the pages that aren't showing are fully faded out.
const FADE_MS = 240;
const FADE_EASING = Easing.out(Easing.cubic); // starts at once, eases gently to a stop
const DRIFT = 14; // how far a page drifts while fading, in pixels

// The tab that was showing last, so a tab opened for the first time knows which side
// to come in from.
let lastShownIndex = 0;

type Props = {
  routeName: string;
  routeIndex: number;
  options: any;
  navigation: any;
  route: any;
  showHeader: boolean;
  children: React.ReactNode;
};

export default function TabPage({ routeIndex, options, navigation, route, showHeader, children }: Props) {
  const shownIndex = useNavigationState((s) => s.index);
  // -1 = waiting off the left edge, 0 = on screen, 1 = waiting off the right edge.
  const place = Math.sign(routeIndex - shownIndex);

  const x = useRef(
    new Animated.Value(place === 0 ? Math.sign(routeIndex - lastShownIndex) : place)
  ).current;
  const lastPlace = useRef<number | null>(null);

  useEffect(() => {
    const before = lastPlace.current;
    lastPlace.current = place;
    if (place === 0) lastShownIndex = routeIndex;
    const run = (to: number, done?: () => void) =>
      Animated.timing(x, { toValue: to, duration: FADE_MS, easing: FADE_EASING, useNativeDriver: true }).start(({ finished }) => {
        if (finished && done) done();
      });
    if (before === null) {
      // Opened for the first time: fades in from its side (no movement for the very
      // first tab when the app starts).
      if (place === 0) run(0);
      return;
    }
    if (before === place) return;
    if (place === 0) {
      // Arriving: fades in from the side it was waiting on.
      run(0);
    } else if (before === 0) {
      // Leaving: fades out toward its side and waits there.
      run(place);
    } else {
      // Skipped over: stays hidden and just moves to its new side.
      x.setValue(place);
    }
  }, [place, routeIndex, x]);

  const translateX = x.interpolate({ inputRange: [-1, 0, 1], outputRange: [-DRIFT, 0, DRIFT] });
  // Only visible in the inner half, so the old tab is gone before the new one appears.
  const opacity = x.interpolate({ inputRange: [-1, -0.5, 0, 0.5, 1], outputRange: [0, 0, 1, 0, 0] });

  return (
    // The page arriving sits on top; pages that aren't showing don't catch taps.
    <Animated.View
      pointerEvents={place === 0 ? 'auto' : 'none'}
      style={[styles.page, { zIndex: place === 0 ? 2 : 1, elevation: place === 0 ? 2 : 0, opacity, transform: [{ translateX }] }]}
    >
      {showHeader && <LargeHeader navigation={navigation} route={route} options={options} back={undefined} />}
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
});
