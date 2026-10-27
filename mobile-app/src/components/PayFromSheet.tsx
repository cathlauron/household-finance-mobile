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
import ReceiptField from './ReceiptField';
import { MarkedLabel } from './MarkedLabel';
import { FormGroup, AmountRow, PickerRow } from './SimpleForm';
import { accountLabel } from '../transactionActions';

// Redesign: asks which account a payment comes from (or goes into) before it's logged,
// e.g. "Mark as paid" on a bill. Same rules as a new transaction: required, and cash or
// debit can't go below zero (see AccountPicker).
//
// Cath, 2026-10-27 (canvas R4, approved): ONE payment sheet for bills, debts, loans and trip
// items. The amount can always be changed; "Fees (optional)" is paid with it (from the
// account, as its own "Fees" entry); and "Just record it" saves a payment, any past date,
// with no account and no change to any balance or spending (payments made before using
// Finance Flow, or counted somewhere else).
type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  amount: number;
  direction: 'in' | 'out';
  model: HouseholdModel;
  initial?: PaymentMethod;
  confirmLabel: string;
  // Debts (Round 3): `amount` is the starting amount (the minimum due), `fullAmount` the
  // whole amount due; a lender's late fee can be entered (added to what's owed next).
  editableAmount?: boolean;
  fullAmount?: number;
  minimumAmount?: number;
  // Version 2.1 (canvas S1-S2): bills can be paid in part; the rest is added to the next
  // bill (or stays owed for a one-time bill).
  partOption?: { name: string; repeats: boolean };
  // "Paying the Oct 15 bill" under the title.
  dueText?: string;
  // "Just record it" (canvas R4): shown when given. `recordNote` adds a line under it.
  onRecord?: (amount: number, fee: number, date: string, receipt?: string) => void;
  recordNote?: string;
  recordLabel?: string;
  // Trip items: no Fees field (their spending entry is made when the trip is saved).
  noFees?: boolean;
  // Trip items with no cost can still be ticked (no amount needed).
  allowNoAmount?: boolean;
  onConfirm: (pm: PaymentMethod, amount: number, lateFee: number, date: string, takeOffBalance: boolean, fee: number, receipt?: string) => void;
  // Cath, 2026-10-27 (canvas R2-R4): "Receipt photo (optional)" at the bottom, passed to
  // onConfirm / onRecord as the last value (undefined when none was added).
  withReceipt?: boolean;
  // Cath, 2026-10-27: a warning under the amount (loans: less than the payment due).
  amountNote?: (amount: number) => string | undefined;
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
const cents = (n: number) => Math.round(n * 100) / 100;

export default function PayFromSheet({ visible, onClose, title, amount, direction, model, initial, confirmLabel, editableAmount, fullAmount, minimumAmount, partOption, dueText, onRecord, recordNote, recordLabel, noFees, allowNoAmount, onConfirm, withReceipt, amountNote }: Props) {
  const { colors } = useTheme();
  const [pm, setPm] = useState<PaymentMethod | undefined>(initial);
  const [error, setError] = useState('');
  const [payAmount, setPayAmount] = useState<number | ''>(amount);
  const [lateFee, setLateFee] = useState<number | ''>('');
  const [fee, setFee] = useState<number | ''>('');
  const [date, setDate] = useState(todayISO());
  const [dateMode, setDateMode] = useState<'today' | 'yesterday' | 'pick'>('today');
  const [takeOff, setTakeOff] = useState(false);
  const [mode, setMode] = useState<'account' | 'record'>('account');
  const [receipt, setReceipt] = useState<string | null>(null);
  const [openRow, setOpenRow] = useState<'date' | 'account' | null>(null);
  const recording = !!onRecord && mode === 'record';
  const effective = typeof payAmount === 'number' ? payAmount : 0;
  const feeAmt = direction === 'out' && !noFees && typeof fee === 'number' && fee > 0 ? cents(fee) : 0;
  // Version 2.1 (canvas S4): a payment dated before balances were last updated is already in
  // them (the balance won't change), unless the person says it isn't.
  const asOf = model.balanceAccounts.asOfDate;
  const beforeBalances = !recording && direction === 'out' && !!asOf && date < asOf;
  const full = typeof fullAmount === 'number' ? fullAmount : amount;
  const minimum = typeof minimumAmount === 'number' ? minimumAmount : full;
  const short = editableAmount && effective > 0 && effective < minimum ? cents(minimum - effective) : 0;
  const partLeft = !editableAmount && !!partOption && effective > 0 && effective < amount ? cents(amount - effective) : 0;

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
    setFee('');
    setDate(todayISO());
    setDateMode('today');
    setTakeOff(false);
    setMode('account');
    setReceipt(null);
    setOpenRow(initial && initial.accountId && !accountProblem(model, direction, amount, initial) ? null : 'account');
    setPm(initial && initial.accountId && !accountProblem(model, direction, amount, initial) ? initial : undefined);
  }, [visible]);

  function confirm() {
    if (date > todayISO()) {
      setError("A payment can't be dated in the future.");
      return;
    }
    // Only an item with no cost may be ticked without an amount (code review 10-27).
    if (effective <= 0 && !(allowNoAmount && amount === 0)) {
      setError(direction === 'in' ? 'Enter how much you received.' : 'Enter how much you paid.');
      return;
    }
    if (recording) {
      if (confirmedRef.current) return;
      confirmedRef.current = true;
      onRecord?.(cents(effective), feeAmt, date, (withReceipt && receipt) || undefined);
      return;
    }
    const problem = accountProblem(model, direction, effective + feeAmt, pm);
    if (problem) {
      setError(problem);
      return;
    }
    if (confirmedRef.current) return;
    confirmedRef.current = true;
    onConfirm(pm as PaymentMethod, cents(effective), editableAmount && typeof lateFee === 'number' ? lateFee : 0, date, beforeBalances && takeOff, feeAmt, (withReceipt && receipt) || undefined);
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      grouped
      header={
        <View style={styles.bar}>
          <TouchableOpacity onPress={onClose} accessibilityRole="button" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.barBtn, { color: colors.gold }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.barTitle, { color: colors.ink }]} numberOfLines={1}>{title}</Text>
          <TouchableOpacity onPress={confirm} accessibilityRole="button" testID="pay-from-confirm" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.barBtn, { color: colors.gold, fontWeight: '700' }]}>{recording ? recordLabel || 'Save' : confirmLabel}</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        {!!onRecord && (
          <View style={{ marginBottom: 12 }}>
            <SegmentedControl<'account' | 'record'>
              accessibilityLabel="How it was paid"
              options={[
                { id: 'account', label: direction === 'in' ? 'Into an account' : 'From an account', testID: 'pay-mode-account' },
                { id: 'record', label: 'Just record it', testID: 'pay-mode-record' },
              ]}
              value={mode}
              onChange={(v) => {
                setMode(v);
                setError('');
              }}
            />
          </View>
        )}
        {!!dueText && <Text style={[styles.dueText, { color: colors.inkDim }]}>{dueText}</Text>}
        <MarkedLabel text={direction === 'in' ? 'Amount received' : 'Amount paid'} mark="required" style={[styles.fieldLabel, { color: colors.inkDim, textAlign: 'center', marginLeft: 0 }]} />
        <AmountInput centered value={payAmount} onChangeAmount={(v) => { setPayAmount(v); setError(''); }} inputStyle={[styles.editAmount, { color: direction === 'in' ? colors.positive : colors.ink }]} />
        <View style={[styles.quickRow, { justifyContent: 'center', marginTop: 2 }]}>
          {editableAmount && minimum < full && (
            <TouchableOpacity onPress={() => setPayAmount(minimum)} style={[styles.quick, { backgroundColor: effective === minimum ? colors.buttonFill : colors.navy1 }]} accessibilityRole="button">
              <Text style={[styles.quickText, { color: effective === minimum ? colors.onButton : colors.ink }]}>Minimum {formatPeso(minimum)}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setPayAmount(full)} style={[styles.quick, { backgroundColor: effective === full ? colors.buttonFill : colors.navy1 }]} accessibilityRole="button" testID="pay-amount-due">
            <Text style={[styles.quickText, { color: effective === full ? colors.onButton : colors.ink }]}>{editableAmount ? 'Full' : 'Due'} {formatPeso(full)}</Text>
          </TouchableOpacity>
        </View>
        {!!amountNote?.(effective) && (
          <Text style={[styles.note, { color: colors.orange }]} testID="pay-amount-note">{amountNote(effective)}</Text>
        )}
        {short > 0 && (
          <Text style={[styles.note, { color: colors.orange }]}>
            {formatPeso(short)} of the minimum is unpaid. It will be added to the next amount due.
          </Text>
        )}
        {partLeft > 0 && (
          <Text style={[styles.note, { color: colors.orange }]}>
            {formatPeso(partLeft)} {partOption!.repeats ? `will be added to your next ${partOption!.name} bill.` : 'stays owed on the same due date.'}
          </Text>
        )}
        {/* Cath 2026-10-27 ("not aligned", "forms look messy"): laid out as canvas R4 was
            drawn: one white group of rows, like every other form. */}
        <FormGroup style={{ marginTop: 6, marginBottom: 8 }}>
          {direction === 'out' && !noFees && <AmountRow mark="optional" label="Fees" value={fee} onChange={setFee} />}
          {editableAmount && !recording && <AmountRow mark="optional" label="Late fee from lender" value={lateFee} onChange={setLateFee} />}
          <PickerRow mark="required" label={direction === 'in' ? 'Received on' : 'Paid on'} value={dateMode === 'today' ? 'Today' : dateMode === 'yesterday' ? 'Yesterday' : shortISO(date)} open={openRow === 'date'} onToggle={() => setOpenRow((r) => (r === 'date' ? null : 'date'))} testID="pay-date-row">
            <View style={styles.quickRow}>
              {(
                [
                  ['today', 'Today'],
                  ['yesterday', 'Yesterday'],
                  ['pick', 'Pick a date'],
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
                      if (id !== 'pick') setOpenRow(null);
                    }}
                    style={[styles.quick, { backgroundColor: on ? colors.buttonFill : colors.navy2 }]}
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
          </PickerRow>
          {!recording && (
            <PickerRow mark="required" label={direction === 'in' ? 'Into' : 'Paid from'} value={pm ? accountLabel(model, pm) || 'Choose' : 'Choose'} open={openRow === 'account'} onToggle={() => setOpenRow((r) => (r === 'account' ? null : 'account'))} testID="pay-account-row">
              <AccountPicker noLabel mark="required" model={model} direction={direction} amount={effective + feeAmt} value={pm} onChange={(p) => { setPm(p); setError(''); setOpenRow(null); }} />
            </PickerRow>
          )}
        </FormGroup>
        {feeAmt > 0 && !recording && (
          <Text style={[styles.note, { color: colors.inkDim, marginHorizontal: 16 }]}>
            {formatPeso(cents(effective + feeAmt))} comes out{pm ? ` of ${accountLabel(model, pm) || 'the account'}` : ''}: the payment plus the fee. The fee is its own entry in Transactions (Fees).
          </Text>
        )}
        {editableAmount && !recording && (
          <Text style={[styles.note, { color: colors.inkDim, marginHorizontal: 16 }]}>A late fee from your lender is added to what you owe next.</Text>
        )}
        {recording ? (
          <View style={[styles.markCard, { backgroundColor: colors.accentTint }]} testID="pay-record-note">
            <View style={[styles.markIcon, { backgroundColor: colors.navy3 }]}>
              <Ionicons name="checkmark" size={18} color={colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.markTitle, { color: colors.ink }]}>Saved in its history, nothing else changes</Text>
              <Text style={[styles.markBody, { color: colors.inkDim }]}>
                No account is used and no balance or spending changes. For payments made before you used Finance Flow, or already counted somewhere else.
              </Text>
              {!!recordNote && <Text style={[styles.markBody, { color: colors.inkDim }]}>{recordNote}</Text>}
            </View>
          </View>
        ) : (
          beforeBalances && (
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
              {!!onRecord && <Text style={{ fontSize: 13, lineHeight: 18, color: colors.inkDim, marginTop: 8 }}>Only keeping a record? Use "Just record it" at the top: no account needed.</Text>}
            </View>
          )
        )}
        {withReceipt && <ReceiptField photo={receipt} onChange={setReceipt} testID="pay-receipt" style={{ borderRadius: 16, marginTop: 12, marginBottom: 12 }} />}
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
  editAmount: { fontSize: 36, fontWeight: '800' },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -6, marginBottom: 10 },
  quick: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  quickText: { fontSize: 14, fontWeight: '600' },
  note: { fontSize: 13, marginBottom: 10, marginLeft: 4 },
  dueText: { fontSize: 14, textAlign: 'center', marginBottom: 10 },
  balanceNote: { borderRadius: 14, padding: 12, marginBottom: 12 },
  check: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  markCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 16, padding: 16, marginTop: 4 },
  markIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  markTitle: { fontSize: 16, fontWeight: '700' },
  markBody: { fontSize: 14, lineHeight: 20, marginTop: 4 },
});
