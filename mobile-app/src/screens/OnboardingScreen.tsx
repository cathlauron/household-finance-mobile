import React, { useState } from 'react';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import { isValidPinFormat, savePin } from '../pin';
import { getBiometricState, getBiometricLabel } from '../biometrics';
import { markOnboardingCompleted } from '../onboarding';
import PinField from '../components/PinField';

type Props = {
  username: string;
  onFinish: () => void;
};

// Brand lock colors matching IntroScreen.tsx
const LOCK_BODY_GREEN = '#3E7A5C';
const LOCK_SHACKLE_GREEN = '#2E5E45';

export default function OnboardingScreen({ username, onFinish }: Props) {
  const { colors } = useTheme();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 2 PIN state
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSaved, setPinSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometric');

  useEffect(() => {
    (async () => {
      const [state, label] = await Promise.all([
        getBiometricState(username),
        getBiometricLabel(),
      ]);
      setBiometricsAvailable(state === 'ENABLED');
      setBiometricLabel(label);
    })();
  }, [username]);

  const styles = makeStyles(colors);

  async function handleSkip() {
    await markOnboardingCompleted(username);
    onFinish();
  }

  async function handleSavePin() {
    setPinError('');
    if (!isValidPinFormat(pin1)) {
      setPinError('PIN must be 4 to 6 digits.');
      return;
    }
    if (pin1 !== pin2) {
      setPinError("PINs don't match.");
      return;
    }
    setBusy(true);
    try {
      await savePin(username, pin1);
      setPinSaved(true);
      setBusy(false);
      setStep(3);
    } catch (e) {
      setBusy(false);
      setPinError('Something went wrong saving your PIN. Please try again.');
    }
  }

  async function handleFinish() {
    await markOnboardingCompleted(username);
    onFinish();
  }

  return (
    <View style={styles.container}>
      {/* Top Header Row with Progress and Skip */}
      <View style={styles.headerRow}>
        <Text style={styles.stepBadge}>STEP {step} OF 3</Text>
        {step < 3 ? (
          <TouchableOpacity testID="onboarding-skip-button" onPress={handleSkip} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* STEP 1: WELCOME */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <View style={styles.logoFrame}>
              <View style={styles.lockWrap}>
                <View style={styles.shackle} />
                <View style={styles.lockBody}>
                  <Text style={styles.currencySymbol}>$</Text>
                </View>
              </View>
            </View>

            <Text style={styles.title}>Welcome to Household Finance, {username}</Text>
            <Text style={styles.sub}>Your private, encrypted hub for household finances.</Text>

            <View style={styles.featureCards}>
              <View style={styles.featureCard}>
                <View style={styles.featureIconWrap}>
                  <Ionicons name="shield-checkmark-outline" size={24} color={colors.accent} />
                </View>
                <View style={styles.featureTextWrap}>
                  <Text style={styles.featureTitle}>End-to-End Encrypted</Text>
                  <Text style={styles.featureDesc}>
                    Your financial data is genuinely encrypted locally on your device with your password — only you hold the keys.
                  </Text>
                </View>
              </View>

              <View style={styles.featureCard}>
                <View style={styles.featureIconWrap}>
                  <Ionicons name="people-outline" size={24} color={colors.accent} />
                </View>
                <View style={styles.featureTextWrap}>
                  <Text style={styles.featureTitle}>Private Solo or Shared</Text>
                  <Text style={styles.featureDesc}>
                    Track your personal expenses completely solo, or securely link with a partner or family member in Settings anytime.
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              testID="onboarding-get-started-button"
              style={styles.primaryBtn}
              onPress={() => setStep(2)}
            >
              <Text style={styles.primaryBtnText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: QUICK UNLOCK */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Set up Quick Unlock</Text>
            <Text style={styles.sub}>
              Protect your app with a fast, everyday unlock method so you don't have to enter your full password every time.
            </Text>

            {/* Informational Coming Soon Badge for Biometrics */}
            <View style={styles.comingSoonBanner}>
              <Ionicons name="sparkles-outline" size={20} color={colors.gold} style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.comingSoonTitle}>Face ID & Fingerprint Unlock</Text>
                <Text style={styles.comingSoonSub}>Coming in a future update — set a Quick PIN below for fast access today.</Text>
            {biometricsAvailable ? (
              <View style={styles.biometricActiveCard}>
                <Ionicons name="scan-outline" size={24} color={colors.accent} style={{ marginRight: 12, marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.biometricActiveTitle}>{biometricLabel} Enabled</Text>
                  <Text style={styles.biometricActiveSub}>
                    {biometricLabel} unlock is enabled automatically on this device. You can turn this off anytime in Settings.
                  </Text>
                </View>
              </View>
            </View>
            ) : (
              <View style={styles.comingSoonBanner}>
                <Ionicons name="information-circle-outline" size={20} color={colors.inkDim} style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.comingSoonSub}>Biometric unlock isn't available on this device. Set a PIN below for quick access.</Text>
                </View>
              </View>
            )}

            <View style={styles.formSection}>
              <Text style={styles.inputLabel}>Choose a 4–6 digit Quick PIN</Text>
              <PinField
                testID="onboarding-pin-input"
                style={styles.input}
                value={pin1}
                onChangeText={setPin1}
              />

              <Text style={styles.inputLabel}>Confirm Quick PIN</Text>
              <PinField
                testID="onboarding-confirm-pin-input"
                style={styles.input}
                value={pin2}
                onChangeText={setPin2}
              />

              {!!pinError && <Text style={styles.errorText}>{pinError}</Text>}

              <TouchableOpacity
                testID="onboarding-save-pin-button"
                style={styles.primaryBtn}
                onPress={handleSavePin}
                disabled={busy}
              >
                <Text style={styles.primaryBtnText}>{busy ? 'Saving PIN…' : 'Save PIN & Continue'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                testID="onboarding-skip-pin-button"
                style={styles.ghostBtn}
                onPress={() => {
                  setPinSaved(false);
                  setStep(3);
                }}
              >
                <Text style={styles.ghostBtnText}>Skip for now (use password only)</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 3: READY */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <View style={styles.readyIconFrame}>
              <Ionicons name="checkmark-circle-outline" size={64} color={colors.accent} />
            </View>

            <Text style={styles.title}>You're all set!</Text>
            <Text style={styles.sub}>Your profile is ready to go.</Text>

            {pinSaved && (
              <View style={styles.pinConfirmedBadge}>
                <Ionicons name="lock-closed" size={16} color={colors.accent} style={{ marginRight: 6 }} />
                <Text style={styles.pinConfirmedText}>Quick PIN enabled</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
              {biometricsAvailable && (
                <View style={styles.pinConfirmedBadge}>
                  <Ionicons name="scan-outline" size={16} color={colors.accent} style={{ marginRight: 6 }} />
                  <Text style={styles.pinConfirmedText}>{biometricLabel} enabled automatically</Text>
                </View>
              )}
              {pinSaved && (
                <View style={styles.pinConfirmedBadge}>
                  <Ionicons name="lock-closed" size={16} color={colors.accent} style={{ marginRight: 6 }} />
                  <Text style={styles.pinConfirmedText}>Quick PIN enabled</Text>
                </View>
              )}
            </View>

            <View style={styles.tipCard}>
              <Ionicons name="information-circle-outline" size={20} color={colors.gold} style={{ marginRight: 10 }} />
              <Text style={styles.tipText}>
                Tip: Start by setting up your primary balance accounts, logging recurring bills, or exploring Settings to customize your preferences.
              </Text>
            </View>

            <TouchableOpacity
              testID="onboarding-finish-button"
              style={styles.primaryBtn}
              onPress={handleFinish}
            >
              <Text style={styles.primaryBtnText}>Go to Dashboard</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.navy2,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 8,
    },
    stepBadge: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 2,
      color: colors.gold,
      textTransform: 'uppercase',
    },
    skipText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.inkDim,
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 40,
    },
    stepContainer: {
      alignItems: 'center',
    },
    logoFrame: {
      width: 76,
      height: 76,
      borderRadius: 20,
      borderWidth: 1,
      backgroundColor: colors.navy3,
      borderColor: colors.navy4,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    lockWrap: {
      alignItems: 'center',
    },
    shackle: {
      width: 22,
      height: 15,
      borderTopLeftRadius: 11,
      borderTopRightRadius: 11,
      borderWidth: 3.5,
      borderBottomWidth: 0,
      borderColor: LOCK_SHACKLE_GREEN,
      marginBottom: -2,
    },
    lockBody: {
      width: 36,
      height: 28,
      borderRadius: 6,
      backgroundColor: LOCK_BODY_GREEN,
      alignItems: 'center',
      justifyContent: 'center',
    },
    currencySymbol: {
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.ink,
      textAlign: 'center',
      marginBottom: 8,
    },
    sub: {
      fontSize: 14,
      color: colors.inkDim,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 24,
    },
    featureCards: {
      width: '100%',
      gap: 12,
      marginBottom: 32,
    },
    featureCard: {
      flexDirection: 'row',
      backgroundColor: colors.navy3,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.navy4,
      padding: 16,
      alignItems: 'flex-start',
    },
    featureIconWrap: {
      marginRight: 14,
      marginTop: 2,
    },
    featureTextWrap: {
      flex: 1,
    },
    featureTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.ink,
      marginBottom: 4,
    },
    featureDesc: {
      fontSize: 13,
      color: colors.inkDim,
      lineHeight: 18,
    },
    biometricActiveCard: {
      width: '100%',
      flexDirection: 'row',
      backgroundColor: colors.navy3,
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: 12,
      padding: 16,
      alignItems: 'flex-start',
      marginBottom: 24,
    },
    biometricActiveTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.ink,
      marginBottom: 4,
    },
    biometricActiveSub: {
      fontSize: 13,
      color: colors.inkDim,
      lineHeight: 18,
    },
    comingSoonBanner: {
      width: '100%',
      flexDirection: 'row',
      backgroundColor: colors.navy3,
      borderWidth: 1,
      borderColor: colors.navy4,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
      marginBottom: 24,
    },
    comingSoonTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.ink,
      marginBottom: 2,
    },
    comingSoonSub: {
      fontSize: 12,
      color: colors.inkDim,
      lineHeight: 16,
    },
    formSection: {
      width: '100%',
    },
    inputLabel: {
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: colors.inkDim,
      marginBottom: 6,
      marginTop: 10,
    },
    input: {
      backgroundColor: colors.navy3,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.navy4,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.ink,
    },
    errorText: {
      color: colors.error,
      fontSize: 13,
      textAlign: 'center',
      marginTop: 14,
    },
    readyIconFrame: {
      marginTop: 20,
      marginBottom: 16,
    },
    pinConfirmedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.navy3,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.navy4,
      marginBottom: 20,
    },
    pinConfirmedText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.accent,
    },
    tipCard: {
      width: '100%',
      flexDirection: 'row',
      backgroundColor: colors.navy3,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.navy4,
      padding: 16,
      marginBottom: 32,
      alignItems: 'flex-start',
    },
    tipText: {
      flex: 1,
      fontSize: 13,
      color: colors.inkDim,
      lineHeight: 19,
    },
    primaryBtn: {
      width: '100%',
      backgroundColor: colors.gold,
      borderRadius: 8,
      paddingVertical: 14,
      marginTop: 16,
    },
    primaryBtnText: {
      color: '#FFFFFF',
      textAlign: 'center',
      fontWeight: '600',
      fontSize: 15,
    },
    ghostBtn: {
      width: '100%',
      paddingVertical: 14,
      marginTop: 6,
    },
    ghostBtnText: {
      color: colors.inkDim,
      textAlign: 'center',
      fontSize: 13,
    },
  });
}
