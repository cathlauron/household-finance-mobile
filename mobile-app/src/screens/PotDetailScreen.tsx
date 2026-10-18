import React, { useLayoutEffect, useState } from 'react';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { showSaved } from '../components/SavedToast';
import AppSwitch from '../components/AppSwitch';
import { View, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/AppText';
import { headerButtonText } from '../navigation/LargeHeader';
import GradientFill from '../components/GradientFill';
import BottomSheet from '../components/BottomSheet';
import AmountInput from '../components/AmountInput';
import AccountPicker, { accountProblem } from '../components/AccountPicker';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { formatPeso } from '../balanceProjection';
import { accountLabel } from '../transactionActions';
import { todayISO } from '../dateUtils';
import { hapticLight } from '../haptics';
import {
  isEmergencyPot,
  potSaved,
  potTarget,
  monthsCovered,
  efTargetMonths,
  monthlyPace,
  fullByLabel,
  withContribution,
  applyAutoSavings,
} from '../savingsPots';
import type { ThemeColors } from '../theme';
import type { PaymentMethod, SavingsGoal } from '../types';

// Redesign: one savings pot (the Finance Flow "Emergency Fund" page, opened from
// Savings › Pots). How much is saved toward its goal, Add money / Move out, its history,
// and its settings: target, where the money is kept, and an amount added every payday.

type Sheet = null | 'add' | 'out' | 'keptIn' | 'auto';

function shortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function PotDetailScreen() {
  const { colors } = useTheme();
  const { model, saveModel } = useData();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id: string = route.params?.id;
  // Ignores a second tap on Save while the first one is still saving.
  const busyRef = React.useRef(false);
  const styles = makeStyles(colors);
  const goal = model?.savingsGoals?.find((g) => g.id === id);

  const [sheet, setSheet] = useState<Sheet>(null);
  const [amount, setAmount] = useState<number | ''>('');
  const [pm, setPm] = useState<PaymentMethod | undefined>(undefined);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: goal?.name || 'Savings pot',
      headerBackTitle: 'Savings',
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('Savings', { openSavingsId: id, openSavingsNonce: Date.now() })}
          accessibilityRole="button"
          testID="pot-edit"
        >
          <Text style={[headerButtonText, { color: colors.gold }]}>Edit</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, goal?.name, colors.gold, id]);

  if (!model || !goal) {
    return (
      <View style={styles.empty}>
        <Text style={styles.meta}>This pot isn't here any more.</Text>
      </View>
    );
  }

  const saved = potSaved(goal);
  const target = potTarget(goal, model);
  const pct = target > 0 ? Math.max(0, Math.min(100, (saved / target) * 100)) : 0;
  const ef = isEmergencyPot(goal);
  const covered = ef ? monthsCovered(goal, model) : null;
  const pace = monthlyPace(goal, model);
  const fullBy = fullByLabel(goal, model);
  const autoAmt = goal.autoAdd?.amount ?? 0;
  const history = [...(goal.contributions || [])]
    .filter((c) => typeof c.amount === 'number' && c.amount !== 0)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  let sub = '';
  if (target > 0) {
    sub = `of ${formatPeso(target)}`;
    if (ef && covered !== null) sub += ` · ${covered.toFixed(1)} of ${efTargetMonths(model)} months covered`;
    else if (goal.targetDate) sub += ` · by ${shortDate(goal.targetDate)}`;
  } else if (ef && covered !== null) {
    sub = `${covered.toFixed(1)} months covered`;
  } else {
    sub = 'No target set';
  }

  async function save(next: SavingsGoal) {
    if (!model) return;
    await saveModel({ ...model, savingsGoals: model.savingsGoals.map((g) => (g.id === id ? next : g)) });
  }

  function open(which: Sheet) {
    setAmount(which === 'auto' ? (autoAmt || '') : '');
    // A pot can't be filled from (or kept in) a credit card, so an old credit choice isn't reused.
    setPm(goal?.keptIn?.type === 'credit' && which !== 'out' ? undefined : goal?.keptIn);
    setSheet(which);
  }

  async function confirm() {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      await confirmInner();
    } finally {
      busyRef.current = false;
    }
  }

  async function confirmInner() {
    if (!goal || !model) return;
    if (sheet === 'add' || sheet === 'out') {
      const a = typeof amount === 'number' ? amount : 0;
      if (a <= 0) return;
      if (sheet === 'out' && a > saved) {
        Alert.alert('Not enough in this pot', `You can move out up to ${formatPeso(saved)}.`);
        return;
      }
      // Redesign: the account is required; adding to a pot can't overdraw cash or debit.
      // Version 2.1: and it can't come from a credit card (a card can't send money).
      const problem =
        sheet === 'add' && pm?.type === 'credit'
          ? "A credit card can't send money. Pick a cash or bank account."
          : accountProblem(model, sheet === 'add' ? 'out' : 'in', a, pm);
      if (problem) {
        Alert.alert(sheet === 'add' ? 'Choose where it comes from' : 'Choose where it goes', problem);
        return;
      }
      hapticLight();
      await save(withContribution(goal, sheet === 'add' ? a : -a, pm));
      showSaved(sheet === 'add' ? 'Added to pot' : 'Moved out');
    } else if (sheet === 'keptIn') {
      await save({ ...goal, keptIn: pm });
    } else if (sheet === 'auto') {
      const a = typeof amount === 'number' ? amount : 0;
      if (a <= 0) return;
      const next = { ...goal, autoAdd: { enabled: true, amount: a, since: goal.autoAdd?.since || todayISO() } };
      const applied = applyAutoSavings({ ...model, savingsGoals: model.savingsGoals.map((g) => (g.id === id ? next : g)) });
      await saveModel(applied ?? { ...model, savingsGoals: model.savingsGoals.map((g) => (g.id === id ? next : g)) });
    }
    setSheet(null);
  }

  async function toggleAuto(on: boolean) {
    if (!goal || !model) return;
    if (on && !(autoAmt > 0)) {
      open('auto');
      return;
    }
    const next = { ...goal, autoAdd: { enabled: on, amount: autoAmt, since: on ? todayISO() : goal.autoAdd?.since || todayISO() } };
    const nextModel = { ...model, savingsGoals: model.savingsGoals.map((g) => (g.id === id ? next : g)) };
    await saveModel((on && applyAutoSavings(nextModel)) || nextModel);
  }

  const sheetTitle = sheet === 'add' ? 'Add money' : sheet === 'out' ? 'Move out' : sheet === 'keptIn' ? 'Kept in' : 'Every payday';
  const fromLabel = (p?: PaymentMethod) => accountLabel(model, p);

  return (
    <KeyboardAwareScrollView contentContainerStyle={styles.content}>
      <View style={styles.group}>
        <GradientFill match={styles.group} />
        <View style={{ padding: 16 }}>
          <Text style={styles.meta}>Saved</Text>
          <Text style={[styles.big, { color: colors.saving }]}>{formatPeso(saved)}</Text>
          <Text style={styles.subhead}>{sub}</Text>
          {target > 0 && (
            <View style={styles.track}>
              <View style={[styles.trackFill, { width: `${pct}%`, backgroundColor: colors.saving }]} />
            </View>
          )}
          {!!fullBy && (
            <Text style={[styles.meta, { marginTop: 8 }]}>
              At {formatPeso(Math.round(pace))} a month, full by {fullBy}.
            </Text>
          )}
          {saved >= target && target > 0 && <Text style={[styles.meta, { marginTop: 8, color: colors.saving }]}>Goal reached.</Text>}
          <View style={styles.buttons}>
            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.buttonFill }]} onPress={() => open('add')} accessibilityRole="button" testID="pot-add-money">
              <GradientFill color={colors.buttonFill} strength={0.18} />
              <Text style={[styles.btnText, { color: colors.onButton }]}>Add money</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.accentTint }, saved <= 0 && { opacity: 0.4 }]}
              onPress={() => open('out')}
              disabled={saved <= 0}
              accessibilityRole="button"
              testID="pot-move-out"
            >
              <GradientFill kind="tint" color={colors.accentTint} />
              <Text style={[styles.btnText, { color: colors.gold }]}>Move out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Text style={styles.header}>History</Text>
      <View style={styles.group}>
        <GradientFill match={styles.group} />
        {history.length === 0 ? (
          <Text style={[styles.meta, { padding: 16 }]}>Nothing added yet. Tap Add money to start.</Text>
        ) : (
          history.map((c, i) => {
            const amt = c.amount as number;
            const from = fromLabel(c.paymentMethod);
            return (
              <View key={c.id} style={[styles.row, i > 0 && styles.line]}>
                <View style={[styles.tile, { backgroundColor: colors.accentTint }]}>
                  <GradientFill kind="tint" color={colors.accentTint} radius={8} />
                  <Ionicons name={amt > 0 ? 'leaf-outline' : 'arrow-up'} size={17} color={colors.gold} />
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.rowTitle}>{amt > 0 ? (c.auto ? 'Added on payday' : 'Added') : 'Moved out'}</Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {shortDate(c.date)}
                    {from ? ` · ${amt > 0 ? 'from' : 'to'} ${from}` : ''}
                  </Text>
                </View>
                <Text style={[styles.rowAmount, { color: amt > 0 ? colors.saving : colors.inkDim }]}>
                  {amt > 0 ? '+' : '−'}
                  {formatPeso(Math.abs(amt))}
                </Text>
              </View>
            );
          })
        )}
      </View>

      <Text style={styles.header}>Settings</Text>
      <View style={styles.group}>
        <GradientFill match={styles.group} />
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate('Savings', { openSavingsId: id, openSavingsNonce: Date.now() })}
          accessibilityRole="button"
        >
          <Text style={[styles.rowTitle, { flex: 1 }]}>Target</Text>
          <Text style={styles.value}>
            {ef && !(typeof goal.targetAmount === 'number' && goal.targetAmount > 0)
              ? `${efTargetMonths(model)} months of essentials`
              : target > 0
                ? formatPeso(target)
                : 'None'}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.inkDim} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.row, styles.line]} onPress={() => open('keptIn')} accessibilityRole="button">
          <Text style={[styles.rowTitle, { flex: 1 }]}>Kept in</Text>
          <Text style={styles.value}>{fromLabel(goal.keptIn) || 'Choose'}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.inkDim} />
        </TouchableOpacity>
        <View style={[styles.row, styles.line]}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => open('auto')} accessibilityRole="button" disabled={!(autoAmt > 0)}>
            <Text style={styles.rowTitle}>{autoAmt > 0 ? `Add ${formatPeso(autoAmt)} every payday` : 'Add money every payday'}</Text>
            {autoAmt > 0 && <Text style={styles.meta}>Tap to change the amount</Text>}
          </TouchableOpacity>
          <AppSwitch
            value={!!goal.autoAdd?.enabled}
            onValueChange={toggleAuto}
            trackColor={{ true: colors.buttonFill, false: colors.navy4 }}
            accessibilityLabel={autoAmt > 0 ? `Add ${formatPeso(autoAmt)} every payday` : 'Add money every payday'}
            testID="pot-auto-switch"
          />
        </View>
      </View>
      <Text style={styles.footer}>
        Paydays come from your income. Money added or moved out shows in Transactions.
      </Text>

      <BottomSheet
        visible={sheet !== null}
        onClose={() => setSheet(null)}
        header={
          <View style={styles.sheetBar}>
            <TouchableOpacity onPress={() => setSheet(null)} accessibilityRole="button" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.sheetBarBtn}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.sheetBarTitle}>{sheetTitle}</Text>
            <TouchableOpacity onPress={confirm} accessibilityRole="button" testID="pot-sheet-done" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.sheetBarBtn, { fontWeight: '700' }]}>{sheet === 'add' ? 'Add' : 'Done'}</Text>
            </TouchableOpacity>
          </View>
        }
      >
        <View style={{ paddingHorizontal: 16, paddingBottom: 24, gap: 12 }}>
          {sheet !== 'keptIn' && (
            <>
              <Text style={styles.meta}>
                {sheet === 'auto' ? 'Amount to add on each payday' : sheet === 'out' ? `Up to ${formatPeso(saved)}` : 'Amount'}
              </Text>
              <AmountInput autoFocus value={amount} onChangeAmount={setAmount} placeholder="0.00" />
            </>
          )}
          {(sheet === 'add' || sheet === 'out' || sheet === 'keptIn') && (
            <>
              <AccountPicker
                model={model}
                direction={sheet === 'add' ? 'out' : 'in'}
                amount={sheet === 'keptIn' ? '' : amount}
                label={sheet === 'add' ? 'Take it from' : sheet === 'out' ? 'Put it into' : 'Where this money is kept'}
                value={pm}
                onChange={setPm}
                noCredit={sheet !== 'out'}
              />
            </>
          )}
        </View>
      </BottomSheet>
    </KeyboardAwareScrollView>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: { paddingHorizontal: 16, paddingBottom: 40 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    group: { backgroundColor: colors.navy3, borderRadius: 12, overflow: 'hidden' },
    meta: { fontSize: 13, color: colors.inkDim },
    big: { fontSize: 34, lineHeight: 40, fontWeight: '700' },
    subhead: { fontSize: 15, color: colors.inkDim, marginTop: 2 },
    track: { height: 8, borderRadius: 999, backgroundColor: colors.navy1, overflow: 'hidden', marginTop: 12 },
    trackFill: { height: '100%', borderRadius: 999 },
    buttons: { flexDirection: 'row', gap: 10, marginTop: 14 },
    btn: { flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    btnText: { fontSize: 17, fontWeight: '600' },
    header: { fontSize: 13, fontWeight: '600', color: colors.inkDim, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 24, marginBottom: 6, marginHorizontal: 16 },
    row: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
    line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    tile: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 4, overflow: 'hidden' },
    rowTitle: { fontSize: 17, color: colors.ink },
    rowAmount: { fontSize: 17, fontWeight: '600' },
    value: { fontSize: 17, color: colors.inkDim },
    footer: { fontSize: 13, color: colors.inkDim, marginTop: 6, marginHorizontal: 16 },
    sheetBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 2, paddingBottom: 12 },
    sheetBarBtn: { fontSize: 17, color: colors.gold },
    sheetBarTitle: { fontSize: 17, fontWeight: '600', color: colors.ink },
  });
}
