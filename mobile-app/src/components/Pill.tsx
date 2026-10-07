import React from 'react';
import { TouchableOpacity, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import { radii, spacing } from '../tokens';

type Props = {
  label: string;
  active?: boolean;
  onPress: () => void;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  // 'page' = sits on the mint page (inactive fill is white).
  // 'sheet' = sits inside a white sheet or card (inactive fill is mint).
  tone?: 'page' | 'sheet';
  // true = share the row equally with sibling pills (segmented control).
  fill?: boolean;
  // Optional minimum width so a wrapping row breaks onto a new line instead of squeezing.
  minWidth?: number;
  // true = less side padding, for rows with long labels or many options.
  compact?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

// V.4a: the one shared pill / segmented-control button.
export default function Pill({
  label,
  active = false,
  onPress,
  icon,
  tone = 'page',
  fill = false,
  minWidth,
  compact = false,
  testID,
  accessibilityLabel,
  style,
}: Props) {
  const { colors } = useTheme();
  const textColor = active ? colors.navy2 : colors.inkDim;
  const inactiveBg = tone === 'page' ? colors.navy3 : colors.navy2;
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        styles.base,
        { backgroundColor: active ? colors.gold : inactiveBg },
        fill && styles.fill,
        compact && styles.compact,
        minWidth !== undefined && { minWidth },
        style,
      ]}
    >
      {icon ? (
        <Ionicons name={icon} size={16} color={textColor} style={styles.icon} />
      ) : null}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        style={[styles.text, { color: textColor }]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: spacing[16],
    borderRadius: radii.pill,
  },
  fill: { flex: 1 },
  compact: { paddingHorizontal: spacing[8] },
  icon: { marginRight: spacing[6] },
  text: { fontSize: 13, fontWeight: '600' },
});
