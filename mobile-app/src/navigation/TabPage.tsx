import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions } from 'react-native';
import { useNavigationState } from '@react-navigation/native';
import LargeHeader from './LargeHeader';

// Switching tabs slides like pages laid out left to right along the tab bar: going to a
// tab on the right, the new page slides in from the right while the old one slides out
// to the left; going left, the other way round. Tabs you skip over don't move.
//
// Each tab page moves itself (instead of leaving it to the tab navigator, whose own
// animation restarted and snapped whenever anything redrew mid-slide). The navigator
// keeps every visited tab drawn, and the pages that aren't showing simply wait just off
// the left or right edge. The tab's large title header slides with its page.

const SLIDE_MS = 320;
const SLIDE_EASING = Easing.bezier(0.22, 1, 0.36, 1); // quick start, long gentle settle

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
    const slide = () =>
      Animated.timing(x, { toValue: place, duration: SLIDE_MS, easing: SLIDE_EASING, useNativeDriver: true }).start();
    if (before === null) {
      // Opened for the first time: slide in from its side (no movement for the very
      // first tab when the app starts).
      if (place === 0) slide();
      return;
    }
    if (before === place) return;
    // Only the page leaving and the page arriving slide; any page in between jumps
    // straight to its new side without crossing the screen.
    if (before === 0 || place === 0) slide();
    else x.setValue(place);
  }, [place, routeIndex, x]);

  const translateX = x.interpolate({ inputRange: [-1, 0, 1], outputRange: [-width, 0, width] });

  return (
    <Animated.View style={[styles.page, { transform: [{ translateX }] }]}>
      {showHeader && <LargeHeader navigation={navigation} route={route} options={options} back={undefined} />}
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
});
