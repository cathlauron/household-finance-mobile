import React, { useState, useEffect } from 'react';
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
import BottomSheet from '../components/BottomSheet';
import { getHiddenReportIds, setHiddenReportIds } from '../reportVisibility';

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
  const [hiddenReportIds, setHiddenReportIdsState] = useState<ReportTab[]>([]);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const { colors } = useTheme();
  const { model, username } = useData();
  const styles = makeStyles(colors);

  useEffect(() => {
    if (!username) return;
    getHiddenReportIds(username).then((ids) => setHiddenReportIdsState(ids as ReportTab[]));
  }, [username]);

  const visibleTabs = REPORT_TABS.filter((tab) => !hiddenReportIds.includes(tab.id));

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some((tab) => tab.id === activeReport)) {
      setActiveReport(visibleTabs[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hiddenReportIds]);

  async function toggleReportVisibility(id: ReportTab) {
    if (!username) return;
    const next = hiddenReportIds.includes(id)
      ? hiddenReportIds.filter((x) => x !== id)
      : [...hiddenReportIds, id];
    setHiddenReportIdsState(next);
    try {
      await setHiddenReportIds(username, next);
    } catch (e) {
      // Local state is already updated for this session; harmless if
      // the write fails, since it'll just reload as "all visible" next
      // time rather than losing any financial data.
    }
  }

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
      <View style={styles.tabRowWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pillScroll}
          contentContainerStyle={styles.pillRow}
        >
          {visibleTabs.map((tab) => {
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
        <View style={styles.pill}>
          <IconLabelHint
            name="options-outline"
            label="Customize"
            size={18}
            color={colors.inkDim}
            position="above"
            onPress={() => setCustomizeOpen(true)}
          />
        </View>
      </View>
      {visibleTabs.length === 0 && (
        <View style={styles.emptyStateWrap}>
          <Text style={styles.emptyStateText}>
            No reports shown. Tap options above to enable reports.
          </Text>
        </View>
      )}
      {visibleTabs.length > 0 && showTagToolbar && (
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
      {visibleTabs.length > 0 && activeReport === 'monthly' && <MonthlyCloseOutReport activeTag={activeTag} />}
      {visibleTabs.length > 0 && activeReport === 'yearly' && <YearInReviewReport activeTag={activeTag} />}
      {visibleTabs.length > 0 && activeReport === 'forecast' && <CashFlowForecastReport />}
      {visibleTabs.length > 0 && activeReport === 'person' && <PersonSpendingReport activeTag={activeTag} />}
      {visibleTabs.length > 0 && activeReport === 'weekly' && <WeeklyDigestReport activeTag={activeTag} />}
      {visibleTabs.length > 0 && activeReport === 'merchant' && <MerchantSpendingReport activeTag={activeTag} />}
      {visibleTabs.length > 0 && activeReport === 'subscription' && <SubscriptionAuditReport />}
      {visibleTabs.length > 0 && activeReport === 'tax' && <TaxSummaryReport activeTag={activeTag} />}
      {visibleTabs.length > 0 && activeReport === 'paymentMethod' && <PaymentMethodsReport />}

      <BottomSheet
        visible={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        title="Customize reports"
      >
        {REPORT_TABS.map((tab) => {
          const checked = !hiddenReportIds.includes(tab.id);
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.customizeRow}
              onPress={() => toggleReportVisibility(tab.id)}
            >
              <View style={styles.customizeRowLeft}>
                <Ionicons name={tab.icon} size={18} color={colors.inkDim} style={{ marginRight: 10 }} />
                <Text style={styles.customizeRowLabel}>{tab.label}</Text>
              </View>
              <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                {checked && <Ionicons name="checkmark" size={14} color={colors.navy2} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </BottomSheet>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.navy1 },
    tabRowWrap: { flexDirection: 'row', alignItems: 'center', paddingRight: 14 },
    pillScroll: { flexGrow: 0, flex: 1 },
    pillRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 },
    pill: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.navy3, alignItems: 'center', justifyContent: 'center' },
    pillActive: { backgroundColor: colors.gold },
    tagPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.navy2, borderWidth: 1, borderColor: colors.navy3 },
    tagPillActive: { backgroundColor: colors.gold, borderColor: colors.gold },
    tagPillText: { fontSize: 12, fontWeight: '600', color: colors.inkFaint },
    tagPillTextActive: { color: colors.navy1 },
    emptyStateWrap: { paddingHorizontal: 24, paddingTop: 40, alignItems: 'center' },
    emptyStateText: { fontSize: 13.5, color: colors.inkDim, textAlign: 'center', lineHeight: 19 },
    customizeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.navy4,
    },
    customizeRowLeft: { flexDirection: 'row', alignItems: 'center' },
    customizeRowLabel: { fontSize: 14, color: colors.ink },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: colors.inkFaint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: { backgroundColor: colors.gold, borderColor: colors.gold },
  });
}
