import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import CryptoJS from 'crypto-js';
import { sanitizeUsername } from '../auth';
import { generateSalt, deriveKey, encryptJSON } from '../encryption';
import { loadProfilesIndex, saveProfilesIndex, saveEncryptedProfileData } from '../storage';
import { defaultModel } from '../defaultModel';
import { createFirebaseAccount } from '../authFirebase';
import PasswordField from '../components/PasswordField';

type Props = {
  onProfileCreated: (username: string, key: CryptoJS.lib.WordArray) => void;
  onGoToSignIn: () => void;
};

export default function CreateProfileScreen({ onProfileCreated, onGoToSignIn }: Props) {
  const [usernameInput, setUsernameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [password1, setPassword1] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Turns a raw Firebase error into a plain-English message. Firebase errors
  // come with a `code` like "auth/email-already-in-use" — we check for the
  // common ones and fall back to a generic message for anything else.
  function friendlyFirebaseError(e: any): string {
    const code = e?.code || '';
    if (code === 'auth/email-already-in-use') {
      return 'That email is already registered — try signing in instead, or use a different email.';
    }
    if (code === 'auth/invalid-email') {
      return "That doesn't look like a valid email address.";
    }
    if (code === 'auth/weak-password') {
      return 'Firebase requires at least 6 characters for the account password.';
    }
    return 'Something went wrong creating your account. Check your internet connection and try again.';
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
      setError('Enter a valid email address.');
      return;
    }
    if (password1.length < 6) {
      setError('Use at least 6 characters for your password.');
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
        setError('That username is taken — choose another, or sign in instead.');
        setBusy(false);
        return;
      }

      // Create the real Firebase account FIRST. If this fails (e.g. the
      // email is already registered), nothing local has been created yet,
      // so there's nothing to undo.
      try {
        await createFirebaseAccount(email, password1);
      } catch (firebaseError) {
        setBusy(false);
        setError(friendlyFirebaseError(firebaseError));
        return;
      }

      // Only once the Firebase account exists do we create the local,
      // password-encrypted profile — exactly as before Phase A.
      const salt = await generateSalt();
      const key = deriveKey(password1, salt);
      const encrypted = await encryptJSON(key, defaultModel());
      profiles.push({ username, salt });
      await saveProfilesIndex(profiles);
      await saveEncryptedProfileData(username, encrypted);
      setBusy(false);
      onProfileCreated(username, key);
    } catch (e) {
      setBusy(false);
      setError('Something went wrong saving your profile. Please try again.');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>FIRST-TIME SETUP</Text>
      <Text style={styles.title}>Create your profile</Text>
      <Text style={styles.sub}>
        Choose a username and a password, and enter your email — you'll use your username and
        password to sign in every time.
      </Text>

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={emailInput}
        onChangeText={setEmailInput}
        placeholder="you@example.com"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
      />

      <Text style={styles.label}>Username</Text>
      <TextInput
        style={styles.input}
        value={usernameInput}
        onChangeText={setUsernameInput}
        placeholder="e.g. miguel, ana"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={styles.label}>Password</Text>
      <PasswordField
        style={styles.input}
        value={password1}
        onChangeText={setPassword1}
        placeholder="At least 6 characters"
      />
      <Text style={styles.label}>Confirm password</Text>
      <PasswordField
        style={styles.input}
        value={password2}
        onChangeText={setPassword2}
        placeholder="Type it again"
      />

      {!!error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.primaryBtn} onPress={handleCreate} disabled={busy}>
        <Text style={styles.primaryBtnText}>{busy ? 'Creating…' : 'Create profile'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.ghostBtn} onPress={onGoToSignIn}>
        <Text style={styles.ghostBtnText}>Already have a profile? Sign in</Text>
      </TouchableOpacity>

      <Text style={styles.hint}>
        There's no "forgot password" recovery — your data is genuinely encrypted with this
        password, not just hidden. Remember it, like you would a password manager entry.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF9', padding: 24, paddingTop: 80 },
  eyebrow: { fontSize: 11, letterSpacing: 2, color: '#78716C', textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '600', textAlign: 'center', color: '#1C1917', marginBottom: 8 },
  sub: { fontSize: 14, color: '#57534E', textAlign: 'center', marginBottom: 28, lineHeight: 20 },
  label: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: '#57534E', marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E7E5E4',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1C1917',
  },
  error: { color: '#E11D48', fontSize: 13, textAlign: 'center', marginTop: 16 },
  primaryBtn: { backgroundColor: '#1C1917', borderRadius: 8, paddingVertical: 14, marginTop: 24 },
  primaryBtnText: { color: '#FFFFFF', textAlign: 'center', fontWeight: '600', fontSize: 15 },
  ghostBtn: { paddingVertical: 14, marginTop: 4 },
  ghostBtnText: { color: '#57534E', textAlign: 'center', fontSize: 13 },
  hint: { fontSize: 11, color: '#A8A29E', textAlign: 'center', marginTop: 24, lineHeight: 16 },
});
