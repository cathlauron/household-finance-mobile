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
import { getCurrentFirebaseUser } from './authFirebase';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
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
  type ProfileIndexEntry,
} from './storage';
import { rescheduleBillNotifications } from './pushNotifications';
import { saveProfileCloudBackup } from './cloudBackup';
import { sanitizeModelIds } from './mergeModels';
import {
  loadWrappedHouseholdKey,
  unwrapHouseholdKey,
  wrapHouseholdKey,
  loadHouseholdData,
  saveHouseholdData,
  saveWrappedHouseholdKey,
  removeMemberFromHousehold,
  deleteWrappedHouseholdKey,
} from './household';

type ChangePasswordResult = { ok: boolean; error?: string };

type LoadModelBootstrap = {
  profile?: ProfileIndexEntry;
  initialModel?: HouseholdModel;
  householdId?: string;
  householdKey?: CryptoJS.lib.WordArray;
};

type DataContextValue = {
  model: HouseholdModel | null;
  loading: boolean;
  loadModel: (
    username: string,
    key: CryptoJS.lib.WordArray,
    bootstrap?: LoadModelBootstrap,
    options?: { deferNotifications?: boolean }
  ) => Promise<HouseholdModel | null>;
  saveModel: (updatedModel: HouseholdModel) => Promise<void>;
  clearModel: () => void;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<ChangePasswordResult>;
  username: string | null;
  // Checkpoint 9.2c: whether this profile is currently reading/writing
  // shared household data (true) or its own personal data (false).
  isLinked: boolean;
  // The password-derived key for THIS profile's own password — needed
  // by the linking screens to wrap/unwrap a shared household key, without
  // every screen having to re-derive or pass it around separately.
  getPersonalKey: () => CryptoJS.lib.WordArray | null;
  // Gives this profile its own standalone copy of whatever the shared data
  // currently looks like, then removes this profile's access to the shared
  // household. The shared household data itself, and anyone else still
  // linked to it, are left completely untouched.
  unlinkHousehold: () => Promise<ChangePasswordResult>;
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
  // so saveModel/changePassword can keep the cloud backup's salt field up to date
  // without needing to re-look-up the profiles index on every save.
  const saltRef = useRef<string | null>(null);
  async function loadModel(
    username: string,
    key: CryptoJS.lib.WordArray,
    bootstrap?: LoadModelBootstrap,
    options: { deferNotifications?: boolean } = {}
  ): Promise<HouseholdModel | null> {
    setLoading(true);
    usernameRef.current = username;
    keyRef.current = key;
    householdIdRef.current = undefined;
    householdKeyRef.current = null;
    try {
      const profile = bootstrap?.profile ?? (await loadProfilesIndex()).find((p) => p.username === username);
      const householdId = bootstrap?.householdId ?? profile?.householdId;
      // Checkpoint A.5 — remember this profile's salt for the lifetime of this session,
      // so every future save can keep the cloud backup's salt field fresh.
      saltRef.current = profile?.salt ?? null;

      if (bootstrap?.householdKey && householdId) {
        const loaded = sanitizeModelIds(bootstrap.initialModel ?? defaultModel());
        householdIdRef.current = householdId;
        householdKeyRef.current = bootstrap.householdKey;
        setModel(loaded);
        setIsLinked(true);
        if (!options.deferNotifications) {
          rescheduleBillNotifications(loaded).catch(() => {});
        }
        setLoading(false);
        return loaded;
      }

      if (bootstrap?.initialModel && !householdId) {
        const loaded = sanitizeModelIds(bootstrap.initialModel);
        setModel(loaded);
        setIsLinked(false);
        if (!options.deferNotifications) {
          rescheduleBillNotifications(loaded).catch(() => {});
        }
        setLoading(false);
        return loaded;
      }

      if (householdId) {
        // Linked profile: look up this profile's own wrapped copy of the
        // shared household key, unwrap it with the personal key, then load
        // and decrypt the shared household data with it.
        const wrapped = await loadWrappedHouseholdKey(username);
        if (wrapped && wrapped.householdId === householdId) {
          const householdKey = unwrapHouseholdKey(wrapped.wrappedKey, key);
          const encryptedHousehold = await loadHouseholdData(householdId);
          if (encryptedHousehold) {
            const loaded = sanitizeModelIds(decryptJSON<HouseholdModel>(householdKey, encryptedHousehold));
            householdIdRef.current = householdId;
            householdKeyRef.current = householdKey;
            setModel(loaded);
            setIsLinked(true);
            if (!options.deferNotifications) {
              rescheduleBillNotifications(loaded).catch(() => {});
            }
            setLoading(false);
            return loaded;
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
        loaded = sanitizeModelIds(decryptJSON<HouseholdModel>(key, encrypted));
      }
      setModel(loaded);
      setIsLinked(false);
      if (!options.deferNotifications) {
        // Rebuild any due-bill alerts against whatever was just loaded — not awaited,
        // since it shouldn't hold up the sign-in screen finishing its own transition.
        rescheduleBillNotifications(loaded).catch(() => {});
      }
      return loaded;
    } catch (e) {
      // Shouldn't normally happen, since this only ever runs after a verified sign-in —
      // but fall back to a blank model instead of crashing, just in case.
      const fallback = defaultModel();
      setModel(fallback);
      setIsLinked(false);
      return fallback;
    } finally {
      setLoading(false);
    }
  }

  async function saveModel(updatedModel: HouseholdModel) {
    const sanitizedModel = sanitizeModelIds(updatedModel);
    setModel(sanitizedModel);
    const username = usernameRef.current;
    if (!username) return;

    if (householdIdRef.current && householdKeyRef.current) {
      // Linked profile: save to the shared household document instead of
      // this profile's own personal storage.
      const encrypted = await encryptJSON(householdKeyRef.current, sanitizedModel);
      await saveHouseholdData(householdIdRef.current, encrypted);
      rescheduleBillNotifications(sanitizedModel).catch(() => {});
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
    const encrypted = await encryptJSON(key, sanitizedModel);
    await saveEncryptedProfileData(username, encrypted);
    // Keep scheduled alerts in sync with whatever just changed (a new bill, a paid
    // bill, a changed due date, or the notification setting itself).
    rescheduleBillNotifications(sanitizedModel).catch(() => {});
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

  async function unlinkHousehold(): Promise<ChangePasswordResult> {
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

  // ---- Checkpoint 11.3: change password ----
  // Verifies the CURRENT password is actually correct (by re-deriving a key from it and
  // successfully decrypting what's already saved) before touching anything — a wrong
  // "current" password must never be able to lock someone out or corrupt their data.
  // Once verified: a brand new random salt is generated (a fresh salt per password is
  // the same practice used when the profile was first created), a new key is derived from
  // the new password + that new salt, everything currently in memory is re-encrypted with
  // it and saved, the profiles index is updated to remember the new salt, and finally the
  // in-memory key this session is using for future saves is swapped over — so the very next
  // saveModel() call (e.g. editing a bill right after) keeps working correctly without
  // needing to sign out and back in.
  async function changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<ChangePasswordResult> {
    const username = usernameRef.current;
    if (!username) return { ok: false, error: 'Not signed in.' };

    const profiles = await loadProfilesIndex();
    const profile = profiles.find((p) => p.username === username);
    if (!profile) return { ok: false, error: "Couldn't find your profile." };

    const currentKey = deriveKey(currentPassword, profile.salt);

    // ---- Checkpoint A.6: linked-profile branch ----
    // For a linked profile, the real source of truth is the shared household key/data,
    // not this profile's own (unused, possibly stale) personal storage — so the current
    // password is verified by actually unwrapping the household key with it, and the
    // fix for the original bug lives here too: after deriving the new key, the SAME
    // household key gets re-wrapped with it and saved, so the household key itself never
    // changes (nothing shared breaks) — only the "lock" on it for this one profile does.
    if (householdIdRef.current && householdKeyRef.current) {
      const wrapped = await loadWrappedHouseholdKey(username);
      if (!wrapped) return { ok: false, error: "Couldn't find your linked household key." };

      try {
        unwrapHouseholdKey(wrapped.wrappedKey, currentKey);
      } catch (e) {
        return { ok: false, error: 'Your current password is incorrect.' };
      }
    // Keep Firebase Auth's real password in sync with the local one — this is
    // what was missing before, causing the two to drift apart.
    const firebaseUser = getCurrentFirebaseUser();
    if (!firebaseUser || !firebaseUser.email) {
      return { ok: false, error: 'You need to be signed in to change your password.' };
    }
    try {
      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);
      await updatePassword(firebaseUser, newPassword);
    } catch (e: any) {
      if (e?.code === 'auth/wrong-password' || e?.code === 'auth/invalid-credential') {
        return { ok: false, error: 'Your current password is incorrect.' };
      }
      return { ok: false, error: 'Could not update your sign-in password. Check your connection and try again.' };
    }
      const newSalt = await generateSalt();
      const newKey = deriveKey(newPassword, newSalt);

      // Re-wrap the EXISTING household key (already in memory from when this profile
      // loaded/linked) with the new password-derived key — the household key itself is
      // untouched, so the other linked person's access is completely unaffected.
      const reWrapped = await wrapHouseholdKey(householdKeyRef.current, newKey);
      await saveWrappedHouseholdKey(username, householdIdRef.current, reWrapped);
      await updateProfileSalt(username, newSalt);

      saltRef.current = newSalt;
      saveProfileCloudBackup(username, {
        salt: newSalt,
        householdId: householdIdRef.current,
      }).catch(() => {});

      keyRef.current = newKey;
      return { ok: true };
    }

    // ---- Unlinked (personal) profile — unchanged from before ----
    const encrypted = await loadEncryptedProfileData(username);
    if (!encrypted) return { ok: false, error: 'No saved data found for this profile.' };

    try {
      decryptJSON(currentKey, encrypted);
    } catch (e) {
      return { ok: false, error: 'Your current password is incorrect.' };
    }
    // Keep Firebase Auth's real password in sync with the local one — this is
    // what was missing before, causing the two to drift apart.
    const firebaseUser = getCurrentFirebaseUser();
    if (!firebaseUser || !firebaseUser.email) {
      return { ok: false, error: 'You need to be signed in to change your password.' };
    }
    try {
      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);
      await updatePassword(firebaseUser, newPassword);
    } catch (e: any) {
      if (e?.code === 'auth/wrong-password' || e?.code === 'auth/invalid-credential') {
        return { ok: false, error: 'Your current password is incorrect.' };
      }
      return { ok: false, error: 'Could not update your sign-in password. Check your connection and try again.' };
    }
    const newSalt = await generateSalt();
    const newKey = deriveKey(newPassword, newSalt);
    const currentModel = model ?? defaultModel();
    const reEncrypted = await encryptJSON(newKey, currentModel);
    await saveEncryptedProfileData(username, reEncrypted);
    await updateProfileSalt(username, newSalt);
    // Checkpoint 9.2b-i / A.5: the cloud backup's salt AND its encrypted data were both
    // tied to the OLD password, so both need refreshing here — otherwise a future
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
        changePassword,
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
