import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, Modal, useWindowDimensions } from 'react-native';
import { Text } from './AppText';
import Svg, { Path, Defs, RadialGradient, Stop, Rect, G } from 'react-native-svg';
import { LOGO_PATHS } from './LogoMark';
import { VeinedLeaf, DriftLeaf, DRIFT } from '../screens/IntroScreen';

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
  const { width } = useWindowDimensions();
  const scale = width / 390;
  const breath = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setI(0);
    // These run on the phone's animation thread, so they keep moving while the password
    // work keeps the app busy.
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
      clearInterval(timer);
    };
  }, [visible, messages.length, breath, sway, fade]);

  const logoScale = breath.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] });
  const rotate = sway.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '6deg'] });

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      {/* Version 2.1 (Cath picked L4, without the bar): the opening's colours reversed. A
          warm cream screen with the opening's drifting leaves in deep green, the logo gently
          breathing, FINANCE FLOW, a line that changes every couple of seconds, and the small
          leaf swaying near the bottom. */}
      <View style={s.wrap} accessibilityRole="progressbar" accessibilityLabel={messages[i] || 'Working'}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <RadialGradient id="busyCream" cx="50%" cy="44%" rx="60%" ry="40%" fx="50%" fy="44%">
              <Stop offset="0" stopColor="#FBF9F1" />
              <Stop offset="0.55" stopColor="#F6F3E7" />
              <Stop offset="1" stopColor="#E9E3CF" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#busyCream)" />
        </Svg>
        {DRIFT.map((leaf, n) => (
          <DriftLeaf key={n} leaf={leaf} index={n} scale={scale} still={false} color={INK} opacityScale={1.4} idPrefix="busyDrift" />
        ))}
        <View style={s.center}>
          <Animated.View style={{ transform: [{ scale: logoScale }] }}>
            <Svg width={124} height={102} viewBox="190 240 644 530" fill="none">
              {LOGO_PATHS.map((d, n) => (
                <Path key={n} d={d} stroke={INK} strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" />
              ))}
            </Svg>
          </Animated.View>
          <Text style={s.wordmark}>FINANCE FLOW</Text>
          <Animated.Text style={[s.text, { opacity: fade }]}>{messages[i] || 'Working…'}</Animated.Text>
        </View>
        <View style={s.leafSpot} pointerEvents="none">
          <Animated.View style={{ width: 19, height: 32, transform: [{ translateY: 16 }, { rotate }, { translateY: -16 }] }}>
            <Svg width={19} height={32} viewBox="-10 0 120 205">
              <G transform="rotate(14 50 100)">
                <VeinedLeaf id="busyLeaf" opacity={0.7} withStem color={INK} />
              </G>
            </Svg>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const INK = '#173829';
const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#F6F3E7', overflow: 'hidden' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60, paddingHorizontal: 32 },
  wordmark: { marginTop: 26, fontSize: 21, lineHeight: 26, fontWeight: '500', letterSpacing: 7.1, paddingLeft: 7.1, color: INK },
  text: { marginTop: 18, fontSize: 17, fontWeight: '700', textAlign: 'center', color: INK, fontFamily: 'Nunito_700Bold' },
  leafSpot: { position: 'absolute', left: 0, right: 0, bottom: 140, alignItems: 'center' },
});
