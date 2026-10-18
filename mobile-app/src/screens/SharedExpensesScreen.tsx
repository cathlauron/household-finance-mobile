import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { showLeafTick } from '../components/LeafTick';
import LoadingView from '../components/LoadingView';
import { View, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from '../components/AppText';
import { headerButtonText } from '../navigation/LargeHeader';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { PullToRefreshScrollView } from '../PullToRefreshScrollView';
import GradientFill from '../components/GradientFill';
import { formatPeso } from '../balanceProjection';
import { getMyPersonId, setMyPersonId, subscribeToMyPersonId } from '../myPerson';
import { sharedMembers, pairBalances, myNet, personLabel, personIsUsed } from '../sharedExpenses';
import { makeId } from '../utils';
import { hapticLight, hapticSelection } from '../haptics';
import type { ThemeColors } from '../theme';
import type { SharedExpense, SharedSettlement, PaymentMethod, ManualTransaction } from '../types';
import AmountInput from '../components/AmountInput';
import { accountProblem } from '../components/AccountPicker';
import { AccountChoices } from '../components/SimpleForm';
import { useNavigation, useRoute } from '@react-navigation/native';
import BottomSheet from '../components/BottomSheet';
import DateField from '../components/DateField';
import Button from '../components/Button';
import { todayISO } from '../dateUtils';
import { equalShares } from '../sharedExpenses';
import { SheetBar, BigAmount, FormGroup, InputRow, AmountRow, PickerRow, Footnote, Choices, useOpenRow } from '../components/SimpleForm';

// Redesign: Shared Expenses (Plan › Shared Expenses), from the Finance Flow mockup.
// - Overall: what you're owed or owe in total.
// - Balances: one netted number per pair of people.
// - People: who you share with (and which one is you).
// - Activity: every shared expense, newest first; tap one to edit or delete it.
// Add in the top bar adds a shared expense: who paid, and how it's split (equally
// between the people ticked, or custom amounts that add up to the total).
// A shared expense is a record of who owes whom; it doesn't change your account
// balances (log your own spending as a normal transaction).

function shortDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function SharedExpensesScreen() {
  const { colors } = useTheme();
  const { model, saveModel, username } = useData();
  const styles = makeStyles(colors);
  const [myId, setMyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const navigation = useNavigation<any>();

  // The add / edit expense sheet.
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [paidBy, setPaidBy] = useState<string>('');
  const [date, setDate] = useState(todayISO());
  const [mode, setMode] = useState<'equal' | 'custom'>('equal');
  const [included, setIncluded] = useState<string[]>([]);
  const [custom, setCustom] = useState<Record<string, number | ''>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [openRow, toggleRow] = useOpenRow(sheetOpen);
  // Set when the sheet was opened from a transaction's "Split with others".
  const [fromTxnId, setFromTxnId] = useState<string | null>(null);
  const route = useRoute<any>();

  // Settle up, opened under a balance line ("from|to" of that pair).
  const [settleKey, setSettleKey] = useState<string | null>(null);
  const [settleAmount, setSettleAmount] = useState<number | ''>('');
  const [settleNote, setSettleNote] = useState('');
  const [settlePm, setSettlePm] = useState<PaymentMethod | undefined>(undefined);
  const [settleError, setSettleError] = useState('');

  function openAdd(): boolean {
    if (!model) return false;
    const ids = model.sharedMembers ?? [];
    if (ids.length < 2) {
      Alert.alert('Add people first', 'Add at least two people (including you) under People, then add a shared expense.');
      return false;
    }
    setFromTxnId(null);
    setEditingId(null);
    setLabel('');
    setAmount('');
    setPaidBy(myId && ids.includes(myId) ? myId : ids[0]);
    setDate(todayISO());
    setMode('equal');
    setIncluded(ids);
    setCustom({});
    setError('');
    setSheetOpen(true);
    return true;
  }

  // Coming from a transaction: "Split with others" starts a shared expense filled in from
  // it (you paid), or opens the one already made from it.
  const handledNonce = React.useRef<number | undefined>(undefined);
  useEffect(() => {
    const p = route.params;
    if (!model || !p?.nonce || handledNonce.current === p.nonce) return;
    handledNonce.current = p.nonce;
    if (p.editExpenseId) {
      const e = (model.sharedExpenses ?? []).find((x) => x.id === p.editExpenseId);
      if (e) openEdit(e);
      return;
    }
    const t = (model.manualTransactions || []).find((x) => x.id === p.fromTransactionId);
    if (t && openAdd()) {
      setAmount(t.amount);
      setLabel(t.label);
      setDate(t.date);
      setFromTxnId(t.id);
    }
  }, [route.params, model]);

  function openEdit(e: SharedExpense) {
    setFromTxnId(e.transactionId ?? null);
    setEditingId(e.id);
    setLabel(e.label);
    setAmount(e.amount);
    setPaidBy(e.paidBy);
    setDate(e.date);
    setMode(e.splitMode);
    setIncluded(e.shares.filter((x) => x.amount > 0).map((x) => x.personId));
    setCustom(Object.fromEntries(e.shares.map((x) => [x.personId, x.amount])));
    setError('');
    setSheetOpen(true);
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={openAdd} accessibilityRole="button" accessibilityLabel="Add a shared expense" testID="shared-add" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[headerButtonText, { color: colors.gold }]}>Add</Text>
        </TouchableOpacity>
      ),
    });
  });

  useEffect(() => {
    if (!username) return;
    getMyPersonId(username).then(setMyId);
    return subscribeToMyPersonId(setMyId);
  }, [username]);

  const members = useMemo(() => (model ? sharedMembers(model) : []), [model]);
  const balances = useMemo(() => (model ? pairBalances(model) : []), [model]);

  if (!model) return <LoadingView />;

  const net = myNet(balances, myId);
  const others = members.filter((p) => p.id !== myId);
  const notYetMembers = model.people.filter((p) => !(model.sharedMembers ?? []).includes(p.id));

  async function addMember(personId: string, peopleNext = model!.people) {
    const ids = [...new Set([...(model!.sharedMembers ?? []), personId])];
    await saveModel({ ...model!, people: peopleNext, sharedMembers: ids });
    hapticLight();
  }

  async function addNewPerson() {
    const name = newName.trim();
    if (!name) return;
    const existing = model!.people.find((p) => p.name.trim().toLowerCase() === name.toLowerCase());
    if (existing) {
      await addMember(existing.id);
    } else {
      const person = { id: makeId('person'), name };
      await addMember(person.id, [...model!.people, person]);
    }
    setNewName('');
    setAdding(false);
  }

  function removeMember(personId: string) {
    if (personIsUsed(model!, personId)) {
      Alert.alert("Can't remove yet", 'This person is part of a shared expense or payment. Settle up and remove those first.');
      return;
    }
    Alert.alert(`Remove ${personLabel(model!, personId, null)}?`, 'They will no longer show in Shared Expenses.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => saveModel({ ...model!, sharedMembers: (model!.sharedMembers ?? []).filter((id) => id !== personId) }),
      },
    ]);
  }

  async function markMe(personId: string) {
    if (!username) return;
    hapticSelection();
    await setMyPersonId(username, personId);
    if (!(model!.sharedMembers ?? []).includes(personId)) await addMember(personId);
  }

  const total = typeof amount === 'number' ? amount : 0;
  const customSum = Math.round(Object.entries(custom).reduce((sum, [, v]) => sum + (typeof v === 'number' ? v : 0), 0) * 100) / 100;
  const customLeft = Math.round((total - customSum) * 100) / 100;
  const splitText =
    mode === 'equal'
      ? included.length ? `Split equally between ${included.length} ${included.length === 1 ? 'person' : 'people'}` : 'Choose who shares it'
      : 'Custom amounts';
  const footnote =
    mode === 'equal'
      ? included.length && total > 0 ? `Each person's share is about ${formatPeso(total / included.length)}.` : ''
      : total > 0 ? (Math.abs(customLeft) < 0.01 ? 'The amounts add up to the total.' : customLeft > 0 ? `${formatPeso(customLeft)} still to assign.` : `${formatPeso(-customLeft)} more than the total.`) : '';

  async function saveExpense() {
    if (!model) return;
    if (total <= 0) return setError('Enter the total amount.');
    if (!label.trim()) return setError('Say what it was for.');
    if (!paidBy) return setError('Choose who paid.');
    let shares: { personId: string; amount: number }[];
    if (mode === 'equal') {
      if (included.length === 0) return setError('Choose who shares it.');
      shares = equalShares(total, included);
    } else {
      if (Math.abs(customLeft) >= 0.01) return setError('The amounts need to add up to the total.');
      shares = Object.entries(custom)
        .map(([personId, v]) => ({ personId, amount: typeof v === 'number' ? v : 0 }))
        .filter((x) => x.amount > 0);
    }
    const record: SharedExpense = {
      id: editingId ?? makeId('shx'),
      date,
      label: label.trim(),
      amount: total,
      paidBy,
      shares,
      splitMode: mode,
      ...(fromTxnId ? { transactionId: fromTxnId } : {}),
      createdAt: editingId ? (model.sharedExpenses ?? []).find((x) => x.id === editingId)?.createdAt ?? Date.now() : Date.now(),
    };
    const list = model.sharedExpenses ?? [];
    setSaving(true);
    try {
      await saveModel({ ...model, sharedExpenses: editingId ? list.map((x) => (x.id === editingId ? record : x)) : [...list, record] });
      hapticLight();
      showLeafTick(editingId ? 'Saved' : 'Added');
      setSheetOpen(false);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function deleteExpense() {
    if (!model || !editingId) return;
    Alert.alert('Delete this shared expense?', 'Balances will be worked out again without it.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await saveModel({ ...model, sharedExpenses: (model.sharedExpenses ?? []).filter((x) => x.id !== editingId) });
          setSheetOpen(false);
        },
      },
    ]);
  }

  function openSettle(from: string, to: string, amt: number) {
    hapticSelection();
    setSettleKey(`${from}|${to}`);
    setSettleAmount(amt);
    setSettleNote('');
    setSettlePm(undefined);
    setSettleError('');
  }

  // Logs a payment from `from` to `to`. If you were part of it and picked an account,
  // the money also goes out of (or into) that account as a transaction.
  async function logSettlement(from: string, to: string) {
    if (!model) return;
    const amt = typeof settleAmount === 'number' ? settleAmount : 0;
    if (amt <= 0) return setSettleError('Enter how much was paid.');
    const iPaid = from === myId;
    const iGot = to === myId;
    let manualTransactions = model.manualTransactions || [];
    let transactionId: string | undefined;
    if (settlePm && (iPaid || iGot)) {
      const problem = accountProblem(model, iPaid ? 'out' : 'in', amt, settlePm);
      if (problem) return setSettleError(problem);
      const txn: ManualTransaction = {
        id: makeId('txn'),
        date: todayISO(),
        label: iPaid ? `Paid ${name(to)} back` : `${name(from)} paid you back`,
        amount: amt,
        direction: iPaid ? 'out' : 'in',
        owner: 'shared',
        category: 'Shared expenses',
        notes: settleNote.trim(),
        paymentMethod: settlePm,
        createdAt: Date.now(),
      };
      manualTransactions = [...manualTransactions, txn];
      transactionId = txn.id;
    }
    const record: SharedSettlement = {
      id: makeId('shs'),
      date: todayISO(),
      from,
      to,
      amount: amt,
      ...(settleNote.trim() ? { note: settleNote.trim() } : {}),
      createdAt: Date.now(),
      ...(transactionId ? { transactionId } : {}),
    };
    try {
      await saveModel({ ...model, manualTransactions, sharedSettlements: [...(model.sharedSettlements ?? []), record] });
      showLeafTick('Settled');
      setSettleKey(null);
    } catch {
      setSettleError('Failed to save. Please try again.');
    }
  }

  function undoSettlement(st: SharedSettlement) {
    if (!model) return;
    Alert.alert(`${name(st.from)} paid ${name(st.to)} ${formatPeso(st.amount)}`, `${shortDate(st.date)}${st.note ? ` · ${st.note}` : ''}`, [
      { text: 'Close', style: 'cancel' },
      {
        text: 'Undo this payment',
        style: 'destructive',
        onPress: () =>
          saveModel({
            ...model,
            sharedSettlements: (model.sharedSettlements ?? []).filter((x) => x.id !== st.id),
            manualTransactions: st.transactionId ? (model.manualTransactions || []).filter((t) => t.id !== st.transactionId) : model.manualTransactions,
          }),
      },
    ]);
  }

  type Item = { kind: 'expense'; date: string; at: number; e: SharedExpense } | { kind: 'settle'; date: string; at: number; s: SharedSettlement };
  const activity: Item[] = [
    ...(model.sharedExpenses ?? []).map((e) => ({ kind: 'expense' as const, date: e.date, at: e.createdAt ?? 0, e })),
    ...(model.sharedSettlements ?? []).map((s) => ({ kind: 'settle' as const, date: s.date, at: s.createdAt ?? 0, s })),
  ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.at - a.at));
  const name = (id: string) => personLabel(model, id, myId);

  const netText = !myId ? 'Pick which person is you' : net > 0 ? `You're owed ${formatPeso(net)}` : net < 0 ? `You owe ${formatPeso(-net)}` : "You're all settled up";
  const netColor = net > 0 ? colors.positive : net < 0 ? colors.negative : colors.ink;
  const withText = others.length ? `With ${others.map((p) => p.name).join(', ').replace(/, ([^,]*)$/, ' and $1')}` : 'Add the people you share costs with';

  return (
    <PullToRefreshScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={[styles.group, { padding: 16 }]}>
        <GradientFill match={[styles.group, { padding: 16 }]} />
        <Text style={styles.meta}>Overall</Text>
        <Text style={[styles.net, { color: netColor }]}>{netText}</Text>
        <Text style={styles.meta}>{withText}</Text>
      </View>

      {balances.length > 0 && (
        <>
          <Text style={styles.header}>Balances</Text>
          <View style={styles.group}>
            <GradientFill match={styles.group} />
            {balances.map((b, i) => {
              const involvesMe = !!myId && (b.from === myId || b.to === myId);
              const other = b.from === myId ? b.to : b.from;
              const text = !myId || !involvesMe ? `${name(b.from)} owes ${name(b.to)}` : b.to === myId ? `${name(b.from)} owes you` : `You owe ${name(b.to)}`;
              const color = !involvesMe ? colors.inkDim : b.to === myId ? colors.positive : colors.negative;
              return (
                <View key={`${b.from}|${b.to}`} style={i > 0 ? styles.line : undefined}>
                  <View style={styles.row}>
                    <View style={[styles.avatar, { backgroundColor: involvesMe ? colors.accentTint : colors.navy2 }]}>
                      <Text style={[styles.avatarText, { color: involvesMe ? colors.gold : colors.inkDim }]}>{(model.people.find((p) => p.id === (involvesMe ? other : b.from))?.name ?? '?').charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.rowTitle} numberOfLines={1}>{text}</Text>
                    <Text style={[styles.amt, { color }]}>{formatPeso(b.amount)}</Text>
                    {settleKey !== `${b.from}|${b.to}` && (
                      <TouchableOpacity
                        onPress={() => openSettle(b.from, b.to, b.amount)}
                        style={[styles.settleBtn, { backgroundColor: involvesMe ? colors.accentTint : colors.navy2 }]}
                        accessibilityRole="button"
                        accessibilityLabel={`Settle up: ${text}`}
                      >
                        <Text style={{ color: involvesMe ? colors.gold : colors.inkDim, fontWeight: '700', fontSize: 14 }}>Settle up</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {settleKey === `${b.from}|${b.to}` && (
                    <View style={styles.settleBox}>
                      <Text style={styles.settleLabel}>Amount {name(b.from) === 'You' ? 'you paid' : `${name(b.from)} paid`}</Text>
                      <AmountInput autoFocus value={settleAmount} onChangeAmount={(v) => { setSettleAmount(v); setSettleError(''); }} style={{ backgroundColor: colors.navy2, marginBottom: 10 }} />
                      <Text style={styles.settleLabel}>Note (optional)</Text>
                      <TextInput style={[styles.input, { flex: 0, marginBottom: 10 }]} placeholder="e.g. Paid via GCash" placeholderTextColor={colors.inkFaint} value={settleNote} onChangeText={setSettleNote} />
                      {involvesMe && (
                        <>
                          <Text style={styles.settleLabel}>{b.from === myId ? 'Paid from (optional)' : 'Received into (optional)'}</Text>
                          <AccountChoices model={model} value={settlePm} onChange={setSettlePm} optional />
                          <Text style={[styles.sub, { marginTop: 6, marginBottom: 10 }]}>Pick an account to also log it as money {b.from === myId ? 'out' : 'in'}.</Text>
                        </>
                      )}
                      {!!settleError && <Text style={[styles.sub, { color: colors.negative, marginBottom: 8 }]}>{settleError}</Text>}
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity style={[styles.settleAction, { backgroundColor: colors.buttonFill }]} onPress={() => logSettlement(b.from, b.to)} accessibilityRole="button" testID="shared-log-payment">
                          <Text style={{ color: colors.onButton, fontWeight: '700', fontSize: 16 }}>Log payment</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.settleAction, { backgroundColor: colors.navy2 }]} onPress={() => setSettleKey(null)} accessibilityRole="button">
                          <Text style={{ color: colors.ink, fontWeight: '600', fontSize: 16 }}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
          <Text style={styles.footer}>Balances are netted, so each pair of people has one number to settle.</Text>
        </>
      )}

      <Text style={styles.header}>People</Text>
      <View style={styles.group}>
        <GradientFill match={styles.group} />
        {members.map((p, i) => {
          const isMe = p.id === myId;
          return (
            <View key={p.id} style={[styles.row, i > 0 && styles.line]}>
              <View style={[styles.avatar, { backgroundColor: isMe ? colors.accentTint : colors.navy2 }]}>
                <Text style={[styles.avatarText, { color: isMe ? colors.gold : colors.inkDim }]}>{p.name.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.rowTitle} numberOfLines={1}>{p.name}</Text>
              {isMe ? (
                <Text style={[styles.youTag, { color: colors.gold, backgroundColor: colors.accentTint }]}>You</Text>
              ) : (
                <>
                  {!myId && (
                    <TouchableOpacity onPress={() => markMe(p.id)} accessibilityRole="button" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={styles.link}>This is me</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => removeMember(p.id)} accessibilityRole="button" accessibilityLabel={`Remove ${p.name}`} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginLeft: 12 }}>
                    <Ionicons name="close-circle-outline" size={20} color={colors.inkFaint} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          );
        })}
        {adding ? (
          <View style={[styles.addBox, members.length > 0 && styles.line]}>
            {notYetMembers.length > 0 && (
              <View style={styles.chips}>
                {notYetMembers.map((p) => (
                  <TouchableOpacity key={p.id} style={[styles.chip, { backgroundColor: colors.navy2 }]} onPress={() => addMember(p.id)} accessibilityRole="button">
                    <Text style={styles.chipText}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <TextInput
                autoFocus
                style={styles.input}
                placeholder="New person's name"
                placeholderTextColor={colors.inkFaint}
                value={newName}
                onChangeText={setNewName}
                onSubmitEditing={addNewPerson}
                returnKeyType="done"
              />
              <TouchableOpacity onPress={addNewPerson} accessibilityRole="button" style={[styles.addBtn, { backgroundColor: colors.buttonFill }]}>
                <Text style={{ color: colors.onButton, fontWeight: '700', fontSize: 15 }}>Add</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => { setAdding(false); setNewName(''); }} accessibilityRole="button" style={{ alignSelf: 'flex-start', marginTop: 10 }}>
              <Text style={[styles.link, { color: colors.inkDim }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[styles.row, members.length > 0 && styles.line]} onPress={() => setAdding(true)} accessibilityRole="button" testID="shared-add-person">
            <Ionicons name="person-add-outline" size={20} color={colors.gold} style={{ marginRight: 12 }} />
            <Text style={[styles.rowTitle, { color: colors.gold }]}>Add a person</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.footer}>
        {myId ? 'Everyone here can be part of a shared expense.' : 'Add yourself too, then tap "This is me" on your name.'}
      </Text>

      <Text style={styles.header}>Activity</Text>
      <View style={styles.group}>
        <GradientFill match={styles.group} />
        {activity.length === 0 ? (
          <Text style={[styles.meta, { padding: 16 }]}>No shared expenses yet. Tap Add to add one.</Text>
        ) : (
          activity.map((item, i) => {
            if (item.kind === 'settle') {
              const st = item.s;
              const toMe = st.to === myId;
              const fromMe = st.from === myId;
              const title = toMe ? `${name(st.from)} paid you back` : fromMe ? `You paid ${name(st.to)} back` : `${name(st.from)} paid ${name(st.to)} back`;
              return (
                <TouchableOpacity key={st.id} style={[styles.row, { paddingVertical: 10 }, i > 0 && styles.line]} onPress={() => undoSettlement(st)} accessibilityRole="button">
                  <View style={[styles.avatar, { backgroundColor: colors.okBg }]}>
                    <Ionicons name="swap-horizontal" size={16} color={colors.positive} />
                  </View>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>
                    <Text style={styles.sub} numberOfLines={1}>{shortDate(st.date)}{st.note ? ` · ${st.note}` : ''}</Text>
                  </View>
                  <Text style={[styles.lent, { color: toMe ? colors.positive : fromMe ? colors.negative : colors.inkDim }]}>
                    {toMe ? '+' : fromMe ? '−' : ''}{formatPeso(st.amount)}
                  </Text>
                </TouchableOpacity>
              );
            }
            const e = item.e;
            const mine = myId ? e.shares.find((x) => x.personId === myId)?.amount ?? 0 : 0;
            const lent = myId && e.paidBy === myId ? e.amount - mine : 0;
            const right = !myId ? '' : e.paidBy === myId ? (lent > 0 ? `you lent\n${formatPeso(lent)}` : 'just you') : mine > 0 ? `you borrowed\n${formatPeso(mine)}` : 'not part of it';
            const rightColor = !myId ? colors.inkDim : e.paidBy === myId ? (lent > 0 ? colors.positive : colors.inkDim) : mine > 0 ? colors.negative : colors.inkDim;
            const ways = e.shares.filter((x) => x.amount > 0).length;
            return (
              <TouchableOpacity key={e.id} style={[styles.row, { paddingVertical: 10 }, i > 0 && styles.line]} onPress={() => openEdit(e)} accessibilityRole="button">
                <View style={[styles.avatar, { backgroundColor: e.paidBy === myId ? colors.accentTint : colors.navy2 }]}>
                  <Text style={[styles.avatarText, { color: e.paidBy === myId ? colors.gold : colors.inkDim }]}>{(model.people.find((p) => p.id === e.paidBy)?.name ?? '?').charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{e.label}</Text>
                  <Text style={styles.sub} numberOfLines={1}>
                    {shortDate(e.date)} · {name(e.paidBy)} paid {formatPeso(e.amount)} · {e.splitMode === 'custom' ? 'custom split' : `split ${ways} ways`}
                  </Text>
                </View>
                <Text style={[styles.lent, { color: rightColor }]}>{right}</Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      <BottomSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        grouped
        header={<SheetBar title={editingId ? 'Edit shared expense' : 'New shared expense'} onCancel={() => setSheetOpen(false)} onDone={saveExpense} doneLabel={editingId ? 'Save' : 'Add'} busy={saving} />}
      >
        <BigAmount label="Total" value={amount} onChange={(v) => { setAmount(v); setError(''); }} color={colors.negative} autoFocus={!editingId} />
        <FormGroup>
          <InputRow label="For" value={label} onChangeText={(t) => { setLabel(t); setError(''); }} placeholder="e.g. Pizza night" testID="shared-label-input" />
          <PickerRow label="Paid by" value={paidBy ? name(paidBy) : 'Choose'} open={openRow === 'paid'} onToggle={() => toggleRow('paid')}>
            <Choices options={members.map((p) => ({ id: p.id, label: p.id === myId ? 'You' : p.name }))} value={paidBy} onChange={setPaidBy} />
          </PickerRow>
          <PickerRow label="Date" value={shortDate(date)} open={openRow === 'date'} onToggle={() => toggleRow('date')}>
            <DateField value={date} onChange={setDate} />
          </PickerRow>
          <PickerRow label="Split" value={splitText} open={openRow === 'split'} onToggle={() => toggleRow('split')}>
            <Choices options={[{ id: 'equal', label: 'Equally' }, { id: 'custom', label: 'Custom amounts' }]} value={mode} onChange={(m) => setMode(m as 'equal' | 'custom')} />
            <View style={{ height: 12 }} />
            {mode === 'equal' ? (
              <View style={{ gap: 6 }}>
                {members.map((p) => {
                  const on = included.includes(p.id);
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.pick, { backgroundColor: on ? colors.accentTint : colors.navy2 }]}
                      onPress={() => { hapticSelection(); setIncluded((cur) => (on ? cur.filter((x) => x !== p.id) : [...cur, p.id])); }}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                    >
                      <Ionicons name={on ? 'checkbox' : 'square-outline'} size={20} color={on ? colors.gold : colors.inkFaint} />
                      <Text style={[styles.rowTitle, { fontSize: 16 }]}>{p.id === myId ? 'You' : p.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={{ backgroundColor: colors.navy2, borderRadius: 12 }}>
                {members.map((p) => (
                  <AmountRow key={p.id} label={p.id === myId ? 'You' : p.name} value={custom[p.id] ?? ''} onChange={(v) => setCustom((cur) => ({ ...cur, [p.id]: v }))} />
                ))}
              </View>
            )}
          </PickerRow>
        </FormGroup>
        {!!footnote && <Footnote>{footnote}</Footnote>}
        {!!error && <Text style={[styles.meta, { color: colors.negative, marginHorizontal: 16, marginBottom: 12 }]}>{error}</Text>}
        {editingId && <Button label="Delete shared expense" variant="destructive" onPress={deleteExpense} />}
      </BottomSheet>
    </PullToRefreshScrollView>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },
    group: { backgroundColor: colors.navy3, borderRadius: 16, overflow: 'hidden' },
    meta: { fontSize: 15, color: colors.inkDim },
    net: { fontSize: 22, fontWeight: '700', marginVertical: 2 },
    header: { fontSize: 13, color: colors.inkDim, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 24, marginBottom: 6, marginLeft: 16 },
    footer: { fontSize: 13, color: colors.inkDim, marginTop: 6, marginHorizontal: 16 },
    row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: 16 },
    line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    avatarText: { fontSize: 14, fontWeight: '700' },
    rowTitle: { flex: 1, fontSize: 17, color: colors.ink },
    youTag: { fontSize: 13, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
    link: { fontSize: 15, fontWeight: '600', color: colors.gold },
    addBox: { padding: 16 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
    chipText: { fontSize: 15, fontWeight: '600', color: colors.ink },
    input: { flex: 1, backgroundColor: colors.navy2, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: colors.ink },
    sub: { fontSize: 13, color: colors.inkDim, marginTop: 1 },
    lent: { fontSize: 13, fontWeight: '600', textAlign: 'right' },
    amt: { fontSize: 17, fontWeight: '600', marginLeft: 8 },
    settleBtn: { marginLeft: 10, paddingHorizontal: 12, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
    settleBox: { paddingHorizontal: 16, paddingBottom: 14, paddingLeft: 60 },
    settleLabel: { fontSize: 13, fontWeight: '600', color: colors.inkDim, marginBottom: 6 },
    settleAction: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    pick: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 12, borderRadius: 12 },
    addBtn: { paddingHorizontal: 16, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  });
}
