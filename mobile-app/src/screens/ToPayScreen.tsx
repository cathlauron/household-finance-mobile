import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useTheme } from '../ThemeContext';
import BillsScreen from './BillsScreen';
import DebtsScreen from './DebtsScreen';

type SubTab = 'bills' | 'debts';

// A small tab switcher at the top of the To-Pay tab, matching the web app's
// "Bills / Debts" sub-tab pattern. More sub-tabs (Loans) can be added the
// same way later.
export default function ToPayScreen() {
  const { colors } = useTheme();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('bills');
  const styles = makeStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.switcherRow}>
        <TouchableOpacity
          style={[styles.switcherBtn, activeSubTab === 'bills' && styles.switcherBtnActive]}
          onPress={() => setActiveSubTab('bills')}
        >
          <Text
            style={[
              styles.switcherBtnText,
              activeSubTab === 'bills' && styles.switcherBtnTextActive,
            ]}
          >
            Bills
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.switcherBtn, activeSubTab === 'debts' && styles.switcherBtnActive]}
          onPress={() => setActiveSubTab('debts')}
        >
          <Text
            style={[
              styles.switcherBtnText,
              activeSubTab === 'debts' && styles.switcherBtnTextActive,
            ]}
          >
            Debts
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.contentWrap}>
        {activeSubTab === 'bills' ? <BillsScreen /> : <DebtsScreen />}
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.navy2 },
    switcherRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 4,
    },
    switcherBtn: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 999,
      backgroundColor: colors.navy3,
    },
    switcherBtnActive: { backgroundColor: colors.gold },
    switcherBtnText: { fontSize: 13, fontWeight: '600', color: colors.inkDim },
    switcherBtnTextActive: { color: colors.navy2 },
    contentWrap: { flex: 1 },
  });
}
