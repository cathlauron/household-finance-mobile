import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Pressable, Alert, ScrollView, Image, Platform, KeyboardAvoidingView } from 'react-native';
import { useTheme } from '../ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import CryptoJS from 'crypto-js';
import { sanitizeUsername } from '../auth';
import { generateSalt, deriveKey, encryptJSON } from '../encryption';
import { loadProfilesIndex, saveProfilesIndex, saveEncryptedProfileData } from '../storage';
import { defaultModel } from '../defaultModel';
import { createFirebaseAccount } from '../authFirebase';
import { saveProfileCloudBackup } from '../cloudBackup';
import { generateRecoveryCode, saveRecoveryKey } from '../recovery';
import PasswordField from '../components/PasswordField';

type Props = {
  onProfileCreated: (username: string, key: CryptoJS.lib.WordArray) => void;
  onGoToSignIn: () => void;
};

export default function CreateProfileScreen({ onProfileCreated, onGoToSignIn }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [usernameInput, setUsernameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [password1, setPassword1] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [createdInfo, setCreatedInfo] = useState<{ username: string; key: CryptoJS.lib.WordArray } | null>(null);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [savedAcknowledged, setSavedAcknowledged] = useState(false);
  const [copied, setCopied] = useState(false);

  // Turns a raw Firebase error into a plain-English message. Firebase errors
  // come with a `code` like "auth/email-already-in-use" - we check for the
  // common ones and fall back to a generic message for anything else.
  function friendlyFirebaseError(e: any): string {
    const code = e?.code || '';
    if (code === 'auth/email-already-in-use') {
      return 'Email is already registered. Sign in instead or use another email.';
    }
    if (code === 'auth/invalid-email') {
      return 'Enter a valid email address.';
    }
    if (code === 'auth/weak-password') {
      return 'Password must be at least 6 characters.';
    }
    return 'Could not create account. Check your connection and try again.';
  }

  async function handleCreate() {
    setError('');
    const username = sanitizeUsername(usernameInput);
    const email = emailInput.trim();
    if (!username) {
      setError('Choose a username.');
      return;
    }
    if (!email || !email.includes('@')) {
      setError('Enter a valid email.');
      return;
    }
    if (password1.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password1 !== password2) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const profiles = await loadProfilesIndex();
      if (profiles.some((p) => p.username === username)) {
        setError('Username is taken. Choose another or sign in.');
        setBusy(false);
        return;
      }

      // Create the real Firebase account FIRST. If this fails (e.g. the
      // email is already registered), nothing local has been created yet,
      // so there's nothing to undo.
      try {
        await createFirebaseAccount(email, password1);
      } catch (firebaseError: any) {
        setBusy(false);
        setError(friendlyFirebaseError(firebaseError));
        return;
      }

      // Only once the Firebase account exists do we create the local,
      // password-encrypted profile - exactly as before Phase A.
      const salt = await generateSalt();
      const key = deriveKey(password1, salt);
      const encrypted = await encryptJSON(key, defaultModel());
      profiles.push({ username, salt });
      await saveProfilesIndex(profiles);
      await saveEncryptedProfileData(username, encrypted);
      await saveProfileCloudBackup(username, { salt, data: encrypted });

      // Generate and upload the Secret Recovery Key for this account
      const code = await generateRecoveryCode();
      try {
        await saveRecoveryKey(username, key, false, code);
      } catch (recovErr) {
        // Profile & auth succeeded; only the recovery key cloud save failed
        setCreatedInfo({ username, key });
        setRecoveryCode(code);
        setBusy(false);
        Alert.alert(
          'Recovery Key Setup Incomplete',
          'Profile created, but your Secret Recovery Key could not be saved to the cloud. You can retry now or generate one later in Settings > Security.',
          [
            {
              text: 'Retry',
              onPress: async () => {
                setBusy(true);
                try {
                  await saveRecoveryKey(username, key, false, code);
                  Alert.alert('Saved', 'Secret Recovery Key saved.');
                } catch {
                  Alert.alert('Still Offline', 'Could not save to the cloud. You can generate a key later in Settings > Security.');
                } finally {
                  setBusy(false);
                }
              },
            },
            { text: 'Continue', style: 'cancel' },
          ]
        );
        return;
      }

      setCreatedInfo({ username, key });
      setRecoveryCode(code);
      setBusy(false);
    } catch (e) {
      setBusy(false);
      setError('Could not save profile. Please try again.');
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandWrap}>
          <Image source={require('../../assets/logo.png')} style={styles.brandLogo} resizeMode="contain" />
          <Text style={styles.brandName}>FINANCE FLOW</Text>
        </View>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.sub}>Start your financial journey.</Text>

        <Text style={styles.label}>Email address</Text>
        <View style={styles.fieldWrap}>
          <View style={styles.leftIcon} pointerEvents="none">
            <Ionicons name="mail-outline" size={18} color={colors.inkFaint} />
          </View>
          <TextInput
            testID="email-input"
            style={styles.input}
            value={emailInput}
            onChangeText={setEmailInput}
            placeholder="you@example.com"
            placeholderTextColor={colors.inkFaint}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
        </View>

        <Text style={styles.label}>Username</Text>
        <View style={styles.fieldWrap}>
          <View style={styles.leftIcon} pointerEvents="none">
            <Ionicons name="person-outline" size={18} color={colors.inkFaint} />
          </View>
          <TextInput
            testID="username-input"
            style={styles.input}
            value={usernameInput}
            onChangeText={setUsernameInput}
            placeholder="e.g. miguel, ana"
            placeholderTextColor={colors.inkFaint}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <Text style={styles.label}>Password</Text>
        <View style={styles.fieldWrap}>
          <View style={styles.leftIcon} pointerEvents="none">
            <Ionicons name="lock-closed-outline" size={18} color={colors.inkFaint} />
          </View>
          <PasswordField
            testID="password-input"
            style={styles.input}
            value={password1}
            onChangeText={setPassword1}
            placeholder="At least 6 characters"
          />
        </View>

        <Text style={styles.label}>Confirm password</Text>
        <View style={styles.fieldWrap}>
          <View style={styles.leftIcon} pointerEvents="none">
            <Ionicons name="lock-closed-outline" size={18} color={colors.inkFaint} />
          </View>
          <PasswordField
            testID="confirm-password-input"
            style={styles.input}
            value={password2}
            onChangeText={setPassword2}
            placeholder="Re-enter password"
          />
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity testID="create-profile-button" style={styles.primaryBtn} onPress={handleCreate} disabled={busy}>
          <Text style={styles.primaryBtnText}>{busy ? 'Creating...' : 'Create profile'}</Text>
          {!busy && <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />}
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkBtn} onPress={onGoToSignIn}>
          <Text style={styles.linkText}>Already have an account? Sign in</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          Your data is encrypted with this password. You will receive a Secret Recovery Key
          next to protect against forgotten passwords.
        </Text>

        <Modal visible={!!recoveryCode} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.eyebrow}>CRITICAL SECURITY STEP</Text>
              <Text style={styles.modalTitle}>Secret Recovery Key</Text>
              <Text style={styles.modalSub}>
                Save this key in a safe place. If you forget or reset your password, this is the
                only way to restore your data.
              </Text>

              <View style={styles.codeBox}>
                <Text selectable style={styles.codeText}>
                  {recoveryCode}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.copyButton, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
                onPress={async () => {
                  if (!recoveryCode) return;
                  await Clipboard.setStringAsync(recoveryCode);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                <Ionicons
                  name={copied ? 'checkmark' : 'copy-outline'}
                  size={16}
                  color={colors.gold}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.copyButtonText}>{copied ? 'Copied!' : 'Copy Key'}</Text>
              </TouchableOpacity>

              <Pressable
                style={styles.checkRow}
                onPress={() => setSavedAcknowledged((prev) => !prev)}
              >
                <View style={[styles.checkbox, savedAcknowledged && styles.checkboxActive]}>
                  {savedAcknowledged && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </View>
                <Text style={styles.checkLabel}>
                  I have written down or saved this recovery key in a safe place.
                </Text>
              </Pressable>

              <TouchableOpacity
                style={[styles.primaryBtn, !savedAcknowledged && styles.btnDisabled]}
                disabled={!savedAcknowledged}
                onPress={() => {
                  if (createdInfo) {
                    onProfileCreated(createdInfo.username, createdInfo.key);
                  }
                }}
              >
                <Text style={styles.primaryBtnText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.navy2 },
    scrollContent: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 40 },
    brandWrap: { alignItems: 'center', marginBottom: 16 },
    brandLogo: { width: 56, height: 56 },
    brandName: { marginTop: 8, fontSize: 12, letterSpacing: 4, color: colors.inkDim },
    eyebrow: { fontSize: 11, letterSpacing: 2, color: colors.inkDim, textAlign: 'center', marginBottom: 8 },
    title: {
      fontSize: 30, color: colors.ink, marginBottom: 6, textAlign: 'center',
      fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }),
    },
    sub: { fontSize: 14, color: colors.inkDim, textAlign: 'center', marginBottom: 12, lineHeight: 20 },
    label: { fontSize: 12, fontWeight: '600', color: colors.ink, marginBottom: 6, marginTop: 14 },
    fieldWrap: { position: 'relative', justifyContent: 'center' },
    leftIcon: { position: 'absolute', left: 14, top: 0, bottom: 0, justifyContent: 'center', zIndex: 1 },
    input: {
      backgroundColor: colors.navy3, borderRadius: 12, borderWidth: 1, borderColor: colors.navy4,
      paddingLeft: 42, paddingRight: 14, paddingVertical: 13, fontSize: 15, color: colors.ink,
    },
    error: { color: colors.error, fontSize: 13, textAlign: 'center', marginTop: 14 },
    primaryBtn: {
      backgroundColor: colors.gold, borderRadius: 999, height: 52, marginTop: 20,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    },
    primaryBtnText: { color: '#FFFFFF', textAlign: 'center', fontWeight: '600', fontSize: 15 },
    btnDisabled: { opacity: 0.4 },
    linkBtn: { paddingVertical: 14, marginTop: 10 },
    linkText: { color: colors.gold, textAlign: 'center', fontSize: 14, fontWeight: '600' },
    hint: { fontSize: 11, color: colors.inkDim, textAlign: 'center', marginTop: 16, lineHeight: 16 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(16,43,33,0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalCard: {
      backgroundColor: colors.navy3, borderRadius: 20, padding: 24, width: '100%', maxWidth: 420,
      borderWidth: 1, borderColor: colors.navy4,
    },
    modalTitle: {
      fontSize: 24, textAlign: 'center', color: colors.ink, marginBottom: 8,
      fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }),
    },
    modalSub: { fontSize: 13, color: colors.inkDim, textAlign: 'center', lineHeight: 18, marginBottom: 20 },
    codeBox: {
      backgroundColor: colors.navy2, borderWidth: 1, borderColor: colors.navy4, borderRadius: 12,
      paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center',
      marginBottom: 16,
    },
    codeText: { fontSize: 17, fontWeight: '700', letterSpacing: 2, color: colors.ink, fontFamily: 'monospace' },
    copyButton: {
      backgroundColor: colors.navy2, borderWidth: 1, borderColor: colors.gold, borderRadius: 999,
      paddingVertical: 12, alignItems: 'center', marginBottom: 16,
    },
    copyButtonText: { color: colors.gold, fontWeight: '600', fontSize: 14 },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    checkbox: {
      width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.inkDim,
      alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navy3,
    },
    checkboxActive: { backgroundColor: colors.gold, borderColor: colors.gold },
    checkLabel: { flex: 1, fontSize: 13, color: colors.ink, lineHeight: 18 },
  });
}
