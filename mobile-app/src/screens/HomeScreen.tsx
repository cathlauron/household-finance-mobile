import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import SetPinScreen from './SetPinScreen';
import DashboardScreen from './DashboardScreen';
import { hasPinSetUp } from '../pin';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { computeLeftToSpend, getLeftToSpendStatus, formatPeso } from '../balanceProjection';

type Props = {
  username: string;
  onLock: () => void;
};

export default function HomeScreen({ username, onLock }: Props) {
  const { colors } = useTheme();
  const { model } = useData();
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

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 100, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  sub: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 30 },
  pinBtn: { borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24, marginBottom: 14 },
  pinBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  lockBtn: { borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24, marginBottom: 6 },
  lockBtnText: { fontWeight: '600', fontSize: 14 },
});
