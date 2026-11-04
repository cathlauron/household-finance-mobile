// Cath, 2026-10-27 (canvas I1, "built yes. count it, but i don't want it show as readily
// available. maybe just count the money going into investments and only add it towards the
// balance if the investment has been withdrawn"): Plan > Investments.
//   - Worth now / You put in / up or down, for all of them and for each one.
//   - Update value: type in what it's worth (no live prices).
//   - Add money: from an account (that account goes down; not spending) or none.
//   - Take out: into an account (it goes up again) or none.
// What investments are worth is never added to any account, Home balance or Left to Spend.
import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from '../components/Tap';
import { Text } from '../components/AppText';
import { headerButtonText } from '../navigation/LargeHeader';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { PullToRefreshScrollView } from '../PullToRefreshScrollView';
import GradientFill from '../components/GradientFill';
import LoadingView from '../components/LoadingView';
import BottomSheet from '../components/BottomSheet';
import DateField from '../components/DateField';
import Button from '../components/Button';
import SegmentedControl from '../components/SegmentedControl';
import AccountPicker, { accountProblem } from '../components/AccountPicker';
import { SheetBar, BigAmount, FormGroup, InputRow, AmountRow, PickerRow, SwitchRow, Footnote, Choices, useOpenRow, ordinal } from '../components/SimpleForm';
import { showLeafTick } from '../components/LeafTick';
import { notSaved } from '../messages';
import { formatPeso } from '../balanceProjection';
import { accountLabel } from '../transactionActions';
import { makeId } from '../utils';
import { hapticLight } from '../haptics';
import { todayISO, dateText } from '../dateUtils';
import { INVESTMENT_KINDS, kindInfo, investmentSummary, investmentsTotal, sortedEntries, withEntry, withoutEntry, monthlyPlanFor, withMonthlyPlan, withoutMonthlyPlan, nextPlanDue } from '../investments';
import type { ThemeColors } from '../theme';
import type { Investment, InvestmentEntry, InvestmentKind, PaymentMethod } from '../types';

import { useWho } from '../components/WhoLogged';
function shortDate(iso: string): string {
  return dateText(new Date(iso + 'T00:00:00'));
}
function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const cents = (n: number) => Math.round(n * 100) / 100;

type Mode = 'value' | 'add' | 'withdraw';

export default function InvestmentsScreen() {
  const { colors } = useTheme();
  const who = useWho();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { model, saveModel } = useData();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  // New / edit an investment (name and kind).
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<InvestmentKind>('mp2');
  const [startPutIn, setStartPutIn] = useState<number | ''>('');
  const [startWorth, setStartWorth] = useState<number | ''>('');
  const [formError, setFormError] = useState('');
  const [openRow, toggleRow] = useOpenRow(formOpen);

  // Update value / Add money / Take out.
  const [moveFor, setMoveFor] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('value');
  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState(todayISO());
  const [pm, setPm] = useState<PaymentMethod | undefined>(undefined);
  const [moveError, setMoveError] = useState('');
  // Canvas I1: "Every month" puts this amount in on the same day each month (a regular payment).
  const [monthly, setMonthly] = useState(false);
  const [moveRow, toggleMoveRow] = useOpenRow(!!moveFor);
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={openAdd} accessibilityRole="button" accessibilityLabel="Add an investment" testID="investments-add" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[headerButtonText, { color: colors.gold }]}>Add</Text>
        </TouchableOpacity>
      ),
    });
  });

  // Opened from a Transactions row: that investment's sheet.
  useEffect(() => {
    const id = route.params?.openId;
    if (id && model && (model.investments || []).some((i) => i.id === id)) openMove(id, 'value');
  }, [route.params?.openId]);

  if (!model) return <LoadingView />;
  const list = model.investments || [];
  const total = investmentsTotal(model);
  const current = moveFor ? list.find((i) => i.id === moveFor) : undefined;
  const sum = current ? investmentSummary(current) : null;
  const currentPlan = current ? monthlyPlanFor(model, current.id) : undefined;
  const planAmount = (() => {
    const due = currentPlan?.cycles?.find((c) => !(typeof c.amountPaid === 'number' && c.amountPaid > 0))?.amountDue;
    return typeof due === 'number' ? due : 0;
  })();
  function stopPlan() {
    if (!model || !current) return;
    Alert.alert('Stop every month?', 'The regular payment is removed from To-Pay and the calendar. Money already put in stays.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Stop', style: 'destructive', onPress: () => saveModel(withoutMonthlyPlan(model, current.id)) },
    ]);
  }

  function openAdd() {
    setEditingId(null);
    setName('');
    setKind('mp2');
    setStartPutIn('');
    setStartWorth('');
    setFormError('');
    setFormOpen(true);
  }
  function openEdit(inv: Investment) {
    setMoveFor(null);
    setEditingId(inv.id);
    setName(inv.name);
    setKind(inv.kind);
    setFormError('');
    setTimeout(() => setFormOpen(true), 0);
  }
  function openMove(id: string, m: Mode) {
    setMoveFor(id);
    setMode(m);
    setAmount('');
    setDate(todayISO());
    setPm(undefined);
    setMoveError('');
    // Review 10-27: off each time, so a one-off top-up never changes the monthly plan.
    setMonthly(false);
  }

  async function saveInvestment() {
    if (!model) return;
    const n = name.trim() || kindInfo(kind).label;
    const all = model.investments || [];
    setSaving(true);
    try {
      if (editingId) {
        await saveModel({ ...model, investments: all.map((i) => (i.id === editingId ? { ...i, name: n, kind } : i)) });
      } else {
        const now = Date.now();
        const entries: InvestmentEntry[] = [];
        const put = typeof startPutIn === 'number' && startPutIn > 0 ? cents(startPutIn) : 0;
        const worth = typeof startWorth === 'number' && startWorth > 0 ? cents(startWorth) : 0;
        // What was put in before using Finance Flow: history only, no account changes.
        if (put > 0) entries.push({ id: makeId('invx'), date: todayISO(), type: 'add', amount: put, createdAt: now });
        if (worth > 0 && worth !== put) entries.push({ id: makeId('invx'), date: todayISO(), type: 'value', amount: worth, createdAt: now + 1 });
        await saveModel({ ...model, investments: [...all, { id: makeId('inv'), name: n, kind, entries, createdAt: now }] });
      }
      hapticLight();
      showLeafTick(editingId ? 'Saved' : 'Added');
      setFormOpen(false);
    } catch {
      setFormError(notSaved('this investment'));
    } finally {
      setSaving(false);
    }
  }

  function deleteInvestment() {
    if (!model || !editingId) return;
    const inv = list.find((i) => i.id === editingId);
    Alert.alert(`Delete ${inv?.name || 'this investment'}?`, 'Its history goes too, and your accounts are worked out again without the money it moved in or out.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await saveModel(withoutMonthlyPlan({ ...model, investments: list.filter((i) => i.id !== editingId) }, editingId));
          setFormOpen(false);
        },
      },
    ]);
  }

  async function saveMove() {
    if (!model || !current || !sum) return;
    const a = typeof amount === 'number' ? cents(amount) : 0;
    if (mode === 'value' ? a < 0 || amount === '' : a <= 0) return setMoveError(mode === 'value' ? 'Type in what it is worth now.' : 'Enter the amount.');
    if (date > todayISO()) return setMoveError("It can't be dated in the future.");
    if (mode === 'withdraw' && a > sum.worth + 0.005) return setMoveError(`It's worth ${formatPeso(sum.worth)} now. Update its value first if it's worth more.`);
    if (mode === 'add' && pm) {
      const problem = accountProblem(model, 'out', a, pm);
      if (problem) return setMoveError(problem);
    }
    const entry: InvestmentEntry = { id: makeId('invx'), date, type: mode, amount: a, createdAt: Date.now(), ...(mode !== 'value' && pm ? { paymentMethod: pm } : {}) };
    let next = withEntry(model, current.id, entry);
    if (mode === 'add') {
      const day = Number(date.slice(8, 10));
      if (monthly) next = withMonthlyPlan(next, current, { amount: a, day, paymentMethod: pm, firstDue: nextPlanDue(date, day), id: makeId('bill'), cycleId: makeId('cycle') });
    }
    setSaving(true);
    try {
      await saveModel(next);
      hapticLight();
      showLeafTick(mode === 'value' ? 'Updated' : mode === 'add' ? 'Added' : 'Taken out');
      setMoveFor(null);
    } catch {
      setMoveError(notSaved('this'));
    } finally {
      setSaving(false);
    }
  }

  function removeEntry(inv: Investment, e: InvestmentEntry) {
    if (!model) return;
    Alert.alert('Remove this from its history?', e.paymentMethod ? `${accountLabel(model, e.paymentMethod) || 'The account'} is worked out again without it.` : 'Nothing else changes.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => saveModel(withoutEntry(model, inv.id, e.id)) },
    ]);
  }

  const gainText = (gain: number, putIn: number) =>
    gain === 0 ? 'no change yet' : `${gain > 0 ? 'up' : 'down'} ${formatPeso(Math.abs(gain))}${putIn > 0 ? ` (${Math.abs(Math.round((gain / putIn) * 1000) / 10)}%)` : ''}`;
  const gainColor = (gain: number) => (gain > 0 ? colors.positive : gain < 0 ? colors.negative : colors.inkDim);
  const dateValue = date === todayISO() ? 'Today' : date === yesterdayISO() ? 'Yesterday' : shortDate(date);

  return (
    <PullToRefreshScrollView contentContainerStyle={styles.content}>
      <View style={[styles.group, { padding: 16 }]}>
        <GradientFill match={[styles.group, { padding: 16 }]} />
        <Text style={styles.meta}>Worth now</Text>
        <Text style={styles.big} testID="investments-worth">{formatPeso(total.worth)}</Text>
        <Text style={styles.meta}>
          You put in {formatPeso(total.putIn)}
          {list.length > 0 && <Text style={{ color: gainColor(total.gain), fontWeight: '600' }}> · {gainText(total.gain, total.putIn)}</Text>}
        </Text>
      </View>
      <Text style={styles.footer}>Not part of what you can spend: it only comes back to an account when you take money out.</Text>

      <Text style={styles.header}>Your investments</Text>
      <View style={styles.group}>
        <GradientFill match={styles.group} />
        {list.length === 0 ? (
          <Text style={[styles.meta, { padding: 16 }]}>Nothing yet. Tap Add for MP2, stocks, a fund or a time deposit.</Text>
        ) : (
          list.map((inv, i) => {
            const s = investmentSummary(inv);
            const k = kindInfo(inv.kind);
            return (
              <TouchableOpacity key={inv.id} style={[styles.row, i > 0 && styles.line]} onPress={() => openMove(inv.id, 'value')} accessibilityRole="button" testID={`investment-row-${inv.id}`}>
                <View style={[styles.tile, { backgroundColor: colors.accentTint }]}>
                  <Ionicons name={k.icon as any} size={18} color={colors.gold} />
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{inv.name}</Text>
                  <Text style={styles.sub} numberOfLines={1}>
                    {s.lastValueDate ? `Updated ${shortDate(s.lastValueDate)}` : `Put in ${formatPeso(s.putIn)}`}
                    {(() => {
                      const plan = monthlyPlanFor(model, inv.id);
                      const due = plan?.cycles?.find((c) => !(typeof c.amountPaid === 'number' && c.amountPaid > 0))?.amountDue;
                      return plan && typeof due === 'number' ? ` · ${formatPeso(due)} every month` : '';
                    })()}
                    {who.by(inv.addedBy)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.amt}>{formatPeso(s.worth)}</Text>
                  <Text style={[styles.sub, { color: gainColor(s.gain) }]}>{s.gain > 0 ? '+' : s.gain < 0 ? '−' : '+'}{formatPeso(Math.abs(s.gain))}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
      <Text style={styles.footer}>Type in what each one is worth when you check it (no live prices). Money you put in from an account is a move, like a transfer: it isn't spending.</Text>

      {/* New / edit */}
      <BottomSheet visible={formOpen} onClose={() => setFormOpen(false)} grouped header={<SheetBar title={editingId ? 'Edit investment' : 'New investment'} onCancel={() => setFormOpen(false)} onDone={saveInvestment} doneLabel={editingId ? 'Save' : 'Add'} busy={saving} />}>
        <FormGroup>
          <PickerRow mark="required" label="Kind" value={kindInfo(kind).label} open={openRow === 'kind'} onToggle={() => toggleRow('kind')} testID="investment-kind-row">
            <Choices options={INVESTMENT_KINDS.map((k) => ({ id: k.id, label: k.label }))} value={kind} onChange={(v) => setKind(v as InvestmentKind)} />
          </PickerRow>
          <InputRow mark="optional" label="Name" value={name} onChangeText={setName} placeholder={kindInfo(kind).label} testID="investment-name" />
          {!editingId && <AmountRow mark="optional" label="Put in so far" value={startPutIn} onChange={setStartPutIn} />}
          {!editingId && <AmountRow mark="optional" label="Worth now" value={startWorth} onChange={setStartWorth} />}
        </FormGroup>
        {!editingId && <Footnote>What you put in before using Finance Flow. It's kept as history only: no account changes.</Footnote>}
        {!!formError && <Text style={[styles.error, { marginHorizontal: 16 }]}>{formError}</Text>}
        {editingId && <Button label="Delete investment" variant="destructive" onPress={deleteInvestment} />}
      </BottomSheet>

      {/* Update value / Add money / Take out */}
      <BottomSheet
        visible={!!current}
        onClose={() => setMoveFor(null)}
        grouped
        header={<SheetBar title={current?.name || 'Investment'} onCancel={() => setMoveFor(null)} onDone={saveMove} doneLabel="Save" busy={saving} />}
      >
        {current && sum && (
          <>
            <View style={{ marginBottom: 12 }}>
              <SegmentedControl<Mode>
                accessibilityLabel="What to do"
                options={[
                  { id: 'value', label: 'Update value', testID: 'investment-mode-value' },
                  { id: 'add', label: 'Add money', testID: 'investment-mode-add' },
                  { id: 'withdraw', label: 'Take out', testID: 'investment-mode-withdraw' },
                ]}
                value={mode}
                onChange={(m) => {
                  setMode(m);
                  setAmount('');
                  setPm(undefined);
                  setMoveError('');
                }}
              />
            </View>
            <BigAmount mark="required" label={mode === 'value' ? 'Worth now' : mode === 'add' ? 'Amount put in' : 'Amount taken out'} value={amount} onChange={(v) => { setAmount(v); setMoveError(''); }} color={colors.ink} />
            <Text style={[styles.sub, { textAlign: 'center', marginTop: -10, marginBottom: 14, color: mode === 'value' && typeof amount === 'number' ? gainColor(cents(amount - sum.putIn)) : colors.inkDim }]}>
              {mode === 'value' && typeof amount === 'number'
                ? `${cents(amount - sum.putIn) >= 0 ? 'Up' : 'Down'} ${formatPeso(Math.abs(cents(amount - sum.putIn)))} on the ${formatPeso(sum.putIn)} you put in`
                : `Worth ${formatPeso(sum.worth)} now · you put in ${formatPeso(sum.putIn)}`}
            </Text>
            <FormGroup>
              <PickerRow mark="required" label={mode === 'value' ? 'As of' : 'Date'} value={dateValue} open={moveRow === 'date'} onToggle={() => toggleMoveRow('date')}>
                <Choices options={[{ id: 'today', label: 'Today' }, { id: 'yesterday', label: 'Yesterday' }]} value={date === todayISO() ? 'today' : date === yesterdayISO() ? 'yesterday' : ''} onChange={(v) => setDate(v === 'today' ? todayISO() : yesterdayISO())} />
                <View style={{ height: 10 }} />
                <DateField value={date} onChange={(d) => d && setDate(d)} maximumDate={new Date()} placeholder="Pick a date" />
              </PickerRow>
              {mode !== 'value' && (
                <PickerRow mark="optional" label={mode === 'add' ? 'From' : 'Into'} value={pm ? accountLabel(model, pm) || 'Account' : 'No account'} open={moveRow === 'account'} onToggle={() => toggleMoveRow('account')} testID="investment-account-row">
                  <AccountPicker noLabel noCredit mark="optional" model={model} direction={mode === 'add' ? 'out' : 'in'} amount={typeof amount === 'number' ? amount : 0} value={pm} onChange={(p) => { setPm(p); setMoveError(''); }} />
                  {!!pm && (
                    <TouchableOpacity onPress={() => setPm(undefined)} accessibilityRole="button">
                      <Text style={[styles.link, { marginTop: -4 }]}>No account</Text>
                    </TouchableOpacity>
                  )}
                </PickerRow>
              )}
            </FormGroup>
            <Footnote>
              {mode === 'value'
                ? 'Only what it is worth changes. No account and no spending changes.'
                : mode === 'add'
                ? pm
                  ? `${accountLabel(model, pm)} goes down by this. It isn't spending.`
                  : 'No account: only the investment changes (for money put in before, or from somewhere else).'
                : pm
                ? `${accountLabel(model, pm)} goes up by this: the money is back where you can spend it.`
                : 'No account: only the investment changes.'}
            </Footnote>
            {mode === 'add' && (
              <>
                <FormGroup>
                  <SwitchRow label={currentPlan ? 'Make this the monthly amount' : 'Every month'} value={monthly} onChange={setMonthly} />
                </FormGroup>
                <Footnote>
                  {currentPlan && !monthly
                    ? `Now ${formatPeso(planAmount)} every month on the ${ordinal(Number(currentPlan.dueDate?.day) || 1)}. This one is just once.`
                    : monthly
                    ? `Next one ${shortDate(nextPlanDue(date, Number(date.slice(8, 10))))}. It shows in To-Pay (Regular payments) and the calendar, like a regular payment; marking it Sent puts it in here.`
                    : 'Turn on to put this in every month: it shows in To-Pay and the calendar.'}
                </Footnote>
                {!!currentPlan && (
                  <TouchableOpacity onPress={stopPlan} accessibilityRole="button" testID="investment-stop-monthly" style={{ marginHorizontal: 16, marginBottom: 16 }}>
                    <Text style={styles.link}>Stop putting money in every month</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
            {!!moveError && <Text style={[styles.error, { marginHorizontal: 16 }]} testID="investment-error">{moveError}</Text>}

            <Text style={[styles.header, { marginTop: 4 }]}>History</Text>
            <View style={[styles.group, { marginBottom: 20 }]}>
              {sortedEntries(current).reverse().map((e, i) => (
                <TouchableOpacity key={e.id} style={[styles.row, i > 0 && styles.line]} onLongPress={() => removeEntry(current, e)} accessibilityHint="Long-press to remove it" accessibilityRole="button">
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.rowTitle}>{e.type === 'value' ? 'Value updated' : e.type === 'add' ? 'Put in' : 'Taken out'}</Text>
                    <Text style={styles.sub} numberOfLines={1}>
                      {shortDate(e.date)}
                      {e.paymentMethod ? ` · ${e.type === 'add' ? 'from' : 'into'} ${accountLabel(model, e.paymentMethod) || 'an account'}` : e.type !== 'value' ? ' · no account' : ''}
                      {who.by(e.addedBy)}
                    </Text>
                  </View>
                  <Text style={[styles.amt, { color: e.type === 'withdraw' ? colors.inkDim : colors.ink }]}>{e.type === 'withdraw' ? '−' : ''}{formatPeso(e.amount)}</Text>
                </TouchableOpacity>
              ))}
              {(current.entries || []).length === 0 && <Text style={[styles.meta, { padding: 16 }]}>Nothing yet.</Text>}
            </View>
            <Footnote>Long-press an entry to remove it.</Footnote>
            <Button label="Edit name or kind" variant="secondary" onPress={() => openEdit(current)} />
          </>
        )}
      </BottomSheet>
    </PullToRefreshScrollView>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },
    group: { backgroundColor: colors.navy3, borderRadius: 16, overflow: 'hidden' },
    meta: { fontSize: 15, color: colors.inkDim },
    big: { fontSize: 30, fontWeight: '800', color: colors.ink, marginVertical: 2 },
    header: { fontSize: 13, color: colors.inkDim, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 24, marginBottom: 6, marginLeft: 16 },
    footer: { fontSize: 13, lineHeight: 18, color: colors.inkDim, marginTop: 6, marginHorizontal: 16 },
    row: { flexDirection: 'row', alignItems: 'center', minHeight: 62, paddingHorizontal: 16, paddingVertical: 8 },
    line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    tile: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    rowTitle: { fontSize: 17, color: colors.ink },
    sub: { fontSize: 13, color: colors.inkDim, marginTop: 1 },
    amt: { fontSize: 17, color: colors.ink },
    link: { fontSize: 15, fontWeight: '600', color: colors.gold },
    error: { fontSize: 14, color: colors.negative, marginBottom: 12 },
  });
}
