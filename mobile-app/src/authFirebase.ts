// src/authFirebase.ts
//
// Real Firebase Authentication (email + password) — Checkpoint A.2.
//
// This is separate from src/auth.ts (which handles username sanitizing for
// the existing local password system — that stays exactly as it is).
// This file is the NEW layer: a real, server-checked login that will be
// required before the app can read/write Firestore at all, closing the
// "knowing the link code is enough" gap from Phase 9.
//
// Nothing in the app calls these functions yet — that wiring happens in
// Checkpoint A.3 (Sign In / Create Profile screens).

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { auth } from "./firebase";

// Creates a brand-new Firebase account with this email + password.
// Throws a Firebase error (e.g. "email already in use", "weak password")
// if it fails — the calling screen is responsible for showing a friendly
// message based on that error.
export async function createFirebaseAccount(
  email: string,
  password: string
): Promise<User> {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
}

// Signs in to an existing Firebase account with this email + password.
// Throws a Firebase error (e.g. "wrong password", "no account with this
// email") if it fails.
export async function signInWithFirebase(
  email: string,
  password: string
): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

// Signs the current Firebase account out.
export async function signOutFirebase(): Promise<void> {
  await firebaseSignOut(auth);
}

// Returns the currently signed-in Firebase user, or null if no one is
// signed in right now. Useful for a quick, one-time check.
export function getCurrentFirebaseUser(): User | null {
  return auth.currentUser;
}

// Subscribes to sign-in/sign-out changes over time (e.g. so the app can
// automatically show the sign-in screen if the user gets signed out).
// Call the returned function to unsubscribe when no longer needed.
export function subscribeToAuthChanges(
  callback: (user: User | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}
