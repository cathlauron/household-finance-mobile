import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../ThemeContext';
import { radii, spacing } from '../tokens';
import { hapticLight } from '../haptics';

type Props = {
  label: string;
  onPress: () => void;
  // primary = filled green (Save). destructive = red text link (Delete). quiet = grey text link (Cancel).
  variant?: 'primary' | 'destructive' | 'quiet';
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

// V.4b: the one shared form-footer button (Save / Delete / Cancel).
export default function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  testID,
  accessibilityLabel,
  style,
}: Props) {
  const { colors } = useTheme();
  const isPrimary = variant === 'primary';
  const textColor = isPrimary ? colors.navy2 : variant === 'destructive' ? colors.error : colors.inkDim;
  const inactive = disabled || loading;
  return (
    <TouchableOpacity
      testID={testID}
      onPress={() => {
        if (isPrimary) hapticLight();
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
        inactive && styles.inactive,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <Text
          style={[
            isPrimary ? styles.primaryText : variant === 'destructive' ? styles.destructiveText : styles.quietText,
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
  inactive: { opacity: 0.6 },
  primaryText: { fontSize: 14, fontWeight: '700' },
  destructiveText: { fontSize: 13, fontWeight: '600' },
  quietText: { fontSize: 13 },
});
