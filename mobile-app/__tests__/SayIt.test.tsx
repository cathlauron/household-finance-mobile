import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { SayItButton } from '../src/components/SayIt';

// Voice entry (mockup V, Cath 2026-10-30). Where the phone can't listen (Expo Go, these
// checks), "Say it" offers a box to type in; what's typed goes to the form, nothing is saved.
jest.mock('../src/voiceListen', () => ({ canListen: () => false, startListening: async () => null }));

test('Say it opens the sheet; what you type fills the form', async () => {
  const heard = jest.fn();
  render(<ThemeProvider><SayItButton onHeard={heard} /></ThemeProvider>);
  await act(async () => { fireEvent.press(screen.getByTestId('say-it')); });
  expect(screen.getByTestId('voice-sheet')).toBeTruthy();
  fireEvent.changeText(screen.getByTestId('voice-type'), 'Spent 250 on groceries yesterday');
  await act(async () => { fireEvent.press(screen.getByTestId('voice-use')); await new Promise((r) => setTimeout(r, 300)); });
  expect(heard).toHaveBeenCalledWith('Spent 250 on groceries yesterday');
});

test('nothing typed: the button does nothing', async () => {
  const heard = jest.fn();
  render(<ThemeProvider><SayItButton onHeard={heard} /></ThemeProvider>);
  await act(async () => { fireEvent.press(screen.getByTestId('say-it')); });
  await act(async () => { fireEvent.press(screen.getByTestId('voice-use')); await new Promise((r) => setTimeout(r, 300)); });
  expect(heard).not.toHaveBeenCalled();
});

test('every add form has Say it (inventory, Cath: "everything")', () => {
  const fs = require('fs');
  for (const f of ['Transactions', 'Bills', 'Debts', 'Loans', 'Income', 'Savings', 'Goals', 'Events', 'Travel', 'Groceries', 'Envelopes', 'SharedExpenses']) {
    expect([f, fs.readFileSync(`src/screens/${f}Screen.tsx`, 'utf8').includes('<SayItButton')]).toEqual([f, true]);
  }
});
