import React, { useMemo, useState } from 'react';
import { alertNotSaved } from '../messages';
import { showLeafTick } from '../components/LeafTick';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { View, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { TouchableOpacity } from '../components/Tap';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '../components/AppText';
import AmountInput from '../components/AmountInput';
import DateField from '../components/DateField';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { formatPeso, accountCurrentBalance } from '../balanceProjection';
import { cardOwed } from '../creditCards';
import { makeId } from '../utils';
import { todayISO } from '../dateUtils';
import type { ThemeColors } from '../theme';
import type { HouseholdModel, ManualTransaction, PaymentMethod } from '../types';
import GradientFill from '../components/GradientFill';
import { cardColor, cardChipColors } from '../components/CardFace';

// Redesign: Move money, from the Finance Flow mockup. Moves money between two of your
// own accounts (e.g. BPI Savings to Cash at an ATM). It isn't spending, so Left to
// Spend doesn't change; only an ATM or transfer fee counts, and that's saved as a
// small "Fees" transaction paid from the first account.
//
// Version 2.1 (Cath): a credit card can't send money to another account (its limit only
// pays for things), but it can RECEIVE money: that's paying the card, and it frees up the
// card's available limit. So credit cards are only offered under "To".

type Group = 'cash' | 'debit' | 'credit';
type Acct = { key: string; group: Group; id: string; name: string; amount: number; color: string };

function accountsOf(model: HouseholdModel): Acct[] {
  const out: Acct[] = [];
  (['cash', 'debit', 'credit'] as Group[]).forEach((g) =>
    (model.balanceAccounts[g] || []).forEach((a) =>
      out.push({ key: `${g}:${a.id}`, group: g, id: a.id, name: a.name || (g === 'cash' ? 'Cash' : g === 'debit' ? 'Debit' : 'Credit card'), amount: typeof a.amount === 'number' ? a.amount : 0, color: cardColor(a, g) })
    )
  );
  return out;
}

export default function TransferScreen() {
  const { colors, isDark } = useTheme();
  const { model, saveModel } = useData();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors);
  const accounts = useMemo(() => (model ? accountsOf(model) : []), [model]);

  const senders = accounts.filter((a) => a.group !== 'credit');
  // Opened from a credit card's page ("Pay card"): the card is where the money goes.
  const payCardKey = route.params?.toGroup === 'credit' ? `credit:${route.params.toId}` : undefined;
  const asked = route.params?.fromGroup && route.params.fromGroup !== 'credit' ? `${route.params.fromGroup}:${route.params.fromId}` : undefined;
  const startKey = asked ?? senders[0]?.key;
  const [fromKey, setFromKey] = useState<string | undefined>(startKey);
  const [toKey, setToKey] = useState<string | undefined>(payCardKey ?? accounts.find((a) => a.key !== startKey)?.key);
  const [amount, setAmount] = useState<number | ''>('');
  const [fee, setFee] = useState<number | ''>('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);

  const from = accounts.find((a) => a.key === fromKey);
  const to = accounts.find((a) => a.key === toKey);

  async function move() {
    if (!model || !from || !to) return;
    if (from.key === to.key) return Alert.alert('Pick two different accounts');
    if (from.group === 'credit') return Alert.alert("A credit card can't send money", 'Pick a cash or bank account to move from.');
    if (amount === '' || amount <= 0) return Alert.alert('Enter how much to move');
    // Version 3: a card with a limit can't be paid more than you owe on it.
    if (to.group === 'credit') {
      const card = model.balanceAccounts.credit.find((a) => a.id === to.id);
      const owed = card ? cardOwed(card, accountCurrentBalance(model, 'credit', card)) : null;
      if (owed !== null && amount > owed + 0.004) {
        return Alert.alert(owed > 0 ? `You owe ${formatPeso(owed)} on ${to.name}` : `Nothing owed on ${to.name}`, owed > 0 ? `Pay up to ${formatPeso(owed)}.` : 'The whole limit is free to use already.');
      }
    }
    const feeAmt = fee === '' ? 0 : fee;
    const bump = (m: HouseholdModel, a: Acct, delta: number): HouseholdModel => ({
      ...m,
      balanceAccounts: {
        ...m.balanceAccounts,
        [a.group]: m.balanceAccounts[a.group].map((x) => (x.id === a.id ? { ...x, amount: (typeof x.amount === 'number' ? x.amount : 0) + delta } : x)),
      },
    });
    // The fee normally comes off through the "Fees" transaction below (live balances count
    // anything paid since the balances were last updated). A transfer dated BEFORE that
    // update would never be counted that way, so its fee comes straight off the saved
    // balance instead, the same way the amount moves. Either way it counts exactly once.
    const asOf = model.balanceAccounts.asOfDate;
    const feeOffSavedBalance = feeAmt > 0 && !!asOf && date < asOf;
    let next = bump(bump(model, from, -amount - (feeOffSavedBalance ? feeAmt : 0)), to, amount);
    const record = { id: makeId('xfer'), date, from: from.key, to: to.key, amount, ...(feeAmt ? { fee: feeAmt } : {}), ...(note.trim() ? { note: note.trim() } : {}) };
    next = { ...next, transfers: [...(model.transfers || []), record] };
    if (feeAmt > 0) {
      const pm: PaymentMethod = { type: from.group, accountId: from.id };
      const feeTxn: ManualTransaction = {
        id: makeId('txn'),
        date,
        label: `Fee: ${from.name} to ${to.name}`,
        amount: feeAmt,
        direction: 'out',
        owner: 'shared',
        category: 'Fees',
        notes: note.trim(),
        paymentMethod: pm,
      };
      next = { ...next, manualTransactions: [...(next.manualTransactions || []), feeTxn] };
    }
    setSaving(true);
    try {
      await saveModel(next);
      showLeafTick(to.group === 'credit' ? 'Paid' : 'Moved');
      navigation.goBack();
    } catch {
      Alert.alert(...alertNotSaved('this transfer'));
    } finally {
      setSaving(false);
    }
  }

  const Picker = ({ label, value, onPick, exclude, list }: { label: string; value?: string; onPick: (k: string) => void; exclude?: string; list: Acct[] }) => (
    <View style={styles.pickWrap}>
      <Text style={styles.pickLabel}>{label}</Text>
      <View style={styles.pickChips}>
        {list.filter((a) => a.key !== exclude).map((a) => (
          <TouchableOpacity key={a.key} style={[styles.pickChip, cardChipColors(a.color, isDark, value === a.key)]} onPress={() => onPick(a.key)} accessibilityRole="button" accessibilityState={{ selected: value === a.key }}>
            {/* Each chip wears its card's own colour; the chosen one is deeper with a solid border. */}
            <View style={styles.pickChipHead}>
              <View style={[styles.pickChipDot, { backgroundColor: a.color }]} />
              <Text style={[styles.pickChipText, value === a.key && { fontWeight: '700' }]} numberOfLines={1}>{a.name}</Text>
            </View>
            <Text style={styles.pickChipAmt}>{formatPeso(a.amount).replace('.00', '')}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.bar}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button">
          <Text style={styles.barBtn}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.barTitle}>{to?.group === 'credit' ? 'Pay card' : 'Move money'}</Text>
        <TouchableOpacity onPress={move} disabled={saving} accessibilityRole="button" testID="transfer-move">
          {saving ? <ActivityIndicator color={colors.gold} /> : <Text style={[styles.barBtn, { fontWeight: '700' }]}>Move</Text>}
        </TouchableOpacity>
      </View>
      <KeyboardAwareScrollView pageBounce contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {accounts.length < 2 || senders.length === 0 ? (
          <Text style={styles.footer}>
            {accounts.length < 2
              ? "Add at least two accounts (in Home's Wallet) to move money between them."
              : 'Add a cash or bank account first. A credit card can receive money, but it can\'t send it.'}
          </Text>
        ) : (
          <>
            <AmountInput style={styles.bigWrap} inputStyle={styles.bigInput} value={amount} onChangeAmount={setAmount} />
            <View style={styles.group}>
              <GradientFill match={styles.group} />
              <Picker label="From" list={senders} value={fromKey} onPick={(k) => { setFromKey(k); if (k === toKey) setToKey(accounts.find((a) => a.key !== k)?.key); }} />
              <View style={styles.line} />
              <Picker label="To" list={accounts} value={toKey} onPick={setToKey} exclude={fromKey} />
            </View>
            <View style={[styles.group, { marginTop: 20 }]}>
              <GradientFill match={[styles.group, { marginTop: 20 }]} />
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Note</Text>
                <TextInput style={styles.rowInput} value={note} onChangeText={setNote} placeholder="Optional" placeholderTextColor={colors.inkFaint} />
              </View>
              <View style={[styles.row, styles.lineTop]}>
                <Text style={styles.rowLabel}>ATM or transfer fee</Text>
                <AmountInput style={styles.inlineAmount} value={fee} onChangeAmount={setFee} />
              </View>
            </View>
            <View style={{ marginTop: 20 }}>
              <DateField label="Date" value={date} onChange={setDate} />
            </View>
            <Text style={styles.footer}>
              {to?.group === 'credit'
                ? `This pays ${to.name}: it frees up the card's available limit. It isn't new spending, so Left to Spend doesn't change. Only the fee counts.`
                : 'Moving money between your own accounts is not spending, so it does not change Left to Spend. Only the fee counts.'}
            </Text>
            <Text style={styles.footer}>Credit cards are only under "To": a card's limit pays for things, but it can't send money to another account.</Text>
          </>
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, minHeight: 44 },
    barBtn: { fontSize: 17, color: colors.gold },
    barTitle: { fontSize: 17, fontWeight: '600', color: colors.ink },
    content: { paddingHorizontal: 16, paddingBottom: 40 },
    bigWrap: { backgroundColor: 'transparent', justifyContent: 'center', marginVertical: 20, minHeight: 64 },
    bigInput: { fontSize: 40, fontWeight: '700', textAlign: 'center', flex: 0, minWidth: 120 },
    group: { backgroundColor: colors.navy3, borderRadius: 12, overflow: 'hidden' },
    pickWrap: { padding: 16 },
    pickLabel: { fontSize: 13, fontWeight: '600', color: colors.inkDim, marginBottom: 8 },
    pickChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pickChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5, maxWidth: '100%' },
    pickChipHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    pickChipDot: { width: 8, height: 8, borderRadius: 4 },
    pickChipText: { fontSize: 15, color: colors.ink },
    pickChipAmt: { fontSize: 13, color: colors.inkDim, marginTop: 1 },
    line: { height: StyleSheet.hairlineWidth, backgroundColor: colors.navy4, marginLeft: 16 },
    row: { flexDirection: 'row', alignItems: 'center', minHeight: 50, paddingHorizontal: 16 },
    lineTop: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    rowLabel: { fontSize: 17, color: colors.ink, marginRight: 8 },
    rowInput: { flex: 1, fontSize: 17, color: colors.ink, textAlign: 'right', paddingVertical: 12 },
    inlineAmount: { flex: 1, backgroundColor: 'transparent', marginBottom: 0, minHeight: 44, justifyContent: 'flex-end' },
    footer: { fontSize: 13, color: colors.inkDim, marginTop: 12, marginHorizontal: 16 },
  });
}
