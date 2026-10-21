import React, { useLayoutEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { TouchableOpacity } from '../components/Tap';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/AppText';
import { headerButtonText } from '../navigation/LargeHeader';
import GradientFill from '../components/GradientFill';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { formatPeso } from '../balanceProjection';
import { accountLabel } from '../transactionActions';
import type { ThemeColors } from '../theme';
import type { HouseholdModel } from '../types';

// Redesign: "To review", from the Finance Flow mockup. Spending whose category wasn't
// picked by hand (filled in by a rule, or imported) waits here. "Looks right" accepts
// it, "Change" opens the edit form, "Approve all" accepts everything at once.

export function reviewCount(model: HouseholdModel | null): number {
  return (model?.manualTransactions || []).filter((t) => t.needsReview).length;
}

export default function ReviewScreen() {
  const { colors } = useTheme();
  const { model, saveModel } = useData();
  const navigation = useNavigation<any>();
  const styles = makeStyles(colors);
  const items = (model?.manualTransactions || []).filter((t) => t.needsReview).sort((a, b) => (a.date < b.date ? 1 : -1));

  async function approve(ids: string[]) {
    if (!model) return;
    const set = new Set(ids);
    try {
      await saveModel({
        ...model,
        manualTransactions: (model.manualTransactions || []).map((t) => {
          if (!set.has(t.id)) return t;
          const { needsReview, reviewWhy, ...rest } = t;
          return rest;
        }),
      });
    } catch {
      Alert.alert('Failed to save', 'Please try again.');
    }
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackTitle: 'Transactions',
      headerRight: items.length
        ? () => (
            <TouchableOpacity onPress={() => approve(items.map((t) => t.id))} accessibilityRole="button">
              <Text style={[headerButtonText, { color: colors.gold }]}>Approve all</Text>
            </TouchableOpacity>
          )
        : undefined,
    });
  });

  if (items.length === 0) {
    return (
      <View style={styles.done}>
        <View style={styles.doneIcon}>
          <GradientFill match={styles.doneIcon} />
          <Ionicons name="checkmark" size={32} color={colors.gold} />
        </View>
        <Text style={styles.doneTitle}>All caught up</Text>
        <Text style={styles.doneSub}>New spending will show up here to check.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.intro}>Check the category on new spending. One tap if it's right.</Text>
      {items.map((t) => (
        <View key={t.id} style={styles.card}>
          <GradientFill match={styles.card} />
          <View style={styles.top}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{t.label}</Text>
              <Text style={styles.meta} numberOfLines={1}>
                {[t.date, model ? accountLabel(model, t.paymentMethod) : null].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <Text style={[styles.amount, { color: t.direction === 'in' ? colors.positive : colors.negative }]}>
              {t.direction === 'in' ? '+' : '−'}
              {formatPeso(t.amount)}
            </Text>
          </View>
          <View style={styles.catRow}>
            <Text style={styles.catLabel}>Category</Text>
            <Text style={styles.catValue}>{t.category || 'Uncategorized'}</Text>
          </View>
          {!!t.reviewWhy && <Text style={styles.why}>{t.reviewWhy}</Text>}
          <View style={styles.buttons}>
            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.buttonFill }]} onPress={() => approve([t.id])} accessibilityRole="button">
              <GradientFill color={colors.buttonFill} strength={0.18} />
              <Text style={[styles.btnText, { color: colors.onButton }]}>Looks right</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.accentTint }]}
              onPress={() => navigation.navigate('Main', { screen: 'Transactions', params: { editId: t.id, editNonce: Date.now() } })}
              accessibilityRole="button"
            >
              <GradientFill match={[styles.btn, { backgroundColor: colors.accentTint }]} />
              <Text style={[styles.btnText, { color: colors.gold }]}>Change</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: { paddingHorizontal: 16, paddingBottom: 40 },
    intro: { fontSize: 15, color: colors.inkDim, marginBottom: 16, marginLeft: 4 },
    card: { backgroundColor: colors.navy3, borderRadius: 12, padding: 16, marginBottom: 12 },
    top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    name: { fontSize: 17, fontWeight: '600', color: colors.ink },
    meta: { fontSize: 13, color: colors.inkDim, marginTop: 1 },
    amount: { fontSize: 17, fontWeight: '600' },
    catRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    catLabel: { fontSize: 15, color: colors.inkDim },
    catValue: { fontSize: 15, fontWeight: '600', color: colors.ink },
    why: { fontSize: 13, color: colors.inkDim, marginTop: 4 },
    buttons: { flexDirection: 'row', gap: 10, marginTop: 14 },
    btn: { overflow: 'hidden', flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    btnText: { fontSize: 15, fontWeight: '600' },
    done: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, paddingBottom: 120 },
    doneIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    doneTitle: { fontSize: 22, fontWeight: '700', color: colors.ink },
    doneSub: { fontSize: 15, color: colors.inkDim, marginTop: 6, textAlign: 'center' },
  });
}
