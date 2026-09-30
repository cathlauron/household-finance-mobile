import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CardGradient from '../components/CardGradient';
import DashboardScreen, { getUpcomingDue } from './DashboardScreen';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { computeLeftToSpend, getLeftToSpendStatus, totalLiquidBalance, formatPeso } from '../balanceProjection';
import type { RootStackParamList } from '../navigation/RootStack';
import { getInitials } from './ProfileScreen';
import Avatar from '../components/Avatar';
import BottomSheet from '../components/BottomSheet';
import { useBellInbox, BellItem } from '../useBellInbox';
import { requestOpenBill } from '../openBillRequest';
import { requestOpenDebt } from '../openDebtRequest';
import { requestOpenLoan } from '../openLoanRequest';
import { requestToPayTab } from '../openToPayTabRequest';

type Props = {
  username: string;
};

export default function HomeScreen({ username }: Props) {
  const { colors } = useTheme();
  const { model } = useData();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [showSlimBar, setShowSlimBar] = useState(false);

  const leftToSpend = model ? computeLeftToSpend(model) : null;
  const leftToSpendStatus =
    leftToSpend && model ? getLeftToSpendStatus(leftToSpend.amount, model, colors) : null;

  const totalBalanceToday = model ? totalLiquidBalance(model) : 0;
  const spentSoFar = leftToSpend ? Math.max(0, totalBalanceToday - leftToSpend.amount) : 0;
  const pctUsed =
    totalBalanceToday > 0 ? Math.min(100, Math.max(0, (spentSoFar / totalBalanceToday) * 100)) : 0;

  const leftToSpendBg =
    leftToSpendStatus && leftToSpendStatus.color === colors.ok
      ? colors.okBg
      : leftToSpendStatus && leftToSpendStatus.color === colors.orange
      ? colors.warnBg
      : colors.errorBg;

  const hasDueSoon = model ? getUpcomingDue(model, 14).length > 0 : false;
  const [bellOpen, setBellOpen] = useState(false);
  const { items: bellItems, unreadCount, isRead, markRead } = useBellInbox(username, model);

  const onBellItemPress = (item: BellItem) => {
    markRead(item.key);
    setBellOpen(false);
    if (item.group === 'recovery') {
      navigation.navigate('Profile');
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
      <View style={hs.headerRow}>
        <TouchableOpacity
          style={hs.headerLeft}
          onPress={() => navigation.navigate('Profile')}
          accessibilityLabel="Open profile"
        >
          <Avatar
            initials={getInitials(username || '')}
            config={model?.avatars?.[username || '']}
            size={36}
            variant="filled"
          />
          <Text style={hs.greeting} numberOfLines={1}>Hi, {username}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.inkDim} />
        </TouchableOpacity>

        <View style={hs.headerRight}>
          <TouchableOpacity accessibilityLabel="Notifications" style={hs.bellBtn} onPress={() => setBellOpen(true)}>
            <Ionicons name="notifications-outline" size={20} color={colors.ink} />
            {unreadCount > 0 ? (
              <View style={[hs.bellBadge, { backgroundColor: colors.error }]}>
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
              <View style={[hs.leftCard, { overflow: 'hidden', backgroundColor: colors.cardTealStart }]}>
                <CardGradient start={colors.cardTealStart} end={colors.cardTealEnd} />
                <View style={hs.leftCardTop}>
                  <Text style={[hs.leftLabel, { marginBottom: 0, color: colors.cardTealTextDim }]}>Left to Spend</Text>
                  <TouchableOpacity
                    testID="home-calendar-shortcut"
                    onPress={() => navigation.navigate('Calendar')}
                    style={[hs.datePill, { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.2)' }]}
                    accessibilityLabel="Open calendar"
                  >
                    <Ionicons name="calendar-outline" size={16} color={colors.mintAccent} />
                    <Text style={[hs.dateText, { color: colors.cardTealText }]} numberOfLines={1}>{fullDate}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 32, fontWeight: '700', color: colors.cardTealText, marginTop: 10 }}>
                  {formatPeso(leftToSpend.amount)}
                </Text>
                <Text style={{ fontSize: 12, color: colors.cardTealTextDim, marginTop: 4 }}>
                  {leftToSpendStatus.label} ·{' '}
                  {leftToSpend.basis === 'payday' ? 'until next payday' : 'through month end'}
                </Text>
                <View style={[hs.pctTrack, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <View style={[hs.pctFill, { width: `${pctUsed}%`, backgroundColor: colors.mintAccent }]} />
                </View>
                <View style={hs.pctLabelRow}>
                  <Text style={[hs.pctLabelText, { color: colors.cardTealTextDim }]}>
                    {formatPeso(leftToSpend.amount)} left of {formatPeso(totalBalanceToday)}
                  </Text>
                  <Text style={[hs.pctLabelText, { color: colors.cardTealTextDim }]}>{Math.round(pctUsed)}% used</Text>
                </View>
              </View>
            ) : undefined
          }
        />
        {showSlimBar && leftToSpend && (
          <View pointerEvents="none" style={[hs.slimBar, { backgroundColor: colors.cardTealStart }]}>
            <Text style={[hs.slimBarLabel, { color: colors.cardTealTextDim }]}>Left to Spend</Text>
            <Text style={[hs.slimBarAmount, { color: colors.cardTealText }]}>{formatPeso(leftToSpend.amount)}</Text>
          </View>
        )}
      </View>

      <BottomSheet visible={bellOpen} onClose={() => setBellOpen(false)} title="Notifications">
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
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 8,
    },
    headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 8 },
    headerRight: { alignItems: 'flex-end' },
    greeting: { color: colors.ink, fontSize: 15, fontWeight: '700' },
    bellBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    bellDot: { position: 'absolute', top: 6, right: 7, width: 8, height: 8, borderRadius: 4 },
    bellBadge: { position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
    bellBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
    bellEmpty: { color: colors.inkDim, fontSize: 13.5, paddingVertical: 20, textAlign: 'center' },
    bellGroupTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: colors.inkDim, marginTop: 8, marginBottom: 6 },
    bellRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.navy4 },
    bellUnreadDot: { width: 8, height: 8, borderRadius: 4 },
    bellRowTitle: { color: colors.ink, fontSize: 14 },
    bellRowSub: { color: colors.inkDim, fontSize: 12, marginTop: 2 },
    bellRowAmt: { color: colors.orange, fontSize: 13, fontWeight: '600' },
    datePill: {
      flexShrink: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.navy3,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.navy4,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    dateText: { color: colors.ink, fontSize: 12.5, fontWeight: '600' },
    leftCard: { marginBottom: 12, borderRadius: 16, padding: 16 },
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
    slimBarLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    slimBarAmount: { fontSize: 15, fontWeight: '700' },
    leftCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    leftCardIconBubble: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 12,
    },
    leftLabel: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: colors.inkDim,
      marginBottom: 8,
    },
    pctTrack: {
      height: 8,
      borderRadius: 999,
      backgroundColor: 'rgba(128,128,128,0.25)',
      overflow: 'hidden',
      marginTop: 14,
    },
    pctFill: { height: '100%', borderRadius: 999 },
    pctLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    pctLabelText: { fontSize: 11.5, color: colors.inkDim },
  });
}