import { wipeQuickUnlock, saveFingerprintCopyIfPossible, resetPinFailures } from './src/quickUnlock';
import { clearPinLock } from './src/pin';
import { clearAllReminders } from './src/pushNotifications';
import { goToMain } from './src/navigation/goToMain';
import { upsertRecentAccount, removeRecentAccount, loadRecentAccounts } from './src/recentAccounts';
import type { RecentAccount } from './src/recentAccounts';
import { isThisDeviceRevoked, getDeviceId } from './src/sessions';
import { saveSession, loadSession, clearSession, saveSessionKey, loadSessionKey, clearSessionKey } from './src/staySignedIn';
import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, ActivityIndicator, AppState, AppStateStatus, View, LogBox, StyleSheet, Linking } from 'react-native';
import ScreenSwap from './src/components/ScreenSwap';
import { joinCodeFromUrl, setPendingJoinCode, inviterFromUrl } from './src/joinLink';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Nunito_300Light,
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
} from '@expo-google-fonts/nunito';
import { setFontsReady } from './src/components/AppText';
import LoadingView from './src/components/LoadingView';
import { SavedToastHost, showSaved } from './src/components/SavedToast';
import { LeafTickHost } from './src/components/LeafTick';
import WelcomeScreen from './src/screens/WelcomeScreen';
import { markOnboardingCompleted } from './src/onboarding';
import GuestSetupScreen from './src/screens/GuestSetupScreen';
import GuestSaveSheet from './src/components/GuestSaveSheet';
import { GuestSetup, emptyGuestSetup, loadGuestSetup, saveGuestSetup, clearGuestSetup, guestModel } from './src/guest';
import BusyOverlay, { paintBusy } from './src/components/BusyOverlay';
import { textSizeLoaded } from './src/textSize';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
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
import LeafBackground from './src/components/LeafBackground';
import { triggerLeafTransition } from './src/leafTransition';
import { loadProfilesIndex, loadEncryptedProfileData, loadCachedHouseholdKey } from './src/storage';
import { unwrapHouseholdKey } from './src/household';
import type { ProfileIndexEntry } from './src/storage';
import { hasPinSetUp } from './src/pin';
import { deriveKey, decryptJSON } from './src/encryption';
import { sanitizeModelIds } from './src/mergeModels';
import type { HouseholdModel } from './src/types';
import { getBiometricState } from './src/biometrics';
import { getAutoLockMinutes, DEFAULT_AUTO_LOCK_MINUTES, subscribeToAutoLockMinutes, setAutoLockMinutes } from './src/autoLock';
import { isAutoLockSuppressed } from './src/autoLockSuppress';
import { StillTherePopup, PausedCover, AutoLockSheet } from './src/components/StillThere';
import { stillThereState } from './src/stillThereClock';
import HouseholdChanges from './src/components/HouseholdChanges';
import { ScreenPeelHost } from './src/screenPeel';
import WidgetSync, { clearWidgets } from './src/widgets/WidgetSync';
import { onActivity } from './src/activity';
import { closeOpenSwipeRows } from './src/components/SwipeableRow';
import { hideAmountsNow } from './src/hideAmounts';
import { ThemeProvider, useTheme } from './src/ThemeContext';
import { MoodThemeProvider } from './src/mood';
import { DataProvider, useData } from './src/DataContext';
import { getCurrentFirebaseUser, signOutFirebase, signInWithFirebase } from './src/authFirebase';
import { rescheduleBillNotifications } from './src/pushNotifications';
import {
  registerDeviceSession,
  deleteDeviceSession,
  subscribeToDeviceSession,
  updateDeviceHeartbeat,
} from './src/sessions';
LogBox.ignoreLogs(['expo-notifications: Android Push notifications']);

// Smoothness sweep 2026-10-26: one navigation theme for the whole app, made once. A new one
// on every redraw (every save) made everything that reads it redraw too.
const NAV_THEME = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: 'transparent' } };

type Screen = 'loading' | 'createProfile' | 'signIn' | 'home' | 'locked' | 'onboarding' | 'intro' | 'switcher' | 'welcome' | 'setup' | 'guest' | 'guestSignUp';


function AppContent() {
  const { colors } = useTheme();
  const { loadModel, clearModel, waitForSaves, startGuest, guestRequest, model: currentModel, goOnline, isOnline } = useData();
  // Version 2.1 (open from the phone first): the account opened from the phone's copy and
  // still needs its quiet online sign-in (retried when the connection comes back).
  const pendingReconcileRef = useRef<{ username: string; creds: { email: string; password: string } } | null>(null);
  // Version 3 (new start): answers from Welcome + the four questions, before any account.
  const [guestSetup, setGuestSetup] = useState<GuestSetup>(emptyGuestSetup());
  function updateGuestSetup(next: GuestSetup) {
    setGuestSetup(next);
    saveGuestSetup(next);
  }
  function enterGuestHome(setup: GuestSetup) {
    const next = { ...setup, step: 'home' as const };
    updateGuestSetup(next);
    startGuest(guestModel(next), { name: next.name.trim(), helpWith: next.helpWith });
    setScreen('guest');
  }
  const [introFromSignIn, setIntroFromSignIn] = useState(false);
  const [screen, setScreen] = useState<Screen>('loading');
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [derivedKey, setDerivedKey] = useState<CryptoJS.lib.WordArray | null>(null);
  const [remoteRevokeNotice, setRemoteRevokeNotice] = useState<string | null>(null);
  // Quick unlock (Step 4b)
  const [recentAccounts, setRecentAccounts] = useState<RecentAccount[]>([]);
  // Shown over the account switcher while an unlock is worked out on the phone (it can
  // take a few seconds offline), so the screen never looks frozen.
  const [unlocking, setUnlocking] = useState(false);
  const [autoSignIn, setAutoSignIn] = useState<{ email: string; username: string; password: string } | null>(null);
  const [signInPrefillUsername, setSignInPrefillUsername] = useState<string | undefined>(undefined);
  // Sign in once: true while a remembered LINKED account signs in quietly behind the
  // opening screen (an unlinked one opens offline straight away instead).
  const [silentSignIn, setSilentSignIn] = useState(false);
  // Version 3 (M2): the opening shows changing words while a saved account unlocks.
  const [openingUnlocking, setOpeningUnlocking] = useState(false);
  // Version 3 (M3): sign-in opened from the account list ("Use password instead") gets
  // "‹ Back to accounts", and the phone's Back button returns to the list too.
  const [signInFromSwitcher, setSignInFromSwitcher] = useState(false);
  // Resolves when the opening animation has had its ~3 seconds, so a quick quiet
  // sign-in never cuts the animation short.
  const introDoneRef = useRef<Promise<void>>(new Promise((resolve) => setTimeout(resolve, 3100)));
  // Version 2.1: the opening logo draws on the main thread for about 1.3 s; unlocking data
  // waits for it, so the drawing isn't frozen half-way (see IntroScreen).
  const introDrawnRef = useRef<Promise<void>>(new Promise((resolve) => setTimeout(resolve, 1300)));

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
  // Payday nudge: which person's Income page to open ('' = the Income page itself).
  const pendingDeepLinkPayday = useRef<string | null>(null);
  // Envelope alert -> Envelopes page; month-end summary -> the close-out report.
  const pendingDeepLinkPage = useRef<'envelopeAlert' | 'closeOut' | null>(null);
  // Version 2.2: an invite link (financeflow://join/ABC123) opens Household, which joins.
  const pendingJoinOpen = useRef(false);
  // Mockup W2: a widget's Say it / + Add (financeflow://voice, financeflow://add).
  const pendingQuickAdd = useRef<'voice' | 'add' | null>(null);
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
    if (data?.type === 'paydayNudge') {
      pendingDeepLinkPayday.current = typeof data.personId === 'string' ? data.personId : '';
      flushPendingDeepLink();
    }
    if (data?.type === 'envelopeAlert' || data?.type === 'closeOut') {
      pendingDeepLinkPage.current = data.type;
      flushPendingDeepLink();
    }
  }

  function flushPendingDeepLink() {
    // Only once signed in and unlocked (it waits through the lock screen).
    if (pendingQuickAdd.current && navigationRef.isReady() && screenRef.current === 'home') {
      const kind = pendingQuickAdd.current;
      pendingQuickAdd.current = null;
      const now = Date.now();
      goToMain(navigationRef, { screen: 'Transactions', params: kind === 'voice' ? { addNonce: now, sayItNonce: now } : { addNonce: now } });
    }
    if (pendingJoinOpen.current && navigationRef.isReady() && screenRef.current === 'home') {
      pendingJoinOpen.current = false;
      navigationRef.navigate('Profile', undefined);
    }
    if (pendingDeepLinkPage.current && navigationRef.isReady()) {
      const page = pendingDeepLinkPage.current;
      pendingDeepLinkPage.current = null;
      if (page === 'envelopeAlert') navigationRef.navigate('Envelopes', undefined);
      else navigationRef.navigate('Report', { id: 'monthly', backTitle: 'Home' });
    }
    if (pendingDeepLinkPayday.current !== null && navigationRef.isReady()) {
      const personId = pendingDeepLinkPayday.current;
      pendingDeepLinkPayday.current = null;
      if (personId) navigationRef.navigate('IncomePerson', { personId });
      else navigationRef.navigate('Income', undefined);
    }
    if (!pendingDeepLinkBillId.current) return;
    if (!navigationRef.isReady()) return;
    const billId = pendingDeepLinkBillId.current;
    pendingDeepLinkBillId.current = null;
    goToMain(navigationRef, { openBillId: billId });
  }

  // Version 2.2: invite links. The code waits (joinLink.ts) until Household picks it up:
  // straight away when signed in, or after signing in.
  useEffect(() => {
    const handle = (url: string | null) => {
      const quick = /^financeflow:\/\/(voice|add)\b/i.exec(url || '');
      if (quick) {
        pendingQuickAdd.current = quick[1].toLowerCase() as 'voice' | 'add';
        flushPendingDeepLink();
        return;
      }
      const code = joinCodeFromUrl(url);
      if (!code) return;
      setPendingJoinCode(code, inviterFromUrl(url));
      pendingJoinOpen.current = true;
      flushPendingDeepLink();
    };
    Linking.getInitialURL().then(handle).catch(() => {});
    const sub = Linking.addEventListener('url', (e) => handle(e.url));
    return () => sub.remove();
  }, []);

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
  // Version 2.2 (canvas S1-S3): "Are you still there?", the cover after no answer, and the
  // Auto-lock sheet it can open.
  // When someone last touched the app. Checked every few seconds (a single long timer
  // doesn't survive the screen turning off), and on coming back to the app.
  const lastTouchRef = useRef(Date.now());
  const [stillThereOpen, setStillThereOpen] = useState(false);
  const [pausedCover, setPausedCover] = useState(false);
  const [autoLockSheetOpen, setAutoLockSheetOpen] = useState(false);
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
  ): Promise<{ key: CryptoJS.lib.WordArray; model: HouseholdModel; profile: ProfileIndexEntry; householdKey?: CryptoJS.lib.WordArray } | null> {
    try {
      const profiles = await loadProfilesIndex();
      const profile = profiles.find((p) => p.username === username);
      if (!profile) return null;
      const encrypted = await loadEncryptedProfileData(username);
      if (!encrypted) return null;
      // Version 2.2 (Cath chose "best of both"): the remembered account's unlocked key
      // skips the slow password-to-key step. Used only if it really opens the data;
      // otherwise it's wiped and the key is made from the password as before.
      let key: CryptoJS.lib.WordArray | null = null;
      let model: HouseholdModel | null = null;
      const rememberedKey = await loadSessionKey(username, profile.salt);
      if (rememberedKey) {
        try {
          model = sanitizeModelIds(decryptJSON<HouseholdModel>(rememberedKey, encrypted));
          key = rememberedKey;
        } catch (e) {
          clearSessionKey().catch(() => {});
        }
      }
      if (!key || !model) {
        key = deriveKey(creds.password, profile.salt);
        model = sanitizeModelIds(decryptJSON<HouseholdModel>(key, encrypted));
      }
      if (profile.householdId) {
        // Version 2.1: a linked household opens from the phone too, using this phone's
        // password-locked copy of the household key (kept since the last online open).
        const cached = await loadCachedHouseholdKey(username);
        if (!cached || cached.householdId !== profile.householdId) return null;
        const householdKey = unwrapHouseholdKey(cached.wrappedKey, key);
        return { key, model, profile, householdKey };
      }
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
      clearSession().catch(() => {});
      clearAllReminders().catch(() => {}); // SEC-2
      clearModel();
      setCurrentUsername(null);
      setDerivedKey(null);
      setRemoteRevokeNotice('You were signed out from another device.');
      setScreen('signIn');
      return;
    }
    registerAndListenDeviceSession(user.uid).catch(() => {});
    pendingReconcileRef.current = null;
    // Signed in: now the household's live link can start (see DataContext.goOnline).
    goOnline();
  }

  // Version 2.2: keeps the remembered account's unlocked key next to its saved
  // sign-in, so the next open skips the slow step (see staySignedIn.ts).
  async function rememberSessionKey(username: string, key: CryptoJS.lib.WordArray) {
    const profiles = await loadProfilesIndex();
    const profile = profiles.find((p) => p.username === username);
    if (profile?.salt) await saveSessionKey(username, profile.salt, key);
  }

  // Opens an account that was unlocked offline (unlinked profiles only). Used by the
  // account switcher and by "sign in once" when the app starts.
  function enterWithOfflineUnlock(
    creds: { email: string; username: string; password: string },
    offline: { key: CryptoJS.lib.WordArray; model: HouseholdModel; profile: ProfileIndexEntry; householdKey?: CryptoJS.lib.WordArray }
  ) {
    setRemoteRevokeNotice(null);
    setCurrentUsername(creds.username);
    setDerivedKey(offline.key);
    loadModel(
      creds.username,
      offline.key,
      offline.householdKey
        ? { profile: offline.profile, initialModel: offline.model, householdId: offline.profile.householdId, householdKey: offline.householdKey }
        : { profile: offline.profile, initialModel: offline.model },
      { deferNotifications: true, offlineStart: !!offline.householdKey }
    ).catch(() => {});
    recordRecentAccount(creds.username, undefined, undefined, offline.model.avatars?.[creds.username]).catch(() => {});
    // The key is kept only once the sign-in itself is saved (review fix: in that order).
    saveSession(creds)
      .then(() => saveSessionKey(creds.username, offline.profile.salt, offline.key))
      .catch(() => {});
    setScreen('home');
    setTimeout(() => {
      rescheduleBillNotifications(offline.model).catch(() => {});
    }, 0);
    pendingReconcileRef.current = { username: creds.username, creds };
    reconcileOfflineUnlockWithServer(creds.username, creds).catch(() => {});
  }

  // Opened offline: try the quiet sign-in again as soon as the connection is back.
  useEffect(() => {
    const p = pendingReconcileRef.current;
    if (isOnline && p && usernameRef.current === p.username) {
      reconcileOfflineUnlockWithServer(p.username, p.creds).catch(() => {});
    }
  }, [isOnline]);

  async function recordRecentAccount(
    username: string,
    uid: string | undefined,
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
    clearSession().catch(() => {});
    clearAllReminders().catch(() => {}); // SEC-2
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
      // Redesign: long enough for the opening animation (logo draws, bar fills once
      // and fades) to finish before moving on.
      const [profiles, recents, saved] = await Promise.all([loadProfilesIndex(), loadRecentAccounts(), loadSession()]);
      autoLockMinutesRef.current = await getAutoLockMinutes();
      // Sign in once: a remembered account opens without asking for the password.
      if (saved && profiles.some((p) => p.username === saved.username)) {
        setOpeningUnlocking(true); // words under the little leaf while it unlocks
        await introDrawnRef.current;
        const offline = await attemptOfflineUnlock(saved.username, saved);
        if (offline) {
          await introDoneRef.current;
          enterWithOfflineUnlock(saved, offline);
          return;
        }
        // Linked household: sign in quietly behind the opening screen.
        setRemoteRevokeNotice(null);
        setSignInPrefillUsername(undefined);
        setAutoSignIn(saved);
        setSilentSignIn(true);
        return;
      }
      if (saved) {
        clearSession().catch(() => {});
        clearAllReminders().catch(() => {}); // SEC-2
      }
      await introDoneRef.current;
      if (!profiles.length) {
        // Version 3: brand-new phone: Welcome, four questions, then Home without an account
        // (picks up where they left off if the app was closed part-way).
        const saved = await loadGuestSetup();
        if (saved?.step === 'home') {
          enterGuestHome(saved);
        } else {
          setGuestSetup(saved ?? emptyGuestSetup());
          setScreen(saved?.step === 'setup' ? 'setup' : 'welcome');
        }
      } else if (recents.length) {
        setRecentAccounts(recents);
        setScreen('switcher');
      } else {
        setScreen('signIn');
      }
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
    // Auto-lock set to Never (the default since "sign in once").
    if (autoLockMinutesRef.current <= 0) return;
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

    if (autoLockMinutesRef.current <= 0) return;
    const timeoutMs = autoLockMinutesRef.current * 60 * 1000;
    idleTimerRef.current = setTimeout(() => {
      lockIfConfigured();
    }, timeoutMs);
  }

  function noteTouch() {
    lastTouchRef.current = Date.now();
    resetIdleTimer();
  }
  useEffect(() => onActivity(() => noteTouch()), []);

  // Version 2.2 fix (Cath: it never showed): with Auto-lock off, 5 minutes without a
  // touch asks "Are you still there?". That includes the phone's screen going dark for 5
  // minutes or more: it asks as soon as the app is opened again.
  const stillOpenRef = useRef(false);
  stillOpenRef.current = stillThereOpen || pausedCover || autoLockSheetOpen;
  // H-42 (Cath, 2026-10-29): the 5 + 1 minutes keep counting while the app is in the
  // background. Back after 6 minutes or more: the amounts are already hidden.
  const [stillThereDeadline, setStillThereDeadline] = useState<number | undefined>(undefined);
  function checkStillThere() {
    if (screenRef.current !== 'home' || stillOpenRef.current) return;
    if (autoLockMinutesRef.current > 0 || AppState.currentState !== 'active') return;
    const st = stillThereState(lastTouchRef.current, Date.now());
    if (st.kind === 'hide') {
      hideAmountsNow();
      setPausedCover(true);
    } else if (st.kind === 'ask') {
      setStillThereDeadline(st.deadline);
      setStillThereOpen(true);
    }
  }
  useEffect(() => {
    if (screen !== 'home') return;
    lastTouchRef.current = Date.now();
    const t = setInterval(checkStillThere, 10000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        lockIfConfigured();
      }
      if (nextState === 'active') {
        resetIdleTimer();
        checkStillThere();
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
    if (screen !== 'signIn') setSignInFromSwitcher(false);
  }, [screen]);

  useEffect(() => {
    if (screen === 'home') {
      resetIdleTimer();
      flushPendingDeepLink();
    } else {
      clearIdleTimer();
      setStillThereOpen(false);
      setPausedCover(false);
      setAutoLockSheetOpen(false);
    }
    return () => clearIdleTimer();
  }, [screen]);

  async function handleFullSignOut() {
    clearWidgets();
    // Read these first: the username is cleared later in this function.
    const signedOutUsername = usernameRef.current;
    // Version 2.2: let the last change finish saving first.
    await waitForSaves();
    const keepRecent = keepRecentOnSignOutRef.current;
    keepRecentOnSignOutRef.current = false;
    if (signedOutUsername && !keepRecent) {
      removeRecentAccount(signedOutUsername).catch(() => {});
      wipeQuickUnlock(signedOutUsername).catch(() => {});
    }
    // Log out always means the password is asked for next time.
    clearSession().catch(() => {});
    clearAllReminders().catch(() => {}); // SEC-2
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

  // Switches away from the current account WITHOUT forgetting it: keeps its
  // recent-accounts entry and quick-unlock vault copies intact (unlike
  // handleFullSignOut, which wipes them), so it can still be unlocked with
  // fingerprint/PIN from the switcher afterward. Marks only this device's
  // own session document signedOutAt (same as a normal sign-out, so Active
  // Devices reads it correctly), then reloads the recent-accounts list
  // fresh and lands back on the switcher instead of a blank sign-in form.
  async function handleSwitchAccount() {
    clearWidgets();
    clearIdleTimer();
    // Version 2.2: let the last change finish saving first (saving now carries on in the
    // background after a form closes).
    await waitForSaves();
    // The next launch shows the account switcher instead of opening this account.
    clearSession().catch(() => {});
    clearAllReminders().catch(() => {}); // SEC-2
    // 1. Unsubscribe listener FIRST (same ordering as handleFullSignOut)
    if (deviceSessionUnsubRef.current) {
      deviceSessionUnsubRef.current();
      deviceSessionUnsubRef.current = null;
    }
    // 2. Mark this device's own session document signed out BEFORE
    // signing out of Firebase — the write needs request.auth to still
    // match this account's uid, same reasoning as handleFullSignOut.
    const user = getCurrentFirebaseUser();
    const deviceId = currentDeviceIdRef.current;
    if (user && deviceId) {
      await Promise.race([
        deleteDeviceSession(user.uid, deviceId),
        new Promise((resolve) => setTimeout(resolve, 1000)),
      ]).catch(() => {});
    }
    currentDeviceIdRef.current = null;

    try {
      await signOutFirebase();
    } catch (e) {
      // Continue switching locally even if the network call fails.
    }
    clearModel();
    setCurrentUsername(null);
    setDerivedKey(null);
    const recents = await loadRecentAccounts();
    setRecentAccounts(recents);
    setScreen('switcher');
  }
  // H.5: remembers which screen/tab was showing, so the leaf transition
  // only plays when it actually changes (not on sheets, modals, etc.).
  const lastRouteNameRef = useRef<string | null>(null);

  function handleNavReady() {
    lastRouteNameRef.current = navigationRef.getCurrentRoute()?.name ?? null;
    flushPendingDeepLink();
  }

  // Redesign: switching tabs is a gust of wind for the falling leaves behind the app.
  // Moving right along the tab bar blows them left (about 150px per tab), moving left
  // blows them right. Opening Settings is a small gust; other pages and sheets none.
  function handleNavStateChange() {
    const name = navigationRef.getCurrentRoute()?.name ?? null;
    const prevName = lastRouteNameRef.current;
    // Version 2.2 (Cath): a row left open on swipe-to-delete closes when the screen changes.
    if (name !== prevName) closeOpenSwipeRows();
    if (name && prevName && name !== prevName) {
      const TAB_ORDER = ['Home', 'Transactions', 'To-Pay', 'Plan'];
      const from = TAB_ORDER.indexOf(prevName);
      const to = TAB_ORDER.indexOf(name);
      if (from >= 0 && to >= 0) {
        triggerLeafTransition(-150 * (to - from));
      } else if (name === 'Settings') {
        triggerLeafTransition(-60);
      } else if (prevName === 'Settings' && to >= 0) {
        triggerLeafTransition(60);
      }
    }
    lastRouteNameRef.current = name;
  }

  function renderScreen(): React.ReactElement {
  if (screen === 'loading') {
    return (
      <View style={{ flex: 1 }}>
        {silentSignIn && autoSignIn && (
          // Sign in once (linked households): the normal sign-in runs out of sight
          // behind the opening screen. It never shows unless it fails.
          <View style={{ ...StyleSheet.absoluteFillObject, opacity: 0 }} pointerEvents="none">
            {renderSignIn(true)}
          </View>
        )}
        <View style={StyleSheet.absoluteFill}>
          <IntroScreen unlocking={openingUnlocking} />
        </View>
      </View>
    );
  }

  if (screen === 'locked' && currentUsername && derivedKey) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
        <PinUnlockScreen
          username={currentUsername}
          onUnlocked={(newUsername, newKey) => {
            if (newUsername && newKey) {
              // Unlocked into a different account with only its password: there is no
              // email to remember, so the next launch asks once.
              if (newUsername !== currentUsername) {
                clearSession().catch(() => {});
                clearAllReminders().catch(() => {}); // SEC-2
              }
              setCurrentUsername(newUsername);
              setDerivedKey(newKey);
              loadModel(newUsername, newKey);
            }
            setScreen('home');
          }}
          onSignOut={() => {
            handleSwitchAccount();
          }}
        />
      </SafeAreaView>
    );
  }

  if (screen === 'home' && currentUsername && derivedKey) {
    return (
      <View style={{ flex: 1, backgroundColor: 'transparent' }} onStartShouldSetResponderCapture={() => { noteTouch(); return false; }}>
        <NavigationContainer
          ref={navigationRef}
          theme={NAV_THEME}
          onReady={handleNavReady}
          onStateChange={handleNavStateChange}
        >
          <RootStack
            username={currentUsername}
            onSignOut={handleFullSignOut}
            onSwitchAccount={handleSwitchAccount}
            onLock={() => setScreen('locked')}
          />
        </NavigationContainer>
        {/* Mockup K2e: the Dark mode screen peel (Settings › Appearance), above every page. */}
        <ScreenPeelHost />
        {/* Mockup W2: keeps the home screen widgets up to date (installed Android app only). */}
        <WidgetSync />
        {/* H-51 (canvas F2 + F3): what another household member changed, on opening / coming back. */}
        <HouseholdChanges />
        <StillTherePopup
          visible={stillThereOpen}
          deadline={stillThereDeadline}
          onHere={() => {
            setStillThereOpen(false);
            noteTouch();
          }}
          onAutoLock={() => {
            setStillThereOpen(false);
            setAutoLockSheetOpen(true);
          }}
          onTimeout={() => {
            setStillThereOpen(false);
            hideAmountsNow();
            setPausedCover(true);
          }}
        />
        <PausedCover
          visible={pausedCover}
          onShow={async () => {
            setPausedCover(false);
            const username = usernameRef.current;
            if (!username) return;
            const [pin, bio] = await Promise.all([hasPinSetUp(username), getBiometricState(username)]);
            if (pin || bio === 'ENABLED') setScreen('locked');
            else noteTouch();
          }}
        />
        <AutoLockSheet
          visible={autoLockSheetOpen}
          username={currentUsername}
          onClose={() => {
            setAutoLockSheetOpen(false);
            noteTouch();
          }}
        />
      </View>
    );
  }

  if (screen === 'onboarding' && currentUsername && derivedKey) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
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

  if (screen === 'welcome') {
    return (
      <WelcomeScreen
        onStart={() => {
          updateGuestSetup({ ...guestSetup, step: 'setup' });
          setScreen('setup');
        }}
        onSignIn={() => setScreen('signIn')}
      />
    );
  }

  if (screen === 'setup') {
    return (
      <GuestSetupScreen
        setup={guestSetup}
        onChange={updateGuestSetup}
        onBackToWelcome={() => {
          updateGuestSetup({ ...guestSetup, step: 'welcome' });
          setScreen('welcome');
        }}
        onDone={enterGuestHome}
      />
    );
  }

  if (screen === 'guest') {
    return (
      <View style={{ flex: 1, backgroundColor: 'transparent' }}>
        <NavigationContainer
          ref={navigationRef}
          theme={NAV_THEME}
        >
          <RootStack
            username=""
            onSignOut={() => {}}
            onSwitchAccount={() => setScreen('signIn')}
            onLock={() => {}}
            onGuestSave={() => setScreen('guestSignUp')}
          />
        </NavigationContainer>
        <ScreenPeelHost />
        <GuestSaveSheet onContinue={() => setScreen('guestSignUp')} />
      </View>
    );
  }

  if (screen === 'guestSignUp') {
    const pendingEntry = guestRequest?.entry ?? null;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
        <CreateProfileScreen
          guest={{
            name: guestSetup.name.trim(),
            model: guestRequest?.model ?? currentModel ?? guestModel(guestSetup),
            entry: pendingEntry,
            onBack: () => setScreen('guest'),
          }}
          onProfileCreated={(username, key, credentials) => {
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
              saveFingerprintCopyIfPossible({ email: credentials.email, username, password: credentials.password }).catch(() => {});
              saveSession({ email: credentials.email, username, password: credentials.password })
                .then(() => rememberSessionKey(username, key))
                .catch(() => {});
            }
            // "Does anyone else use your phone?" Yes: lock after a minute away.
            if (guestSetup.othersUsePhone) setAutoLockMinutes(1).catch(() => {});
            markOnboardingCompleted(username).catch(() => {});
            clearGuestSetup();
            setGuestSetup(emptyGuestSetup());
            setScreen('home');
            setTimeout(() => showSaved(pendingEntry ? `Signed in. Your ${pendingEntry} is saved.` : 'Signed in. Finance Flow is saved.'), 600);
          }}
          onGoToSignIn={() => setScreen('signIn')}
        />
      </SafeAreaView>
    );
  }

    if (screen === 'intro') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
        <IntroSlidesScreen
          onDone={() => setScreen('createProfile')}
          onBack={introFromSignIn ? () => { setIntroFromSignIn(false); setScreen('signIn'); } : undefined}
          onSignIn={() => { setIntroFromSignIn(false); setScreen('signIn'); }}
        />
      </SafeAreaView>
    );
  }
  
    if (screen === 'switcher') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
        {silentSignIn && autoSignIn && (
          <View style={{ ...StyleSheet.absoluteFillObject, opacity: 0 }} pointerEvents="none">
            {renderSignIn(true)}
          </View>
        )}
        <AccountSwitcherScreen
          accounts={recentAccounts}
          working={unlocking || (silentSignIn && !!autoSignIn)}
          onUnlocked={(creds) => {
            resetPinFailures(creds.username).catch(() => {});
            clearPinLock(creds.username).catch(() => {}); // SEC-5: a password sign-in lifts the PIN wait
            setUnlocking(true);
            (async () => {
              await paintBusy(); // let the unlocking animation appear first
              try {
                const offline = await attemptOfflineUnlock(creds.username, creds);
                if (offline) {
                  enterWithOfflineUnlock(creds, offline);
                  return;
                }
                // Version 2.2 (Cath: "unlocks, then a Signing in screen: double wait"): the
                // online sign-in runs out of sight behind this screen, which keeps showing
                // "Unlocking…". It only shows the sign-in screen if it fails.
                setRemoteRevokeNotice(null);
                setSignInPrefillUsername(undefined);
                setAutoSignIn(creds);
                setSilentSignIn(true);
              } finally {
                setUnlocking(false);
              }
            })();
          }}
          onUsePassword={(username) => {
            setAutoSignIn(null);
            setSignInPrefillUsername(username);
            setSignInFromSwitcher(true);
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
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
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
              saveSession({ email: credentials.email, username, password: credentials.password })
                .then(() => rememberSessionKey(username, key))
                .catch(() => {});
            }
            setScreen('onboarding');
          }}
          onGoToSignIn={() => setScreen('signIn')}
        />
      </SafeAreaView>
    );
  }

  return renderSignIn(false);
  }

  function renderSignIn(silent: boolean): React.ReactElement {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
<SignInScreen
        remoteRevokeNotice={remoteRevokeNotice}
        onClearRemoteRevokeNotice={() => setRemoteRevokeNotice(null)}
        initialUsername={signInPrefillUsername}
        autoSignIn={autoSignIn ?? undefined}
        onAutoSignInFailed={(username) => {
          wipeQuickUnlock(username).catch(() => {});
          clearSession().catch(() => {});
          clearAllReminders().catch(() => {}); // SEC-2
          setAutoSignIn(null);
          setSignInPrefillUsername(username);
          setRemoteRevokeNotice('Your saved sign-in is out of date. Sign in with your password.');
        }}
        silent={silent}
        onBackToAccounts={
          !silent && signInFromSwitcher
            ? () => {
                setSignInFromSwitcher(false);
                setSignInPrefillUsername(undefined);
                setAutoSignIn(null);
                setRemoteRevokeNotice(null);
                loadRecentAccounts().then((recents) => {
                  setRecentAccounts(recents);
                  setScreen('switcher');
                });
              }
            : undefined
        }
        onSilentFailed={(username) => {
          // The quiet sign-in at launch didn't work (no connection, or the saved
          // password changed): show the normal sign-in screen, once.
          setSilentSignIn(false);
          setAutoSignIn(null);
          setSignInPrefillUsername(username);
          setRemoteRevokeNotice((prev) => prev ?? "Couldn't sign you in automatically. Check your connection and sign in.");
          setScreen('signIn');
        }}
        onSignedIn={async (username, key, initialModel, profile, householdKey, credentials) => {
          const viaQuickUnlock = autoSignIn !== null;
          // Don't cut the opening animation short.
          if (silent) await introDoneRef.current;
          setSilentSignIn(false);
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
                  clearSession().catch(() => {});
                  clearAllReminders().catch(() => {}); // SEC-2
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
          if (credentials) {
            saveSession({ email: credentials.email, username, password: credentials.password })
                .then(() => rememberSessionKey(username, key))
                .catch(() => {});
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
        onGoToCreateProfile={() => { setIntroFromSignIn(true); setScreen('welcome'); }}
      />
    </SafeAreaView>
  );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.navy2 }}>
      {screen !== 'loading' && <LeafBackground />}
      <ScreenSwap screenKey={screen}>{renderScreen()}</ScreenSwap>
      <SavedToastHost />
      <LeafTickHost />
    </View>
  );
}

export default function App() {
  // Redesign: load the rounded font (Nunito) before anything draws. See
  // src/components/AppText.tsx. If loading fails, the app still opens, in the
  // phone's normal font, rather than getting stuck.
  const [fontsLoaded, fontError] = useFonts({
    Nunito_300Light,
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
  });
  setFontsReady(fontsLoaded);
  // Wait for the saved Text size too, so text never jumps size on launch.
  const [textSizeReady, setTextSizeReady] = useState(false);
  useEffect(() => {
    textSizeLoaded.then(() => setTextSizeReady(true));
  }, []);
  if ((!fontsLoaded && !fontError) || !textSizeReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <DataProvider>
            <MoodThemeProvider>
              <AppContent />
            </MoodThemeProvider>
          </DataProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
