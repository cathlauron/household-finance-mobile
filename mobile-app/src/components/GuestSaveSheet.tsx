import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TouchableOpacity } from './Tap';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './AppText';
import BottomSheet from './BottomSheet';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';

// Version 3 (approved Option B, canvas B7): the first money entry made before having an
// account opens this sheet. "Continue with email" goes to sign-up; the entry is saved in
// the new account. "Not now" keeps it on screen on this phone only (not saved).

export default function GuestSaveSheet({ onContinue }: { onContinue: () => void }) {
  const { colors } = useTheme();
  const { guestRequest, resolveGuestRequest } = useData();
  const what = guestRequest?.entry ?? 'entry';
  return (
    <BottomSheet visible={!!guestRequest} onClose={() => resolveGuestRequest(true)}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 28, gap: 14 }}>
        <View style={[s.icon, { backgroundColor: colors.accentTint }]}>
          <Ionicons name="lock-closed-outline" size={26} color={colors.gold} />
        </View>
        <Text style={[s.title, { color: colors.ink }]}>Keep your first entry safe</Text>
        <Text style={[s.body, { color: colors.inkDim }]}>
          Your {what} is in your list on this phone, not saved yet. Sign in so it's locked with your password and backed up.
        </Text>
        <TouchableOpacity onPress={onContinue} style={[s.primary, { backgroundColor: colors.buttonFill }]} accessibilityRole="button" testID="guest-continue-email">
          <Ionicons name="mail-outline" size={20} color={colors.onButton} />
          <Text style={[s.primaryText, { color: colors.onButton }]}>Continue with email</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {(['Google', 'Apple', 'Facebook'] as const).map((p) => (
            <View key={p} style={[s.soon, { backgroundColor: colors.navy4 }]} accessibilityLabel={`${p}, coming later`}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.inkDim }}>{p}</Text>
            </View>
          ))}
        </View>
        <Text style={[s.note, { color: colors.inkDim }]}>Google, Apple and Facebook are coming later.</Text>
        <TouchableOpacity onPress={() => resolveGuestRequest(true)} accessibilityRole="button" style={{ alignSelf: 'center', padding: 8 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.gold }}>Not now</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

// Settings and Profile are about an account, so before there is one they show this.
export function GuestGate({ onContinue }: { onContinue: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 14 }}>
      <View style={[s.icon, { backgroundColor: colors.accentTint }]}>
        <Ionicons name="person-circle-outline" size={28} color={colors.gold} />
      </View>
      <Text style={[s.title, { color: colors.ink }]}>Save Finance Flow first</Text>
      <Text style={[s.body, { color: colors.inkDim }]}>
        Settings and your profile belong to your account. Save Finance Flow to your email and they open here.
      </Text>
      <TouchableOpacity onPress={onContinue} style={[s.primary, { backgroundColor: colors.buttonFill }]} accessibilityRole="button">
        <Ionicons name="mail-outline" size={20} color={colors.onButton} />
        <Text style={[s.primaryText, { color: colors.onButton }]}>Continue with email</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  icon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  body: { fontSize: 16, lineHeight: 22, textAlign: 'center' },
  primary: { flexDirection: 'row', gap: 10, borderRadius: 28, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 17, fontWeight: '700' },
  soon: { flex: 1, borderRadius: 22, paddingVertical: 12, alignItems: 'center', opacity: 0.7 },
  note: { fontSize: 13, textAlign: 'center', marginTop: -4 },
});
