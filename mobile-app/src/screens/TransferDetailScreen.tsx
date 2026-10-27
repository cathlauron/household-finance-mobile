import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { Text } from '../components/AppText';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { formatPeso } from '../balanceProjection';
import { dateText } from '../dateUtils';
import { transferRow } from '../transfersList';
import GradientFill from '../components/GradientFill';
import type { ThemeColors } from '../theme';

// Cath, 2026-10-27 (canvas T1): a money move's own page: from, to, date, fee and its note.
// It's not spending, so nothing here counts towards In / Out or Left to Spend.
export default function TransferDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { model } = useData();
  const route = useRoute<any>();
  const t = (model?.transfers || []).find((x) => x.id === route.params?.id);
  if (!model || !t) {
    return (
      <View style={styles.empty}>
        <Text style={styles.meta}>This move isn't here any more.</Text>
      </View>
    );
  }
  const r = transferRow(model, t);
  const d = new Date(t.date + 'T00:00:00');
  return (
    <KeyboardAwareScrollView pageBounce contentContainerStyle={styles.content}>
      <Text style={styles.title}>{r.title.split(':')[0]}</Text>
      <Text style={styles.amount} testID="transfer-detail-amount">{formatPeso(r.amount)}</Text>
      <Text style={styles.meta}>Between your own accounts · not spending</Text>
      <View style={styles.group}>
        <GradientFill match={styles.group} />
        <Row styles={styles} label="From" value={r.fromName} />
        <Row styles={styles} label="To" value={r.toName} />
        <Row styles={styles} label="Date" value={isNaN(d.getTime()) ? t.date : dateText(d, { weekday: true })} last={!r.fee && !r.note} />
        {r.fee > 0 && <Row styles={styles} label="Fee" value={formatPeso(r.fee)} last={!r.note} />}
        {!!r.note && <Row styles={styles} label="Note" value={r.note} last multiline />}
      </View>
      {r.fee > 0 && <Text style={styles.footer}>The fee is its own entry in Transactions (Fees). It's the only part that counts as spending.</Text>}
    </KeyboardAwareScrollView>
  );
}

function Row({ styles, label, value, last, multiline }: { styles: any; label: string; value: string; last?: boolean; multiline?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.line]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={multiline ? undefined : 1}>{value}</Text>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: { paddingHorizontal: 16, paddingBottom: 40 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    title: { fontSize: 17, color: colors.inkDim, textAlign: 'center', marginTop: 8 },
    amount: { fontSize: 38, fontWeight: '800', color: colors.ink, textAlign: 'center', marginTop: 2 },
    meta: { fontSize: 14, color: colors.inkDim, textAlign: 'center', marginTop: 2 },
    group: { backgroundColor: colors.navy3, borderRadius: 12, overflow: 'hidden', marginTop: 22 },
    row: { flexDirection: 'row', alignItems: 'center', minHeight: 50, paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
    line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.navy4 },
    rowLabel: { fontSize: 17, color: colors.ink, flexShrink: 0 },
    rowValue: { fontSize: 17, color: colors.inkDim, flex: 1, textAlign: 'right' },
    footer: { fontSize: 13, color: colors.inkDim, marginTop: 8, marginHorizontal: 16, lineHeight: 18 },
  });
}
