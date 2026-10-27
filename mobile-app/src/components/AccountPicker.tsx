import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { TouchableOpacity } from './Tap';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './AppText';
import { MarkedLabel } from './MarkedLabel';
import { useTheme } from '../ThemeContext';
import { accountCurrentBalance, formatPeso, SpendingGroup } from '../balanceProjection';
import type { HouseholdModel, PaymentMethod } from '../types';
import GradientFill from './GradientFill';
import { cardColor, cardChipColors } from './CardFace';

// Redesign: choosing the account for a new transaction (required).
// Money out: "Paid from". An account with nothing in it, or less than the amount, is
// greyed out and can't be chosen ("Insufficient balance"), so a balance never goes below
// zero. Version 2.2 (Cath): the same for cash, debit AND credit cards (a card is checked
// against what's still available to use on it), with the same wording everywhere.
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
  if (direction === 'in') return null;
  const bal = availableBalance(model, pm, excludeTxnId) ?? 0;
  const name = model.balanceAccounts[pm.type].find((a) => a.id === pm.accountId)?.name || GROUP_LABEL[pm.type];
  // Version 2.2 (Cath): credit cards are checked too, against what's still available to
  // use on the card (its balance in the app is the amount you can still use).
  if (pm.type === 'credit') {
    if (bal <= 0) return `Insufficient balance: ${name} has nothing left to use.`;
    if (typeof amount === 'number' && amount > bal) return `Insufficient balance: ${name} has ${formatPeso(bal)} available to use.`;
    return null;
  }
  if (bal <= 0) return `Insufficient balance: ${name} has no money left in it.`;
  if (typeof amount === 'number' && amount > bal) return `Insufficient balance: ${name} only has ${formatPeso(bal)}.`;
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
  noLabel?: boolean; // inside a form row that already says it
  // Version 2.1 (Cath): money being MOVED (into a savings pot, say) can't come from a
  // credit card, since a card's limit only pays for things. Hides credit cards.
  noCredit?: boolean;
  // Cath, 2026-10-23: required (*) or optional, like every form field.
  mark?: 'required' | 'optional';
};

export default React.memo(AccountPicker);

function AccountPicker({ model, direction, amount, value, onChange, excludeTxnId, label, noCredit, mark, noLabel }: Props) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  // Speed sweep: each account's balance goes through your whole history, so it's worked
  // out once per change of your data, not again on every key typed in the form.
  const rows = useMemo(() => {
    const groups: SpendingGroup[] = noCredit ? ['cash', 'debit'] : ['cash', 'debit', 'credit'];
    return groups.flatMap((g) =>
      model.balanceAccounts[g].map((a) => ({ g, a, bal: availableBalance(model, { type: g, accountId: a.id }, excludeTxnId) ?? 0 }))
    );
  }, [model, excludeTxnId, noCredit]);
  const spending = direction !== 'in';

  return (
    <View>
      {!noLabel && <MarkedLabel text={label ?? (spending ? 'Paid from' : 'Add to')} mark={mark} style={styles.label} />}
      {rows.length === 0 ? (
        <Text style={styles.empty}>
          {noCredit ? 'Add a cash or bank account first (Home › Wallet, or Accounts), then come back.' : 'Add an account first (Home › Wallet, or Accounts), then come back.'}
        </Text>
      ) : (
        <View style={styles.group}>
          <GradientFill match={styles.group} />
          {rows.map(({ g, a, bal }, i) => {
            const pm: PaymentMethod = { type: g, accountId: a.id };
            const selected = value?.type === g && value?.accountId === a.id;
            const blocked = spending && (bal <= 0 || (typeof amount === 'number' && amount > bal));
            const reason = !blocked ? null : 'Insufficient balance';
            return (
              <TouchableOpacity
                key={`${g}:${a.id}`}
                testID={`account-row-${a.id}`}
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
