import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TouchableOpacity } from './Tap';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './AppText';
import { useTheme } from '../ThemeContext';
import GradientFill from './GradientFill';
import { WhoBadge } from './WhoLogged';
import ArrivalGlow from './ArrivalGlow';

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
  // Version 2.2 (canvas K3): a small High / Medium / Low tag after the name.
  priority?: 'high' | 'medium' | 'low' | '';
  onPress: () => void;
  testID?: string;
  // Version 2.2 (W1 everywhere): who added it; a small letter shows when it's someone else.
  addedBy?: string;
  // Version 2.2 (approved P4): true for a moment after this row was just added.
  glow?: boolean;
  // H-45 (Cath, 2026-10-29, canvas B14): paid. The layout stays; one line runs from the start
  // of the name to the end of the amount, and the whole row is faded.
  paid?: boolean;
};

export default function PayRow({ icon, title, sub, amount, amountColor, badge, divider, priority, onPress, testID, addedBy, glow, paid }: Props) {
  const { colors } = useTheme();
  // Where the name's line sits, so the paid line goes through its middle.
  const [nameMid, setNameMid] = useState(11);
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
      accessibilityLabel={`${title}${priority ? `, ${priority} priority` : ''}, ${amount}, ${sub}${badge ? `, ${badge.text}` : ''}${paid && !badge ? ', paid' : ''}`}
      style={[styles.row, { backgroundColor: colors.navy3 }, divider && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 }]}
    >
      <GradientFill match={[styles.row, { backgroundColor: colors.navy3 }, divider && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 }]} />
      {glow && <ArrivalGlow />}
      <View style={[styles.tile, { backgroundColor: colors.accentTint }, paid && { opacity: 0.6 }]}>
        <GradientFill match={[styles.tile, { backgroundColor: colors.accentTint }]} />
        <Ionicons name={icon} size={17} color={colors.gold} />
        <WhoBadge by={addedBy} />
      </View>
      <View style={[styles.content, paid && styles.paidContent]}>
      <View style={styles.main}>
        <View style={styles.titleRow} onLayout={(e) => setNameMid(e.nativeEvent.layout.y + e.nativeEvent.layout.height / 2)}>
          <Text style={[styles.title, { color: colors.ink, flexShrink: 1 }]} numberOfLines={1}>{title}</Text>
          {!!priority && (() => {
            // 2.2 (approved P2): a soft filled pill instead of a thin outline.
            const c = priority === 'high' ? colors.negative : priority === 'medium' ? colors.orange : colors.positive;
            const bg = priority === 'high' ? colors.errorBg : priority === 'medium' ? colors.warnBg : colors.okBg;
            return <Text style={[styles.prTag, { color: c, backgroundColor: bg }]}>{priority.charAt(0).toUpperCase() + priority.slice(1)}</Text>;
          })()}
        </View>
        <Text style={[styles.sub, { color: colors.inkDim }]} numberOfLines={1}>{sub}</Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, { color: amountColor }]}>{amount}</Text>
        {badge && tone && <Text style={[styles.badge, { color: tone.color, backgroundColor: tone.bg }]}>{badge.text}</Text>}
      </View>
      {paid && <View pointerEvents="none" testID={testID ? `${testID}-paid-line` : undefined} style={[styles.paidLine, { top: nameMid - 0.75, backgroundColor: colors.ink }]} />}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 60, paddingHorizontal: 16, paddingVertical: 10 },
  tile: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  main: { flex: 1, marginRight: 8 },
  // The name and the amount side by side; tops lined up so one line can run across both.
  content: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  // Paid: tops lined up so the line runs straight from the name to the amount; row faded.
  paidContent: { alignItems: 'flex-start', opacity: 0.6 },
  paidLine: { position: 'absolute', left: -2, right: -2, height: 1.5, borderRadius: 1, opacity: 0.55 },
  title: { fontSize: 17, fontWeight: '500' },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  prTag: { marginLeft: 6, fontSize: 11, fontWeight: '700', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  sub: { fontSize: 13, marginTop: 1 },
  right: { alignItems: 'flex-end' },
  amount: { fontSize: 17, fontWeight: '600' },
  badge: { marginTop: 3, fontSize: 12, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
});
