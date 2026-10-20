import React from 'react';
import { TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Text } from './AppText';
import GradientFill from './GradientFill';
import { useTheme } from '../ThemeContext';

// Version 2.2 (Cath): the red "Delete …" row at the bottom of a page (a bill, a debt, a
// loan, a card, a savings pot, a trip), the same as the one on a transaction's page.
export default function DeleteRow({ label, onPress, testID, style }: { label: string; onPress: () => void; testID?: string; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const box = [styles.row, { backgroundColor: colors.navy3 }, style];
  return (
    <TouchableOpacity testID={testID} style={box} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <GradientFill match={box} />
      <Text style={[styles.text, { color: colors.negative }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 24, borderRadius: 12, overflow: 'hidden' },
  text: { fontSize: 17 },
});
