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
import { Alert } from 'react-native';
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
  loadPendingHostLink,
  clearPendingHostLink,
  type ProfileIndexEntry,
} from './storage';
import { cancelLinkCode } from './linking';
import { rescheduleBillNotifications } from './pushNotifications';
import { saveProfileCloudBackup } from './cloudBackup';
import { sanitizeModelIds } from './mergeModels';
import { deleteRecoveryKey } from './recovery';
import {
  loadWrappedHouseholdKey,
  unwrapHouseholdKey,
  wrapHouseholdKey,
  loadHouseholdData,
  saveHouseholdData,
  saveWrappedHouseholdKey,
  removeMemberFromHousehold,
  deleteWrappedHouseholdKey,
  deleteHousehold,
  leaveHouseholdAndTransferOwnership,
  getHouseholdMemberCount,
  getHouseholdOwner,
  subscribeToHousehold,
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
  getHouseholdKey: () => CryptoJS.lib.WordArray | null;
  getHouseholdId: () => string | undefined;
  // Gives this profile its own standalone copy of whatever the shared data
  // currently looks like, then removes this profile's access to the shared
  // household. The shared household data itself, and anyone else still
  // linked to it, are left completely untouched.
  unlinkHousehold: () => Promise<ChangePasswordResult>;
  unlinkAndTransferOwnership: (newOwnerUid: string) => Promise<ChangePasswordResult>;
  linkNoticeMsg: string | null;
  clearLinkNoticeMsg: () => void;
};

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [model, setModel] = useState<HouseholdModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLinked, setIsLinked] = useState(false);
  const [linkNoticeMsg, setLinkNoticeMsg] = useState<string | null>(null);
  const householdUnsubscribeRef = useRef<(() => void) | null>(null);

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
  // Pre-Phase-B Tier 1: tracks the last known encrypted payload for live household sync,
  // preventing echo-reloads when this device saves, while detecting remote updates.
  const lastEncryptedDataRef = useRef<string | null>(null);

  function cleanupHouseholdListener() {
    if (householdUnsubscribeRef.current) {
      householdUnsubscribeRef.current();
      householdUnsubscribeRef.current = null;
    }
  }

  // Shared dissolve/revocation logic used by live listener, loadModel self-heal, and self-unlink
  async function performDissolve(
    targetHouseholdId: string,
    opts: {
      reason: 'selfUnlink' | 'alone' | 'revoked';
      fallbackModel?: HouseholdModel;
      deleteDoc?: boolean;
    }
  ) {
    cleanupHouseholdListener();
    const username = usernameRef.current;
    const personalKey = keyRef.current;
    if (!username || !personalKey) return;

    let modelToSave = opts.fallbackModel ?? model;
    if (!modelToSave) {
      const encryptedLocal = await loadEncryptedProfileData(username);
      modelToSave = encryptedLocal
        ? sanitizeModelIds(decryptJSON<HouseholdModel>(personalKey, encryptedLocal))
        : defaultModel();
    }

    const encrypted = await encryptJSON(personalKey, modelToSave);
    await saveEncryptedProfileData(username, encrypted);

    if (opts.deleteDoc) {
      try {
        await deleteHousehold(targetHouseholdId);
      } catch (e) {}
    }

    try {
      await deleteWrappedHouseholdKey(username);
    } catch (e) {}
    await updateProfileHouseholdId(username, undefined);

    try {
      const pending = await loadPendingHostLink(username);
      if (pending?.code) await cancelLinkCode(pending.code);
      await clearPendingHostLink(username);
    } catch (e) {}

    householdIdRef.current = undefined;
    householdKeyRef.current = null;
    lastEncryptedDataRef.current = null;
    setModel(modelToSave);
    setIsLinked(false);

    if (saltRef.current) {
      saveProfileCloudBackup(username, { salt: saltRef.current, data: encrypted }).catch(() => {});
    }

    if (opts.reason === 'alone') {
      setLinkNoticeMsg('The other member(s) have left the household. Your data has been converted to your personal profile.');
    } else if (opts.reason === 'revoked') {
      setLinkNoticeMsg('You are no longer part of this household. Your data has been preserved as a personal profile.');
    }
  }

  function setupHouseholdListener(householdId: string) {
    cleanupHouseholdListener();
    const currentUid = getCurrentFirebaseUser()?.uid;
    if (!currentUid) return;

    householdUnsubscribeRef.current = subscribeToHousehold(
      householdId,
      async (snapshotData) => {
        if (!snapshotData) {
          // Document was deleted (dissolved by someone else)
          await performDissolve(householdId, { reason: 'alone', deleteDoc: false });
          return;
        }

        const members = snapshotData.members;
        if (!members.includes(currentUid)) {
          // Current user was removed from members by owner
          await performDissolve(householdId, { reason: 'revoked', deleteDoc: false });
          return;
        }

        if (members.length === 1 && members[0] === currentUid) {
          // Current user is the sole member remaining -> live auto-dissolve!
          let fallbackModel: HouseholdModel | undefined = undefined;
          if (snapshotData.data && householdKeyRef.current) {
            try {
              fallbackModel = sanitizeModelIds(
                decryptJSON<HouseholdModel>(householdKeyRef.current, snapshotData.data)
              );
            } catch (e) {}
          }
          await performDissolve(householdId, { reason: 'alone', deleteDoc: true, fallbackModel });
          return;
        }

        // Live household sync: reload/merge in-memory model when household data was changed elsewhere
        if (
          snapshotData.data &&
          snapshotData.data !== lastEncryptedDataRef.current &&
          householdKeyRef.current
        ) {
          try {
            const incomingModel = sanitizeModelIds(
              decryptJSON<HouseholdModel>(householdKeyRef.current, snapshotData.data)
            );
            lastEncryptedDataRef.current = snapshotData.data;
            setModel(incomingModel);

            // Keep personal local backup fresh
            const username = usernameRef.current;
            const personalKey = keyRef.current;
            if (username && personalKey) {
              encryptJSON(personalKey, incomingModel)
                .then((enc) => saveEncryptedProfileData(username, enc))
                .catch(() => {});
            }
            rescheduleBillNotifications(incomingModel).catch(() => {});
          } catch (err) {
            console.error('Failed to decrypt live household data update:', err);
          }
        }
      },
      async (error) => {
        const code = (error as any)?.code;
        const msg = error?.message || '';
        if (code === 'permission-denied' || /permission|denied/i.test(msg)) {
          // Access revoked or household deleted
          await performDissolve(householdId, { reason: 'revoked', deleteDoc: false });
        }
      }
    );
  }

  async function loadModel(
    username: string,
    key: CryptoJS.lib.WordArray,
    bootstrap?: LoadModelBootstrap,
    options: { deferNotifications?: boolean } = {}
  ): Promise<HouseholdModel | null> {
    setLoading(true);
    cleanupHouseholdListener();
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
        saveEncryptedProfileData(username, await encryptJSON(key, loaded)).catch(() => {});
        setupHouseholdListener(householdId);
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
          let encryptedHousehold: string | null = null;
          try {
            encryptedHousehold = await loadHouseholdData(householdId);
          } catch (err) {
            const code = (err as any)?.code;
            const msg = (err as Error)?.message || '';
            if (code === 'permission-denied' || /permission|denied/i.test(msg)) {
              // Access revoked or removed by owner -> self-heal
              await performDissolve(householdId, { reason: 'revoked', deleteDoc: false });
              const encrypted = await loadEncryptedProfileData(username);
              const fallback = encrypted ? sanitizeModelIds(decryptJSON<HouseholdModel>(key, encrypted)) : defaultModel();
              setModel(fallback);
              setIsLinked(false);
              setLoading(false);
              return fallback;
            }
          }

          if (encryptedHousehold) {
            const loaded = sanitizeModelIds(decryptJSON<HouseholdModel>(householdKey, encryptedHousehold));
            const memberCount = await getHouseholdMemberCount(householdId);
            if (memberCount <= 1) {
              // Only 1 member left -> auto-dissolve
              await performDissolve(householdId, { reason: 'alone', deleteDoc: true, fallbackModel: loaded });
              if (!options.deferNotifications) {
                rescheduleBillNotifications(loaded).catch(() => {});
              }
              setLoading(false);
              return loaded;
            }

            householdIdRef.current = householdId;
            householdKeyRef.current = householdKey;
            lastEncryptedDataRef.current = encryptedHousehold;
            setModel(loaded);
            setIsLinked(true);
            saveEncryptedProfileData(username, await encryptJSON(key, loaded)).catch(() => {});
            setupHouseholdListener(householdId);
            if (!options.deferNotifications) {
              rescheduleBillNotifications(loaded).catch(() => {});
            }
            setLoading(false);
            return loaded;
          }
        }
        // If we get here, something about the link is broken — fall back to personal
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
        rescheduleBillNotifications(loaded).catch(() => {});
      }
      return loaded;
    } catch (e) {
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
      // Linked profile: save to the shared household document
      const encrypted = await encryptJSON(householdKeyRef.current, sanitizedModel);

      // Continuous local snapshotting: keep an up-to-date personal copy in local storage first
      const key = keyRef.current;
      if (key) {
        saveEncryptedProfileData(username, await encryptJSON(key, sanitizedModel)).catch(() => {});
      }

      try {
        await saveHouseholdData(householdIdRef.current, encrypted);
        lastEncryptedDataRef.current = encrypted;
      } catch (err) {
        Alert.alert(
          'Sync Failed',
          'Your changes were saved locally on this device, but could not be synced to the shared household. Please check your connection.'
        );
      }

      rescheduleBillNotifications(sanitizedModel).catch(() => {});

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
    rescheduleBillNotifications(sanitizedModel).catch(() => {});

    if (saltRef.current) {
      try {
        await saveProfileCloudBackup(username, { salt: saltRef.current, data: encrypted });
      } catch (err) {
        console.error('Cloud backup failed:', err);
        Alert.alert(
          'Backup Failed',
          'Your changes were saved locally on this device, but could not be backed up to the cloud. Please check your connection.'
        );
      }
    }
  }

  function clearModel() {
    cleanupHouseholdListener();
    usernameRef.current = null;
    keyRef.current = null;
    householdIdRef.current = undefined;
    householdKeyRef.current = null;
    lastEncryptedDataRef.current = null;
    setModel(null);
    setIsLinked(false);
    setLinkNoticeMsg(null);
  }

  function clearLinkNoticeMsg() {
    setLinkNoticeMsg(null);
  }

  function getPersonalKey(): CryptoJS.lib.WordArray | null {
    return keyRef.current;
  }

  function getHouseholdKey(): CryptoJS.lib.WordArray | null {
    return householdKeyRef.current;
  }

  function getHouseholdId(): string | undefined {
    return householdIdRef.current;
  }

  async function unlinkHousehold(): Promise<ChangePasswordResult> {
    cleanupHouseholdListener();
    const username = usernameRef.current;
    const personalKey = keyRef.current;
    const householdId = householdIdRef.current;
    if (!username || !personalKey || !householdId) {
      return { ok: false, error: 'This profile is not currently linked.' };
    }
    try {
      const memberCount = await getHouseholdMemberCount(householdId);
      const ownerUid = await getHouseholdOwner(householdId);
      const currentUid = getCurrentFirebaseUser()?.uid;
      const isOwner = Boolean(currentUid && ownerUid === currentUid);

      if (memberCount <= 1 || (isOwner && memberCount <= 2)) {
        await performDissolve(householdId, { reason: 'selfUnlink', deleteDoc: true });
        return { ok: true };
      }

      // Multi-member household: normal self-unlink
      const currentModel = model ?? defaultModel();
      const encrypted = await encryptJSON(personalKey, currentModel);
      await saveEncryptedProfileData(username, encrypted);

      const memberCountAfterUpdate = await getHouseholdMemberCount(householdId);
      if (memberCountAfterUpdate <= 1) {
        await deleteHousehold(householdId);
      } else {
        await removeMemberFromHousehold(householdId);
      }

      await deleteWrappedHouseholdKey(username);
      await updateProfileHouseholdId(username, undefined);

      try {
        const pending = await loadPendingHostLink(username);
        if (pending?.code) await cancelLinkCode(pending.code);
        await clearPendingHostLink(username);
      } catch (e) {}

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

  async function unlinkAndTransferOwnership(newOwnerUid: string): Promise<ChangePasswordResult> {
    cleanupHouseholdListener();
    const username = usernameRef.current;
    const personalKey = keyRef.current;
    const householdId = householdIdRef.current;
    if (!username || !personalKey || !householdId) {
      return { ok: false, error: 'This profile is not currently linked.' };
    }
    try {
      const currentModel = model ?? defaultModel();
      const encrypted = await encryptJSON(personalKey, currentModel);
      await saveEncryptedProfileData(username, encrypted);

      await leaveHouseholdAndTransferOwnership(householdId, newOwnerUid);
      await deleteWrappedHouseholdKey(username);
      await updateProfileHouseholdId(username, undefined);

      try {
        const pending = await loadPendingHostLink(username);
        if (pending?.code) await cancelLinkCode(pending.code);
        await clearPendingHostLink(username);
      } catch (e) {}

      householdIdRef.current = undefined;
      householdKeyRef.current = null;
      setIsLinked(false);

      if (saltRef.current) {
        saveProfileCloudBackup(username, { salt: saltRef.current, data: encrypted }).catch(() => {});
      }

      return { ok: true };
    } catch (e) {
      return { ok: false, error: "Couldn't transfer ownership and unlink — check your connection and try again." };
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
      if (e?.code === 'auth/requires-recent-login') {
        return {
          ok: false,
          error: 'For security, please sign out and back in, then try changing your password again.',
        };
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
      }).catch((backupError) => {
        console.error('Failed to update cloud backup after password change:', backupError);
      });

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
      if (e?.code === 'auth/requires-recent-login') {
        return {
          ok: false,
          error: 'For security, please sign out and back in, then try changing your password again.',
        };
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
    }).catch((backupError) => {
      console.error('Failed to update cloud backup after password change:', backupError);
    });

    // Pre-Phase-B Tier 1 fix: for unlinked profiles, the old recovery key doc wrapped the OLD
    // password-derived key and is now invalid. Delete it so the user isn't misled, and so
    // Settings > Security can show that the recovery key needs regenerating.
    deleteRecoveryKey(username).catch((err) => {
      console.error('Failed to delete stale recovery key after password change:', err);
    });

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
        getHouseholdKey,
        getHouseholdId,
        unlinkHousehold,
        unlinkAndTransferOwnership,
        linkNoticeMsg,
        clearLinkNoticeMsg,
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
