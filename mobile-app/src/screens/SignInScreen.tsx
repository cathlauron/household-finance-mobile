import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import CryptoJS from 'crypto-js';
import { sanitizeUsername } from '../auth';
import { deriveKey, decryptJSON } from '../encryption';
import { loadProfilesIndex, loadEncryptedProfileData, saveEncryptedProfileData, saveProfilesIndex, updateProfileSalt, updateProfileHouseholdId, ProfileIndexEntry } from '../storage';
import type { HouseholdModel } from '../types';
import { signInWithFirebase, createFirebaseAccount, signOutFirebase } from '../authFirebase';
import { loadProfileCloudBackup, saveProfileCloudBackup } from '../cloudBackup';
import { loadWrappedHouseholdKey, unwrapHouseholdKey, loadHouseholdData } from '../household';
import PasswordField from '../components/PasswordField';

type Props = {
  onSignedIn: (
    username: string,
    key: CryptoJS.lib.WordArray,
    initialModel?: HouseholdModel,
    profile?: ProfileIndexEntry,
    householdKey?: CryptoJS.lib.WordArray
  ) => void;
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
  // Checkpoint A.5 — true only while we're pulling a profile's backup down
  // from the cloud for a brand-new device that has no local data yet. Also
  // just changes the button's wording.
  const [isRestoring, setIsRestoring] = useState(false);
  // The password → encryption key step (deriveKey, below) is intentionally slow on
  // purpose — it's what makes the password hard to brute-force — and on a phone it can
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
      return 'Incorrect email or password.';
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
      setError('Enter your email, username, and password.');
      return;
    }
    setBusy(true);
    setIsMigrating(false);
    setIsRestoring(false);
    try {
      // Firebase is the real, server-checked gate now — this is what
      // actually confirms who you are, before we touch any local data.
      try {
        await signInWithFirebase(email, password);
      } catch (firebaseError: any) {
        // A failed sign-in must not leave a previously persisted Firebase user
        // active while the local-profile migration or restore path runs.
        try {
          await signOutFirebase();
        } catch (signOutError) {
          setBusy(false);
          setError('Could not reset the previous sign-in session. Please try again.');
          return;
        }
        // Checkpoint A.5 — profiles created before Firebase Auth existed
        // have no matching Firebase account at all, so sign-in always
        // fails here for them, even with the correct password. Before
        // treating this as a real login failure, check whether that's
        // exactly what's happening: a local profile exists for this
        // username, and the password just entered actually unlocks it.
        // If so, this is a legitimate long-time user — quietly create the
        // missing Firebase account using the email + password they just
        // typed, then finish signing in normally. If the password is
        // wrong, this check fails too, and they see the same "incorrect"
        // message as before — this never helps someone who doesn't
        // already know the correct password.
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
              let passwordIsCorrect = false;
              let localModel: HouseholdModel | undefined;
              try {
                localModel = decryptJSON<HouseholdModel>(localKey, encrypted);
                passwordIsCorrect = true;
              } catch (e) {
                passwordIsCorrect = false;
              }
              if (passwordIsCorrect && localModel) {
                setIsMigrating(true);
                try {
                  await createFirebaseAccount(email, password);
                  // createFirebaseAccount signs the new account in
                  // automatically, so we're genuinely authenticated now —
                  // finish signing in with the same local key we already
                  // verified above.
                  setIsMigrating(false);
                  setBusy(false);
                  onSignedIn(username, localKey, localModel, profile);
                  return;
                } catch (migrationError: any) {
                  setIsMigrating(false);
                  setBusy(false);
                  const migCode = migrationError?.code || '';
                  if (migCode === 'auth/email-already-in-use') {
                    setError(
                      "Your password is correct, but that email is already used by a different account. Try the email you'd expect to be linked to this profile."
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
        // Checkpoint A.5 — brand-new device: nothing has ever been saved locally here
        // for this username. Before giving up, check whether this profile has an
        // encrypted backup sitting in the cloud (every save already creates/refreshes
        // one — see cloudBackup.ts) and, if so, pull it down and set this device up
        // from that instead of failing outright.
        setIsRestoring(true);
        const cloudBackup = await loadProfileCloudBackup(username);
        const wrappedKeyInfo = await loadWrappedHouseholdKey(username);
        if (!cloudBackup && !wrappedKeyInfo) {
          setIsRestoring(false);
          setError('No account found with that username. Check the spelling, or create a new profile.');
          setBusy(false);
          return;
        }

        const effectiveSalt = cloudBackup?.salt;
        if (!effectiveSalt) {
          setIsRestoring(false);
          setError('No saved profile found for that account.');
          setBusy(false);
          return;
        }

        const key = deriveKey(password, effectiveSalt);
        let restoredModel: HouseholdModel | undefined;
        let restoredHouseholdKey: CryptoJS.lib.WordArray | undefined;
        const effectiveHouseholdId = wrappedKeyInfo?.householdId || cloudBackup?.householdId;

        if (effectiveHouseholdId && wrappedKeyInfo) {
          // This profile is linked to a shared household — the actual data lives in
          // the shared household document, not in this personal backup. Confirm the
          // password is correct by actually unwrapping the shared key and decrypting
          // the shared data with it, before trusting any of this.
          try {
            const householdKey = unwrapHouseholdKey(wrappedKeyInfo.wrappedKey, key);
            const encryptedHousehold = await loadHouseholdData(effectiveHouseholdId);
            if (!encryptedHousehold) throw new Error('missing household data');
            restoredModel = decryptJSON<HouseholdModel>(householdKey, encryptedHousehold);
            restoredHouseholdKey = householdKey;
          } catch (e) {
            setIsRestoring(false);
            setError('Incorrect username or password.');
            setBusy(false);
            return;
          }
        } else {
          // Personal (unlinked) profile — verify against the personal backup itself.
          if (!cloudBackup?.data) {
            setIsRestoring(false);
            setError('Could not find any saved data for that profile.');
            setBusy(false);
            return;
          }
          try {
            restoredModel = decryptJSON<HouseholdModel>(key, cloudBackup.data);
          } catch (e) {
            setIsRestoring(false);
            setError('Incorrect username or password.');
            setBusy(false);
            return;
          }
          // Password confirmed correct — save a local copy so this device has its
          // own working data going forward (and can work offline afterward too).
          await saveEncryptedProfileData(username, cloudBackup.data);
        }

        // Password confirmed correct either way — now safe to set this device up
        // with its own local profile entry, same as if it had been created here.
        const newEntry: ProfileIndexEntry = { username, salt: effectiveSalt };
        if (effectiveHouseholdId) newEntry.householdId = effectiveHouseholdId;
        const updatedProfiles = [...profiles.filter((p) => p.username !== username), newEntry];
        await saveProfilesIndex(updatedProfiles);

        if (effectiveHouseholdId) {
          saveProfileCloudBackup(username, { salt: effectiveSalt, householdId: effectiveHouseholdId }).catch(() => {});
        }

        setIsRestoring(false);
        setBusy(false);
        onSignedIn(username, key, restoredModel, newEntry, restoredHouseholdKey);
        return;
      }

      if (profile.householdId) {
        // Linked profile: the real, up-to-date data lives in the shared
        // household document, not this profile's own (possibly stale or
        // missing) personal blob — saveModel() only ever writes the personal
        // blob for UNLINKED profiles, so checking it here was the original bug.
        //
        // A second, separate issue: this device's LOCAL salt (profile.salt,
        // from AsyncStorage) can go stale if the password was ever changed on
        // a *different* device — the change only updates that other device's
        // local copy, plus a cloud backup copy, but never this device's local
        // copy. So: try the local salt first: if that fails, fall back to the
        // cloud backup's salt. If the cloud one works, self-heal this
        // device's local salt so this doesn't happen again next time.
        const wrapped = await loadWrappedHouseholdKey(username);
        if (!wrapped) {
          setError('Incorrect username or password.');
          setBusy(false);
          return;
        }

        const tryUnwrap = async (
          saltToTry: string
        ): Promise<{ key: CryptoJS.lib.WordArray; householdKey: CryptoJS.lib.WordArray; model: HouseholdModel } | null> => {
          const candidateKey = deriveKey(password, saltToTry);

          let householdKey: CryptoJS.lib.WordArray;
          try {
            householdKey = unwrapHouseholdKey(wrapped.wrappedKey, candidateKey);
          } catch (e) {
            return null;
          }

          const encryptedHousehold = await loadHouseholdData(profile.householdId!);
          if (!encryptedHousehold) {
            return null;
          }

          try {
            const model = decryptJSON<HouseholdModel>(householdKey, encryptedHousehold);
            return { key: candidateKey, householdKey, model };
          } catch (e) {
            return null;
          }
        };

        let result = await tryUnwrap(profile.salt);

        if (!result) {
          const cloudBackup = await loadProfileCloudBackup(username);
          if (cloudBackup && cloudBackup.salt !== profile.salt) {
            result = await tryUnwrap(cloudBackup.salt);
            if (result) {
              // Self-heal: bring this device's local salt in line with the
              // one that actually works, so next sign-in on this device
              // succeeds on the first try.
              await updateProfileSalt(username, cloudBackup.salt);
              profile.salt = cloudBackup.salt;
            }
          }
        }

        if (!result) {
          setError('Incorrect username or password.');
          setBusy(false);
          return;
        }

        setBusy(false);
        onSignedIn(username, result.key, result.model, profile, result.householdKey);
        return;
      }

      // Check if this profile was linked to a household on another device (self-heal)
      const wrapped = await loadWrappedHouseholdKey(username);
      if (wrapped?.householdId) {
        const tryUnwrap = async (
          saltToTry: string
        ): Promise<{ key: CryptoJS.lib.WordArray; householdKey: CryptoJS.lib.WordArray; model: HouseholdModel } | null> => {
          const candidateKey = deriveKey(password, saltToTry);

          let householdKey: CryptoJS.lib.WordArray;
          try {
            householdKey = unwrapHouseholdKey(wrapped.wrappedKey, candidateKey);
          } catch (e) {
            return null;
          }

          const encryptedHousehold = await loadHouseholdData(wrapped.householdId);
          if (!encryptedHousehold) {
            return null;
          }

          try {
            const model = decryptJSON<HouseholdModel>(householdKey, encryptedHousehold);
            return { key: candidateKey, householdKey, model };
          } catch (e) {
            return null;
          }
        };

        let result = await tryUnwrap(profile.salt);

        if (!result) {
          const cloudBackup = await loadProfileCloudBackup(username);
          if (cloudBackup && cloudBackup.salt !== profile.salt) {
            result = await tryUnwrap(cloudBackup.salt);
            if (result) {
              await updateProfileSalt(username, cloudBackup.salt);
              profile.salt = cloudBackup.salt;
            }
          }
        }

        if (result) {
          // Self-heal: update local storage so future sign-ins immediately know it's linked
          await updateProfileHouseholdId(username, wrapped.householdId);
          profile.householdId = wrapped.householdId;
          saveProfileCloudBackup(username, { salt: profile.salt, householdId: wrapped.householdId }).catch(() => {});

          setBusy(false);
          onSignedIn(username, result.key, result.model, profile, result.householdKey);
          return;
        }
      }

      // Unlinked (personal) profile — unchanged from before.
      const key = deriveKey(password, profile.salt);
      const encrypted = await loadEncryptedProfileData(username);
      if (!encrypted) {
        setError('Could not find any saved data for that profile.');
        setBusy(false);
        return;
      }
      let loadedModel: HouseholdModel | undefined;
      try {
        loadedModel = decryptJSON<HouseholdModel>(key, encrypted);
      } catch (e) {
        setError('Incorrect username or password.');
        setBusy(false);
        return;
      }
      setBusy(false);
      onSignedIn(username, key, loadedModel, profile);
    } catch (e) {
      setBusy(false);
      setIsMigrating(false);
      setIsRestoring(false);
      setError('Something went wrong signing in. Please try again.');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>SIGN IN</Text>
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.sub}>Enter your email, username, and password.</Text>

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

      <Text style={styles.label}>Password</Text>
      <PasswordField
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        editable={!busy}
      />

      {!!error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.primaryBtn} onPress={handleSignIn} disabled={busy}>
        {busy ? (
          <View style={styles.busyRow}>
            <ActivityIndicator color="#FFFFFF" style={styles.spinner} />
            <Text style={styles.primaryBtnText}>
              {isMigrating
                ? 'Setting up secure sign-in…'
                : isRestoring
                ? 'Restoring your data…'
                : 'Signing in…'}
            </Text>
          </View>
        ) : (
          <Text style={styles.primaryBtnText}>Sign in</Text>
        )}
      </TouchableOpacity>

      {showSlowHint && (
        <Text style={styles.slowHint}>
          This can take up to a minute — your phone is turning your password into your
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
