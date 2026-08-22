import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import CryptoJS from 'crypto-js';
import { sanitizeUsername } from '../auth';
import { deriveKey, decryptJSON } from '../encryption';
import { loadProfilesIndex, loadEncryptedProfileData } from '../storage';

type Props = {
  onSignedIn: (username: string, key: CryptoJS.lib.WordArray) => void;
  onGoToCreateProfile: () => void;
};

export default function SignInScreen({ onSignedIn, onGoToCreateProfile }: Props) {
  const [usernameInput, setUsernameInput] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    setError('');
    const username = sanitizeUsername(usernameInput);
    if (!username || !password) {
      setError('Enter your username and passphrase.');
      return;
    }
    setBusy(true);
    try {
      const profiles = await loadProfilesIndex();
      const profile = profiles.find((p) => p.username === username);
      if (!profile) {
        setError('No profile with that username.');
        setBusy(false);
        return;
      }
      const encrypted = await loadEncryptedProfileData(username);
      if (!encrypted) {
        setError('Could not find any saved data for that profile.');
        setBusy(false);
        return;
      }
      const key = deriveKey(password, profile.salt);
      try {
        decryptJSON(key, encrypted);
      } catch (e) {
        setError('Incorrect username or passphrase.');
        setBusy(false);
        return;
      }
      setBusy(false);
      onSignedIn(username, key);
    } catch (e) {
      setBusy(false);
      setError('Something went wrong signing in. Please try again.');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>SIGN IN</Text>
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.sub}>Enter your username and passphrase.</Text>

      <Text style={styles.label}>Username</Text>
      <TextInput
        style={styles.input}
        value={usernameInput}
        onChangeText={setUsernameInput}
        placeholder="e.g. miguel, ana"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={styles.label}>Passphrase</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry
        autoCapitalize="none"
      />

      {!!error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.primaryBtn} onPress={handleSignIn} disabled={busy}>
        <Text style={styles.primaryBtnText}>{busy ? 'Signing in…' : 'Sign in'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.ghostBtn} onPress={onGoToCreateProfile}>
        <Text style={styles.ghostBtnText}>Create a new profile</Text>
      </TouchableOpacity>
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
});
