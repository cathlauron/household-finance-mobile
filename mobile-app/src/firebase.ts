// src/firebase.ts
//
// Connects the app to our Firebase project (the cloud "filing cabinet" set
// up in Checkpoint 9.1a). This file only opens the connection - it does not
// change how data is encrypted, and does not yet send or receive any real
// data. That comes in Checkpoint 9.2a.
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
// @ts-ignore - getReactNativePersistence exists at runtime in this Firebase
// version but its TypeScript types aren't resolving cleanly here. This is a
// known Firebase/React Native quirk, not a real bug - safe to ignore.
import { initializeAuth, getReactNativePersistence, getAuth, Auth, connectAuthEmulator } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Set this to true to connect to a LOCAL Firebase Emulator (fake, throwaway
// Auth + Firestore running on this same computer) instead of the real
// production Firebase project. Used for automated testing (Maestro flows)
// so tests never touch or risk real account data. Must be false for normal
// day-to-day development and for any real device testing.
const USE_FIREBASE_EMULATOR = true;

// "10.0.2.2" is a special fixed IP address that ONLY works from inside an
// Android emulator (AVD, via Android Studio) - it means "the computer this
// emulator is running on." "localhost" would NOT work here, because inside
// the emulator, "localhost" means the emulator's own operating system, not
// your PC. If you later test on a REAL physical Android phone instead of
// the emulator, this needs to change to your PC's real WiFi IP address
// (find it via `ipconfig`, look for "IPv4 Address").
const EMULATOR_HOST = "10.0.2.2";

const firebaseConfig = {
  apiKey: "AIzaSyCWsGkEtWWyub10M4u3grF6NjruZf_O0yA",
  authDomain: "household-finance-mobile.firebaseapp.com",
  projectId: "household-finance-mobile",
  storageBucket: "household-finance-mobile.firebasestorage.app",
  messagingSenderId: "918919586573",
  appId: "1:918919586573:web:9627a139c9db9bdf508644",
};
// Prevents a harmless "Firebase app already exists" error that can happen
// during development if this file gets loaded twice by Metro's fast-refresh.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Sets up Firebase Auth so it remembers a signed-in user between app opens
// (via AsyncStorage), instead of signing them out every time the app closes.
// The try/catch below exists for the same "loaded twice by Metro's
// fast-refresh" reason as the app/getApps() check above - initializeAuth()
// throws if it's called more than once for the same app, so on a
// fast-refresh reload we just fall back to getAuth() to grab the
// already-initialized instance instead of crashing.
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  auth = getAuth(app);
}

if (USE_FIREBASE_EMULATOR) {
  connectFirestoreEmulator(db, EMULATOR_HOST, 8080);
  connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`);
}

export { auth };
