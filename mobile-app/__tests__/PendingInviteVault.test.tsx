// SEC-3 (Cath's OK, 2026-10-27): a waiting invite holds the household key, so it lives in
// the phone's secure vault, and one saved the old way moves there when it's read.
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockVault: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1,
  setItemAsync: async (k: string, v: string) => { mockVault[k] = v; },
  getItemAsync: async (k: string) => mockVault[k] ?? null,
  deleteItemAsync: async (k: string) => { delete mockVault[k]; },
}));

test('saved in the vault, never in ordinary storage', async () => {
  const { savePendingHostLink, loadPendingHostLink, clearPendingHostLink } = require('../src/storage');
  await savePendingHostLink('cath', 'ABC234', 'ff'.repeat(32), 5);
  expect(await AsyncStorage.getItem('profile:cath:pending-host-link')).toBeNull();
  expect(Object.values(mockVault).some((v) => v.includes('ABC234'))).toBe(true);
  expect(await loadPendingHostLink('cath')).toEqual({ code: 'ABC234', secretHex: 'ff'.repeat(32), at: 5 });
  await clearPendingHostLink('cath');
  expect(await loadPendingHostLink('cath')).toBeNull();
});

test('one saved the old way is moved into the vault', async () => {
  const { loadPendingHostLink } = require('../src/storage');
  await AsyncStorage.setItem('profile:dee:pending-host-link', JSON.stringify({ code: 'XYZ789', secretHex: 'aa', at: 1 }));
  expect((await loadPendingHostLink('dee'))?.code).toBe('XYZ789');
  expect(await AsyncStorage.getItem('profile:dee:pending-host-link')).toBeNull();
  expect(Object.values(mockVault).some((v) => v.includes('XYZ789'))).toBe(true);
});
