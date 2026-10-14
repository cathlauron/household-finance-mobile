import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './AppText';
import GradientFill from './GradientFill';
import { useTheme } from '../ThemeContext';

// Redesign: small shared pieces for the report pages (white group, header, footer, trio).

export function useReportStyles() {
  const { colors } = useTheme();
  return StyleSheet.create({
    content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },
    group: { backgroundColor: colors.navy3, borderRadius: 12, overflow: 'hidden' },
    pad: { padding: 16 },
    header: { fontSize: 13, fontWeight: '600', color: colors.inkDim, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 22, marginBottom: 6, marginHorizontal: 16 },
    footer: { fontSize: 13, color: colors.inkDim, marginTop: 6, marginHorizontal: 16 },
    meta: { fontSize: 13, color: colors.inkDim },
    subhead: { fontSize: 15, color: colors.inkDim, marginTop: 2 },
    title: { fontSize: 22, fontWeight: '700', color: colors.ink },
    headline: { fontSize: 17, fontWeight: '600', color: colors.ink },
    body: { fontSize: 17, color: colors.ink },
    amount: { fontSize: 17, fontWeight: '600' },
    row: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
    line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    track: { height: 6, borderRadius: 999, backgroundColor: colors.navy1, overflow: 'hidden', marginTop: 8 },
    trackFill: { height: '100%', borderRadius: 999, backgroundColor: colors.buttonFill },
    trio: { flexDirection: 'row', marginTop: 14, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    trioCell: { flex: 1 },
    trioCellLine: { flex: 1, paddingLeft: 12, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.navy4 },
    badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
    badgeText: { fontSize: 12, fontWeight: '600' },
  });
}

export function Group({ children, style }: { children: React.ReactNode; style?: any }) {
  const s = useReportStyles();
  return (
    <View style={[s.group, style]}>
      <GradientFill match={s.group} />
      {children}
    </View>
  );
}

export function Trio({ items }: { items: { label: string; value: string; color: string }[] }) {
  const s = useReportStyles();
  return (
    <View style={s.trio}>
      {items.map((it, i) => (
        <View key={it.label} style={i === 0 ? s.trioCell : s.trioCellLine}>
          <Text style={s.meta}>{it.label}</Text>
          <Text style={[s.headline, { color: it.color }]} numberOfLines={1} adjustsFontSizeToFit>
            {it.value}
          </Text>
        </View>
      ))}
    </View>
  );
}
