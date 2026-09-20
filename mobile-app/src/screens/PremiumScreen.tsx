import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';

// Static placeholder screen. No payment, paywall or subscription state exists.
const PESO = '\u20B1';
const BENEFITS = [
  'Unlimited transactions',
  'Advanced reports & insights',
  'Multiple account support',
  'Priority customer support',
];

type Billing = 'monthly' | 'yearly';

export default function PremiumScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [billing, setBilling] = useState<Billing>('monthly');
  const isMonthly = billing === 'monthly';

  return (
    <ScrollView
      testID="premium-screen-container"
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.heroCard}>
        <MaterialCommunityIcons name="crown" size={44} color={colors.premium} />
        <Text style={styles.heroTitle}>Upgrade to Premium</Text>
        <Text style={styles.heroSub}>
          Unlock all features and get the most out of your Finance Flow.
        </Text>
      </View>

      <View style={styles.toggleRow}>
        <TouchableOpacity
          testID="premium-billing-monthly"
          activeOpacity={0.8}
          onPress={() => setBilling('monthly')}
          style={[styles.billingPill, isMonthly && styles.billingPillActive]}
        >
          <Text style={[styles.billingText, isMonthly && styles.billingTextActive]}>Monthly</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="premium-billing-yearly"
          activeOpacity={0.8}
          onPress={() => setBilling('yearly')}
          style={[styles.billingPill, !isMonthly && styles.billingPillActive]}
        >
          <Text style={[styles.billingText, !isMonthly && styles.billingTextActive]}>Yearly</Text>
          <View style={styles.saveBadge}>
            <Text style={styles.saveBadgeText}>Save 20%</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        {BENEFITS.map((b) => (
          <View key={b} style={styles.benefitRow}>
            <Ionicons name="checkmark" size={16} color={colors.gold} />
            <Text style={styles.benefitText}>{b}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.planLabel}>Premium Plan</Text>
        <View style={styles.priceRow}>
          <Text style={styles.priceText}>{isMonthly ? PESO + '99.00' : PESO + '950.40'}</Text>
          <Text style={styles.priceUnit}>{isMonthly ? ' / month' : ' / year'}</Text>
        </View>
        <View testID="premium-coming-soon-button" style={styles.disabledButton}>
          <Text style={styles.disabledButtonText}>Coming soon</Text>
        </View>
      </View>

      <Text style={styles.footerText}>Not available yet. Nothing will be charged.</Text>
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.navy2 },
    content: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 40 },
    heroCard: {
      backgroundColor: colors.navy3,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.navy4,
      paddingVertical: 24,
      paddingHorizontal: 20,
      alignItems: 'center',
      marginBottom: 14,
    },
    heroTitle: { fontSize: 20, fontWeight: '700', color: colors.ink, marginTop: 12, marginBottom: 6 },
    heroSub: { fontSize: 13, color: colors.inkDim, textAlign: 'center', lineHeight: 18 },
    toggleRow: {
      flexDirection: 'row',
      gap: 8,
      backgroundColor: colors.navy3,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.navy4,
      padding: 4,
      marginBottom: 14,
    },
    billingPill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 11,
      borderRadius: 999,
    },
    billingPillActive: { backgroundColor: colors.gold },
    billingText: { fontSize: 14, fontWeight: '600', color: colors.inkDim },
    billingTextActive: { color: colors.navy2 },
    saveBadge: {
      backgroundColor: colors.okBg,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    saveBadgeText: { fontSize: 11, fontWeight: '700', color: colors.ok },
    card: {
      backgroundColor: colors.navy3,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.navy4,
      padding: 16,
      marginBottom: 14,
    },
    benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
    benefitText: { fontSize: 13.5, color: colors.ink },
    planLabel: { fontSize: 13, fontWeight: '600', color: colors.inkDim, marginBottom: 4 },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 14 },
    priceText: { fontSize: 26, fontWeight: '700', color: colors.ink },
    priceUnit: { fontSize: 13, color: colors.inkDim },
    disabledButton: {
      backgroundColor: colors.navy4,
      borderRadius: 999,
      paddingVertical: 13,
      alignItems: 'center',
    },
    disabledButtonText: { fontSize: 14, fontWeight: '700', color: colors.inkDim },
    footerText: { fontSize: 11.5, color: colors.inkFaint, textAlign: 'center' },
  });
}
