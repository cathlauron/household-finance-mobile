import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from './AppText';
import BottomSheet from './BottomSheet';
import { useTheme } from '../ThemeContext';
import { currentCycle, placePayment, type PaymentPlacement } from '../billPayments';
import { todayISO } from '../dateUtils';
import type { Bill, Debt } from '../types';

// Version 3 (Cath, canvas M4a): you paid, then moved the due date. Which bill was the
// payment for? The new due date's bill is suggested; the other choice is the bill of the
// month it was paid in. Used by Bills and Debts.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function parts(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}
function short(iso: string) {
  const { m, d } = parts(iso);
  return `${MONTHS[m - 1].slice(0, 3)} ${d}`;
}
function monthName(iso: string) {
  const { y, m } = parts(iso);
  return y === new Date().getFullYear() ? MONTHS[m - 1] : `${MONTHS[m - 1]} ${y}`;
}
function peso(n: number) {
  return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export type PlacePaymentAsk = {
  record: Bill | Debt;
  placement: PaymentPlacement;
  noun: 'bill' | 'payment';
  onPick: (forISO: string) => void;
} | null;

export default function PlacePaymentSheet({ value, onClose }: { value: PlacePaymentAsk; onClose: () => void }) {
  const { colors } = useTheme();
  const [pick, setPick] = useState<'new' | 'other'>('new');
  useEffect(() => {
    if (value) setPick('new');
  }, [value]);
  if (!value || !value.placement.other) return null;
  const { record, placement: p, noun } = value;
  const other = p.other as string;
  const afterNew = currentCycle(placePayment(record, p, p.newDue))?.dueDate;
  const overdue = p.newDue < todayISO();
  const choices = [
    {
      key: 'new' as const,
      title: `${monthName(p.newDue)} ${noun}`,
      sub: `Counts for ${short(p.newDue)}.` + (afterNew ? ` ${monthName(afterNew)}'s ${noun} (${short(afterNew)}) is next.` : ''),
      suggested: true,
    },
    {
      key: 'other' as const,
      title: `${monthName(other)} ${noun}`,
      sub: `Counts for ${short(other)}. ${monthName(p.newDue)} shows as ${overdue ? 'unpaid (overdue)' : 'still to pay'}.`,
      suggested: false,
    },
  ];
  return (
    <BottomSheet visible={!!value} onClose={onClose}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 28 }}>
        <View style={[s.icon, { backgroundColor: colors.accentTint }]}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.gold }}>₱</Text>
        </View>
        <Text style={[s.title, { color: colors.ink }]}>{noun === 'bill' ? 'Which bill was this for?' : 'Which payment was this?'}</Text>
        <Text style={[s.body, { color: colors.inkDim }]}>
          You paid {peso(p.amountPaid)} on {short(p.paidDate)}. You moved the due date to {short(p.newDue)}.
        </Text>
        {choices.map((c) => {
          const on = pick === c.key;
          return (
            <TouchableOpacity
              key={c.key}
              testID={`place-payment-${c.key}`}
              onPress={() => setPick(c.key)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              style={[s.choice, { borderColor: on ? colors.gold : colors.navy4, backgroundColor: on ? colors.accentTint : colors.navy3 }]}
            >
              <View style={[s.radio, { borderColor: colors.gold }]}>{on && <View style={[s.radioDot, { backgroundColor: colors.gold }]} />}</View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <Text style={[s.choiceTitle, { color: colors.ink }]}>{c.title}</Text>
                  {c.suggested && (
                    <Text style={[s.badge, { color: colors.gold, backgroundColor: colors.accentTint, borderColor: colors.gold + '55' }]}>Suggested</Text>
                  )}
                </View>
                <Text style={[s.choiceSub, { color: colors.inkDim }]}>{c.sub}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          testID="place-payment-save"
          onPress={() => value.onPick(pick === 'new' ? p.newDue : other)}
          style={[s.primary, { backgroundColor: colors.buttonFill }]}
          accessibilityRole="button"
        >
          <Text style={[s.primaryText, { color: colors.onButton }]}>Save</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  icon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  title: { fontSize: 21, fontWeight: '800', textAlign: 'center', marginTop: 12 },
  body: { fontSize: 15, lineHeight: 21, textAlign: 'center', marginTop: 6, marginBottom: 6 },
  choice: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', borderRadius: 16, borderWidth: 2, padding: 14, marginTop: 10 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  radioDot: { width: 12, height: 12, borderRadius: 6 },
  choiceTitle: { fontSize: 17, fontWeight: '700' },
  choiceSub: { fontSize: 14, lineHeight: 19, marginTop: 3 },
  badge: { fontSize: 12, fontWeight: '700', borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 9, paddingVertical: 2, overflow: 'hidden' },
  primary: { borderRadius: 28, paddingVertical: 16, alignItems: 'center', marginTop: 18 },
  primaryText: { fontSize: 17, fontWeight: '700' },
});
