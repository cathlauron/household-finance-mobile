import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, ActivityIndicator, AppState, AppStateStatus, View } from 'react-native';
import CryptoJS from 'crypto-js';
import CreateProfileScreen from './src/screens/CreateProfileScreen';
import SignInScreen from './src/screens/SignInScreen';
import HomeScreen from './src/screens/HomeScreen';
import PinUnlockScreen from './src/screens/PinUnlockScreen';
import { loadProfilesIndex } from './src/storage';
import { hasPinSetUp } from './src/pin';
import { getAutoLockMinutes, DEFAULT_AUTO_LOCK_MINUTES } from './src/autoLock';

type Screen = 'loading' | 'createProfile' | 'signIn' | 'home' | 'locked';

export default function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [derivedKey, setDerivedKey] = useState<CryptoJS.lib.WordArray | null>(null);

  // Refs mirror the state above so the AppState listener and the idle
  // timer (both set up once) always see the *current* values instead of
  // whatever they were when the listener/timer was first created.
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

  // Trigger 1: the app itself was switched away from (backgrounded).
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        lockIfPinIsSetUp();
      }
    });
    return () => subscription.remove();
  }, []);

  // Trigger 2: the idle stopwatch. Starts fresh whenever we land on the
  // home screen, and is fully stopped whenever we leave it.
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
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAF9', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (screen === 'locked' && currentUsername && derivedKey) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
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
      // onStartShouldSetResponderCapture fires on every tap anywhere in the
      // app, lets us reset the idle stopwatch, then returns false so the
      // tap still reaches whatever button/field was actually pressed.
      <View style={{ flex: 1 }} onStartShouldSetResponderCapture={() => { resetIdleTimer(); return false; }}>
        <SafeAreaView style={{ flex: 1 }}>
          <HomeScreen
            username={currentUsername}
            onSignOut={handleFullSignOut}
            onLock={() => setScreen('locked')}
          />
        </SafeAreaView>
      </View>
    );
  }

  if (screen === 'createProfile') {
    return (
      <SafeAreaView style={{ flex: 1 }}>
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
    <SafeAreaView style={{ flex: 1 }}>
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
