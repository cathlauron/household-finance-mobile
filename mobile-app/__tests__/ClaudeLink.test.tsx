import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import ClaudeLinkSettings from '../src/components/ClaudeLinkSettings';

// Claude connector (Cath, 2026-11-28): Connect to Claude is off at first, asks before sharing
// and before turning off, and is never offered to a guest.
let mockGuest = false;
jest.mock('../src/DataContext', () => ({ useData: () => ({ username: 'cath', guest: mockGuest }) }));
const mockSet = jest.fn(async (_u: string, _on: boolean) => {});
let mockOn = false;
jest.mock('../src/claudeLink', () => ({
  claudeLinkOn: async () => mockOn,
  onClaudeLinkChange: () => () => {},
  setClaudeLinkOn: (u: string, on: boolean) => mockSet(u, on),
}));

const draw = async () => {
  render(<ThemeProvider><ClaudeLinkSettings /></ThemeProvider>);
  await act(async () => {});
};

beforeEach(() => {
  mockSet.mockClear();
  mockGuest = false;
  mockOn = false;
});

test('off at first; turning on asks first, and Cancel shares nothing', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await draw();
  const sw = screen.getByTestId('settings-claude-link');
  expect(sw.props.value).toBe(false);
  fireEvent(sw, 'valueChange', true);
  expect(alert.mock.calls[0][0]).toBe('Share totals with Claude?');
  expect(alert.mock.calls[0][1]).toContain('Transactions, notes and photos stay locked');
  const buttons: any[] = alert.mock.calls[0][2] as any;
  buttons.find((b) => b.text === 'Cancel').onPress?.();
  expect(mockSet).not.toHaveBeenCalled();
  await act(async () => buttons.find((b) => b.text === 'Share').onPress());
  expect(mockSet).toHaveBeenCalledWith('cath', true);
  expect(screen.getByTestId('settings-claude-link').props.value).toBe(true);
  alert.mockRestore();
});

test('turning off asks first, then removes the summary', async () => {
  mockOn = true;
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await draw();
  fireEvent(screen.getByTestId('settings-claude-link'), 'valueChange', false);
  expect(alert.mock.calls[0][0]).toBe('Turn off Claude?');
  const buttons: any[] = alert.mock.calls[0][2] as any;
  await act(async () => buttons.find((b) => b.text === 'Turn off').onPress());
  expect(mockSet).toHaveBeenCalledWith('cath', false);
  alert.mockRestore();
});

test('a guest never sees it', async () => {
  mockGuest = true;
  await draw();
  expect(screen.queryByTestId('settings-claude-link')).toBeNull();
});
