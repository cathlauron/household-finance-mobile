import React, { useState } from 'react';
import { KeyboardAwareScrollView } from './KeyboardAwareScrollView';
import LoadingView from './LoadingView';
import { View, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from './AppText';
import GradientFill from './GradientFill';
import BottomSheet from './BottomSheet';
import AmountInput from './AmountInput';
import SegmentedControl from './SegmentedControl';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { formatPeso } from '../balanceProjection';
import { makeId } from '../utils';
import { todayISO } from '../dateUtils';
import { useFabSide, setFabSide } from '../fabSide';
import type { BalanceAccountEntry } from '../types';
import { useLeafGustOnStep } from '../leafTransition';
import { getPreferredName, withPreferredName, MAX_PREFERRED_NAME_LENGTH } from '../preferredName';

// Redesign: the 4 onboarding steps from the Finance Flow mockups, shown after a new
// profile is created (and after the Quick Unlock step):
//   1. What should we call you?  (the name Home greets you with)
//   2. Where's your money?       (accounts and their balances)
//   3. Your month                (spending target after bills, categories to watch)
//   4. Make it yours             (wallet name, light/dark, which thumb taps +)

type Group = 'cash' | 'debit' | 'credit';
type Step = 1 | 2 | 3 | 4;
const LAST_STEP: Step = 4;
const QUICK: { name: string; group: Group }[] = [
  { name: 'GCash', group: 'debit' },
  { name: 'Maya', group: 'debit' },
  { name: 'BDO', group: 'debit' },
  { name: 'Credit card', group: 'credit' },
];
const DEFAULT_WATCH = ['Groceries', 'Dining out', 'Transport', 'Shopping', 'Utilities', 'Health', 'Kids', 'Fun'];

export default function OnboardSetup({ onDone, topInset }: { onDone: () => void; topInset: number }) {
  const { colors, isDark, setMode } = useTheme();
  const { model, saveModel, username } = useData();
  const side = useFabSide();
  const styles = makeStyles(colors);
  const [step, setStep] = useState<Step>(1);
  useLeafGustOnStep(step);
  const [sheet, setSheet] = useState<null | { name: string; group: Group }>(null);
  const [acctAmount, setAcctAmount] = useState<number | ''>('');
  const [budget, setBudget] = useState<number | ''>(model?.settings.monthlySpendingBudget ?? '');
  const [picked, setPicked] = useState<string[]>((model?.categoryBudgets || []).map((b) => b.category));
  const [walletName, setWalletName] = useState(model?.settings.walletName ?? '');
  const [callName, setCallName] = useState(getPreferredName(model, username));

  if (!model) return <LoadingView />;
  const accounts: { e: BalanceAccountEntry; group: Group }[] = (['cash', 'debit', 'credit'] as Group[]).flatMap((g) =>
    (model.balanceAccounts[g] || []).map((e) => ({ e, group: g }))
  );
  const catNames = Array.from(new Set([...DEFAULT_WATCH, ...(model.categories || []).map((c) => c.name)])).slice(0, 10);

  async function addAccount() {
    if (!model || !sheet) return;
    const name = sheet.name.trim();
    if (!name) {
      Alert.alert('Name the account', 'For example GCash or BPI Savings.');
      return;
    }
    const entry: BalanceAccountEntry = { id: makeId('acct'), name, amount: acctAmount };
    await saveModel({
      ...model,
      balanceAccounts: {
        ...model.balanceAccounts,
        asOfDate: todayISO(),
        asOfAt: Date.now(),
        [sheet.group]: [...(model.balanceAccounts[sheet.group] || []), entry],
      },
    });
    setSheet(null);
    setAcctAmount('');
  }

  async function saveName() {
    if (!model || !username) return;
    const next = withPreferredName(model, username, callName);
    if (next) await saveModel(next);
  }

  async function saveMonth() {
    if (!model) return;
    const existing = model.categoryBudgets || [];
    const kept = existing.filter((b) => picked.includes(b.category));
    const added = picked.filter((c) => !existing.some((b) => b.category === c)).map((c) => ({ id: makeId('budget'), category: c, monthlyBudget: '' as const }));
    await saveModel({
      ...model,
      settings: { ...model.settings, monthlySpendingBudget: budget },
      categoryBudgets: [...kept, ...added],
    });
  }

  async function finish() {
    if (!model) return;
    if (walletName.trim() !== (model.settings.walletName ?? '')) {
      await saveModel({ ...model, settings: { ...model.settings, walletName: walletName.trim() } });
    }
    onDone();
  }

  async function next() {
    if (step === 1) await saveName();
    if (step === 3) await saveMonth();
    if (step === LAST_STEP) return finish();
    setStep((s) => (s + 1) as Step);
  }

  const bars = (
    <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel={`Step ${step} of ${LAST_STEP}`}>
      {[1, 2, 3, 4].map((n) => (
        <View key={n} style={{ width: 28, height: 4, borderRadius: 999, backgroundColor: n <= step ? colors.buttonFill : colors.navy1 }} />
      ))}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.top, { paddingTop: 12 + topInset }]}>
        <TouchableOpacity onPress={() => step > 1 && setStep((s) => (s - 1) as Step)} disabled={step === 1} accessibilityRole="button" style={{ width: 52 }}>
          <Text style={[styles.link, step === 1 && { opacity: 0 }]}>Back</Text>
        </TouchableOpacity>
        {bars}
        <TouchableOpacity onPress={() => (step === LAST_STEP ? finish() : setStep((s) => (s + 1) as Step))} accessibilityRole="button" style={{ width: 52, alignItems: 'flex-end' }} testID="onboard-skip">
          <Text style={[styles.link, step === LAST_STEP && { opacity: 0 }]}>Skip</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {step === 1 && (
          <>
            <Text style={styles.large}>What should we call you?</Text>
            <View style={[styles.group, { marginTop: 28 }]}>
              <GradientFill match={styles.group} />
              <View style={styles.row}>
                <TextInput
                  autoFocus
                  style={[styles.title, { flex: 1 }]}
                  placeholder={username ? `e.g. ${username.charAt(0).toUpperCase()}${username.slice(1)}` : 'Your name'}
                  placeholderTextColor={colors.inkDim}
                  value={callName}
                  onChangeText={setCallName}
                  maxLength={MAX_PREFERRED_NAME_LENGTH}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={next}
                  accessibilityLabel="Your name"
                  testID="onboard-name"
                />
              </View>
            </View>
            <Text style={styles.footer}>You can change it any time in Settings › Profile.</Text>
            <View style={[styles.hero, { backgroundColor: colors.cardTealEnd }]}>
              <GradientFill kind="solid" color={colors.cardTealEnd} strength={0.26} radius={20} />
              <Text style={styles.heroLabel}>On Home</Text>
              <Text style={[styles.heroAmount, { fontSize: 28, lineHeight: 34 }]} numberOfLines={1}>
                Hi, {callName.trim() || username || 'there'}
              </Text>
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.large}>Where's your money?</Text>
            <Text style={styles.body}>Add the accounts you use. Their balances become your starting point.</Text>
            <View style={[styles.group, { marginTop: 28 }]}>
              <GradientFill match={styles.group} />
              {accounts.map(({ e, group }, i) => (
                <View key={e.id} style={[styles.row, i > 0 && styles.line]}>
                  <View style={styles.tile}>
                    <GradientFill kind="tint" color={colors.accentTint} radius={8} />
                    <Ionicons name={group === 'cash' ? 'cash-outline' : 'card-outline'} size={17} color={colors.gold} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{e.name}</Text>
                    <Text style={styles.meta}>{group === 'cash' ? 'Cash' : group === 'debit' ? 'Debit' : 'Credit'}</Text>
                  </View>
                  <Text style={[styles.amount, { color: colors.positive }]}>{typeof e.amount === 'number' ? formatPeso(e.amount) : ''}</Text>
                </View>
              ))}
              <TouchableOpacity style={[styles.row, accounts.length > 0 && styles.line]} onPress={() => setSheet({ name: '', group: 'debit' })} accessibilityRole="button" testID="onboard-add-account">
                <View style={styles.tile}>
                  <GradientFill kind="tint" color={colors.accentTint} radius={8} />
                  <Ionicons name="add" size={18} color={colors.gold} />
                </View>
                <Text style={[styles.title, { color: colors.gold }]}>Add an account</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.footer}>Quick add</Text>
            <View style={styles.chips}>
              {QUICK.map((q) => (
                <TouchableOpacity key={q.name} style={styles.chip} onPress={() => setSheet({ ...q })} accessibilityRole="button">
                  <GradientFill match={styles.chip} />
                  <Text style={styles.chipText}>{q.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.large}>Your month</Text>
            <Text style={styles.body}>How much do you want to spend each month, after bills?</Text>
            <View style={{ marginTop: 24 }}>
              <AmountInput value={budget} onChangeAmount={setBudget} placeholder="20,000" inputStyle={{ fontSize: 34, fontWeight: '700' }} />
            </View>
            <Text style={styles.footer}>You can change this any time in Settings › Budgeting.</Text>
            <Text style={styles.header}>Keep an eye on</Text>
            <View style={styles.chips}>
              {catNames.map((c) => {
                const on = picked.includes(c);
                return (
                  <TouchableOpacity
                    key={c}
                    style={[styles.chip, on && { backgroundColor: colors.buttonFill }]}
                    onPress={() => setPicked((p) => (on ? p.filter((x) => x !== c) : [...p, c]))}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <GradientFill match={[styles.chip, on && { backgroundColor: colors.buttonFill }]} />
                    <Text style={[styles.chipText, on && { color: colors.onButton }]}>{c}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.footer}>We'll warn you on Home when one gets close to its limit.</Text>
          </>
        )}

        {step === 4 && (
          <>
            <Text style={styles.large}>Make it yours</Text>
            <View style={[styles.hero, { backgroundColor: colors.cardTealEnd }]}>
              <GradientFill kind="solid" color={colors.cardTealEnd} strength={0.26} radius={20} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.heroLabel}>{walletName.trim() || 'Your wallet'}</Text>
                <View style={styles.heroPill}>
                  <Text style={styles.heroPillText}>Left to spend</Text>
                </View>
              </View>
              <Text style={styles.heroAmount}>{formatPeso(typeof budget === 'number' ? budget : 0)}</Text>
              <Text style={styles.heroLabel}>Your Home screen, ready to go</Text>
            </View>
            <View style={[styles.group, { marginTop: 20 }]}>
              <GradientFill match={styles.group} />
              <View style={styles.row}>
                <Text style={[styles.title, { marginRight: 12 }]}>Wallet name</Text>
                <TextInput style={styles.inlineInput} placeholder="e.g. Our Home" placeholderTextColor={colors.inkDim} value={walletName} onChangeText={setWalletName} />
              </View>
            </View>
            <Text style={styles.header}>Appearance</Text>
            <SegmentedControl<'light' | 'dark'>
              accessibilityLabel="Appearance"
              options={[
                { id: 'light', label: 'Light' },
                { id: 'dark', label: 'Dark' },
              ]}
              value={isDark ? 'dark' : 'light'}
              onChange={(v) => setMode(v)}
            />
            <Text style={styles.header}>Which thumb taps +?</Text>
            <SegmentedControl<'left' | 'right'>
              accessibilityLabel="Add button side"
              options={[
                { id: 'left', label: 'Left' },
                { id: 'right', label: 'Right' },
              ]}
              value={side}
              onChange={(v) => setFabSide(v)}
            />
            <Text style={styles.footer}>The + button sits on that side, just above the tabs.</Text>
          </>
        )}
      </KeyboardAwareScrollView>

      <View style={styles.bottom}>
        <TouchableOpacity style={[styles.primary, { backgroundColor: colors.buttonFill }]} onPress={next} accessibilityRole="button" testID="onboard-continue">
          <GradientFill color={colors.buttonFill} strength={0.18} />
          <Text style={[styles.primaryText, { color: colors.onButton }]}>{step === LAST_STEP ? 'Start using Finance Flow' : 'Continue'}</Text>
        </TouchableOpacity>
      </View>

      <BottomSheet
        visible={sheet !== null}
        onClose={() => setSheet(null)}
        header={
          <View style={styles.sheetBar}>
            <TouchableOpacity onPress={() => setSheet(null)} accessibilityRole="button">
              <Text style={styles.link}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>New account</Text>
            <TouchableOpacity onPress={addAccount} accessibilityRole="button" testID="onboard-account-save">
              <Text style={[styles.link, { fontWeight: '700' }]}>Add</Text>
            </TouchableOpacity>
          </View>
        }
      >
        <View style={{ paddingHorizontal: 16, paddingBottom: 24, gap: 12 }}>
          <TextInput
            autoFocus={!sheet?.name}
            style={styles.field}
            placeholder="Name, e.g. BPI Savings"
            placeholderTextColor={colors.inkDim}
            value={sheet?.name ?? ''}
            onChangeText={(t) => setSheet((sh) => (sh ? { ...sh, name: t } : sh))}
          />
          <SegmentedControl<Group>
            accessibilityLabel="Account type"
            options={[
              { id: 'cash', label: 'Cash' },
              { id: 'debit', label: 'Debit' },
              { id: 'credit', label: 'Credit' },
            ]}
            value={sheet?.group ?? 'debit'}
            onChange={(g) => setSheet((sh) => (sh ? { ...sh, group: g } : sh))}
          />
          <Text style={styles.meta}>{sheet?.group === 'credit' ? 'What you owe on it now' : 'Balance now'}</Text>
          <AmountInput value={acctAmount} onChangeAmount={setAcctAmount} placeholder="0.00" />
        </View>
      </BottomSheet>
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, minHeight: 44 },
    link: { fontSize: 17, color: colors.gold },
    scroll: { paddingHorizontal: 16, paddingBottom: 24 },
    large: { fontSize: 30, lineHeight: 36, fontWeight: '600', letterSpacing: -0.2, color: colors.ink, marginTop: 24, marginHorizontal: 4 },
    body: { fontSize: 17, color: colors.inkDim, marginTop: 8, marginHorizontal: 4 },
    group: { backgroundColor: colors.navy3, borderRadius: 12, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
    line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    tile: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    title: { fontSize: 17, color: colors.ink },
    meta: { fontSize: 13, color: colors.inkDim },
    amount: { fontSize: 17, fontWeight: '600' },
    footer: { fontSize: 13, color: colors.inkDim, marginTop: 6, marginHorizontal: 16 },
    header: { fontSize: 13, fontWeight: '600', color: colors.inkDim, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 24, marginBottom: 8, marginHorizontal: 16 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    chip: { minHeight: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.navy3, justifyContent: 'center', overflow: 'hidden' },
    chipText: { fontSize: 15, fontWeight: '500', color: colors.ink },
    hero: { borderRadius: 20, padding: 20, marginTop: 20, overflow: 'hidden' },
    heroLabel: { fontSize: 15, color: 'rgba(255,255,255,0.85)' },
    heroPill: { backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    heroPillText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
    heroAmount: { fontSize: 40, lineHeight: 44, fontWeight: '700', color: '#FFFFFF', marginTop: 8 },
    inlineInput: { flex: 1, fontSize: 17, color: colors.ink, textAlign: 'right' },
    bottom: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8 },
    primary: { minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    primaryText: { fontSize: 17, fontWeight: '600' },
    field: { backgroundColor: colors.navy3, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 17, color: colors.ink },
    sheetBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 2, paddingBottom: 12 },
    sheetTitle: { fontSize: 17, fontWeight: '600', color: colors.ink },
  });
}
