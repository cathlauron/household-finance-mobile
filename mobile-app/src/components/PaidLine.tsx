import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../ThemeContext';

// H-45 (Cath, 2026-10-29, canvas B14): the paid look. Put inside a row's content (a View with
// `paidRowContent` while paid): one line from the start of the name to the end of the amount,
// through the middle of the name's line; the content is faded. The layout doesn't change.
export const PAID_NAME_MID = 11; // half of a 17-point name's line

export function PaidLine({ top = PAID_NAME_MID, testID }: { top?: number; testID?: string }) {
  const { colors } = useTheme();
  return <View pointerEvents="none" testID={testID} style={[s.line, { top: top - 0.75, backgroundColor: colors.ink }]} />;
}

export const paidRowContent = { alignItems: 'flex-start' as const, opacity: 0.6 };

const s = StyleSheet.create({
  line: { position: 'absolute', left: -2, right: -2, height: 1.5, borderRadius: 1, opacity: 0.55 },
});
