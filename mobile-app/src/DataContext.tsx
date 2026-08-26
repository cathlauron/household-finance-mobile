// ============================================================
// Household Finance App — Shared data holder
// ============================================================
// Loads your decrypted data into memory once you're signed in
// or unlocked, and gives any screen a way to read it — and,
// eventually, save changes back — without every screen needing
// to know how to decrypt/encrypt or talk to storage itself.
//
// Checkpoint 9.2c: a profile can now be linked to a shared
// household. Once linked (profile.householdId is set in the
// profiles index), loadModel/saveModel transparently read/write
// the SHARED household data instead of this profile's own
// personal data — every other screen keeps working exactly as
// before, with no idea whether it's looking at personal or
// shared data.
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
  updateProfileHouseholdId,
} from './storage';
import { rescheduleBillNotifications } from './pushNotifications';
import { saveProfileCloudBackup } from './cloudBackup';
import {
  loadWrappedHouseholdKey,
  unwrapHouseholdKey,
  loadHouseholdData,
  saveHouseholdData,
  removeMemberFromHousehold,
  deleteWrappedHouseholdKey,
} from './household';

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
  // Checkpoint 9.2c: whether this profile is currently reading/writing
  // shared household data (true) or its own personal data (false).
  isLinked: boolean;
  // The passphrase-derived key for THIS profile's own passphrase — needed
  // by the linking screens to wrap/unwrap a shared household key, without
  // every screen having to re-derive or pass it around separately.
  getPersonalKey: () => CryptoJS.lib.WordArray | null;
  // Gives this profile its own standalone copy of whatever the shared data
  // currently looks like, then removes this profile's access to the shared
  // household. The shared household data itself, and anyone else still
  // linked to it, are left completely untouched.
  unlinkHousehold: () => Promise<ChangePassphraseResult>;
};

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [model, setModel] = useState<HouseholdModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLinked, setIsLinked] = useState(false);

  // Kept outside React state (in refs) since we only need them for the next save/load
  // call, not for anything that should trigger a re-render on its own.
  const usernameRef = useRef<string | null>(null);
  const keyRef = useRef<CryptoJS.lib.WordArray | null>(null);
  // Checkpoint 9.2c: set only when this profile is linked — the shared
  // household's id and its (unwrapped) encryption key. Undefined/null in
  // both when this profile is personal/unlinked.
  const householdIdRef = useRef<string | undefined>(undefined);
  const householdKeyRef = useRef<CryptoJS.lib.WordArray | null>(null);
  // Checkpoint A.5 — this profile's current salt, kept alongside the key/household refs
  // so saveModel/changePassphrase can keep the cloud backup's salt field up to date
  // without needing to re-look-up the profiles index on every save.
  const saltRef = useRef<string | null>(null);
  async function loadModel(username: string, key: CryptoJS.lib.WordArray) {
    setLoading(true);
    usernameRef.current = username;
    keyRef.current = key;
    householdIdRef.current = undefined;
    householdKeyRef.current = null;
    try {
      const profiles = await loadProfilesIndex();
      const profile = profiles.find((p) => p.username === username);
      const householdId = profile?.householdId;
      // Checkpoint A.5 — remember this profile's salt for the lifetime of this session,
      // so every future save can keep the cloud backup's salt field fresh.
      saltRef.current = profile?.salt ?? null;
      if (householdId) {
        // Linked profile: look up this profile's own wrapped copy of the
        // shared household key, unwrap it with the personal key, then load
        // and decrypt the shared household data with it.
        const wrapped = await loadWrappedHouseholdKey(username);
        if (wrapped && wrapped.householdId === householdId) {
          const householdKey = unwrapHouseholdKey(wrapped.wrappedKey, key);
          const encryptedHousehold = await loadHouseholdData(householdId);
          if (encryptedHousehold) {
            const loaded = decryptJSON<HouseholdModel>(householdKey, encryptedHousehold);
            householdIdRef.current = householdId;
            householdKeyRef.current = householdKey;
            setModel(loaded);
            setIsLinked(true);
            rescheduleBillNotifications(loaded).catch(() => {});
            setLoading(false);
            return;
          }
        }
        // If we get here, something about the link is broken (e.g. the wrapped
        // key wasn't found, or the shared data hasn't been saved yet) — fall
        // through to personal data below rather than showing a blank/broken
        // screen. This shouldn't normally happen.
      }

      const encrypted = await loadEncryptedProfileData(username);
      let loaded: HouseholdModel;
      if (!encrypted) {
        loaded = defaultModel();
      } else {
        loaded = decryptJSON<HouseholdModel>(key, encrypted);
      }
      setModel(loaded);
      setIsLinked(false);
      // Rebuild any due-bill alerts against whatever was just loaded — not awaited,
      // since it shouldn't hold up the sign-in screen finishing its own transition.
      rescheduleBillNotifications(loaded).catch(() => {});
    } catch (e) {
      // Shouldn't normally happen, since this only ever runs after a verified sign-in —
      // but fall back to a blank model instead of crashing, just in case.
      setModel(defaultModel());
      setIsLinked(false);
    } finally {
      setLoading(false);
    }
  }

  async function saveModel(updatedModel: HouseholdModel) {
    setModel(updatedModel);
    const username = usernameRef.current;
    if (!username) return;

    if (householdIdRef.current && householdKeyRef.current) {
      // Linked profile: save to the shared household document instead of
      // this profile's own personal storage.
      const encrypted = await encryptJSON(householdKeyRef.current, updatedModel);
      await saveHouseholdData(householdIdRef.current, encrypted);
      rescheduleBillNotifications(updatedModel).catch(() => {});
      // Checkpoint A.5 — keep this profile's cloud backup metadata (salt + which
      // household it's linked to) fresh, so signing in on a brand-new device can find
      // its way to the right shared household. No personal `data` to send here — a
      // linked profile's real data lives in the household document saved just above.
      if (saltRef.current) {
        saveProfileCloudBackup(username, {
          salt: saltRef.current,
          householdId: householdIdRef.current,
        }).catch(() => {});
      }
      return;
    }

    const key = keyRef.current;
    if (!key) return;
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
    if (saltRef.current) {
      saveProfileCloudBackup(username, { salt: saltRef.current, data: encrypted }).catch(() => {});
    }
  }

  function clearModel() {
    usernameRef.current = null;
    keyRef.current = null;
    householdIdRef.current = undefined;
    householdKeyRef.current = null;
    setModel(null);
    setIsLinked(false);
  }

  function getPersonalKey(): CryptoJS.lib.WordArray | null {
    return keyRef.current;
  }

  async function unlinkHousehold(): Promise<ChangePassphraseResult> {
    const username = usernameRef.current;
    const personalKey = keyRef.current;
    const householdId = householdIdRef.current;
    if (!username || !personalKey || !householdId) {
      return { ok: false, error: 'This profile is not currently linked.' };
    }
    try {
      // Give this profile a real, standalone copy of the data BEFORE cutting
      // off its access to the shared version — so unlinking never leaves
      // someone with nothing.
      const currentModel = model ?? defaultModel();
      const encrypted = await encryptJSON(personalKey, currentModel);
      await saveEncryptedProfileData(username, encrypted);

      // Now remove this profile's access. The shared household document
      // itself, and anyone else still linked to it, are untouched.
      await removeMemberFromHousehold(householdId);
      await deleteWrappedHouseholdKey(username);
      await updateProfileHouseholdId(username, undefined);

      householdIdRef.current = undefined;
      householdKeyRef.current = null;
      setIsLinked(false);

      if (saltRef.current) {
        saveProfileCloudBackup(username, { salt: saltRef.current, data: encrypted }).catch(() => {});
      }

      return { ok: true };
    } catch (e) {
      return { ok: false, error: "Couldn't unlink — check your connection and try again." };
    }
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
    // Checkpoint 9.2b-i / A.5: the cloud backup's salt AND its encrypted data were both
    // tied to the OLD passphrase, so both need refreshing here — otherwise a future
    // new-device sign-in (Checkpoint A.5) would derive the wrong key from the stale salt.
    saltRef.current = newSalt;
    saveProfileCloudBackup(username, {
      salt: newSalt,
      householdId: householdIdRef.current,
      data: reEncrypted,
    }).catch(() => {});

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
        isLinked,
        getPersonalKey,
        unlinkHousehold,
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
