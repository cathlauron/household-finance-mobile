import React from 'react';
import { goToMain } from '../navigation/goToMain';
import { View, StyleSheet } from 'react-native';
import { TouchableOpacity } from './Tap';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Text } from './AppText';
import GradientFill from './GradientFill';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { requestToPayAdd, setToPaySub } from '../fabActions';

// Version 3 (approved Option B, canvas B6): on Home before there's an account, the things
// picked in "What do you want help with?" become a short list of first steps.

const PICKS: Record<string, { title: string; sub: string; icon: keyof typeof Ionicons.glyphMap; go: 'bill' | 'debt' | 'savings' | 'spend' }> = {
  calm: { title: 'Your first bill goes here', sub: 'Meralco, water, internet…', icon: 'flash-outline', go: 'bill' },
  debt: { title: 'A debt to pay off', sub: "We'll plan a debt-free date", icon: 'trending-down-outline', go: 'debt' },
  save: { title: 'Something to save for', sub: 'A trip, a gadget, an emergency fund', icon: 'wallet-outline', go: 'savings' },
  spending: { title: 'Your first expense', sub: 'See where your money goes', icon: 'pie-chart-outline', go: 'spend' },
};

export default function GuestPicks() {
  const { colors } = useTheme();
  const { guest, guestInfo, model } = useData();
  const navigation = useNavigation<any>();
  if (!guest || !guestInfo) return null;
  // H-53 (2026-10-29): a first step that's done (a bill, debt, pot or expense already added)
  // goes away; with all of them done the card goes too.
  const done: Record<string, boolean> = {
    bill: (model?.bills || []).length > 0,
    debt: (model?.debts || []).length > 0,
    savings: (model?.savingsGoals || []).length > 0,
    spend: (model?.manualTransactions || []).length > 0,
  };
  const picks = (guestInfo.helpWith.length ? guestInfo.helpWith : ['calm']).map((id) => PICKS[id]).filter((p) => p && !done[p.go]);
  if (picks.length === 0) return null;

  function open(go: 'bill' | 'debt' | 'savings' | 'spend') {
    if (go === 'bill' || go === 'debt') {
      setToPaySub(go === 'bill' ? 'bills' : 'debts');
      goToMain(navigation, { screen: 'To-Pay' });
      setTimeout(requestToPayAdd, 400);
    } else if (go === 'savings') {
      navigation.navigate('Savings');
    } else {
      goToMain(navigation, { screen: 'Transactions', params: { addNonce: Date.now() } });
    }
  }

  return (
    <View style={{ marginTop: 20 }}>
      <Text style={[s.head, { color: colors.inkDim }]}>YOU PICKED</Text>
      <View style={s.card}>
        <GradientFill match={s.card} />
        {picks.map((p, i) => (
          <View key={p.title} style={[s.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.navy4 }]}>
            <View style={[s.icon, { backgroundColor: colors.accentTint }]}>
              <Ionicons name={p.icon} size={20} color={colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>{p.title}</Text>
              <Text style={{ fontSize: 14, color: colors.inkDim }}>{p.sub}</Text>
            </View>
            <TouchableOpacity onPress={() => open(p.go)} accessibilityRole="button" hitSlop={8} style={[s.add, { backgroundColor: colors.accentTint }]}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.gold }}>Add</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  head: { fontSize: 13, fontWeight: '700', letterSpacing: 1, marginBottom: 8, marginHorizontal: 6 },
  card: { borderRadius: 22, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  add: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
});
