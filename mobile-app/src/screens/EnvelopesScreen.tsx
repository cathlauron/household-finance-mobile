import React, { useLayoutEffect, useMemo, useState } from 'react';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import AppSwitch from '../components/AppSwitch';
import { View, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Text, TextInput } from '../components/AppText';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { formatPeso } from '../balanceProjection';
import { computeEnvelopes, monthKey, type EnvelopeRow } from '../envelopes';
import GradientFill from '../components/GradientFill';
import BottomSheet from '../components/BottomSheet';
import AmountInput from '../components/AmountInput';
import { makeId } from '../utils';
import type { ThemeColors } from '../theme';
import type { CategoryBudget, HouseholdModel } from '../types';

// Redesign: the Envelopes page from the Finance Flow mockup (Settings › Budgeting ›
// Envelopes). Give every peso a job: each envelope is a category with a monthly amount
// (the same list as Watched categories). Shows what is left in each this month, what
// hasn't been given a job yet, and can roll leftovers into next month. See envelopes.ts.

type SheetState =
  | { kind: 'add' }
  | { kind: 'edit'; envelope: CategoryBudget }
  | { kind: 'assign' }
  | null;

export default function EnvelopesScreen() {
  const { colors } = useTheme();
  const { model, saveModel } = useData();
  const navigation = useNavigation<any>();
  const styles = makeStyles(colors);
  const [sheet, setSheet] = useState<SheetState>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: 'Envelopes', headerBackTitle: 'Budgeting' });
  }, [navigation]);

  const summary = useMemo(() => (model ? computeEnvelopes(model) : null), [model]);
  if (!model || !summary) return null;

  async function save(next: HouseholdModel) {
    try {
      await saveModel(next);
    } catch {
      Alert.alert('Failed to save', 'Please try again.');
    }
  }

  function toggleRollover(on: boolean) {
    if (!model) return;
    const now = new Date();
    save({
      ...model,
      settings: {
        ...model.settings,
        envelopeRollover: on,
        // Count leftovers from this month on; switching it off and on starts fresh.
        envelopeRolloverFrom: on ? monthKey(now.getFullYear(), now.getMonth()) : undefined,
      },
    });
  }

  const { rows, unassigned, baseKind } = summary;
  const baseNote =
    baseKind === 'budget'
      ? 'From your monthly budget'
      : baseKind === 'income'
        ? `From your expected paydays in ${summary.monthLabel}`
        : 'Set a monthly budget or add your income to see this';

  return (
    <KeyboardAwareScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.intro}>Give every peso a job. What is left in an envelope can roll into next month.</Text>

      <View style={[styles.group, styles.unassigned]}>
        <GradientFill match={[styles.group, styles.unassigned]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.foot}>{unassigned < 0 ? 'Given out more than you have' : 'Not given a job yet'}</Text>
          <Text style={[styles.big, { color: unassigned < 0 ? colors.negative : colors.positive }]}>
            {formatPeso(Math.abs(unassigned))}
          </Text>
          <Text style={styles.foot}>{baseNote}</Text>
        </View>
        <TouchableOpacity
          style={[styles.tinted, { backgroundColor: colors.accentTint }]}
          onPress={() => setSheet(rows.length > 0 ? { kind: 'assign' } : { kind: 'add' })}
          accessibilityRole="button"
          testID="envelopes-assign"
        >
          <Text style={[styles.tintedText, { color: colors.gold }]}>Assign</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.header}>{summary.monthLabel}</Text>
      <View style={styles.group}>
        <GradientFill match={styles.group} />
        {rows.map((r, i) => (
          <EnvelopeCell key={r.envelope.id} row={r} first={i === 0} colors={colors} styles={styles} onPress={() => setSheet({ kind: 'edit', envelope: r.envelope })} />
        ))}
        <TouchableOpacity
          style={[styles.row, rows.length > 0 && styles.rowTop]}
          onPress={() => setSheet({ kind: 'add' })}
          accessibilityRole="button"
          testID="envelopes-add"
        >
          <Text style={[styles.rowTitle, { color: colors.gold }]}>Add an envelope</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.footer}>Spending counts by category. Envelopes are also your watched categories, so you get a heads-up on Home when one runs low.</Text>

      <View style={[styles.group, { marginTop: 24 }]}>
        <GradientFill match={[styles.group, { marginTop: 24 }]} />
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.rowTitle}>Roll leftovers into next month</Text>
            <Text style={styles.rowSub}>Counts from the month you turn this on.</Text>
          </View>
          <AppSwitch
            value={!!model.settings.envelopeRollover}
            onValueChange={toggleRollover}
            trackColor={{ true: colors.buttonFill, false: colors.navy4 }}
            accessibilityLabel="Roll leftovers into next month"
          />
        </View>
      </View>

      <EnvelopeSheet sheet={sheet} onClose={() => setSheet(null)} model={model} rows={rows} unassigned={unassigned} onSave={save} />
    </KeyboardAwareScrollView>
  );
}

function EnvelopeCell({ row, first, colors, styles, onPress }: { row: EnvelopeRow; first: boolean; colors: ThemeColors; styles: ReturnType<typeof makeStyles>; onPress: () => void }) {
  const over = row.left < 0;
  const barColor = row.pct >= 100 ? colors.negative : row.pct >= 80 ? colors.orange : colors.accent;
  const sub =
    row.spent <= 0
      ? 'Nothing spent yet'
      : `${formatPeso(row.spent)} of ${formatPeso(row.available)} spent`;
  return (
    <TouchableOpacity
      style={[styles.envRow, !first && styles.rowTop]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${row.envelope.category}, ${over ? `${formatPeso(-row.left)} over` : `${formatPeso(row.left)} left`}`}
    >
      <View style={styles.envTop}>
        <Text style={[styles.rowTitle, { flex: 1 }]} numberOfLines={1}>{row.envelope.category}</Text>
        <Text style={[styles.amount, { color: over ? colors.negative : colors.positive }]}>
          {over ? `${formatPeso(-row.left)} over` : `${formatPeso(row.left)} left`}
        </Text>
      </View>
      <Text style={styles.rowSub}>
        {sub}
        {row.carried > 0 ? ` · ${formatPeso(row.carried)} rolled over` : ''}
      </Text>
      <View style={[styles.track, { backgroundColor: colors.navy4 }]}>
        <View style={[styles.fill, { width: `${Math.min(100, row.pct)}%`, backgroundColor: barColor }]} />
      </View>
    </TouchableOpacity>
  );
}

// One sheet for adding, editing and assigning, each with Cancel / title / Save on top.
function EnvelopeSheet({
  sheet,
  onClose,
  model,
  rows,
  unassigned,
  onSave,
}: {
  sheet: SheetState;
  onClose: () => void;
  model: HouseholdModel;
  rows: EnvelopeRow[];
  unassigned: number;
  onSave: (next: HouseholdModel) => void;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [targetId, setTargetId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [openedFor, setOpenedFor] = useState<SheetState>(null);

  // Fill the fields each time the sheet opens.
  if (sheet !== openedFor) {
    setOpenedFor(sheet);
    setError('');
    if (sheet?.kind === 'edit') {
      setCategory(sheet.envelope.category);
      setAmount(typeof sheet.envelope.monthlyBudget === 'number' ? sheet.envelope.monthlyBudget : '');
    } else if (sheet?.kind === 'assign') {
      setTargetId(rows[0]?.envelope.id ?? null);
      setAmount(unassigned > 0 ? unassigned : '');
    } else {
      setCategory('');
      setAmount('');
    }
  }

  const budgets = model.categoryBudgets || [];
  const taken = new Set(budgets.map((b) => b.category.trim().toLowerCase()));
  const suggestions = (model.categories || [])
    .map((c) => c.name)
    .filter((n) => !!n && !taken.has(n.trim().toLowerCase()));

  function confirm() {
    if (!sheet) return;
    const amt = typeof amount === 'number' ? amount : 0;
    if (sheet.kind === 'assign') {
      if (!targetId) return setError('Choose an envelope.');
      if (amt <= 0) return setError('Enter an amount.');
      onSave({
        ...model,
        categoryBudgets: budgets.map((b) =>
          b.id === targetId ? { ...b, monthlyBudget: (typeof b.monthlyBudget === 'number' ? b.monthlyBudget : 0) + amt } : b
        ),
      });
      onClose();
      return;
    }
    const name = category.trim();
    if (!name) return setError('Choose or type a category.');
    if (amt <= 0) return setError('Enter a monthly amount.');
    const clash = budgets.find(
      (b) => b.category.trim().toLowerCase() === name.toLowerCase() && (sheet.kind === 'add' || b.id !== sheet.envelope.id)
    );
    if (clash) return setError(`There is already an envelope for ${clash.category}.`);
    if (sheet.kind === 'add') {
      onSave({ ...model, categoryBudgets: [...budgets, { id: makeId('budget'), category: name, monthlyBudget: amt }] });
    } else {
      onSave({
        ...model,
        categoryBudgets: budgets.map((b) => (b.id === sheet.envelope.id ? { ...b, category: name, monthlyBudget: amt } : b)),
      });
    }
    onClose();
  }

  function confirmRemove() {
    if (sheet?.kind !== 'edit') return;
    const env = sheet.envelope;
    onClose();
    Alert.alert(`Remove the ${env.category} envelope?`, 'Your transactions stay as they are. It also stops being a watched category.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => onSave({ ...model, categoryBudgets: budgets.filter((b) => b.id !== env.id) }),
      },
    ]);
  }

  const title = sheet?.kind === 'add' ? 'New envelope' : sheet?.kind === 'assign' ? 'Assign money' : 'Envelope';

  return (
    <BottomSheet
      visible={!!sheet}
      onClose={onClose}
      header={
        <View style={styles.bar}>
          <TouchableOpacity onPress={onClose} accessibilityRole="button" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.barBtn, { color: colors.gold }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.barTitle, { color: colors.ink }]} numberOfLines={1}>{title}</Text>
          <TouchableOpacity onPress={confirm} accessibilityRole="button" testID="envelope-save" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.barBtn, { color: colors.gold, fontWeight: '700' }]}>{sheet?.kind === 'assign' ? 'Assign' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        {sheet?.kind === 'assign' ? (
          <>
            <Text style={styles.label}>Put it into</Text>
            <View style={styles.chips}>
              {rows.map((r) => {
                const on = r.envelope.id === targetId;
                return (
                  <TouchableOpacity
                    key={r.envelope.id}
                    style={[styles.chip, { backgroundColor: on ? colors.accentTint : colors.navy4 }]}
                    onPress={() => { setTargetId(r.envelope.id); setError(''); }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <Text style={[styles.chipText, { color: on ? colors.gold : colors.ink }]}>{r.envelope.category}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.label}>How much to add</Text>
          </>
        ) : (
          <>
            <Text style={styles.label}>Category</Text>
            <TextInput
              autoFocus={sheet?.kind === 'add'}
              style={styles.input}
              placeholder="e.g. Groceries"
              placeholderTextColor={colors.inkDim}
              value={category}
              onChangeText={(t) => { setCategory(t); setError(''); }}
            />
            {sheet?.kind === 'add' && suggestions.length > 0 && (
              <View style={styles.chips}>
                {suggestions.slice(0, 12).map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.chip, { backgroundColor: category === n ? colors.accentTint : colors.navy4 }]}
                    onPress={() => { setCategory(n); setError(''); }}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.chipText, { color: category === n ? colors.gold : colors.ink }]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <Text style={styles.label}>Each month</Text>
          </>
        )}
        <AmountInput autoFocus={sheet?.kind === 'assign'} style={styles.amountInput} value={amount} onChangeAmount={(v) => { setAmount(v); setError(''); }} placeholder="0" />
        {!!error && <Text style={[styles.error, { color: colors.negative }]}>{error}</Text>}
        {sheet?.kind === 'edit' && (
          <TouchableOpacity style={styles.removeBtn} onPress={confirmRemove} accessibilityRole="button">
            <Text style={[styles.rowTitle, { color: colors.negative }]}>Remove envelope</Text>
          </TouchableOpacity>
        )}
      </View>
    </BottomSheet>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: { paddingHorizontal: 16, paddingBottom: 40 },
    intro: { fontSize: 15, lineHeight: 20, color: colors.inkDim, marginBottom: 16 },
    header: { fontSize: 13, fontWeight: '600', color: colors.inkDim, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 22, marginBottom: 6, marginLeft: 16 },
    footer: { fontSize: 13, lineHeight: 18, color: colors.inkDim, marginTop: 6, marginHorizontal: 16 },
    group: { backgroundColor: colors.navy3, borderRadius: 12, overflow: 'hidden' },
    unassigned: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
    foot: { fontSize: 13, color: colors.inkDim },
    big: { fontSize: 22, fontWeight: '700', marginVertical: 2 },
    tinted: { minHeight: 36, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center' },
    tintedText: { fontSize: 15, fontWeight: '600' },
    row: { flexDirection: 'row', alignItems: 'center', minHeight: 54, paddingHorizontal: 16, paddingVertical: 10 },
    rowTop: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    envRow: { paddingHorizontal: 16, paddingVertical: 12 },
    envTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    rowTitle: { fontSize: 17, color: colors.ink },
    rowSub: { fontSize: 13, color: colors.inkDim, marginTop: 2 },
    amount: { fontSize: 17, fontWeight: '600' },
    track: { height: 6, borderRadius: 999, overflow: 'hidden', marginTop: 8 },
    fill: { height: '100%', borderRadius: 999 },
    bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 2, paddingBottom: 12, gap: 12 },
    barBtn: { fontSize: 17 },
    barTitle: { fontSize: 17, fontWeight: '600', flexShrink: 1 },
    label: { fontSize: 13, color: colors.inkDim, marginTop: 12, marginBottom: 6 },
    input: { backgroundColor: colors.navy4, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 17, color: colors.ink },
    amountInput: { backgroundColor: colors.navy4, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
    chipText: { fontSize: 15 },
    error: { fontSize: 14, marginTop: 8 },
    removeBtn: { marginTop: 20, paddingVertical: 10, alignItems: 'center' },
  });
}
