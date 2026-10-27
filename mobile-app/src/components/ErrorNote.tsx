// Version 2.2 (approved P3): a problem shown inside a form, the same way everywhere: a
// soft red box with an icon, the message, and room to breathe. Replaces plain red text.
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './AppText';
import { useTheme } from '../ThemeContext';

export default function ErrorNote({ text, style }: { text: string; style?: object }) {
  const { colors } = useTheme();
  if (!text) return null;
  return (
    <View style={[s.box, { backgroundColor: colors.errorBg }, style]} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Ionicons name="alert-circle-outline" size={20} color={colors.negative} style={{ marginTop: 1 }} />
      <Text style={[s.text, { color: colors.negative }]}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  box: { flexDirection: 'row', gap: 10, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginVertical: 10 },
  text: { flex: 1, fontSize: 15, lineHeight: 21, fontWeight: '500' },
});
