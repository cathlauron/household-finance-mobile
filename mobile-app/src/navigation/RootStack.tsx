import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabs from './MainTabs';
import ProfileScreen from '../screens/ProfileScreen';
import CalendarScreen from '../screens/CalendarScreen';
import AccountsScreen from '../screens/AccountsScreen';
import IncomeScreen from '../screens/IncomeScreen';
import SavingsScreen from '../screens/SavingsScreen';
import PlanningScreen from '../screens/PlanningScreen';
import InsightsScreen from '../screens/InsightsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useTheme } from '../ThemeContext';

export type RootStackParamList = {
  Main: { openBillId?: string } | undefined;
  Profile: undefined;
  Calendar: undefined;
  Accounts: undefined;
  Income: undefined;
  Savings: undefined;
  Planning: undefined;
  Insights: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

type RootStackProps = {
  username: string;
  onLock: () => void;
  onSignOut: () => void;
};

export default function RootStack({ username, onLock, onSignOut }: RootStackProps) {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      id={undefined}
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy3 },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontWeight: '700' },
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
        {() => <ProfileScreen onLock={onLock} onSignOut={onSignOut} />}
      </Stack.Screen>
      <Stack.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{ title: 'Calendar', headerBackTitle: 'Home' }}
      />
      <Stack.Screen
        name="Accounts"
        component={AccountsScreen}
        options={{ title: 'Accounts', headerBackTitle: 'More' }}
      />
      <Stack.Screen
        name="Income"
        component={IncomeScreen}
        options={{ title: 'Income', headerBackTitle: 'More' }}
      />
      <Stack.Screen
        name="Savings"
        component={SavingsScreen}
        options={{ title: 'Savings', headerBackTitle: 'More' }}
      />
      <Stack.Screen
        name="Planning"
        component={PlanningScreen}
        options={{ title: 'Planning', headerBackTitle: 'More' }}
      />
      <Stack.Screen
        name="Insights"
        component={InsightsScreen}
        options={{ title: 'Insights', headerBackTitle: 'More' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings', headerBackTitle: 'More' }}
      />
    </Stack.Navigator>
  );
}
