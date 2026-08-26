import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import CryptoJS from 'crypto-js';
import { sanitizeUsername } from '../auth';
import { deriveKey, decryptJSON } from '../encryption';
import { loadProfilesIndex, loadEncryptedProfileData } from '../storage';
import { signInWithFirebase, createFirebaseAccount } from '../authFirebase';

type Props = {
  onSignedIn: (username: string, key: CryptoJS.lib.WordArray) => void;
  onGoToCreateProfile: () => void;
};

export default function SignInScreen({ onSignedIn, onGoToCreateProfile }: Props) {
  const [usernameInput, setUsernameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // Checkpoint A.5 — true only while we're quietly creating a missing
  // Firebase account for a profile that predates Firebase Auth. Just
  // changes the button's wording so it doesn't look like a plain sign-in.
  const [isMigrating, setIsMigrating] = useState(false);

  // The passphrase → encryption key step (deriveKey, below) is intentionally slow on
  // purpose — it's what makes the passphrase hard to brute-force — and on a phone it can
  // take anywhere from a few seconds to over a minute depending on the device. This just
  // shows a reassuring "this is normal" message once it's been running a couple seconds,
  // so it doesn't look frozen.
  const [showSlowHint, setShowSlowHint] = useState(false);

  useEffect(() => {
    if (!busy) {
      setShowSlowHint(false);
      return;
    }
    const timer = setTimeout(() => setShowSlowHint(true), 2000);
    return () => clearTimeout(timer);
  }, [busy]);

  // Turns a raw Firebase sign-in error into a plain-English message.
  function friendlyFirebaseSignInError(e: any): string {
    const code = e?.code || '';
    if (
      code === 'auth/invalid-credential' ||
      code === 'auth/wrong-password' ||
      code === 'auth/user-not-found'
    ) {
      return 'Incorrect email or passphrase.';
    }
    if (code === 'auth/invalid-email') {
      return "That doesn't look like a valid email address.";
    }
    if (code === 'auth/too-many-requests') {
      return 'Too many attempts — please wait a bit and try again.';
    }
    return 'Something went wrong signing in. Check your internet connection and try again.';
  }

  async function handleSignIn() {
    setError('');
    const username = sanitizeUsername(usernameInput);
    const email = emailInput.trim();
    if (!username || !email || !password) {
      setError('Enter your email, username, and passphrase.');
      return;
    }
    setBusy(true);
    setIsMigrating(false);
    try {
      // Firebase is the real, server-checked gate now — this is what
      // actually confirms who you are, before we touch any local data.
      try {
        await signInWithFirebase(email, password);
      } catch (firebaseError: any) {
        // Checkpoint A.5 — profiles created before Firebase Auth existed
        // have no matching Firebase account at all, so sign-in always
        // fails here for them, even with the correct passphrase. Before
        // treating this as a real login failure, check whether that's
        // exactly what's happening: a local profile exists for this
        // username, and the passphrase just entered actually unlocks it.
        // If so, this is a legitimate long-time user — quietly create the
        // missing Firebase account using the email + passphrase they just
        // typed, then finish signing in normally. If the passphrase is
        // wrong, this check fails too, and they see the same "incorrect"
        // message as before — this never helps someone who doesn't
        // already know the correct passphrase.
        const code = firebaseError?.code || '';
        const looksLikeMissingAccountOrWrongInfo =
          code === 'auth/invalid-credential' ||
          code === 'auth/wrong-password' ||
          code === 'auth/user-not-found';

        if (looksLikeMissingAccountOrWrongInfo) {
          const profiles = await loadProfilesIndex();
          const profile = profiles.find((p) => p.username === username);
          if (profile) {
            const encrypted = await loadEncryptedProfileData(username);
            if (encrypted) {
              const localKey = deriveKey(password, profile.salt);
              let passphraseIsCorrect = false;
              try {
                decryptJSON(localKey, encrypted);
                passphraseIsCorrect = true;
              } catch (e) {
                passphraseIsCorrect = false;
              }
              if (passphraseIsCorrect) {
                setIsMigrating(true);
                try {
                  await createFirebaseAccount(email, password);
                  // createFirebaseAccount signs the new account in
                  // automatically, so we're genuinely authenticated now —
                  // finish signing in with the same local key we already
                  // verified above.
                  setIsMigrating(false);
                  setBusy(false);
                  onSignedIn(username, localKey);
                  return;
                } catch (migrationError: any) {
                  setIsMigrating(false);
                  setBusy(false);
                  const migCode = migrationError?.code || '';
                  if (migCode === 'auth/email-already-in-use') {
                    setError(
                      "Your passphrase is correct, but that email is already used by a different account. Try the email you'd expect to be linked to this profile."
                    );
                  } else {
                    setError('Could not finish setting up secure sign-in. Check your internet connection and try again.');
                  }
                  return;
                }
              }
            }
          }
        }

        setBusy(false);
        setError(friendlyFirebaseSignInError(firebaseError));
        return;
      }

      const profiles = await loadProfilesIndex();
      const profile = profiles.find((p) => p.username === username);
      if (!profile) {
        setError('No local profile with that username on this device.');
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
      setIsMigrating(false);
      setError('Something went wrong signing in. Please try again.');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>SIGN IN</Text>
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.sub}>Enter your email, username, and passphrase.</Text>

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={emailInput}
        onChangeText={setEmailInput}
        placeholder="you@example.com"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        editable={!busy}
      />

      <Text style={styles.label}>Username</Text>
      <TextInput
        style={styles.input}
        value={usernameInput}
        onChangeText={setUsernameInput}
        placeholder="e.g. miguel, ana"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!busy}
      />

      <Text style={styles.label}>Passphrase</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry
        autoCapitalize="none"
        editable={!busy}
      />

      {!!error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.primaryBtn} onPress={handleSignIn} disabled={busy}>
        {busy ? (
          <View style={styles.busyRow}>
            <ActivityIndicator color="#FFFFFF" style={styles.spinner} />
            <Text style={styles.primaryBtnText}>
              {isMigrating ? 'Setting up secure sign-in…' : 'Signing in…'}
            </Text>
          </View>
        ) : (
          <Text style={styles.primaryBtnText}>Sign in</Text>
        )}
      </TouchableOpacity>

      {showSlowHint && (
        <Text style={styles.slowHint}>
          This can take up to a minute — your phone is turning your passphrase into your
          encryption key. This is normal and only happens on sign-in.
        </Text>
      )}

      <TouchableOpacity style={styles.ghostBtn} onPress={onGoToCreateProfile} disabled={busy}>
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
  busyRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  spinner: { marginRight: 8 },
  slowHint: { color: '#78716C', fontSize: 12, textAlign: 'center', marginTop: 14, lineHeight: 18, paddingHorizontal: 8 },
  ghostBtn: { paddingVertical: 14, marginTop: 4 },
  ghostBtnText: { color: '#57534E', textAlign: 'center', fontSize: 13 },
});
