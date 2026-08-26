// src/firebase.ts
//
// Connects the app to our Firebase project (the cloud "filing cabinet" set
// up in Checkpoint 9.1a). This file only opens the connection — it does not
// change how data is encrypted, and does not yet send or receive any real
// data. That comes in Checkpoint 9.2a.

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// @ts-ignore — getReactNativePersistence exists at runtime in this Firebase
// version but its TypeScript types aren't resolving cleanly here. This is a
// known Firebase/React Native quirk, not a real bug — safe to ignore.
import { initializeAuth, getReactNativePersistence, getAuth, Auth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
// fast-refresh" reason as the app/getApps() check above — initializeAuth()
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
export { auth };
