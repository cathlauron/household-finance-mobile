import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import ToPayScreen from '../screens/ToPayScreen';
import MoreScreen from '../screens/MoreScreen';
import { useTheme } from '../ThemeContext';
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
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center' }}>
      <Ionicons name={focused ? on : off} size={size} color={color} />
      <View
        style={{
          width: 14,
          height: 2,
          borderRadius: 1,
          marginTop: 3,
          backgroundColor: focused ? colors.gold : 'transparent',
        }}
      />
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
        sceneStyle: { backgroundColor: 'transparent' },
        headerShown: true,
        headerStyle: { backgroundColor: colors.navy3 },
        headerTintColor: colors.ink,
        tabBarStyle: { backgroundColor: colors.navy3, borderTopColor: colors.navy4 },
        tabBarLabelStyle: { fontSize: 9.5, fontWeight: '600' },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.inkFaint,
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
        name="To-Pay"
        options={{
          tabBarIcon: ({ focused, color, size }) => <TabIcon focused={focused} color={color} size={size} on="receipt" off="receipt-outline" />,
        }}
      >
        {() => <ToPayScreen initialOpenBillId={initialOpenBillId} />}
      </Tab.Screen>
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => <TabIcon focused={focused} color={color} size={size} on="swap-horizontal" off="swap-horizontal-outline" />,
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{
          tabBarButtonTestID: 'more-tab',
          tabBarIcon: ({ focused, color, size }) => <TabIcon focused={focused} color={color} size={size} on="ellipsis-horizontal" off="ellipsis-horizontal-outline" />,
        }}
      />
    </Tab.Navigator>
  );
}