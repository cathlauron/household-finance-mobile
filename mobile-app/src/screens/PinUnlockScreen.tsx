import React, { useState, useEffect, useRef } from 'react';
import BusyOverlay from '../components/BusyOverlay';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from '../components/AppText';
import GradientFill from '../components/GradientFill';
import LogoMark from '../components/LogoMark';
import { Ionicons } from '@expo/vector-icons';
import { verifyPin, hasPinSetUp } from '../pin';
import { getBiometricState, getBiometricLabel, attemptBiometricAuth, biometricErrorMessage, BiometricState } from '../biometrics';
import PinField from '../components/PinField';
import PasswordField from '../components/PasswordField';
import { loadProfilesIndex, ProfileIndexEntry, loadEncryptedProfileData } from '../storage';
import { deriveKey, decryptJSON } from '../encryption';
import { loadWrappedHouseholdKey, unwrapHouseholdKey } from '../household';
import { registerPinFailure, resetPinFailures } from '../quickUnlock';
import { useTheme } from '../ThemeContext';

type Props = {
  username: string;
  onUnlocked: (newUsername?: string, newKey?: any) => void;
  onSignOut: () => void;
};

// Shared timestamp across mounts to prevent auto-prompt loops on rapid foregrounding
let lastBiometricAttemptTime = 0;

export default function PinUnlockScreen({ username, onUnlocked, onSignOut }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
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
  const [isLockedOut, setIsLockedOut] = useState(false);

  const inFlightRef = useRef(false);

  const [unlockedTick, setUnlockedTick] = useState(false);

  async function runBiometricAuth(isManual = false) {
    if (inFlightRef.current) return;
    if (isLockedOut) return;
    if (!isManual && Date.now() - lastBiometricAttemptTime < 3000) return;

    inFlightRef.current = true;
    lastBiometricAttemptTime = Date.now();
    try {
      const result = await attemptBiometricAuth('Unlock Finance Flow');
      if (result.success) {
        await resetPinFailures(username);
        // Redesign: a quick tick to show it worked, then straight into the app.
        setUnlockedTick(true);
        setTimeout(onUnlocked, 450);
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
      await resetPinFailures(selectedUsername);
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
    if (ok) {
      await resetPinFailures(username);
      setBusy(false);
      onUnlocked();
      return;
    }
    const { wiped, attemptsLeft } = await registerPinFailure(username);
    setBusy(false);
    setPin('');
    if (wiped) {
      setIsLockedOut(true);
      setUsePasswordMode(true);
      setError('Too many incorrect PINs. Enter your account password to unlock.');
      return;
    }
    setError(`Incorrect PIN — ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} left.`);
  }

  return (
    <>
    <KeyboardAwareScrollView style={{ flex: 1 }} contentContainerStyle={[styles.container, { flex: undefined, flexGrow: 1 }]}>
      <View style={{ alignItems: 'center', marginBottom: 28 }}>
        <LogoMark width={72} />
      </View>
      <Text style={styles.title}>Welcome back, {selectedUsername}</Text>
      {unlockedTick && (
        <View style={{ alignItems: 'center', marginVertical: 24 }} accessibilityLiveRegion="polite" accessibilityLabel="Unlocked">
          <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="checkmark" size={48} color={colors.gold} />
          </View>
          <Text style={[styles.sub, { marginTop: 12 }]}>Unlocked</Text>
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
            <GradientFill color={colors.buttonFill} strength={0.18} />
            {busy ? <ActivityIndicator color={colors.navy2} /> : <Text style={styles.primaryBtnText}>Unlock</Text>}
          </TouchableOpacity>
          {!isLockedOut && (
            <TouchableOpacity style={styles.ghostBtn} onPress={() => { setUsePasswordMode(false); setError(''); }}>
              <Text style={styles.ghostBtnText}>Use PIN or biometrics</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.ghostBtn, { marginTop: 4 }]} onPress={onSignOut}>
            <Text style={styles.ghostBtnText}>Sign in to another account</Text>
          </TouchableOpacity>
        </>
      )}

      {!usePasswordMode && (
        <>
          <Text style={styles.sub}>
            {hasPin === false
              ? `Unlock with ${biometricLabel} or enter password.`
              : 'Enter your PIN to unlock.'}
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
              <GradientFill color={colors.buttonFill} strength={0.18} />
              <Text style={styles.primaryBtnText}>Unlock</Text>
            </TouchableOpacity>
          )}

          {biometricState === 'ENABLED' && hasPin === false && (
            <TouchableOpacity testID="retry-biometrics-button" style={styles.primaryBtn} onPress={() => runBiometricAuth(true)}>
              <GradientFill color={colors.buttonFill} strength={0.18} />
              <Text style={styles.primaryBtnText}>Unlock with {biometricLabel}</Text>
            </TouchableOpacity>
          )}

          {biometricState === 'ENABLED' && hasPin !== false && (
            <TouchableOpacity testID="retry-biometrics-button" style={[styles.retryBiometricBtn, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]} onPress={() => runBiometricAuth(true)}>
              <Ionicons name="refresh-outline" size={16} color={colors.ink} style={{ marginRight: 6 }} />
              <Text style={styles.retryBiometricText}>Try {biometricLabel} again</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.ghostBtn} onPress={() => { setUsePasswordMode(true); setError(''); }}>
            <Text style={styles.ghostBtnText}>Use password instead</Text>
          </TouchableOpacity>
        </>
      )}
    </KeyboardAwareScrollView>
      <BusyOverlay visible={!!(busy)} messages={['Unlocking…', 'Opening your data…', 'Almost there…']} />
    </>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent', padding: 24, paddingTop: 64 },
    title: { fontSize: 26, fontWeight: '700', textAlign: 'center', color: colors.ink, marginBottom: 8 },
    sub: { fontSize: 15, color: colors.inkDim, textAlign: 'center', marginBottom: 28, lineHeight: 20 },
    label: { fontSize: 13, fontWeight: '600', color: colors.inkDim, marginBottom: 6, marginTop: 14, marginLeft: 4 },
    input: {
      backgroundColor: colors.navy3, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.navy4,
      paddingHorizontal: 14, paddingVertical: 12, minHeight: 50, fontSize: 20, color: colors.ink, textAlign: 'center', letterSpacing: 6,
    },
    error: { color: colors.error, fontSize: 13, textAlign: 'center', marginTop: 16 },
    primaryBtn: { overflow: 'hidden', backgroundColor: colors.buttonFill, borderRadius: 14, height: 52, justifyContent: 'center', marginTop: 24 },
    primaryBtnText: { color: colors.onButton, textAlign: 'center', fontWeight: '600', fontSize: 17 },
    retryBiometricBtn: { paddingVertical: 12, marginTop: 8, alignItems: 'center' },
    retryBiometricText: { color: colors.gold, fontWeight: '600', fontSize: 15 },
    ghostBtn: { paddingVertical: 14, marginTop: 4 },
    ghostBtnText: { color: colors.gold, textAlign: 'center', fontSize: 15 },
  });
}
