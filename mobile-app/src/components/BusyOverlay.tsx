import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, Modal } from 'react-native';
import { Text } from './AppText';
import LogoMark from './LogoMark';
import { useTheme } from '../ThemeContext';

// Version 2.1 (Cath): slow steps (creating an account, setting up, Quick unlock, signing in)
// show this instead of a frozen-looking screen: the house-and-leaf logo gently breathing
// in a soft circle, with a calm line that moves on every couple of seconds so it's clear
// work is happening. Locking data with a password is slow on purpose (it protects the
// password), so these steps can take a few seconds on cheaper phones.

type Props = { visible: boolean; messages: string[] };

export default function BusyOverlay({ visible, messages }: Props) {
  const { colors } = useTheme();
  const breath = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setI(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    const timer = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setI((n) => (n + 1 < messages.length ? n + 1 : n));
        Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: true }).start();
      });
    }, 2200);
    return () => {
      loop.stop();
      clearInterval(timer);
    };
  }, [visible, messages.length, breath, fade]);

  const scale = breath.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] });
  const ring = breath.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] });

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={[s.wrap, { backgroundColor: colors.navy2 + 'F2' }]} accessibilityRole="progressbar" accessibilityLabel={messages[i] || 'Working'}>
        <View style={s.center}>
          <Animated.View style={[s.ring, { backgroundColor: colors.accentTint, opacity: ring, transform: [{ scale }] }]} />
          <Animated.View style={{ transform: [{ scale }] }}>
            <LogoMark width={72} />
          </Animated.View>
        </View>
        <Animated.Text style={[s.text, { color: colors.ink, opacity: fade }]}>{messages[i] || 'Working…'}</Animated.Text>
        <Text style={[s.small, { color: colors.inkDim }]}>This can take a few seconds.</Text>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  center: { width: 150, height: 150, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  ring: { position: 'absolute', width: 150, height: 150, borderRadius: 75 },
  text: { fontSize: 18, fontWeight: '700', textAlign: 'center', fontFamily: 'Nunito_700Bold' },
  small: { fontSize: 14, textAlign: 'center' },
});
