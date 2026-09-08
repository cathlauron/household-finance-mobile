import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { verifyPin, hasPinSetUp } from '../pin';
import { getBiometricState, getBiometricLabel, attemptBiometricAuth, biometricErrorMessage, BiometricState } from '../biometrics';
import PinField from '../components/PinField';
import PasswordField from '../components/PasswordField';
import { loadProfilesIndex, ProfileIndexEntry, loadEncryptedProfileData } from '../storage';
import { deriveKey, decryptJSON } from '../encryption';
import { loadWrappedHouseholdKey, unwrapHouseholdKey } from '../household';

type Props = {
  username: string;
  onUnlocked: (newUsername?: string, newKey?: any) => void;
  onSignOut: () => void;
};

// Shared timestamp across mounts to prevent auto-prompt loops on rapid foregrounding
let lastBiometricAttemptTime = 0;

export default function PinUnlockScreen({ username, onUnlocked, onSignOut }: Props) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [biometricState, setBiometricState] = useState<BiometricState>('UNAVAILABLE');
  const [biometricLabel, setBiometricLabel] = useState('Biometric Unlock');
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [usePasswordMode, setUsePasswordMode] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [profiles, setProfiles] = useState<ProfileIndexEntry[]>([]);
  const [selectedUsername, setSelectedUsername] = useState(username);

  const inFlightRef = useRef(false);

  async function runBiometricAuth(isManual = false) {
    if (inFlightRef.current) return;
    if (!isManual && Date.now() - lastBiometricAttemptTime < 3000) return;

    inFlightRef.current = true;
    lastBiometricAttemptTime = Date.now();
    try {
      const result = await attemptBiometricAuth('Unlock Household Finance');
      if (result.success) {
        onUnlocked();
      } else {
        const msg = biometricErrorMessage(result.error, biometricLabel);
        if (msg) setError(msg);
      }
    } finally {
      inFlightRef.current = false;
    }
  }

  useEffect(() => {
    (async () => {
      const [state, label, pinConfigured] = await Promise.all([
        getBiometricState(username),
        getBiometricLabel(),
        hasPinSetUp(username),
      ]);
      setBiometricState(state);
      setBiometricLabel(label);
      setHasPin(pinConfigured);
      if (state === 'ENABLED') {
        runBiometricAuth(false);
      }
      const savedProfiles = await loadProfilesIndex();
      setProfiles(savedProfiles);
    })();
  }, [username]);

    async function handlePasswordUnlock() {
    setError('');
    if (!passwordInput) {
      setError('Enter your password.');
      return;
    }
    setBusy(true);
    try {
      const profile = profiles.find((p) => p.username === selectedUsername);
      if (!profile) throw new Error('Account not found on this device.');
      const key = deriveKey(passwordInput, profile.salt);
      if (profile.householdId) {
        const wrapped = await loadWrappedHouseholdKey(selectedUsername);
        if (!wrapped) throw new Error('Incorrect password.');
        unwrapHouseholdKey(wrapped.wrappedKey, key);
      } else {
        const encrypted = await loadEncryptedProfileData(selectedUsername);
        if (encrypted) {
          decryptJSON(key, encrypted);
        }
      }
      setBusy(false);
      onUnlocked(selectedUsername, key);
    } catch (e) {
      setBusy(false);
      setError('Incorrect password — try again.');
      setPasswordInput('');
    }
  }

  async function handleUnlock() {
    setError('');
    setBusy(true);
    const ok = await verifyPin(username, pin);
    setBusy(false);
    if (!ok) {
      setError('Incorrect PIN — try again.');
      setPin('');
      return;
    }
    onUnlocked();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>LOCKED</Text>
      <Text style={styles.title}>Welcome back, {selectedUsername}</Text>

      {usePasswordMode && profiles.length > 1 && (
        <View style={styles.accountChooserRow}>
          {profiles.map((p) => (
            <TouchableOpacity
              key={p.username}
              style={[styles.accountChip, p.username === selectedUsername && styles.accountChipActive]}
              onPress={() => { setSelectedUsername(p.username); setError(''); }}
            >
              <Text style={[styles.accountChipText, p.username === selectedUsername && styles.accountChipTextActive]}>
                {p.username}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {usePasswordMode && (
        <>
          <Text style={styles.sub}>Enter your account password to unlock.</Text>
          <Text style={styles.label}>PASSWORD</Text>
          <PasswordField
            testID="unlock-password-input"
            style={styles.input}
            value={passwordInput}
            onChangeText={setPasswordInput}
            placeholder="••••••••"
          />
          {!!error && <Text style={styles.error}>{error}</Text>}
          <TouchableOpacity
            style={[styles.primaryBtn, (busy || !passwordInput) && { opacity: 0.4 }]}
            onPress={handlePasswordUnlock}
            disabled={busy || !passwordInput}
          >
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryBtnText}>Unlock</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostBtn} onPress={() => { setUsePasswordMode(false); setError(''); }}>
            <Text style={styles.ghostBtnText}>Use Quick PIN / Biometrics instead</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.ghostBtn, { marginTop: 4 }]} onPress={onSignOut}>
            <Text style={[styles.ghostBtnText, { color: '#78716C' }]}>Sign in to a different account</Text>
          </TouchableOpacity>
        </>
      )}

      {!usePasswordMode && (
        <>
          <Text style={styles.sub}>
            {hasPin === false
              ? `Unlock with ${biometricLabel} or enter your password.`
              : 'Enter your PIN to keep going, right where you left off.'}
          </Text>

          {hasPin !== false && (
            <>
              <Text style={styles.label}>PIN</Text>
              <PinField
                testID="unlock-pin-input"
                style={styles.input}
                value={pin}
                onChangeText={setPin}
                centered
                autoFocus
              />
            </>
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}

          {hasPin !== false && (
            <TouchableOpacity
              testID="unlock-button"
              style={[styles.primaryBtn, (busy || pin.length < 4) && { opacity: 0.4 }]}
              onPress={handleUnlock}
              disabled={busy || pin.length < 4}
            >
              <Text style={styles.primaryBtnText}>Unlock</Text>
            </TouchableOpacity>
          )}

          {biometricState === 'ENABLED' && hasPin === false && (
            <TouchableOpacity testID="retry-biometrics-button" style={styles.primaryBtn} onPress={() => runBiometricAuth(true)}>
              <Text style={styles.primaryBtnText}>Unlock with {biometricLabel}</Text>
            </TouchableOpacity>
          )}

          {biometricState === 'ENABLED' && hasPin !== false && (
            <TouchableOpacity testID="retry-biometrics-button" style={[styles.retryBiometricBtn, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]} onPress={() => runBiometricAuth(true)}>
              <Ionicons name="refresh-outline" size={16} color="#1C1917" style={{ marginRight: 6 }} />
              <Text style={styles.retryBiometricText}>Try {biometricLabel} again</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.ghostBtn} onPress={() => { setUsePasswordMode(true); setError(''); }}>
            <Text style={styles.ghostBtnText}>Use password instead</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF9', padding: 24, paddingTop: 80 },
  eyebrow: { fontSize: 11, letterSpacing: 2, color: '#78716C', textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '600', textAlign: 'center', color: '#1C1917', marginBottom: 8 },
  sub: { fontSize: 14, color: '#57534E', textAlign: 'center', marginBottom: 28, lineHeight: 20 },
  label: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: '#57534E', marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E7E5E4',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1C1917', textAlign: 'center', letterSpacing: 6,
  },
  error: { color: '#E11D48', fontSize: 13, textAlign: 'center', marginTop: 16 },
  noPinHint: { color: '#78716C', fontSize: 12, textAlign: 'center', marginTop: 10, lineHeight: 16 },
  primaryBtn: { backgroundColor: '#1C1917', borderRadius: 8, paddingVertical: 14, marginTop: 24 },
  primaryBtnText: { color: '#FFFFFF', textAlign: 'center', fontWeight: '600', fontSize: 15 },
  retryBiometricBtn: { paddingVertical: 12, marginTop: 8, alignItems: 'center' },
  retryBiometricText: { color: '#1C1917', fontWeight: '600', fontSize: 14 },
  ghostBtn: { paddingVertical: 14, marginTop: 4 },
  ghostBtnText: { color: '#57534E', textAlign: 'center', fontSize: 13 },
    accountChooserRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  accountChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: '#2A2A2A' },
  accountChipActive: { backgroundColor: '#D4AF37' },
  accountChipText: { color: '#A8A29E', fontSize: 13 },
  accountChipTextActive: { color: '#1C1917', fontWeight: '700' },
});
