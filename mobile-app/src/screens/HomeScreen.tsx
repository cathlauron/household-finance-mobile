import React, { useMemo, useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '../components/AppText';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import HomeHero from '../components/HomeHero';
import DashboardScreen from './DashboardScreen';
import OfflineBanner from '../components/OfflineBanner';
import SkyGlow from '../components/SkyGlow';
import { useSkyPhase } from '../sky';
import { hapticSelection } from '../haptics';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { computeLeftToSpend, getLeftToSpendStatus, totalCurrentBalance, formatPeso } from '../balanceProjection';
import type { RootStackParamList } from '../navigation/RootStack';
import { getInitials } from './ProfileScreen';
import Avatar from '../components/Avatar';
import BottomSheet from '../components/BottomSheet';
import { useBellInbox, BellItem } from '../useBellInbox';
import { requestOpenBill } from '../openBillRequest';
import { requestOpenDebt } from '../openDebtRequest';
import { requestOpenLoan } from '../openLoanRequest';
import { requestToPayTab } from '../openToPayTabRequest';
import { applyAutoSavings } from '../savingsPots';
import { applyRecurring } from '../recurring';
import { getCallName } from '../preferredName';

type Props = {
  username: string;
};

export default function HomeScreen({ username }: Props) {
  const { colors, isDark, setMode } = useTheme();
  const { model, saveModel } = useData();
  // Redesign: savings pots set to "add every payday", and repeating transactions
  // ("Make it repeat"), catch up when Home opens.
  React.useEffect(() => {
    if (!model) return;
    const afterSavings = applyAutoSavings(model);
    const afterRepeats = applyRecurring(afterSavings ?? model);
    const next = afterRepeats ?? afterSavings;
    if (next) saveModel(next);
  }, [model, saveModel]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [showSlimBar, setShowSlimBar] = useState(false);

  // Worked out once per data change, not on every redraw (scrolling, the bell, etc.).
  const leftToSpend = useMemo(() => (model ? computeLeftToSpend(model) : null), [model]);
  const leftToSpendStatus =
    leftToSpend && model ? getLeftToSpendStatus(leftToSpend.amount, model, colors) : null;

  const totalBalanceToday = useMemo(() => (model ? totalCurrentBalance(model) : 0), [model]);
  const spentSoFar = leftToSpend ? Math.max(0, totalBalanceToday - leftToSpend.amount) : 0;
  const pctUsed =
    totalBalanceToday > 0 ? Math.min(100, Math.max(0, (spentSoFar / totalBalanceToday) * 100)) : 0;

  // Redesign: the Left to Spend card changes colour with the mood. Looking good keeps
  // the forest-green card; Running low is burnt orange; Overspent is red. All three
  // were picked so the white text on them stays easy to read (4.5:1 or better).
  const mood = leftToSpendStatus?.mood ?? 'good';
  const moodCard =
    mood === 'over'
      ? { start: isDark ? '#A00D1C' : '#B30F1F', end: isDark ? '#A00D1C' : '#B30F1F', dim: 'rgba(255,255,255,0.92)', fill: '#FFFFFF' }
      : mood === 'low'
      ? { start: isDark ? '#933600' : '#A33C00', end: isDark ? '#933600' : '#A33C00', dim: 'rgba(255,255,255,0.92)', fill: '#FFFFFF' }
      : { start: colors.cardTealStart, end: colors.cardTealEnd, dim: colors.cardTealTextDim, fill: colors.mintAccent };

  // Redesign: greeting under "Hi, name" that follows the same time of day as the sky glow
  // (real sunrise and sunset when Live weather is on). Very late at night it just says
  // "Good to see you".
  const skyPhase = useSkyPhase();
  const hour = new Date().getHours();
  const greeting =
    skyPhase === 'morning'
      ? 'Good morning'
      : skyPhase === 'afternoon'
      ? 'Good afternoon'
      : skyPhase === 'night' && hour < 5
      ? 'Good to see you'
      : 'Good evening';

  // "What should we call you?": the name picked in onboarding or Profile, else the username.
  const callName = getCallName(model, username);

  const [bellOpen, setBellOpen] = useState(false);
  const { items: bellItems, unreadCount, isRead, markRead, markAllRead } = useBellInbox(username, model);

  const onBellItemPress = (item: BellItem) => {
    markRead(item.key);
    setBellOpen(false);
    if (item.group === 'recovery') {
      navigation.navigate('Profile');
      return;
    }
    // Redesign: open the full Bill / Debt / Loan page.
    const target = item.group === 'overdue' ? { kind: item.overdue.kind, id: item.overdue.id } : item.due.id ? { kind: item.due.type, id: item.due.id } : null;
    if (target) {
      (navigation as any).navigate('PayDetail', { ...target, backTitle: 'Home' });
      return;
    }
    if (item.group === 'overdue') {
      const o = item.overdue;
      if (o.kind === 'bill') requestOpenBill(o.id);
      else if (o.kind === 'debt') requestOpenDebt(o.id);
      else requestOpenLoan(o.id);
    } else {
      const d = item.due;
      if (d.type === 'bill' && d.id) requestOpenBill(d.id);
      else if (d.type === 'debt' && d.id) requestOpenDebt(d.id);
      else if (d.type === 'loan' && d.id) requestOpenLoan(d.id);
      else requestToPayTab(d.type === 'bill' ? 'bills' : d.type === 'debt' ? 'debts' : 'loans');
    }
    (navigation as any).navigate('To-Pay');
  };

  const hs = makeHomeStyles(colors);
  const fullDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent', paddingTop: insets.top }}>
      <SkyGlow />
      <OfflineBanner style={{ marginHorizontal: 14, marginTop: 6 }} />
      <View style={hs.headerRow}>
        <TouchableOpacity
          testID="home-settings-button"
          style={hs.profilePill}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Settings')}
          accessibilityLabel={`Hi, ${callName}. ${greeting}. Open settings`}
        >
          <Avatar
            initials={getInitials(username || '')}
            config={model?.avatars?.[username || '']}
            size={48}
            variant="filled"
          />
          <View style={{ flexShrink: 1 }}>
            <Text style={hs.greeting} numberOfLines={1}>Hi, {callName}</Text>
            <Text style={hs.greetingSub} numberOfLines={1}>{greeting}</Text>
          </View>
        </TouchableOpacity>

        <View style={hs.headerRight}>
          {/* Quick light/dark switch (sets Light or Dark; Settings → Appearance can go back to Auto). */}
          <TouchableOpacity
            testID="home-theme-toggle"
            accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            style={hs.bellBtn}
            onPress={() => {
              hapticSelection();
              setMode(isDark ? 'light' : 'dark');
            }}
          >
            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={23} color={colors.ink} />
          </TouchableOpacity>
          <TouchableOpacity accessibilityLabel="Notifications" style={hs.bellBtn} onPress={() => setBellOpen(true)}>
            <Ionicons name="notifications-outline" size={24} color={colors.ink} />
            {unreadCount > 0 ? (
              <View style={[hs.bellBadge, { backgroundColor: '#C81E43' }]}>
                <Text style={hs.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <DashboardScreen
          onScrollY={(y) => setShowSlimBar(y > 150)}
          header={
            leftToSpend && leftToSpendStatus ? (
              <HomeHero
                model={model!}
                amount={leftToSpend.amount}
                statusLabel={leftToSpendStatus.label}
                basis={leftToSpend.basis}
                mood={mood}
                total={totalBalanceToday}
                pctUsed={pctUsed}
                isDark={isDark}
                fullDate={fullDate}
                targetDate={leftToSpend.targetDate}
              />
            ) : undefined
          }
        />
        {showSlimBar && leftToSpend && (
          <View pointerEvents="none" style={[hs.slimBar, { backgroundColor: moodCard.start }]}>
            <Text style={[hs.slimBarLabel, { color: moodCard.dim }]}>Left to spend</Text>
            <Text style={[hs.slimBarAmount, { color: colors.cardTealText }]}>{formatPeso(leftToSpend.amount)}</Text>
          </View>
        )}
      </View>

      <BottomSheet
        visible={bellOpen}
        onClose={() => setBellOpen(false)}
        header={
          <View style={hs.bellHeader}>
            <Text style={hs.bellHeaderTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <TouchableOpacity
                onPress={() => {
                  hapticSelection();
                  markAllRead();
                }}
                accessibilityRole="button"
                accessibilityLabel={`Mark all ${unreadCount} as read`}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                testID="bell-mark-all-read"
              >
                <Text style={[hs.bellMarkAll, { color: colors.gold }]}>Mark all as read</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      >
        {bellItems.length === 0 ? (
          <Text style={hs.bellEmpty}>Nothing needs your attention right now.</Text>
        ) : (
          <>
            {(['recovery', 'overdue', 'due'] as const).map(group => {
              const rows = bellItems.filter(i => i.group === group);
              if (!rows.length) return null;
              return (
                <View key={group}>
                  <Text style={hs.bellGroupTitle}>
                    {group === 'recovery' ? 'Sign-in help requests' : group === 'overdue' ? 'Overdue' : 'Due in the next 14 days'}
                  </Text>
                  {rows.map(item => (
                    <TouchableOpacity
                      key={item.key}
                      style={hs.bellRow}
                      onPress={() => onBellItemPress(item)}
                      accessibilityLabel={item.title}
                    >
                      <View style={[hs.bellUnreadDot, { backgroundColor: isRead(item.key) ? 'transparent' : colors.error }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[hs.bellRowTitle, { fontWeight: isRead(item.key) ? '500' : '700' }]} numberOfLines={1}>{item.title}</Text>
                        <Text style={hs.bellRowSub} numberOfLines={1}>{item.subtitle}</Text>
                      </View>
                      {item.group === 'overdue' && (
                        <Text style={hs.bellRowAmt}>{formatPeso(item.overdue.amountOwed)}</Text>
                      )}
                      {item.group === 'due' && (
                        <Text style={hs.bellRowAmt}>{formatPeso(item.due.amount)}</Text>
                      )}
                      <Ionicons name="chevron-forward" size={16} color={colors.inkDim} />
                    </TouchableOpacity>
                  ))}
                </View>
              );
            })}
          </>
        )}
      </BottomSheet>
    </View>
  );
}

function makeHomeStyles(colors: any) {
  return StyleSheet.create({
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 12,
    },
    profilePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 48,
      maxWidth: '80%',
    },
    headerRight: { flexDirection: 'row', alignItems: 'center' },
    greeting: { color: colors.ink, fontSize: 20, lineHeight: 25, fontWeight: '700' },
    greetingSub: { color: colors.inkDim, fontSize: 15, lineHeight: 20 },
    bellBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    bellBadge: { position: 'absolute', top: 2, right: 2, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
    bellBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
    bellHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12, minHeight: 40 },
    bellHeaderTitle: { fontSize: 20, fontWeight: '700', color: colors.ink },
    bellMarkAll: { fontSize: 15, fontWeight: '600' },
    bellEmpty: { color: colors.inkDim, fontSize: 13.5, paddingVertical: 20, textAlign: 'center' },
    bellGroupTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: colors.inkDim, marginTop: 8, marginBottom: 6 },
    bellRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.navy4 },
    bellUnreadDot: { width: 8, height: 8, borderRadius: 4 },
    bellRowTitle: { color: colors.ink, fontSize: 14 },
    bellRowSub: { color: colors.inkDim, fontSize: 12, marginTop: 2 },
    bellRowAmt: { color: colors.orange, fontSize: 13, fontWeight: '600' },
    slimBar: {
      position: 'absolute',
      top: 0,
      left: 14,
      right: 14,
      height: 36,
      borderRadius: 12,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    slimBarLabel: { fontSize: 13, fontWeight: '600' },
    slimBarAmount: { fontSize: 15, fontWeight: '700' },
  });
}