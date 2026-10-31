import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './AppText';
import { TouchableOpacity } from './Tap';
import { useTheme } from '../ThemeContext';
import { ColorMode, darkHoursText } from '../dayNight';
import { skyPlaceNow } from '../sky';
import { CURVE, FADE_IN_MS } from '../motion';
import { reduceMotionNow } from '../reduceMotion';
import { hapticSelection } from '../haptics';

// Home's moon button opens this small menu (Cath, 2026-10-31, mockup D1): Light, Dark,
// Day & night (with tonight's dark hours) and Match my phone. Picking one changes the
// look at once (tapping stays instant). It drops from the button's corner.

export const THEME_CHOICES: { mode: ColorMode; label: string; sub: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { mode: 'light', label: 'Light', sub: 'Always light', icon: 'sunny-outline' },
  { mode: 'dark', label: 'Dark', sub: 'Always dark', icon: 'moon-outline' },
  { mode: 'auto', label: 'Day & night', sub: '', icon: 'contrast-outline' },
  { mode: 'device', label: 'Match my phone', sub: "Follows your phone's setting", icon: 'phone-portrait-outline' },
];

export function themeChoiceSub(mode: ColorMode): string {
  if (mode !== 'auto') return THEME_CHOICES.find((c) => c.mode === mode)?.sub ?? '';
  const p = skyPlaceNow();
  return darkHoursText(new Date(), p?.lat, p?.lon);
}

export default function ThemeMenu({ open, top, onClose }: { open: boolean; top: number; onClose: () => void }) {
  const { colors, mode, setMode } = useTheme();
  const show = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!open) return;
    if (reduceMotionNow()) {
      show.setValue(1);
      return;
    }
    show.setValue(0);
    Animated.timing(show, { toValue: 1, duration: FADE_IN_MS, easing: Easing.bezier(...CURVE), useNativeDriver: true }).start();
  }, [open, show]);

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close menu" accessibilityRole="button" />
      <Animated.View
        accessibilityRole="menu"
        style={[
          s.card,
          {
            top,
            backgroundColor: colors.navy3,
            opacity: show,
            transform: [{ scale: show.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
          },
        ]}
      >
        {THEME_CHOICES.map((c, i) => {
          const on = mode === c.mode;
          return (
            <TouchableOpacity
              key={c.mode}
              testID={`theme-menu-${c.mode}`}
              accessibilityRole="menuitem"
              accessibilityState={{ selected: on }}
              onPress={() => {
                hapticSelection();
                setMode(c.mode);
                onClose();
              }}
              style={[s.row, on && { backgroundColor: colors.accentTint }, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 }]}
            >
              <View style={[s.tile, { backgroundColor: colors.accentTint }]}>
                <Ionicons name={c.icon} size={18} color={colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, color: colors.ink }}>{c.label}</Text>
                <Text style={{ fontSize: 13, color: colors.inkDim }}>{themeChoiceSub(c.mode)}</Text>
              </View>
              {on && <Ionicons name="checkmark" size={20} color={colors.gold} />}
            </TouchableOpacity>
          );
        })}
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  card: {
    position: 'absolute',
    right: 16,
    width: 280,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 16, paddingVertical: 8 },
  tile: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
