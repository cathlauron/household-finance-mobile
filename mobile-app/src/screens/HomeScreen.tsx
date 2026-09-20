import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import SetPinScreen from './SetPinScreen';
import DashboardScreen from './DashboardScreen';
import { hasPinSetUp } from '../pin';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { computeLeftToSpend, getLeftToSpendStatus, formatPeso } from '../balanceProjection';
import type { RootStackParamList } from '../navigation/RootStack';
import { getInitials } from './ProfileScreen';

type Props = {
  username: string;
  onLock: () => void;
};

export default function HomeScreen({ username, onLock }: Props) {
  const { colors } = useTheme();
  const { model } = useData();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [showSetPin, setShowSetPin] = useState(false);
  const [pinIsSet, setPinIsSet] = useState(false);

  useEffect(() => {
    (async () => {
      setPinIsSet(await hasPinSetUp(username));
    })();
  }, [username]);

  if (showSetPin) {
    return (
      <SetPinScreen
        username={username}
        onDone={() => {
          setShowSetPin(false);
          setPinIsSet(true);
        }}
        onCancel={() => setShowSetPin(false)}
      />
    );
  }

  const leftToSpend = model ? computeLeftToSpend(model) : null;
  const leftToSpendStatus =
    leftToSpend && model ? getLeftToSpendStatus(leftToSpend.amount, model, colors) : null;

  const hs = makeHomeStyles(colors);
  const fullDate = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <View style={{ flex: 1, backgroundColor: colors.navy2 }}>
      <View style={hs.headerRow}>
        <View style={hs.avatar}>
          <Text style={hs.avatarText}>{getInitials(username || '')}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={hs.greeting}>Hi, {username}</Text>
          <Text style={hs.greetingSub}>Good to see you!</Text>
        </View>
        <TouchableOpacity
          testID="set-pin-button"
          accessibilityLabel={pinIsSet ? 'Change PIN' : 'Set PIN'}
          onPress={() => setShowSetPin(true)}
          style={hs.iconBtn}
        >
          <Ionicons name={pinIsSet ? 'keypad' : 'keypad-outline'} size={19} color={colors.gold} />
        </TouchableOpacity>
        <TouchableOpacity testID="lock-button" accessibilityLabel="Lock" onPress={onLock} style={hs.iconBtn}>
          <Ionicons name="lock-closed-outline" size={19} color={colors.ink} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity testID="home-calendar-shortcut" onPress={() => navigation.navigate('Calendar')} style={hs.datePill}>
        <Ionicons name="calendar-outline" size={18} color={colors.gold} />
        <Text style={hs.dateText}>{fullDate}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.inkDim} />
      </TouchableOpacity>

      {leftToSpend && leftToSpendStatus && (
        <View style={hs.leftCard}>
          <Text style={hs.leftLabel}>Left to Spend</Text>
          <Text style={{ fontSize: 26, fontWeight: '700', color: leftToSpendStatus.color }}>
            {formatPeso(leftToSpend.amount)}
          </Text>
          <Text style={{ fontSize: 12, color: colors.inkDim, marginTop: 4 }}>
            {leftToSpendStatus.label} · {leftToSpend.basis === 'payday' ? 'until next payday' : 'through month end'}
          </Text>
        </View>
      )}
      <DashboardScreen />
    </View>
  );
}

function makeHomeStyles(colors: any) {
  return StyleSheet.create({
    headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, gap: 10 },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
    greeting: { color: colors.ink, fontSize: 16, fontWeight: '700' },
    greetingSub: { color: colors.inkDim, fontSize: 12, marginTop: 1 },
    iconBtn: {
      width: 38, height: 38, borderRadius: 19, backgroundColor: colors.navy3,
      borderWidth: 1, borderColor: colors.navy4, alignItems: 'center', justifyContent: 'center',
    },
    datePill: {
      flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 14, marginTop: 14,
      backgroundColor: colors.navy3, borderRadius: 14, borderWidth: 1, borderColor: colors.navy4,
      paddingHorizontal: 14, paddingVertical: 12,
    },
    dateText: { flex: 1, color: colors.ink, fontSize: 14, fontWeight: '600' },
    leftCard: {
      marginHorizontal: 14, marginTop: 12, backgroundColor: colors.navy3, borderRadius: 16,
      borderWidth: 1, borderColor: colors.navy4, padding: 16,
    },
    leftLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: colors.inkDim, marginBottom: 8 },
  });
}


