import React, { useEffect } from 'react';
import { Text, Alert } from 'react-native';
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
jest.mock('../src/householdPartsSync', () => ({ ...jest.requireActual('../src/householdPartsSync'), afterLoad: async () => {}, afterSave: async () => {}, loadModelFromParts: async () => null, saveWhenTooBig: async () => false, currentLayout: () => 0 }));
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
    // The phone's copy takes a moment to write (300 ms).
    saveEncryptedProfileData: (_u: string, text: string) => new Promise<void>((r) => setTimeout(() => { mockSaves.push(text); r(); }, 300)),
    loadCachedHouseholdKey: async () => ({ householdId: 'h1', wrappedKey: mockLock(mockPersonalKey, { k: mockHouseholdKeyHex }) }),
    saveCachedHouseholdKey: async () => {},
    loadHouseholdPendingBase: async () => null,
    saveHouseholdPendingBase: async () => {},
  };
});
// The connection drops while opening: reading the household online fails.
jest.mock('../src/household', () => ({
  ...jest.requireActual('../src/household'),
  saveHouseholdDataChecked: (...a: any[]) => { mockPushCount++; return mockPushImpl(...a); },
  loadWrappedHouseholdKey: async () => ({ householdId: 'h1', wrappedKey: 'w' }),
  unwrapHouseholdKey: () => require('crypto-js').enc.Hex.parse('22'.repeat(32)),
  getHouseholdMemberCount: async () => 2,
  subscribeToHousehold: () => () => {},
  loadHouseholdDoc: async () => {
    const C = require('crypto-js');
    const { defaultModel } = require('../src/defaultModel');
    const m = defaultModel();
    const iv = C.enc.Hex.parse('33'.repeat(16));
    return { data: '33'.repeat(16) + ':' + C.AES.encrypt(JSON.stringify(m), C.enc.Hex.parse('22'.repeat(32)), { iv }).toString(), layout: 0 };
  },
}));


let mockPushCount = 0;
let mockPushImpl: (...a: any[]) => Promise<string> = async () => 'x';
const mockToasts: string[] = [];
jest.mock('../src/components/SavedToast', () => ({ showSaved: (t: string) => mockToasts.push(t), __esModule: true, default: () => null }));


// H-04 (Cath, 2026-10-30): on a slow connection the online save can take longer than 8
// seconds and still arrive. Then it says "Still saving…", not "Sync Failed"; "Sync Failed"
// only when it really doesn't arrive.
let api: any;
function Probe() {
  const { useData } = require('../src/DataContext');
  const d = useData();
  api = d;
  useEffect(() => {
    d.loadModel('cath', mockPersonalKey).catch(() => {});
  }, []);
  return <Text>{d.model ? (d.isLinked ? 'linked' : 'alone') : 'loading'}</Text>;
}

async function slowSave(endsWith: 'arrives' | 'fails') {
  const alerts = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockPushImpl = (_id: string, build: (online: string | null) => Promise<string>) =>
    new Promise((resolve, reject) => setTimeout(async () => (endsWith === 'arrives' ? resolve(await build(null)) : reject(new Error('network'))), 9500));
  const { DataProvider } = require('../src/DataContext');
  render(<DataProvider><Probe /></DataProvider>);
  await act(async () => { await new Promise((r) => setTimeout(r, 400)); });
  expect(screen.getByText('linked')).toBeTruthy();
  mockToasts.length = 0;
  await act(async () => {
    api.saveModel({ ...api.getModel(), bills: [{ id: 'b9', name: 'Gas', recurringType: 'monthly', dueDate: { day: '9' }, cycles: [] }] });
    // (Lets the save start now; in the app it starts once the form has closed.)
    api.waitForSaves(1);
    await new Promise((r) => setTimeout(r, 8800));
  });
  const syncFailedAt8s = alerts.mock.calls.some((c) => c[0] === 'Sync Failed');
  const toastAt8s = [...mockToasts];
  await act(async () => { await new Promise((r) => setTimeout(r, 1500)); });
  const syncFailedAtEnd = alerts.mock.calls.some((c) => c[0] === 'Sync Failed');
  alerts.mockRestore();
  return { syncFailedAt8s, toastAt8s, syncFailedAtEnd };
}

test('slow but arrives: "Still saving…", never "Sync Failed"', async () => {
  const r = await slowSave('arrives');
  expect(r.syncFailedAt8s).toBe(false);
  expect(r.toastAt8s.some((t) => t.startsWith('Still saving'))).toBe(true);
  expect(r.syncFailedAtEnd).toBe(false);
}, 40000);

test('slow and then really fails: "Sync Failed" after all', async () => {
  const r = await slowSave('fails');
  expect(r.syncFailedAt8s).toBe(false);
  expect(r.syncFailedAtEnd).toBe(true);
}, 40000);
