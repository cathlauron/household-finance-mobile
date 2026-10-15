import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions } from 'react-native';
import { useNavigationState } from '@react-navigation/native';
import LargeHeader from './LargeHeader';

// Switching tabs moves exactly like opening a page from Plan (Android's own page slide,
// "slide_from_right"): the new tab slides in from the right when you move right along
// the tab bar (from the left when you move left) while the old one slides fully out the
// other way, both over 400ms with an even ease in and out. Pages are see-through (the
// leaves sit behind the app), so the old page moves fully away rather than staying
// underneath. Tabs you skip over don't move.
//
// Each tab page moves itself (instead of leaving it to the tab navigator, whose own
// animation restarted and snapped whenever anything redrew mid-slide). The navigator
// keeps every visited tab drawn, and the pages that aren't showing wait just off the
// left or right edge. The tab's large title header moves with its page.
const SLIDE_MS = 400; // Android's config_mediumAnimTime, used by the page slide
const SLIDE_EASING = Easing.inOut(Easing.sin); // Android's default accelerate-decelerate curve

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
  const { width } = useWindowDimensions();
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
      Animated.timing(x, { toValue: to, duration: SLIDE_MS, easing: SLIDE_EASING, useNativeDriver: true }).start(({ finished }) => {
        if (finished && done) done();
      });
    if (before === null) {
      // Opened for the first time: slide in from its side (no movement for the very
      // first tab when the app starts).
      if (place === 0) run(0);
      return;
    }
    if (before === place) return;
    if (place === 0) {
      // Arriving: slides in fully from the side it was waiting on.
      run(0);
    } else if (before === 0) {
      // Leaving: slides fully out on its side and waits there.
      run(place);
    } else {
      // Skipped over: jumps straight to its new side without crossing the screen.
      x.setValue(place);
    }
  }, [place, routeIndex, x]);

  const translateX = x.interpolate({ inputRange: [-1, 0, 1], outputRange: [-width, 0, width] });

  return (
    // The page arriving sits on top; pages that aren't showing don't catch taps.
    <Animated.View
      pointerEvents={place === 0 ? 'auto' : 'none'}
      style={[styles.page, { zIndex: place === 0 ? 2 : 1, elevation: place === 0 ? 2 : 0, transform: [{ translateX }] }]}
    >
      {showHeader && <LargeHeader navigation={navigation} route={route} options={options} back={undefined} />}
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
});
