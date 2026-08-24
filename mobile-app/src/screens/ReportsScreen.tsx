import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../ThemeContext';
import MonthlyCloseOutReport from './reports/MonthlyCloseOutReport';
import YearInReviewReport from './reports/YearInReviewReport';
import CashFlowForecastReport from './reports/CashFlowForecastReport';
import PersonSpendingReport from './reports/PersonSpendingReport';
import WeeklyDigestReport from './reports/WeeklyDigestReport';
import MerchantSpendingReport from './reports/MerchantSpendingReport';
import SubscriptionAuditReport from './reports/SubscriptionAuditReport';
import TaxSummaryReport from './reports/TaxSummaryReport';

type ReportTab = 'monthly' | 'yearly' | 'forecast' | 'person' | 'weekly' | 'merchant' | 'subscription' | 'tax';

const REPORT_TABS: { id: ReportTab; label: string }[] = [
  { id: 'monthly', label: 'Monthly Close-out' },
  { id: 'yearly', label: 'Year in Review' },
  { id: 'forecast', label: 'Cash-Flow Forecast' },
  { id: 'person', label: 'Person Spending' },
  { id: 'weekly', label: 'Weekly Digest' },
  { id: 'merchant', label: 'Merchant Spending' },
  { id: 'subscription', label: 'Subscription Audit' },
  { id: 'tax', label: 'Tax Summary' },
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
      {activeReport === 'person' && <PersonSpendingReport />}
      {activeReport === 'weekly' && <WeeklyDigestReport />}
      {activeReport === 'merchant' && <MerchantSpendingReport />}
      {activeReport === 'subscription' && <SubscriptionAuditReport />}
        {activeReport === 'tax' && <TaxSummaryReport />}
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
