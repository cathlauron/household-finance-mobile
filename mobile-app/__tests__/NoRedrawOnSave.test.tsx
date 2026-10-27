import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';

// Smoothness sweep 2026-10-26 (jank reviewer, proven): every save redrew the whole app,
// hidden tabs included. The app's top redraws on each save and hands the page stack new
// lock / sign-out actions; the stack's pages were drawn by functions made fresh each time,
// so the navigation library couldn't skip them and the main tabs redrew too.
jest.mock('../src/screens/AccountsScreen', () => ({ __esModule: true, default: () => null }));
jest.mock('../src/screens/CalendarScreen', () => ({ __esModule: true, default: () => null }));
jest.mock('../src/screens/CardDetailScreen', () => ({ __esModule: true, default: () => null }));
jest.mock('../src/screens/EnvelopesScreen', () => ({ __esModule: true, default: () => null }));
jest.mock('../src/screens/EventsScreen', () => ({ __esModule: true, default: () => null }));
jest.mock('../src/screens/GoalsScreen', () => ({ __esModule: true, default: () => null }));
jest.mock('../src/screens/GroceriesScreen', () => ({ __esModule: true, default: () => null }));
jest.mock('../src/screens/IncomeScreen', () => ({ __esModule: true, default: () => null }));
jest.mock('../src/screens/InsightsScreen', () => ({ __esModule: true, default: () => null }));
jest.mock('../src/screens/PayDetailScreen', () => ({ __esModule: true, default: () => null }));
jest.mock('../src/screens/PotDetailScreen', () => ({ __esModule: true, default: () => null }));
jest.mock('../src/screens/PremiumScreen', () => ({ __esModule: true, default: () => null }));
jest.mock('../src/screens/ProfileScreen', () => ({ __esModule: true, default: () => null }));
jest.mock('../src/screens/RecurringScreen', () => ({ __esModule: true, default: () => null }));
jest.mock('../src/screens/ReviewScreen', () => ({ __esModule: true, default: () => null }));
jest.mock('../src/screens/SavingsScreen', () => ({ __esModule: true, default: () => null }));
jest.mock('../src/screens/SearchScreen', () => ({ __esModule: true, default: () => null }));
jest.mock('../src/screens/SettingsScreen', () => ({ __esModule: true, default: () => null }));
jest.mock('../src/screens/SharedExpensesScreen', () => ({ __esModule: true, default: () => null }));
jest.mock('../src/screens/SubscriptionsScreen', () => ({ __esModule: true, default: () => null }));
jest.mock('../src/screens/TransactionDetailScreen', () => ({ __esModule: true, default: () => null }));
jest.mock('../src/screens/TransferScreen', () => ({ __esModule: true, default: () => null }));
jest.mock('../src/screens/TravelScreen', () => ({ __esModule: true, default: () => null }));
jest.mock('../src/screens/ReportDetailScreen', () => ({ __esModule: true, default: () => null, MoreReportsScreen: () => null }));
jest.mock('../src/components/GuestSaveSheet', () => ({ GuestGate: () => null }));
jest.mock('../src/DataContext', () => ({ useData: () => ({ guest: false }) }));
jest.mock('../src/ThemeContext', () => ({ useTheme: () => ({ colors: require('../src/theme').lightTheme, isDark: false }) }));
let mainDraws = 0;
jest.mock('../src/navigation/MainTabs', () => ({
  __esModule: true,
  default: () => {
    mainDraws += 1;
    const { Text: T } = require('react-native');
    return <T>tabs</T>;
  },
}));
import RootStack from '../src/navigation/RootStack';

function app() {
  // A new set of actions each time, like the app's top hands over on every save.
  return (
    <NavigationContainer>
      <RootStack username="cath" onLock={() => {}} onSignOut={() => {}} onSwitchAccount={() => {}} />
    </NavigationContainer>
  );
}

test('a save (the app redrawing above) does not redraw the main tabs', () => {
  const r = render(app());
  expect(r.getByText('tabs')).toBeTruthy();
  const before = mainDraws;
  r.rerender(app());
  r.rerender(app());
  expect(mainDraws).toBe(before);
});
