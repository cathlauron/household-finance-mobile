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

import IconLabelHint from '../components/IconLabelHint';
import { Ionicons } from '@expo/vector-icons';

type ReportTab = 'monthly' | 'yearly' | 'forecast' | 'person' | 'weekly' | 'merchant' | 'subscription' | 'tax' | 'paymentMethod';

type ReportTabItem = {
  id: ReportTab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const REPORT_TABS: ReportTabItem[] = [
  { id: 'monthly', label: 'Monthly Close-out', icon: 'calendar-outline' },
  { id: 'yearly', label: 'Year in Review', icon: 'trophy-outline' },
  { id: 'forecast', label: 'Cash-Flow Forecast', icon: 'trending-up-outline' },
  { id: 'person', label: 'Person Spending', icon: 'people-outline' },
  { id: 'weekly', label: 'Weekly Digest', icon: 'newspaper-outline' },
  { id: 'merchant', label: 'Merchant Spending', icon: 'storefront-outline' },
  { id: 'subscription', label: 'Subscription Audit', icon: 'repeat-outline' },
  { id: 'tax', label: 'Tax Summary', icon: 'receipt-outline' },
  { id: 'paymentMethod', label: 'Payment Methods', icon: 'card-outline' },
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
        {REPORT_TABS.map((tab) => {
          const isActive = activeReport === tab.id;
          return (
            <View key={tab.id} style={[styles.pill, isActive && styles.pillActive]}>
              <IconLabelHint
                name={tab.icon}
                label={tab.label}
                size={18}
                color={isActive ? colors.navy1 : colors.inkDim}
                position="above"
                onPress={() => setActiveReport(tab.id)}
              />
            </View>
          );
        })}
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
    pill: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.navy3, alignItems: 'center', justifyContent: 'center' },
    pillActive: { backgroundColor: colors.gold },
    tagPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.navy2, borderWidth: 1, borderColor: colors.navy3 },
    tagPillActive: { backgroundColor: colors.gold, borderColor: colors.gold },
    tagPillText: { fontSize: 12, fontWeight: '600', color: colors.inkFaint },
    tagPillTextActive: { color: colors.navy1 },
  });
}
