// ============================================================
// Household Finance App — Shared data holder
// ============================================================
// Loads your decrypted data into memory once you're signed in
// or unlocked, and gives any screen a way to read it — and,
// eventually, save changes back — without every screen needing
// to know how to decrypt/encrypt or talk to storage itself.
// ============================================================

import React, { createContext, useContext, useRef, useState, ReactNode } from 'react';
import CryptoJS from 'crypto-js';
import type { HouseholdModel } from './types';
import { defaultModel } from './defaultModel';
import { deriveKey, generateSalt, encryptJSON, decryptJSON } from './encryption';
import {
  loadEncryptedProfileData,
  saveEncryptedProfileData,
  loadProfilesIndex,
  updateProfileSalt,
} from './storage';
import { rescheduleBillNotifications } from './pushNotifications';
import { saveProfileCloudBackup } from './cloudBackup';

type ChangePassphraseResult = { ok: boolean; error?: string };

type DataContextValue = {
  model: HouseholdModel | null;
  loading: boolean;
  loadModel: (username: string, key: CryptoJS.lib.WordArray) => Promise<void>;
  saveModel: (updatedModel: HouseholdModel) => Promise<void>;
  clearModel: () => void;
  changePassphrase: (
    currentPassphrase: string,
    newPassphrase: string
  ) => Promise<ChangePassphraseResult>;
  username: string | null;
};

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [model, setModel] = useState<HouseholdModel | null>(null);
  const [loading, setLoading] = useState(false);

  // Kept outside React state (in refs) since we only need them for the next save/load
  // call, not for anything that should trigger a re-render on its own.
  const usernameRef = useRef<string | null>(null);
  const keyRef = useRef<CryptoJS.lib.WordArray | null>(null);

  async function loadModel(username: string, key: CryptoJS.lib.WordArray) {
    setLoading(true);
    usernameRef.current = username;
    keyRef.current = key;
    try {
      const encrypted = await loadEncryptedProfileData(username);
      let loaded: HouseholdModel;
      if (!encrypted) {
        loaded = defaultModel();
      } else {
        loaded = decryptJSON<HouseholdModel>(key, encrypted);
      }
      setModel(loaded);
      // Rebuild any due-bill alerts against whatever was just loaded — not awaited,
      // since it shouldn't hold up the sign-in screen finishing its own transition.
      rescheduleBillNotifications(loaded).catch(() => {});
    } catch (e) {
      // Shouldn't normally happen, since this only ever runs after a verified sign-in —
      // but fall back to a blank model instead of crashing, just in case.
      setModel(defaultModel());
    } finally {
      setLoading(false);
    }
  }

  async function saveModel(updatedModel: HouseholdModel) {
    setModel(updatedModel);
    const username = usernameRef.current;
    const key = keyRef.current;
    if (!username || !key) return;
    const encrypted = await encryptJSON(key, updatedModel);
    await saveEncryptedProfileData(username, encrypted);
    // Keep scheduled alerts in sync with whatever just changed (a new bill, a paid
    // bill, a changed due date, or the notification setting itself).
    rescheduleBillNotifications(updatedModel).catch(() => {});
    // Checkpoint 9.2b-i: also keep an encrypted backup of this profile's data in the
    // cloud, so a future "link with another profile" screen has something to compare
    // against — and as a side benefit, a real backup if this phone is lost. Not
    // awaited and silently ignored on failure (e.g. no internet), same pattern as
    // rescheduleBillNotifications above — a failed cloud backup should never block or
    // interrupt normal use of the app.
    saveProfileCloudBackup(username, encrypted).catch(() => {});
  }

  function clearModel() {
    usernameRef.current = null;
    keyRef.current = null;
    setModel(null);
  }

  // ---- Checkpoint 11.3: change passphrase ----
  // Verifies the CURRENT passphrase is actually correct (by re-deriving a key from it and
  // successfully decrypting what's already saved) before touching anything — a wrong
  // "current" passphrase must never be able to lock someone out or corrupt their data.
  // Once verified: a brand new random salt is generated (a fresh salt per passphrase is
  // the same practice used when the profile was first created), a new key is derived from
  // the new passphrase + that new salt, everything currently in memory is re-encrypted with
  // it and saved, the profiles index is updated to remember the new salt, and finally the
  // in-memory key this session is using for future saves is swapped over — so the very next
  // saveModel() call (e.g. editing a bill right after) keeps working correctly without
  // needing to sign out and back in.
  async function changePassphrase(
    currentPassphrase: string,
    newPassphrase: string
  ): Promise<ChangePassphraseResult> {
    const username = usernameRef.current;
    if (!username) return { ok: false, error: 'Not signed in.' };

    const profiles = await loadProfilesIndex();
    const profile = profiles.find((p) => p.username === username);
    if (!profile) return { ok: false, error: "Couldn't find your profile." };

    const encrypted = await loadEncryptedProfileData(username);
    if (!encrypted) return { ok: false, error: 'No saved data found for this profile.' };

    const currentKey = deriveKey(currentPassphrase, profile.salt);
    try {
      decryptJSON(currentKey, encrypted);
    } catch (e) {
      return { ok: false, error: 'Your current passphrase is incorrect.' };
    }

    const newSalt = await generateSalt();
    const newKey = deriveKey(newPassphrase, newSalt);
    const currentModel = model ?? defaultModel();
    const reEncrypted = await encryptJSON(newKey, currentModel);
    await saveEncryptedProfileData(username, reEncrypted);
    await updateProfileSalt(username, newSalt);
    // Checkpoint 9.2b-i: the cloud backup was encrypted with the OLD key, so it needs
    // to be refreshed here too, using the freshly re-encrypted data above — otherwise
    // it would be left stuck, undecryptable with the new passphrase.
    saveProfileCloudBackup(username, reEncrypted).catch(() => {});

    keyRef.current = newKey;
    return { ok: true };
  }

  return (
    <DataContext.Provider
      value={{
        model,
        loading,
        loadModel,
        saveModel,
        clearModel,
        changePassphrase,
        username: usernameRef.current,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
}
