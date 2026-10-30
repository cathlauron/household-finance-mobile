import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ThemeProvider } from '../src/ThemeContext';

// Delete account (DA1, Cath 2026-10-30): password first; a household alone is deleted with
// its data; a member leaves (what they added stays); an owner hands over (chooses when 2+
// others); every own record goes, the username last before the sign-in; nothing is touched
// when the password is wrong.
const mockCalls: string[] = [];
let mockMembers: any[] = [];
let mockPwOk = true;
jest.mock('../src/firebase', () => ({ db: {}, auth: { currentUser: { uid: 'me', email: 'cath@x.com' } } }));
jest.mock('firebase/auth', () => ({
  EmailAuthProvider: { credential: (e: string, p: string) => ({ e, p }) },
  reauthenticateWithCredential: async () => {
    mockCalls.push('password');
    if (!mockPwOk) throw Object.assign(new Error('bad'), { code: 'auth/invalid-credential' });
  },
  deleteUser: async () => { mockCalls.push('delete sign-in'); },
}));
jest.mock('firebase/firestore', () => ({
  doc: (_db: any, ...p: string[]) => ({ path: p.join('/') }),
  collection: (_db: any, ...p: string[]) => ({ path: p.join('/') }),
  getDocs: async () => ({ docs: [{ ref: { path: 'sessions/me/devices/d1' } }] }),
  deleteDoc: async (r: any) => { mockCalls.push('delete ' + r.path); },
}));
jest.mock('../src/household', () => ({
  getHouseholdMembers: async () => mockMembers,
  leaveHouseholdAndTransferOwnership: async (_h: string, to: string) => { mockCalls.push('hand over to ' + to); },
  removeMemberFromHousehold: async () => { mockCalls.push('leave'); },
  deleteHousehold: async (h: string) => { mockCalls.push('delete household ' + h); },
  deleteWrappedHouseholdKey: async () => { mockCalls.push('delete householdKeys'); },
}));
jest.mock('../src/householdPartsSync', () => ({ removePartsBeforeDissolve: async () => { mockCalls.push('delete parts'); } }));
jest.mock('../src/recovery', () => ({ deleteRecoveryKey: async () => { mockCalls.push('delete recoveryKeys'); } }));

const { deleteMyAccount, planDelete, WrongPasswordError } = require('../src/deleteAccount');
const base = { username: 'cath', email: 'cath@x.com', password: 'pw' };
beforeEach(() => { mockCalls.length = 0; mockPwOk = true; });

test('not linked: password, every record, username, sign-in', async () => {
  mockMembers = [];
  await deleteMyAccount(base);
  expect(mockCalls).toEqual(['password', 'delete householdKeys', 'delete recoveryKeys', 'delete profileBackups/cath', 'delete sessions/me/devices/d1', 'delete usernames/cath', 'delete sign-in']);
});

test('alone in a household: the household and its data go too', async () => {
  mockMembers = [{ uid: 'me', username: 'cath', isOwner: true }];
  await deleteMyAccount({ ...base, householdId: 'h1' });
  expect(mockCalls.slice(0, 3)).toEqual(['password', 'delete parts', 'delete household h1']);
});

test('a member leaves; the household and what they added stay', async () => {
  mockMembers = [{ uid: 'me', username: 'cath', isOwner: false }, { uid: 'm', username: 'miguel', isOwner: true }];
  await deleteMyAccount({ ...base, householdId: 'h1' });
  expect(mockCalls).toContain('leave');
  expect(mockCalls.some((c) => c.startsWith('delete household h'))).toBe(false);
});

test('an owner with one other: they take over', async () => {
  mockMembers = [{ uid: 'me', username: 'cath', isOwner: true }, { uid: 'm', username: 'miguel', isOwner: false }];
  await deleteMyAccount({ ...base, householdId: 'h1' });
  expect(mockCalls).toContain('hand over to m');
});

test('an owner with two others must choose; nothing is deleted until then', async () => {
  mockMembers = [{ uid: 'me', username: 'cath', isOwner: true }, { uid: 'm', username: 'miguel', isOwner: false }, { uid: 'a', username: 'ana', isOwner: false }];
  await expect(deleteMyAccount({ ...base, householdId: 'h1' })).rejects.toThrow(/Choose who takes over/);
  expect(mockCalls).toEqual(['password']);
  mockCalls.length = 0;
  await deleteMyAccount({ ...base, householdId: 'h1', successorUid: 'a' });
  expect(mockCalls).toContain('hand over to a');
});

test('a wrong password changes nothing', async () => {
  mockPwOk = false;
  mockMembers = [];
  await expect(deleteMyAccount(base)).rejects.toBeInstanceOf(WrongPasswordError);
  expect(mockCalls).toEqual(['password']);
});

test('the page: explains, asks for a choice and the password, confirms, then says it is done', async () => {
  mockMembers = [{ uid: 'me', username: 'cath', isOwner: true }, { uid: 'm', username: 'miguel', isOwner: false }, { uid: 'a', username: 'ana', isOwner: false }];
  jest.doMock('../src/DataContext', () => ({ useData: () => ({ username: 'cath', isOnline: true }), withTimeout: (p: any) => p }));
  jest.doMock('../src/authFirebase', () => ({ getCurrentFirebaseUser: () => ({ uid: 'me', email: 'cath@x.com' }) }));
  jest.doMock('../src/storage', () => ({ ...jest.requireActual('../src/storage'), loadProfilesIndex: async () => [{ username: 'cath', householdId: 'h1' }] }));
  jest.doMock('@react-navigation/native', () => ({ ...jest.requireActual('@react-navigation/native'), useNavigation: () => ({ push: jest.fn() }) }));
  const Screen = require('../src/screens/DeleteAccountScreen').default;
  const onDone = jest.fn();
  render(<ThemeProvider><Screen onDone={onDone} /></ThemeProvider>);
  await act(async () => {});
  expect(screen.getByText(/What you added stays for miguel and ana/)).toBeTruthy();
  fireEvent.changeText(screen.getByTestId('delete-password'), 'pw');
  expect(screen.getByTestId('delete-confirm').props.accessibilityState?.disabled).toBe(true);
  fireEvent.press(screen.getByTestId('delete-successor-ana'));
  const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, b: any) => b?.[1]?.onPress?.());
  await act(async () => { fireEvent.press(screen.getByTestId('delete-confirm')); });
  await act(async () => {});
  expect(alert).toHaveBeenCalledWith('Delete your account?', "This can't be undone.", expect.anything());
  expect(screen.getByTestId('delete-done')).toBeTruthy();
  fireEvent.press(screen.getByTestId('delete-back-to-start'));
  expect(onDone).toHaveBeenCalled();
}, 30000);
