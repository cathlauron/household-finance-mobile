// ============================================================
// Household Finance App — Reports pill-switcher (Checkpoint 10.2)
// ============================================================
// Now that there are 3 report pages, this screen switches between
// them the same way ToPayScreen/PlanningScreen switch between
// their own sub-sections. Each report lives in its own file under
// src/screens/reports/.
// ============================================================

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../ThemeContext';
import MonthlyCloseOutReport from './reports/MonthlyCloseOutReport';
import YearInReviewReport from './reports/YearInReviewReport';
import CashFlowForecastReport from './reports/CashFlowForecastReport';

type ReportTab = 'monthly' | 'yearly' | 'forecast';

const REPORT_TABS: { id: ReportTab; label: string }[] = [
  { id: 'monthly', label: 'Monthly Close-out' },
  { id: 'yearly', label: 'Year in Review' },
  { id: 'forecast', label: 'Cash-Flow Forecast' },
];

export default function ReportsScreen() {
  const [activeReport, setActiveReport] = useState<ReportTab>('monthly');
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pillScroll}
        contentContainerStyle={styles.pillRow}
      >
        {REPORT_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.pill, activeReport === tab.id && styles.pillActive]}
            onPress={() => setActiveReport(tab.id)}
          >
            <Text style={[styles.pillText, activeReport === tab.id && styles.pillTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {activeReport === 'monthly' && <MonthlyCloseOutReport />}
      {activeReport === 'yearly' && <YearInReviewReport />}
      {activeReport === 'forecast' && <CashFlowForecastReport />}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.navy1 },
    pillScroll: { flexGrow: 0 },
    pillRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 },
    pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.navy3 },
    pillActive: { backgroundColor: colors.gold },
    pillText: { fontSize: 13, fontWeight: '600', color: colors.inkDim },
    pillTextActive: { color: colors.navy1 },
  });
}
