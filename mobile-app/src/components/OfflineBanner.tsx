import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './AppText';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';

// Redesign (Finance Flow "offline" mockup): a small strip under the page title while the
// phone has no internet. Everything keeps working; changes are saved on the phone and
// sent to the cloud by themselves once the connection is back (see DataContext).
export default function OfflineBanner({ style }: { style?: any }) {
  const { colors } = useTheme();
  const { isOnline, pendingChanges } = useData();
  if (isOnline) return null;
  const detail =
    pendingChanges > 0
      ? `Keep going. ${pendingChanges} ${pendingChanges === 1 ? 'change is' : 'changes are'} saved on this phone and will sync.`
      : 'Keep going. Changes are saved on this phone and will sync.';
  return (
    <View
      style={[styles.wrap, { backgroundColor: colors.indigoBg, borderColor: colors.indigo + '33' }, style]}
      accessibilityRole="alert"
      accessibilityLabel={`You are offline. ${detail}`}
    >
      <Ionicons name="cloud-offline-outline" size={20} color={colors.indigo} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: colors.ink }]}>You are offline</Text>
        <Text style={[styles.detail, { color: colors.inkDim }]}>{detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  title: { fontSize: 15, fontWeight: '600' },
  detail: { fontSize: 13, lineHeight: 18 },
});
