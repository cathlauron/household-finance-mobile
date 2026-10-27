import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { TouchableOpacity } from './Tap';
import { Text } from './AppText';
import { Ionicons } from '@expo/vector-icons';
import { formatPeso } from '../balanceProjection';
import type { BalanceAccountEntry } from '../types';
import { radii, spacing } from '../tokens';
import { useTheme } from '../ThemeContext';
import { cardFaceColors, CardFaceFill } from './CardFace';

export type AccountGroup = 'cash' | 'debit' | 'credit';

export const DEFAULT_GROUP_COLORS: Record<AccountGroup, string> = {
  cash: '#059669',   // Emerald green
  debit: '#2563EB',  // Cobalt blue
  credit: '#264653', // Slate / graphite
};

export const COLOR_PALETTE = [
  '#E76F51', '#2A9D8F', '#264653', '#E9C46A', '#F4A261',
  '#6D28D9', '#2563EB', '#EA580C', '#059669', '#DC2626',
  '#9333EA', '#0891B2', '#D97706', '#DB2777', '#78716C',
];

const GROUP_LABELS: Record<AccountGroup, string> = {
  cash: 'Cash',
  debit: 'Debit',
  credit: 'Credit',
};

const GROUP_ICONS: Record<AccountGroup, keyof typeof Ionicons.glyphMap> = {
  cash: 'cash-outline',
  debit: 'card-outline',
  credit: 'card',
};

type Props = {
  account: BalanceAccountEntry;
  group: AccountGroup;
  onPress?: () => void;
  style?: ViewStyle;
  testID?: string;
  isExpanded?: boolean;
  // No longer used: every card shows its type tag, like the Card page.
  hideTypeBadge?: boolean;
};

export default function AccountCard({ account, group, onPress, style, testID, isExpanded, hideTypeBadge }: Props) {
  const { colors, isDark } = useTheme();
  const accentColor = account.color || DEFAULT_GROUP_COLORS[group];

  // All text is colors.ink / colors.inkDim, so contrast never depends on the chosen colour.
  // The colour shows up as a faint tint, a border, and a dot, never as text.
  // Same colour and gradient as this card in Home's Wallet.
  const face = cardFaceColors(accentColor, isDark);
  const badgeBg = `${accentColor}26`;

  const rawAmount = typeof account.amount === 'number' ? account.amount : 0;
  const formattedBalance = formatPeso(rawAmount);

  return (
    <TouchableOpacity
      testID={testID || `account-card-${account.id}`}
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.card,
        face,
        isExpanded && [styles.cardExpanded, { borderColor: accentColor }],
        style,
      ]}
    >
      <CardFaceFill color={accentColor} radius={17} />

      {/* Same layout as the Card page: colour chip and name, the type tag on the right,
          and the balance at the bottom. */}
      <View style={styles.topRow}>
        <View style={styles.topRowLeft}>
          <View style={[styles.chip, { backgroundColor: accentColor }]} />
          <Text style={[styles.accountName, { color: colors.ink }]} numberOfLines={1}>
            {account.name || 'Untitled account'}
          </Text>
        </View>
        <View style={[styles.typeTag, { backgroundColor: colors.navy1 }]}>
          <Ionicons name={GROUP_ICONS[group]} size={11} color={colors.inkDim} />
          <Text style={[styles.typeTagText, { color: colors.inkDim }]}>{GROUP_LABELS[group]}</Text>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <View>
          <Text style={[styles.balanceLabel, { color: colors.inkDim }]}>Balance</Text>
          <Text style={[styles.balance, { color: rawAmount < 0 ? colors.negative : colors.positive }]}>{formattedBalance}</Text>
        </View>
        {isExpanded && (
          <View style={[styles.editHintBadge, { backgroundColor: badgeBg }]}>
            <Ionicons name="pencil" size={10} color={colors.ink} style={{ marginRight: 3 }} />
            <Text style={[styles.editHintText, { color: colors.ink }]}>Tap to edit</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 190,
    borderRadius: 18,
    padding: 18,
    marginBottom: spacing[12],
    justifyContent: 'space-between',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardExpanded: {
    borderWidth: 1.5,
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 7,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 },
  chip: { width: 12, height: 12, borderRadius: 3 },
  accountName: { fontSize: 17, fontWeight: '600', flexShrink: 1 },
  typeTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  typeTagText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase' },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  balanceLabel: { fontSize: 13 },
  balance: { fontSize: 30, lineHeight: 36, fontWeight: '700' },
  editHintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[8],
    paddingVertical: 3,
    borderRadius: radii[6],
  },
  editHintText: { fontSize: 11, fontWeight: '600' },
});
