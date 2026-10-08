import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../ThemeContext';
import { radii, spacing } from '../tokens';
import { hapticLight, hapticMedium } from '../haptics';

type Props = {
  label: string;
  onPress: () => void;
  // primary = filled green (Save). destructive = red text link (Delete). quiet = grey text link (Cancel).
  // solidDanger = solid red block (final confirm of a destructive action).
  // outlineDanger = red outlined block (opens a destructive action).
  // secondary = grey block (paired Cancel next to a confirm button).
  variant?: 'primary' | 'destructive' | 'quiet' | 'solidDanger' | 'outlineDanger' | 'secondary';
  // compact = small inline button for list rows.
  size?: 'standard' | 'compact';
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

// V.4b: the one shared form-footer button (Save / Delete / Cancel).
// D3: added solidDanger, outlineDanger, secondary and the compact size.
export default function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'standard',
  loading = false,
  disabled = false,
  testID,
  accessibilityLabel,
  style,
}: Props) {
  const { colors } = useTheme();
  const isPrimary = variant === 'primary';
  const isSolidDanger = variant === 'solidDanger';
  const isOutlineDanger = variant === 'outlineDanger';
  const isSecondary = variant === 'secondary';
  const compact = size === 'compact';
  let textColor = colors.inkDim;
  if (isPrimary) textColor = colors.navy2;
  else if (isSolidDanger) textColor = '#FFFFFF';
  else if (variant === 'destructive' || isOutlineDanger) textColor = colors.error;
  const inactive = disabled || loading;
  return (
    <TouchableOpacity
      testID={testID}
      onPress={() => {
        if (isPrimary) hapticLight();
        if (isSolidDanger) hapticMedium();
        onPress();
      }}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        styles.base,
        isPrimary && { backgroundColor: colors.gold },
        isPrimary && styles.primary,
        variant === 'destructive' && styles.destructive,
        variant === 'quiet' && styles.quiet,
        isSolidDanger && styles.solidDanger,
        isOutlineDanger && [styles.outlineDanger, { borderColor: colors.error }],
        isSecondary && [styles.secondary, { backgroundColor: colors.navy3 }],
        compact && styles.compact,
        inactive && styles.inactive,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <Text
          style={[
            isPrimary
              ? styles.primaryText
              : variant === 'destructive'
              ? styles.destructiveText
              : isSolidDanger || isOutlineDanger
              ? styles.blockDangerText
              : styles.quietText,
            compact && styles.compactText,
            { color: textColor },
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', minHeight: 36 },
  primary: { borderRadius: radii.pill, paddingVertical: spacing[12], marginBottom: spacing[10] },
  destructive: { paddingVertical: spacing[10], marginBottom: spacing[4] },
  quiet: { paddingVertical: spacing[8] },
  solidDanger: { backgroundColor: '#C81E43', borderRadius: radii[10], paddingVertical: spacing[12] },
  outlineDanger: { borderWidth: 1.5, borderRadius: radii[10], paddingVertical: spacing[12] },
  secondary: { borderRadius: radii[10], paddingVertical: spacing[12] },
  compact: { minHeight: 26, paddingVertical: spacing[4], paddingHorizontal: spacing[10] },
  inactive: { opacity: 0.6 },
  primaryText: { fontSize: 14, fontWeight: '700' },
  destructiveText: { fontSize: 13, fontWeight: '600' },
  blockDangerText: { fontSize: 14, fontWeight: '600' },
  quietText: { fontSize: 13 },
  compactText: { fontSize: 12 },
});