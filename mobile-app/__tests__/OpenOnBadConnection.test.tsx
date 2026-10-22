import React, { useEffect } from 'react';
import { Text } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import CryptoJS from 'crypto-js';

// H-03 (2026-10-22, Cath chose "open from the phone's copy"): if the connection dropped
// while the app was opening a shared household, Home opened EMPTY and as if not linked,
// and anything added then overwrote the phone's own copy and the online backup with
// almost-empty data. Now it opens the copy saved on this phone, stays linked, and
// reconnects in the background (like opening offline).

// Test keys and the "phone's copy", locked the way the app locks it.
const mockPersonalKey = CryptoJS.enc.Hex.parse('11'.repeat(32));
const mockHouseholdKeyHex = '22'.repeat(32);
function mockLock(key: any, data: any) {
  const iv = CryptoJS.enc.Hex.parse('33'.repeat(16));
  return '33'.repeat(16) + ':' + CryptoJS.AES.encrypt(JSON.stringify(data), key, { iv }).toString();
}

const mockProxy = () => new Proxy({}, { get: (_t, k) => (k === '__esModule' ? true : () => ({})) });
jest.mock('firebase/firestore', () => mockProxy());
jest.mock('firebase/auth', () => mockProxy());
jest.mock('firebase/app', () => mockProxy());
jest.mock('../src/firebase', () => ({ db: {}, auth: {} }));
jest.mock('../src/authFirebase', () => ({ getCurrentFirebaseUser: () => ({ uid: 'u1' }) }));
jest.mock('../src/usernameClaim', () => ({ ensureUsernameClaim: () => {} }));
jest.mock('../src/pushNotifications', () => ({ rescheduleBillNotifications: async () => {} }));
jest.mock('../src/cloudBackup', () => ({ saveProfileCloudBackup: async () => 0, loadProfileCloudBackup: async () => null }));
jest.mock('../src/recovery', () => ({ deleteRecoveryKey: async () => {} }));
jest.mock('../src/linking', () => ({ cancelLinkCode: async () => {}, finishHostLink: async () => null }));
jest.mock('expo-network', () => ({
  addNetworkStateListener: () => ({ remove: () => {} }),
  getNetworkStateAsync: async () => ({ isConnected: true, isInternetReachable: true }),
}));
jest.mock('../src/encryption', () => {
  const C = require('crypto-js');
  return {
    deriveKey: () => C.enc.Hex.parse('11'.repeat(32)),
    generateSalt: async () => '44'.repeat(16),
    encryptJSON: async (key: any, data: any) => {
      const iv = C.enc.Hex.parse('33'.repeat(16));
      return '33'.repeat(16) + ':' + C.AES.encrypt(JSON.stringify(data), key, { iv }).toString();
    },
    decryptJSON: (key: any, payload: string) => {
      const [ivHex, ct] = payload.split(':');
      const json = C.AES.decrypt(ct, key, { iv: C.enc.Hex.parse(ivHex) }).toString(C.enc.Utf8);
      if (!json) throw new Error('wrong key');
      return JSON.parse(json);
    },
  };
});
const mockSaves: string[] = [];
jest.mock('../src/storage', () => {
  const { defaultModel } = require('../src/defaultModel');
  const local = defaultModel();
  local.bills = [{ id: 'b1', name: 'Meralco', recurringType: 'monthly', dueDate: { day: '15' }, cycles: [] }];
  return {
    ...jest.requireActual('../src/storage'),
    loadProfilesIndex: async () => [{ username: 'cath', householdId: 'h1', salt: 'aa' }],
    loadEncryptedProfileData: async () => mockLock(mockPersonalKey, local),
    saveEncryptedProfileData: async (_u: string, text: string) => { mockSaves.push(text); },
    loadCachedHouseholdKey: async () => ({ householdId: 'h1', wrappedKey: mockLock(mockPersonalKey, { k: mockHouseholdKeyHex }) }),
    saveCachedHouseholdKey: async () => {},
    loadHouseholdPendingBase: async () => null,
    saveHouseholdPendingBase: async () => {},
  };
});
// The connection drops while opening: reading the household online fails.
jest.mock('../src/household', () => ({
  ...jest.requireActual('../src/household'),
  loadWrappedHouseholdKey: async () => {
    throw Object.assign(new Error('Failed to get document because the client is offline.'), { code: 'unavailable' });
  },
  subscribeToHousehold: () => () => {},
  loadHouseholdDoc: async () => {
    throw Object.assign(new Error('offline'), { code: 'unavailable' });
  },
}));

function Probe() {
  const { DataContext, useData } = require('../src/DataContext');
  const { loadModel, model, isLinked } = useData();
  useEffect(() => {
    loadModel('cath', mockPersonalKey).catch(() => {});
  }, []);
  return <Text>{`${model ? (model.bills || []).map((b: any) => b.name).join(',') || 'EMPTY' : 'loading'}|${isLinked ? 'linked' : 'not linked'}`}</Text>;
}

test("a dropped connection while opening shows the phone's copy, still linked (not an empty household)", async () => {
  const { DataProvider } = require('../src/DataContext');
  render(
    <DataProvider>
      <Probe />
    </DataProvider>,
  );
  await act(async () => {
    await new Promise((r) => setTimeout(r, 50));
  });
  expect(screen.getByText('Meralco|linked')).toBeTruthy();
  // Nothing saved over the phone's copy is an empty household.
  const unlock = (text: string) => {
    const [ivHex, ct] = text.split(':');
    return JSON.parse(CryptoJS.AES.decrypt(ct, mockPersonalKey, { iv: CryptoJS.enc.Hex.parse(ivHex) }).toString(CryptoJS.enc.Utf8));
  };
  for (const text of mockSaves) expect((unlock(text).bills || []).map((b: any) => b.name)).toContain('Meralco');
});
