import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, ActivityIndicator, AppState, AppStateStatus, View, LogBox } from 'react-native';
LogBox.ignoreLogs(['expo-notifications: Android Push notifications']);
import { NavigationContainer } from '@react-navigation/native';
import CryptoJS from 'crypto-js';
import CreateProfileScreen from './src/screens/CreateProfileScreen';
import SignInScreen from './src/screens/SignInScreen';
import PinUnlockScreen from './src/screens/PinUnlockScreen';
import MainTabs from './src/navigation/MainTabs';
import { loadProfilesIndex } from './src/storage';
import { hasPinSetUp } from './src/pin';
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

type Screen = 'loading' | 'createProfile' | 'signIn' | 'home' | 'locked';

function AppContent() {
  const { colors } = useTheme();
  const { loadModel, clearModel } = useData();
  const [screen, setScreen] = useState<Screen>('loading');
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [derivedKey, setDerivedKey] = useState<CryptoJS.lib.WordArray | null>(null);
  const [remoteRevokeNotice, setRemoteRevokeNotice] = useState<string | null>(null);

  const screenRef = useRef<Screen>('loading');
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
      const profiles = await loadProfilesIndex();
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

  async function lockIfPinIsSetUp() {
    if (isAutoLockSuppressed()) return;
    const username = usernameRef.current;
    if (screenRef.current !== 'home' || !username) return;
    const pinIsSetUp = await hasPinSetUp(username);
    if (pinIsSetUp) {
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
      lockIfPinIsSetUp();
    }, timeoutMs);
  }

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        lockIfPinIsSetUp();
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
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy2, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (screen === 'locked' && currentUsername && derivedKey) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy2 }}>
        <PinUnlockScreen
          username={currentUsername}
          onUnlocked={() => setScreen('home')}
          onUsePasswordInstead={handleFullSignOut}
        />
      </SafeAreaView>
    );
  }

  if (screen === 'home' && currentUsername && derivedKey) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.navy2 }} onStartShouldSetResponderCapture={() => { resetIdleTimer(); return false; }}>
        <NavigationContainer>
          <MainTabs
            username={currentUsername}
            onSignOut={handleFullSignOut}
            onLock={() => setScreen('locked')}
          />
        </NavigationContainer>
      </View>
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
            setScreen('home');
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
    <ThemeProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </ThemeProvider>
  );
}
