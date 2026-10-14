import React from 'react';
import { View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import ToPayScreen from '../screens/ToPayScreen';
import PlanScreen from '../screens/PlanScreen';
import { useTheme } from '../ThemeContext';
import { getSharedHeaderOptions } from './headerOptions';

const Tab = createBottomTabNavigator();
function TabIcon({
  focused,
  color,
  size,
  on,
  off,
}: {
  focused: boolean;
  color: string;
  size: number;
  on: React.ComponentProps<typeof Ionicons>['name'];
  off: React.ComponentProps<typeof Ionicons>['name'];
}) {
  // Redesign: the old small underline under the active tab is gone. The floating bar
  // shows the active tab with a filled icon and the accent colour instead.
  return (
    <View style={{ alignItems: 'center' }}>
      <Ionicons name={focused ? on : off} size={size + 2} color={color} />
    </View>
  );
}
type MainTabsProps = {
  username: string;
  onLock: () => void;
  onSignOut?: () => void;
  initialOpenBillId?: string;
};
export default function MainTabs({ username, onSignOut, initialOpenBillId }: MainTabsProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
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
        sceneStyle: { backgroundColor: 'transparent' },
        ...getSharedHeaderOptions(colors),
        // Redesign: a rounded bar that floats a little above the bottom edge, like the
        // Finance Flow mockups. It stays part of the layout (not drawn over the screen),
        // so no screen's content ends up hidden behind it.
        tabBarStyle: {
          backgroundColor: colors.navy3,
          borderTopWidth: isDark ? 1 : 0,
          marginHorizontal: 10,
          marginBottom: Math.max(insets.bottom, 12),
          height: 68,
          paddingTop: 8,
          paddingBottom: 8,
          borderRadius: 34,
          borderWidth: isDark ? 1 : 0,
          borderColor: colors.navy4,
          ...Platform.select({
            ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 4 } },
            default: { elevation: 8 },
          }),
        },
        tabBarItemStyle: { borderRadius: 26 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.inkDim,
      }}
    >
      <Tab.Screen
        name="Home"
        options={{
          headerShown: false,
          tabBarButtonTestID: 'home-tab',
          tabBarIcon: ({ focused, color, size }) => <TabIcon focused={focused} color={color} size={size} on="home" off="home-outline" />,
        }}
      >
        {() => <HomeScreen username={username} />}
      </Tab.Screen>
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => <TabIcon focused={focused} color={color} size={size} on="list" off="list-outline" />,
        }}
      />
      <Tab.Screen
        name="To-Pay"
        options={{
          tabBarIcon: ({ focused, color, size }) => <TabIcon focused={focused} color={color} size={size} on="receipt" off="receipt-outline" />,
        }}
      >
        {() => <ToPayScreen initialOpenBillId={initialOpenBillId} />}
      </Tab.Screen>
      {/* Redesign: Plan replaces the old More tab (see PlanScreen.tsx). */}
      <Tab.Screen
        name="Plan"
        component={PlanScreen}
        options={{
          tabBarButtonTestID: 'plan-tab',
          tabBarIcon: ({ focused, color, size }) => <TabIcon focused={focused} color={color} size={size} on="clipboard" off="clipboard-outline" />,
        }}
      />
    </Tab.Navigator>
  );
}