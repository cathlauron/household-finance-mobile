import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import Avatar from '../components/Avatar';
import PinField from '../components/PinField';
import { getInitials } from './ProfileScreen';
import type { RecentAccount } from '../recentAccounts';
import {
  getQuickUnlockPresence,
  loadFingerprintCopy,
  removeFingerprintCopy,
  attemptPinUnlock,
} from '../quickUnlock';
import type { QuickUnlockCredentials } from '../quickUnlock';

// Shown after the app was fully closed and reopened. Lists the accounts that
// have signed in on this phone, then unlocks the chosen one with fingerprint
// first, PIN as a fallback, or sends the person to the password screen.
// This screen only unlocks the saved sign-in details. The caller (App.tsx)
// does the actual sign-in with them.

type Props = {
  accounts: RecentAccount[];
  onUnlocked: (creds: QuickUnlockCredentials) => void;
  onUsePassword: (username: string) => void;
  onUseOtherAccount: () => void;
};

type Presence = { fingerprint: boolean; pin: boolean };
type Mode = 'fingerprint' | 'pin' | 'none';

export default function AccountSwitcherScreen({
  accounts,
  onUnlocked,
  onUsePassword,
  onUseOtherAccount,
}: Props) {
  const { colors } = useTheme();
  const s = makeStyles(colors);

  const [presence, setPresence] = useState<Record<string, Presence> | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('none');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const mountedRef = useRef(true);
  const fingerprintInFlightRef = useRef(false);
  const autoSelectedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    (async () => {
      const entries = await Promise.all(
        accounts.map(async (a) => [a.username, await getQuickUnlockPresence(a.username)] as const)
      );
      if (!mountedRef.current) return;
      const map: Record<string, Presence> = {};
      entries.forEach(([u, p]) => {
        map[u] = p;
      });
      setPresence(map);
      // Only one remembered account: skip the list.
      if (accounts.length === 1 && !autoSelectedRef.current) {
        autoSelectedRef.current = true;
        chooseAccount(accounts[0].username, map[accounts[0].username]);
      }
    })();
  }, []);

  function updatePresence(username: string, p: Presence) {
    setPresence((prev) => ({ ...(prev || {}), [username]: p }));
  }

  function chooseAccount(username: string, p: Presence) {
    setSelected(username);
    setPin('');
    setError('');
    const nextMode: Mode = p.fingerprint ? 'fingerprint' : p.pin ? 'pin' : 'none';
    setMode(nextMode);
    if (nextMode === 'fingerprint') runFingerprint(username);
  }

  async function runFingerprint(username: string) {
    if (fingerprintInFlightRef.current) return;
    fingerprintInFlightRef.current = true;
    setError('');
    try {
      const result = await loadFingerprintCopy(username);
      if (!mountedRef.current) return;
      if (result.status === 'ok') {
        onUnlocked(result.creds);
        return;
      }
      if (result.status === 'cancelled') return;
      if (result.status === 'missing') {
        // Nothing usable stored, or the phone's fingerprints changed.
        await removeFingerprintCopy(username);
        const fresh = await getQuickUnlockPresence(username);
        if (!mountedRef.current) return;
        updatePresence(username, fresh);
        setMode(fresh.pin ? 'pin' : 'none');
        setError(
          fresh.pin
            ? "Fingerprint unlock isn't available. Use your PIN."
            : "Fingerprint unlock isn't available. Use your password."
        );
        return;
      }
      setError("Couldn't use fingerprint. Try again or use another option.");
    } finally {
      fingerprintInFlightRef.current = false;
    }
  }

  async function handlePinUnlock() {
    if (!selected || busy) return;
    setError('');
    setBusy(true);
    // Let the spinner draw before the slow key work starts.
    await new Promise((resolve) => setTimeout(resolve, 50));
    const result = await attemptPinUnlock(selected, pin);
    if (!mountedRef.current) return;
    if (result.status === 'ok') {
      setBusy(false);
      onUnlocked(result.creds);
      return;
    }
    setBusy(false);
    setPin('');
    if (result.status === 'wrong') {
      setError(
        `Incorrect PIN. ${result.attemptsLeft} attempt${result.attemptsLeft === 1 ? '' : 's'} left.`
      );
      return;
    }
    const fresh = await getQuickUnlockPresence(selected);
    if (!mountedRef.current) return;
    updatePresence(selected, fresh);
    setMode(fresh.fingerprint ? 'fingerprint' : 'none');
    setError(
      result.status === 'wiped'
        ? 'Too many incorrect PINs. Use your password.'
        : "PIN unlock isn't available. Use your password."
    );
  }

  function switchToPin() {
    setMode('pin');
    setPin('');
    setError('');
  }

  function switchToFingerprint() {
    if (!selected) return;
    setMode('fingerprint');
    setError('');
    runFingerprint(selected);
  }

  const selectedAccount = selected ? accounts.find((a) => a.username === selected) : undefined;
  const selectedPresence = selected && presence ? presence[selected] : undefined;

  return (
    <KeyboardAvoidingView
      testID="account-switcher-container"
      style={{ flex: 1, backgroundColor: colors.navy2 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <View style={s.brandWrap}>
          <Image source={require('../../assets/logo.png')} style={s.brandLogo} resizeMode="contain" />
          <Text style={s.brandName}>FINANCE FLOW</Text>
        </View>

        {presence === null && <ActivityIndicator color={colors.gold} style={{ marginTop: 24 }} />}

        {presence !== null && !selectedAccount && (
          <>
            <Text style={s.title}>Welcome back</Text>
            <Text style={s.sub}>Choose an account.</Text>
            {accounts.map((a) => (
              <TouchableOpacity
                key={a.username}
                testID={`account-switcher-item-${a.username}`}
                style={s.row}
                onPress={() => chooseAccount(a.username, presence[a.username] || { fingerprint: false, pin: false })}
              >
                <Avatar initials={getInitials(a.username)} config={a.avatarConfig} size={48} />
                <Text style={s.rowName} numberOfLines={1}>
                  {a.username}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
              </TouchableOpacity>
            ))}
          </>
        )}

        {presence !== null && !!selectedAccount && (
          <>
            <View style={s.bigAvatarWrap}>
              <Avatar initials={getInitials(selectedAccount.username)} config={selectedAccount.avatarConfig} size={76} />
            </View>
            <Text style={s.title}>{selectedAccount.username}</Text>
            <Text style={s.sub}>
              {mode === 'fingerprint'
                ? 'Unlock with your fingerprint.'
                : mode === 'pin'
                ? 'Enter your PIN.'
                : 'Sign in with your password.'}
            </Text>

            {mode === 'fingerprint' && (
              <>
                <TouchableOpacity
                  testID="account-switcher-fingerprint-button"
                  style={s.primaryBtn}
                  onPress={() => runFingerprint(selectedAccount.username)}
                >
                  <View style={s.btnRow}>
                    <Ionicons name="finger-print" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={s.primaryBtnText}>Use fingerprint</Text>
                  </View>
                </TouchableOpacity>
                {!!selectedPresence && selectedPresence.pin && (
                  <TouchableOpacity testID="account-switcher-use-pin" style={s.ghostBtn} onPress={switchToPin}>
                    <Text style={s.ghostBtnText}>Use PIN instead</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {mode === 'pin' && (
              <>
                <PinField
                  testID="account-switcher-pin-input"
                  style={s.pinInput}
                  value={pin}
                  onChangeText={setPin}
                  centered
                  autoFocus
                />
                <TouchableOpacity
                  testID="account-switcher-pin-submit"
                  style={[s.primaryBtn, (busy || pin.length < 4) && { opacity: 0.4 }]}
                  onPress={handlePinUnlock}
                  disabled={busy || pin.length < 4}
                >
                  {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.primaryBtnText}>Unlock</Text>}
                </TouchableOpacity>
                {!!selectedPresence && selectedPresence.fingerprint && (
                  <TouchableOpacity style={s.ghostBtn} onPress={switchToFingerprint}>
                    <Text style={s.ghostBtnText}>Use fingerprint instead</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {!!error && <Text style={s.error}>{error}</Text>}

            {mode === 'none' ? (
              <TouchableOpacity
                testID="account-switcher-use-password"
                style={s.primaryBtn}
                onPress={() => onUsePassword(selectedAccount.username)}
              >
                <Text style={s.primaryBtnText}>Sign in with password</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                testID="account-switcher-use-password"
                style={s.ghostBtn}
                onPress={() => onUsePassword(selectedAccount.username)}
              >
                <Text style={s.ghostBtnText}>Use password instead</Text>
              </TouchableOpacity>
            )}

            {accounts.length > 1 && (
              <TouchableOpacity
                testID="account-switcher-back"
                style={s.ghostBtn}
                onPress={() => {
                  setSelected(null);
                  setError('');
                  setPin('');
                }}
              >
                <Text style={s.ghostBtnText}>Choose a different account</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {presence !== null && (
          <TouchableOpacity testID="account-switcher-other-account" style={s.otherBtn} onPress={onUseOtherAccount}>
            <Ionicons name="person-add-outline" size={16} color={colors.inkDim} style={{ marginRight: 6 }} />
            <Text style={s.ghostBtnText}>Use another account</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32 },
    brandWrap: { alignItems: 'center', marginBottom: 20 },
    brandLogo: { width: 64, height: 64 },
    brandName: { marginTop: 10, fontSize: 12, letterSpacing: 4, color: colors.inkDim },
    bigAvatarWrap: { alignItems: 'center', marginTop: 8, marginBottom: 12 },
    title: {
      fontSize: 28,
      color: colors.ink,
      marginBottom: 6,
      textAlign: 'center',
      fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }),
    },
    sub: { fontSize: 14, color: colors.inkDim, marginBottom: 20, lineHeight: 20, textAlign: 'center' },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.navy3,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.navy4,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 10,
    },
    rowName: { flex: 1, marginLeft: 14, fontSize: 16, color: colors.ink, fontWeight: '600' },
    pinInput: {
      backgroundColor: colors.navy3,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.navy4,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 18,
      color: colors.ink,
      textAlign: 'center',
      letterSpacing: 6,
    },
    primaryBtn: {
      backgroundColor: colors.gold,
      borderRadius: 999,
      height: 52,
      justifyContent: 'center',
      marginTop: 20,
    },
    primaryBtnText: { color: '#FFFFFF', textAlign: 'center', fontWeight: '600', fontSize: 15 },
    btnRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    ghostBtn: { paddingVertical: 14, marginTop: 4, alignItems: 'center' },
    ghostBtnText: { color: colors.inkDim, textAlign: 'center', fontSize: 13 },
    otherBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      marginTop: 16,
    },
    error: { color: colors.error, fontSize: 13, textAlign: 'center', marginTop: 14 },
  });
}
