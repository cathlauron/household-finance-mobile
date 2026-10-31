import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Keyboard, StyleSheet } from 'react-native';
import { ThemeProvider } from '../src/ThemeContext';

// Cath's phone, 2026-10-30 (Expo Go): "Say it" showed a red "Cannot find native module
// 'ExpoSpeechRecognition'" error, and the keyboard covered the typing box.
let mockLoaded = 0;
jest.mock('expo', () => ({ ...jest.requireActual('expo'), requireOptionalNativeModule: () => null }));
jest.mock('expo-speech-recognition', () => {
  mockLoaded++;
  throw new Error("Cannot find native module 'ExpoSpeechRecognition'");
});

test('where the phone has no speech part, the add-on is never even loaded (no red error)', () => {
  const { canListen } = require('../src/voiceListen');
  expect(canListen()).toBe(false);
  expect(mockLoaded).toBe(0);
});

test('the sheet sits on top of the keyboard', async () => {
  const handlers: Record<string, (e: any) => void> = {};
  jest.spyOn(Keyboard, 'addListener').mockImplementation(((ev: string, fn: any) => {
    handlers[ev] = fn;
    return { remove() {} };
  }) as any);
  const { SayItButton } = require('../src/components/SayIt');
  render(<ThemeProvider><SayItButton onHeard={() => {}} /></ThemeProvider>);
  await act(async () => { fireEvent.press(screen.getByTestId('say-it')); });
  const show = handlers.keyboardDidShow || handlers.keyboardWillShow;
  await act(async () => { show({ endCoordinates: { height: 320 } }); });
  expect(StyleSheet.flatten(screen.getByTestId('voice-sheet').props.style).bottom).toBe(320);
});
