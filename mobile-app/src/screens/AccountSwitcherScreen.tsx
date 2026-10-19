import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { paintBusy } from '../components/BusyOverlay';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, BackHandler } from 'react-native';
import { Text } from '../components/AppText';
import DrawingLogo, { BusyWords } from '../components/DrawingLogo';
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
import { radii, spacing } from '../tokens';

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
  // True while the app opens the chosen account's data (after the PIN or fingerprint).
  working?: boolean;
};

type Presence = { fingerprint: boolean; pin: boolean };
type Mode = 'fingerprint' | 'pin' | 'none';

export default function AccountSwitcherScreen({
  accounts,
  onUnlocked,
  onUsePassword,
  onUseOtherAccount,
  working = false,
}: Props) {
  const { colors } = useTheme();
  const s = makeStyles(colors);

  const [presence, setPresence] = useState<Record<string, Presence> | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('none');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // Version 2.1 (round 5): while unlocking, the logo at the top draws itself like the
  // opening and the line under the name changes; nothing covers the screen.
  const active = busy || working;

  const mountedRef = useRef(true);
  const fingerprintInFlightRef = useRef(false);
  const autoSelectedRef = useRef(false);
  // Version 3 (M3): the fingerprint prompt waits a moment after an account is picked, so a
  // wrong tap can be undone ("‹ Accounts" or "Not you?") before the phone asks.
  const fingerprintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function backToList() {
    if (fingerprintTimerRef.current) clearTimeout(fingerprintTimerRef.current);
    fingerprintTimerRef.current = null;
    setSelected(null);
    setError('');
    setPin('');
  }

  // The phone's Back button goes back to the account list (several accounts).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selected && accounts.length > 1 && !busy && !working) {
        backToList();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [selected, accounts.length, busy, working]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (fingerprintTimerRef.current) clearTimeout(fingerprintTimerRef.current);
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
    if (fingerprintTimerRef.current) clearTimeout(fingerprintTimerRef.current);
    if (nextMode === 'fingerprint') {
      fingerprintTimerRef.current = setTimeout(() => {
        fingerprintTimerRef.current = null;
        if (mountedRef.current) runFingerprint(username);
      }, 700);
    }
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
    await paintBusy();
    // Let the spinner draw before the slow key work starts.
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
    <>
    <KeyboardAvoidingView
      testID="account-switcher-container"
      style={{ flex: 1, backgroundColor: 'transparent' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {presence !== null && !!selectedAccount && accounts.length > 1 && !active && (
        <TouchableOpacity testID="account-switcher-top-back" onPress={backToList} accessibilityRole="button" hitSlop={10} style={s.topBack}>
          <Ionicons name="chevron-back" size={20} color={colors.gold} />
          <Text style={s.topBackText}>Accounts</Text>
        </TouchableOpacity>
      )}
      <KeyboardAwareScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <View style={s.brandWrap}>
          <DrawingLogo width={84} drawing={active} />
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
                <Ionicons name="chevron-forward" size={18} color={colors.decor} />
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
            {active ? (
              <BusyWords messages={['Unlocking…', 'Opening your data…', 'Almost there…']} style={{ marginBottom: 8 }} />
            ) : (
              <Text style={s.sub}>Unlocking {selectedAccount.username}'s Finance Flow</Text>
            )}
            <View style={{ opacity: active ? 0.45 : 1 }} pointerEvents={active ? 'none' : 'auto'}>

            {mode === 'fingerprint' && (
              <>
                <TouchableOpacity
                  testID="account-switcher-fingerprint-button"
                  style={s.primaryBtn}
                  onPress={() => runFingerprint(selectedAccount.username)}
                >
                  {active ? (
                    <Text style={s.primaryBtnText}>Unlocking…</Text>
                  ) : (
                    <View style={s.btnRow}>
                      <Ionicons name="finger-print" size={20} color={colors.onButton} style={{ marginRight: 8 }} />
                      <Text style={s.primaryBtnText}>Use fingerprint</Text>
                    </View>
                  )}
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
                  <Text style={s.primaryBtnText}>{active ? 'Unlocking…' : 'Unlock'}</Text>
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

            <View style={[s.divider, { backgroundColor: colors.navy4 }]} />
            <TouchableOpacity
              testID="account-switcher-back"
              style={s.ghostBtn}
              onPress={accounts.length > 1 ? backToList : onUseOtherAccount}
            >
              <Text style={s.ghostBtnText}>
                {accounts.length > 1 ? 'Not you? Choose another account' : 'Not you? Use another account'}
              </Text>
            </TouchableOpacity>
            </View>
          </>
        )}

        {/* Only on the account list: once an account is picked, "Choose a different account" covers it. */}
        {presence !== null && !selectedAccount && (
          <TouchableOpacity
            testID="account-switcher-other-account"
            style={[s.otherBtn, active && { opacity: 0.45 }]}
            onPress={onUseOtherAccount}
            disabled={active}
          >
            <Ionicons name="person-add-outline" size={16} color={colors.inkDim} style={{ marginRight: 6 }} />
            <Text style={s.ghostBtnText}>Use another account</Text>
          </TouchableOpacity>
        )}
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
    </>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingTop: 32, paddingBottom: 96 },
    brandWrap: { alignItems: 'center', marginBottom: 14 },
    bigAvatarWrap: { alignItems: 'center', marginTop: 0, marginBottom: 12 },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.ink,
      marginBottom: 6,
      textAlign: 'center',
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
      backgroundColor: colors.buttonFill,
      borderRadius: radii.pill,
      height: 52,
      justifyContent: 'center',
      marginTop: spacing[20],
    },
    primaryBtnText: { color: colors.onButton, textAlign: 'center', fontWeight: '700', fontSize: 16 },
    btnRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    ghostBtn: { paddingVertical: 9, marginTop: 2, alignItems: 'center' },
    divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 30, marginTop: 14, marginBottom: 4 },
    topBack: { position: 'absolute', top: 12, left: 14, zIndex: 2, flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
    topBackText: { color: colors.gold, fontSize: 17, fontWeight: '600' },
    ghostBtnText: { color: colors.gold, textAlign: 'center', fontSize: 15, fontWeight: '600' },
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
