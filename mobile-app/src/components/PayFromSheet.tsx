import React, { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { TouchableOpacity } from './Tap';
import { Text } from './AppText';
import { useTheme } from '../ThemeContext';
import { formatPeso } from '../balanceProjection';
import type { HouseholdModel, PaymentMethod } from '../types';
import BottomSheet from './BottomSheet';
import AccountPicker, { accountProblem } from './AccountPicker';
import AmountInput from './AmountInput';
import DateField from './DateField';
import SegmentedControl from './SegmentedControl';
import { todayISO, dateText } from '../dateUtils';

// Redesign: asks which account a payment comes from (or goes into) before it's logged,
// e.g. "Mark as paid" on a bill. Same rules as a new transaction: required, and cash or
// debit can't go below zero (see AccountPicker).
type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  amount: number;
  direction: 'in' | 'out';
  model: HouseholdModel;
  initial?: PaymentMethod;
  confirmLabel: string;
  // Debts (Round 3): the amount can be changed for a partial payment. `amount` is then
  // the starting amount (the minimum due), `fullAmount` the whole amount due, and an
  // optional late fee can be entered.
  editableAmount?: boolean;
  fullAmount?: number;
  minimumAmount?: number;
  // Version 2.1 (canvas S1-S2): bills can be paid in part; the rest is added to the next
  // bill (or stays owed for a one-time bill).
  partOption?: { name: string; repeats: boolean };
  // "Paying the Oct 15 bill" under the title.
  dueText?: string;
  // Version 2.2 (Cath, canvas P1-P2): a second choice at the top, "Just mark it paid": no
  // account, no date, nothing in spending (used by Travel's checklist).
  justMark?: { onConfirm: () => void; note?: string };
  onConfirm: (pm: PaymentMethod, amount: number, lateFee: number, date: string, takeOffBalance: boolean) => void;
};

function shortISO(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return dateText(d);
}
function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function PayFromSheet({ visible, onClose, title, amount, direction, model, initial, confirmLabel, editableAmount, fullAmount, minimumAmount, partOption, dueText, justMark, onConfirm }: Props) {
  const { colors } = useTheme();
  const [pm, setPm] = useState<PaymentMethod | undefined>(initial);
  const [error, setError] = useState('');
  const [payAmount, setPayAmount] = useState<number | ''>(amount);
  const [lateFee, setLateFee] = useState<number | ''>('');
  const [part, setPart] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [dateMode, setDateMode] = useState<'today' | 'yesterday' | 'pick'>('today');
  const [takeOff, setTakeOff] = useState(false);
  const [mode, setMode] = useState<'account' | 'mark'>('account');
  const marking = !!justMark && mode === 'mark';
  const amountEditable = editableAmount || (partOption && part);
  const effective = amountEditable ? (typeof payAmount === 'number' ? payAmount : 0) : amount;
  // Version 2.1 (canvas S4): a payment dated before balances were last updated is already in
  // them (the balance won't change), unless the person says it isn't.
  const asOf = model.balanceAccounts.asOfDate;
  const beforeBalances = direction === 'out' && !!asOf && date < asOf;
  const full = typeof fullAmount === 'number' ? fullAmount : amount;
  const minimum = typeof minimumAmount === 'number' ? minimumAmount : full;
  const short = editableAmount && effective < minimum ? Math.round((minimum - effective) * 100) / 100 : 0;

  // A second quick tap on the confirm button (while the sheet is closing) is ignored,
  // so a payment can't be logged twice. Re-armed each time the sheet opens.
  const confirmedRef = useRef(false);

  // Start from the usual account each time it opens, if that one still works.
  useEffect(() => {
    if (!visible) return;
    confirmedRef.current = false;
    setError('');
    setPayAmount(amount);
    setLateFee('');
    setPart(false);
    setDate(todayISO());
    setDateMode('today');
    setTakeOff(false);
    setMode('account');
    setPm(initial && initial.accountId && !accountProblem(model, direction, amount, initial) ? initial : undefined);
  }, [visible]);

  function confirm() {
    if (marking) {
      if (confirmedRef.current) return;
      confirmedRef.current = true;
      justMark?.onConfirm();
      return;
    }
    if (date > todayISO()) {
      setError("A payment can't be dated in the future.");
      return;
    }
    if (partOption && part && effective >= amount) {
      setError(`For the whole ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}, choose Pay all.`);
      return;
    }
    if (amountEditable && effective <= 0) {
      setError('Enter how much you paid.');
      return;
    }
    const problem = accountProblem(model, direction, effective, pm);
    if (problem) {
      setError(problem);
      return;
    }
    if (confirmedRef.current) return;
    confirmedRef.current = true;
    onConfirm(pm as PaymentMethod, effective, editableAmount && typeof lateFee === 'number' ? lateFee : 0, date, beforeBalances && takeOff);
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      header={
        <View style={styles.bar}>
          <TouchableOpacity onPress={onClose} accessibilityRole="button" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.barBtn, { color: colors.gold }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.barTitle, { color: colors.ink }]} numberOfLines={1}>{title}</Text>
          <TouchableOpacity onPress={confirm} accessibilityRole="button" testID="pay-from-confirm" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.barBtn, { color: colors.gold, fontWeight: '700' }]}>{confirmLabel}</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        {!!justMark && (
          <View style={{ marginBottom: 12 }}>
            <SegmentedControl<'account' | 'mark'>
              accessibilityLabel="How it was paid"
              options={[
                { id: 'account', label: 'Paid from an account' },
                { id: 'mark', label: 'Just mark it paid' },
              ]}
              value={mode}
              onChange={(v) => {
                setMode(v);
                setError('');
              }}
            />
          </View>
        )}
        {marking ? (
          <>
            <Text style={[styles.amount, { color: colors.inkDim }]}>{formatPeso(amount)}</Text>
            <View style={[styles.markCard, { backgroundColor: colors.navy2 }]}>
              <View style={[styles.markIcon, { backgroundColor: colors.accentTint }]}>
                <Ionicons name="checkmark" size={18} color={colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.markTitle, { color: colors.ink }]}>Ticked, nothing else changes</Text>
                <Text style={[styles.markBody, { color: colors.inkDim }]}>
                  Use this when it was paid some other way, or you already recorded it. Your account balances and spending stay the same.
                </Text>
              </View>
            </View>
            {!!justMark?.note && <Text style={[styles.markBody, { color: colors.inkDim, marginTop: 14, marginHorizontal: 4 }]}>{justMark.note}</Text>}
          </>
        ) : (
        <>
        {!!dueText && <Text style={[styles.dueText, { color: colors.inkDim }]}>{dueText}</Text>}
        {!!partOption && (
          <SegmentedControl<'all' | 'part'>
            accessibilityLabel="How much"
            options={[
              { id: 'all', label: 'Pay all' },
              { id: 'part', label: 'Pay part of it' },
            ]}
            value={part ? 'part' : 'all'}
            onChange={(v) => {
              setPart(v === 'part');
              setPayAmount(v === 'part' ? '' : amount);
              setError('');
            }}
          />
        )}
        {partOption && part ? (
          <>
            <Text style={[styles.fieldLabel, { color: colors.inkDim, marginTop: 12 }]}>Amount paid now</Text>
            <AmountInput autoFocus value={payAmount} onChangeAmount={(v) => { setPayAmount(v); setError(''); }} inputStyle={styles.editAmount} />
            {effective > 0 && effective < amount && (
              <Text style={[styles.note, { color: colors.orange }]}>
                {formatPeso(Math.round((amount - effective) * 100) / 100)}{' '}
                {partOption.repeats ? `will be added to your next ${partOption.name} bill.` : 'stays owed on the same due date.'}
              </Text>
            )}
          </>
        ) : editableAmount ? (
          <>
            {/* Starts at the minimum due; change it for a partial (or bigger) payment. */}
            <Text style={[styles.fieldLabel, { color: colors.inkDim }]}>Amount paid</Text>
            <AmountInput value={payAmount} onChangeAmount={(v) => { setPayAmount(v); setError(''); }} inputStyle={styles.editAmount} />
            <View style={styles.quickRow}>
              {minimum < full && (
                <TouchableOpacity onPress={() => setPayAmount(minimum)} style={[styles.quick, { backgroundColor: colors.navy1 }]} accessibilityRole="button">
                  <Text style={[styles.quickText, { color: colors.ink }]}>Minimum {formatPeso(minimum)}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setPayAmount(full)} style={[styles.quick, { backgroundColor: colors.navy1 }]} accessibilityRole="button">
                <Text style={[styles.quickText, { color: colors.ink }]}>Full {formatPeso(full)}</Text>
              </TouchableOpacity>
            </View>
            {short > 0 && (
              <Text style={[styles.note, { color: colors.orange }]}>
                {formatPeso(short)} of the minimum is unpaid. It will be added to the next amount due.
              </Text>
            )}
            <Text style={[styles.fieldLabel, { color: colors.inkDim }]}>Late fee (only if your lender charged one)</Text>
            <AmountInput value={lateFee} onChangeAmount={setLateFee} placeholder="0.00" />
          </>
        ) : (
          <Text style={[styles.amount, { color: direction === 'in' ? colors.positive : colors.negative }]}>
            {direction === 'in' ? '+' : '−'}
            {formatPeso(amount)}
          </Text>
        )}
        {/* Version 2.1 (canvas S1): Paid on. Today, yesterday or any past date. */}
        <Text style={[styles.fieldLabel, { color: colors.inkDim, marginTop: 4 }]}>{direction === 'in' ? 'Received on' : 'Paid on'}</Text>
        <View style={styles.quickRow}>
          {(
            [
              ['today', 'Today'],
              ['yesterday', 'Yesterday'],
              ['pick', dateMode === 'pick' && date !== todayISO() && date !== yesterdayISO() ? shortISO(date) : 'Pick a date'],
            ] as const
          ).map(([id, label]) => {
            const on = dateMode === id;
            return (
              <TouchableOpacity
                key={id}
                onPress={() => {
                  setDateMode(id);
                  setError('');
                  if (id === 'today') setDate(todayISO());
                  if (id === 'yesterday') setDate(yesterdayISO());
                }}
                style={[styles.quick, { backgroundColor: on ? colors.buttonFill : colors.navy1 }]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.quickText, { color: on ? colors.onButton : colors.ink }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {dateMode === 'pick' && (
          <DateField value={date} onChange={(d) => { if (d) setDate(d); setError(''); }} maximumDate={new Date()} placeholder="Pick a date" />
        )}
        {beforeBalances && (
          <View style={[styles.balanceNote, { backgroundColor: colors.indigoBg }]}>
            <Text style={{ fontSize: 14, lineHeight: 20, color: colors.ink }}>
              Your balances were updated on {shortISO(asOf as string)}, so this is already in them. Your balance won't change.
            </Text>
            <TouchableOpacity onPress={() => setTakeOff((t) => !t)} accessibilityRole="checkbox" accessibilityState={{ checked: takeOff }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <View style={[styles.check, { borderColor: colors.gold, backgroundColor: takeOff ? colors.gold : 'transparent' }]}>
                {takeOff && <Ionicons name="checkmark" size={13} color={colors.onButton} />}
              </View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.gold, flexShrink: 1 }}>It isn't included, take it off my balance</Text>
            </TouchableOpacity>
          </View>
        )}
        <AccountPicker model={model} direction={direction} amount={effective} value={pm} onChange={(p) => { setPm(p); setError(''); }} />
        </>
        )}
        {!!error && <Text style={[styles.error, { color: colors.negative }]}>{error}</Text>}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 2, paddingBottom: 12, gap: 12 },
  barBtn: { fontSize: 17 },
  barTitle: { fontSize: 17, fontWeight: '600', flexShrink: 1 },
  amount: { fontSize: 34, fontWeight: '700', textAlign: 'center', marginVertical: 12 },
  error: { fontSize: 14, marginTop: -4 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginLeft: 4, marginTop: 4 },
  editAmount: { fontSize: 24, fontWeight: '700' },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -6, marginBottom: 10 },
  quick: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  quickText: { fontSize: 14, fontWeight: '600' },
  note: { fontSize: 13, marginBottom: 10, marginLeft: 4 },
  dueText: { fontSize: 14, textAlign: 'center', marginBottom: 10 },
  balanceNote: { borderRadius: 14, padding: 12, marginBottom: 12 },
  check: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  markCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 16, padding: 16 },
  markIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  markTitle: { fontSize: 16, fontWeight: '700' },
  markBody: { fontSize: 14, lineHeight: 20, marginTop: 4 },
});
