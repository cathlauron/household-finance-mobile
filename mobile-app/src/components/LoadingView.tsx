import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Text } from './AppText';
import { useTheme } from '../ThemeContext';

// Shown while a page's data is still loading, so it never looks blank or frozen.
export default function LoadingView({ label, testID }: { label?: string; testID?: string }) {
  const { colors } = useTheme();
  return (
    <View
      testID={testID}
      style={{ flex: 1, minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}
      accessibilityRole="progressbar"
      accessibilityLabel={label || 'Loading'}
    >
      <ActivityIndicator size="large" color={colors.gold} />
      {!!label && <Text style={{ fontSize: 15, color: colors.inkDim }}>{label}</Text>}
    </View>
  );
}
