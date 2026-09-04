import React, { useState } from 'react';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { verifyPin } from '../pin';
import { verifyPin, hasPinSetUp } from '../pin';
import { getBiometricState, getBiometricLabel, attemptBiometricAuth, BiometricState } from '../biometrics';
import PinField from '../components/PinField';

type Props = {
  username: string;
  onUnlocked: () => void;
  onUsePasswordInstead: () => void;
};

// Shared timestamp across mounts to prevent auto-prompt loops on rapid foregrounding
let lastBiometricAttemptTime = 0;

export default function PinUnlockScreen({ username, onUnlocked, onUsePasswordInstead }: Props) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [biometricState, setBiometricState] = useState<BiometricState>('UNAVAILABLE');
  const [biometricLabel, setBiometricLabel] = useState('Biometric Unlock');
  const [hasPin, setHasPin] = useState<boolean | null>(null);

  const inFlightRef = useRef(false);

  async function runBiometricAuth(isManual = false) {
    if (inFlightRef.current) return;
    if (!isManual && Date.now() - lastBiometricAttemptTime < 3000) return;

    inFlightRef.current = true;
    lastBiometricAttemptTime = Date.now();
    try {
      const success = await attemptBiometricAuth('Unlock Household Finance');
      if (success) {
        onUnlocked();
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
    })();
  }, [username]);

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
      <Text style={styles.title}>Welcome back, {username}</Text>
      <Text style={styles.sub}>Enter your PIN to keep going, right where you left off.</Text>

      <Text style={styles.label}>PIN</Text>
      <PinField
        testID="unlock-pin-input"
        style={styles.input}
        value={pin}
        onChangeText={setPin}
        centered
        autoFocus
      />

      {!!error && <Text style={styles.error}>{error}</Text>}

      {hasPin === false && (
        <Text style={styles.noPinHint}>No PIN configured. Unlock with {biometricLabel} or use your password.</Text>
      )}

      <TouchableOpacity testID="unlock-button" style={styles.primaryBtn} onPress={handleUnlock} disabled={busy || pin.length < 4}>
        <Text style={styles.primaryBtnText}>Unlock</Text>
      </TouchableOpacity>

      {biometricState === 'ENABLED' && (
        <TouchableOpacity testID="retry-biometrics-button" style={styles.retryBiometricBtn} onPress={() => runBiometricAuth(true)}>
          <Text style={styles.retryBiometricText}>🔄 Try {biometricLabel} again</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.ghostBtn} onPress={onUsePasswordInstead}>
        <Text style={styles.ghostBtnText}>Use password instead</Text>
      </TouchableOpacity>
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
});
