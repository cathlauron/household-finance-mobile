import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Text } from '../components/AppText';
import { PullToRefreshScrollView } from '../PullToRefreshScrollView';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import { hapticSelection } from '../haptics';

// Finance Flow Premium. Laid out like a live plan page, but payments aren't set up yet:
// Subscribe only tells people it opens soon. No payment or subscription state exists.
const BENEFITS: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; sub: string }[] = [
  { icon: 'infinite-outline', title: 'Unlimited transactions', sub: 'Log every peso, no caps' },
  { icon: 'bar-chart-outline', title: 'Advanced reports & insights', sub: 'See where your money really goes' },
  { icon: 'wallet-outline', title: 'Multiple account support', sub: 'Every bank, card and e-wallet in one place' },
  { icon: 'chatbubbles-outline', title: 'Priority support', sub: 'Get help first when you need it' },
];

type Billing = 'monthly' | 'yearly';
const PLANS: Record<Billing, { label: string; price: string; per: string; note: string }> = {
  yearly: { label: 'Yearly', price: '₱950.40', per: 'a year', note: 'Just ₱79.20 a month' },
  monthly: { label: 'Monthly', price: '₱99.00', per: 'a month', note: 'Billed every month' },
};

export default function PremiumScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [billing, setBilling] = useState<Billing>('yearly');
  const plan = PLANS[billing];

  function subscribe() {
    Alert.alert('Almost ready', "Premium opens very soon. We'll let you know as soon as you can subscribe.");
  }

  return (
    <PullToRefreshScrollView testID="premium-screen-container" style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={[styles.crown, { backgroundColor: colors.buttonFill }]}>
          <MaterialCommunityIcons name="crown" size={34} color="#FFFFFF" />
        </View>
        <Text style={styles.heroTitle}>Finance Flow Premium</Text>
        <Text style={styles.heroSub}>Everything you need to stay ahead of your household's money.</Text>
      </View>

      <View style={styles.group}>
        {BENEFITS.map((b, i) => (
          <View key={b.title} style={[styles.benefitRow, i > 0 && styles.divider]}>
            <View style={[styles.benefitIcon, { backgroundColor: colors.accentTint }]}>
              <Ionicons name={b.icon} size={18} color={colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.benefitTitle}>{b.title}</Text>
              <Text style={styles.benefitSub}>{b.sub}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.label}>Choose your plan</Text>
      {(['yearly', 'monthly'] as Billing[]).map((id) => {
        const p = PLANS[id];
        const on = billing === id;
        return (
          <TouchableOpacity
            key={id}
            testID={`premium-billing-${id}`}
            activeOpacity={0.8}
            onPress={() => { hapticSelection(); setBilling(id); }}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            style={[styles.planCard, { borderColor: on ? colors.buttonFill : 'transparent' }]}
          >
            <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? colors.buttonFill : colors.inkFaint} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.planName}>{p.label}</Text>
                {id === 'yearly' && (
                  <View style={[styles.badge, { backgroundColor: colors.okBg }]}>
                    <Text style={[styles.badgeText, { color: colors.ok }]}>Save 20%</Text>
                  </View>
                )}
              </View>
              <Text style={styles.planNote}>{p.note}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.planPrice}>{p.price}</Text>
              <Text style={styles.planPer}>{p.per}</Text>
            </View>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        testID="premium-subscribe-button"
        activeOpacity={0.85}
        onPress={subscribe}
        style={[styles.cta, { backgroundColor: colors.buttonFill }]}
        accessibilityRole="button"
      >
        <Text style={[styles.ctaText, { color: colors.onButton }]}>Subscribe · {plan.price} {plan.per}</Text>
      </TouchableOpacity>
    </PullToRefreshScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },
    hero: { alignItems: 'center', paddingVertical: 16, marginBottom: 8 },
    crown: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
    heroTitle: { fontSize: 24, fontWeight: '800', color: colors.ink, marginTop: 14 },
    heroSub: { fontSize: 15, lineHeight: 21, color: colors.inkDim, textAlign: 'center', marginTop: 6, paddingHorizontal: 12 },
    group: { backgroundColor: colors.navy3, borderRadius: 16, overflow: 'hidden', marginBottom: 24 },
    benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
    divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    benefitIcon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    benefitTitle: { fontSize: 16, fontWeight: '600', color: colors.ink },
    benefitSub: { fontSize: 13, color: colors.inkDim, marginTop: 1 },
    label: { fontSize: 13, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase', color: colors.inkDim, marginBottom: 8, marginLeft: 16 },
    planCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.navy3, borderRadius: 16, borderWidth: 2, padding: 14, marginBottom: 10 },
    planName: { fontSize: 17, fontWeight: '700', color: colors.ink },
    planNote: { fontSize: 13, color: colors.inkDim, marginTop: 2 },
    planPrice: { fontSize: 17, fontWeight: '800', color: colors.ink },
    planPer: { fontSize: 12, color: colors.inkDim },
    badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
    badgeText: { fontSize: 11, fontWeight: '800' },
    cta: { borderRadius: 14, minHeight: 54, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
    ctaText: { fontSize: 17, fontWeight: '800' },
  });
}
