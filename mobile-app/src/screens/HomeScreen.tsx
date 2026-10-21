import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TouchableOpacity } from '../components/Tap';
import { Text } from '../components/AppText';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import HomeHero from '../components/HomeHero';
import DashboardScreen from './DashboardScreen';
import OfflineBanner, { OfflineCloud } from '../components/OfflineBanner';
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
import GuestPicks from '../components/GuestPicks';
import { useHideAmounts } from '../hideAmounts';
import { WelcomeBackCard, TightCard } from '../components/CalmHome';
import { useTravelTime, differenceText, gmtLabel } from '../travelTime';
import { rescheduleBillNotifications } from '../pushNotifications';

type Props = {
  username: string;
};

export default function HomeScreen({ username }: Props) {
  const { colors, isDark, setMode } = useTheme();
  const { model, saveModel, guest, guestInfo } = useData();
  // Redesign: savings pots set to "add every payday", and repeating transactions
  // ("Make it repeat"), catch up when Home opens.
  React.useEffect(() => {
    if (!model) return;
    const afterSavings = applyAutoSavings(model);
    const afterRepeats = applyRecurring(afterSavings ?? model);
    const next = afterRepeats ?? afterSavings;
    if (next) saveModel(next);
  }, [model, saveModel]);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [showSlimBar, setShowSlimBar] = useState(false);
  const { money } = useHideAmounts();

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
  const callName = guest ? guestInfo?.name || 'there' : getCallName(model, username);

  // Travel time note: shown when the phone is in a different time zone from home.
  const travel = useTravelTime();
  const [travelOpen, setTravelOpen] = useState(false);
  // When the phone's time zone changes, set reminders up again so they come at 9:00
  // local time where you are now.
  const hereTz = travel.here?.tz;
  const lastTzRef = React.useRef<string | undefined>(undefined);
  React.useEffect(() => {
    if (!hereTz || !model) return;
    if (lastTzRef.current && lastTzRef.current !== hereTz) {
      rescheduleBillNotifications(model).catch(() => {});
    }
    lastTzRef.current = hereTz;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hereTz]);

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
          <OfflineCloud />
          {/* Quick light/dark switch (sets Light or Dark; Settings → Appearance can go back to Auto). */}
          <ThemeToggle style={hs.bellBtn} />
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

      {travel.away && !travel.hidden && travel.here && travel.home && (
        <TouchableOpacity
          testID="home-travel-note"
          style={[hs.travelNote, { backgroundColor: isDark ? 'rgba(28,28,30,0.85)' : 'rgba(255,255,255,0.78)' }]}
          activeOpacity={0.75}
          onPress={() => setTravelOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`You're on ${travel.here.city} time, ${differenceText(travel.diffMin, travel.home.city)}. Dates follow this phone. Tap for details.`}
        >
          <View style={[hs.travelIcon, { backgroundColor: colors.accentTint }]}>
            <Ionicons name="globe-outline" size={16} color={colors.gold} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={hs.travelTitle} numberOfLines={1}>You're on {travel.here.city} time</Text>
            <Text style={hs.travelSub} numberOfLines={1}>{differenceText(travel.diffMin, travel.home.city)} · dates follow this phone</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
        </TouchableOpacity>
      )}

      <View style={{ flex: 1 }}>
        <DashboardScreen
          onScrollY={(y) => setShowSlimBar(y > 150)}
          header={
            leftToSpend && leftToSpendStatus ? (
              <>
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
              {/* Version 3 calm Home: both sit between Left to Spend and Accounts. */}
              <TightCard
                amount={leftToSpend.amount}
                mood={mood}
                statusLabel={leftToSpendStatus.label}
                targetDate={leftToSpend.targetDate}
                basis={leftToSpend.basis}
              />
              <WelcomeBackCard username={username} />
              </>
            ) : undefined
          }
          footer={guest ? <GuestPicks /> : undefined
          }
        />
        {showSlimBar && leftToSpend && (
          <View pointerEvents="none" style={[hs.slimBar, { backgroundColor: moodCard.start }]}>
            <Text style={[hs.slimBarLabel, { color: moodCard.dim }]}>Left to spend</Text>
            <Text style={[hs.slimBarAmount, { color: colors.cardTealText }]}>{money(leftToSpend.amount)}</Text>
          </View>
        )}
      </View>

      <BottomSheet
        visible={travelOpen}
        onClose={() => setTravelOpen(false)}
        grouped
        header={
          <View style={hs.bellHeader}>
            <Text style={hs.bellHeaderTitle}>You're travelling</Text>
            <TouchableOpacity onPress={() => setTravelOpen(false)} accessibilityRole="button" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={[hs.bellMarkAll, { color: colors.gold, fontSize: 17, fontWeight: '700' }]}>Done</Text>
            </TouchableOpacity>
          </View>
        }
      >
        {travel.here && travel.home && (
          <View style={{ paddingBottom: 8 }}>
            <View style={hs.travelGroup}>
              <View style={[hs.travelRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.navy4 }]}>
                <View>
                  <Text style={hs.travelRowTitle}>This phone</Text>
                  <Text style={hs.travelRowSub}>{travel.here.city} · {gmtLabel(travel.here.offsetMin)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[hs.travelRowTitle, { fontWeight: '700' }]}>{travel.here.timeLabel}</Text>
                  <Text style={hs.travelRowSub}>{travel.here.dateLabel}</Text>
                </View>
              </View>
              <View style={hs.travelRow}>
                <View>
                  <Text style={hs.travelRowTitle}>Home</Text>
                  <Text style={hs.travelRowSub}>{travel.home.city} · {gmtLabel(travel.home.offsetMin)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[hs.travelRowTitle, { fontWeight: '700' }]}>{travel.home.timeLabel}</Text>
                  <Text style={hs.travelRowSub}>{travel.home.dateLabel}</Text>
                </View>
              </View>
            </View>

            <Text style={hs.travelLabel}>WHILE YOU'RE HERE</Text>
            <View style={[hs.travelGroup, { paddingVertical: 4 }]}>
              {[
                { icon: 'calendar-outline' as const, text: `"Today" means ${travel.here.city}'s date, so anything you add is dated here.` },
                { icon: 'notifications-outline' as const, text: `Reminders arrive at 9:00 AM ${travel.here.city} time.` },
                { icon: 'list-outline' as const, text: 'Due dates and paydays stay the same. A bill due on the 19th is still due on the 19th.' },
              ].map((row) => (
                <View key={row.icon} style={hs.travelInfoRow}>
                  <Ionicons name={row.icon} size={20} color={colors.gold} style={{ marginTop: 1 }} />
                  <Text style={hs.travelInfoText}>{row.text}</Text>
                </View>
              ))}
            </View>

            <View style={[hs.travelGroup, { marginTop: 22 }]}>
              <TouchableOpacity
                style={[hs.travelAction, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.navy4 }]}
                onPress={() => {
                  hapticSelection();
                  setTravelOpen(false);
                  travel.hideUntilHome();
                }}
                accessibilityRole="button"
                testID="travel-hide"
              >
                <Text style={[hs.travelActionText, { color: colors.gold }]}>Hide until I'm back home</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={hs.travelAction}
                onPress={() => {
                  hapticSelection();
                  setTravelOpen(false);
                  travel.makeThisHome();
                }}
                accessibilityRole="button"
                testID="travel-make-home"
              >
                <Text style={[hs.travelActionText, { color: colors.gold }]}>I live here now: make {travel.here.city} home</Text>
              </TouchableOpacity>
            </View>
            <Text style={hs.travelFoot}>You can change your home time zone any time in Settings › Appearance.</Text>
          </View>
        )}
      </BottomSheet>

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
    travelNote: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, marginHorizontal: 16, marginTop: 10, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 14 },
    travelIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    travelTitle: { fontSize: 14, lineHeight: 19, fontWeight: '700', color: colors.ink },
    travelSub: { fontSize: 13, lineHeight: 17, color: colors.inkDim },
    travelGroup: { backgroundColor: colors.navy3, borderRadius: 14 },
    travelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16 },
    travelRowTitle: { fontSize: 17, color: colors.ink },
    travelRowSub: { fontSize: 13, color: colors.inkDim, marginTop: 1 },
    travelLabel: { fontSize: 13, fontWeight: '700', color: colors.inkDim, letterSpacing: 0.3, marginTop: 22, marginBottom: 8, marginHorizontal: 16 },
    travelInfoRow: { flexDirection: 'row', gap: 12, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'flex-start' },
    travelInfoText: { flex: 1, fontSize: 15, lineHeight: 21, color: colors.ink },
    travelAction: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 16 },
    travelActionText: { fontSize: 17 },
    travelFoot: { fontSize: 13, lineHeight: 18, color: colors.inkDim, marginTop: 6, marginHorizontal: 16 },
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

// 2.2 speed fix (Cath: the light/dark button lagged): its own small piece, so the icon
// flips the moment it's tapped while the whole app recolours just after.
function ThemeToggle({ style }: { style: object }) {
  const { colors, isDark, setMode } = useTheme();
  const [shown, setShown] = useState<boolean | null>(null);
  const dark = shown ?? isDark;
  useEffect(() => {
    setShown(null);
  }, [isDark]);
  return (
    <TouchableOpacity
      testID="home-theme-toggle"
      accessibilityLabel={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={style}
      onPress={() => {
        hapticSelection();
        setShown(!dark);
        setMode(dark ? 'light' : 'dark');
      }}
    >
      <Ionicons name={dark ? 'sunny-outline' : 'moon-outline'} size={23} color={colors.ink} />
    </TouchableOpacity>
  );
}
