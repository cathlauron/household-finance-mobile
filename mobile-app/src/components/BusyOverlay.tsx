import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, Modal } from 'react-native';
import Svg, { Path, Defs, RadialGradient, Stop, Rect, G } from 'react-native-svg';
import { LOGO_PATHS } from './LogoMark';
import { VeinedLeaf } from '../screens/IntroScreen';

// Version 2.1 (Cath): slow steps (creating an account, setting up, Quick unlock, signing in)
// show this instead of a frozen-looking screen: the house-and-leaf logo gently breathing
// in a soft circle, with a calm line that moves on every couple of seconds so it's clear
// work is happening. Locking data with a password is slow on purpose (it protects the
// password), so these steps can take a few seconds on cheaper phones.

type Props = { visible: boolean; messages: string[] };

// Version 2.1 fix (Cath didn't see the animation): locking data with a password keeps the
// phone busy for a few seconds, so it must not start until this has appeared on screen.
// Call `await paintBusy()` right after showing it, before the slow work.
export function paintBusy(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 150)));
}

export default function BusyOverlay({ visible, messages }: Props) {
  const breath = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;
  const fill = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setI(0);
    // All of these run on the phone's animation thread, so they keep moving while the
    // password work keeps the app busy.
    const loops = [
      Animated.loop(
        Animated.sequence([
          Animated.timing(breath, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(breath, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(sway, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(sway, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ),
      Animated.loop(Animated.timing(fill, { toValue: 1, duration: 1800, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true })),
    ];
    loops.forEach((l) => l.start());
    const timer = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setI((n) => (n + 1 < messages.length ? n + 1 : n));
        Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: true }).start();
      });
    }, 2200);
    return () => {
      loops.forEach((l) => l.stop());
      fill.setValue(0);
      clearInterval(timer);
    };
  }, [visible, messages.length, breath, sway, fill, fade]);

  const scale = breath.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] });
  const rotate = sway.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '6deg'] });
  // The bar fills from the left, then slides off to the right, over and over.
  const barX = fill.interpolate({ inputRange: [0, 0.6, 1], outputRange: [-64, 0, 64] });

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      {/* Version 2.1 (Cath picked L5, without the box): the opening's colours reversed. The
          page stays behind under a cream veil; the deep green logo breathes, the little leaf
          sways above its bar, and the line changes every couple of seconds. */}
      <View style={s.wrap} accessibilityRole="progressbar" accessibilityLabel={messages[i] || 'Working'}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <RadialGradient id="busyVeil" cx="50%" cy="46%" rx="60%" ry="40%" fx="50%" fy="46%">
              <Stop offset="0" stopColor="#FBF9F1" stopOpacity={0.97} />
              <Stop offset="0.55" stopColor="#F6F3E7" stopOpacity={0.94} />
              <Stop offset="1" stopColor="#E9E3CF" stopOpacity={0.9} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#busyVeil)" />
        </Svg>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Svg width={96} height={79} viewBox="190 240 644 530" fill="none">
            {LOGO_PATHS.map((d, n) => (
              <Path key={n} d={d} stroke={INK} strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" />
            ))}
          </Svg>
        </Animated.View>
        <Animated.Text style={[s.text, { opacity: fade }]}>{messages[i] || 'Working…'}</Animated.Text>
        <View style={s.loader}>
          <Animated.View style={{ width: 19, height: 32, transform: [{ translateY: 16 }, { rotate }, { translateY: -16 }] }}>
            <Svg width={19} height={32} viewBox="-10 0 120 205">
              <G transform="rotate(14 50 100)">
                <VeinedLeaf id="busyLeaf" opacity={0.7} withStem color={INK} />
              </G>
            </Svg>
          </Animated.View>
          <View style={s.track}>
            <Animated.View style={[s.fill, { transform: [{ translateX: barX }] }]} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const INK = '#173829';
const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 22, paddingBottom: 72 },
  text: { fontSize: 17, fontWeight: '700', textAlign: 'center', color: INK, fontFamily: 'Nunito_700Bold' },
  loader: { alignItems: 'center', gap: 14 },
  track: { width: 64, height: 3, borderRadius: 999, backgroundColor: 'rgba(23,56,41,0.14)', overflow: 'hidden' },
  fill: { width: 64, height: '100%', borderRadius: 999, backgroundColor: INK },
});
