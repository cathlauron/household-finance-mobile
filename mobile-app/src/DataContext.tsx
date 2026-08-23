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
import { encryptJSON, decryptJSON } from './encryption';
import { loadEncryptedProfileData, saveEncryptedProfileData } from './storage';
import { rescheduleBillNotifications } from './pushNotifications';

type DataContextValue = {
  model: HouseholdModel | null;
  loading: boolean;
  loadModel: (username: string, key: CryptoJS.lib.WordArray) => Promise<void>;
  saveModel: (updatedModel: HouseholdModel) => Promise<void>;
  clearModel: () => void;
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
  }

  function clearModel() {
    usernameRef.current = null;
    keyRef.current = null;
    setModel(null);
  }

  return (
    <DataContext.Provider value={{ model, loading, loadModel, saveModel, clearModel }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
}