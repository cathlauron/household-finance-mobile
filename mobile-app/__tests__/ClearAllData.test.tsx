import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import ClearAllData from '../src/components/ClearAllData';
import { renderInApp } from './helpers/render';

// H-01 (2026-10-22): "Clear all data" in a shared household used to wipe it for everyone,
// with a warning that only said "this profile". Cath's rule: in a household only the owner
// can clear it (warned that it's for everyone); members are told why and offered to leave.
function setup(props: Partial<React.ComponentProps<typeof ClearAllData>>) {
  const onClear = jest.fn();
  const onLeave = jest.fn();
  renderInApp(
    <ClearAllData role="solo" partnerNames={[]} ownerName={null} busy={false} onClear={onClear} onLeave={onLeave} {...props} />,
  );
  fireEvent.press(screen.getByText('Clear all data & start fresh'));
  return { onClear, onLeave };
}

describe('Clear all data', () => {
  test('just you: asks once, then clears', () => {
    const { onClear } = setup({ role: 'solo' });
    expect(screen.getByText(/clears every entry/)).toBeTruthy();
    fireEvent.press(screen.getByText('Yes, clear everything'));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  test('household owner: the warning names the others, and says it is for everyone', () => {
    const { onClear } = setup({ role: 'owner', partnerNames: ['Miguel'] });
    expect(screen.getByText(/for you and Miguel/)).toBeTruthy();
    fireEvent.press(screen.getByText('Yes, clear it for everyone'));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  test('household member: cannot clear; told why and offered to leave', () => {
    const { onClear, onLeave } = setup({ role: 'member', ownerName: 'Miguel' });
    expect(screen.queryByText('Yes, clear everything')).toBeNull();
    expect(screen.queryByText('Yes, clear it for everyone')).toBeNull();
    expect(screen.getByText(/Only Miguel, the household's owner, can clear/)).toBeTruthy();
    fireEvent.press(screen.getByText('Leave household'));
    expect(onLeave).toHaveBeenCalledTimes(1);
    expect(onClear).not.toHaveBeenCalled();
  });

  test('still checking who owns the household: nothing can be cleared yet', () => {
    const { onClear } = setup({ role: 'checking' });
    expect(screen.getByText(/Checking who owns this household/)).toBeTruthy();
    expect(screen.queryByText(/Yes, clear/)).toBeNull();
    expect(onClear).not.toHaveBeenCalled();
  });

  test("couldn't check (offline): nothing can be cleared, says why", () => {
    setup({ role: 'unknown' });
    expect(screen.getByText(/Connect to the internet/)).toBeTruthy();
    expect(screen.queryByText(/Yes, clear/)).toBeNull();
  });

  test('Cancel closes it without clearing', () => {
    const { onClear } = setup({ role: 'owner', partnerNames: ['Miguel'] });
    fireEvent.press(screen.getByText('Cancel'));
    expect(screen.getByText('Clear all data & start fresh')).toBeTruthy();
    expect(onClear).not.toHaveBeenCalled();
  });
});

describe('who may clear (from the member list)', () => {
  const { roleFromMembers } = require('../src/components/ClearAllData');
  const members = [
    { uid: 'u1', username: 'cath', isOwner: true },
    { uid: 'u2', username: 'miguel', isOwner: false },
  ];
  test('the owner is the owner, and sees the others', () => {
    expect(roleFromMembers(members, 'u1')).toEqual({ role: 'owner', others: ['miguel'], owner: 'cath' });
  });
  test('a member is a member, and sees who the owner is', () => {
    expect(roleFromMembers(members, 'u2')).toEqual({ role: 'member', others: ['cath'], owner: 'cath' });
  });
  test('not signed in, or not in the list: unknown (nothing can be cleared)', () => {
    expect(roleFromMembers(members, null).role).toBe('unknown');
    expect(roleFromMembers(members, 'u9').role).toBe('unknown');
  });
});

describe('after clearing', () => {
  const { act } = require('@testing-library/react-native');
  test('the box closes when clearing worked, and stays open when it failed', async () => {
    const ok = jest.fn(async () => true);
    renderInApp(<ClearAllData role="solo" partnerNames={[]} ownerName={null} busy={false} onClear={ok} onLeave={() => {}} />);
    fireEvent.press(screen.getByText('Clear all data & start fresh'));
    await act(async () => fireEvent.press(screen.getByText('Yes, clear everything')));
    expect(screen.getByText('Clear all data & start fresh')).toBeTruthy();
  });
  test('stays open when it failed', async () => {
    const fail = jest.fn(async () => false);
    renderInApp(<ClearAllData role="solo" partnerNames={[]} ownerName={null} busy={false} onClear={fail} onLeave={() => {}} />);
    fireEvent.press(screen.getByText('Clear all data & start fresh'));
    await act(async () => fireEvent.press(screen.getByText('Yes, clear everything')));
    expect(screen.getByText('Yes, clear everything')).toBeTruthy();
  });
});
