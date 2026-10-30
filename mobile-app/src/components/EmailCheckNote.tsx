import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TouchableOpacity } from './Tap';
import { Text } from './AppText';
import { useTheme } from '../ThemeContext';
import { animateNextLayout } from '../animateLayout';

// Email check (mockup FP, E1, approved by Cath 2026-10-30): a gentle note at the top of
// Settings until the account's email is confirmed, so a forgotten password can be reset.
// ✕ hides it for a week. It never blocks anything.

const HIDDEN_UNTIL = 'emailNoteHiddenUntil';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// The sign-in helpers load only when needed (pages without a signed-in account never touch them).
const auth = () => require('../authFirebase') as { emailConfirmed?: () => Promise<boolean | null>; sendConfirmEmail?: () => Promise<void> };

export default function EmailCheckNote() {
  const { colors } = useTheme();
  const [show, setShow] = useState(false);
  const [sent, setSent] = useState<'no' | 'busy' | 'yes' | 'failed'>('no');

  const check = useCallback(() => {
    let live = true;
    (async () => {
      const a = auth();
      if (typeof a.emailConfirmed !== 'function') return;
      const until = Number((await AsyncStorage.getItem(HIDDEN_UNTIL).catch(() => null)) || 0);
      if (Date.now() < until) return;
      const ok = await a.emailConfirmed().catch(() => null);
      if (live && ok === false) {
        animateNextLayout();
        setShow(true);
      } else if (live && ok === true) setShow(false);
    })();
    return () => {
      live = false;
    };
  }, []);
  useFocusEffect(check);
  useEffect(check, [check]);

  if (!show) return null;

  async function sendLink() {
    const a = auth();
    if (typeof a.sendConfirmEmail !== 'function') return;
    setSent('busy');
    try {
      await a.sendConfirmEmail();
      setSent('yes');
    } catch (e) {
      setSent('failed');
    }
  }

  function hide() {
    animateNextLayout();
    setShow(false);
    AsyncStorage.setItem(HIDDEN_UNTIL, String(Date.now() + WEEK_MS)).catch(() => {});
  }

  return (
    <View testID="email-check-note" style={[s.note, { backgroundColor: colors.accentTint }]}>
      <Ionicons name="mail-outline" size={22} color={colors.gold} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={[s.title, { color: colors.ink }]}>Confirm your email</Text>
        <Text style={[s.body, { color: colors.inkDim }]}>
          {sent === 'yes'
            ? 'Sent. Open the link in your email, then come back here.'
            : sent === 'failed'
            ? "Couldn't send it. Check your connection and try again."
            : 'So you can reset your password if you ever need to.'}
        </Text>
        {sent !== 'yes' && (
          <TouchableOpacity testID="email-check-send" onPress={sendLink} disabled={sent === 'busy'} accessibilityRole="button" hitSlop={8}>
            <Text style={[s.link, { color: colors.gold }]}>{sent === 'busy' ? 'Sending…' : 'Send the link'}</Text>
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity testID="email-check-hide" onPress={hide} accessibilityRole="button" accessibilityLabel="Hide for a week" hitSlop={10}>
        <Ionicons name="close" size={20} color={colors.inkDim} />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  note: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderRadius: 14, padding: 12, marginBottom: 16 },
  title: { fontSize: 15, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 19, marginTop: 1 },
  link: { fontSize: 15, fontWeight: '700', marginTop: 4 },
});
