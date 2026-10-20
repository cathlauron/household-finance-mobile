import { holdTabSwipe } from '../navigation/swipeTabs';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { View, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './AppText';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';

// Redesign (Finance Flow "offline" mockup): a small strip under the page title while the
// phone has no internet. Everything keeps working; changes are saved on the phone and
// sent to the cloud by themselves once the connection is back (see DataContext).
// Version 2.1 (canvas S6): swipe the banner away and it shrinks to a small cloud icon in
// the top bar (OfflineCloud); tap the icon to see the banner again. It comes back by
// itself the next time the phone goes offline.
let hidden = false;
const hiddenListeners = new Set<(h: boolean) => void>();
function setHidden(h: boolean) {
  hidden = h;
  hiddenListeners.forEach((l) => l(h));
}
function useBannerHidden(): boolean {
  const [h, setH] = useState(hidden);
  useEffect(() => {
    hiddenListeners.add(setH);
    setH(hidden);
    return () => {
      hiddenListeners.delete(setH);
    };
  }, []);
  return h;
}

export function OfflineCloud() {
  const { colors } = useTheme();
  const { isOnline } = useData();
  const isHidden = useBannerHidden();
  if (isOnline || !isHidden) return null;
  return (
    <TouchableOpacity onPress={() => setHidden(false)} accessibilityRole="button" accessibilityLabel="You are offline. Show details" hitSlop={8} style={[styles.cloud, { backgroundColor: colors.indigoBg }]}>
      <Ionicons name="cloud-offline-outline" size={18} color={colors.indigo} />
    </TouchableOpacity>
  );
}

export default function OfflineBanner({ style }: { style?: any }) {
  const { colors } = useTheme();
  const { isOnline, pendingChanges } = useData();
  const isHidden = useBannerHidden();
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (isOnline) setHidden(false); // next time it goes offline, show the banner again
    x.setValue(0);
  }, [isOnline, isHidden, x]);
  // Version 2.2 (Cath: the swipe often went to the next tab instead): the banner's swipe
  // uses the same gesture system as the swipe-between-tabs, and starts sooner (8 px
  // sideways instead of 24), so it wins whenever the swipe starts on the banner.
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetX([-8, 8])
        .failOffsetY([-16, 16])
        .onUpdate((e) => x.setValue(e.translationX))
        .onEnd((e) => {
          if (Math.abs(e.translationX) > 80 || Math.abs(e.velocityX) > 700) {
            Animated.timing(x, { toValue: e.translationX > 0 ? 500 : -500, duration: 180, useNativeDriver: true }).start(() => setHidden(true));
          } else {
            Animated.spring(x, { toValue: 0, useNativeDriver: true }).start();
          }
        })
        .onFinalize((_e, success) => {
          if (!success) Animated.spring(x, { toValue: 0, useNativeDriver: true }).start();
        }),
    [x]
  );
  if (isOnline || isHidden) return null;
  const detail =
    pendingChanges > 0
      ? `Keep going. ${pendingChanges} ${pendingChanges === 1 ? 'change is' : 'changes are'} saved on this phone and will sync.`
      : 'Keep going. Changes are saved on this phone and will sync.';
  return (
    <GestureDetector gesture={pan}>
    <Animated.View
      {...holdTabSwipe}
      style={[styles.wrap, { backgroundColor: colors.indigoBg, borderColor: colors.indigo + '33', transform: [{ translateX: x }] }, style]}
      accessibilityRole="alert"
      accessibilityLabel={`You are offline. ${detail}`}
    >
      <Ionicons name="cloud-offline-outline" size={20} color={colors.indigo} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: colors.ink }]}>You are offline</Text>
        <Text style={[styles.detail, { color: colors.inkDim }]}>{detail}</Text>
      </View>
    </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  title: { fontSize: 15, fontWeight: '600' },
  detail: { fontSize: 13, lineHeight: 18 },
  cloud: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
