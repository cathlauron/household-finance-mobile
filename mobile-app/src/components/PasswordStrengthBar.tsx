import React from 'react';
import { View } from 'react-native';
import { Text } from './AppText';
import { useTheme } from '../ThemeContext';
import { passwordStrength } from '../passwordStrength';

// Cath, 2026-11-03 (mockup PW1): a 4-part bar and a word (Weak / Okay / Good / Strong) under a
// new password, with a short tip on the right. Shows nothing until something is typed.
export default function PasswordStrengthBar({ password, testID }: { password: string; testID?: string }) {
  const { colors } = useTheme();
  const s = passwordStrength(password);
  if (!s) return null;
  const color = s.level <= 1 ? colors.negative : s.level === 2 ? colors.orange : s.level === 3 ? colors.goldDim : colors.gold;
  return (
    <View testID={testID} accessibilityLiveRegion="polite" accessibilityLabel={`Password strength: ${s.word}. ${s.tip}`} style={{ marginTop: 8, marginHorizontal: 2 }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i <= Math.max(1, s.level) ? color : colors.navy4 }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color }}>{s.word}</Text>
        <Text style={{ fontSize: 15, color: colors.inkDim }}>{s.tip}</Text>
      </View>
    </View>
  );
}
