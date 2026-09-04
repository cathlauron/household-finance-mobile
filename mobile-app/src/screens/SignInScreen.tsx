import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, ScrollView } from 'react-native';
import CryptoJS from 'crypto-js';
import { sanitizeUsername } from '../auth';
import { deriveKey, decryptJSON, generateSalt, encryptJSON } from '../encryption';
import { loadProfilesIndex, loadEncryptedProfileData, saveEncryptedProfileData, saveProfilesIndex, updateProfileSalt, updateProfileHouseholdId, ProfileIndexEntry } from '../storage';
import type { HouseholdModel } from '../types';
import { signInWithFirebase, createFirebaseAccount, signOutFirebase } from '../authFirebase';
import { loadProfileCloudBackup, saveProfileCloudBackup, ProfileCloudBackup } from '../cloudBackup';
import { loadWrappedHouseholdKey, unwrapHouseholdKey, loadHouseholdData, wrapHouseholdKey, saveWrappedHouseholdKey } from '../household';
import {
  recoverKeyWithCode,
  saveRecoveryKey,
  generatePeerTransferCode,
  createPeerRecoveryRequest,
  cancelPeerRecoveryRequest,
  deletePeerRecoveryRequest,
  subscribeToPeerRecoveryRequest,
  decryptTransferredHouseholdKey,
} from '../recovery';
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
  remoteRevokeNotice?: string | null;
  onClearRemoteRevokeNotice?: () => void;
};

export default function SignInScreen({
  onSignedIn,
  onGoToCreateProfile,
  remoteRevokeNotice,
  onClearRemoteRevokeNotice,
}: Props) {
  const [usernameInput, setUsernameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // Checkpoint A.5 - true only while we're quietly creating a missing
  // Firebase account for a profile that predates Firebase Auth. Just
  // changes the button's wording so it doesn't look like a plain sign-in.
  const [isMigrating, setIsMigrating] = useState(false);
  // Checkpoint A.5 - true only while we're pulling a profile's backup down
  // from the cloud for a brand-new device that has no local data yet. Also
  // just changes the button's wording.
  const [isRestoring, setIsRestoring] = useState(false);
  // The password -> encryption key step (deriveKey, below) is intentionally slow on
  // purpose - it's what makes the password hard to brute-force - and on a phone it can
  // take anywhere from a few seconds to over a minute depending on the device. This just
  // shows a reassuring "this is normal" message once it's been running a couple seconds,
  // so it doesn't look frozen.
  const [showSlowHint, setShowSlowHint] = useState(false);

  // Recovery flow state (triggered if Firebase Auth succeeds but decryption fails)
  type RecoveryContext = {
    username: string;
    email: string;
    password: string;
    effectiveHouseholdId?: string;
    effectiveSalt: string;
    profile?: ProfileIndexEntry;
    cloudBackup?: ProfileCloudBackup | null;
    wrappedKeyInfo?: { householdId: string; wrappedKey: string } | null;
    isLinked: boolean;
  };

  const [recoveryContext, setRecoveryContext] = useState<RecoveryContext | null>(null);
  const [recoveryKeyInput, setRecoveryKeyInput] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoveryBusy, setRecoveryBusy] = useState(false);

  // Peer recovery state
  const [isWaitingForPeer, setIsWaitingForPeer] = useState(false);
  const [peerTransferCode, setPeerTransferCode] = useState('');
  const [peerBusy, setPeerBusy] = useState(false);
  const [peerError, setPeerError] = useState('');
  const peerRequestIdRef = useRef<string | null>(null);
  const peerTransferKeyRef = useRef<CryptoJS.lib.WordArray | null>(null);
  const peerUnsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (peerUnsubscribeRef.current) {
        peerUnsubscribeRef.current();
        peerUnsubscribeRef.current = null;
      }
    };
  }, []);

  function triggerRecovery(ctx: RecoveryContext) {
    setRecoveryContext(ctx);
    setRecoveryKeyInput('');
    setRecoveryError('');
    setPeerError('');
    setIsWaitingForPeer(false);
    setIsRestoring(false);
    setBusy(false);
  }

  async function handleRecoverWithKey() {
    if (!recoveryContext || !recoveryKeyInput.trim()) {
      setRecoveryError('Enter your recovery key.');
      return;
    }
    setRecoveryBusy(true);
    setRecoveryError('');
    try {
      const { key: unwrappedKey, isHouseholdKey } = await recoverKeyWithCode(
        recoveryContext.username,
        recoveryKeyInput.trim()
      );

      if (recoveryContext.isLinked || isHouseholdKey) {
        const householdId = recoveryContext.effectiveHouseholdId;
        if (!householdId) throw new Error('Missing household ID.');
        const encryptedHousehold = await loadHouseholdData(householdId);
        if (!encryptedHousehold) throw new Error('Household data not found.');
        const restoredModel = decryptJSON<HouseholdModel>(unwrappedKey, encryptedHousehold);

        // Re-wrap the household key under the newly authenticated Firebase password
        const newKey = deriveKey(recoveryContext.password, recoveryContext.effectiveSalt);
        const newWrappedKey = await wrapHouseholdKey(unwrappedKey, newKey);
        await saveWrappedHouseholdKey(recoveryContext.username, householdId, newWrappedKey);

        let profileEntry = recoveryContext.profile;
        if (!profileEntry) {
          profileEntry = {
            username: recoveryContext.username,
            salt: recoveryContext.effectiveSalt,
            householdId,
          };
          const profiles = await loadProfilesIndex();
          const updated = [...profiles.filter((p) => p.username !== recoveryContext.username), profileEntry];
          await saveProfilesIndex(updated);
        }
        await saveProfileCloudBackup(recoveryContext.username, {
          salt: recoveryContext.effectiveSalt,
          householdId,
        });

        setRecoveryBusy(false);
        setRecoveryContext(null);
        onSignedIn(recoveryContext.username, newKey, restoredModel, profileEntry, unwrappedKey);
        return;
      }

      // Solo / Unlinked Profile
      let encrypted = await loadEncryptedProfileData(recoveryContext.username);
      if (!encrypted && recoveryContext.cloudBackup?.data) {
        encrypted = recoveryContext.cloudBackup.data;
      }
      if (!encrypted) throw new Error('No encrypted data found to recover.');
      const restoredModel = decryptJSON<HouseholdModel>(unwrappedKey, encrypted);

      const newSalt = await generateSalt();
      const newKey = deriveKey(recoveryContext.password, newSalt);
      const reEncrypted = await encryptJSON(newKey, restoredModel);

      await saveEncryptedProfileData(recoveryContext.username, reEncrypted);
      await updateProfileSalt(recoveryContext.username, newSalt);

      let profileEntry = recoveryContext.profile;
      if (!profileEntry) {
        profileEntry = { username: recoveryContext.username, salt: newSalt };
        const profiles = await loadProfilesIndex();
        const updated = [...profiles.filter((p) => p.username !== recoveryContext.username), profileEntry];
        await saveProfilesIndex(updated);
      } else {
        profileEntry.salt = newSalt;
      }

      await saveProfileCloudBackup(recoveryContext.username, { salt: newSalt, data: reEncrypted });
      await saveRecoveryKey(recoveryContext.username, newKey, false, recoveryKeyInput.trim()).catch(() => {});

      setRecoveryBusy(false);
      setRecoveryContext(null);
      onSignedIn(recoveryContext.username, newKey, restoredModel, profileEntry);
    } catch (e: any) {
      setRecoveryBusy(false);
      setRecoveryError(e?.message || 'Could not recover with this key. Please check it and try again.');
    }
  }

  async function handleStartPeerRecovery() {
    if (!recoveryContext || !recoveryContext.effectiveHouseholdId) return;
    setPeerBusy(true);
    setPeerError('');
    try {
      const code = await generatePeerTransferCode();
      setPeerTransferCode(code);
      const { requestId, transferKey } = await createPeerRecoveryRequest(
        recoveryContext.effectiveHouseholdId,
        recoveryContext.username,
        code
      );
      peerRequestIdRef.current = requestId;
      peerTransferKeyRef.current = transferKey;
      setIsWaitingForPeer(true);
      setPeerBusy(false);

      peerUnsubscribeRef.current = subscribeToPeerRecoveryRequest(
        requestId,
        async (encryptedHouseholdKey) => {
          if (peerUnsubscribeRef.current) {
            peerUnsubscribeRef.current();
            peerUnsubscribeRef.current = null;
          }
          try {
            const householdKey = decryptTransferredHouseholdKey(encryptedHouseholdKey, transferKey);
            await deletePeerRecoveryRequest(requestId);
            const householdId = recoveryContext.effectiveHouseholdId!;
            const encryptedHousehold = await loadHouseholdData(householdId);
            if (!encryptedHousehold) throw new Error('Missing household data');
            const restoredModel = decryptJSON<HouseholdModel>(householdKey, encryptedHousehold);

            const newKey = deriveKey(recoveryContext.password, recoveryContext.effectiveSalt);
            const newWrappedKey = await wrapHouseholdKey(householdKey, newKey);
            await saveWrappedHouseholdKey(recoveryContext.username, householdId, newWrappedKey);

            let profileEntry = recoveryContext.profile;
            if (!profileEntry) {
              profileEntry = {
                username: recoveryContext.username,
                salt: recoveryContext.effectiveSalt,
                householdId,
              };
              const profiles = await loadProfilesIndex();
              const updated = [...profiles.filter((p) => p.username !== recoveryContext.username), profileEntry];
              await saveProfilesIndex(updated);
            }
            await saveProfileCloudBackup(recoveryContext.username, {
              salt: recoveryContext.effectiveSalt,
              householdId,
            });

            setIsWaitingForPeer(false);
            setRecoveryContext(null);
            onSignedIn(recoveryContext.username, newKey, restoredModel, profileEntry, householdKey);
          } catch (err: any) {
            setPeerError(err?.message || 'Failed to complete peer recovery.');
          }
        },
        () => {
          setIsWaitingForPeer(false);
          setPeerError('The recovery request was cancelled or expired.');
        }
      );
    } catch (e: any) {
      setPeerBusy(false);
      setPeerError(e?.message || 'Could not start peer recovery. Please try again.');
    }
  }

  async function handleCancelPeerRecovery() {
    if (peerUnsubscribeRef.current) {
      peerUnsubscribeRef.current();
      peerUnsubscribeRef.current = null;
    }
    if (recoveryContext?.effectiveHouseholdId && peerRequestIdRef.current) {
      await cancelPeerRecoveryRequest(recoveryContext.effectiveHouseholdId, peerRequestIdRef.current).catch(() => {});
    }
    peerRequestIdRef.current = null;
    peerTransferKeyRef.current = null;
    setIsWaitingForPeer(false);
  }

  async function handleCloseRecovery() {
    await handleCancelPeerRecovery();
    setRecoveryContext(null);
    setRecoveryKeyInput('');
    setRecoveryError('');
    setPeerError('');
    await signOutFirebase().catch(() => {});
  }

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
    if (code === 'auth/requires-recent-login') {
      return 'For security, please sign out and back in, then try again.';
    }
    if (code === 'auth/invalid-email') {
      return "That doesn't look like a valid email address.";
    }
    if (code === 'auth/too-many-requests') {
      return 'Too many attempts - please wait a bit and try again.';
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
      // Firebase is the real, server-checked gate now - this is what
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
        // Checkpoint A.5 - profiles created before Firebase Auth existed
        // have no matching Firebase account at all, so sign-in always
        // fails here for them, even with the correct password. Before
        // treating this as a real login failure, check whether that's
        // exactly what's happening: a local profile exists for this
        // username, and the password just entered actually unlocks it.
        // If so, this is a legitimate long-time user - quietly create the
        // missing Firebase account using the email + password they just
        // typed, then finish signing in normally. If the password is
        // wrong, this check fails too, and they see the same "incorrect"
        // message as before - this never helps someone who doesn't
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
                  // automatically, so we're genuinely authenticated now -
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
        // Checkpoint A.5 - brand-new device: nothing has ever been saved locally here
        // for this username. Before giving up, check whether this profile has an
        // encrypted backup sitting in the cloud (every save already creates/refreshes
        // one - see cloudBackup.ts) and, if so, pull it down and set this device up
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
          // This profile is linked to a shared household - the actual data lives in
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
            triggerRecovery({
              username,
              email,
              password,
              effectiveHouseholdId,
              effectiveSalt,
              cloudBackup,
              wrappedKeyInfo,
              isLinked: true,
            });
            return;
          }
        } else {
          // Personal (unlinked) profile - verify against the personal backup itself.
          if (!cloudBackup?.data) {
            setIsRestoring(false);
            setError('Could not find any saved data for that profile.');
            setBusy(false);
            return;
          }
          try {
            restoredModel = decryptJSON<HouseholdModel>(key, cloudBackup.data);
          } catch (e) {
            triggerRecovery({
              username,
              email,
              password,
              effectiveSalt,
              cloudBackup,
              isLinked: false,
            });
            return;
          }
          // Password confirmed correct - save a local copy so this device has its
          // own working data going forward (and can work offline afterward too).
          await saveEncryptedProfileData(username, cloudBackup.data);
        }

        // Password confirmed correct either way - now safe to set this device up
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
        // missing) personal blob - saveModel() only ever writes the personal
        // blob for UNLINKED profiles, so checking it here was the original bug.
        //
        // A second, separate issue: this device's LOCAL salt (profile.salt,
        // from AsyncStorage) can go stale if the password was ever changed on
        // a *different* device - the change only updates that other device's
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
          triggerRecovery({
            username,
            email,
            password,
            effectiveHouseholdId: profile.householdId,
            effectiveSalt: profile.salt,
            profile,
            wrappedKeyInfo: wrapped,
            isLinked: true,
          });
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

      // Unlinked (personal) profile - unchanged from before.
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
        triggerRecovery({
          username,
          email,
          password,
          effectiveSalt: profile.salt,
          profile,
          isLinked: false,
        });
        return;
      }
      setBusy(false);
      onSignedIn(username, key, loadedModel, profile);
    } catch (e) {
      setBusy(false);
      setIsMigrating(false);
      setIsRestoring(false);
      const friendly = friendlyFirebaseSignInError(e);
      if (
        friendly === 'Something went wrong signing in. Check your internet connection and try again.'
      ) {
        if (e instanceof Error && e.message) {
          setError(e.message);
          return;
        }
        setError('Something went wrong signing in. Please try again.');
        return;
      }
      setError(friendly);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>SIGN IN</Text>
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.sub}>Enter your email, username, and password.</Text>
      {!!remoteRevokeNotice && (
        <View style={styles.revokedBanner}>
          <Text style={styles.revokedBannerText}>⚠️ {remoteRevokeNotice}</Text>
        <View style={[styles.revokedBanner, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <Text style={[styles.revokedBannerText, { flex: 1 }]}>⚠️ {remoteRevokeNotice}</Text>
          {!!onClearRemoteRevokeNotice && (
            <TouchableOpacity onPress={onClearRemoteRevokeNotice} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={[styles.revokedBannerText, { fontWeight: '700', paddingLeft: 8 }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <Text style={styles.label}>Email</Text>
      <TextInput
        testID="email-input"
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
        testID="username-input"
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
        testID="password-input"
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="********"
        editable={!busy}
      />

      {!!error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity testID="sign-in-button" style={styles.primaryBtn} onPress={handleSignIn} disabled={busy}>
        {busy ? (
          <View style={styles.busyRow}>
            <ActivityIndicator color="#FFFFFF" style={styles.spinner} />
            <Text style={styles.primaryBtnText}>
              {isMigrating
                ? 'Setting up secure sign-in...'
                : isRestoring
                ? 'Restoring your data...'
                : 'Signing in...'}
            </Text>
          </View>
        ) : (
          <Text style={styles.primaryBtnText}>Sign in</Text>
        )}
      </TouchableOpacity>

      {showSlowHint && (
        <Text style={styles.slowHint}>
          This can take up to a minute - your phone is turning your password into your
          encryption key. This is normal and only happens on sign-in.
        </Text>
      )}

      <TouchableOpacity style={styles.ghostBtn} onPress={onGoToCreateProfile} disabled={busy}>
        <Text style={styles.ghostBtnText}>Create a new profile</Text>
      </TouchableOpacity>

      <Modal visible={!!recoveryContext} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalEyebrow}>ACCOUNT RECOVERY</Text>
              <Text style={styles.modalTitle}>Password Accepted, But Data Locked</Text>
              <Text style={styles.modalSub}>
                Your sign-in password was verified, but your data could not be unlocked.
                This happens if you reset your password, because your financial data is
                still encrypted with your previous password.
              </Text>

              {/* Option 1: Recovery Key */}
              <View style={styles.recoverySection}>
                <Text style={styles.sectionHeading}>Option 1: Secret Recovery Key</Text>
                <Text style={styles.sectionDesc}>
                  Enter the 16-character recovery key saved when your profile was created.
                </Text>
                <TextInput
                  style={styles.recoveryInput}
                  value={recoveryKeyInput}
                  onChangeText={setRecoveryKeyInput}
                  placeholder="e.g. 4B9X-7M2K-W8Q3-P1Z6"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!recoveryBusy && !peerBusy}
                />
                {!!recoveryError && <Text style={styles.errorText}>{recoveryError}</Text>}
                <TouchableOpacity
                  style={[styles.primaryBtn, (!recoveryKeyInput.trim() || recoveryBusy) && styles.btnDisabled]}
                  onPress={handleRecoverWithKey}
                  disabled={!recoveryKeyInput.trim() || recoveryBusy || peerBusy}
                >
                  {recoveryBusy ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Unlock &amp; Restore Data</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Option 2: Peer Recovery */}
              {recoveryContext?.isLinked && (
                <View style={[styles.recoverySection, { marginTop: 16 }]}>
                  <Text style={styles.sectionHeading}>Option 2: Ask a Household Member</Text>
                  <Text style={styles.sectionDesc}>
                    Another member of your household can verify your identity and hand over the household key.
                  </Text>

                  {!isWaitingForPeer ? (
                    <TouchableOpacity
                      style={[styles.secondaryBtn, peerBusy && styles.btnDisabled]}
                      onPress={handleStartPeerRecovery}
                      disabled={peerBusy || recoveryBusy}
                    >
                      {peerBusy ? (
                        <ActivityIndicator color="#1C1917" />
                      ) : (
                        <Text style={styles.secondaryBtnText}>Request Member Approval</Text>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.peerWaitingCard}>
                      <ActivityIndicator color="#D97706" style={{ marginBottom: 8 }} />
                      <Text style={styles.peerWaitingTitle}>Waiting for approval…</Text>
                      <Text style={styles.peerWaitingDesc}>
                        Ask another household member to open Settings &gt; Household on their phone and enter this code:
                      </Text>
                      <View style={styles.transferCodeBox}>
                        <Text style={styles.transferCodeText}>
                          {peerTransferCode.slice(0, 3)} - {peerTransferCode.slice(3)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.cancelInlineBtn}
                        onPress={handleCancelPeerRecovery}
                      >
                        <Text style={styles.cancelInlineBtnText}>Cancel Request</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {!!peerError && <Text style={styles.errorText}>{peerError}</Text>}
                </View>
              )}

              {/* Dead-end guidance per Correction 2 */}
              <View style={styles.deadEndSection}>
                <Text style={styles.deadEndTitle}>Lost both password and recovery key?</Text>
                <Text style={styles.deadEndDesc}>
                  Without your password or recovery key, existing data cannot be decrypted.
                  If you are signed into another device, you can access your data there or use
                  "Clear all data &amp; start fresh" in Settings &gt; Data.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.ghostBtn}
                onPress={handleCloseRecovery}
                disabled={recoveryBusy || peerBusy}
              >
                <Text style={styles.ghostBtnText}>Cancel &amp; Return to Sign In</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  primaryBtn: { backgroundColor: '#1C1917', borderRadius: 8, paddingVertical: 14, marginTop: 14 },
  primaryBtnText: { color: '#FFFFFF', textAlign: 'center', fontWeight: '600', fontSize: 15 },
  secondaryBtn: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D6D3D1', borderRadius: 8,
    paddingVertical: 12, marginTop: 10,
  },
  secondaryBtnText: { color: '#1C1917', textAlign: 'center', fontWeight: '600', fontSize: 14 },
  btnDisabled: { opacity: 0.4 },
  busyRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  spinner: { marginRight: 8 },
  slowHint: { color: '#78716C', fontSize: 12, textAlign: 'center', marginTop: 14, lineHeight: 18, paddingHorizontal: 8 },
  ghostBtn: { paddingVertical: 14, marginTop: 8 },
  ghostBtnText: { color: '#57534E', textAlign: 'center', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 20, width: '100%', maxWidth: 440, maxHeight: '90%' },
  modalEyebrow: { fontSize: 11, letterSpacing: 2, color: '#D97706', textAlign: 'center', fontWeight: '700', marginBottom: 6 },
  modalTitle: { fontSize: 19, fontWeight: '700', textAlign: 'center', color: '#1C1917', marginBottom: 6 },
  modalSub: { fontSize: 13, color: '#57534E', textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  recoverySection: { backgroundColor: '#FAFAF9', borderRadius: 10, borderWidth: 1, borderColor: '#E7E5E4', padding: 14 },
  sectionHeading: { fontSize: 14, fontWeight: '700', color: '#1C1917', marginBottom: 4 },
  sectionDesc: { fontSize: 12, color: '#78716C', lineHeight: 16, marginBottom: 10 },
  recoveryInput: {
    backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#D6D3D1',
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1C1917',
    fontFamily: 'monospace', letterSpacing: 1,
  },
  errorText: { color: '#E11D48', fontSize: 12, marginTop: 6, textAlign: 'center' },
  peerWaitingCard: {
    backgroundColor: '#FFFBEB', borderRadius: 8, borderWidth: 1, borderColor: '#FDE68A',
    padding: 14, alignItems: 'center', marginTop: 10,
  },
  peerWaitingTitle: { fontSize: 14, fontWeight: '700', color: '#92400E', marginBottom: 4 },
  peerWaitingDesc: { fontSize: 12, color: '#78350F', textAlign: 'center', lineHeight: 16, marginBottom: 10 },
  transferCodeBox: {
    backgroundColor: '#FFFFFF', borderRadius: 6, borderWidth: 1, borderColor: '#F59E0B',
    paddingVertical: 8, paddingHorizontal: 16, marginBottom: 10,
  },
  transferCodeText: { fontSize: 20, fontWeight: '700', color: '#B45309', letterSpacing: 3, fontFamily: 'monospace' },
  cancelInlineBtn: { paddingVertical: 6, paddingHorizontal: 12 },
  cancelInlineBtnText: { fontSize: 12, color: '#78716C', textDecorationLine: 'underline' },
  deadEndSection: { backgroundColor: '#F5F5F4', borderRadius: 8, padding: 12, marginTop: 16 },
  deadEndTitle: { fontSize: 12, fontWeight: '700', color: '#57534E', marginBottom: 4 },
  deadEndDesc: { fontSize: 11, color: '#78716C', lineHeight: 15 },
  revokedBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 14,
    marginBottom: 4,
  },
  revokedBannerText: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
});
