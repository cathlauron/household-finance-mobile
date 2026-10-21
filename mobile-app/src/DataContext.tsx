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
import { showSaved } from './components/SavedToast';
import { ensureUsernameClaim } from './usernameClaim';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import * as Network from 'expo-network';
import { Alert, AppState, InteractionManager } from 'react-native';
import CryptoJS from 'crypto-js';
import type { HouseholdModel, ManualTransaction } from './types';
import { stampHouseholdWho } from './whoStamp';
import { defaultModel } from './defaultModel';
import { deriveKey, generateSalt, encryptJSON, decryptJSON } from './encryption';
import {
  loadEncryptedProfileData,
  saveEncryptedProfileData,
  loadProfilesIndex,
  loadCloudSyncAt,
  saveCloudSyncAt,
  loadBackupPending,
  setBackupPending,
  updateProfileSalt,
  updateProfileHouseholdId,
  loadPendingHostLink,
  clearPendingHostLink,
  type ProfileIndexEntry,
  saveHouseholdPendingBase,
  loadHouseholdPendingBase,
  saveCachedHouseholdKey,
} from './storage';
import { cancelLinkCode, finishHostLink } from './linking';
import { rescheduleBillNotifications } from './pushNotifications';
import { saveProfileCloudBackup, loadProfileCloudBackup } from './cloudBackup';
import { sanitizeModelIds } from './mergeModels';
import { deleteRecoveryKey } from './recovery';
import {
  loadWrappedHouseholdKey,
  unwrapHouseholdKey,
  wrapHouseholdKey,
  saveHouseholdData,
  saveWrappedHouseholdKey,
  removeMemberFromHousehold,
  deleteWrappedHouseholdKey,
  deleteHousehold,
  leaveHouseholdAndTransferOwnership,
  getHouseholdMemberCount,
  getHouseholdOwner,
  subscribeToHousehold,
  loadHouseholdDoc,
  saveHouseholdDataChecked,
} from './household';
import { mergeHouseholds } from './merge3';
import { describeNewEntry } from './guest';
import {
  partsEnabledFor,
  afterLoad as partsAfterLoad,
  afterSave as partsAfterSave,
  saveWhenTooBig as partsSaveWhenTooBig,
  loadModelFromParts,
  modelFromPartsForUpdate,
  removePartsBeforeDissolve,
  forgetParts,
  sameAsParts,
  currentLayout,
} from './householdPartsSync';

type ChangePasswordResult = { ok: boolean; error?: string };

type LoadModelBootstrap = {
  profile?: ProfileIndexEntry;
  initialModel?: HouseholdModel;
  householdId?: string;
  householdKey?: CryptoJS.lib.WordArray;
};

export type RefreshOutcome =
  | 'updated'
  | 'up_to_date'
  | 'backed_up'
  | 'conflict'
  | 'cannot_decrypt'
  | 'failed'
  | 'unavailable';

type DataContextValue = {
  model: HouseholdModel | null;
  loading: boolean;
  loadModel: (
    username: string,
    key: CryptoJS.lib.WordArray,
    bootstrap?: LoadModelBootstrap,
    options?: { deferNotifications?: boolean; offlineStart?: boolean }
  ) => Promise<HouseholdModel | null>;
  // Version 2.1: after opening from the phone, start the live household link once the
  // background sign-in has worked (before that Firebase would refuse it).
  goOnline: () => void;
  saveModel: (updatedModel: HouseholdModel) => Promise<void>;
  // Version 2.2: saveModel returns once the screen has the change; this waits (up to a
  // few seconds) for the saving that carries on in the background. Used before signing out.
  waitForSaves: (maxMs?: number) => Promise<void>;
  // Version 2.2: the newest data right now (for saves that run a moment later, e.g. after
  // typing stops, so they never undo a change made in between).
  getModel: () => HouseholdModel | null;
  clearModel: () => void;
  refreshModel: () => Promise<RefreshOutcome>;
  verifyPassword: (password: string) => Promise<boolean>;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<ChangePasswordResult>;
  username: string | null;
  // Redesign (offline banner): whether the phone has internet right now, and how many
  // saves are waiting to reach the cloud. They are sent by themselves once it's back.
  isOnline: boolean;
  pendingChanges: number;
  // Version 2.1 (data risk 2): how full the online copy of this data is, from 0 to 1.
  // Firebase stores everything in one item with a 1 MB ceiling.
  storageUsed: number;
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
  // Version 3 (new start): using the app before having an account. Nothing is saved;
  // the first money entry asks to save Finance Flow to an email first (see guest.ts).
  guest: boolean;
  guestRequest: { model: HouseholdModel; entry: string } | null;
  guestInfo: { name: string; helpWith: string[] } | null;
  startGuest: (model: HouseholdModel, info: { name: string; helpWith: string[] }) => void;
  // "Not now": keep showing the entry on this phone without saving it (keep = true), or
  // drop it (keep = false).
  resolveGuestRequest: (keep: boolean) => void;
  endGuest: () => void;
};

const DataContext = createContext<DataContextValue | undefined>(undefined);

// Firestore's setDoc() does not reject or time out on its own when the
// device is offline - it just stays pending forever, which is what was
// causing Accounts/Bills/Debts delete (and every other save) to hang
// indefinitely offline with the loading spinner stuck on screen and no
// error ever shown. Racing any Firestore write against a plain timeout
// guarantees the calling code always settles within a few seconds either
// way. Exported (moved out of DataProvider) so screens outside this
// context - like SignInScreen's account-recovery flow - can use the same
// timeout guard on their own direct Firestore calls.
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_resolve, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    }),
  ]);
}

// Firebase allows 1 MB (1,048,576 bytes) per stored item. The encrypted data is plain
// text, so its length is its size; a little room is left for the item's other fields.
export const STORAGE_LIMIT_CHARS = 1_000_000;
const STORAGE_WARN_AT = 0.8;

export function DataProvider({ children }: { children: ReactNode }) {
  const [model, setModel] = useState<HouseholdModel | null>(null);
  const [guest, setGuest] = useState(false);
  const guestRef = useRef(false);
  guestRef.current = guest;
  const [guestRequest, setGuestRequest] = useState<{ model: HouseholdModel; entry: string } | null>(null);
  const [guestInfo, setGuestInfo] = useState<{ name: string; helpWith: string[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLinked, setIsLinked] = useState(false);
  const [linkNoticeMsg, setLinkNoticeMsg] = useState<string | null>(null);
  // ---- Offline banner (redesign) ----
  const [isOnline, setIsOnline] = useState(true);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [storageUsed, setStorageUsed] = useState(0);
  const storageWarnedRef = useRef(false);
  const storageFullWarnedRef = useRef(false);
  // Records how big the online copy is, and says so once when it's getting full.
  function noteStorageSize(encrypted: string | null | undefined) {
    if (!encrypted) return;
    const used = encrypted.length / STORAGE_LIMIT_CHARS;
    // Version 2.2: Settings shows a whole percent, so only a change of a percent counts.
    // (Every save used to set a slightly different number, which redrew the whole app
    // a second time after each tap.)
    const rounded = Math.round(used * 100) / 100;
    setStorageUsed((prev) => (Math.round(prev * 100) / 100 === rounded ? prev : used));
    if (used >= STORAGE_WARN_AT && used < 1 && !storageWarnedRef.current) {
      storageWarnedRef.current = true;
      Alert.alert(
        'Online storage is getting full',
        `Your data is using ${Math.round(used * 100)}% of the space it has online. Everything still saves. See Settings › Backup & Data.`
      );
    }
  }
  // True when this save is too big to send. The change stays on this phone.
  function tooBigToSync(encrypted: string): boolean {
    if (encrypted.length <= STORAGE_LIMIT_CHARS) return false;
    if (!storageFullWarnedRef.current) {
      storageFullWarnedRef.current = true;
      Alert.alert(
        'Online storage is full',
        'Your latest changes are saved on this phone, but they are too big to send online, so other phones won\'t see them yet. Removing photos frees the most space. We\'re working on more room in an update.'
      );
    }
    return true;
  }
  const onlineRef = useRef(true);
  const latestModelRef = useRef<HouseholdModel | null>(null);
  // Version 2.2 (speed fix): only when the data on screen actually changes. A save shows
  // its result one frame later (see saveModel), so a redraw in between (a form closing)
  // must not put the older data back here.
  const renderedModelRef = useRef<HouseholdModel | null>(null);
  if (model !== renderedModelRef.current) {
    renderedModelRef.current = model;
    latestModelRef.current = model;
  }
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
  // Version 2.1 (merge before save): the household as this phone last agreed on it with the
  // online copy (the "base" of a three-way merge, see merge3.ts).
  const lastSyncedModelRef = useRef<HouseholdModel | null>(null);
  const awaitingOnlineRef = useRef<string | null>(null);
  const pendingRef = useRef(0);
  pendingRef.current = pendingChanges;
  // PC.8: bumped on every saveModel so a slow refresh can tell you saved while it
  // was waiting, and back off instead of overwriting that edit.
  const modelVersionRef = useRef(0);
  const refreshInFlightRef = useRef(false);

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
        await removePartsBeforeDissolve(username, targetHouseholdId);
        await deleteHousehold(targetHouseholdId);
      } catch (e) {}
    }

    try {
      await deleteWrappedHouseholdKey(username);
    } catch (e) {}
    await updateProfileHouseholdId(username, undefined);
    // Version 2.1: changes waiting for this household no longer apply.
    saveHouseholdPendingBase(username, null).catch(() => {});
    saveCachedHouseholdKey(username, null).catch(() => {});

    try {
      const pending = await loadPendingHostLink(username);
      if (pending?.code) await cancelLinkCode(pending.code);
      await clearPendingHostLink(username);
    } catch (e) {}

    householdIdRef.current = undefined;
    householdKeyRef.current = null;
    lastEncryptedDataRef.current = null;
    lastSyncedModelRef.current = null;
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

        // Version 2.1: a household stored in parts (layout 2) is read from its parts; its
        // single `data` copy is out of date then and must not be used.
        if ((snapshotData.layout ?? 0) >= 2 && partsEnabledFor(usernameRef.current) && householdKeyRef.current) {
          const fromParts = await modelFromPartsForUpdate(usernameRef.current, householdId, householdKeyRef.current, snapshotData.layout ?? 0);
          if (fromParts && !sameAsParts(fromParts, latestModelRef.current)) {
            const incomingModel = sanitizeModelIds(fromParts);
            remoteSeqRef.current += 1;
            setModel(incomingModel);
            const username = usernameRef.current;
            const personalKey = keyRef.current;
            if (username && personalKey) {
              encryptJSON(personalKey, incomingModel)
                .then((enc) => saveEncryptedProfileData(username, enc))
                .catch(() => {});
            }
            rescheduleBillNotifications(incomingModel).catch(() => {});
          }
          return;
        }

        // Live household sync: reload/merge in-memory model when household data was changed elsewhere
        if (
          snapshotData.data &&
          snapshotData.data !== lastEncryptedDataRef.current &&
          householdKeyRef.current
        ) {
          // Version 2.2 (review fix): this phone's own save coming back. Nothing to do here;
          // the save itself records it (before, it could replace newer changes on screen).
          if (snapshotData.data === ownWriteRef.current) return;
          try {
            const incomingModel = sanitizeModelIds(
              decryptJSON<HouseholdModel>(householdKeyRef.current, snapshotData.data)
            );
            lastEncryptedDataRef.current = snapshotData.data;
            noteStorageSize(snapshotData.data);
            // Version 2.1: changes on this phone that haven't been sent yet are merged with
            // the other phone's update instead of being replaced by it. Version 2.2: the same
            // while this phone is still saving.
            const shown =
              (pendingRef.current > 0 || savesBusy()) && latestModelRef.current
                ? sanitizeModelIds(mergeHouseholds(lastSyncedModelRef.current, latestModelRef.current, incomingModel))
                : incomingModel;
            lastSyncedModelRef.current = incomingModel;
            remoteSeqRef.current += 1;
            setModel(shown);
            latestModelRef.current = shown;

            // Keep personal local backup fresh
            const username = usernameRef.current;
            const personalKey = keyRef.current;
            if (username && personalKey) {
              encryptJSON(personalKey, shown)
                .then((enc) => saveEncryptedProfileData(username, enc))
                .catch(() => {});
            }
            rescheduleBillNotifications(shown).catch(() => {});
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
    options: { deferNotifications?: boolean; offlineStart?: boolean } = {}
  ): Promise<HouseholdModel | null> {
    setLoading(true);
    // Accounts made before username claims existed claim theirs now (quietly).
    ensureUsernameClaim(username);
    cleanupHouseholdListener();
    usernameRef.current = username;
    keyRef.current = key;
    householdIdRef.current = undefined;
    householdKeyRef.current = null;
    forgetParts();
    // Signing in (or a new account) ends any guest session.
    setGuest(false);
    setGuestRequest(null);
    try {
      const profile = bootstrap?.profile ?? (await loadProfilesIndex()).find((p) => p.username === username);
      let householdId = bootstrap?.householdId ?? profile?.householdId;
      // Version 2.1 (Cath): the person who made the invite finishes linking as soon as the
      // app opens, not only while their Profile screen happens to be open.
      if (!householdId && !bootstrap?.initialModel) {
        const joined = await finishPendingInvite(username, key);
        if (joined) householdId = joined;
      }
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
        if (options.offlineStart) {
          // Opened from the phone's copy. Changes that were waiting from last time keep
          // waiting (merged with the online copy once connected, never replaced by it).
          awaitingOnlineRef.current = householdId;
          lastSyncedModelRef.current = loaded;
          try {
            const baseText = await loadHouseholdPendingBase(username);
            if (baseText) {
              lastSyncedModelRef.current = sanitizeModelIds(decryptJSON<HouseholdModel>(key, baseText));
              setPendingChanges(1);
            }
          } catch {}
        } else {
          setupHouseholdListener(householdId);
        }
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
          saveCachedHouseholdKey(username, wrapped).catch(() => {});
          let encryptedHousehold: string | null = null;
          let layout = 0;
          try {
            const docData = await loadHouseholdDoc(householdId);
            encryptedHousehold = docData.data;
            layout = docData.layout;
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
            // Version 2.1: layout 2 = the parts are the up-to-date copy (falls back to `data`).
            const fromParts = await loadModelFromParts(username, householdId, householdKey, layout);
            const loaded = sanitizeModelIds(fromParts ?? decryptJSON<HouseholdModel>(householdKey, encryptedHousehold));
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
            lastSyncedModelRef.current = loaded;
            noteStorageSize(encryptedHousehold);
            // Version 2.1: changes made on this phone that never reached the household
            // (offline, or a failed sync) are merged in instead of being thrown away.
            const waiting = await mergeWaitingChanges(username, key, loaded);
            if (waiting) {
              setModel(waiting);
              setPendingChanges(1);
              saveEncryptedProfileData(username, await encryptJSON(key, waiting)).catch(() => {});
              setIsLinked(true);
              setupHouseholdListener(householdId);
              partsAfterLoad(username, householdId, householdKey, loaded, layout).catch(() => {});
              if (!options.deferNotifications) rescheduleBillNotifications(waiting).catch(() => {});
              setLoading(false);
              setTimeout(() => syncPendingChanges(), 500);
              return waiting;
            }
            setModel(loaded);
            setIsLinked(true);
            saveEncryptedProfileData(username, await encryptJSON(key, loaded)).catch(() => {});
            setupHouseholdListener(householdId);
            // Version 2.1 (test accounts only for now): copy into / check the parts.
            partsAfterLoad(username, householdId, householdKey, loaded, layout).catch(() => {});
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


  // Sends the latest data to the cloud after being offline (or after a failed sync).
  // Version 2.1 (merge before save) ----
  // Sends this phone's household to the online copy. If another phone saved since this phone
  // last synced, the two are merged first (merge3.ts), all in one step online. Returns what
  // was written and the household it holds.
  //
  // Version 2.2 (review fix): `base` / `baseText` are the household as both phones last
  // agreed on it, taken when this save started. Anything online that differs from that is
  // the other phone's change and is merged in (before, a change that arrived while this save
  // was running could be overwritten). The text about to be written is remembered, so when
  // it comes back through the live listener it's recognised as this phone's own save.
  async function pushHousehold(
    householdId: string,
    householdKey: CryptoJS.lib.WordArray,
    mine: HouseholdModel,
    mineEncrypted: string,
    base: HouseholdModel | null = lastSyncedModelRef.current,
    baseText: string | null = lastEncryptedDataRef.current
  ): Promise<{ encrypted: string; model: HouseholdModel; merged: boolean }> {
    let result = mine;
    const seq = remoteSeqRef.current;
    const encrypted = await saveHouseholdDataChecked(householdId, async (online) => {
      result = mine;
      if (online && online !== baseText && currentLayout(householdId) < 2) {
        try {
          const theirs = sanitizeModelIds(decryptJSON<HouseholdModel>(householdKey, online));
          result = sanitizeModelIds(mergeHouseholds(base, mine, theirs));
        } catch (e) {
          result = mine; // can't read the online copy: save as before
        }
      }
      const text = result === mine ? mineEncrypted : await encryptJSON(householdKey, result);
      ownWriteRef.current = text;
      return text;
    });
    // (Not when the other phone's newer save already came in meanwhile: that one is newer.)
    if (householdIdRef.current === householdId && remoteSeqRef.current === seq) {
      lastEncryptedDataRef.current = encrypted;
      lastSyncedModelRef.current = result;
    }
    return { encrypted, model: result, merged: result !== mine };
  }
  // After a save that merged in the other phone's changes. Nothing newer on this phone: show
  // what was saved. Version 2.2 (review fix): newer changes were made while it was saving:
  // the other phone's changes are folded into them and saved again (before, they were
  // dropped and the next save wrote over them).
  function settleMerged(
    res: { model: HouseholdModel; merged: boolean },
    sent: HouseholdModel,
    version: number,
    username: string,
    key: CryptoJS.lib.WordArray | null
  ) {
    if (!res.merged) return;
    if (usernameRef.current !== username || keyRef.current !== key) return; // signed out / switched
    // What's on screen now may be newer than what was sent (changes made here meanwhile, or
    // the other phone's newer save already shown): fold the saved result into it.
    const latest = latestModelRef.current;
    if (!latest) return;
    const shown = latest === sent ? res.model : sanitizeModelIds(mergeHouseholds(sent, latest, res.model));
    if (modelVersionRef.current !== version) persistDirtyRef.current = true; // the save line sends it next
    setModel(shown);
    latestModelRef.current = shown;
    if (key) {
      encryptJSON(key, shown).then((enc) => saveEncryptedProfileData(username, enc)).catch(() => {});
    }
    rescheduleBillNotifications(shown).catch(() => {});
  }
  // A change couldn't be sent: remember the version both phones last agreed on, so it can be
  // merged later even if the app is closed first.
  function rememberWaitingBase(
    username: string | null = usernameRef.current,
    key: CryptoJS.lib.WordArray | null = keyRef.current,
    base: HouseholdModel | null = lastSyncedModelRef.current
  ) {
    if (!username || !key || !base) return;
    loadHouseholdPendingBase(username)
      .then(async (existing) => {
        if (!existing) await saveHouseholdPendingBase(username, await encryptJSON(key, base));
      })
      .catch(() => {});
  }
  function forgetWaitingBase(username: string | null = usernameRef.current) {
    if (username) saveHouseholdPendingBase(username, null).catch(() => {});
  }
  // When the app opens: if changes were waiting to be sent, merge this phone's copy (kept on
  // the phone) with the online one. Returns the merged household, or null if nothing waits.
  async function mergeWaitingChanges(username: string, key: CryptoJS.lib.WordArray, online: HouseholdModel): Promise<HouseholdModel | null> {
    try {
      const baseText = await loadHouseholdPendingBase(username);
      if (!baseText) return null;
      const localText = await loadEncryptedProfileData(username);
      if (!localText) return null;
      const base = sanitizeModelIds(decryptJSON<HouseholdModel>(key, baseText));
      const mine = sanitizeModelIds(decryptJSON<HouseholdModel>(key, localText));
      if (JSON.stringify(mine) === JSON.stringify(base)) {
        await saveHouseholdPendingBase(username, null);
        return null; // nothing was actually changed here
      }
      return sanitizeModelIds(mergeHouseholds(base, mine, online));
    } catch (e) {
      console.warn('Could not merge changes that were waiting:', e);
      return null;
    }
  }

  const syncingRef = useRef(false);
  // Version 2.1 (S6): the first save made offline says where it went, once per stretch
  // offline (not on every tap).
  const offlineNoteShownRef = useRef(false);
  function noteSavedOffline() {
    if (offlineNoteShownRef.current) return;
    offlineNoteShownRef.current = true;
    showSaved("Saved on this phone. It'll sync when you're back online.");
  }
  function syncPendingChanges() {
    if (syncingRef.current) return;
    syncingRef.current = true;
    // Version 2.2: one save at a time (see inSaveLine).
    inSaveLine(syncPendingChangesNow).finally(() => {
      syncingRef.current = false;
    });
  }
  async function syncPendingChangesNow() {
    const username = usernameRef.current;
    const current = latestModelRef.current;
    if (!username || !current || awaitingOnlineRef.current) return;
    const key = keyRef.current;
    try {
      if (householdIdRef.current && householdKeyRef.current) {
        const encrypted = await encryptJSON(householdKeyRef.current, current);
        noteStorageSize(encrypted);
        if (encrypted.length > STORAGE_LIMIT_CHARS && (await partsSaveWhenTooBig(username, householdIdRef.current, householdKeyRef.current, current))) {
          // Version 2.1: too big for one copy, saved in parts instead.
        } else {
          if (tooBigToSync(encrypted)) return;
          const version = modelVersionRef.current;
          const res = await withTimeout(
            pushHousehold(householdIdRef.current, householdKeyRef.current, current, encrypted),
            12000,
            'Timed out syncing.'
          );
          settleMerged(res, current, version, username, key);
          forgetWaitingBase(username);
          partsAfterSave(username, householdIdRef.current, householdKeyRef.current, res.model).catch(() => {});
        }
      } else if (saltRef.current && keyRef.current) {
        const encrypted = await encryptJSON(keyRef.current, current);
        noteStorageSize(encrypted);
        if (tooBigToSync(encrypted)) return;
        await withTimeout(
          backupPersonalData(username, saltRef.current, encrypted, modelVersionRef.current),
          12000,
          'Timed out syncing.'
        );
      }
      // Version 2.1 (S8): a light note when waiting changes reach the cloud.
      if (pendingRef.current > 0) {
        const n = pendingRef.current;
        showSaved(`Back online. ${n} ${n === 1 ? 'change' : 'changes'} synced.`);
      }
      if (usernameRef.current === username) setPendingChanges(0);
    } catch (e) {
      // Still not reachable; try again on the next change of connection.
    }
  }

  // Online / offline. The phone's "connection changed" event doesn't always arrive (e.g.
  // switching on airplane mode in Expo Go), so the app also re-checks every few seconds
  // while it's open and whenever it comes back to the front.
  function applyNetworkState(state: { isConnected?: boolean; isInternetReachable?: boolean | null }) {
    const online = state.isConnected !== false && state.isInternetReachable !== false;
    const cameBack = online && !onlineRef.current;
    if (!online) offlineNoteShownRef.current = false;
    onlineRef.current = online;
    // 2.2 speed sweep: only tell the app when it actually changed (this runs every few seconds).
    setIsOnline((was) => (was === online ? was : online));
    if (cameBack) syncPendingChanges();
  }
  function recheckNetwork() {
    Network.getNetworkStateAsync().then(applyNetworkState).catch(() => {});
  }
  // A sync that times out or can't reach the cloud: show the offline banner instead of an
  // error, and let the regular re-check pick it up (and sync) once the connection is back.
  // Returns true when it looks like the phone is offline.
  async function treatAsOfflineIfUnreachable(): Promise<boolean> {
    try {
      const state = await Network.getNetworkStateAsync();
      if (state.isConnected === false || state.isInternetReachable === false) {
        applyNetworkState(state);
        return true;
      }
    } catch {}
    return false;
  }

  // Version 2.1 (Cath): the person who made an invite is linked as soon as the other
  // person finishes joining. Checked when the app opens (loadModel) and every time it comes
  // back to the front, so they don't have to keep Profile open. Returns the household id
  // when this account has just been linked.
  async function finishPendingInvite(username: string, key: CryptoJS.lib.WordArray): Promise<string | null> {
    try {
      const pending = await loadPendingHostLink(username);
      const uid = getCurrentFirebaseUser()?.uid;
      if (!pending?.code || !pending.secretHex || !uid) return null;
      const result = await finishHostLink(pending.code, username, pending.secretHex, key, uid);
      return result.status === 'done' ? result.householdId : null;
    } catch (e) {
      return null; // not finished yet, offline, or the code has expired
    }
  }
  const resumeLinkCheckRef = useRef<() => void>(() => {});
  resumeLinkCheckRef.current = () => {
    const username = usernameRef.current;
    const key = keyRef.current;
    if (!username || !key || householdIdRef.current) return;
    finishPendingInvite(username, key).then(async (joined) => {
      if (!joined || householdIdRef.current || usernameRef.current !== username) return;
      await loadModel(username, key);
      Alert.alert('You\'re linked', 'You now share a household. Anything either of you adds shows up for both.');
    });
  };

  useEffect(() => {
    recheckNetwork();
    const sub = Network.addNetworkStateListener(applyNetworkState);
    const appSub = AppState.addEventListener('change', (st) => {
      if (st === 'active') {
        recheckNetwork();
        resumeLinkCheckRef.current();
      }
    });
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') recheckNetwork();
    }, 4000);
    return () => {
      sub.remove();
      appSub.remove();
      clearInterval(timer);
    };
  }, []);

  // Version 2.2: the last salt/household note sent online (see persistModel).
  const cloudMetaSentRef = useRef<string | null>(null);
  function getModel(): HouseholdModel | null {
    return latestModelRef.current;
  }
  // ---- Version 2.2: the save line ----
  // Saving (locking the data, writing it on the phone, then online) runs in the background,
  // one save at a time. Each turn saves the NEWEST data, so quick changes in a row are saved
  // together (review fix: two saves running side by side could undo the other phone's change).
  const saveLineRef = useRef<Promise<void>>(Promise.resolve());
  const persistDirtyRef = useRef(false); // a change is waiting to be saved
  const persistQueuedRef = useRef(false); // a saving turn is waiting in line or running
  // The text this phone is writing online right now, so the live listener knows it's ours.
  const ownWriteRef = useRef<string | null>(null);
  // Goes up each time the live listener shows the other phone's save (see pushHousehold).
  const remoteSeqRef = useRef(0);
  function inSaveLine(job: () => Promise<void>): Promise<void> {
    const run = saveLineRef.current.then(job).catch((err) => {
      console.error('Saving failed:', err);
    });
    saveLineRef.current = run;
    return run;
  }
  function savesBusy(): boolean {
    return persistQueuedRef.current || persistDirtyRef.current;
  }
  function requestPersist() {
    persistDirtyRef.current = true;
    if (persistQueuedRef.current) return; // the turn in line takes the newest data
    persistQueuedRef.current = true;
    inSaveLine(async () => {
      try {
        // Version 2.2 speed fix (Cath: tapping Add still lagged): locking the data
        // (encrypting it) blocks the screen while it runs, so it now waits until the form has
        // closed and the list has redrawn (about a quarter of a second). Saves made in that
        // moment are written together. Log out / Switch account still wait for this.
        await new Promise<void>((resolve) => InteractionManager.runAfterInteractions(() => setTimeout(resolve, 250)));
        while (persistDirtyRef.current) {
          persistDirtyRef.current = false;
          const username = usernameRef.current;
          const latest = latestModelRef.current;
          if (!username || !latest || guestRef.current) return;
          const version = modelVersionRef.current;
          const key = keyRef.current;
          try {
            await persistModel(latest, username, version);
          } catch (err) {
            // Review fix: an unexpected failure says so (it used to be silent).
            console.error('Saving failed:', err);
            if (usernameRef.current === username && keyRef.current === key) {
              setPendingChanges((n) => n + 1);
              if (householdIdRef.current) rememberWaitingBase(username, key, lastSyncedModelRef.current);
              Alert.alert("Couldn't save", "Your last change couldn't be saved. It's still on screen; please try again. If it keeps happening, restart the app.");
            }
          }
        }
      } finally {
        persistQueuedRef.current = false;
      }
    });
  }
  // Log out and Switch account wait for saving to finish first (up to about 15 seconds).
  async function waitForSaves(maxMs = 15000): Promise<void> {
    if (!savesBusy() && !syncingRef.current) return;
    showSaved('Saving your last change…');
    await Promise.race([saveLineRef.current, new Promise<void>((resolve) => setTimeout(resolve, maxMs))]);
  }

  // Version 2.2 (canvas W1 B + W2): a new transaction remembers who added it; a changed one
  // remembers who changed it and when. Unchanged ones are left exactly as they were.
  function stampWho(list: ManualTransaction[], before: ManualTransaction[], knownIds: Set<string>, now: number, who: string | null): ManualTransaction[] {
    const prevById = new Map(before.map((t) => [t.id, t]));
    return list.map((t) => {
      if (!knownIds.has(t.id)) {
        const stamped = t.createdAt ? t : { ...t, createdAt: now };
        return who && !stamped.addedBy ? { ...stamped, addedBy: who } : stamped;
      }
      const old = prevById.get(t.id);
      if (!who || !old || old === t) return t;
      const strip = (x: ManualTransaction) => JSON.stringify({ ...x, changedBy: undefined, changedAt: undefined });
      if (strip(old) === strip(t)) return t;
      return { ...t, changedBy: who, changedAt: now };
    });
  }

  async function saveModel(updatedModel: HouseholdModel) {
    // Left to Spend: stamp the moment each NEW transaction is first saved (any screen
    // that adds one: Transactions, CSV import, Travel, Events, refunds). Existing
    // transactions are never re-stamped.
    const prev = latestModelRef.current ?? model;
    const knownIds = new Set((prev?.manualTransactions || []).map((t) => t.id));
    const now = Date.now();
    // Redesign: loan payments and savings moves get the same stamp, so a card's
    // balance can tell whether they came after its balance was last updated.
    const knownLoanPays = new Set((prev?.loans || []).flatMap((l) => (l.actualPayments || []).map((p) => p.id)));
    const knownContribs = new Set((prev?.savingsGoals || []).flatMap((g) => (g.contributions || []).map((c) => c.id)));
    const knownPaydays = new Set((prev?.income || []).flatMap((s) => (s.paymentLog || []).map((e) => e.id)));
    const stamped: HouseholdModel = {
      ...updatedModel,
      manualTransactions: stampWho(updatedModel.manualTransactions || [], prev?.manualTransactions || [], knownIds, now, usernameRef.current),
      loans: (updatedModel.loans || []).map((l) =>
        (l.actualPayments || []).some((p) => !p.createdAt && !knownLoanPays.has(p.id))
          ? {
              ...l,
              actualPayments: (l.actualPayments || []).map((p) =>
                p.createdAt || knownLoanPays.has(p.id) ? p : { ...p, createdAt: now }
              ),
            }
          : l
      ),
      income: (updatedModel.income || []).map((s) =>
        (s.paymentLog || []).some((e) => !e.createdAt && !knownPaydays.has(e.id))
          ? {
              ...s,
              paymentLog: (s.paymentLog || []).map((e) =>
                e.createdAt || knownPaydays.has(e.id) ? e : { ...e, createdAt: now }
              ),
            }
          : s
      ),
      savingsGoals: (updatedModel.savingsGoals || []).map((g) =>
        (g.contributions || []).some((c) => !c.createdAt && !knownContribs.has(c.id))
          ? {
              ...g,
              contributions: (g.contributions || []).map((c) =>
                c.createdAt || knownContribs.has(c.id) ? c : { ...c, createdAt: now }
              ),
            }
          : g
      ),
    };
    // Version 2.2 (W1/W2 everywhere): who added / changed bills, debts, loans, pots,
    // income, trips and the entries inside them.
    const sanitizedModel = sanitizeModelIds(stampHouseholdWho(stamped, prev, now, usernameRef.current));
    // Version 3: no account yet. A new money entry asks to save Finance Flow first;
    // anything else (Home tidying up) just changes what's on screen.
    if (guestRef.current) {
      const entry = describeNewEntry(latestModelRef.current, sanitizedModel);
      if (entry) setGuestRequest({ model: sanitizedModel, entry });
      else setModel(sanitizedModel);
      return;
    }
    modelVersionRef.current += 1;
    // Version 2.2 (Cath: the form waited with a spinner before closing): the screens redraw
    // with the new data one frame later, so a form that closes after saving starts closing
    // first and the new entry is seen sliding into its list. latestModelRef (just below)
    // has the new data at once, so another save right after starts from it, and the redraw
    // always shows the newest data (never an older one that a sync may have replaced).
    requestAnimationFrame(() => setModel(latestModelRef.current));
    // The newest data straight away (review fix: a save right after another one used to
    // start from the data before it).
    latestModelRef.current = sanitizedModel;
    const username = usernameRef.current;
    if (!username) return;
    // Version 2.2 (Cath: Save and Add buttons lagged, a trip took seconds to save): what's
    // on screen changes at once and the form can close straight away; saving carries on in
    // the background, one save at a time (the save line above).
    requestPersist();
  }

  // The saving half of saveModel (run by the save line). The account, household, keys, salt and
  // the last agreed household are taken when this save starts, so a save still running after
  // Log out / Switch account finishes in the right place, and changes nothing on screen.
  async function persistModel(sanitizedModel: HouseholdModel, username: string, version: number) {
    const householdId = householdIdRef.current;
    const householdKey = householdKeyRef.current;
    const key = keyRef.current;
    const salt = saltRef.current;
    const base = lastSyncedModelRef.current;
    const baseText = lastEncryptedDataRef.current;
    const stillHere = () => usernameRef.current === username && keyRef.current === key;
    if (householdId && householdKey) {
      // Linked profile: save to the shared household document
      const encrypted = await encryptJSON(householdKey, sanitizedModel);

      // Continuous local snapshotting: keep an up-to-date personal copy in local storage first.
      // Deliberately not awaited — this shouldn't hold up the household sync below — but a
      // failure here is no longer swallowed silently, since this snapshot is what offline app
      // launch, household dissolution, and account recovery all fall back to reading.
      if (key) {
        encryptJSON(key, sanitizedModel)
          .then((personalEncrypted) =>
            withTimeout(
              saveEncryptedProfileData(username, personalEncrypted),
              8000,
              'Timed out saving local snapshot.'
            )
          )
          .catch((err) => {
            console.error('Failed to save personal local snapshot:', err);
            if (stillHere()) {
              Alert.alert(
                'Local Save Failed',
                'Could not save an offline backup of your changes on this device. Your household sync will still be attempted.'
              );
            }
          });
      }

      if (stillHere()) noteStorageSize(encrypted);
      if (!onlineRef.current || awaitingOnlineRef.current) {
        // Offline (or still signing in after opening from the phone): saved on this phone;
        // it syncs once connected.
        rememberWaitingBase(username, key, base);
        if (stillHere()) {
          if (!onlineRef.current) noteSavedOffline();
          setPendingChanges((n) => n + 1);
        }
      } else if (
        encrypted.length > STORAGE_LIMIT_CHARS &&
        // (with a time limit: saves now wait in line, so none may hang)
        (await withTimeout(partsSaveWhenTooBig(username, householdId, householdKey, sanitizedModel), 15000, 'Timed out saving parts.').catch(() => false))
      ) {
        // Version 2.1: too big for one copy, saved in parts instead.
      } else if (tooBigToSync(encrypted)) {
        rememberWaitingBase(username, key, base);
        if (stillHere()) setPendingChanges((n) => n + 1);
      } else {
        try {
          const res = await withTimeout(
            pushHousehold(householdId, householdKey, sanitizedModel, encrypted, base, baseText),
            8000,
            'Timed out waiting for the shared household to sync.'
          );
          // The whole household was just sent, so nothing is waiting any more.
          forgetWaitingBase(username);
          partsAfterSave(username, householdId, householdKey, res.model).catch(() => {});
          if (stillHere()) {
            settleMerged(res, sanitizedModel, version, username, key);
            setPendingChanges(0);
          }
        } catch (err) {
          rememberWaitingBase(username, key, base);
          if (stillHere()) setPendingChanges((n) => n + 1);
          // (Not after Log out / Switch account: that save is no longer this screen's.)
          if (onlineRef.current && !(await treatAsOfflineIfUnreachable()) && stillHere()) {
            Alert.alert(
              'Sync Failed',
              'Your changes were saved locally on this device, but could not be synced to the shared household. Please check your connection.'
            );
          }
        }
      }

      if (stillHere()) rescheduleBillNotifications(sanitizedModel).catch(() => {});

      // The online note of this profile's salt and household. Version 2.2: sent once,
      // and again only when either changes (it used to be re-sent after every tap).
      const meta = `${username}|${salt}|${householdId}`;
      if (salt && cloudMetaSentRef.current !== meta) {
        saveProfileCloudBackup(username, { salt, householdId })
          .then(() => {
            cloudMetaSentRef.current = meta;
          })
          .catch(() => {});
      }
      return;
    }

    if (!key) return;
    // Unlinked profile: save on this phone. If that fails, say so (linked profiles
    // already show "Sync Failed"); the change stays on screen until the app closes.
    let encrypted: string;
    try {
      encrypted = await encryptJSON(key, sanitizedModel);
      await withTimeout(saveEncryptedProfileData(username, encrypted), 8000, 'Timed out saving on this phone.');
      if (salt) await setBackupPending(username, true);
    } catch (err) {
      console.error('Failed to save on this phone:', err);
      Alert.alert(
        "Couldn't save",
        "Your last change couldn't be saved on this phone. Please try again. If it keeps happening, restart the app."
      );
      return;
    }
    if (stillHere()) rescheduleBillNotifications(sanitizedModel).catch(() => {});

    if (salt) {
      if (stillHere()) noteStorageSize(encrypted);
      if (!onlineRef.current && stillHere()) noteSavedOffline();
      if (!onlineRef.current || tooBigToSync(encrypted)) {
        // Offline (or too big to send): saved on this phone; it syncs once it can.
        if (stillHere()) setPendingChanges((n) => n + 1);
        return;
      }
      try {
        await withTimeout(
          backupPersonalData(username, salt, encrypted, version),
          8000,
          'Timed out waiting for the cloud backup to sync.'
        );
      } catch (err) {
        console.error('Cloud backup failed:', err);
        if (stillHere()) setPendingChanges((n) => n + 1);
        if (onlineRef.current && !(await treatAsOfflineIfUnreachable()) && stillHere()) {
          Alert.alert(
            'Backup Failed',
            'Your changes were saved locally on this device, but could not be backed up to the cloud. Please check your connection.'
          );
        }
      }
    }
  }

  // ---- PC.8: pull-to-refresh ----
  // Uploads a personal backup, records which cloud version this device now knows about,
  // and clears the "backup pending" flag, unless a newer save happened in the meantime.
  async function backupPersonalData(username: string, salt: string, encrypted: string, version: number) {
    const at = await saveProfileCloudBackup(username, { salt, data: encrypted });
    await saveCloudSyncAt(username, at);
    if (version === modelVersionRef.current) await setBackupPending(username, false);
  }

  async function refreshModel(): Promise<RefreshOutcome> {
    if (refreshInFlightRef.current) return 'up_to_date';
    refreshInFlightRef.current = true;
    const startVersion = modelVersionRef.current;
    try {
      const username = usernameRef.current;
      const key = keyRef.current;
      if (!username || !key) return 'unavailable';

      // ---- Linked household: cloud is the shared truth ----
      const householdId = householdIdRef.current;
      const householdKey = householdKeyRef.current;
      if (householdId && householdKey) {
        const docData = await withTimeout(loadHouseholdDoc(householdId), 6000, 'Refresh timed out.');
        const encryptedHousehold = docData.data;
        if (modelVersionRef.current !== startVersion) return 'up_to_date';
        // Version 2.1: layout 2 = read the parts (the single copy is out of date).
        if (docData.layout >= 2 && partsEnabledFor(username)) {
          const fromParts = await loadModelFromParts(username, householdId, householdKey, docData.layout);
          if (fromParts) {
            if (modelVersionRef.current !== startVersion) return 'up_to_date';
            if (sameAsParts(fromParts, latestModelRef.current)) return 'up_to_date';
            const incomingParts = sanitizeModelIds(fromParts);
            setModel(incomingParts);
            encryptJSON(key, incomingParts)
              .then((enc) => saveEncryptedProfileData(username, enc))
              .catch(() => {});
            rescheduleBillNotifications(incomingParts).catch(() => {});
            return 'updated';
          }
        }
        if (!encryptedHousehold || encryptedHousehold === lastEncryptedDataRef.current) return 'up_to_date';
        let incoming: HouseholdModel;
        try {
          incoming = sanitizeModelIds(decryptJSON<HouseholdModel>(householdKey, encryptedHousehold));
        } catch (e) {
          return 'cannot_decrypt';
        }
        lastEncryptedDataRef.current = encryptedHousehold;
        // Version 2.1: keep changes that haven't been sent yet (merged, not replaced).
        if (pendingRef.current > 0 && latestModelRef.current) {
          incoming = sanitizeModelIds(mergeHouseholds(lastSyncedModelRef.current, latestModelRef.current, incoming));
          lastSyncedModelRef.current = sanitizeModelIds(decryptJSON<HouseholdModel>(householdKey, encryptedHousehold));
        } else {
          lastSyncedModelRef.current = incoming;
        }
        noteStorageSize(encryptedHousehold);
        setModel(incoming);
        encryptJSON(key, incoming)
          .then((enc) => saveEncryptedProfileData(username, enc))
          .catch(() => {});
        rescheduleBillNotifications(incoming).catch(() => {});
        return 'updated';
      }

      // ---- Personal (unlinked) profile: never overwrite unbacked-up local edits ----
      const salt = saltRef.current;
      if (!salt) return 'unavailable';
      const currentModel = model;
      const pending = await loadBackupPending(username);
      const syncAt = await loadCloudSyncAt(username);
      const cloud = await withTimeout(loadProfileCloudBackup(username), 6000, 'Refresh timed out.');
      if (modelVersionRef.current !== startVersion) return 'up_to_date';
      const cloudChanged = !!(cloud && cloud.data && (syncAt === null || cloud.updatedAt !== syncAt));

      if (pending) {
        // This device has edits the cloud never received.
        if (cloudChanged) return 'conflict'; // the cloud changed too: touch nothing
        const localEncrypted = await loadEncryptedProfileData(username);
        if (!localEncrypted) return 'unavailable';
        await withTimeout(backupPersonalData(username, salt, localEncrypted, startVersion), 6000, 'Refresh timed out.');
        return 'backed_up';
      }

      if (!cloudChanged || !cloud || !cloud.data) return 'up_to_date';
      let cloudModel: HouseholdModel;
      try {
        cloudModel = sanitizeModelIds(decryptJSON<HouseholdModel>(key, cloud.data));
      } catch (e) {
        return 'cannot_decrypt'; // for example the password was changed on another device
      }
      if (currentModel && JSON.stringify(cloudModel) === JSON.stringify(currentModel)) {
        await saveCloudSyncAt(username, cloud.updatedAt);
        return 'up_to_date';
      }
      setModel(cloudModel);
      await saveEncryptedProfileData(username, cloud.data);
      await saveCloudSyncAt(username, cloud.updatedAt);
      rescheduleBillNotifications(cloudModel).catch(() => {});
      return 'updated';
    } catch (e) {
      return 'failed';
    } finally {
      refreshInFlightRef.current = false;
    }
  }

  function startGuest(initial: HouseholdModel, info: { name: string; helpWith: string[] }) {
    setGuestInfo(info);
    cleanupHouseholdListener();
    usernameRef.current = null;
    keyRef.current = null;
    householdIdRef.current = undefined;
    householdKeyRef.current = null;
    setIsLinked(false);
    setGuestRequest(null);
    setGuest(true);
    setModel(initial);
  }
  function resolveGuestRequest(keep: boolean) {
    setGuestRequest((req) => {
      if (req && keep) setModel(req.model);
      return null;
    });
  }
  function endGuest() {
    setGuest(false);
    setGuestRequest(null);
  }

  function goOnline() {
    const id = awaitingOnlineRef.current;
    if (!id || householdIdRef.current !== id) return;
    awaitingOnlineRef.current = null;
    setupHouseholdListener(id);
    refreshModel()
      .catch(() => 'failed')
      .finally(() => {
        if (pendingRef.current > 0) syncPendingChanges();
      });
  }

  function clearModel() {
    awaitingOnlineRef.current = null;
    ownWriteRef.current = null;
    cleanupHouseholdListener();
    setPendingChanges(0);
    usernameRef.current = null;
    keyRef.current = null;
    householdIdRef.current = undefined;
    householdKeyRef.current = null;
    lastEncryptedDataRef.current = null;
    lastSyncedModelRef.current = null;
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
        await removePartsBeforeDissolve(username, householdId);
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
        withTimeout(
          saveProfileCloudBackup(username, { salt: saltRef.current, data: encrypted }),
          8000,
          'Timed out waiting for the personal backup to sync.'
        ).catch(() => {
          Alert.alert(
            'Backup Not Updated',
            "You've unlinked from the household, but we couldn't update your personal cloud backup. Try again once you have a better connection."
          );
        });
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
        withTimeout(
          saveProfileCloudBackup(username, { salt: saltRef.current, data: encrypted }),
          8000,
          'Timed out waiting for the personal backup to sync.'
        ).catch(() => {
          Alert.alert(
            'Backup Not Updated',
            "You've transferred ownership and unlinked, but we couldn't update your personal cloud backup. Try again once you have a better connection."
          );
        });
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

  // Local, offline check: is this the account password? Same checks as the first
  // half of changePassword (linked profile: unwrap the household key; personal
  // profile: decrypt the saved data). Used before saving a PIN copy.
  async function verifyPassword(password: string): Promise<boolean> {
    const user = usernameRef.current;
    if (!user || !password) return false;
    const profiles = await loadProfilesIndex();
    const profile = profiles.find((p) => p.username === user);
    if (!profile) return false;
    const candidateKey = deriveKey(password, profile.salt);

    if (householdIdRef.current && householdKeyRef.current) {
      const wrapped = await loadWrappedHouseholdKey(user);
      if (!wrapped) return false;
      try {
        unwrapHouseholdKey(wrapped.wrappedKey, candidateKey);
        return true;
      } catch (e) {
        return false;
      }
    }

    const encrypted = await loadEncryptedProfileData(user);
    if (!encrypted) return false;
    try {
      decryptJSON(candidateKey, encrypted);
      return true;
    } catch (e) {
      return false;
    }
  }

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
      saveCachedHouseholdKey(username, { householdId: householdIdRef.current, wrappedKey: reWrapped }).catch(() => {});
      await updateProfileSalt(username, newSalt);

      saltRef.current = newSalt;
      withTimeout(
        saveProfileCloudBackup(username, {
          salt: newSalt,
          householdId: householdIdRef.current,
        }),
        8000,
        'Timed out waiting for the cloud backup to sync.'
      ).catch((backupError) => {
        console.error('Failed to update cloud backup after password change:', backupError);
        Alert.alert(
          'Backup Not Updated',
          'Your password was changed, but we could not update your cloud backup with it. If you sign in on another device before this succeeds, try your old password there too, or change your password again once you have a better connection.'
        );
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
    withTimeout(
      saveProfileCloudBackup(username, {
        salt: newSalt,
        householdId: householdIdRef.current,
        data: reEncrypted,
      }),
      8000,
      'Timed out waiting for the cloud backup to sync.'
    ).catch((backupError) => {
      console.error('Failed to update cloud backup after password change:', backupError);
      Alert.alert(
        'Backup Not Updated',
        'Your password was changed, but we could not update your cloud backup with it. If you sign in on another device before this succeeds, try your old password there too, or change your password again once you have a better connection.'
      );
    });

    // Pre-Phase-B Tier 1 fix: for unlinked profiles, the old recovery key doc wrapped the OLD
    // password-derived key and is now invalid. Delete it so the user isn't misled, and so
    // Settings > Security can show that the recovery key needs regenerating.
    withTimeout(deleteRecoveryKey(username), 8000, 'Timed out clearing the old recovery key.').catch((err) => {
      console.error('Failed to delete stale recovery key after password change:', err);
      Alert.alert(
        'Recovery Key Not Updated',
        'Your password was changed, but we could not clear your old recovery key. It may not work until you generate a new one in Settings > Security.'
      );
    });

    keyRef.current = newKey;
    return { ok: true };
  }

  // 2.2 speed sweep (Cath: "even the card animations is lagging"): the shared data is
  // only handed out again when something in it really changed. Before, every redraw here
  // made every screen in the app (including the hidden tabs) redraw too. It covers every
  // piece of state above, so the functions inside always see the latest data.
  const username = usernameRef.current;
  const value = useMemo(
    () => ({
        guest,
        guestInfo,
        guestRequest,
        startGuest,
        resolveGuestRequest,
        endGuest,
        goOnline,
        model,
        loading,
        loadModel,
        saveModel,
        waitForSaves,
        getModel,
        clearModel,
        refreshModel,
        changePassword,
        verifyPassword,
        username,
        isOnline,
        pendingChanges,
        storageUsed,
        isLinked,
        getPersonalKey,
        getHouseholdKey,
        getHouseholdId,
        unlinkHousehold,
        unlinkAndTransferOwnership,
        linkNoticeMsg,
        clearLinkNoticeMsg,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [guest, guestInfo, guestRequest, model, loading, isOnline, pendingChanges, storageUsed, isLinked, linkNoticeMsg, username]
  );

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
}
