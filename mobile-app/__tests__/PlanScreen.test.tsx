import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import PlanScreen from '../src/screens/PlanScreen';
import { renderInApp } from './helpers/render';

// The Plan tab: every row opens its own page.
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

describe('Plan tab', () => {
  beforeEach(() => mockNavigate.mockClear());

  test.each([
    ['more-savings-row', 'Savings'],
    ['plan-goals-row', 'YearlyGoals'],
    ['plan-shared-row', 'SharedExpenses'],
    ['plan-investments-row', 'Investments'],
    ['more-planning-row', 'Groceries'],
    ['plan-travel-row', 'Travel'],
    ['plan-events-row', 'Events'],
  ])('tapping %s opens %s', (testID, page) => {
    renderInApp(<PlanScreen />);
    fireEvent.press(screen.getByTestId(testID));
    expect(mockNavigate).toHaveBeenCalledWith(page);
  });
});
