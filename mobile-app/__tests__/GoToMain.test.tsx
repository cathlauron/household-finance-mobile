import React from 'react';
import { Text } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { goToMain } from '../src/navigation/goToMain';

// 2026-10-26 (Cath's recording, found by the motion reviewer): going to Main from a page
// on top (Calendar, Search, a card...) stacked a SECOND copy of the tabs; the old one, on
// Home, showed behind every page as it slid. goToMain goes back to the one Main instead.
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
function Tabs() {
  return (
    <Tab.Navigator id={undefined}>
      <Tab.Screen name="Home">{() => <Text>home</Text>}</Tab.Screen>
      <Tab.Screen name="To-Pay">{() => <Text>to-pay</Text>}</Tab.Screen>
    </Tab.Navigator>
  );
}
function App({ nav }: { nav: any }) {
  return (
    <NavigationContainer ref={nav}>
      <Stack.Navigator id={undefined} screenOptions={{ animation: 'none' }}>
        <Stack.Screen name="Main" component={Tabs} />
        <Stack.Screen name="Calendar">{() => <Text>calendar</Text>}</Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
const mains = (nav: any) => nav.getRootState().routes.filter((r: any) => r.name === 'Main').length;

test('the old way stacks a second Main (what Cath saw)', () => {
  const nav = createNavigationContainerRef<any>();
  render(<App nav={nav} />);
  act(() => nav.navigate('Calendar'));
  act(() => nav.navigate('Main', { screen: 'To-Pay' }));
  expect(mains(nav)).toBe(2);
});

test('goToMain goes back to the one Main and shows the tab asked for', () => {
  const nav = createNavigationContainerRef<any>();
  const r = render(<App nav={nav} />);
  act(() => nav.navigate('Calendar'));
  act(() => goToMain(nav, { screen: 'To-Pay' }));
  expect(mains(nav)).toBe(1);
  expect(nav.getRootState().routes.map((x: any) => x.name)).toEqual(['Main']);
  expect(r.getByText('to-pay')).toBeTruthy();
});

test('goToMain from inside the tabs (already on Main) just changes the tab', () => {
  const nav = createNavigationContainerRef<any>();
  render(<App nav={nav} />);
  act(() => goToMain(nav, { screen: 'To-Pay' }));
  expect(nav.getRootState().routes.map((x: any) => x.name)).toEqual(['Main']);
  expect(nav.getCurrentRoute()?.name).toBe('To-Pay');
});

test('nothing in the app goes to Main the old way (always goToMain)', () => {
  const fs = require('fs');
  const path = require('path');
  const root = path.join(__dirname, '..');
  const walk = (d: string): string[] =>
    fs.readdirSync(d, { withFileTypes: true }).flatMap((e: any) =>
      e.isDirectory() ? walk(path.join(d, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(d, e.name)] : []);
  const bad = [...walk(path.join(root, 'src')), path.join(root, 'App.tsx')].filter((f) => {
    if (f.endsWith('goToMain.ts')) return false;
    const code = fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    return /\.navigate\(\s*['"]Main['"]/.test(code) || /\.navigate\(\s*\{\s*name:\s*['"]Main['"]/.test(code);
  });
  expect(bad.map((f) => path.relative(root, f))).toEqual([]);
});

// Code reviewer, 2026-10-27: going back replaced ALL of Main's settings, so a bill opened
// from a reminder (openBillId) was wiped, and the tabs were rebuilt from scratch.
test('goToMain keeps what Main already had (a bill opened from a reminder)', () => {
  const nav = createNavigationContainerRef<any>();
  render(<App nav={nav} />);
  act(() => goToMain(nav, { openBillId: 'b1' }));
  act(() => nav.navigate('Calendar'));
  act(() => goToMain(nav, { screen: 'To-Pay' }));
  const main: any = nav.getRootState().routes.find((r: any) => r.name === 'Main');
  expect(main.params.openBillId).toBe('b1');
  expect(nav.getCurrentRoute()?.name).toBe('To-Pay');
});
