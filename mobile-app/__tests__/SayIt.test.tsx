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

// 2026-10-31 (Cath: "add voice on forms that don't have it yet"): the rest of the inventory.
test('the rest of the forms have Say it too (new trip, Log payday, Add money, new account, transfer, investment, estimate, event items)', () => {
  const fs = require('fs');
  const places: [string, string][] = [
    ['src/screens/TravelScreen.tsx', 'Baguio weekend, November 14 to 16'],
    ['src/screens/IncomeScreen.tsx', '18,000 today'],
    ['src/screens/PotDetailScreen.tsx', '2,000 from GCash'],
    ['src/screens/AccountsScreen.tsx', 'BPI savings 24,300'],
    ['src/screens/TransferScreen.tsx', 'Move 2,000 from BPI savings to GCash'],
    ['src/screens/InvestmentsScreen.tsx', 'Pag-IBIG MP2, put in 50,000'],
    ['src/components/CalmHome.tsx', 'About 2,000'],
    ['src/screens/EventsScreen.tsx', 'Cake 1,500, gift 2,000 and balloons 500'],
  ];
  for (const [file, example] of places) {
    const src = fs.readFileSync(file, 'utf8');
    expect([file, src.includes('<SayItButton') && src.includes(`example="${example}"`)]).toEqual([file, true]);
  }
});

test('a transfer said out loud fills the amount and both accounts', async () => {
  jest.resetModules();
  const { voiceTransfer } = require('../src/voiceParse');
  expect(voiceTransfer('Move 2,000 from BPI savings to GCash', ['BPI Savings', 'GCash', 'Cash'])).toMatchObject({ amount: 2000, from: 'BPI Savings', to: 'GCash' });
});
