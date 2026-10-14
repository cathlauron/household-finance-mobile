import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './AppText';
import { useTheme } from '../ThemeContext';
import type { ThemeColors } from '../theme';
import { formatPeso, totalLiquidBalance } from '../balanceProjection';
import type { HouseholdModel, BalanceAccountEntry } from '../types';
import { DEFAULT_GROUP_COLORS, AccountGroup } from './AccountCard';

// Redesign: the Wallet on Home (Finance Flow mockup). Spending accounts (Cash, Debit,
// Credit) are drawn as a stack of cards, like Apple Wallet: each card peeks out by its
// name and balance, and the front card shows its full balance. Tapping any card, or
// "Add card", opens Accounts. This is Accounts' new home (it used to live in More).

const PEEK = 48; // how much of each card behind the front one shows
const CARD_HEIGHT = 176;
const MAX_CARDS = 4; // more than this and the stack gets too tall; the rest are in Accounts

const GROUP_LABEL: Record<AccountGroup, string> = { cash: 'Cash', debit: 'Debit', credit: 'Credit' };

type WalletCard = { account: BalanceAccountEntry; group: AccountGroup };

export default function HomeWallet({ model }: { model: HouseholdModel }) {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const styles = makeStyles(colors);

  const cards: WalletCard[] = (['cash', 'credit', 'debit'] as AccountGroup[]).flatMap((group) =>
    (model.balanceAccounts[group] || []).map((account) => ({ account, group }))
  );
  const shown = cards.slice(-MAX_CARDS);
  const hidden = cards.length - shown.length;
  const total = totalLiquidBalance(model);
  const openAccounts = () => navigation.navigate('Accounts');

  const amountColor = (n: number) => (n < 0 ? colors.negative : colors.positive);

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Wallet</Text>
        <TouchableOpacity onPress={openAccounts} accessibilityRole="button" accessibilityLabel="Add card" testID="home-wallet-add">
          <Text style={styles.link}>Add card</Text>
        </TouchableOpacity>
      </View>

      {shown.length === 0 ? (
        <TouchableOpacity style={styles.emptyCard} onPress={openAccounts} activeOpacity={0.7} accessibilityRole="button">
          <Ionicons name="wallet-outline" size={26} color={colors.gold} />
          <Text style={styles.emptyTitle}>Add your first account</Text>
          <Text style={styles.emptySub}>Cash, debit or credit. Left to Spend starts from these.</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ height: CARD_HEIGHT + PEEK * (shown.length - 1) }}>
          {shown.map(({ account, group }, i) => {
            const isFront = i === shown.length - 1;
            const amount = typeof account.amount === 'number' ? account.amount : 0;
            return (
              <TouchableOpacity
                key={account.id}
                testID={`home-wallet-card-${account.id}`}
                activeOpacity={0.85}
                onPress={openAccounts}
                accessibilityRole="button"
                accessibilityLabel={`${account.name || GROUP_LABEL[group]}, ${GROUP_LABEL[group]}, ${formatPeso(amount)}`}
                style={[styles.card, { top: i * PEEK }]}
              >
                <View style={styles.cardHead}>
                  <View style={styles.nameRow}>
                    <View style={[styles.chip, { backgroundColor: account.color || DEFAULT_GROUP_COLORS[group] }]} />
                    <Text style={styles.name} numberOfLines={1}>{account.name || GROUP_LABEL[group]}</Text>
                  </View>
                  {isFront ? (
                    <Text style={styles.type}>{GROUP_LABEL[group]}</Text>
                  ) : (
                    <Text style={[styles.peekAmount, { color: amountColor(amount) }]}>{formatPeso(amount)}</Text>
                  )}
                </View>
                {isFront && (
                  <View style={styles.front}>
                    <Text style={styles.frontLabel}>Balance</Text>
                    <Text style={[styles.frontAmount, { color: amountColor(amount) }]}>{formatPeso(amount)}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {shown.length > 0 && (
        <Text style={styles.footer}>
          {formatPeso(total)} across {cards.length} {cards.length === 1 ? 'account' : 'accounts'}
          {hidden > 0 ? ` · ${hidden} more in Accounts` : ' · tap a card to see your accounts'}
        </Text>
      )}
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    section: { marginBottom: 24 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 4, marginBottom: 8 },
    header: { fontSize: 20, fontWeight: '700', color: colors.ink },
    link: { fontSize: 15, fontWeight: '600', color: colors.gold, paddingVertical: 4 },
    card: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: CARD_HEIGHT,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.navy3,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.navy4,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: -1 },
      elevation: 2,
    },
    cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 24, gap: 8 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
    chip: { width: 10, height: 10, borderRadius: 3 },
    name: { fontSize: 15, fontWeight: '600', color: colors.ink, flexShrink: 1 },
    peekAmount: { fontSize: 15, fontWeight: '600' },
    type: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase', color: colors.inkDim },
    front: { marginTop: 'auto' },
    frontLabel: { fontSize: 13, color: colors.inkDim },
    frontAmount: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
    footer: { fontSize: 13, color: colors.inkDim, marginTop: 8, paddingHorizontal: 4 },
    emptyCard: {
      borderRadius: 16,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.navy4,
      paddingVertical: 24,
      paddingHorizontal: 16,
      alignItems: 'center',
      gap: 6,
    },
    emptyTitle: { fontSize: 17, fontWeight: '600', color: colors.ink },
    emptySub: { fontSize: 13, color: colors.inkDim, textAlign: 'center' },
  });
}
