import React, { useEffect, useState } from 'react';
import { SafeAreaView, ActivityIndicator } from 'react-native';
import CryptoJS from 'crypto-js';
import CreateProfileScreen from './src/screens/CreateProfileScreen';
import SignInScreen from './src/screens/SignInScreen';
import HomeScreen from './src/screens/HomeScreen';
import PinUnlockScreen from './src/screens/PinUnlockScreen';
import { loadProfilesIndex } from './src/storage';

type Screen = 'loading' | 'createProfile' | 'signIn' | 'home' | 'locked';

export default function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [derivedKey, setDerivedKey] = useState<CryptoJS.lib.WordArray | null>(null);

  useEffect(() => {
    (async () => {
      const profiles = await loadProfilesIndex();
      setScreen(profiles.length ? 'signIn' : 'createProfile');
    })();
  }, []);

  function handleFullSignOut() {
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
      <SafeAreaView style={{ flex: 1 }}>
        <HomeScreen
          username={currentUsername}
          onSignOut={handleFullSignOut}
          onLock={() => setScreen('locked')}
        />
      </SafeAreaView>
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
