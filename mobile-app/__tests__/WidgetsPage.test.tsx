import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';

// Cath, 2026-11-03 (mockup W1): "is there a way to add widget from the app". Settings › Widgets
// lists the six; Add asks the phone to put one on the home screen; ones already there say so.
const mockPin = jest.fn(async (_o: { widgetName: string }) => true);
jest.mock('../src/widgets/available', () => ({ widgetsAvailable: () => true }));
jest.mock('react-native-android-widget', () => ({
  requestPinWidget: (o: any) => mockPin(o),
  getWidgetInfo: async (name: string) => (name === 'LeftToSpend' ? [{ widgetId: 1 }] : []),
}), { virtual: false });

test('W1: Add asks the phone for that widget; a widget already on the home screen says so', async () => {
  const Screen = require('../src/screens/WidgetsScreen').default;
  render(<ThemeProvider><Screen /></ThemeProvider>);
  await act(async () => {});
  expect(screen.getByText('Month at a glance')).toBeTruthy();
  expect(screen.getByText('On your home screen')).toBeTruthy(); // Left to spend
  await act(async () => { fireEvent.press(screen.getByTestId('widget-add-SpendSay')); });
  expect(mockPin).toHaveBeenCalledWith({ widgetName: 'SpendSay' });
});

test('W1: the Settings row only shows where widgets can be added (the installed Android app)', () => {
  const { canPinWidgets } = require('../src/widgets/pinWidget');
  expect(canPinWidgets()).toBe(true);
  const src = require('fs').readFileSync('src/screens/SettingsScreen.tsx', 'utf8');
  expect(src).toMatch(/\{canPinWidgets\(\) && <SettingsRow testID="settings-row-widgets"/);
});
