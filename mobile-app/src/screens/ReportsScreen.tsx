import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import MonthlyCloseOutReport from './reports/MonthlyCloseOutReport';
import YearInReviewReport from './reports/YearInReviewReport';
import CashFlowForecastReport from './reports/CashFlowForecastReport';
import PersonSpendingReport from './reports/PersonSpendingReport';
import WeeklyDigestReport from './reports/WeeklyDigestReport';
import MerchantSpendingReport from './reports/MerchantSpendingReport';
import SubscriptionAuditReport from './reports/SubscriptionAuditReport';
import TaxSummaryReport from './reports/TaxSummaryReport';
import PaymentMethodsReport from './reports/PaymentMethodsReport';

type ReportTab = 'monthly' | 'yearly' | 'forecast' | 'person' | 'weekly' | 'merchant' | 'subscription' | 'tax' | 'paymentMethod';

const REPORT_TABS: { id: ReportTab; label: string }[] = [
  { id: 'monthly', label: 'Monthly Close-out' },
  { id: 'yearly', label: 'Year in Review' },
  { id: 'forecast', label: 'Cash-Flow Forecast' },
  { id: 'person', label: 'Person Spending' },
  { id: 'weekly', label: 'Weekly Digest' },
  { id: 'merchant', label: 'Merchant Spending' },
  { id: 'subscription', label: 'Subscription Audit' },
  { id: 'tax', label: 'Tax Summary' },
  { id: 'paymentMethod', label: 'Payment Methods' },
];

export default function ReportsScreen() {
  const [activeReport, setActiveReport] = useState<ReportTab>('monthly');
  const [activeTag, setActiveTag] = useState<string | undefined>(undefined);
  const { colors } = useTheme();
  const { model } = useData();
  const styles = makeStyles(colors);

  const distinctTags = Array.from(
    new Set(
      (model?.manualTransactions || [])
        .flatMap((t) => t.tags || [])
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  const TAG_FILTERED_TABS: ReportTab[] = ['monthly', 'yearly', 'person', 'weekly', 'merchant', 'tax'];
  const showTagToolbar = TAG_FILTERED_TABS.includes(activeReport) && distinctTags.length > 0;

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
      {showTagToolbar && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pillScroll}
          contentContainerStyle={styles.pillRow}
        >
          <TouchableOpacity
            style={[styles.tagPill, activeTag === undefined && styles.tagPillActive]}
            onPress={() => setActiveTag(undefined)}
          >
            <Text style={[styles.tagPillText, activeTag === undefined && styles.tagPillTextActive]}>All</Text>
          </TouchableOpacity>
          {distinctTags.map((tag) => (
            <TouchableOpacity
              key={tag}
              style={[styles.tagPill, activeTag === tag && styles.tagPillActive]}
              onPress={() => setActiveTag(tag)}
            >
              <Text style={[styles.tagPillText, activeTag === tag && styles.tagPillTextActive]}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      {activeReport === 'monthly' && <MonthlyCloseOutReport activeTag={activeTag} />}
      {activeReport === 'yearly' && <YearInReviewReport activeTag={activeTag} />}
      {activeReport === 'forecast' && <CashFlowForecastReport />}
      {activeReport === 'person' && <PersonSpendingReport activeTag={activeTag} />}
      {activeReport === 'weekly' && <WeeklyDigestReport activeTag={activeTag} />}
      {activeReport === 'merchant' && <MerchantSpendingReport activeTag={activeTag} />}
      {activeReport === 'subscription' && <SubscriptionAuditReport />}
      {activeReport === 'tax' && <TaxSummaryReport activeTag={activeTag} />}
      {activeReport === 'paymentMethod' && <PaymentMethodsReport />}
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
    tagPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.navy2, borderWidth: 1, borderColor: colors.navy3 },
    tagPillActive: { backgroundColor: colors.gold, borderColor: colors.gold },
    tagPillText: { fontSize: 12, fontWeight: '600', color: colors.inkFaint },
    tagPillTextActive: { color: colors.navy1 },
  });
}
