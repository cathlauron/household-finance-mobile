import React from 'react';
import { Text } from 'react-native';
import { act, render } from '@testing-library/react-native';

// Cath, 2026-10-30 (answer 9): as a guest, the first item showed only after the "Keep your
// first entry safe" sheet, which rose over an empty list. Now the item is in the list first
// and the sheet rises a moment later.
const mockProxy = () => new Proxy({}, { get: (_t, k) => (k === '__esModule' ? true : () => ({})) });
jest.mock('firebase/firestore', () => mockProxy());
jest.mock('firebase/auth', () => mockProxy());
jest.mock('firebase/app', () => mockProxy());
jest.mock('../src/firebase', () => ({ db: {}, auth: {} }));
jest.mock('expo-network', () => ({
  addNetworkStateListener: () => ({ remove: () => {} }),
  getNetworkStateAsync: async () => ({ isConnected: true, isInternetReachable: true }),
}));

let api: any;
function Probe() {
  const { useData } = require('../src/DataContext');
  api = useData();
  return <Text>x</Text>;
}

test('the first item shows in its list before the sheet rises', async () => {
  const { DataProvider } = require('../src/DataContext');
  render(<DataProvider><Probe /></DataProvider>);
  const { defaultModel } = require('../src/defaultModel');
  await act(async () => { api.startGuest(defaultModel(), { name: 'Cath', helpWith: [] }); });
  await act(async () => {
    api.saveModel({ ...api.getModel(), bills: [{ id: 'b1', name: 'Meralco', recurringType: 'monthly', dueDate: { day: '15' }, cycles: [] }] });
  });
  expect((api.model.bills || []).map((b: any) => b.name)).toEqual(['Meralco']);
  expect(api.guestRequest).toBeNull();
  await act(async () => { await new Promise((r) => setTimeout(r, 800)); });
  expect(api.guestRequest?.entry).toMatch(/Meralco/);
});
