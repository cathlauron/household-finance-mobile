import { Easing } from 'react-native';
import React from 'react';
import { createStackNavigator, type StackCardStyleInterpolator } from '@react-navigation/stack';
import MainTabs from './MainTabs';
import DeferredContent from './DeferredContent';
import ProfileScreen from '../screens/ProfileScreen';
import CalendarScreen from '../screens/CalendarScreen';
import AccountsScreen from '../screens/AccountsScreen';
import IncomeScreen from '../screens/IncomeScreen';
import SavingsScreen from '../screens/SavingsScreen';
import InsightsScreen from '../screens/InsightsScreen';
import ReportDetailScreen, { MoreReportsScreen } from '../screens/ReportDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PremiumScreen from '../screens/PremiumScreen';
import TransactionDetailScreen from '../screens/TransactionDetailScreen';
import SearchScreen from '../screens/SearchScreen';
import SharedExpensesScreen from '../screens/SharedExpensesScreen';
import ReviewScreen from '../screens/ReviewScreen';
import RecurringScreen from '../screens/RecurringScreen';
import EnvelopesScreen from '../screens/EnvelopesScreen';
import PayDetailScreen from '../screens/PayDetailScreen';
import SubscriptionsScreen from '../screens/SubscriptionsScreen';
import CardDetailScreen from '../screens/CardDetailScreen';
import PotDetailScreen from '../screens/PotDetailScreen';
import GroceriesScreen from '../screens/GroceriesScreen';
import TravelScreen from '../screens/TravelScreen';
import EventsScreen from '../screens/EventsScreen';
import GoalsScreen from '../screens/GoalsScreen';
import TransferScreen from '../screens/TransferScreen';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { GuestGate } from '../components/GuestSaveSheet';
import { getSharedHeaderOptions } from './headerOptions';

export type RootStackParamList = {
  Main: { openBillId?: string } | undefined;
  Profile: undefined;
  Calendar: undefined;
  // Version 2.1: the card page's "Edit card" opens this card's edit sheet here.
  Accounts: { editGroup?: 'cash' | 'debit' | 'credit'; editId?: string; nonce?: number } | undefined;
  Income: { openIncomeId?: string; openIncomeNonce?: number } | undefined;
  IncomePerson: { personId: string };
  Savings: { openSavingsId?: string; openSavingsNonce?: number } | undefined;
  Reports: undefined;
  Report: { id: string; backTitle?: string };
  MoreReports: undefined;
  Settings: { page?: string } | undefined;
  SettingsPage: { subPage: string };
  Premium: undefined;
  TransactionDetail: { id: string };
  Search: undefined;
  Review: undefined;
  Recurring: undefined;
  Envelopes: undefined;
  Subscriptions: undefined;
  CardDetail: { group: 'cash' | 'debit' | 'credit'; id: string; backTitle?: string };
  Transfer: { fromGroup?: 'cash' | 'debit' | 'credit'; fromId?: string } | undefined;
  PayDetail: { kind: 'bill' | 'debt' | 'loan'; id: string; backTitle?: string };
  PotDetail: { id: string; open?: 'out' };
  Groceries: undefined;
  Travel: undefined;
  Events: undefined;
  YearlyGoals: undefined;
  SharedExpenses: { fromTransactionId?: string; editExpenseId?: string; nonce?: number } | undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

// Version 2.1 (Cath's pick, "Paper slide"): the new page slides in from the right over the
// old one, which fades back as it's covered. Pages stay see-through so the leaves keep
// showing behind them (that's why there's no drop shadow: a see-through page can't cast
// one). Going back runs the same in reverse.
const paperSlide: StackCardStyleInterpolator = ({ current, next, layouts }) => ({
  cardStyle: {
    transform: [
      {
        translateX: current.progress.interpolate({ inputRange: [0, 1], outputRange: [layouts.screen.width, 0] }),
      },
    ],
    opacity: next ? next.progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [1, 0, 0] }) : 1,
  },
});
const paperTiming = {
  animation: 'timing' as const,
  config: { duration: 280, easing: Easing.bezier(0.25, 0.8, 0.25, 1) },
};
// The Calendar opens as a sheet from the bottom with rounded corners over a dimmed page.
const sheetUp: StackCardStyleInterpolator = ({ current, layouts }) => ({
  cardStyle: {
    transform: [
      { translateY: current.progress.interpolate({ inputRange: [0, 1], outputRange: [layouts.screen.height, 0] }) },
    ],
  },
  overlayStyle: { opacity: current.progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }) },
});

type RootStackProps = {
  username: string;
  onLock: () => void;
  onSignOut: () => void;
  onSwitchAccount: () => void;
  // Version 3: no account yet (guest). Settings and Profile ask to save Finance Flow first.
  onGuestSave?: () => void;
};

export default function RootStack({ username, onLock, onSignOut, onSwitchAccount, onGuestSave }: RootStackProps) {
  const { colors } = useTheme();
  const { guest } = useData();

  return (
    <Stack.Navigator
      id={undefined}
      // Pages build their contents a frame after the fade starts, so opening one feels
      // instant (the tabs page is left alone).
      screenLayout={({ children, route }) =>
        route.name === 'Main' ? (
          children
        ) : guest && (route.name === 'Settings' || route.name === 'Profile' || route.name === 'SettingsPage') ? (
          <GuestGate onContinue={() => onGuestSave?.()} />
        ) : (
          <DeferredContent>{children}</DeferredContent>
        )
      }
      screenOptions={{
        cardStyle: { backgroundColor: 'transparent' },
        headerMode: 'screen',
        cardStyleInterpolator: paperSlide,
        transitionSpec: { open: paperTiming, close: paperTiming },
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        ...getSharedHeaderOptions(colors),
      }}
    >
      <Stack.Screen
        name="Main"
        options={{ headerShown: false }}
      >
        {({ route }) => (
          <MainTabs
            username={username}
            onLock={onLock}
            onSignOut={onSignOut}
            initialOpenBillId={route.params?.openBillId}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="Profile"
        options={{
          headerShown: true,
          title: 'Profile',
          headerBackTitle: 'Settings',
        }}
      >
        {() => <ProfileScreen onLock={onLock} onSignOut={onSignOut} onSwitchAccount={onSwitchAccount} />}
      </Stack.Screen>
      <Stack.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          presentation: 'transparentModal',
          headerShown: false,
          cardOverlayEnabled: true,
          cardStyleInterpolator: sheetUp,
          gestureDirection: 'vertical',
          cardStyle: { backgroundColor: colors.navy2, marginTop: 48, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
        }}
      />
      <Stack.Screen
        name="Accounts"
        component={AccountsScreen}
        options={{ title: 'Accounts', headerBackTitle: 'Home' }}
      />
      <Stack.Screen
        name="Income"
        options={{ title: 'Income', headerBackTitle: 'Transactions' }}
      >
        {({ route }) => (
          <IncomeScreen
            openIncomeId={route.params?.openIncomeId}
            openIncomeNonce={route.params?.openIncomeNonce}
          />
        )}
      </Stack.Screen>
      {/* One person's income: their paydays this month and their sources. */}
      <Stack.Screen name="IncomePerson" options={{ title: '', headerBackTitle: 'Income' }}>
        {({ route }) => <IncomeScreen personId={route.params.personId} />}
      </Stack.Screen>
      <Stack.Screen
        name="Savings"
        options={{ title: 'Savings', headerBackTitle: 'Plan' }}
      >
        {({ route }) => (
          <SavingsScreen
            openSavingsId={route.params?.openSavingsId}
            openSavingsNonce={route.params?.openSavingsNonce}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="Reports"
        component={InsightsScreen}
        options={{ title: 'Insights', headerBackTitle: 'Home' }}
      />
      <Stack.Screen
        name="Settings"
        options={{ title: 'Settings', headerBackTitle: 'Home' }}
      >
        {() => <SettingsScreen onSignOut={onSignOut} onSwitchAccount={onSwitchAccount} onLock={onLock} />}
      </Stack.Screen>
      {/* A Settings sub-page (Account & Security, Appearance, ...), pushed so it fades in like other pages. */}
      <Stack.Screen name="SettingsPage" options={{ title: '', headerBackTitle: 'Settings' }}>
        {() => <SettingsScreen onSignOut={onSignOut} onSwitchAccount={onSwitchAccount} onLock={onLock} />}
      </Stack.Screen>
      <Stack.Screen name="CardDetail" component={CardDetailScreen} options={{ title: '', headerBackTitle: 'Home' }} />
      <Stack.Screen name="Transfer" component={TransferScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Subscriptions" component={SubscriptionsScreen} options={{ title: 'Subscriptions', headerBackTitle: 'To-Pay' }} />
      <Stack.Screen name="PayDetail" component={PayDetailScreen} options={{ title: '', headerBackTitle: 'To-Pay' }} />
      <Stack.Screen name="Report" component={ReportDetailScreen} options={{ title: '', headerBackTitle: 'Insights' }} />
      <Stack.Screen name="MoreReports" component={MoreReportsScreen} options={{ title: 'More reports', headerBackTitle: 'Insights' }} />
      <Stack.Screen name="PotDetail" component={PotDetailScreen} options={{ title: '', headerBackTitle: 'Savings' }} />
      {/* Redesign: each Plan section is its own page, as in the mockup. */}
      <Stack.Screen name="Groceries" component={GroceriesScreen} options={{ title: 'Groceries', headerBackTitle: 'Plan' }} />
      <Stack.Screen name="Travel" component={TravelScreen} options={{ title: 'Travel', headerBackTitle: 'Plan' }} />
      <Stack.Screen name="Events" component={EventsScreen} options={{ title: 'Events', headerBackTitle: 'Plan' }} />
      <Stack.Screen name="YearlyGoals" component={GoalsScreen} options={{ title: 'Yearly Goals', headerBackTitle: 'Plan' }} />
      <Stack.Screen name="SharedExpenses" component={SharedExpensesScreen} options={{ title: 'Shared Expenses', headerBackTitle: 'Plan' }} />
      <Stack.Screen name="Review" component={ReviewScreen} options={{ title: 'To review', headerBackTitle: 'Transactions' }} />
      <Stack.Screen name="Recurring" component={RecurringScreen} options={{ title: 'Recurring', headerBackTitle: 'Transactions' }} />
      <Stack.Screen name="Envelopes" component={EnvelopesScreen} options={{ title: 'Envelopes', headerBackTitle: 'Budgeting' }} />
      {/* Search drops down from the top itself (see SearchScreen), over the page behind it. */}
      <Stack.Screen name="Search" component={SearchScreen} options={{ headerShown: false, presentation: 'transparentModal', animation: 'none' }} />
      <Stack.Screen
        name="TransactionDetail"
        component={TransactionDetailScreen}
        options={{ title: '', headerBackTitle: 'Transactions' }}
      />
      <Stack.Screen
        name="Premium"
        component={PremiumScreen}
        options={{ title: 'Premium', headerBackTitle: 'Settings' }}
      />
    </Stack.Navigator>
  );
}
