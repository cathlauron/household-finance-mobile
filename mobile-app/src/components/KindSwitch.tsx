// Version 2.2 (Cath, canvas K1 "New debt" with Bill | Debt | Loan at the top): at the top
// of a NEW bill, debt or loan form. One short line says what it is; picked the wrong one?
// Tap another and that form opens with the amount and name you typed. The "?" explains
// the difference between a transaction, a bill, a debt and a loan.
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './AppText';
import { TouchableOpacity } from './Tap';
import SegmentedControl from './SegmentedControl';
import { useTheme } from '../ThemeContext';
import type { ToPaySub } from '../fabActions';

const LINE: Record<ToPaySub, string> = {
  bills: 'Comes back every month or year · Meralco, rent, Netflix',
  debts: 'Owed and paid down over time · credit card, utang',
  loans: 'Set payments until an end date · car, Pag-IBIG, money lent',
};

const EXPLAIN: { title: string; text: string }[] = [
  { title: 'Transaction', text: 'Money that already moved: a purchase, a payday, a transfer. Paying a bill, debt or loan adds one for you.' },
  { title: 'Bill', text: 'Something you pay again and again for a service. It comes back every month or year: Meralco, internet, rent, water, insurance, Netflix.' },
  { title: 'Debt', text: 'Money you owe and pay down over time, and it may grow with interest: a credit card balance, money borrowed from a friend, a store or PayLater, utang.' },
  { title: 'Loan', text: 'A set amount borrowed (or lent), paid back in equal payments until a set end date: a car, housing, salary or Pag-IBIG loan, or money you lent someone.' },
];

export default function KindSwitch({ current, onSwitch }: { current: ToPaySub; onSwitch: (to: ToPaySub) => void }) {
  const { colors } = useTheme();
  const [help, setHelp] = useState(false);
  return (
    <View style={{ marginBottom: 12 }}>
      <SegmentedControl<ToPaySub>
        accessibilityLabel="What are you adding?"
        options={[
          { id: 'bills', label: 'Bill' },
          { id: 'debts', label: 'Debt' },
          { id: 'loans', label: 'Loan' },
        ]}
        value={current}
        onChange={(v) => v !== current && onSwitch(v)}
      />
      <View style={s.lineRow}>
        <Text style={[s.line, { color: colors.inkDim }]}>{LINE[current]}</Text>
        <TouchableOpacity
          onPress={() => setHelp((h) => !h)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={help ? 'Hide what each one means' : 'What is the difference?'}
          style={[s.q, { borderColor: help ? colors.gold : colors.inkDim }]}
        >
          <Ionicons name="help" size={15} color={help ? colors.gold : colors.inkDim} />
        </TouchableOpacity>
      </View>
      {help && (
        <View style={[s.card, { backgroundColor: colors.navy3 }]}>
          {EXPLAIN.map((e) => (
            <View key={e.title} style={{ marginBottom: 10 }}>
              <Text style={[s.title, { color: colors.ink }]}>{e.title}</Text>
              <Text style={[s.text, { color: colors.inkDim }]}>{e.text}</Text>
            </View>
          ))}
          <Text style={[s.text, { color: colors.ink }]}>Quick way to tell: a bill never ends, a debt ends when it's paid down, a loan ends on a date you already know.</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, paddingHorizontal: 4 },
  line: { flex: 1, fontSize: 13, lineHeight: 18 },
  q: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 16, padding: 14, marginTop: 10 },
  title: { fontSize: 15, fontWeight: '700' },
  text: { fontSize: 14, lineHeight: 20, marginTop: 2 },
});
