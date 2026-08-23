import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import PlaceholderScreen from '../screens/PlaceholderScreen';
import CalendarScreen from '../screens/CalendarScreen';
import AccountsScreen from '../screens/AccountsScreen';
import BillsScreen from '../screens/BillsScreen';
import { useTheme } from '../ThemeContext';
const Tab = createBottomTabNavigator();
type MainTabsProps = {
  username: string;
  onLock: () => void;
  onSignOut: () => void;
};
export default function MainTabs({ username, onLock, onSignOut }: MainTabsProps) {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
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
      <Tab.Screen name="Home">
        {() => <HomeScreen username={username} onLock={onLock} onSignOut={onSignOut} />}
      </Tab.Screen>
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Accounts" component={AccountsScreen} />
      <Tab.Screen name="To-Pay" component={BillsScreen} />
      <Tab.Screen name="Planning" component={PlaceholderScreen} />
      <Tab.Screen name="Transactions" component={PlaceholderScreen} />
      <Tab.Screen name="Insights" component={PlaceholderScreen} />
      <Tab.Screen name="Income" component={PlaceholderScreen} />
      <Tab.Screen name="Savings" component={PlaceholderScreen} />
      <Tab.Screen name="Settings" component={PlaceholderScreen} />
    </Tab.Navigator>
  );
}
