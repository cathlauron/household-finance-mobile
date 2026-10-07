import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../ThemeContext';

type Props = {
  children?: React.ReactNode;
  // card = report card (radius 10, padding 16, margin-bottom 12).
  // banner = balance / year / net banner (radius 12, padding 14/16, NO margin: pass marginBottom via style).
  variant?: 'card' | 'banner';
  // true = lay children out in a row, space-between (banners with a left and right side).
  row?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

// V.4b-4: the one shared white card container.
export default function Card({ children, variant = 'card', row = false, testID, style }: Props) {
  const { colors } = useTheme();
  return (
    <View
      testID={testID}
      style={[
        { backgroundColor: colors.navy3 },
        variant === 'card' ? styles.card : styles.banner,
        row && styles.row,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 10, padding: 16, marginBottom: 12 },
  banner: { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
