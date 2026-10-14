import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './AppText';
import { useTheme } from '../ThemeContext';

// Redesign: one row in the To-Pay lists (Finance Flow mockup): icon tile, name,
// "Due Fri, Oct 16" underneath, and the amount with an optional tag on the right.
// Tapping opens the full Bill / Debt / Loan page.

type Props = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  sub: string;
  amount: string;
  amountColor: string;
  badge?: { text: string; tone: 'overdue' | 'soon' | 'info' | 'paid' };
  divider?: boolean;
  onPress: () => void;
  testID?: string;
};

export default function PayRow({ icon, title, sub, amount, amountColor, badge, divider, onPress, testID }: Props) {
  const { colors } = useTheme();
  const tone = badge
    ? badge.tone === 'overdue'
      ? { color: colors.negative, bg: colors.errorBg }
      : badge.tone === 'soon'
      ? { color: colors.orange, bg: colors.warnBg }
      : badge.tone === 'paid'
      ? { color: colors.positive, bg: colors.okBg }
      : { color: colors.inkDim, bg: colors.navy1 }
    : null;
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${amount}, ${sub}${badge ? `, ${badge.text}` : ''}`}
      style={[styles.row, { backgroundColor: colors.navy3 }, divider && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 }]}
    >
      <View style={[styles.tile, { backgroundColor: colors.accentTint }]}>
        <Ionicons name={icon} size={17} color={colors.gold} />
      </View>
      <View style={styles.main}>
        <Text style={[styles.title, { color: colors.ink }]} numberOfLines={1}>{title}</Text>
        <Text style={[styles.sub, { color: colors.inkDim }]} numberOfLines={1}>{sub}</Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, { color: amountColor }]}>{amount}</Text>
        {badge && tone && <Text style={[styles.badge, { color: tone.color, backgroundColor: tone.bg }]}>{badge.text}</Text>}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 60, paddingHorizontal: 16, paddingVertical: 10 },
  tile: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  main: { flex: 1, marginRight: 8 },
  title: { fontSize: 17, fontWeight: '500' },
  sub: { fontSize: 13, marginTop: 1 },
  right: { alignItems: 'flex-end' },
  amount: { fontSize: 17, fontWeight: '600' },
  badge: { marginTop: 3, fontSize: 12, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
});
