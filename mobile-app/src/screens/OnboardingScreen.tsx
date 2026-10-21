import React, { useState, useEffect } from 'react';
import { paintBusy } from '../components/BusyOverlay';
import DrawingLogo, { BusyWords } from '../components/DrawingLogo';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TouchableOpacity } from '../components/Tap';
import { Text } from '../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { isValidPinFormat, savePin } from '../pin';
import { savePinCopy } from '../quickUnlock';
import { updateRecentAccountIfPresent } from '../recentAccounts';
import { getBiometricState, getBiometricLabel } from '../biometrics';
import { markOnboardingCompleted } from '../onboarding';
import PinField from '../components/PinField';
import GradientFill from '../components/GradientFill';
import OnboardSetup from '../components/OnboardSetup';
import { useLeafGustOnStep } from '../leafTransition';

type Props = {
  username: string;
  initialCredentials?: { email: string; password: string };
  onFinish: () => void;
};

// Brand lock colors matching IntroScreen.tsx
const LOCK_BODY_GREEN = '#3E7A5C';
const LOCK_SHACKLE_GREEN = '#2E5E45';

export default function OnboardingScreen({ username, onFinish, initialCredentials }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<2 | 3>(2);
  useLeafGustOnStep(step);

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

  // Skipping Quick Unlock moves on to the setup steps (it doesn't end onboarding).
  async function handleSkip() {
    setStep(3);
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
    await paintBusy();
    try {
      await savePin(username, pin1);
      updateRecentAccountIfPresent(username, { hasPin: true }).catch(() => {});
      if (initialCredentials) {
        await savePinCopy(
          { email: initialCredentials.email, username, password: initialCredentials.password },
          pin1
        );
      }
      setPinSaved(true);
      setBusy(false);
      setStep(3);
    } catch (e) {
      setBusy(false);
      setPinError('Failed to save PIN. Please try again.');
    }
  }

  async function handleFinish() {
    await markOnboardingCompleted(username);
    onFinish();
  }

  // Redesign: after Quick Unlock come the three setup steps from the mockups.
  if (step === 3) {
    return (
      <View style={styles.container}>
        <OnboardSetup onDone={handleFinish} topInset={insets.top} />
      </View>
    );
  }

  return (
    <>
    <View style={styles.container}>
      {/* Top Header Row with Progress and Skip */}
      <View style={[styles.headerRow, { paddingTop: 16 + insets.top }]}>
        <Text style={styles.stepBadge}>BEFORE WE START</Text>
        {step < 3 ? (
          <TouchableOpacity testID="onboarding-skip-button" onPress={handleSkip} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <KeyboardAwareScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {/* STEP 2: QUICK UNLOCK */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            {/* Version 2.1 (round 6, Q7): the logo above the title draws itself while saving. */}
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
              <DrawingLogo width={64} drawing={busy} wordmark={false} />
            </View>
            <Text style={styles.title}>Set up Quick Unlock</Text>
            {busy ? (
              <BusyWords messages={['Saving your PIN…', 'Setting up Quick unlock…', 'Almost there…']} style={{ marginBottom: 8 }} />
            ) : (
              <Text style={styles.sub}>
                Unlock quickly without entering your full password every time.
              </Text>
            )}
            <View style={{ opacity: busy ? 0.45 : 1 }} pointerEvents={busy ? 'none' : 'auto'}>

            {biometricsAvailable ? (
              <View style={styles.biometricActiveCard}>
                <GradientFill match={styles.biometricActiveCard} />
                <Ionicons name="scan-outline" size={24} color={colors.accent} style={{ marginRight: 12, marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.biometricActiveTitle}>{biometricLabel} Enabled</Text>
                  <Text style={styles.biometricActiveSub}>
                    Enabled automatically for this device. Turn off anytime in Settings.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.comingSoonBanner}>
                <GradientFill match={styles.comingSoonBanner} />
                <Ionicons name="information-circle-outline" size={20} color={colors.inkDim} style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.comingSoonSub}>Biometrics aren't available on this device. Set a PIN below for quick access.</Text>
                </View>
              </View>
            )}

            </View>
            <View style={styles.formSection}>
              <View style={{ opacity: busy ? 0.45 : 1 }} pointerEvents={busy ? 'none' : 'auto'}>
              <Text style={styles.inputLabel}>Quick PIN (4–6 digits)</Text>
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
              </View>

              {!!pinError && <Text style={styles.errorText}>{pinError}</Text>}

              <TouchableOpacity
                testID="onboarding-save-pin-button"
                style={styles.primaryBtn}
                onPress={handleSavePin}
                disabled={busy}
              >
                <GradientFill match={styles.primaryBtn} />
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
                <Text style={styles.ghostBtnText}>Skip for now (password only)</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </KeyboardAwareScrollView>
    </View>
    </>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
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
    primaryBtn: {
      width: '100%',
      backgroundColor: colors.buttonFill,
      borderRadius: 8,
      paddingVertical: 14,
      marginTop: 16,
    },
    primaryBtnText: {
      color: colors.onButton,
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
