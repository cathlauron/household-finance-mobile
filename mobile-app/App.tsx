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
import PinUnlockScreen from './src/screens/PinUnlockScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import IntroScreen from './src/screens/IntroScreen';
import RootStack from './src/navigation/RootStack';
import { loadProfilesIndex } from './src/storage';
import { hasPinSetUp } from './src/pin';
import { getBiometricState } from './src/biometrics';
import { getAutoLockMinutes, DEFAULT_AUTO_LOCK_MINUTES, subscribeToAutoLockMinutes } from './src/autoLock';
import { isAutoLockSuppressed } from './src/autoLockSuppress';
import { ThemeProvider, useTheme } from './src/ThemeContext';
import { DataProvider, useData } from './src/DataContext';
import { getCurrentFirebaseUser, signOutFirebase } from './src/authFirebase';
import { rescheduleBillNotifications } from './src/pushNotifications';
import {
  registerDeviceSession,
  deleteDeviceSession,
  subscribeToDeviceSession,
  updateDeviceHeartbeat,
} from './src/sessions';

type Screen = 'loading' | 'createProfile' | 'signIn' | 'home' | 'locked' | 'onboarding';

function AppContent() {
  const { colors } = useTheme();
  const { loadModel, clearModel } = useData();
  const [screen, setScreen] = useState<Screen>('loading');
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [derivedKey, setDerivedKey] = useState<CryptoJS.lib.WordArray | null>(null);
  const [remoteRevokeNotice, setRemoteRevokeNotice] = useState<string | null>(null);

  const screenRef = useRef<Screen>('loading');

  useEffect(() => {
    screenRef.current = screen;
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
      const [profiles] = await Promise.all([loadProfilesIndex(), minDelay]);
      setScreen(profiles.length ? 'signIn' : 'createProfile');
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
      await deleteDeviceSession(user.uid, deviceId).catch(() => {});
    }
    currentDeviceIdRef.current = null;

    try {
      await signOutFirebase();
    } catch (e) {
      return;
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
          onSignOut={handleFullSignOut}
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
          onFinish={() => setScreen('home')}
        />
      </SafeAreaView>
    );
  }

  if (screen === 'createProfile') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy2 }}>
        <CreateProfileScreen
          onProfileCreated={(username, key) => {
            setRemoteRevokeNotice(null);
            setCurrentUsername(username);
            setDerivedKey(key);
            loadModel(username, key);
            const user = getCurrentFirebaseUser();
            if (user) {
              registerAndListenDeviceSession(user.uid).catch(() => {});
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
        onSignedIn={(username, key, initialModel, profile, householdKey) => {
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
            registerAndListenDeviceSession(user.uid).catch(() => {});
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
