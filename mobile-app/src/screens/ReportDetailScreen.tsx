import React, { useLayoutEffect, useState } from 'react';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { View, ScrollView, StyleSheet } from 'react-native';
import { TouchableOpacity } from '../components/Tap';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/AppText';
import GradientFill from '../components/GradientFill';
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
import { REPORT_TITLES, MORE_REPORTS, type ReportId } from './InsightsScreen';
import type { ThemeColors } from '../theme';

// Redesign: one report on its own page (opened from Insights), with the tag filter
// for the reports that support it.

const TAG_FILTERED: ReportId[] = ['monthly', 'yearly', 'person', 'weekly', 'merchant', 'tax'];

export default function ReportDetailScreen() {
  const { colors } = useTheme();
  const { model } = useData();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id: ReportId = route.params?.id ?? 'monthly';
  const [tag, setTag] = useState<string | undefined>(undefined);
  const styles = makeStyles(colors);

  useLayoutEffect(() => {
    navigation.setOptions({ title: REPORT_TITLES[id], headerBackTitle: route.params?.backTitle ?? 'Insights' });
  }, [navigation, id, route.params?.backTitle]);

  const tags = Array.from(new Set((model?.manualTransactions || []).flatMap((t) => t.tags || []).map((t) => t.trim()).filter(Boolean))).sort();
  const showTags = TAG_FILTERED.includes(id) && tags.length > 0;

  return (
    <View style={{ flex: 1 }}>
      {showTags && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.tagRow}>
          {[undefined, ...tags].map((t) => {
            const on = tag === t;
            return (
              <TouchableOpacity key={t ?? '__all'} style={[styles.chip, on && { backgroundColor: colors.buttonFill }]} onPress={() => setTag(t)} accessibilityRole="button" accessibilityState={{ selected: on }}>
                <GradientFill match={[styles.chip, on && { backgroundColor: colors.buttonFill }]} />
                <Text style={[styles.chipText, on && { color: colors.onButton }]}>{t ?? 'All'}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
      {id === 'monthly' && <MonthlyCloseOutReport activeTag={tag} />}
      {id === 'yearly' && <YearInReviewReport activeTag={tag} />}
      {id === 'forecast' && <CashFlowForecastReport />}
      {id === 'person' && <PersonSpendingReport activeTag={tag} />}
      {id === 'weekly' && <WeeklyDigestReport activeTag={tag} />}
      {id === 'merchant' && <MerchantSpendingReport activeTag={tag} />}
      {id === 'subscription' && <SubscriptionAuditReport />}
      {id === 'tax' && <TaxSummaryReport activeTag={tag} />}
      {id === 'paymentMethod' && <PaymentMethodsReport />}
    </View>
  );
}

// "More reports": the rest of the reports, one row each.
export function MoreReportsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const styles = makeStyles(colors);
  return (
    <KeyboardAwareScrollView pageBounce contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 4 }}>
      <View style={styles.group}>
        <GradientFill match={styles.group} />
        {MORE_REPORTS.map((rid, i) => (
          <TouchableOpacity
            key={rid}
            style={[styles.row, i > 0 && styles.line]}
            onPress={() => navigation.navigate('Report', { id: rid, backTitle: 'More' })}
            accessibilityRole="button"
          >
            <Text style={styles.title}>{REPORT_TITLES[rid]}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.inkDim} />
          </TouchableOpacity>
        ))}
      </View>
    </KeyboardAwareScrollView>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
    chip: { minHeight: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.navy3, justifyContent: 'center', overflow: 'hidden' },
    chipText: { fontSize: 15, fontWeight: '500', color: colors.ink },
    group: { backgroundColor: colors.navy3, borderRadius: 12, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52, paddingHorizontal: 16 },
    line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    title: { fontSize: 17, color: colors.ink },
  });
}
