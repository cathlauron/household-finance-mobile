// src/firebase.ts
//
// Connects the app to our Firebase project (the cloud "filing cabinet" set
// up in Checkpoint 9.1a). This file only opens the connection — it does not
// change how data is encrypted, and does not yet send or receive any real
// data. That comes in Checkpoint 9.2a.

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

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
