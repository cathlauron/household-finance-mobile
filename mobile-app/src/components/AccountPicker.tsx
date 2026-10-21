import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TouchableOpacity } from './Tap';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './AppText';
import { useTheme } from '../ThemeContext';
import { accountCurrentBalance, formatPeso, SpendingGroup } from '../balanceProjection';
import type { HouseholdModel, PaymentMethod } from '../types';
import GradientFill from './GradientFill';
import { cardColor, cardChipColors } from './CardFace';

// Redesign: choosing the account for a new transaction (required).
// Money out: "Paid from". Cash and debit accounts with nothing in them, or less than the
// amount, can't be chosen ("Insufficient balance"), so a balance never goes below zero.
// Credit cards are borrowing, so they can always be charged.
// Money in: "Add to", any account.
// Balances shown are live (see accountCurrentBalance). When editing a transaction, its
// own amount is left out, so it isn't counted against itself.

const GROUP_LABEL: Record<SpendingGroup, string> = { cash: 'Cash', debit: 'Debit', credit: 'Credit' };

export function availableBalance(model: HouseholdModel, pm: PaymentMethod | undefined, excludeTxnId?: string | null): number | null {
  if (!pm || !pm.accountId) return null;
  const m = excludeTxnId
    ? { ...model, manualTransactions: (model.manualTransactions || []).filter((t) => t.id !== excludeTxnId) }
    : model;
  const acct = m.balanceAccounts[pm.type].find((a) => a.id === pm.accountId);
  return acct ? accountCurrentBalance(m, pm.type, acct) : null;
}

// Why this transaction can't be saved against its account, or null if it can.
export function accountProblem(
  model: HouseholdModel,
  direction: 'in' | 'out' | 'saving',
  amount: number | '',
  pm: PaymentMethod | undefined,
  excludeTxnId?: string | null
): string | null {
  if (!pm || !pm.accountId) {
    return direction === 'in' ? 'Choose which account this goes into.' : 'Choose which account this is paid from.';
  }
  if (direction === 'in' || pm.type === 'credit') return null;
  const bal = availableBalance(model, pm, excludeTxnId) ?? 0;
  const name = model.balanceAccounts[pm.type].find((a) => a.id === pm.accountId)?.name || GROUP_LABEL[pm.type];
  if (bal <= 0) return `${name} has no balance left.`;
  if (typeof amount === 'number' && amount > bal) return `Insufficient balance: ${name} has ${formatPeso(bal)}.`;
  return null;
}

type Props = {
  model: HouseholdModel;
  direction: 'in' | 'out' | 'saving';
  amount: number | '';
  value: PaymentMethod | undefined;
  onChange: (pm: PaymentMethod) => void;
  excludeTxnId?: string | null;
  label?: string; // instead of "Paid from" / "Add to"
  // Version 2.1 (Cath): money being MOVED (into a savings pot, say) can't come from a
  // credit card, since a card's limit only pays for things. Hides credit cards.
  noCredit?: boolean;
};

export default function AccountPicker({ model, direction, amount, value, onChange, excludeTxnId, label, noCredit }: Props) {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors);
  const groups: SpendingGroup[] = noCredit ? ['cash', 'debit'] : ['cash', 'debit', 'credit'];
  const rows = groups.flatMap((g) => model.balanceAccounts[g].map((a) => ({ g, a })));
  const spending = direction !== 'in';

  return (
    <View>
      <Text style={styles.label}>{label ?? (spending ? 'Paid from' : 'Add to')}</Text>
      {rows.length === 0 ? (
        <Text style={styles.empty}>
          {noCredit ? 'Add a cash or bank account first (Home › Wallet, or Accounts), then come back.' : 'Add an account first (Home › Wallet, or Accounts), then come back.'}
        </Text>
      ) : (
        <View style={styles.group}>
          <GradientFill match={styles.group} />
          {rows.map(({ g, a }, i) => {
            const pm: PaymentMethod = { type: g, accountId: a.id };
            const bal = availableBalance(model, pm, excludeTxnId) ?? 0;
            const selected = value?.type === g && value?.accountId === a.id;
            const blocked =
              spending && g !== 'credit' && (bal <= 0 || (typeof amount === 'number' && amount > bal));
            const reason = !blocked ? null : bal <= 0 ? 'No balance' : 'Insufficient balance';
            return (
              <TouchableOpacity
                key={`${g}:${a.id}`}
                style={[
                  styles.row,
                  i > 0 && styles.rowTop,
                  // The chosen account is tinted in its own card colour.
                  selected && { backgroundColor: cardChipColors(cardColor(a, g), isDark, true).backgroundColor },
                  blocked && !selected && { opacity: 0.45 },
                ]}
                disabled={blocked && !selected}
                onPress={() => onChange(pm)}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled: blocked && !selected }}
                accessibilityLabel={`${a.name || GROUP_LABEL[g]}, ${GROUP_LABEL[g]}, ${formatPeso(bal)}${reason ? `, ${reason}` : ''}`}
              >
                <Ionicons
                  name={selected ? 'radio-button-on' : 'radio-button-off'}
                  size={22}
                  color={selected ? colors.gold : colors.inkFaint}
                  style={{ marginRight: 10 }}
                />
                {/* A small card in the account's own colour. */}
                <View style={[styles.miniCard, { backgroundColor: cardColor(a, g) }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>{a.name || GROUP_LABEL[g]}</Text>
                  <Text style={[styles.sub, reason ? { color: colors.negative } : null]}>
                    {reason ? `${GROUP_LABEL[g]} · ${reason}` : GROUP_LABEL[g]}
                  </Text>
                </View>
                <Text style={[styles.balance, { color: bal < 0 ? colors.negative : colors.inkDim }]}>{formatPeso(bal)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    label: { fontSize: 13, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase', color: colors.inkDim, marginBottom: 6, marginLeft: 4 },
    group: { backgroundColor: colors.navy2, borderRadius: 12, overflow: 'hidden', marginBottom: 14 },
    row: { flexDirection: 'row', alignItems: 'center', minHeight: 54, paddingHorizontal: 14, paddingVertical: 8 },
    rowTop: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    miniCard: { width: 26, height: 18, borderRadius: 4, marginRight: 10 },
    name: { fontSize: 16, color: colors.ink },
    sub: { fontSize: 12, color: colors.inkDim, marginTop: 1 },
    balance: { fontSize: 15, fontWeight: '600', marginLeft: 8 },
    empty: { fontSize: 14, color: colors.inkDim, marginBottom: 14, marginLeft: 4 },
  });
}
