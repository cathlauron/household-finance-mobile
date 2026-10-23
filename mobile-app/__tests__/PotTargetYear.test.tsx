import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// H-22 (2026-10-22): a pot's target date showed with the year on the Savings list
// ("by Aug 18, 2027") but without it on the pot's own page ("by Aug 18"), which reads like
// this coming August.
let mockModel: any;
jest.mock('../src/DataContext', () => ({
  // Pages beside the one showing stay quiet in the app; here they just draw.
  QuietWhenHidden: ({ children }: any) => children,
  useData: () => ({ model: mockModel, getModel: () => mockModel, saveModel: async () => {}, isLinked: false, username: 'cath' }),
  withTimeout: (p: any) => p,
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), setOptions: jest.fn(), addListener: () => () => {}, goBack: jest.fn() }),
  useRoute: () => ({ params: { id: 'g1' } }),
}));

test("the pot page shows the target date's year, like the Savings list", async () => {
  mockModel = defaultModel();
  mockModel.savingsGoals = [{ id: 'g1', name: 'Emergency fund', targetAmount: 100000, targetDate: '2027-08-18', currentAmount: 0, contributions: [] }];
  const PotDetailScreen = require('../src/screens/PotDetailScreen').default;
  render(
    <ThemeProvider>
      <PotDetailScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
  expect(screen.getByText(/by Aug 18, 2027/)).toBeTruthy();
});
