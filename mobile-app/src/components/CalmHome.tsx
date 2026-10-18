import React, { useEffect, useMemo, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, AppState, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './AppText';
import GradientFill from './GradientFill';
import BottomSheet from './BottomSheet';
import AmountInput from './AmountInput';
import AccountPicker, { accountProblem } from './AccountPicker';
import { showLeafTick } from './LeafTick';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { useHideAmounts } from '../hideAmounts';
import { hapticSelection, hapticLight } from '../haptics';
import { todayISO } from '../dateUtils';
import { makeId } from '../utils';
import { formatPeso, cautionThresholdAmount, LeftToSpendMood } from '../balanceProjection';
import { catchUpSince, tightWays, wayText, daysBetween, WELCOME_BACK_DAYS, TightWay } from '../calmHome';
import type { HouseholdModel, ManualTransaction, PaymentMethod } from '../types';

// Version 3, the calm Home (approved mockups H3b and H4b). Both cards sit between the
// Left to Spend card and Accounts. See calmHome.ts for what goes in them.

const shortDate = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const noCents = (n: number) => formatPeso(n).replace('.00', '');

// ---------- Per-phone switches ----------
// "Heads-up when money gets tight" (Settings › Budgeting). On unless switched off.
export const TIGHT_HEADS_UP_KEY = 'tightHeadsUpV1';
const TIGHT_DISMISSED_KEY = 'tightDismissedV1';
const lastLookKey = (username: string) => `lastLookV1:${username}`;

// For testing (usernames starting with "test" only, in Settings › About & Help): pretend
// Home was last looked at 6 days ago, so Welcome back shows the next time the app opens.
export async function pretendAwaySixDays(username: string): Promise<void> {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  await AsyncStorage.setItem(lastLookKey(username), iso);
}

let headsUpOn = true;
let headsUpLoaded = false;
const headsUpListeners = new Set<(v: boolean) => void>();

export function useTightHeadsUp(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(headsUpOn);
  useEffect(() => {
    headsUpListeners.add(setOn);
    if (!headsUpLoaded) {
      headsUpLoaded = true;
      AsyncStorage.getItem(TIGHT_HEADS_UP_KEY)
        .then((v) => {
          headsUpOn = v !== '0';
          headsUpListeners.forEach((l) => l(headsUpOn));
        })
        .catch(() => {});
    } else setOn(headsUpOn);
    return () => {
      headsUpListeners.delete(setOn);
    };
  }, []);
  return [
    on,
    (v: boolean) => {
      headsUpOn = v;
      headsUpListeners.forEach((l) => l(v));
      AsyncStorage.setItem(TIGHT_HEADS_UP_KEY, v ? '1' : '0').catch(() => {});
    },
  ];
}

// ---------- Welcome back ----------
export function WelcomeBackCard({ username }: { username: string }) {
  const { colors } = useTheme();
  const { model, saveModel, guest } = useData();
  const navigation = useNavigation<any>();
  const { money } = useHideAmounts();
  const s = makeStyles(colors);
  const [since, setSince] = useState<string | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [estimateOpen, setEstimateOpen] = useState(false);

  // The day Home was last looked at on this phone. After 3+ days away the card shows for
  // this visit (until closed); either way, today becomes the new "last looked".
  useEffect(() => {
    if (!username || guest) return;
    const check = () => {
      const today = todayISO();
      AsyncStorage.getItem(lastLookKey(username))
        .then((prev) => {
          if (prev && daysBetween(prev, today) >= WELCOME_BACK_DAYS) setSince(prev);
          AsyncStorage.setItem(lastLookKey(username), today).catch(() => {});
        })
        .catch(() => {});
    };
    check();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && check());
    return () => sub.remove();
  }, [username, guest]);

  const today = todayISO();
  const info = useMemo(() => (model && since ? catchUpSince(model, since, today) : null), [model, since, today]);
  if (!model || !since || !info) return null;

  const close = () => {
    hapticSelection();
    setSince(null);
  };

  return (
    <View style={s.card} testID="welcome-back">
      <GradientFill match={s.card} />
      <View style={s.headRow}>
        <Text style={s.title}>Welcome back</Text>
        <TouchableOpacity onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close welcome back">
          <Ionicons name="close" size={20} color={colors.inkDim} />
        </TouchableOpacity>
      </View>
      {info.good.map((g) => (
        <View key={g} style={s.goodRow}>
          <Ionicons name="checkmark" size={17} color={colors.gold} />
          <Text style={s.goodText}>{g}</Text>
        </View>
      ))}
      <Text style={s.sub}>
        {info.days} days to catch up. No rush, nothing is lost.
      </Text>
      <View style={s.chips}>
        <TouchableOpacity style={[s.chip, { backgroundColor: colors.buttonFill }]} onPress={() => setQuickOpen(true)} accessibilityRole="button" testID="welcome-quick">
          <Text style={[s.chipText, { color: colors.onButton }]}>Quick catch-up · 1 min</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.chip, { backgroundColor: colors.accentTint }]}
          onPress={() => navigation.navigate('Main', { screen: 'Transactions' })}
          accessibilityRole="button"
        >
          <Text style={[s.chipText, { color: colors.gold }]}>Everything</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.chip, { backgroundColor: colors.accentTint }]} onPress={() => setEstimateOpen(true)} accessibilityRole="button" testID="welcome-estimate">
          <Text style={[s.chipText, { color: colors.gold }]}>I'll estimate the rest</Text>
        </TouchableOpacity>
      </View>

      {/* Quick catch-up: just bills and paydays. */}
      <BottomSheet visible={quickOpen} onClose={() => setQuickOpen(false)} grouped header={<SheetHead title="Quick catch-up" onDone={() => setQuickOpen(false)} />}>
        <View style={{ paddingBottom: 12 }}>
          <Text style={s.sheetIntro}>Just bills and paydays from {shortDate(since)} to today. Tap one to sort it out.</Text>
          {info.bills.length === 0 && info.paydays.length === 0 && (
            <View style={s.group}>
              <GradientFill match={s.group} />
              <Text style={[s.rowText, { padding: 16 }]}>Nothing left to catch up. You're all set.</Text>
            </View>
          )}
          {info.paydays.length > 0 && <Text style={s.sheetLabel}>PAYDAYS</Text>}
          {info.paydays.length > 0 && (
            <View style={s.group}>
              <GradientFill match={s.group} />
              {info.paydays.map((p, i) => (
                <PaydayRow key={p.sourceId + p.date} p={p} first={i === 0} model={model} saveModel={saveModel} onNoAccount={() => { setQuickOpen(false); navigation.navigate('Income'); }} />
              ))}
            </View>
          )}
          {info.bills.length > 0 && <Text style={s.sheetLabel}>CAME DUE WHILE YOU WERE AWAY</Text>}
          {info.bills.length > 0 && (
            <View style={s.group}>
              <GradientFill match={s.group} />
              {info.bills.map((b, i) => (
                <TouchableOpacity
                  key={b.kind + b.id}
                  style={[s.row, i > 0 && s.rowTop]}
                  onPress={() => {
                    setQuickOpen(false);
                    navigation.navigate('PayDetail', { kind: b.kind, id: b.id, backTitle: 'Home' });
                  }}
                  accessibilityRole="button"
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowText}>{b.name}</Text>
                    <Text style={s.rowSub}>Due {shortDate(b.dueDate)} · {money(b.amount)}</Text>
                  </View>
                  <Text style={[s.rowAction, { color: colors.gold }]}>Paid?</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </BottomSheet>

      <EstimateSheet visible={estimateOpen} onClose={() => setEstimateOpen(false)} since={since} model={model} saveModel={saveModel} />
    </View>
  );
}

function SheetHead({ title, onDone }: { title: string; onDone: () => void }) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  return (
    <View style={s.sheetHead}>
      <Text style={s.sheetTitle}>{title}</Text>
      <TouchableOpacity onPress={onDone} accessibilityRole="button" hitSlop={10}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.gold }}>Done</Text>
      </TouchableOpacity>
    </View>
  );
}

// A payday that was due while away: one tap logs the expected amount into the account
// paydays usually go to. No usual account yet: opens Income instead.
function PaydayRow({
  p,
  first,
  model,
  saveModel,
  onNoAccount,
}: {
  p: { sourceId: string; name: string; date: string; amount: number };
  first: boolean;
  model: HouseholdModel;
  saveModel: (m: HouseholdModel) => Promise<void>;
  onNoAccount: () => void;
}) {
  const { colors } = useTheme();
  const { money } = useHideAmounts();
  const s = makeStyles(colors);
  const source = (model.income || []).find((x) => x.id === p.sourceId);
  const pm = source?.depositTo;
  async function cameIn() {
    if (!source) return;
    if (!pm) return onNoAccount();
    hapticLight();
    const entry = { id: makeId('paylog'), date: p.date, amount: p.amount, paymentMethod: pm, createdAt: Date.now() };
    await saveModel({ ...model, income: (model.income || []).map((x) => (x.id === source.id ? { ...x, paymentLog: [entry, ...(x.paymentLog || [])] } : x)) });
    showLeafTick('Added');
  }
  return (
    <View style={[s.row, !first && s.rowTop]}>
      <View style={{ flex: 1 }}>
        <Text style={s.rowText}>{p.name}</Text>
        <Text style={s.rowSub}>
          {shortDate(p.date)} · {money(p.amount)}
        </Text>
      </View>
      <TouchableOpacity onPress={cameIn} style={[s.smallBtn, { backgroundColor: colors.accentTint }]} accessibilityRole="button" accessibilityLabel={`${p.name} came in`}>
        <Text style={[s.rowAction, { color: colors.gold }]}>Came in</Text>
      </TouchableOpacity>
    </View>
  );
}

// "I'll estimate the rest": one Other spending line for the days away, instead of every coffee.
function EstimateSheet({
  visible,
  onClose,
  since,
  model,
  saveModel,
}: {
  visible: boolean;
  onClose: () => void;
  since: string;
  model: HouseholdModel;
  saveModel: (m: HouseholdModel) => Promise<void>;
}) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const [amount, setAmount] = useState<number | ''>('');
  const [pm, setPm] = useState<PaymentMethod | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const today = todayISO();
  const range = `${shortDate(since)}–${shortDate(today)}`;

  async function add() {
    if (amount === '' || amount <= 0) return Alert.alert('How much, roughly?', 'A round guess is fine.');
    const problem = accountProblem(model, 'out', amount, pm);
    if (problem) return Alert.alert('Choose where it came from', problem);
    const t: ManualTransaction = {
      id: makeId('txn'),
      date: today,
      label: `Spending while away (${range})`,
      amount,
      direction: 'out',
      owner: 'shared',
      category: 'Other',
      notes: 'Estimated in Welcome back',
      paymentMethod: pm,
      createdAt: Date.now(),
    } as ManualTransaction;
    setSaving(true);
    try {
      await saveModel({ ...model, manualTransactions: [...(model.manualTransactions || []), t] });
      showLeafTick('Added');
      setAmount('');
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} grouped header={<SheetHead title="Estimate the rest" onDone={onClose} />}>
      <View style={{ paddingBottom: 16, gap: 12 }}>
        <Text style={s.sheetIntro}>
          About how much did you spend from {range} that isn't logged yet? It's added as one "Other" line, so you don't have to remember every coffee.
        </Text>
        <AmountInput autoFocus value={amount} onChangeAmount={setAmount} placeholder="0.00" />
        <AccountPicker model={model} direction="out" amount={amount} value={pm} onChange={setPm} label="Mostly paid from" />
        <TouchableOpacity onPress={add} disabled={saving} style={[s.primary, { backgroundColor: colors.buttonFill, opacity: saving ? 0.6 : 1 }]} accessibilityRole="button" testID="estimate-add">
          <Text style={[s.primaryText, { color: colors.onButton }]}>Add estimate</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

// ---------- Running low ----------
export function TightCard({ amount, mood, statusLabel, targetDate, basis }: { amount: number; mood: LeftToSpendMood; statusLabel: string; targetDate: Date; basis: 'payday' | 'endOfMonth' }) {
  const { colors } = useTheme();
  const { model, guest } = useData();
  const navigation = useNavigation<any>();
  const { money } = useHideAmounts();
  const [headsUp] = useTightHeadsUp();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const s = makeStyles(colors);
  const today = todayISO();

  useEffect(() => {
    AsyncStorage.getItem(TIGHT_DISMISSED_KEY)
      .then((v) => setDismissed(v))
      .catch(() => {});
  }, []);

  const plan = useMemo(() => (model ? tightWays(model, amount, cautionThresholdAmount(model)) : null), [model, amount]);
  if (!model || guest || mood === 'good' || !headsUp || dismissed === today || !plan) return null;

  const until = basis === 'payday' ? `payday (${targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})` : 'the end of the month';
  const title = mood === 'low' ? `${statusLabel} until ${until}` : `${statusLabel} before ${until}`;
  const daysLeft = Math.max(1, Math.round((targetDate.getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000));
  const n = plan.ways.length;

  const open = (w: TightWay) => {
    hapticSelection();
    if (w.kind === 'pot') navigation.navigate('PotDetail', { id: w.id, open: 'out' });
    else if (w.kind === 'owed') navigation.navigate('PayDetail', { kind: 'loan', id: w.id, backTitle: 'Home' });
    else navigation.navigate('TransactionDetail', { id: 'manual-' + w.id });
  };

  return (
    <View style={s.card} testID="tight-card">
      <GradientFill match={s.card} />
      <View style={s.headRow}>
        <Text style={[s.title, { flex: 1 }]}>{title}</Text>
        <TouchableOpacity
          onPress={() => {
            hapticSelection();
            setDismissed(today);
            AsyncStorage.setItem(TIGHT_DISMISSED_KEY, today).catch(() => {});
          }}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Hide for today"
        >
          <Ionicons name="close" size={20} color={colors.inkDim} />
        </TouchableOpacity>
      </View>
      <Text style={s.sub}>
        {n > 0
          ? `${n} ${n === 1 ? 'way' : 'ways'} to free up ${money(plan.target).replace('.00', '')}`
          : amount > 0
          ? `About ${money(amount / daysLeft).replace('.00', '')} a day keeps you going until ${until}.`
          : 'Nothing to draw on right now. Paying only what’s due keeps it steady until payday.'}
      </Text>
      {n > 0 && (
        <View style={[s.group, { marginTop: 10 }]}>
          {plan.ways.map((w, i) => (
            <TouchableOpacity key={w.kind + w.id} style={[s.row, i > 0 && s.rowTop]} onPress={() => open(w)} accessibilityRole="button">
              <Text style={[s.rowText, { flex: 1 }]}>{wayText(w).replace(noCents(w.amount), money(w.amount).replace('.00', ''))}</Text>
              <Text style={[s.rowAction, { color: colors.gold }]}>{w.kind === 'pot' ? 'Use' : w.kind === 'owed' ? 'Open' : 'Check'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <Text style={s.foot}>Nothing moves until you choose. You can turn this off in Settings › Budgeting.</Text>
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    card: { backgroundColor: colors.navy3, borderRadius: 22, overflow: 'hidden', paddingHorizontal: 18, paddingVertical: 16, marginBottom: 24 },
    headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    title: { fontSize: 18, fontWeight: '800', color: colors.ink },
    goodRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
    goodText: { fontSize: 15, lineHeight: 21, color: colors.ink, flexShrink: 1 },
    sub: { fontSize: 15, lineHeight: 21, color: colors.inkDim, marginTop: 8 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    chip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999 },
    chipText: { fontSize: 14, fontWeight: '700' },
    group: { backgroundColor: colors.navy2, borderRadius: 14, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 14, paddingVertical: 10 },
    rowTop: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    rowText: { fontSize: 15, color: colors.ink },
    rowSub: { fontSize: 13, color: colors.inkDim, marginTop: 1 },
    rowAction: { fontSize: 15, fontWeight: '800' },
    smallBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
    foot: { fontSize: 13, lineHeight: 18, color: colors.inkDim, marginTop: 10 },
    sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12, minHeight: 40 },
    sheetTitle: { fontSize: 20, fontWeight: '700', color: colors.ink },
    sheetIntro: { fontSize: 15, lineHeight: 21, color: colors.inkDim, marginBottom: 6, marginHorizontal: 4 },
    sheetLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3, color: colors.inkDim, marginTop: 16, marginBottom: 6, marginHorizontal: 4 },
    primary: { borderRadius: 28, paddingVertical: 16, alignItems: 'center' },
    primaryText: { fontSize: 17, fontWeight: '700' },
  });
}
