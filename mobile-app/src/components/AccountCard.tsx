import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatPeso } from '../balanceProjection';
import type { BalanceAccountEntry } from '../types';

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

function isLightBackground(hexColor: string): boolean {
  const hex = hexColor.replace('#', '');
  if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 180;
  }
  return false;
}

type Props = {
  account: BalanceAccountEntry;
  group: AccountGroup;
  onPress?: () => void;
  style?: ViewStyle;
  testID?: string;
};

export default function AccountCard({ account, group, onPress, style, testID }: Props) {
  const cardColor = account.color || DEFAULT_GROUP_COLORS[group];
  const isLight = isLightBackground(cardColor);

  const textColor = isLight ? '#1C1917' : '#FFFFFF';
  const subTextColor = isLight ? 'rgba(28,25,23,0.65)' : 'rgba(255,255,255,0.75)';
  const badgeBg = isLight ? 'rgba(28,25,23,0.08)' : 'rgba(255,255,255,0.18)';
  const borderColor = isLight ? 'rgba(28,25,23,0.12)' : 'rgba(255,255,255,0.14)';

  const rawAmount = typeof account.amount === 'number' ? account.amount : 0;
  const formattedBalance = formatPeso(rawAmount);

  return (
    <TouchableOpacity
      testID={testID || `account-card-${account.id}`}
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: cardColor, borderColor },
        style,
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
          <Text style={[styles.badgeText, { color: textColor }]}>
            {GROUP_LABELS[group].toUpperCase()}
          </Text>
        </View>
        <Ionicons
          name={GROUP_ICONS[group]}
          size={18}
          color={subTextColor}
        />
      </View>

      <View style={styles.nameWrap}>
        <Text style={[styles.accountName, { color: textColor }]} numberOfLines={1}>
          {account.name || 'Untitled account'}
        </Text>
      </View>

      <View style={styles.bottomRow}>
        <View>
          <Text style={[styles.balanceLabel, { color: subTextColor }]}>
            {group === 'credit' ? 'CURRENT BALANCE / OWED' : 'CURRENT BALANCE'}
          </Text>
          <Text style={[styles.balanceAmount, { color: textColor }]}>
            {formattedBalance}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    minHeight: 128,
    justifyContent: 'space-between',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  nameWrap: {
    marginBottom: 14,
  },
  accountName: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  balanceAmount: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});