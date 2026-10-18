import React, { useEffect, useRef, useState } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './AppText';
import { useTheme } from '../ThemeContext';

// A small "Saved" pill that fades in near the top of the screen for a moment, so a
// sheet that closes straight away (Paid, Add money, Finish trip…) still confirms it worked.
// Call showSaved('Payment saved') from anywhere; <SavedToastHost /> is mounted once in App.

type Listener = (label: string) => void;
let listener: Listener | null = null;

export function showSaved(label = 'Saved') {
  listener?.(label);
}

export function SavedToastHost() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [label, setLabel] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    listener = (text) => {
      if (timer.current) clearTimeout(timer.current);
      setLabel(text);
      opacity.stopAnimation();
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(({ finished }) => {
          if (finished) setLabel(null);
        });
      }, Math.min(4000, 1400 + Math.max(0, text.length - 12) * 45)); // longer messages stay longer
    };
    return () => {
      listener = null;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [opacity]);

  if (!label) return null;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', paddingTop: insets.top + 10 }]}>
      <Animated.View
        accessibilityLiveRegion="polite"
        accessibilityLabel={label}
        style={{
          opacity,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 22,
          maxWidth: '88%',
          backgroundColor: colors.navy3,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.navy4,
          shadowColor: '#000',
          shadowOpacity: 0.12,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <Ionicons name="checkmark-circle" size={20} color={colors.positive} />
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink, flexShrink: 1 }}>{label}</Text>
      </Animated.View>
    </View>
  );
}
