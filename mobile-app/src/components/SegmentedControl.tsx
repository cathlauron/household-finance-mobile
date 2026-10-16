import React from 'react';
import { View, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Text } from './AppText';
import { useTheme } from '../ThemeContext';
import { hapticSelection } from '../haptics';
import GradientFill from './GradientFill';

// Redesign: iPhone-style segmented control (a grey track with the chosen option on a
// raised white piece), as used in the Finance Flow mockups for Bills / Debts / Loans
// and similar switchers.

type Option<T extends string> = { id: T; label: string; testID?: string };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (id: T) => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export default function SegmentedControl<T extends string>({ options, value, onChange, accessibilityLabel, style }: Props<T>) {
  const { colors, isDark } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[styles.track, { backgroundColor: isDark ? colors.navy1 : '#E3E3E8' }, style]}
    >
      {options.map((opt) => {
        const on = opt.id === value;
        return (
          <TouchableOpacity
            key={opt.id}
            testID={opt.testID}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            activeOpacity={0.7}
            onPress={() => {
              if (!on) {
                hapticSelection();
                onChange(opt.id);
              }
            }}
            style={[styles.segment, on && [styles.segmentOn, { backgroundColor: isDark ? '#636366' : colors.navy3 }]]}
          >
            <GradientFill match={[styles.segment, on && [styles.segmentOn, { backgroundColor: isDark ? '#636366' : colors.navy3 }]]} />
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={[styles.label, { color: colors.ink, fontWeight: on ? '600' : '500' }]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: 12, padding: 3, gap: 2 },
  segment: { flex: 1, minHeight: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  segmentOn: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  label: { fontSize: 15 },
});
