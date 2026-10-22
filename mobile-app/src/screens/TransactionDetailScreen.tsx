import React, { useLayoutEffect, useState, useMemo } from 'react';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { alertNotSaved, alertNotDeleted } from '../messages';
import { View, ScrollView, StyleSheet, Image, Alert } from 'react-native';
import { TouchableOpacity } from '../components/Tap';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/AppText';
import { headerButtonText } from '../navigation/LargeHeader';
import { useTheme } from '../ThemeContext';
import TransactionsScreen from './TransactionsScreen';
import { useData } from '../DataContext';
import { formatPeso } from '../balanceProjection';
import { buildTransactionsList, TransactionEntry } from '../transactions';
import { paymentMethodColor } from '../components/CardFace';
import { accountLabel, deleteManualTxn, markRefundReceived, undoRefund } from '../transactionActions';
import type { ThemeColors } from '../theme';
import GradientFill from '../components/GradientFill';
import BottomSheet from '../components/BottomSheet';
import { FREQUENCY_OPTIONS, ruleForTransaction, setRepeat, stopRepeat, frequencyLabel, describeFrequency } from '../recurring';
import type { RecurringFrequency } from '../types';

// Redesign: the Transaction page from the Finance Flow mockup. Tapping a transaction
// opens this full page (it used to expand in the list): big name and amount, then
// Category, Account, Paid by, Note, Receipt, Split, Repeat and Refund, and Delete.
// "Edit" opens the usual edit form on Transactions. Transactions that come from a
// bill, debt, loan, income or savings goal show where they came from instead.

const SOURCE_NAME: Record<string, string> = {
  bill: 'Bill',
  debt: 'Debt',
  loan: 'Loan',
  income: 'Income',
  saving: 'Savings goal',
  manual: 'Transaction',
};

function whenLabel(date: string, createdAt?: number): string {
  const d = new Date(date + 'T00:00:00');
  if (isNaN(d.getTime())) return date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  const day =
    diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  if (!createdAt) return day;
  const t = new Date(createdAt);
  const sameDay = t.getFullYear() === d.getFullYear() && t.getMonth() === d.getMonth() && t.getDate() === d.getDate();
  return sameDay ? `${day}, ${t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : day;
}

export default function TransactionDetailScreen() {
  const { colors } = useTheme();
  const { model, saveModel, getModel, isLinked, username } = useData();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id: string = route.params?.id;
  const styles = makeStyles(colors);
  const [repeatOpen, setRepeatOpen] = useState(false);
  // Version 2.2 (Cath): Edit opens the form right on this page (no jump back to the list).
  const [editing, setEditing] = useState(false);

  // Version 2.2 (sweep): built once per change, not on every redraw of this page.
  const entry: TransactionEntry | undefined = useMemo(() => (model ? buildTransactionsList(model).find((t) => t.id === id) : undefined), [model, id]);
  const raw = entry?.source === 'manual' && model ? (model.manualTransactions || []).find((m) => m.id === entry.rawId) : undefined;
  const isManual = !!raw;
  const linkedShare = raw ? (model?.sharedExpenses ?? []).find((x) => x.transactionId === raw.id) : undefined;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: '',
      headerBackTitle: 'Transactions',
      headerRight: isManual
        ? () => (
            <TouchableOpacity
              testID="txn-detail-edit"
              onPress={() => setEditing(true)}
              accessibilityRole="button"
            >
              <Text style={[headerButtonText, { color: colors.gold }]}>Edit</Text>
            </TouchableOpacity>
          )
        : undefined,
    });
  }, [navigation, isManual, raw, colors.gold]);

  if (!model || !entry) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>This transaction isn't here any more.</Text>
      </View>
    );
  }

  const sign = entry.direction === 'in' ? '+' : entry.direction === 'saving' ? '' : '−';
  const amountColor = entry.direction === 'in' ? colors.positive : entry.direction === 'saving' ? colors.saving : colors.negative;
  const person = (model.people || []).find((p) => p.id === entry.owner);
  const paidBy = entry.owner === 'shared' || !entry.owner ? 'Shared' : person?.name || '—';
  const account = accountLabel(model, raw?.paymentMethod);
  // H-16: only money out waits for a refund (a received one still shows on its expense).
  const refundExpected = raw?.direction === 'out' || raw?.refundTransactionId ? raw?.refundExpectedAmount : undefined;
  const refundReceived = typeof refundExpected === 'number' && !!raw?.refundTransactionId;

  const openEdit = () => {
    if (raw) setEditing(true);
  };
  const rule = raw && model ? ruleForTransaction(model, raw) : undefined;
  async function chooseRepeat(freq: RecurringFrequency | 'never') {
    setRepeatOpen(false);
    if (!raw || !model) return;
    if (freq === 'never') {
      if (rule) await save(stopRepeat(model, rule.id));
      return;
    }
    await save(setRepeat(model, raw, freq));
  }

  async function save(next: ReturnType<typeof markRefundReceived>) {
    if (!next) return;
    try {
      await saveModel(next);
    } catch {
      Alert.alert(...alertNotSaved('this transaction'));
    }
  }

  function confirmDelete() {
    if (!raw || !model) return;
    Alert.alert('Delete this transaction?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await saveModel(deleteManualTxn(model, raw.id));
            navigation.goBack();
          } catch {
            Alert.alert(...alertNotDeleted('this transaction'));
          }
        },
      },
    ]);
  }

  const linkedOpen =
    entry.source === 'bill' || entry.source === 'debt' || entry.source === 'loan'
      ? () => {
          // Redesign: open the full Bill / Debt / Loan page.
          const realId = entry.id.replace(/^(bill|debt|loan)-/, '');
          const target =
            entry.source === 'bill'
              ? model.bills.find((b) => b.cycles.some((c) => c.id === realId))?.id
              : entry.source === 'debt'
              ? model.debts.find((d) => (d.cycles || []).some((c) => c.id === realId))?.id
              : (model.loans || []).find((l) => (l.actualPayments || []).some((p) => p.id === realId))?.id;
          if (target) navigation.navigate('PayDetail', { kind: entry.source, id: target, backTitle: 'Transaction' });
        }
      : entry.source === 'income'
      ? () => {
          const src = (model.income || []).find((s) => (s.paymentLog || []).some((e) => e.id === entry.id.slice(7)));
          navigation.navigate('Income', src ? { openIncomeId: src.id, openIncomeNonce: Date.now() } : undefined);
        }
      : entry.source === 'saving'
      ? () => {
          const goal = (model.savingsGoals || []).find((g) => (g.contributions || []).some((c) => c.id === entry.id.slice(7)));
          navigation.navigate('Savings', goal ? { openSavingsId: goal.id, openSavingsNonce: Date.now() } : undefined);
        }
      : undefined;

  const Row = ({ label, value, onPress, valueColor, last, dot }: { label: string; value: string; onPress?: () => void; valueColor?: string; last?: boolean; dot?: string | null }) => (
    <TouchableOpacity style={[styles.row, !last && styles.rowLine]} disabled={!onPress} onPress={onPress} activeOpacity={0.6} accessibilityRole={onPress ? 'button' : undefined}>
      <Text style={styles.rowLabel}>{label}</Text>
      {/* The account's own card colour, as a small card shape. */}
      {!!dot && <View style={{ width: 18, height: 12, borderRadius: 3, backgroundColor: dot, marginRight: 8 }} />}
      <Text style={[styles.rowValue, valueColor ? { color: valueColor } : null]} numberOfLines={1}>
        {value}
      </Text>
      {onPress && <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} style={{ marginLeft: 4 }} />}
    </TouchableOpacity>
  );

  return (
    <>
    <KeyboardAwareScrollView pageBounce style={{ flex: 1 }} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.name} numberOfLines={2}>{entry.label}</Text>
        <Text style={[styles.amount, { color: amountColor }]}>
          {sign}
          {formatPeso(entry.amount)}
        </Text>
        <Text style={styles.when}>{whenLabel(entry.date, raw?.createdAt)}</Text>
      </View>

      <View style={styles.group}>
        <GradientFill match={styles.group} />
        <Row label="Category" value={entry.category || 'Uncategorized'} onPress={isManual ? openEdit : undefined} />
        <Row label="Account" value={account ?? (isManual ? 'Not set' : '—')} onPress={isManual ? openEdit : undefined} dot={account ? paymentMethodColor(model, raw?.paymentMethod) : null} />
        <Row label="Paid by" value={paidBy} onPress={isManual ? openEdit : undefined} last={!isManual} />
        {isManual && <Row label="Note" value={raw?.notes?.trim() || 'Add a note'} valueColor={raw?.notes?.trim() ? undefined : colors.gold} onPress={openEdit} last />}
      </View>

      {isManual && (
        <>
          <Text style={styles.header}>Receipt</Text>
          <View style={styles.group}>
            <GradientFill match={styles.group} />
            {raw?.receiptPhoto ? (
              <TouchableOpacity onPress={openEdit} accessibilityLabel="Receipt photo. Tap to change">
                <Image source={{ uri: raw.receiptPhoto }} style={styles.receipt} resizeMode="cover" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.row} onPress={openEdit} accessibilityRole="button">
                <Ionicons name="camera-outline" size={20} color={colors.gold} style={{ marginRight: 10 }} />
                <Text style={[styles.rowLabel, { color: colors.gold }]}>Add a receipt photo</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.footer}>Take a photo or pick one. Only your household can see it.</Text>

          <View style={[styles.group, { marginTop: 24 }]}>
            <GradientFill match={[styles.group, { marginTop: 24 }]} />
            {/* Turns this transaction into a shared expense (or opens the one made from it). */}
            <Row
              label="Split with others"
              value={linkedShare ? `Split ${linkedShare.shares.filter((x) => x.amount > 0).length} ways` : 'No'}
              onPress={() =>
                navigation.navigate('SharedExpenses', linkedShare ? { editExpenseId: linkedShare.id, nonce: Date.now() } : { fromTransactionId: raw!.id, nonce: Date.now() })
              }
            />
            <Row label="Make it repeat" value={rule ? frequencyLabel(rule.frequency) : 'Never'} onPress={() => setRepeatOpen(true)} />
            <Row
              label="Expecting a refund"
              value={typeof refundExpected === 'number' ? `${formatPeso(refundExpected)}${refundReceived ? ' · received' : ''}` : 'No'}
              onPress={openEdit}
              last
            />
          </View>
          {rule && (
            <Text style={styles.footer}>
              {`${describeFrequency(rule)}. Added for you on the day; see all on Transactions › Recurring.`}
            </Text>
          )}
          {typeof refundExpected === 'number' && (
            <TouchableOpacity
              style={[styles.group, styles.action]}
              onPress={() => save(refundReceived ? undoRefund(model, raw!.id) : markRefundReceived(model, raw!.id))}
              accessibilityRole="button"
            >
              <GradientFill match={[styles.group, styles.action]} />
              <Text style={[styles.actionText, { color: colors.gold }]}>{refundReceived ? 'Undo refund received' : 'Mark refund as received'}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity testID="txn-detail-delete" style={[styles.group, styles.action, { marginTop: 24 }]} onPress={confirmDelete} accessibilityRole="button">
            <GradientFill match={[styles.group, styles.action, { marginTop: 24 }]} />
            <Text style={[styles.actionText, { color: colors.negative }]}>Delete transaction</Text>
          </TouchableOpacity>
        </>
      )}

      {!isManual && (
        <>
          <Text style={styles.footer}>This comes from a {SOURCE_NAME[entry.source]?.toLowerCase() ?? 'record'}. Change it there.</Text>
          {linkedOpen && (
            <TouchableOpacity style={[styles.group, styles.action, { marginTop: 16 }]} onPress={linkedOpen} accessibilityRole="button">
              <GradientFill match={[styles.group, styles.action, { marginTop: 16 }]} />
              <Text style={[styles.actionText, { color: colors.gold }]}>Open {SOURCE_NAME[entry.source]}</Text>
            </TouchableOpacity>
          )}
        </>
      )}
      <BottomSheet visible={repeatOpen} onClose={() => setRepeatOpen(false)} title="Make it repeat">
        {[{ key: 'never' as const, label: 'Never' }, ...FREQUENCY_OPTIONS].map((o, i) => {
          const selected = rule ? rule.frequency === o.key : o.key === 'never';
          return (
            <TouchableOpacity
              key={o.key}
              style={[styles.row, i > 0 && styles.rowTop]}
              onPress={() => chooseRepeat(o.key)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text style={styles.rowLabel}>{o.label}</Text>
              {selected && <Ionicons name="checkmark" size={20} color={colors.gold} />}
            </TouchableOpacity>
          );
        })}
        <Text style={[styles.footer, { marginHorizontal: 0, marginTop: 10 }]}>
          The next ones are added for you on the day, with the same amount, category and account.
        </Text>
      </BottomSheet>
      {/* Version 2.2 (canvas W2): who added it, and who last changed it (shared household). */}
      {isLinked && raw && (raw.addedBy || raw.changedBy) && (() => {
        const name = (u: string) => (u === username ? 'you' : u.charAt(0).toUpperCase() + u.slice(1));
        const when = (ms?: number) => {
          if (!ms) return '';
          const d = new Date(ms);
          const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          return d.toDateString() === new Date().toDateString() ? ` · today, ${time}` : ` · ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${time}`;
        };
        return (
          <View style={{ marginTop: 16, alignItems: 'center' }}>
            {!!raw.addedBy && <Text style={styles.whoLine}>{`Added by ${name(raw.addedBy)}${when(raw.createdAt)}`}</Text>}
            {!!raw.changedBy && <Text style={styles.whoLine}>{`Changed by ${name(raw.changedBy)}${when(raw.changedAt)}`}</Text>}
          </View>
        );
      })()}
    </KeyboardAwareScrollView>
    {editing && raw && (
      <View style={{ position: 'absolute', width: 0, height: 0 }}>
        <TransactionsScreen
          formOnly
          editTxnId={raw.id}
          onFormClosed={() => {
            setEditing(false);
            const latest = getModel();
            if (latest && !(latest.manualTransactions || []).some((m) => m.id === raw.id)) navigation.goBack();
          }}
        />
      </View>
    )}
    </>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: { paddingHorizontal: 16, paddingBottom: 40 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    emptyText: { fontSize: 17, color: colors.inkDim, textAlign: 'center' },
    hero: { alignItems: 'center', paddingVertical: 16, marginBottom: 12 },
    name: { fontSize: 20, fontWeight: '600', color: colors.ink, textAlign: 'center' },
    amount: { fontSize: 40, lineHeight: 46, fontWeight: '700', letterSpacing: -0.5, marginTop: 4 },
    when: { fontSize: 15, color: colors.inkDim, marginTop: 4 },
    group: { backgroundColor: colors.navy3, borderRadius: 12, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', minHeight: 50, paddingHorizontal: 16, paddingVertical: 10 },
    rowTop: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.navy4 },
    rowLabel: { fontSize: 17, color: colors.ink, flex: 1 },
    rowValue: { fontSize: 17, color: colors.inkDim, flexShrink: 1, textAlign: 'right' },
    header: { fontSize: 13, fontWeight: '600', color: colors.inkDim, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 24, marginBottom: 6, marginLeft: 16 },
    footer: { fontSize: 13, color: colors.inkDim, marginTop: 6, marginHorizontal: 16 },
    whoLine: { fontSize: 13, color: colors.inkFaint ?? colors.inkDim, marginTop: 2 },
    receipt: { width: '100%', height: 200 },
    action: { minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
    actionText: { fontSize: 17 },
  });
}
