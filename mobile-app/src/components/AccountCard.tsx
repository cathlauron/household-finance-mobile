import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatPeso } from '../balanceProjection';
import type { BalanceAccountEntry } from '../types';
import { radii, spacing } from '../tokens';
import { useTheme } from '../ThemeContext';

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
  cash: 'wallet-outline',
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
};

export default function AccountCard({ account, group, onPress, style, testID, isExpanded }: Props) {
  const { colors } = useTheme();
  const accentColor = account.color || DEFAULT_GROUP_COLORS[group];

  // All text is colors.ink / colors.inkDim, so contrast never depends on the chosen colour.
  // The colour shows up as a faint tint, a border, and a dot, never as text.
  const tintLayer = `${accentColor}14`;
  const borderColor = `${accentColor}40`;
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
        { backgroundColor: colors.navy3, borderColor },
        isExpanded && [styles.cardExpanded, { borderColor: accentColor }],
        style,
      ]}
    >
      <View pointerEvents="none" style={[styles.tintLayer, { backgroundColor: tintLayer }]} />

      <View style={styles.topRow}>
        <View style={styles.topRowLeft}>
          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
            <View style={[styles.badgeDot, { backgroundColor: accentColor }]} />
            <Text style={[styles.badgeText, { color: colors.ink }]}>{GROUP_LABELS[group]}</Text>
          </View>
          <Text style={[styles.accountName, { color: colors.ink }]} numberOfLines={1}>
            {account.name || 'Untitled account'}
          </Text>
        </View>
        <Text style={[styles.stripBalance, { color: colors.ink }]}>{formattedBalance}</Text>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.bottomRowLeft}>
          <Ionicons
            name={GROUP_ICONS[group]}
            size={15}
            color={colors.inkDim}
            style={{ marginRight: spacing[6] }}
          />
          <Text style={[styles.balanceLabel, { color: colors.inkDim }]}>
            {group === 'credit' ? 'CURRENT BALANCE / OWED' : 'CURRENT BALANCE'}
          </Text>
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
    borderRadius: radii[16],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    marginBottom: spacing[12],
    minHeight: 120,
    justifyContent: 'space-between',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  tintLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radii[16] - 1,
  },
  cardExpanded: {
    borderWidth: 1.5,
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 7,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    flex: 1,
    marginRight: spacing[8],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[8],
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing[6],
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  accountName: {
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  stripBalance: {
    fontSize: 15,
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[12],
  },
  bottomRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  editHintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[8],
    paddingVertical: 3,
    borderRadius: radii[6],
  },
  editHintText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
