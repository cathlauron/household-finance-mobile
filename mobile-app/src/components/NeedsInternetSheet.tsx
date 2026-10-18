import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './AppText';
import BottomSheet from './BottomSheet';
import { useTheme } from '../ThemeContext';

// Version 2.1 (canvas S7): something that needs the internet, tapped while offline (or the
// connection is too slow), says so right away with the reason, instead of spinning.

export type NeedsInternet = { title: string; why: string; retry: () => void } | null;

export default function NeedsInternetSheet({ value, onClose }: { value: NeedsInternet; onClose: () => void }) {
  const { colors } = useTheme();
  return (
    <BottomSheet visible={!!value} onClose={onClose}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 28, gap: 14 }}>
        <View style={[s.icon, { backgroundColor: colors.accentTint }]}>
          <Ionicons name="cloud-offline-outline" size={26} color={colors.gold} />
        </View>
        <Text style={[s.title, { color: colors.ink }]}>{value?.title}</Text>
        <Text style={[s.body, { color: colors.inkDim }]}>{value?.why} Everything else still works offline.</Text>
        <TouchableOpacity
          onPress={() => {
            const retry = value?.retry;
            onClose();
            setTimeout(() => retry?.(), 250);
          }}
          style={[s.primary, { backgroundColor: colors.buttonFill }]}
          accessibilityRole="button"
        >
          <Text style={[s.primaryText, { color: colors.onButton }]}>Try again</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} accessibilityRole="button" style={{ alignSelf: 'center', padding: 8 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.gold }}>Not now</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

// Gives up on an online step after `ms` with a clear "slow connection" error.
export function withNetTimeout<T>(p: Promise<T>, ms = 15000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'net-timeout' })), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

const s = StyleSheet.create({
  icon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  title: { fontSize: 21, fontWeight: '800', textAlign: 'center' },
  body: { fontSize: 16, lineHeight: 22, textAlign: 'center' },
  primary: { borderRadius: 28, paddingVertical: 16, alignItems: 'center' },
  primaryText: { fontSize: 17, fontWeight: '700' },
});
