import React, { useEffect, useRef, useMemo, useState } from 'react';
import { alertNotSaved } from '../messages';
import { showLeafTick } from '../components/LeafTick';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { TouchableOpacity } from '../components/Tap';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '../components/AppText';
import AmountInput from '../components/AmountInput';
import DateField from '../components/DateField';
import { MarkedLabel } from '../components/MarkedLabel';
import SegmentedControl from '../components/SegmentedControl';
import BottomSheet from '../components/BottomSheet';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { formatPeso, accountCurrentBalance } from '../balanceProjection';
import { cardOwed } from '../creditCards';
import { makeId } from '../utils';
import { todayISO } from '../dateUtils';
import type { ThemeColors } from '../theme';
import type { BalanceAccountEntry, HouseholdModel, ManualTransaction, PaymentMethod } from '../types';
import GradientFill from '../components/GradientFill';
import { cardColor, cardChipColors } from '../components/CardFace';
import { overAvailable } from '../moneyMoves';
import { changeBack, CURRENCIES, currencySymbol, isForeign, lastRate, pesoFor, rateFromAmounts, showMoney, suggestedRate, withdrawCash } from '../fx';
import { drafts } from '../drafts';
import { trace } from '../trace';
import { animateNextLayout } from '../animateLayout';

// Redesign: Move money, from the Finance Flow mockup. Moves money between two of your
// own accounts (e.g. BPI Savings to Cash at an ATM). It isn't spending, so Left to
// Spend doesn't change; only an ATM or transfer fee counts, and that's saved as a
// small "Fees" transaction paid from the first account.
//
// Version 2.1 (Cath): a credit card can't send money to another account (its limit only
// pays for things), but it can RECEIVE money: that's paying the card, and it frees up the
// card's available limit. So credit cards are only offered under "To".
//
// Cath, 2026-11-13 (mockups money-batch-4 and 5): each account shows what is in it NOW (H-75),
// with what is left after the move; more than an account has warns but is allowed. "Withdraw
// cash" takes cash out in another currency (fx.ts). A form left without Move keeps what was
// typed; Cancel throws it away.

type Group = 'cash' | 'debit' | 'credit';
type Acct = { key: string; group: Group; id: string; name: string; amount: number; color: string; entry: BalanceAccountEntry };
type Mode = 'move' | 'withdraw';
const DRAFT = 'transfer';

function accountsOf(model: HouseholdModel): Acct[] {
  const out: Acct[] = [];
  (['cash', 'debit', 'credit'] as Group[]).forEach((g) =>
    (model.balanceAccounts[g] || []).forEach((a) =>
      out.push({ key: `${g}:${a.id}`, group: g, id: a.id, name: a.name || (g === 'cash' ? 'Cash' : g === 'debit' ? 'Debit' : 'Credit card'), amount: accountCurrentBalance(model, g, a), color: cardColor(a, g), entry: a })
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

  // A wallet in another currency can't send pesos; it only receives a withdrawal.
  const pesoSenders = accounts.filter((a) => a.group !== 'credit' && !isForeign(a.entry));
  // Opened from a credit card's page ("Pay card"): the card is where the money goes.
  const payCardKey = route.params?.toGroup === 'credit' ? `credit:${route.params.toId}` : undefined;
  const asked = route.params?.fromGroup && route.params.fromGroup !== 'credit' ? `${route.params.fromGroup}:${route.params.fromId}` : undefined;
  const startKey = asked ?? pesoSenders[0]?.key;
  const [mode, setMode] = useState<Mode>(route.params?.mode === 'withdraw' ? 'withdraw' : 'move');
  const [fromKey, setFromKey] = useState<string | undefined>(startKey);
  const [toKey, setToKey] = useState<string | undefined>(payCardKey ?? accounts.find((a) => a.key !== startKey && !isForeign(a.entry))?.key);
  const [amount, setAmount] = useState<number | ''>('');
  const [fee, setFee] = useState<number | ''>('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const savingNowRef = useRef(false);
  // Withdraw cash: the currency, its rate (pesos for one), and what the bank took.
  const [currency, setCurrency] = useState('');
  const [rate, setRate] = useState<number | ''>('');
  const [pesoTaken, setPesoTaken] = useState<number | ''>('');
  const [rateFrom, setRateFrom] = useState<'today' | 'last' | 'none' | 'typed' | ''>('');
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [resumed, setResumed] = useState(false);

  // Cath, 2026-11-14: Move money can also start from a wallet in another currency: that changes
  // leftover cash back to pesos (fx.ts changeBack).
  const senders = mode === 'withdraw' ? pesoSenders : accounts.filter((a) => a.group !== 'credit');
  const from = accounts.find((a) => a.key === fromKey);
  const to = accounts.find((a) => a.key === toKey);
  const fromForeign = mode === 'move' && !!from && isForeign(from.entry);
  const receivers = accounts.filter((a) => !isForeign(a.entry) && (!fromForeign || a.group !== 'credit'));

  // ---- What was typed is kept unless you tap Cancel or Move ----
  const keepRef = useRef(true);
  const latest = useRef<Record<string, unknown>>({});
  latest.current = { mode, fromKey, toKey, amount, fee, note, date, currency, rate, pesoTaken };
  useEffect(() => {
    trace(route.params?.mode === 'withdraw' ? 'withdraw' : 'move', 'opened', { payCard: !!payCardKey });
    if (payCardKey) return; // Pay card always starts fresh
    let gone = false;
    drafts.load(DRAFT).then((d) => {
      if (gone || !d) return;
      trace('draft', 'restored', { form: DRAFT });
      if (d.mode === 'move' || d.mode === 'withdraw') setMode(d.mode);
      if (typeof d.fromKey === 'string' && accounts.some((a) => a.key === d.fromKey)) setFromKey(d.fromKey);
      if (typeof d.toKey === 'string' && accounts.some((a) => a.key === d.toKey)) setToKey(d.toKey);
      if (typeof d.amount === 'number') setAmount(d.amount);
      if (typeof d.fee === 'number') setFee(d.fee);
      if (typeof d.note === 'string') setNote(d.note);
      if (typeof d.date === 'string' && d.date) setDate(d.date);
      if (typeof d.currency === 'string') setCurrency(d.currency);
      if (typeof d.rate === 'number') { setRate(d.rate); setRateFrom('typed'); }
      if (typeof d.pesoTaken === 'number') setPesoTaken(d.pesoTaken);
      animateNextLayout(); setResumed(true);
    });
    const off = navigation.addListener('beforeRemove', () => {
      if (!keepRef.current || payCardKey) return;
      const v = latest.current;
      const typed = v.amount !== '' || v.fee !== '' || (v.note as string).trim() !== '' || v.pesoTaken !== '';
      if (typed) drafts.save(DRAFT, v);
    });
    return () => { gone = true; off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Opened from a foreign wallet's own page: it starts as Change back, at that cash's rate.
  useEffect(() => {
    if (!fromForeign || !from) return;
    if (rate === '') { setRate(from.entry.fxRate as number); setRateFrom('last'); }
    if (!to || to.key === from.key || to.group === 'credit' || isForeign(to.entry)) setToKey(accounts.find((a) => a.key !== from.key && a.group !== 'credit' && !isForeign(a.entry))?.key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromForeign, fromKey]);

  function cancel() {
    keepRef.current = false;
    drafts.clear(DRAFT);
    trace(mode, 'cancelled');
    navigation.goBack();
  }
  function startOver() {
    drafts.clear(DRAFT);
    setAmount(''); setFee(''); setNote(''); setDate(todayISO()); setPesoTaken(''); setRate(''); setRateFrom(''); setCurrency('');
    setResumed(false);
    trace('draft', 'start over', { form: DRAFT });
  }

  // ---- Withdraw cash: the rate, either amount, and the other follow each other ----
  function pickCurrency(code: string) {
    setCurrency(code);
    setCurrencyOpen(false);
    setRate('');
    setRateFrom('');
    trace('withdraw', 'currency picked', { code });
    if (!model) return;
    suggestedRate(code, lastRate(model, code), fetch as any).then((s) => {
      setRateFrom(s.from);
      if (s.rate) {
        setRate(s.rate);
        setAmount((a) => { if (typeof a === 'number' && a > 0) setPesoTaken(pesoFor(a, s.rate as number)); return a; });
      }
    });
  }
  function typeForeign(v: number | '') {
    setAmount(v);
    if (typeof v === 'number' && typeof rate === 'number' && rate > 0) setPesoTaken(pesoFor(v, rate));
  }
  function pickFrom(k: string) {
    setFromKey(k);
    const picked = accounts.find((a) => a.key === k);
    if (picked && isForeign(picked.entry) && mode === 'move') {
      // Changing back: starts at the rate that cash cost you.
      const r = picked.entry.fxRate as number;
      setRate(r);
      setRateFrom('last');
      if (typeof amount === 'number') setPesoTaken(pesoFor(amount, r));
      const okTo = accounts.find((a) => a.key === toKey);
      if (!okTo || okTo.key === k || okTo.group === 'credit' || isForeign(okTo.entry)) setToKey(accounts.find((a) => a.key !== k && a.group !== 'credit' && !isForeign(a.entry))?.key);
      trace('move', 'change back picked', { currency: picked.entry.currency });
      return;
    }
    if (k === toKey) setToKey(accounts.find((a) => a.key !== k && !isForeign(a.entry))?.key);
  }
  function changeBackNow() {
    if (!model || !from || !to) return;
    if (amount === '' || amount <= 0) return Alert.alert('Enter how much cash you changed');
    if (pesoTaken === '' || pesoTaken <= 0) return Alert.alert('Enter the pesos you got', 'Or set the exchange rate, and the pesos work themselves out.');
    if (date > todayISO()) return Alert.alert("It can't be dated in the future");
    const foreignAmount = amount;
    const pesoAmount = pesoTaken;
    confirmOver(pesoFor(foreignAmount, from.entry.fxRate as number), () => {
      trace('move', 'saving change back', { from: from.key, to: to.key });
      try {
        persist(changeBack(model, { wallet: from.key, to: to.key, foreignAmount, pesoAmount, note, date }).model, 'Changed', 'move');
      } catch (e: any) {
        Alert.alert(e?.message || 'Check the amounts');
      }
    });
  }
  function typeRate(v: number | '') {
    setRate(v);
    setRateFrom('typed');
    if (typeof v === 'number' && v > 0 && typeof amount === 'number') setPesoTaken(pesoFor(amount, v));
  }
  function typePeso(v: number | '') {
    setPesoTaken(v);
    const r = typeof v === 'number' && typeof amount === 'number' ? rateFromAmounts(amount, v) : null;
    if (r) { setRate(r); setRateFrom('typed'); }
  }

  async function persist(next: HouseholdModel, done: string, flow: Mode) {
    // B-058 (2026-10-29): a second quick tap can't save it twice.
    if (savingNowRef.current) return;
    savingNowRef.current = true;
    setSaving(true);
    try {
      await saveModel(next);
      keepRef.current = false;
      drafts.clear(DRAFT);
      trace(flow, 'saved');
      showLeafTick(done);
      navigation.goBack();
    } catch {
      trace(flow, 'save failed');
      Alert.alert(...alertNotSaved(flow === 'withdraw' ? 'this withdrawal' : 'this transfer'));
    } finally {
      savingNowRef.current = false;
      setSaving(false);
    }
  }

  // More than the account has: warn, but allow it (Cath: a bank can go below zero).
  function confirmOver(need: number, go: () => void) {
    if (!model || !from || !overAvailable(model, from.key, need)) return go();
    trace(mode, 'over available', { from: from.key });
    Alert.alert(`Only ${showMoney(from.entry, from.amount)} in ${from.name}`, `This takes out more than that, so ${from.name} would go below zero.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: mode === 'withdraw' ? 'Save anyway' : 'Move anyway', onPress: go },
    ]);
  }

  function move() {
    if (!model || !from || !to) return;
    if (fromForeign) return changeBackNow();
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
    const amt = amount;
    confirmOver(amt + feeAmt, () => {
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
      let next = bump(bump(model, from, -amt - (feeOffSavedBalance ? feeAmt : 0)), to, amt);
      // Cath 2026-10-27 (Undo): when it was made, its fee entry and how the fee came off.
      const feeTxnId = feeAmt > 0 ? makeId('txn') : undefined;
      const record = { id: makeId('xfer'), date, from: from.key, to: to.key, amount: amt, createdAt: Date.now(), ...(feeAmt ? { fee: feeAmt, feeTxnId, ...(feeOffSavedBalance ? { feeOffSaved: true } : {}) } : {}), ...(note.trim() ? { note: note.trim() } : {}) };
      next = { ...next, transfers: [...(model.transfers || []), record] };
      if (feeAmt > 0) {
        const pm: PaymentMethod = { type: from.group, accountId: from.id };
        const feeTxn: ManualTransaction = {
          id: feeTxnId as string,
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
      trace('move', 'saving', { from: from.key, to: to.key, hasFee: feeAmt > 0 });
      persist(next, to.group === 'credit' ? 'Paid' : 'Moved', 'move');
    });
  }

  function withdraw() {
    if (!model || !from) return;
    if (!currency) return Alert.alert('Pick a currency');
    if (amount === '' || amount <= 0) return Alert.alert('Enter how much cash you got');
    if (pesoTaken === '' || pesoTaken <= 0) return Alert.alert('Enter the exchange rate', 'Or type how many pesos your bank took, and the rate works itself out.');
    if (date > todayISO()) return Alert.alert("It can't be dated in the future");
    const feeAmt = fee === '' ? 0 : fee;
    const foreignAmount = amount;
    const pesoAmount = pesoTaken;
    confirmOver(pesoAmount + feeAmt, () => {
      trace('withdraw', 'saving', { from: from.key, currency });
      try {
        persist(withdrawCash(model, { from: from.key, currency, foreignAmount, pesoAmount, fee: feeAmt, note, date }).model, 'Saved', 'withdraw');
      } catch (e: any) {
        Alert.alert(e?.message || 'Check the amounts');
      }
    });
  }

  const Picker = ({ label, value, onPick, exclude, list, available }: { label: string; value?: string; onPick: (k: string) => void; exclude?: string; list: Acct[]; available?: boolean }) => (
    <View style={styles.pickWrap}>
      <MarkedLabel text={label} mark="required" style={styles.pickLabel} />
      <View style={styles.pickChips}>
        {list.filter((a) => a.key !== exclude).map((a) => (
          <TouchableOpacity key={a.key} testID={`transfer-${label.toLowerCase()}-${a.id}`} style={[styles.pickChip, cardChipColors(a.color, isDark, value === a.key)]} onPress={() => onPick(a.key)} accessibilityRole="button" accessibilityState={{ selected: value === a.key }}>
            {/* Each chip wears its card's own colour; the chosen one is deeper with a solid border. */}
            <View style={styles.pickChipHead}>
              <View style={[styles.pickChipDot, { backgroundColor: a.color }]} />
              <Text style={[styles.pickChipText, value === a.key && { fontWeight: '700' }]} numberOfLines={1}>{a.name}</Text>
            </View>
            <Text style={[styles.pickChipAmt, a.amount < 0 && { color: colors.negative }]}>{showMoney(a.entry, a.amount).replace('.00', '')}{available ? ' available' : ''}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const symbol = currencySymbol(currency);
  const feeAmt = fee === '' ? 0 : fee;
  const leaves = mode === 'withdraw' ? (typeof pesoTaken === 'number' ? pesoTaken + feeAmt : 0) : typeof amount !== 'number' ? 0 : fromForeign && from ? pesoFor(amount, from.entry.fxRate as number) : amount + feeAmt;
  const arrives = fromForeign ? (typeof pesoTaken === 'number' ? pesoTaken : 0) : typeof amount === 'number' ? amount : 0;
  const over = !!model && !!from && leaves > 0 && overAvailable(model, from.key, leaves);
  const wallet = model?.balanceAccounts.cash.find((a) => a.currency === currency && isForeign(a));
  const title = mode === 'withdraw' ? 'Withdraw cash' : fromForeign ? 'Change back' : to?.group === 'credit' ? 'Pay card' : 'Move money';
  const fromSymbol = fromForeign && from ? currencySymbol(from.entry.currency) : '';

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.bar}>
        <TouchableOpacity onPress={cancel} accessibilityRole="button" testID="transfer-cancel">
          <Text style={styles.barBtn}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.barTitle}>{title}</Text>
        <TouchableOpacity onPress={mode === 'withdraw' ? withdraw : move} disabled={saving} accessibilityRole="button" testID="transfer-move">
          {saving ? <ActivityIndicator color={colors.gold} /> : <Text style={[styles.barBtn, { fontWeight: '700' }]}>{mode === 'withdraw' ? 'Save' : 'Move'}</Text>}
        </TouchableOpacity>
      </View>
      <KeyboardAwareScrollView pageBounce contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {pesoSenders.length === 0 || (mode === 'move' && accounts.length < 2) ? (
          <>
            {!payCardKey && pesoSenders.length > 0 && (
              <SegmentedControl<Mode> accessibilityLabel="Move money or withdraw cash" options={[{ id: 'move', label: 'Move money', testID: 'transfer-mode-move' }, { id: 'withdraw', label: 'Withdraw cash', testID: 'transfer-mode-withdraw' }]} value={mode} onChange={(m) => { animateNextLayout(); setMode(m); }} />
            )}
            <Text style={styles.footer}>
              {pesoSenders.length === 0
                ? 'Add a cash or bank account first. A credit card can receive money, but it can\'t send it.'
                : "Add at least two accounts (in Home's Wallet) to move money between them."}
            </Text>
          </>
        ) : (
          <>
            {!payCardKey && (
              <SegmentedControl<Mode> accessibilityLabel="Move money or withdraw cash" options={[{ id: 'move', label: 'Move money', testID: 'transfer-mode-move' }, { id: 'withdraw', label: 'Withdraw cash', testID: 'transfer-mode-withdraw' }]} value={mode} onChange={(m) => { animateNextLayout(); setMode(m); trace(m, 'mode picked'); }} />
            )}
            {resumed && (
              <View style={[styles.resumed, { backgroundColor: colors.okBg }]} testID="draft-banner">
                <Text style={styles.resumedText}>Picked up where you left off</Text>
                <TouchableOpacity onPress={startOver} accessibilityRole="button" testID="draft-start-over" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={[styles.resumedText, { color: colors.gold, fontWeight: '700' }]}>Start over</Text>
                </TouchableOpacity>
              </View>
            )}
            <MarkedLabel text={mode === 'withdraw' ? 'Cash you got' : fromForeign ? 'Cash you changed' : 'Amount'} mark="required" style={styles.amountLabel} />
            <AmountInput testID="transfer-amount" style={styles.bigWrap} inputStyle={styles.bigInput} value={amount} onChangeAmount={mode === 'withdraw' || fromForeign ? typeForeign : setAmount} prefix={mode === 'withdraw' ? symbol || null : fromForeign ? fromSymbol : '₱'} />
            {mode === 'withdraw' && (
              <View style={[styles.group, { marginBottom: 20 }]}>
                <GradientFill match={[styles.group, { marginBottom: 20 }]} />
                <TouchableOpacity style={styles.row} onPress={() => setCurrencyOpen(true)} accessibilityRole="button" testID="withdraw-currency-row">
                  <MarkedLabel text="Currency" mark="required" style={styles.rowLabel} />
                  <Text style={[styles.rowValue, !currency && { color: colors.gold }]} numberOfLines={1}>{currency ? `${CURRENCIES.find((c) => c.code === currency)?.name} (${currency})` : 'Choose'}</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.group}>
              <GradientFill match={styles.group} />
              <Picker label="From" available list={senders} value={fromKey} onPick={pickFrom} />
              {mode === 'move' && (
                <>
                  <View style={styles.line} />
                  <Picker label="To" list={receivers} value={toKey} onPick={setToKey} exclude={fromKey} />
                </>
              )}
            </View>
            {(mode === 'withdraw' || fromForeign) && (
              <View style={[styles.group, { marginTop: 20 }]}>
                <GradientFill match={[styles.group, { marginTop: 20 }]} />
                <View style={styles.row}>
                  <MarkedLabel text={fromForeign ? `Exchange rate (${fromSymbol}1 in ₱)` : currency ? `Exchange rate (${symbol}1 in ₱)` : 'Exchange rate'} mark="required" style={styles.rowLabel} />
                  <AmountInput testID="withdraw-rate" style={styles.inlineAmount} value={rate} onChangeAmount={typeRate} />
                </View>
                <View style={[styles.row, styles.lineTop]}>
                  <MarkedLabel text={fromForeign ? 'Pesos you got' : `Taken from ${from?.name ?? 'your account'}`} mark="required" style={styles.rowLabel} />
                  <AmountInput testID="withdraw-peso" style={styles.inlineAmount} value={pesoTaken} onChangeAmount={typePeso} />
                </View>
              </View>
            )}
            {mode === 'withdraw' && !!currency && (
              <Text style={styles.footer} testID="withdraw-rate-note">
                {rateFrom === 'today' ? "Suggested: today's rate. Change it to what your bank gave, or type the pesos your bank took." : rateFrom === 'last' ? "Suggested: the rate you used last. Change it, or type the pesos your bank took." : rateFrom === 'none' ? "Couldn't get today's rate. Type it, or type the pesos your bank took and it works itself out." : rateFrom === 'typed' ? 'Your rate.' : "Getting today's rate…"}
              </Text>
            )}
            <View style={[styles.group, { marginTop: 20 }]}>
              <GradientFill match={[styles.group, { marginTop: 20 }]} />
              <View style={styles.row}>
                <MarkedLabel text="Note" mark="optional" style={styles.rowLabel} />
                <TextInput testID="transfer-note" style={styles.rowInput} value={note} onChangeText={setNote} placeholder="" placeholderTextColor={colors.inkFaint} />
              </View>
              {!fromForeign && <View style={[styles.row, styles.lineTop]}>
                <MarkedLabel text={mode === 'withdraw' ? 'ATM fee (in ₱)' : 'ATM or transfer fee'} mark="optional" style={styles.rowLabel} />
                <AmountInput testID="transfer-fee" style={styles.inlineAmount} value={fee} onChangeAmount={setFee} />
              </View>}
            </View>
            {/* What each account holds after this. */}
            {from && leaves > 0 && (
              <View style={[styles.group, { marginTop: 20 }]} testID="transfer-after">
                <GradientFill match={[styles.group, { marginTop: 20 }]} />
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>{from.name} after</Text>
                  <Text style={[styles.rowValue, over && { color: colors.negative, fontWeight: '700' }]}>{showMoney(from.entry, from.amount - leaves)}</Text>
                </View>
                {mode === 'move' && to && to.group !== 'credit' && arrives > 0 && (
                  <View style={[styles.row, styles.lineTop]}>
                    <Text style={styles.rowLabel}>{to.name} after</Text>
                    <Text style={styles.rowValue}>{formatPeso(to.amount + arrives)}</Text>
                  </View>
                )}
              </View>
            )}
            {over && from && <Text style={[styles.footer, { color: colors.negative, fontWeight: '700' }]} testID="transfer-over">Only {showMoney(from.entry, from.amount)} in {from.name}. You can still save it.</Text>}
            <View style={{ marginTop: 20 }}>
              <DateField label="Date" mark="required" value={date} onChange={setDate} />
            </View>
            {mode === 'withdraw' ? (
              <Text style={styles.footer}>
                {currency ? `Goes into ${wallet?.name ?? `Cash (${currency})`}${wallet ? '' : ", made for you in Home's Wallet"}. Spending from it is typed in ${symbol}. ` : ''}Taking cash out isn't spending, so Left to Spend doesn't change. Only the fee counts.
              </Text>
            ) : fromForeign ? (
              <Text style={styles.footer}>Changing cash back isn't spending. If you got a worse or better rate than that cash cost you, the difference is written down as a small fee or as money in.</Text>
            ) : (
              <>
                <Text style={styles.footer}>
                  {to?.group === 'credit'
                    ? `This pays ${to.name}: it frees up the card's available limit. It isn't new spending, so Left to Spend doesn't change. Only the fee counts.`
                    : 'Moving money between your own accounts is not spending, so it does not change Left to Spend. Only the fee counts.'}
                </Text>
                <Text style={styles.footer}>Credit cards are only under "To": a card's limit pays for things, but it can't send money to another account.</Text>
              </>
            )}
          </>
        )}
      </KeyboardAwareScrollView>

      <BottomSheet visible={currencyOpen} onClose={() => setCurrencyOpen(false)} title="Currency">
        <View style={[styles.group, { marginHorizontal: 16, marginBottom: 16 }]}>
          <GradientFill match={[styles.group, { marginHorizontal: 16, marginBottom: 16 }]} />
          {CURRENCIES.map((c, i) => (
            <TouchableOpacity key={c.code} style={[styles.row, i > 0 && styles.lineTop]} onPress={() => pickCurrency(c.code)} accessibilityRole="button" accessibilityState={{ selected: currency === c.code }} testID={`currency-${c.code}`}>
              <Text style={[styles.rowLabel, { flex: 1 }]} numberOfLines={1}>{c.name}</Text>
              <Text style={[styles.rowValue, currency === c.code && { color: colors.gold, fontWeight: '700' }]}>{c.code} · {c.symbol}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheet>
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
    bigWrap: { backgroundColor: 'transparent', justifyContent: 'center', marginTop: 4, marginBottom: 20, minHeight: 64 },
    bigInput: { fontSize: 40, fontWeight: '700', textAlign: 'center', flex: 0, minWidth: 120 },
    group: { backgroundColor: colors.navy3, borderRadius: 12, overflow: 'hidden' },
    pickWrap: { padding: 16 },
    amountLabel: { fontSize: 13, color: colors.inkDim, textAlign: 'center', marginTop: 12 },
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
    rowValue: { flex: 1, fontSize: 17, color: colors.inkDim, textAlign: 'right' },
    rowInput: { flex: 1, fontSize: 17, color: colors.ink, textAlign: 'right', paddingVertical: 12 },
    inlineAmount: { flex: 1, backgroundColor: 'transparent', marginBottom: 0, minHeight: 44, justifyContent: 'flex-end' },
    footer: { fontSize: 13, color: colors.inkDim, marginTop: 12, marginHorizontal: 16 },
    resumed: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginTop: 12 },
    resumedText: { fontSize: 14, color: colors.ink },
  });
}
