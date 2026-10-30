import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from './Tap';
import { Text, TextInput } from './AppText';
import BottomSheet from './BottomSheet';
import { useTheme } from '../ThemeContext';
import { animateNextLayout } from '../animateLayout';

// Forgot password (mockup FP2 + FP3, approved by Cath 2026-10-30). First a plain warning
// (before anything is sent: the data stays locked with the old password, so the Recovery Key
// or a household member's OK is needed once), then "Check your email".

export default function ForgotPasswordSheet({
  visible,
  initialEmail,
  onClose,
  send,
}: {
  visible: boolean;
  initialEmail: string;
  onClose: () => void;
  send: (email: string) => Promise<void>;
}) {
  const { colors } = useTheme();
  const [email, setEmail] = useState(initialEmail);
  const [step, setStep] = useState<'ask' | 'sent'>('ask');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setEmail(initialEmail);
      setStep('ask');
      setError('');
    }
  }, [visible, initialEmail]);

  async function doSend() {
    const e = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(e)) {
      setError('Type the email address you sign in with.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await send(e);
      animateNextLayout();
      setStep('sent');
    } catch (err: any) {
      const code = String(err?.code || '');
      if (/invalid-email/.test(code)) setError('That email address doesn’t look right.');
      else if (/too-many-requests/.test(code)) setError('Too many tries. Wait a few minutes, then try again.');
      else if (/user-not-found/.test(code)) {
        // Same answer either way, so nobody can find out which emails have an account.
        animateNextLayout();
        setStep('sent');
      } else setError('Couldn’t send it. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {step === 'ask' ? (
        <View style={s.body} testID="forgot-ask">
          <View style={[s.icon, { backgroundColor: '#FFF4E5' }]}>
            <Ionicons name="key-outline" size={26} color="#B26A00" />
          </View>
          <Text style={[s.title, { color: colors.ink }]}>Reset your password?</Text>
          <View style={[s.warn, { backgroundColor: '#FFF4E5' }]}>
            <Text style={s.warnText}>
              <Text style={{ fontWeight: '800', color: '#6B4A00' }}>Have your Recovery Key ready. </Text>
              After a reset, your data opens with your Recovery Key (16 characters), or when someone in your household approves it. Without either, your data can't be opened again.
            </Text>
          </View>
          {/* Same field look as the sign-in page (border + mail icon). */}
          <View style={{ justifyContent: 'center' }}>
          <View style={s.leftIcon} pointerEvents="none">
            <Ionicons name="mail-outline" size={18} color={colors.decor} />
          </View>
          <TextInput
            testID="forgot-email"
            style={[s.input, { backgroundColor: colors.navy3, color: colors.ink, borderColor: colors.navy4 }]}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.inkFaint}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            editable={!busy}
            accessibilityLabel="Email address"
          />
          </View>
          {!!error && <Text style={[s.error, { color: colors.negative }]}>{error}</Text>}
          <TouchableOpacity testID="forgot-send" onPress={doSend} disabled={busy} style={[s.primary, { backgroundColor: colors.buttonFill, opacity: busy ? 0.6 : 1 }]} accessibilityRole="button">
            <Text style={[s.primaryText, { color: colors.onButton }]}>{busy ? 'Sending…' : 'Send the reset email'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ alignSelf: 'center', padding: 8 }} accessibilityRole="button">
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.gold }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.body} testID="forgot-sent">
          <View style={[s.icon, { backgroundColor: colors.accentTint }]}>
            <Ionicons name="mail-outline" size={26} color={colors.gold} />
          </View>
          <Text style={[s.title, { color: colors.ink }]}>Check your email</Text>
          <Text style={[s.sub, { color: colors.inkDim }]}>
            We sent a link to {email.trim()}. Open it, choose a new password, then come back and sign in with it.
          </Text>
          <View style={[s.card, { backgroundColor: colors.navy3 }]}>
            <Text style={{ fontSize: 15, lineHeight: 21, color: colors.ink }}>
              <Text style={{ fontWeight: '800' }}>Then: </Text>
              the app asks for your Recovery Key (or a household member's OK) once, and locks your data with your new password.
            </Text>
          </View>
          <TouchableOpacity testID="forgot-back" onPress={onClose} style={[s.primary, { backgroundColor: colors.buttonFill }]} accessibilityRole="button">
            <Text style={[s.primaryText, { color: colors.onButton }]}>Back to sign in</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="forgot-again" onPress={doSend} disabled={busy} style={{ alignSelf: 'center', padding: 8 }} accessibilityRole="button">
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.gold }}>{busy ? 'Sending…' : "Didn't get it? Send again"}</Text>
          </TouchableOpacity>
        </View>
      )}
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingBottom: 28, gap: 12 },
  icon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  sub: { fontSize: 16, lineHeight: 22, textAlign: 'center' },
  warn: { borderRadius: 14, padding: 14 },
  warnText: { fontSize: 15, lineHeight: 21, color: '#6B4A00' },
  card: { borderRadius: 14, padding: 14 },
  input: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingLeft: 42, paddingRight: 14, minHeight: 50, paddingVertical: 13, fontSize: 17 },
  leftIcon: { position: 'absolute', left: 14, top: 0, bottom: 0, justifyContent: 'center', zIndex: 1 },
  error: { fontSize: 15, textAlign: 'center' },
  primary: { borderRadius: 28, paddingVertical: 15, alignItems: 'center' },
  primaryText: { fontSize: 17, fontWeight: '700' },
});
