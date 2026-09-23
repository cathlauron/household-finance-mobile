import { wipeQuickUnlock, saveFingerprintCopyIfPossible, resetPinFailures } from './src/quickUnlock';
import { upsertRecentAccount, removeRecentAccount, loadRecentAccounts, updateRecentAccountIfPresent } from './src/recentAccounts';
import type { RecentAccount } from './src/recentAccounts';
import { isThisDeviceRevoked, getDeviceId } from './src/sessions';
import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, ActivityIndicator, AppState, AppStateStatus, View, LogBox } from 'react-native';
LogBox.ignoreLogs(['expo-notifications: Android Push notifications']);
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { navigationRef } from './src/navigation/navigationRef';
import CryptoJS from 'crypto-js';
import CreateProfileScreen from './src/screens/CreateProfileScreen';
import SignInScreen from './src/screens/SignInScreen';
import AccountSwitcherScreen from './src/screens/AccountSwitcherScreen';
import PinUnlockScreen from './src/screens/PinUnlockScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import IntroScreen from './src/screens/IntroScreen';
import IntroSlidesScreen from './src/screens/IntroSlidesScreen';
import RootStack from './src/navigation/RootStack';
import { loadProfilesIndex, loadEncryptedProfileData } from './src/storage';
import type { ProfileIndexEntry } from './src/storage';
import { hasPinSetUp } from './src/pin';
import { deriveKey, decryptJSON } from './src/encryption';
import { sanitizeModelIds } from './src/mergeModels';
import type { HouseholdModel } from './src/types';
import { getBiometricState } from './src/biometrics';
import { getAutoLockMinutes, DEFAULT_AUTO_LOCK_MINUTES, subscribeToAutoLockMinutes } from './src/autoLock';
import { isAutoLockSuppressed } from './src/autoLockSuppress';
import { ThemeProvider, useTheme } from './src/ThemeContext';
import { DataProvider, useData } from './src/DataContext';
import { getCurrentFirebaseUser, signOutFirebase, signInWithFirebase } from './src/authFirebase';
import { rescheduleBillNotifications } from './src/pushNotifications';
import {
  registerDeviceSession,
  deleteDeviceSession,
  subscribeToDeviceSession,
  updateDeviceHeartbeat,
} from './src/sessions';

type Screen = 'loading' | 'createProfile' | 'signIn' | 'home' | 'locked' | 'onboarding' | 'intro' | 'switcher';

function AppContent() {
  const { colors } = useTheme();
  const { loadModel, clearModel } = useData();
  const [screen, setScreen] = useState<Screen>('loading');
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [derivedKey, setDerivedKey] = useState<CryptoJS.lib.WordArray | null>(null);
  const [remoteRevokeNotice, setRemoteRevokeNotice] = useState<string | null>(null);
  // Quick unlock (Step 4b)
  const [recentAccounts, setRecentAccounts] = useState<RecentAccount[]>([]);
  const [autoSignIn, setAutoSignIn] = useState<{ email: string; username: string; password: string } | null>(null);
  const [signInPrefillUsername, setSignInPrefillUsername] = useState<string | undefined>(undefined);

  const screenRef = useRef<Screen>('loading');
  // Set only by the lock screen's "Sign in to another account" button, so that
  // switching away does NOT remove the account from the recent-accounts list.
  const keepRecentOnSignOutRef = useRef(false);
  // Holds { email, password } ONLY while the Onboarding screen is showing, so the
  // PIN copy can be saved without asking for the password again. Cleared the moment
  // Onboarding ends, for any reason.
  const onboardingCredsRef = useRef<{ email: string; password: string } | null>(null);

  useEffect(() => {
    screenRef.current = screen;
    if (screen !== 'onboarding') onboardingCredsRef.current = null;
  }, [screen]);

  // B.14: deep-link plumbing. `pendingDeepLinkBillId` survives across
  // loading/signIn/onboarding without triggering re-renders; `handledNotificationIds`
  // stops the same physical tap from being processed twice (cold-start
  // getLastNotificationResponseAsync() and the live listener can both fire
  // for one tap).
  const pendingDeepLinkBillId = useRef<string | null>(null);
  const handledNotificationIds = useRef<Set<string>>(new Set());

  function captureNotificationResponse(response: Notifications.NotificationResponse | null) {
    if (!response) return;
    const id = response.notification.request.identifier;
    if (handledNotificationIds.current.has(id)) return;
    handledNotificationIds.current.add(id);
    const data: any = response.notification.request.content.data;
    if (data?.type === 'subscriptionReminder' && typeof data.billId === 'string') {
      pendingDeepLinkBillId.current = data.billId;
      flushPendingDeepLink();
    }
  }

  function flushPendingDeepLink() {
    if (!pendingDeepLinkBillId.current) return;
    if (!navigationRef.isReady()) return;
    const billId = pendingDeepLinkBillId.current;
    pendingDeepLinkBillId.current = null;
    navigationRef.navigate('Main', { openBillId: billId });
  }

  // Cold start: the app may have been launched BY tapping the notification.
  useEffect(() => {
    Notifications.getLastNotificationResponseAsync().then(captureNotificationResponse);
  }, []);

  // Warm/background: the app was already running when the notification was tapped.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(captureNotificationResponse);
    return () => sub.remove();
  }, []);
  const usernameRef = useRef<string | null>(null);
  const autoLockMinutesRef = useRef<number>(DEFAULT_AUTO_LOCK_MINUTES);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentDeviceIdRef = useRef<string | null>(null);
  const deviceSessionUnsubRef = useRef<(() => void) | null>(null);

  // Saves this account into the recent-accounts list, with the current
  // PIN / fingerprint state. Passing undefined for householdId or avatarConfig
  // means "leave what is already stored".
  // Step 5a-2: tries to unlock an UNLINKED profile's model entirely offline,
  // the same way PinUnlockScreen's password path already does, deriving the
  // key locally and decrypting the local cache, no Firebase call. Returns
  // null (never throws) if the profile is linked, not found locally, or the
  // saved password no longer decrypts anything, the caller falls back to
  // the normal online sign-in path in every one of those cases.
  async function attemptOfflineUnlock(
    username: string,
    creds: { email: string; password: string }
  ): Promise<{ key: CryptoJS.lib.WordArray; model: HouseholdModel; profile: ProfileIndexEntry } | null> {
    try {
      const profiles = await loadProfilesIndex();
      const profile = profiles.find((p) => p.username === username);
      if (!profile || profile.householdId) return null;
      const key = deriveKey(creds.password, profile.salt);
      const encrypted = await loadEncryptedProfileData(username);
      if (!encrypted) return null;
      const model = sanitizeModelIds(decryptJSON<HouseholdModel>(key, encrypted));
      return { key, model, profile };
    } catch (e) {
      return null;
    }
  }

  // After an offline unlock, tries the SAME online steps a normal sign-in
  // already does (Firebase sign-in, then 5a-1's revocation check, then
  // registerAndListenDeviceSession) — quietly, in the background. If this
  // device is offline, signInWithFirebase simply fails and nothing further
  // happens; the person keeps using the app normally. If it succeeds and
  // this device turns out to have been revoked, the same wipe/kick-out as
  // the online quick-unlock path runs.
  async function reconcileOfflineUnlockWithServer(
    username: string,
    creds: { email: string; password: string }
  ) {
    try {
      await signInWithFirebase(creds.email, creds.password);
    } catch (e) {
      return;
    }
    const user = getCurrentFirebaseUser();
    if (!user) return;
    const deviceId = await getDeviceId();
    const revoked = await isThisDeviceRevoked(user.uid, deviceId);
    if (revoked) {
      wipeQuickUnlock(username).catch(() => {});
      removeRecentAccount(username).catch(() => {});
      clearModel();
      setCurrentUsername(null);
      setDerivedKey(null);
      setRemoteRevokeNotice('You were signed out from another device.');
      setScreen('signIn');
      return;
    }
    registerAndListenDeviceSession(user.uid).catch(() => {});
  }

  async function recordRecentAccount(
    username: string,
    uid: string,
    householdId: string | undefined,
    avatarConfig: RecentAccount['avatarConfig']
  ) {
    const [pinIsSetUp, biometricState] = await Promise.all([
      hasPinSetUp(username),
      getBiometricState(username),
    ]);
    const evicted = await upsertRecentAccount({
      username,
      uid,
      householdId,
      avatarConfig,
      lastUsedAt: Date.now(),
      hasPin: pinIsSetUp,
      biometricsEnabled: biometricState === 'ENABLED',
    });
      // An account pushed off the 5-account list also loses its quick-unlock copies.
    for (const evictedUsername of evicted) {
      wipeQuickUnlock(evictedUsername).catch(() => {});
    }
  }

  async function registerAndListenDeviceSession(uid: string) {
    if (deviceSessionUnsubRef.current) {
      deviceSessionUnsubRef.current();
      deviceSessionUnsubRef.current = null;
    }
    try {
      const deviceId = await registerDeviceSession(uid);
      currentDeviceIdRef.current = deviceId;
      deviceSessionUnsubRef.current = subscribeToDeviceSession(uid, deviceId, () => {
        handleRemoteRevoked();
      });
    } catch (e) {
      console.error('Failed to register device session:', e);
    }
  }

  async function handleRemoteRevoked() {
    // Read the username first: it is cleared later in this function.
    const revokedUsername = usernameRef.current;
    if (revokedUsername) {
      removeRecentAccount(revokedUsername).catch(() => {});
      wipeQuickUnlock(revokedUsername).catch(() => {});
    }
    clearIdleTimer();
    // 1. Unsubscribe listener FIRST (Correction 3)
    if (deviceSessionUnsubRef.current) {
      deviceSessionUnsubRef.current();
      deviceSessionUnsubRef.current = null;
    }
    // 2. Clear current device reference (document is already marked revoked: true in Firestore)
    // 2. Clean up device session document
    const user = getCurrentFirebaseUser();
    const deviceId = currentDeviceIdRef.current;
    if (user && deviceId) {
      await deleteDeviceSession(user.uid, deviceId).catch(() => {});
    }
    currentDeviceIdRef.current = null;

    try {
      await signOutFirebase();
    } catch (e) {}

    clearModel();
    setCurrentUsername(null);
    setDerivedKey(null);
    setRemoteRevokeNotice('You were signed out from another device.');
    setScreen('signIn');
  }

  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  useEffect(() => {
    usernameRef.current = currentUsername;
  }, [currentUsername]);

  useEffect(() => {
    (async () => {
      const minDelay = new Promise((resolve) => setTimeout(resolve, 1600));
      const [profiles, recents] = await Promise.all([loadProfilesIndex(), loadRecentAccounts(), minDelay]);
      if (!profiles.length) {
        setScreen('intro');
      } else if (recents.length) {
        setRecentAccounts(recents);
        setScreen('switcher');
      } else {
        setScreen('signIn');
      }
      autoLockMinutesRef.current = await getAutoLockMinutes();
    })();
  }, []);

    // Whenever Settings changes the auto-lock time, update the timer immediately —
  // without this, a change wouldn't take effect until the app was closed and reopened.
  useEffect(() => {
    const unsubscribe = subscribeToAutoLockMinutes((minutes) => {
      autoLockMinutesRef.current = minutes;
      resetIdleTimer();
    });
    return unsubscribe;
  }, []);

  async function lockIfConfigured() {
    if (isAutoLockSuppressed()) return;
    const username = usernameRef.current;
    if (screenRef.current !== 'home' || !username) return;
    const [pinIsSetUp, biometricState] = await Promise.all([
      hasPinSetUp(username),
      getBiometricState(username),
    ]);
    if (pinIsSetUp || biometricState === 'ENABLED') {
      setScreen('locked');
    }
  }

  function clearIdleTimer() {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }

  function resetIdleTimer() {
    clearIdleTimer();
    if (screenRef.current !== 'home') return;
    const timeoutMs = autoLockMinutesRef.current * 60 * 1000;
    idleTimerRef.current = setTimeout(() => {
      lockIfConfigured();
    }, timeoutMs);
  }

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        lockIfConfigured();
      }
      if (nextState === 'active') {
        const user = getCurrentFirebaseUser();
        const deviceId = currentDeviceIdRef.current;
        if (user && deviceId) {
          updateDeviceHeartbeat(user.uid, deviceId).catch(() => {});
        }
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (screen === 'home') {
      resetIdleTimer();
      flushPendingDeepLink();
    } else {
      clearIdleTimer();
    }
    return () => clearIdleTimer();
  }, [screen]);

  async function handleFullSignOut() {
    // Read these first: the username is cleared later in this function.
    const signedOutUsername = usernameRef.current;
    const keepRecent = keepRecentOnSignOutRef.current;
    keepRecentOnSignOutRef.current = false;
    if (signedOutUsername && !keepRecent) {
      removeRecentAccount(signedOutUsername).catch(() => {});
      wipeQuickUnlock(signedOutUsername).catch(() => {});
    }
    clearIdleTimer();
    // 1. Unsubscribe listener FIRST (Correction 3)
    if (deviceSessionUnsubRef.current) {
      deviceSessionUnsubRef.current();
      deviceSessionUnsubRef.current = null;
    }
    // 2. Clean up this device's session document (Correction 2 & 4)
    const user = getCurrentFirebaseUser();
    const deviceId = currentDeviceIdRef.current;
    if (user && deviceId) {
      // If the device is offline, this Firestore write can hang
      // indefinitely waiting for a connection instead of failing, which
      // freezes the whole sign-out flow. Give it at most 1 second, then
      // move on - the write will still complete later if Firestore's own
      // offline queue is enabled, and either way sign-out itself must not
      // get stuck on it.
      await Promise.race([
        deleteDeviceSession(user.uid, deviceId),
        new Promise((resolve) => setTimeout(resolve, 1000)),
      ]).catch(() => {});
    }
    currentDeviceIdRef.current = null;

    try {
      await signOutFirebase();
    } catch (e) {
      // Continue signing out locally even if the network call fails —
      // being offline shouldn't trap the user inside the app.
    }
    clearModel();
    setCurrentUsername(null);
    setDerivedKey(null);
    setScreen('signIn');
  }

  if (screen === 'loading') {
    return <IntroScreen />;
  }

  if (screen === 'locked' && currentUsername && derivedKey) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy2 }}>
        <PinUnlockScreen
          username={currentUsername}
          onUnlocked={(newUsername, newKey) => {
            if (newUsername && newKey) {
              setCurrentUsername(newUsername);
              setDerivedKey(newKey);
              loadModel(newUsername, newKey);
            }
            setScreen('home');
          }}
          onSignOut={() => {
            keepRecentOnSignOutRef.current = true;
            handleFullSignOut();
          }}
        />
      </SafeAreaView>
    );
  }

  if (screen === 'home' && currentUsername && derivedKey) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.navy2 }} onStartShouldSetResponderCapture={() => { resetIdleTimer(); return false; }}>
        <NavigationContainer ref={navigationRef} onReady={flushPendingDeepLink}>
          <RootStack
            username={currentUsername}
            onSignOut={handleFullSignOut}
            onLock={() => setScreen('locked')}
          />
        </NavigationContainer>
      </View>
    );
  }

  if (screen === 'onboarding' && currentUsername && derivedKey) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy2 }}>
        <OnboardingScreen
          username={currentUsername}
          initialCredentials={onboardingCredsRef.current ?? undefined}
          onFinish={() => {
            onboardingCredsRef.current = null;
            setScreen('home');
          }}
        />
      </SafeAreaView>
    );
  }

    if (screen === 'intro') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy2 }}>
        <IntroSlidesScreen onDone={() => setScreen('createProfile')} />
      </SafeAreaView>
    );
  }
  
    if (screen === 'switcher') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy2 }}>
        <AccountSwitcherScreen
          accounts={recentAccounts}
          onUnlocked={(creds) => {
            resetPinFailures(creds.username).catch(() => {});
            (async () => {
              const offline = await attemptOfflineUnlock(creds.username, creds);
              if (offline) {
                setRemoteRevokeNotice(null);
                setCurrentUsername(creds.username);
                setDerivedKey(offline.key);
                loadModel(
                  creds.username,
                  offline.key,
                  { profile: offline.profile, initialModel: offline.model },
                  { deferNotifications: true }
                ).catch(() => {});
                recordRecentAccount(
                  creds.username,
                  offline.model.avatars ? '' : '',
                  undefined,
                  offline.model.avatars?.[creds.username]
                ).catch(() => {});
                setScreen('home');
                setTimeout(() => {
                  rescheduleBillNotifications(offline.model).catch(() => {});
                }, 0);
                reconcileOfflineUnlockWithServer(creds.username, creds).catch(() => {});
                return;
              }
              setRemoteRevokeNotice(null);
              setSignInPrefillUsername(undefined);
              setAutoSignIn(creds);
              setScreen('signIn');
            })();
          }}
          onUsePassword={(username) => {
            setAutoSignIn(null);
            setSignInPrefillUsername(username);
            setScreen('signIn');
          }}
          onUseOtherAccount={() => {
            setAutoSignIn(null);
            setSignInPrefillUsername(undefined);
            setScreen('signIn');
          }}
        />
      </SafeAreaView>
    );
  }

  if (screen === 'createProfile') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy2 }}>
        <CreateProfileScreen
          onProfileCreated={(username, key, credentials) => {
            onboardingCredsRef.current = credentials ?? null;
            setRemoteRevokeNotice(null);
            setCurrentUsername(username);
            setDerivedKey(key);
            loadModel(username, key);
            const user = getCurrentFirebaseUser();
            if (user) {
              registerAndListenDeviceSession(user.uid).catch(() => {});
              recordRecentAccount(username, user.uid, undefined, undefined).catch(() => {});
            }
            if (credentials) {
              saveFingerprintCopyIfPossible({
                email: credentials.email,
                username,
                password: credentials.password,
              }).catch(() => {});
            }
            setScreen('onboarding');
          }}
          onGoToSignIn={() => setScreen('signIn')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy2 }}>
<SignInScreen
        remoteRevokeNotice={remoteRevokeNotice}
        onClearRemoteRevokeNotice={() => setRemoteRevokeNotice(null)}
        initialUsername={signInPrefillUsername}
        autoSignIn={autoSignIn ?? undefined}
        onAutoSignInFailed={(username) => {
          wipeQuickUnlock(username).catch(() => {});
          setAutoSignIn(null);
          setSignInPrefillUsername(username);
          setRemoteRevokeNotice('Your saved sign-in is out of date. Sign in with your password.');
        }}
        onSignedIn={(username, key, initialModel, profile, householdKey, credentials) => {
          const viaQuickUnlock = autoSignIn !== null;
          setAutoSignIn(null);
          setSignInPrefillUsername(undefined);
          setRemoteRevokeNotice(null);
          setCurrentUsername(username);
          setDerivedKey(key);
          loadModel(
            username,
            key,
            {
              profile,
              initialModel,
              householdId: profile?.householdId,
              householdKey,
            },
            { deferNotifications: true }
          ).catch(() => {});
          const user = getCurrentFirebaseUser();
          if (user) {
            const proceedWithSession = async () => {
              // Quick-unlock path only: check whether THIS device was revoked
              // while the app was closed, before registerAndListenDeviceSession
              // recreates the session document and would erase that flag.
              if (viaQuickUnlock) {
                const deviceId = await getDeviceId();
                const revoked = await isThisDeviceRevoked(user.uid, deviceId);
                if (revoked) {
                  wipeQuickUnlock(username).catch(() => {});
                  removeRecentAccount(username).catch(() => {});
                  clearModel();
                  setCurrentUsername(null);
                  setDerivedKey(null);
                  setRemoteRevokeNotice('You were signed out from another device.');
                  setScreen('signIn');
                  return;
                }
              }
              registerAndListenDeviceSession(user.uid).catch(() => {});
            };
            proceedWithSession();
            recordRecentAccount(
              username,
              user.uid,
              profile?.householdId,
              initialModel ? (initialModel.avatars?.[username] ?? { type: 'initials' }) : undefined
            ).catch(() => {});
          }
          if (credentials && !viaQuickUnlock) {
            saveFingerprintCopyIfPossible({
              email: credentials.email,
              username,
              password: credentials.password,
            }).catch(() => {});
          }
          setScreen('home');
          if (initialModel) {
            setTimeout(() => {
              rescheduleBillNotifications(initialModel).catch(() => {});
            }, 0);
          }
        }}
        onGoToCreateProfile={() => setScreen('createProfile')}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <DataProvider>
          <AppContent />
        </DataProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
