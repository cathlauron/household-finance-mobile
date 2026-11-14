import React, { useLayoutEffect, useMemo, useState } from 'react';
import { goToMain } from '../navigation/goToMain';
import { animateNextLayout } from '../animateLayout';
import { dateText } from '../dateUtils';
import { alertDidntWork } from '../messages';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { TouchableOpacity } from '../components/Tap';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/AppText';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { headerButtonText } from '../navigation/LargeHeader';
import { useTheme } from '../ThemeContext';
import AccountsScreen from './AccountsScreen';
import { showMoney } from '../fx';
import { useData } from '../DataContext';
import { formatPeso, accountCurrentBalance } from '../balanceProjection';
import { buildTransactionsList } from '../transactions';
import { DEFAULT_GROUP_COLORS, AccountGroup } from '../components/AccountCard';
import type { ThemeColors } from '../theme';
import type { HouseholdModel, PaymentMethod } from '../types';
import GradientFill from '../components/GradientFill';
import { cardFaceColors, CardFaceFill } from '../components/CardFace';
import AmountInput from '../components/AmountInput';
import { MarkedLabel } from '../components/MarkedLabel';
import BottomSheet from '../components/BottomSheet';
import { TextInput } from '../components/AppText';
import { showLeafTick } from '../components/LeafTick';
import DeleteRow from '../components/DeleteRow';
import { withoutAccount } from '../deleteRecords';
import { hapticSelection } from '../haptics';
import { accountTrail } from '../accountTrail';
import { HIDDEN_AMOUNT, useHideAmounts } from '../hideAmounts';
import { cardOwed, nextStatementDue, installmentsOnCard, savedBalanceAfterAnswer } from '../creditCards';

import { WhoFootnote } from '../components/WhoLogged';
// Redesign: the Card page from the Finance Flow mockup, opened by tapping a card in
// Home's Wallet. Shows the card with its balance, how much was spent from it this
// week (a bar per day), and its latest transactions. "Move money" moves money
// between your accounts; "Edit card" opens Accounts.

const GROUP_LABEL: Record<AccountGroup, string> = { cash: 'Cash', debit: 'Debit', credit: 'Credit' };
const GROUP_ICON: Record<AccountGroup, React.ComponentProps<typeof Ionicons>['name']> = {
  cash: 'cash-outline',
  debit: 'card-outline',
  credit: 'card',
};
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Every transaction (id from the Transactions list) paid from this account.
const TRAIL_ROWS = 10;

export function idsForAccount(model: HouseholdModel, group: AccountGroup, accountId: string): Set<string> {
  // Sweep 2026-11-14: the same rule the balance uses. Cash paid with no cash account picked
  // belongs to the first cash account only (it used to show under every one).
  const firstCashId = model.balanceAccounts.cash[0]?.id;
  const match = (pm?: PaymentMethod) => !!pm && pm.type === group && (pm.accountId === accountId || (group === 'cash' && !pm.accountId && accountId === firstCashId));
  const ids = new Set<string>();
  (model.manualTransactions || []).forEach((t) => match(t.paymentMethod) && ids.add(t.id));
  [...model.bills, ...model.debts].forEach((r) => (r.cycles || []).forEach((c) => match(c.paymentMethod) && ids.add((model.bills.includes(r as any) ? 'bill-' : 'debt-') + c.id)));
  (model.loans || []).forEach((l) => (l.actualPayments || []).forEach((p) => match(p.paymentMethod) && ids.add('loan-' + p.id)));
  // Paydays that went into it and savings moved from or to it are its transactions too.
  (model.income || []).forEach((s) => (s.paymentLog || []).forEach((e) => match(e.paymentMethod) && ids.add('income-' + e.id)));
  (model.savingsGoals || []).forEach((g) => (g.contributions || []).forEach((c) => match(c.paymentMethod) && ids.add('saving-' + c.id)));
  return ids;
}

export default function CardDetailScreen() {
  const { colors, isDark } = useTheme();
  const { model, saveModel, getModel, isLinked } = useData();
  const { hidden } = useHideAmounts(); // Cath, 2026-11-14 (H-80): Home's eye covers this page too
  const [allUpdates, setAllUpdates] = useState(false);
  // Version 2.2 (Cath): Edit card opens the form right on this page.
  const [editing, setEditing] = useState(false);
  // Version 3 (approved K4): the one-time question, "Ask me later" hides it for this visit.
  const [askLater, setAskLater] = useState(false);
  const [answer, setAnswer] = useState<'canUse' | 'owe' | null>(null);
  const [limitInput, setLimitInput] = useState<number | ''>('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [dLimit, setDLimit] = useState<number | ''>('');
  const [dDueDay, setDDueDay] = useState('');
  const [dMin, setDMin] = useState<number | ''>('');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const group: AccountGroup = route.params?.group;
  const accountId: string = route.params?.id;
  const styles = makeStyles(colors);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: '',
      headerBackTitle: route.params?.backTitle ?? 'Home',
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('Transfer', group === 'credit' ? { toGroup: group, toId: accountId } : { fromGroup: group, fromId: accountId })}
          accessibilityRole="button"
          testID="card-move-money"
        >
          <Text style={[headerButtonText, { color: colors.gold }]}>{group === 'credit' ? 'Pay card' : 'Move money'}</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, colors.gold, group, accountId]);

  const account = model?.balanceAccounts[group]?.find((a) => a.id === accountId);

  const data = useMemo(() => {
    if (!model || !account) return null;
    const ids = idsForAccount(model, group, accountId);
    const list = buildTransactionsList(model).filter((t) => ids.has(t.rawId ?? t.id) || ids.has(t.id));
    list.sort((a, b) => (a.date < b.date ? 1 : -1));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay()); // Sunday
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = iso(d);
      const v = list.filter((t) => t.date === key && t.direction === 'out').reduce((s, t) => s + t.amount, 0);
      return { key, v, isToday: key === iso(today), future: d > today };
    });
    // Cath, 2026-11-14 (mockup balance-before, Place A): everything that moved this account,
    // newest first, each with what the account had before and after.
    const trail = accountTrail(model, group, accountId);
    return { list, trail, days, week: days.reduce((s, d) => s + d.v, 0) };
  }, [model, account, group, accountId]);

  if (!model || !account || !data) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>This account isn't here any more.</Text>
      </View>
    );
  }

  // Live balance: saved balance plus anything paid from or into it since.
  const amount = accountCurrentBalance(model, group, account);
  const chip = account.color || DEFAULT_GROUP_COLORS[group];
  const maxDay = Math.max(1, ...data.days.map((d) => d.v));
  const isCredit = group === 'credit';
  const owed = isCredit ? cardOwed(account, amount) : null;
  const due = isCredit ? nextStatementDue(account.statementDueDay) : null;
  const parts = isCredit ? installmentsOnCard(model, accountId) : [];
  const short = (d: Date) => dateText(d);
  const fp = (n: number) => (hidden ? HIDDEN_AMOUNT : formatPeso(n));
  const sm = (n: number) => (hidden ? HIDDEN_AMOUNT : showMoney(account, n));
  const noun = group === 'credit' ? 'card' : 'account'; // H-81: a bank or cash account is not a card
  const todayKey = iso(new Date());

  function updateCard(patch: Partial<typeof account>) {
    if (!model || !account) return Promise.resolve();
    return saveModel({
      ...model,
      balanceAccounts: { ...model.balanceAccounts, credit: model.balanceAccounts.credit.map((a) => (a.id === accountId ? { ...a, ...patch } : a)) },
    });
  }

  async function saveAnswer() {
    if (!answer) return Alert.alert('Pick one', `Is ${formatPeso(amount)} what you can still use, or what you owe?`);
    if (limitInput === '' || limitInput <= 0) return Alert.alert("What's the limit?", 'Your credit limit is on your statement or in the card app.');
    if (limitInput < amount) return Alert.alert('Check the limit', `The limit can't be less than ${formatPeso(amount)}.`);
    const saved = typeof account!.amount === 'number' ? account!.amount : 0;
    await updateCard({ creditLimit: limitInput, amount: savedBalanceAfterAnswer(saved, amount, answer, limitInput) });
    showLeafTick('Saved');
  }

  function openDetails() {
    setDLimit(account!.creditLimit ?? '');
    setDDueDay(account!.statementDueDay ? String(account!.statementDueDay) : '');
    setDMin(account!.minPayment ?? '');
    setDetailsOpen(true);
  }

  async function saveDetails() {
    const day = parseInt(dDueDay, 10);
    if (dDueDay.trim() && !(day >= 1 && day <= 31)) return Alert.alert('Due day', 'Use a day of the month, 1 to 31.');
    if (dLimit === '' || dLimit <= 0) return Alert.alert('Credit limit', 'Enter the card\'s credit limit.');
    if (dLimit < amount) return Alert.alert('Check the limit', `The limit can't be less than the ${formatPeso(amount)} you can still use.`);
    await updateCard({
      creditLimit: dLimit,
      statementDueDay: dDueDay.trim() ? day : undefined,
      minPayment: dMin === '' || dMin <= 0 ? undefined : dMin,
    });
    setDetailsOpen(false);
    showLeafTick('Saved');
  }

  return (
    <>
    <KeyboardAwareScrollView pageBounce contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* The same colour and gradient as this card in Home's Wallet. */}
      <View style={[styles.card, cardFaceColors(chip, isDark)]}>
        <CardFaceFill color={chip} radius={17} />
        <View style={styles.cardHead}>
          <View style={styles.nameRow}>
            <View style={[styles.chip, { backgroundColor: chip }]} />
            <Text style={styles.cardName} numberOfLines={1}>{account.name || GROUP_LABEL[group]}</Text>
          </View>
          <View style={[styles.typeTag, { backgroundColor: colors.navy1 }]}>
            <Ionicons name={GROUP_ICON[group]} size={11} color={colors.inkDim} />
            <Text style={styles.type}>{GROUP_LABEL[group]}</Text>
          </View>
        </View>
        <View style={{ marginTop: 'auto', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.meta}>{isCredit ? 'Available to use' : 'Balance'}</Text>
            <Text style={[styles.balance, { color: amount < 0 && !hidden ? colors.negative : colors.positive }]}>{sm(amount)}</Text>
          </View>
          {/* Version 2.2 (canvas D3): the last 4 digits at the bottom right of the card. */}
          {!!account.last4 && group !== 'cash' && (
            <Text style={{ fontSize: 16, letterSpacing: 1.5, color: colors.inkDim, paddingBottom: 5 }} accessibilityLabel={`ending in ${account.last4.split('').join(' ')}`}>•••• {account.last4}</Text>
          )}
        </View>
      </View>

      {/* Version 3 (Cath): the question sits right under the card, above This week, so the
          keyboard doesn't cover it. */}
      {/* Version 3 (approved K4): one quick question before the credit extras show. */}
      {isCredit && owed === null && !askLater && (
        <View style={[styles.group, { padding: 16, marginTop: 20, gap: 10 }]} testID="card-setup">
          <GradientFill match={[styles.group, { padding: 16, marginTop: 20 }]} />
          <Text style={styles.qTitle}>One quick question about {account.name || 'this card'}</Text>
          <Text style={styles.meta}>Cards now track the limit, what you owe and what you can still use. Nothing changes until you answer.</Text>
          <Text style={[styles.rowTitle, { marginTop: 4 }]}>Is {fp(amount)}…</Text>
          {(
            [
              ['canUse', 'What I can still use'],
              ['owe', 'What I owe'],
            ] as const
          ).map(([id, label]) => (
            <TouchableOpacity
              key={id}
              onPress={() => { hapticSelection(); setAnswer(id); }}
              style={[styles.choice, { borderColor: answer === id ? colors.gold : colors.navy4 }]}
              accessibilityRole="radio"
              accessibilityState={{ selected: answer === id }}
            >
              <Ionicons name={answer === id ? 'radio-button-on' : 'radio-button-off'} size={20} color={answer === id ? colors.gold : colors.inkFaint} />
              <Text style={styles.rowTitle}>{label}</Text>
            </TouchableOpacity>
          ))}
          <View style={styles.inlineRow}>
            <Text style={styles.rowTitle}>Credit limit</Text>
            <AmountInput style={styles.inlineAmount} value={limitInput} onChangeAmount={setLimitInput} />
          </View>
          <TouchableOpacity onPress={saveAnswer} style={[styles.primary, { backgroundColor: colors.buttonFill }]} accessibilityRole="button" testID="card-setup-save">
            <Text style={[styles.primaryText, { color: colors.onButton }]}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setAskLater(true)} style={{ alignSelf: 'center', padding: 6 }} accessibilityRole="button">
            <Text style={[styles.link, { fontWeight: '700' }]}>Ask me later</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.group, { padding: 16, marginTop: 20 }]}>
        <GradientFill match={[styles.group, { padding: 16, marginTop: 20 }]} />
        <Text style={styles.meta}>This week</Text>
        <Text style={styles.week}>{sm(data.week)}</Text>
        <Text style={styles.meta}>spent from this {noun}</Text>
        <View style={styles.bars} accessibilityLabel={`Spending each day this week: ${data.days.map((d) => Math.round(d.v)).join(', ')} pesos`}>
          {data.days.map((d, i) => (
            <View key={d.key} style={styles.barCol}>
              <View
                style={[
                  styles.bar,
                  { height: Math.max(4, (d.v / maxDay) * 56), backgroundColor: d.isToday ? colors.gold : d.future ? colors.navy1 : `${colors.gold}55` },
                ]}
              />
              <Text style={[styles.dayLetter, d.isToday && { color: colors.ink, fontWeight: '700' }]}>{DAY_LETTERS[i]}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.sectionHead}>
        <Text style={styles.header}>Latest transactions</Text>
        {data.trail.length > 0 && (
          <TouchableOpacity
            onPress={() => goToMain(navigation, { screen: 'Transactions', params: { accountFilter: `${group}:${accountId}`, accountFilterName: account.name || GROUP_LABEL[group], filterNonce: Date.now() } })}
            accessibilityRole="button"
          >
            <Text style={styles.link}>See all</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.group}>
        <GradientFill match={styles.group} />
        {data.trail.length === 0 ? (
          <Text style={[styles.meta, { padding: 16 }]}>Nothing paid from this {noun} yet. Pick it as the account when you add a transaction.</Text>
        ) : (
          data.trail.slice(0, TRAIL_ROWS).map((t, i) => {
            const moved = t.kind !== 'txn'; // money between your own accounts: grey, never spending
            const color = moved ? colors.inkDim : t.effect > 0 ? colors.positive : t.sub === 'Savings' ? colors.saving : colors.negative;
            const d = new Date(t.date + 'T00:00:00');
            const diff = Math.round((new Date().setHours(0, 0, 0, 0) - d.getTime()) / 86400000);
            const when = diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : dateText(d);
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.row, i > 0 && styles.line]}
                onPress={() =>
                  t.kind === 'move' ? navigation.navigate('TransferDetail', { id: t.id }) : t.kind === 'invest' ? navigation.navigate('Investments', { openId: t.investmentId }) : navigation.navigate('TransactionDetail', { id: t.id })
                }
                accessibilityRole="button"
              >
                <View style={[styles.tile, { backgroundColor: moved ? colors.navy4 : t.effect > 0 ? colors.okBg : t.sub === 'Savings' ? colors.warnBg : colors.errorBg }]}>
                  <Ionicons name={t.kind === 'move' ? 'swap-horizontal' : t.kind === 'invest' ? 'trending-up-outline' : t.effect > 0 ? 'arrow-down' : t.sub === 'Savings' ? 'leaf-outline' : 'arrow-up'} size={17} color={color} />
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{t.label}</Text>
                  <Text style={styles.meta} numberOfLines={1}>{when} · {t.sub}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.rowAmount, { color }]}>
                    {hidden ? '' : t.effect > 0 ? '+' : '−'}
                    {sm(Math.abs(t.effect))}
                  </Text>
                  {t.before !== null && t.after !== null ? (
                    <Text style={styles.trail} testID={`trail-${t.id}`}>
                      {sm(t.before)}
                      {' → '}
                      {sm(t.after)}
                    </Text>
                  ) : (
                    <Text style={styles.trail} testID={`trail-${t.id}`}>
                      {t.date > todayKey ? 'not counted yet' : 'dated before your last balance update'}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
      <Text style={[styles.meta, { marginHorizontal: 16, marginTop: 6 }]}>The small line is what {account.name || 'this account'} had before and after. Older ones are worked out backwards from the balance now.</Text>

      {/* Version 3 (approved K1c): the credit card extras. */}
      {isCredit && owed !== null && (
        <>
          <View style={styles.sectionHead}>
            <Text style={styles.header}>Credit card</Text>
            <TouchableOpacity onPress={openDetails} accessibilityRole="button" testID="card-details">
              <Text style={styles.link}>Details</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.group}>
            <GradientFill match={styles.group} />
            <View style={styles.kvRow}>
              <Text style={styles.rowTitle}>Limit</Text>
              <Text style={styles.kvVal}>{fp(account.creditLimit as number)}</Text>
            </View>
            <View style={[styles.kvRow, styles.line]}>
              <Text style={styles.rowTitle}>You owe</Text>
              <Text style={styles.kvVal}>{fp(owed)}</Text>
            </View>
            <View style={[styles.kvRow, styles.line]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Next statement</Text>
                <Text style={styles.meta}>
                  {due ? `${account.minPayment ? `min ${fp(account.minPayment).replace('.00', '')} · ` : ''}due ${short(due)}` : 'Add the due day in Details'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('Transfer', { toGroup: 'credit', toId: accountId })}
                style={[styles.payBtn, { backgroundColor: colors.buttonFill }]}
                accessibilityRole="button"
                testID="card-pay"
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.onButton }}>Pay</Text>
              </TouchableOpacity>
            </View>
            {parts.map((p) => (
              <View key={p.id} style={[styles.kvRow, styles.line]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>Installments</Text>
                  <Text style={styles.meta}>
                    {p.label} · {p.left} of {p.count} left · {fp(p.perMonth)} a month
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      <BottomSheet
        visible={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        grouped
        header={
          <View style={styles.sheetHead}>
            <TouchableOpacity onPress={() => setDetailsOpen(false)} accessibilityRole="button" hitSlop={10}>
              <Text style={[styles.link, { fontSize: 17, fontWeight: '400' }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.rowTitle, { fontWeight: '700' }]}>Card details</Text>
            <TouchableOpacity onPress={saveDetails} accessibilityRole="button" hitSlop={10} testID="card-details-save">
              <Text style={[styles.link, { fontSize: 17 }]}>Save</Text>
            </TouchableOpacity>
          </View>
        }
      >
        <View style={[styles.group, { marginBottom: 8 }]}>
          <View style={styles.inlineRow}>
            <MarkedLabel text="Credit limit" mark="required" style={styles.rowTitle} />
            <AmountInput style={styles.inlineAmount} value={dLimit} onChangeAmount={setDLimit} />
          </View>
          <View style={[styles.inlineRow, styles.line]}>
            <MarkedLabel text="Statement due day" mark="optional" style={styles.rowTitle} />
            <TextInput
              style={styles.dayInput}
              value={dDueDay}
              onChangeText={(t) => setDDueDay(t.replace(/[^0-9]/g, '').slice(0, 2))}
              keyboardType="number-pad"
              placeholder="e.g. 5"
              placeholderTextColor={colors.inkFaint}
            />
          </View>
          <View style={[styles.inlineRow, styles.line]}>
            <MarkedLabel text="Minimum payment" mark="optional" style={styles.rowTitle} />
            <AmountInput style={styles.inlineAmount} value={dMin} onChangeAmount={setDMin} />
          </View>
        </View>
        <Text style={[styles.meta, { marginHorizontal: 16, marginBottom: 16 }]}>
          You owe is the limit minus what you can still use. Paying the card frees up the limit again.
        </Text>
      </BottomSheet>

      {/* Version 2.2 (canvas B1): every balance typed in by hand, newest first. */}
      {(account?.balanceLog?.length ?? 0) > 0 && (() => {
        const log = account!.balanceLog!;
        const shown = allUpdates ? log : log.slice(0, 5);
        const when = (ms: number) => {
          const d = new Date(ms);
          const today = new Date();
          const sameDay = d.toDateString() === today.toDateString();
          const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          return sameDay ? `Today, ${time}` : `${dateText(d)}, ${time}`;
        };
        const who = (by?: string) => (isLinked && by ? ` · by ${by.charAt(0).toUpperCase() + by.slice(1)}` : '');
        return (
          <>
            <View style={styles.sectionHead}>
              <Text style={styles.header}>Balance updates</Text>
              {log.length > 5 && (
                <TouchableOpacity onPress={() => { animateNextLayout(); setAllUpdates(!allUpdates); }} hitSlop={8}>
                  <Text style={styles.link}>{allUpdates ? 'Show fewer' : 'See all'}</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.group}>
              <GradientFill match={styles.group} />
              {shown.map((e, i) => {
                const diff = e.from === null ? null : Math.round((e.to - e.from) * 100) / 100;
                return (
                  <View key={e.at + ':' + i} style={[styles.row, i > 0 && styles.line]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{e.from === null ? `First balance ${sm(e.to)}` : `${sm(e.from)} → ${sm(e.to)}`}</Text>
                      <Text style={styles.meta}>{when(e.at) + who(e.by)}</Text>
                    </View>
                    {diff !== null && diff !== 0 && (
                      <Text style={[styles.rowAmount, { color: diff < 0 ? colors.negative : colors.positive }]}>{`${hidden ? '' : diff < 0 ? '−' : '+'}${sm(Math.abs(diff))}`}</Text>
                    )}
                  </View>
                );
              })}
            </View>
            <Text style={[styles.meta, { marginHorizontal: 16, marginTop: 6 }]}>Each time the balance was typed in by hand. Not spending.</Text>
          </>
        );
      })()}

      <TouchableOpacity style={[styles.group, styles.action]} onPress={() => setEditing(true)} accessibilityRole="button">
        <GradientFill match={[styles.group, styles.action]} />
        <Text style={[styles.actionText, { color: colors.gold }]}>Edit {noun}</Text>
      </TouchableOpacity>
      {/* Version 2.2 (Cath): Remove at the bottom of the page, same as inside Edit card. */}
      <DeleteRow
        label="Remove account"
        testID="card-detail-delete"
        onPress={() =>
          Alert.alert('Remove this account?', 'Removes the account and its balance. Cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Remove',
              style: 'destructive',
              onPress: () => {
                const latest = getModel() ?? model;
                if (!latest) return;
                navigation.goBack();
                saveModel(withoutAccount(latest, group, accountId)).catch(() => Alert.alert(...alertDidntWork(`remove this ${noun}`)));
              },
            },
          ])
        }
      />
      <WhoFootnote addedBy={account?.addedBy} createdAt={account?.createdAt} changedBy={account?.changedBy} changedAt={account?.changedAt} />
    </KeyboardAwareScrollView>
    {editing && (
      <View style={{ position: 'absolute', width: 0, height: 0 }}>
        <AccountsScreen
          formOnly
          editGroup={group}
          editAccountId={accountId}
          onFormClosed={() => {
            setEditing(false);
            const latest = getModel();
            if (latest && !(latest.balanceAccounts[group] || []).some((a) => a.id === accountId)) navigation.goBack();
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
    emptyText: { fontSize: 17, color: colors.inkDim },
    card: {
      height: 190,
      borderRadius: 18,
      padding: 18,
      borderWidth: 1,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
    chip: { width: 12, height: 12, borderRadius: 3 },
    cardName: { fontSize: 17, fontWeight: '600', color: colors.ink, flexShrink: 1 },
    typeTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
    type: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase', color: colors.inkDim },
    balance: { fontSize: 30, lineHeight: 36, fontWeight: '700' },
    group: { backgroundColor: colors.navy3, borderRadius: 12, overflow: 'hidden' },
    meta: { fontSize: 13, color: colors.inkDim },
    week: { fontSize: 22, fontWeight: '700', color: colors.ink, marginVertical: 2 },
    bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 76, marginTop: 14 },
    barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
    bar: { width: '100%', borderRadius: 6 },
    dayLetter: { fontSize: 11, color: colors.inkDim },
    sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 24, marginBottom: 6, marginHorizontal: 16 },
    header: { fontSize: 13, fontWeight: '600', color: colors.inkDim, textTransform: 'uppercase', letterSpacing: 0.3 },
    link: { fontSize: 15, fontWeight: '600', color: colors.gold },
    row: { flexDirection: 'row', alignItems: 'center', minHeight: 60, paddingHorizontal: 16, paddingVertical: 10 },
    trail: { fontSize: 12, color: colors.inkDim, marginTop: 2 },
    line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    tile: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    rowTitle: { fontSize: 17, color: colors.ink },
    rowAmount: { fontSize: 17, fontWeight: '600' },
    action: { minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
    actionText: { fontSize: 17 },
    qTitle: { fontSize: 18, fontWeight: '800', color: colors.ink },
    choice: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5 },
    inlineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 50, paddingHorizontal: 16 },
    inlineAmount: { flex: 1, backgroundColor: 'transparent', marginBottom: 0, minHeight: 44, justifyContent: 'flex-end' },
    dayInput: { flex: 1, fontSize: 17, color: colors.ink, textAlign: 'right', paddingVertical: 12 },
    primary: { borderRadius: 28, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
    primaryText: { fontSize: 17, fontWeight: '700' },
    kvRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 54, paddingHorizontal: 16, paddingVertical: 8 },
    kvVal: { fontSize: 17, fontWeight: '600', color: colors.ink },
    payBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999 },
    sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12, minHeight: 40 },
  });
}
