// ============================================================
// Household Finance App — Insights tab pill-switcher (Checkpoint 10.2)
// ============================================================
// Same pattern as ToPayScreen (Bills/Debts/Loans) and
// PlanningScreen (Groceries/Travel/Events/Goals): a pill-button
// switcher at the top, swapping between two full child screens
// below it. This is now what the "Insights" tab in MainTabs.tsx
// points to, instead of DashboardScreen directly.
// ============================================================

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../ThemeContext';
import Pill from '../components/Pill';
import DashboardScreen from './DashboardScreen';
import ReportsScreen from './ReportsScreen';

type InsightsTab = 'dashboard' | 'reports';

export default function InsightsScreen() {
  const [activeTab, setActiveTab] = useState<InsightsTab>('dashboard');
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.pillRow}>
        <Pill label="Dashboard" active={activeTab === 'dashboard'} onPress={() => setActiveTab('dashboard')} />
        <Pill label="Reports" active={activeTab === 'reports'} onPress={() => setActiveTab('reports')} />
      </View>
      {activeTab === 'dashboard' ? <DashboardScreen /> : <ReportsScreen />}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    pillRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 4,
    },
  });
}
