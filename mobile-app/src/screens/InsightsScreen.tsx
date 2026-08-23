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
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../ThemeContext';
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
        <TouchableOpacity
          style={[styles.pill, activeTab === 'dashboard' && styles.pillActive]}
          onPress={() => setActiveTab('dashboard')}
        >
          <Text style={[styles.pillText, activeTab === 'dashboard' && styles.pillTextActive]}>
            Dashboard
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pill, activeTab === 'reports' && styles.pillActive]}
          onPress={() => setActiveTab('reports')}
        >
          <Text style={[styles.pillText, activeTab === 'reports' && styles.pillTextActive]}>
            Reports
          </Text>
        </TouchableOpacity>
      </View>
      {activeTab === 'dashboard' ? <DashboardScreen /> : <ReportsScreen />}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.navy1,
    },
    pillRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 4,
    },
    pill: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.navy3,
    },
    pillActive: {
      backgroundColor: colors.gold,
    },
    pillText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.inkDim,
    },
    pillTextActive: {
      color: colors.navy1,
    },
  });
}
