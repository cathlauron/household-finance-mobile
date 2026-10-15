import React, { useEffect, useRef, useState } from 'react';
import DateField from './DateField';
import { getNextDueDate, RecurringType } from '../recurrence';
import { View, TouchableOpacity, StyleSheet, ScrollView, Switch, KeyboardTypeOptions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from './AppText';
import AmountInput from './AmountInput';
import { useTheme } from '../ThemeContext';
import { hapticSelection } from '../haptics';
import { cardColor } from './CardFace';
import type { HouseholdModel, PaymentMethod } from '../types';
import type { ThemeColors } from '../theme';

// Approved "Option 2: simple" forms (Forms Redesign canvas, 2026-10-15): the big amount
// at the top, then one white list of rows (label on the left, value on the right, like
// iPhone Settings). Tapping a row opens its choices right under it; tap again to close.
// Extras live under "More details". One short grey line at the bottom says what happens.

export function SheetBar({ title, onCancel, onDone, doneLabel, busy }: { title: string; onCancel: () => void; onDone: () => void; doneLabel: string; busy?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={bar.row}>
      <TouchableOpacity onPress={onCancel} accessibilityRole="button" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={[bar.btn, { color: colors.gold }]}>Cancel</Text>
      </TouchableOpacity>
      <Text style={[bar.title, { color: colors.ink }]} numberOfLines={1}>{title}</Text>
      <TouchableOpacity onPress={onDone} disabled={busy} accessibilityRole="button" testID="simple-form-done" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={[bar.btn, { color: colors.gold, fontWeight: '700', opacity: busy ? 0.5 : 1 }]}>{doneLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const bar = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 2, paddingBottom: 8, gap: 12 },
  btn: { fontSize: 17 },
  title: { fontSize: 17, fontWeight: '700', flexShrink: 1 },
});

// The one big number at the top of the form.
export function BigAmount({ label, value, onChange, color, autoFocus }: { label: string; value: number | ''; onChange: (v: number | '') => void; color: string; autoFocus?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingTop: 4, paddingBottom: 16 }}>
      <Text style={{ fontSize: 13, color: colors.inkDim }}>{label}</Text>
      <AmountInput
        autoFocus={autoFocus}
        value={value}
        onChangeAmount={onChange}
        style={{ backgroundColor: 'transparent', justifyContent: 'center', minHeight: 60, marginBottom: 0 }}
        inputStyle={{ fontSize: 40, fontWeight: '800', textAlign: 'center', flex: 0, minWidth: 140, color }}
      />
    </View>
  );
}

// A white group of rows with thin lines between them.
export function FormGroup({ children, style }: { children: React.ReactNode; style?: any }) {
  const { colors } = useTheme();
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[{ backgroundColor: colors.navy3, borderRadius: 16, overflow: 'hidden', marginBottom: 20 }, style]}>
      {items.map((child, i) => (
        <View key={i} style={i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 } : undefined}>
          {child}
        </View>
      ))}
    </View>
  );
}

export function InputRow({ label, value, onChangeText, placeholder, autoFocus, keyboardType, testID }: { label: string; value: string; onChangeText: (t: string) => void; placeholder?: string; autoFocus?: boolean; keyboardType?: KeyboardTypeOptions; testID?: string }) {
  const { colors } = useTheme();
  const s = rowStyles(colors);
  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        testID={testID}
        autoFocus={autoFocus}
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkFaint}
        keyboardType={keyboardType}
      />
    </View>
  );
}

export function AmountRow({ label, value, onChange, placeholder }: { label: string; value: number | ''; onChange: (v: number | '') => void; placeholder?: string }) {
  const { colors } = useTheme();
  const s = rowStyles(colors);
  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <AmountInput
        value={value}
        onChangeAmount={onChange}
        placeholder={placeholder ?? '0.00'}
        style={{ flex: 1, backgroundColor: 'transparent', marginBottom: 0, minHeight: 44, paddingHorizontal: 0, justifyContent: 'flex-end' }}
        inputStyle={{ textAlign: 'right', flex: 0, minWidth: 90 }}
      />
    </View>
  );
}

// A row that opens its choices right underneath when tapped.
export function PickerRow({
  label,
  value,
  dot,
  open,
  onToggle,
  children,
  testID,
}: {
  label: string;
  value: string;
  dot?: string | null;
  open: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
  testID?: string;
}) {
  const { colors } = useTheme();
  const s = rowStyles(colors);
  return (
    <View>
      <TouchableOpacity style={s.row} onPress={() => { hapticSelection(); onToggle(); }} accessibilityRole="button" accessibilityState={{ expanded: open }} testID={testID}>
        <Text style={[s.label, { flex: 1 }]}>{label}</Text>
        {!!dot && <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: dot, marginRight: 6 }} />}
        <Text style={s.value} numberOfLines={1}>{value}</Text>
        <Ionicons name={open ? 'chevron-down' : 'chevron-forward'} size={16} color={colors.inkFaint} style={{ marginLeft: 6 }} />
      </TouchableOpacity>
      {open && <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>{children}</View>}
    </View>
  );
}

export function SwitchRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  const s = rowStyles(colors);
  return (
    <View style={s.row}>
      <Text style={[s.label, { flex: 1 }]}>{label}</Text>
      <Switch value={value} onValueChange={(v) => { hapticSelection(); onChange(v); }} trackColor={{ true: colors.buttonFill, false: colors.navy4 }} />
    </View>
  );
}

export function Footnote({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return <Text style={{ fontSize: 13, lineHeight: 18, color: colors.inkDim, marginTop: -10, marginBottom: 16, marginHorizontal: 16 }}>{children}</Text>;
}

// Chips for picking one option inside an open row.
export function Choices<T extends string>({ options, value, onChange }: { options: { id: T; label: string }[]; value: T | '' | null | undefined; onChange: (v: T) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const on = value === o.id;
        return (
          <TouchableOpacity
            key={o.id}
            onPress={() => { hapticSelection(); onChange(o.id); }}
            style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: on ? colors.accentTint : colors.navy2 }}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
          >
            <Text style={{ fontSize: 15, fontWeight: on ? '700' : '600', color: on ? colors.gold : colors.ink }}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// A sideways row of day numbers (1 to 31); the chosen one scrolls into view.
export function DayStrip({ value, onChange }: { value: number | null; onChange: (d: number) => void }) {
  const { colors } = useTheme();
  const ref = useRef<ScrollView>(null);
  useEffect(() => {
    if (value) setTimeout(() => ref.current?.scrollTo({ x: Math.max(0, (value - 3) * 46), animated: false }), 0);
  }, []);
  return (
    <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} keyboardShouldPersistTaps="handled">
      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
        const on = d === value;
        return (
          <TouchableOpacity
            key={d}
            onPress={() => { hapticSelection(); onChange(d); }}
            style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.buttonFill : colors.navy2 }}
            accessibilityRole="button"
            accessibilityLabel={`Day ${d}`}
            accessibilityState={{ selected: on }}
          >
            <Text style={{ fontSize: on ? 17 : 15, fontWeight: on ? '800' : '600', color: on ? colors.onButton : colors.inkDim }}>{d}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// A list of your accounts, each with its colour square, for "Paid from" style rows.
export function AccountChoices({ model, value, onChange, optional }: { model: HouseholdModel; value?: PaymentMethod; onChange: (pm: PaymentMethod | undefined) => void; optional?: boolean }) {
  const { colors } = useTheme();
  const groups: Array<'cash' | 'debit' | 'credit'> = ['cash', 'debit', 'credit'];
  const rows = groups.flatMap((g) => (model.balanceAccounts[g] || []).map((a) => ({ g, a })));
  if (rows.length === 0) return <Text style={{ fontSize: 15, color: colors.inkDim }}>Add an account first (Home › Accounts).</Text>;
  return (
    <View style={{ gap: 6 }}>
      {rows.map(({ g, a }) => {
        const on = value?.type === g && value?.accountId === a.id;
        return (
          <TouchableOpacity
            key={`${g}:${a.id}`}
            onPress={() => { hapticSelection(); onChange(on && optional ? undefined : { type: g, accountId: a.id }); }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 12, borderRadius: 12, backgroundColor: on ? colors.accentTint : colors.navy2 }}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
          >
            <View style={{ width: 22, height: 15, borderRadius: 4, backgroundColor: cardColor(a, g) }} />
            <Text style={{ flex: 1, fontSize: 16, fontWeight: on ? '700' : '500', color: colors.ink }} numberOfLines={1}>{a.name || g}</Text>
            {on && <Ionicons name="checkmark" size={18} color={colors.gold} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function accountName(model: HouseholdModel, pm?: PaymentMethod): string | null {
  if (!pm) return null;
  const list = model.balanceAccounts[pm.type] || [];
  const a = pm.accountId ? list.find((x) => x.id === pm.accountId) : list[0];
  return a?.name || (pm.type === 'cash' ? 'Cash' : pm.type === 'debit' ? 'Debit' : 'Credit');
}

function rowStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 16, gap: 12 },
    label: { fontSize: 17, color: colors.ink },
    value: { fontSize: 17, color: colors.inkDim, flexShrink: 1, textAlign: 'right' },
    input: { flex: 1, fontSize: 17, color: colors.ink, textAlign: 'right', paddingVertical: 12 },
  });
}

// Which row's choices are open (one at a time); closes everything when the form closes.
export function useOpenRow(formOpen: boolean): [string | null, (row: string) => void] {
  const [openRow, setOpenRow] = useState<string | null>(null);
  useEffect(() => {
    if (!formOpen) setOpenRow(null);
  }, [formOpen]);
  return [openRow, (row: string) => setOpenRow((cur) => (cur === row ? null : row))];
}

export function repeatLabel(rt: RecurringType): string {
  return rt === 'onetime' ? 'Once' : rt === 'monthly' ? 'Every month' : rt === 'annual' ? 'Every year' : 'Custom';
}

export const REPEAT_CHOICES: { id: RecurringType; label: string }[] = [
  { id: 'onetime', label: 'Once' },
  { id: 'monthly', label: 'Every month' },
  { id: 'annual', label: 'Every year' },
];

function niceDate(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// "the 15th", "Mar 15" or "Sun, Nov 15" for the Due on row.
export function scheduleLabel(rt: RecurringType, date: string, day: string, month: string): string {
  if (rt === 'onetime') return date ? niceDate(new Date(date + 'T00:00:00')) : 'Choose';
  if (rt === 'monthly') return day ? `the ${ordinal(parseInt(day, 10))}` : 'Choose';
  return day && month ? `${MONTHS_SHORT[parseInt(month, 10) - 1] ?? ''} ${parseInt(day, 10)}` : 'Choose';
}

export function nextDateFor(rt: RecurringType, date: string, day: string, month: string): Date | null {
  if (rt === 'onetime') return date ? new Date(date + 'T00:00:00') : null;
  const d = getNextDueDate(rt, rt === 'monthly' ? { day } : { day, month: month ? parseInt(month, 10) : '' });
  return d && !isNaN(d.getTime()) ? d : null;
}

export function nextDateText(prefix: string, d: Date | null): string {
  return d ? `${prefix} ${niceDate(d)}.` : '';
}

// The choices under a "Due on" row: a date for one-time, days for monthly, month + day for yearly.
export function ScheduleChoices({ rt, date, onDate, day, onDay, month, onMonth, testID }: { rt: RecurringType; date: string; onDate: (v: string) => void; day: string; onDay: (v: string) => void; month: string; onMonth: (v: string) => void; testID?: string }) {
  if (rt === 'onetime') return <DateField value={date} onChange={onDate} placeholder="Pick a date" testID={testID} />;
  return (
    <>
      {rt === 'annual' && (
        <View style={{ marginBottom: 10 }}>
          <Choices options={MONTHS_SHORT.map((m, i) => ({ id: String(i + 1), label: m }))} value={month} onChange={onMonth} />
        </View>
      )}
      <DayStrip value={parseInt(day, 10) || null} onChange={(d) => onDay(String(d))} />
    </>
  );
}

// A small grey label and a field, used inside an open row (More details).
export function InlineField({ label, value, onChangeText, placeholder, keyboardType, multiline }: { label: string; value: string; onChangeText: (t: string) => void; placeholder?: string; keyboardType?: KeyboardTypeOptions; multiline?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inkDim, marginBottom: 6 }}>{label}</Text>
      <TextInput
        style={{ backgroundColor: colors.navy2, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: colors.ink }}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkFaint}
        keyboardType={keyboardType}
        multiline={multiline}
      />
    </View>
  );
}

export function InlineAmount({ label, value, onChange, placeholder }: { label: string; value: number | ''; onChange: (v: number | '') => void; placeholder?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inkDim, marginBottom: 6 }}>{label}</Text>
      <AmountInput value={value} onChangeAmount={onChange} placeholder={placeholder ?? '0.00'} style={{ backgroundColor: colors.navy2, marginBottom: 0 }} />
    </View>
  );
}
