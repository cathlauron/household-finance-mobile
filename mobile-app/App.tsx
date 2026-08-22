import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, ActivityIndicator, AppState, AppStateStatus, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import CryptoJS from 'crypto-js';
import CreateProfileScreen from './src/screens/CreateProfileScreen';
import SignInScreen from './src/screens/SignInScreen';
import PinUnlockScreen from './src/screens/PinUnlockScreen';
import MainTabs from './src/navigation/MainTabs';
import { loadProfilesIndex } from './src/storage';
import { hasPinSetUp } from './src/pin';
import { getAutoLockMinutes, DEFAULT_AUTO_LOCK_MINUTES } from './src/autoLock';
import { ThemeProvider, useTheme } from './src/ThemeContext';

type Screen = 'loading' | 'createProfile' | 'signIn' | 'home' | 'locked';

function AppContent() {
  const { colors } = useTheme();
  const [screen, setScreen] = useState<Screen>('loading');
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [derivedKey, setDerivedKey] = useState<CryptoJS.lib.WordArray | null>(null);

  const screenRef = useRef<Screen>('loading');
  const usernameRef = useRef<string | null>(null);
  const autoLockMinutesRef = useRef<number>(DEFAULT_AUTO_LOCK_MINUTES);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  async function lockIfPinIsSetUp() {
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

  function handleFullSignOut() {
    clearIdleTimer();
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
          onUsePassphraseInstead={handleFullSignOut}
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
            setCurrentUsername(username);
            setDerivedKey(key);
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
        onSignedIn={(username, key) => {
          setCurrentUsername(username);
          setDerivedKey(key);
          setScreen('home');
        }}
        onGoToCreateProfile={() => setScreen('createProfile')}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}