import React, { useLayoutEffect } from 'react';
import LoadingView from '../components/LoadingView';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { TouchableOpacity } from '../components/Tap';
import { useNavigation } from '@react-navigation/native';
import { Text } from '../components/AppText';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { formatPeso } from '../balanceProjection';
import { currentCycle, paidCycles } from '../billPayments';
import { accountLabel } from '../transactionActions';
import { todayISO } from '../dateUtils';
import { requestNotificationPermission } from '../pushNotifications';
import type { ThemeColors } from '../theme';
import type { Bill } from '../types';
import { WhoBadge } from '../components/WhoLogged';
import GradientFill from '../components/GradientFill';

// Redesign: Subscriptions, from the Finance Flow mockup (To-Pay > Subscriptions).
// What you spend a month and a year, then:
//  - Needs a look: the price went up, or you set a "cancel by" date.
//  - Active: everything else that's running.
//  - Cancelled: what you've stopped, and how much that saves; Restart brings one back.
// Tap a subscription to open its page. "Cancel by" asks for the day before it renews.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function num(v: unknown): number {
  return typeof v === 'number' ? v : 0;
}
function short(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return isNaN(d.getTime()) ? iso : `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
function dayBefore(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
// Monthly cost of a subscription (annual ones are spread over 12 months).
function monthly(b: Bill): number {
  const amt = num(currentCycle(b)?.amountDue);
  return b.recurringType === 'annual' ? amt / 12 : amt;
}

export default function SubscriptionsScreen() {
  const { colors } = useTheme();
  const { model, saveModel } = useData();
  const navigation = useNavigation<any>();
  const styles = makeStyles(colors);

  useLayoutEffect(() => {
    navigation.setOptions({ headerBackTitle: 'To-Pay' });
  }, [navigation]);

  if (!model) return <LoadingView />;
  const subs = model.bills.filter((b) => b.isSubscription);
  const active = subs.filter((b) => b.subscriptionStatus !== 'cancelled');
  const cancelled = subs.filter((b) => b.subscriptionStatus === 'cancelled');
  const priceUp = (b: Bill) => {
    const last = paidCycles(b)[0];
    const now = num(currentCycle(b)?.amountDue);
    return last && num(last.amountPaid) > 0 && now > num(last.amountPaid) ? num(last.amountPaid) : null;
  };
  const needsLook = active.filter((b) => priceUp(b) !== null || !!b.cancelBy);
  const rest = active.filter((b) => !needsLook.includes(b));
  const perMonth = active.reduce((s, b) => s + monthly(b), 0);

  async function update(id: string, patch: Partial<Bill>) {
    if (!model) return;
    try {
      await saveModel({ ...model, bills: model.bills.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
    } catch {
      Alert.alert('Failed to save', 'Please try again.');
    }
  }

  function actions(b: Bill) {
    const due = currentCycle(b)?.dueDate;
    Alert.alert(b.name || 'Subscription', undefined, [
      ...(due && !b.cancelBy
        ? [
            {
              text: `Remind me to cancel by ${short(dayBefore(due))}`,
              onPress: async () => {
                // The reminder is a phone notification, so make sure the app may send one.
                const allowed = await requestNotificationPermission().catch(() => false);
                await update(b.id, { cancelBy: dayBefore(due) });
                if (!allowed) {
                  Alert.alert(
                    'Notifications are off',
                    "We'll still show this under Needs a look, but to get the reminder on your phone, allow notifications for this app in your phone's settings."
                  );
                }
              },
            },
          ]
        : []),
      ...(b.cancelBy ? [{ text: 'Keep it (clear the reminder)', onPress: () => update(b.id, { cancelBy: undefined }) }] : []),
      {
        text: 'Mark as cancelled',
        style: 'destructive' as const,
        onPress: () => update(b.id, { subscriptionStatus: 'cancelled', cancelledOn: todayISO(), cancelBy: undefined }),
      },
      { text: 'Close', style: 'cancel' as const },
    ]);
  }

  const Row = ({ b, i, kind }: { b: Bill; i: number; kind: 'look' | 'active' | 'cancelled' }) => {
    const cur = currentCycle(b);
    const was = priceUp(b);
    const sub =
      kind === 'cancelled'
        ? `Saves ${formatPeso(monthly(b)).replace('.00', '')} a month${b.cancelledOn ? ` since ${MONTHS[new Date(b.cancelledOn + 'T00:00:00').getMonth()]}` : ''}`
        : kind === 'look'
        ? was !== null
          ? `Was ${formatPeso(was).replace('.00', '')} · next on ${short(cur?.dueDate)}`
          : `Renews ${short(cur?.dueDate)} · you set a reminder`
        : [short(cur?.dueDate), accountLabel(model, cur?.paymentMethod)].filter(Boolean).join(' · ');
    const tag = kind === 'look' ? (was !== null ? 'Price up' : `Cancel by ${short(b.cancelBy)}`) : null;
    return (
      <TouchableOpacity
        style={[styles.row, i > 0 && styles.line]}
        onPress={() => navigation.navigate('PayDetail', { kind: 'bill', id: b.id, backTitle: 'Subscriptions' })}
        onLongPress={kind !== 'cancelled' ? () => actions(b) : undefined}
        accessibilityRole="button"
        accessibilityHint={kind !== 'cancelled' ? 'Long-press for cancel options' : undefined}
      >
        <View style={[styles.avatar, { backgroundColor: colors.accentTint }]}>
          <GradientFill match={[styles.avatar, { backgroundColor: colors.accentTint }]} />
          <Text style={[styles.avatarText, { color: colors.gold }]}>{(b.name || '?').trim().charAt(0).toUpperCase()}</Text>
          <WhoBadge by={b.addedBy} />
        </View>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={[styles.title, kind === 'cancelled' && { color: colors.inkDim }]} numberOfLines={1}>{b.name || 'Subscription'}</Text>
          <Text style={styles.sub} numberOfLines={1}>{sub}</Text>
        </View>
        {kind === 'cancelled' ? (
          <TouchableOpacity
            style={[styles.pill, { backgroundColor: colors.accentTint }]}
            onPress={() => update(b.id, { subscriptionStatus: 'active', cancelledOn: undefined })}
            accessibilityRole="button"
          >
            <GradientFill match={[styles.pill, { backgroundColor: colors.accentTint }]} />
            <Text style={[styles.pillText, { color: colors.gold }]}>Restart</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.amount, { color: colors.negative }]}>{formatPeso(num(cur?.amountDue)).replace('.00', '')}</Text>
            {tag && (
              <Text style={[styles.tag, was !== null ? { color: colors.negative, backgroundColor: colors.errorBg } : { color: colors.orange, backgroundColor: colors.warnBg }]}>
                {tag}
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.group, { padding: 16 }]}>
        <GradientFill match={[styles.group, { padding: 16 }]} />
        <Text style={styles.meta}>You spend</Text>
        <Text style={styles.big}>
          {formatPeso(perMonth).replace('.00', '')} <Text style={styles.bigSuffix}>a month</Text>
        </Text>
        <Text style={styles.meta}>
          {formatPeso(perMonth * 12).replace('.00', '')} a year on {active.length} {active.length === 1 ? 'subscription' : 'subscriptions'}
        </Text>
      </View>

      {needsLook.length > 0 && (
        <>
          <Text style={styles.header}>Needs a look</Text>
          <View style={styles.group}>
            <GradientFill match={styles.group} />
            {needsLook.map((b, i) => <Row key={b.id} b={b} i={i} kind="look" />)}
          </View>
        </>
      )}
      <Text style={styles.footer}>Long-press a subscription to set a "cancel by" reminder or mark it cancelled.</Text>

      {rest.length > 0 && (
        <>
          <Text style={styles.header}>Active</Text>
          <View style={styles.group}>
            <GradientFill match={styles.group} />
            {rest.map((b, i) => <Row key={b.id} b={b} i={i} kind="active" />)}
          </View>
        </>
      )}

      {cancelled.length > 0 && (
        <>
          <Text style={styles.header}>Cancelled</Text>
          <View style={styles.group}>
            <GradientFill match={styles.group} />
            {cancelled.map((b, i) => <Row key={b.id} b={b} i={i} kind="cancelled" />)}
          </View>
        </>
      )}

      {subs.length === 0 && <Text style={styles.footer}>No subscriptions yet. Turn on "Subscription" when adding a bill.</Text>}
    </ScrollView>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: { paddingHorizontal: 16, paddingBottom: 40 },
    group: { backgroundColor: colors.navy3, borderRadius: 12, overflow: 'hidden' },
    meta: { fontSize: 13, color: colors.inkDim },
    big: { fontSize: 34, lineHeight: 40, fontWeight: '700', color: colors.ink, marginVertical: 2 },
    bigSuffix: { fontSize: 17, fontWeight: '400', color: colors.inkDim },
    header: { fontSize: 13, fontWeight: '600', color: colors.inkDim, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 24, marginBottom: 6, marginLeft: 16 },
    footer: { fontSize: 13, color: colors.inkDim, marginTop: 6, marginHorizontal: 16 },
    row: { flexDirection: 'row', alignItems: 'center', minHeight: 60, paddingHorizontal: 16, paddingVertical: 10 },
    line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    avatar: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    avatarText: { fontSize: 15, fontWeight: '700' },
    title: { fontSize: 17, fontWeight: '500', color: colors.ink },
    sub: { fontSize: 13, color: colors.inkDim, marginTop: 1 },
    amount: { fontSize: 17, fontWeight: '600' },
    tag: { marginTop: 3, fontSize: 12, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
    pill: { paddingHorizontal: 14, minHeight: 32, borderRadius: 999, justifyContent: 'center' },
    pillText: { fontSize: 15, fontWeight: '600' },
  });
}
