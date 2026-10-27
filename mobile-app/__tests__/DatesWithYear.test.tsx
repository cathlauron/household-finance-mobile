import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// 2026-10-22 (Cath): dates next year showed no year ("Nov 11"), reading like this year.
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
  useRoute: () => ({ params: {} }),
}));

const nextYear = new Date().getFullYear() + 1;

async function draw(file: string) {
  const Screen = require(`../src/screens/${file}`).default;
  render(
    <ThemeProvider>
      <Screen />
    </ThemeProvider>,
  );
  await act(async () => {});
}

test('a trip next year shows its year', async () => {
  mockModel = defaultModel();
  mockModel.travel = [{ id: 't1', name: 'Japan', startDate: `${nextYear}-04-02`, endDate: `${nextYear}-04-09`, checklist: [] }];
  await draw('TravelScreen');
  expect(screen.getByText(new RegExp(`Apr 2 – 9, ${nextYear}`))).toBeTruthy();
});

test('a goal due next year shows its year', async () => {
  mockModel = defaultModel();
  mockModel.yearlyGoals = [{ id: 'y1', title: 'Big trip', description: '', mode: 'progress', targetAmount: 50000, currentAmount: 0, targetDate: `${nextYear}-03-01`, completed: false }];
  await draw('GoalsScreen');
  expect(screen.getByText(new RegExp(String(nextYear)))).toBeTruthy();
});
