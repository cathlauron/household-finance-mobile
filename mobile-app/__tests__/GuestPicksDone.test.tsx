import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// H-53 (2026-10-29): Home's "YOU PICKED" said "Your first bill goes here" with bills already added.
let mockModel: any;
jest.mock('../src/DataContext', () => ({ useData: () => ({ guest: true, guestInfo: { helpWith: ['calm', 'debt'] }, model: mockModel }) }));
jest.mock('@react-navigation/native', () => ({ ...jest.requireActual('@react-navigation/native'), useNavigation: () => ({ navigate: jest.fn() }) }));
import GuestPicks from '../src/components/GuestPicks';

test('a done first step goes away; with all done the card goes', () => {
  mockModel = { ...defaultModel(), bills: [{ id: 'b', name: 'Meralco', cycles: [] }] };
  const r = render(<ThemeProvider><GuestPicks /></ThemeProvider>);
  expect(screen.queryByText('Your first bill goes here')).toBeNull();
  expect(screen.getByText('A debt to pay off')).toBeTruthy();
  mockModel = { ...mockModel, debts: [{ id: 'd', creditorOrPerson: 'X', cycles: [] }] };
  r.rerender(<ThemeProvider><GuestPicks /></ThemeProvider>);
  expect(screen.queryByText('YOU PICKED')).toBeNull();
});
