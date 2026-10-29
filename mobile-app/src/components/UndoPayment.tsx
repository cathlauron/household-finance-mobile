import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TouchableOpacity } from './Tap';
import { Text } from './AppText';
import GradientFill from './GradientFill';
import { useTheme } from '../ThemeContext';
import { undoLeftMs } from '../paymentEdit';

// H-48 (Cath, 2026-10-29, canvas C1): "Undo" for a payment is only there for 15 minutes after
// it was logged, with a short line saying how long is left and that it can still be edited
// after. It goes away on its own when the time is up (checked every 15 seconds).
export default function UndoPayment({ loggedAt, label, onUndo, testID, style }: { loggedAt?: number; label: string; onUndo: () => void; testID?: string; style?: object }) {
  const { colors } = useTheme();
  const [now, setNow] = useState(Date.now());
  const left = undoLeftMs(loggedAt, now);
  useEffect(() => {
    if (left <= 0) return;
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, [left > 0]);
  if (left <= 0) return null;
  const mins = Math.max(1, Math.ceil(left / 60000));
  return (
    <View style={style}>
      <TouchableOpacity style={[s.button, { backgroundColor: colors.accentTint }]} onPress={onUndo} accessibilityRole="button">
        <GradientFill match={[s.button, { backgroundColor: colors.accentTint }]} />
        <Text style={[s.text, { color: colors.gold }]} testID={testID}>{label}</Text>
      </TouchableOpacity>
      <Text style={[s.note, { color: colors.inkDim }]} testID={testID ? `${testID}-note` : undefined}>
        Undo is there for {mins} more {mins === 1 ? 'minute' : 'minutes'}. After that you can still edit this payment.
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  button: { minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, overflow: 'hidden' },
  text: { fontSize: 17, fontWeight: '600' },
  note: { fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 8, marginHorizontal: 8 },
});
