// ============================================================
// Household Finance App — Firebase connection (Checkpoint 9.1)
// ============================================================
// This file just opens the connection to your Firebase project.
// It doesn't read or write any real data on its own — other
// files (built in later checkpoints) will import `db` from here
// whenever they need to save or load shared household data.
//
// These config values aren't secret — they only say WHICH
// Firebase project to talk to. Real protection comes from
// Firestore's security rules (set up properly in a later
// checkpoint), not from hiding these values.
// ============================================================

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCWsGkEtWWyub10M4u3grF6NjruZf_O0yA',
  authDomain: 'household-finance-mobile.firebaseapp.com',
  projectId: 'household-finance-mobile',
  storageBucket: 'household-finance-mobile.firebasestorage.app',
  messagingSenderId: '918919586573',
  appId: '1:918919586573:web:9627a139c9db9bdf508644',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);