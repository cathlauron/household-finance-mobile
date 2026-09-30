import React from 'react';
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

type Props = {
  username: string;
};

export default function HomeScreen({ username }: Props) {
  const { colors } = useTheme();
  const { model } = useData();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

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
          <TouchableOpacity accessibilityLabel="Notifications" style={hs.bellBtn}>
            <Ionicons name="notifications-outline" size={20} color={colors.ink} />
            {hasDueSoon && <View style={[hs.bellDot, { backgroundColor: colors.error }]} />}
          </TouchableOpacity>
        </View>
      </View>

      {leftToSpend && leftToSpendStatus && (
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
      )}
      <DashboardScreen />
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
    leftCard: { marginHorizontal: 14, marginTop: 8, borderRadius: 16, padding: 16 },
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