import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import CalendarScreen from '../screens/CalendarScreen';
import AccountsScreen from '../screens/AccountsScreen';
import ToPayScreen from '../screens/ToPayScreen';
import IncomeScreen from '../screens/IncomeScreen';
import SavingsScreen from '../screens/SavingsScreen';
import PlanningScreen from '../screens/PlanningScreen';
import InsightsScreen from '../screens/InsightsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useTheme } from '../ThemeContext';
const Tab = createBottomTabNavigator();
type MainTabsProps = {
  username: string;
  onLock: () => void;
  onSignOut?: () => void;
  initialOpenBillId?: string;
};
export default function MainTabs({ username, onLock, onSignOut, initialOpenBillId }: MainTabsProps) {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      id={undefined}
      // B.14 fix: force the whole tab navigator to remount — and therefore
      // pick up initialRouteName fresh — every time a subscription reminder
      // hands us a new openBillId. Without this, tapping a reminder while
      // sitting on a different tab left the bottom tab bar stuck on
      // whatever tab was already showing.
      key={initialOpenBillId ? `open-bill-${initialOpenBillId}` : 'default'}
      initialRouteName={initialOpenBillId ? 'To-Pay' : undefined}
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.navy3 },
        headerTintColor: colors.ink,
        tabBarStyle: { backgroundColor: colors.navy3, borderTopColor: colors.navy4 },
        tabBarLabelStyle: { fontSize: 9 },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.inkFaint,
      }}
    >
      <Tab.Screen name="Home" options={{ tabBarButtonTestID: 'home-tab' }}>
        {() => <HomeScreen username={username} onLock={onLock} />}
      </Tab.Screen>
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Accounts" component={AccountsScreen} />
      <Tab.Screen name="To-Pay">
        {() => <ToPayScreen initialOpenBillId={initialOpenBillId} />}
      </Tab.Screen>
      <Tab.Screen name="Planning" component={PlanningScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Insights" component={InsightsScreen} />
      <Tab.Screen name="Income" component={IncomeScreen} />
      <Tab.Screen name="Savings" component={SavingsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarButtonTestID: 'settings-tab' }} />
    </Tab.Navigator>
  );
}