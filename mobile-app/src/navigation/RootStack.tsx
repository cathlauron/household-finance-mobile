import { Platform } from 'react-native';
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabs from './MainTabs';
import DeferredContent from './DeferredContent';
import ProfileScreen from '../screens/ProfileScreen';
import CalendarScreen from '../screens/CalendarScreen';
import AccountsScreen from '../screens/AccountsScreen';
import IncomeScreen from '../screens/IncomeScreen';
import SavingsScreen from '../screens/SavingsScreen';
import PlanningScreen from '../screens/PlanningScreen';
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
import { getSharedHeaderOptions } from './headerOptions';
import type { PlanningTab } from '../screens/PlanningScreen';

export type RootStackParamList = {
  Main: { openBillId?: string } | undefined;
  Profile: undefined;
  Calendar: undefined;
  Accounts: undefined;
  Income: { openIncomeId?: string; openIncomeNonce?: number } | undefined;
  Savings: { openSavingsId?: string; openSavingsNonce?: number } | undefined;
  Planning: { tab?: PlanningTab } | undefined;
  Reports: undefined;
  Report: { id: string; backTitle?: string };
  MoreReports: undefined;
  Settings: undefined;
  Premium: undefined;
  TransactionDetail: { id: string };
  Search: undefined;
  Review: undefined;
  Recurring: undefined;
  Envelopes: undefined;
  Subscriptions: undefined;
  CardDetail: { group: 'cash' | 'debit' | 'credit'; id: string };
  Transfer: { fromGroup?: 'cash' | 'debit' | 'credit'; fromId?: string } | undefined;
  PayDetail: { kind: 'bill' | 'debt' | 'loan'; id: string; backTitle?: string };
  PotDetail: { id: string };
  Groceries: undefined;
  Travel: undefined;
  Events: undefined;
  YearlyGoals: undefined;
  SharedExpenses: { fromTransactionId?: string; editExpenseId?: string; nonce?: number } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

type RootStackProps = {
  username: string;
  onLock: () => void;
  onSignOut: () => void;
  onSwitchAccount: () => void;
};

export default function RootStack({ username, onLock, onSignOut, onSwitchAccount }: RootStackProps) {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      id={undefined}
      // Pages build their contents a frame after the slide starts, so opening one feels
      // instant (the tabs page is left alone).
      screenLayout={({ children, route }) =>
        route.name === 'Main' ? children : <DeferredContent>{children}</DeferredContent>
      }
      screenOptions={{
        contentStyle: { backgroundColor: 'transparent' },
        // Every page slides in from the right while the page behind slides fully out to
        // the left, and the reverse on Back. Pages are see-through (the leaves sit behind
        // the whole app), so the page behind must move fully away rather than the iPhone
        // default of shifting a third, which left its text showing through.
        animation: 'slide_from_right',
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
          presentation: Platform.OS === 'ios' ? 'modal' : 'formSheet',
          headerShown: false,
          sheetAllowedDetents: [0.94],
          sheetCornerRadius: 20,
          sheetGrabberVisible: true,
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
        name="Planning"
        component={PlanningScreen}
        options={{ title: 'Planning', headerBackTitle: 'Plan' }}
      />
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
      <Stack.Screen name="CardDetail" component={CardDetailScreen} options={{ title: '', headerBackTitle: 'Home' }} />
      <Stack.Screen name="Transfer" component={TransferScreen} options={{ headerShown: false, presentation: 'modal' }} />
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
        options={{ title: 'Subscription', headerBackTitle: 'Settings' }}
      />
    </Stack.Navigator>
  );
}
