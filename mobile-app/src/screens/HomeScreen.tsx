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

  return (
    <View style={{ flex: 1, backgroundColor: colors.navy2 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12 }}>
        <Text style={{ color: colors.inkDim, fontSize: 13 }}>Hi, {username}</Text>
        <TouchableOpacity
          testID="home-calendar-shortcut"
          onPress={() => navigation.navigate('Calendar')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: colors.navy3 }}
        >
          <Ionicons name="calendar-outline" size={13} color={colors.gold} />
          <Text style={{ color: colors.ink, fontSize: 12, fontWeight: '600' }}>
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity testID="set-pin-button" onPress={() => setShowSetPin(true)}>
            <Text style={{ color: colors.gold, fontSize: 12, fontWeight: '600' }}>{pinIsSet ? 'Change PIN' : 'Set PIN'}</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="lock-button" onPress={onLock}>
            <Text style={{ color: colors.ink, fontSize: 12, fontWeight: '600' }}>Lock</Text>
          </TouchableOpacity>
        </View>
      </View>
      {leftToSpend && leftToSpendStatus && (
        <View style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: colors.navy3, borderRadius: 10, padding: 16 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: colors.inkDim, marginBottom: 8 }}>
            Left to Spend
          </Text>
          <Text style={{ fontSize: 26, fontWeight: '700', color: leftToSpendStatus.color }}>
            {formatPeso(leftToSpend.amount)}
          </Text>
          <Text style={{ fontSize: 12, color: colors.inkFaint, marginTop: 4 }}>
            {leftToSpendStatus.label} · {leftToSpend.basis === 'payday' ? 'until your next payday' : 'through end of month'}
          </Text>
        </View>
      )}
      <DashboardScreen />
    </View>
  );
}


