import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import CalendarScreen from '../screens/CalendarScreen';
import ToPayScreen from '../screens/ToPayScreen';
import MoreScreen from '../screens/MoreScreen';
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
      <Tab.Screen
        name="Home"
        options={{
          tabBarButtonTestID: 'home-tab',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      >
        {() => <HomeScreen username={username} onLock={onLock} />}
      </Tab.Screen>
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="To-Pay"
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size} color={color} />,
        }}
      >
        {() => <ToPayScreen initialOpenBillId={initialOpenBillId} />}
      </Tab.Screen>
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="swap-horizontal-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{
          tabBarButtonTestID: 'more-tab',
          tabBarIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}