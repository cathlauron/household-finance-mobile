import React, { useLayoutEffect, useState } from 'react';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { alertNotSaved } from '../messages';
import LoadingView from '../components/LoadingView';
import AppSwitch from '../components/AppSwitch';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { TouchableOpacity } from '../components/Tap';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/AppText';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { formatPeso } from '../balanceProjection';
import { accountLabel } from '../transactionActions';
import { describeFrequency, FREQUENCY_OPTIONS, nextOccurrenceAfter, stopRepeat } from '../recurring';
import GradientFill from '../components/GradientFill';
import BottomSheet from '../components/BottomSheet';
import type { ThemeColors } from '../theme';
import type { RecurringFrequency, RecurringRule } from '../types';

// Redesign: the Recurring page from the Finance Flow mockup (Transactions › Recurring).
// Every repeat, grouped Money in / Money out / Savings, with how often and which account.
// Tap one to change how often or stop it. "Ask before adding" marks new ones To review.
// Repeats are made from a transaction: open it and choose "Make it repeat".

const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${SHORT[(m || 1) - 1]} ${d}${y !== new Date().getFullYear() ? `, ${y}` : ''}`;
}

export default function RecurringScreen() {
  const { colors } = useTheme();
  const { model, saveModel } = useData();
  const navigation = useNavigation<any>();
  const styles = makeStyles(colors);
  const [editing, setEditing] = useState<RecurringRule | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: 'Recurring', headerBackTitle: 'Transactions' });
  }, [navigation]);

  if (!model) return <LoadingView />;
  const rules = model.recurring || [];

  async function save(next: typeof model) {
    if (!next) return;
    try {
      await saveModel(next);
    } catch {
      Alert.alert(...alertNotSaved('this repeat'));
    }
  }

  function changeFrequency(rule: RecurringRule, frequency: RecurringFrequency) {
    if (!model) return;
    setEditing(null);
    // The next one follows the new schedule from the last one already added.
    const last = (model.manualTransactions || [])
      .filter((t) => t.recurringId === rule.id)
      .reduce((max, t) => (t.date > max ? t.date : max), rule.startDate);
    const updated = { ...rule, frequency, nextDate: nextOccurrenceAfter({ startDate: rule.startDate, frequency }, last) };
    save({ ...model, recurring: rules.map((r) => (r.id === rule.id ? updated : r)) });
  }

  function confirmStop(rule: RecurringRule) {
    setEditing(null);
    Alert.alert(`Stop repeating ${rule.label}?`, 'The ones already added stay in your transactions.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Stop repeating', style: 'destructive', onPress: () => model && save(stopRepeat(model, rule.id)) },
    ]);
  }

  const groups: { title: string; dir: RecurringRule['direction'] }[] = [
    { title: 'Money in', dir: 'in' },
    { title: 'Money out', dir: 'out' },
    { title: 'Savings', dir: 'saving' },
  ];

  return (
    <KeyboardAwareScrollView pageBounce style={{ flex: 1 }} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>Things that happen on a schedule are added for you, so you never type them twice.</Text>

      {rules.length === 0 && (
        <View style={[styles.group, styles.empty]}>
          <GradientFill match={[styles.group, styles.empty]} />
          <Ionicons name="repeat" size={28} color={colors.gold} />
          <Text style={styles.emptyTitle}>Nothing repeats yet</Text>
          <Text style={styles.emptyText}>Open any transaction and choose "Make it repeat".</Text>
        </View>
      )}

      {groups.map(({ title, dir }) => {
        const list = rules.filter((r) => r.direction === dir);
        if (list.length === 0) return null;
        return (
          <View key={dir}>
            <Text style={styles.header}>{title}</Text>
            <View style={styles.group}>
              <GradientFill match={styles.group} />
              {list.map((r, i) => {
                const acct = accountLabel(model, r.paymentMethod);
                const sign = dir === 'in' ? '+' : dir === 'out' ? '−' : '';
                const color = dir === 'in' ? colors.positive : dir === 'out' ? colors.negative : colors.saving;
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.row, i > 0 && styles.rowTop]}
                    onPress={() => setEditing(r)}
                    accessibilityRole="button"
                    accessibilityLabel={`${r.label}, ${describeFrequency(r)}, ${sign}${formatPeso(r.amount)}`}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle} numberOfLines={1}>{r.label}</Text>
                      <Text style={styles.rowSub} numberOfLines={1}>
                        {describeFrequency(r)}
                        {acct ? ` · ${acct}` : ''}
                        {` · next ${shortDate(r.nextDate)}`}
                      </Text>
                    </View>
                    <Text style={[styles.amount, { color }]}>
                      {sign}
                      {formatPeso(r.amount)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}

      <View style={[styles.group, { marginTop: 24 }]}>
        <GradientFill match={[styles.group, { marginTop: 24 }]} />
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.rowTitle}>Ask before adding</Text>
            <Text style={styles.rowSub}>On: new ones wait in To review. Off: added automatically on the day.</Text>
          </View>
          <AppSwitch
            value={!!model.settings.recurringAskFirst}
            onValueChange={(on) => save({ ...model, settings: { ...model.settings, recurringAskFirst: on } })}
            trackColor={{ true: colors.buttonFill, false: colors.navy4 }}
            accessibilityLabel="Ask before adding"
          />
        </View>
      </View>

      <BottomSheet visible={!!editing} onClose={() => setEditing(null)} title={editing?.label ?? ''}>
        {editing &&
          FREQUENCY_OPTIONS.map((o, i) => (
            <TouchableOpacity
              key={o.key}
              style={[styles.row, i > 0 && styles.rowTop]}
              onPress={() => changeFrequency(editing, o.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: editing.frequency === o.key }}
            >
              <Text style={[styles.rowTitle, { flex: 1 }]}>{o.label}</Text>
              {editing.frequency === o.key && <Ionicons name="checkmark" size={20} color={colors.gold} />}
            </TouchableOpacity>
          ))}
        {editing && (
          <TouchableOpacity style={[styles.row, styles.rowTop]} onPress={() => confirmStop(editing)} accessibilityRole="button">
            <Text style={[styles.rowTitle, { color: colors.negative }]}>Stop repeating</Text>
          </TouchableOpacity>
        )}
      </BottomSheet>
    </KeyboardAwareScrollView>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: { paddingHorizontal: 16, paddingBottom: 40 },
    intro: { fontSize: 15, lineHeight: 20, color: colors.inkDim, marginBottom: 4 },
    header: { fontSize: 13, fontWeight: '600', color: colors.inkDim, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 22, marginBottom: 6, marginLeft: 16 },
    group: { backgroundColor: colors.navy3, borderRadius: 12, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', minHeight: 54, paddingHorizontal: 16, paddingVertical: 10 },
    rowTop: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    rowTitle: { fontSize: 17, color: colors.ink },
    rowSub: { fontSize: 13, color: colors.inkDim, marginTop: 2 },
    amount: { fontSize: 17, fontWeight: '600', marginLeft: 8 },
    empty: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 16, marginTop: 18, gap: 6 },
    emptyTitle: { fontSize: 17, fontWeight: '600', color: colors.ink },
    emptyText: { fontSize: 15, color: colors.inkDim, textAlign: 'center' },
  });
}
