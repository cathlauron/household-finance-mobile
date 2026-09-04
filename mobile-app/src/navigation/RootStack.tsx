import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabs from './MainTabs';
import ProfileScreen from '../screens/ProfileScreen';
import { useTheme } from '../ThemeContext';

export type RootStackParamList = {
  Main: undefined;
  Profile: undefined;
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
        {() => <MainTabs username={username} onLock={onLock} onSignOut={onSignOut} />}
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
    </Stack.Navigator>
  );
}
