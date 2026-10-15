import React from 'react';
import { View, Platform, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFabSide } from '../fabSide';
import { useToPaySub, requestToPayAdd } from '../fabActions';
import { hapticLight } from '../haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator, BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';

import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import ToPayScreen from '../screens/ToPayScreen';
import PlanScreen from '../screens/PlanScreen';
import { useTheme } from '../ThemeContext';
import { getSharedHeaderOptions } from './headerOptions';
import TabPage from './TabPage';

const TAB_ORDER = ['Home', 'Transactions', 'To-Pay', 'Plan'];
import GradientFill from '../components/GradientFill';

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
// Redesign: the floating + button. It sits just above the tab bar, near the thumb
// (right by default, left if chosen in Settings › Appearance), on every tab. Tapping it
// opens Transactions with the "New transaction" sheet already up.
const TAB_BAR_HEIGHT = 68;
// On To-Pay it adds whatever is showing there (bill, debt or loan) instead.
const TOPAY_ADD_LABEL = { bills: 'Add a bill', debts: 'Add a debt', loans: 'Add a loan' } as const;
// Which tab is showing, kept outside MainTabs. If MainTabs itself re-rendered on every
// tab change, the tab navigator would restart its slide halfway and the old screen would
// vanish instantly (the "pop"). Only the + button listens to this.
let currentTab = 'Home';
const tabListeners = new Set<() => void>();
function setCurrentTab(name: string) {
  if (name === currentTab) return;
  currentTab = name;
  tabListeners.forEach((l) => l());
}
function useCurrentTab(): string {
  return React.useSyncExternalStore(
    (l) => {
      tabListeners.add(l);
      return () => {
        tabListeners.delete(l);
      };
    },
    () => currentTab
  );
}

function AddFab({ bottom }: { bottom: number }) {
  const activeTab = useCurrentTab();
  const { colors, isDark } = useTheme();
  const side = useFabSide();
  const toPaySub = useToPaySub();
  const navigation = useNavigation<any>();
  const onToPay = activeTab === 'To-Pay';
  // Plan has its own + on each page, so the floating + isn't shown there.
  if (activeTab === 'Plan') return null;
  return (
    <Pressable
      testID="add-transaction-fab"
      accessibilityRole="button"
      accessibilityLabel={onToPay ? TOPAY_ADD_LABEL[toPaySub] : 'Add a transaction'}
      onPress={() => {
        hapticLight();
        if (onToPay) requestToPayAdd();
        else navigation.navigate('Main', { screen: 'Transactions', params: { addNonce: Date.now() } });
      }}
      style={({ pressed }) => [
        fabStyles.fab,
        side === 'left' ? { left: 18 } : { right: 18 },
        {
          bottom,
          backgroundColor: colors.accentTint,
          borderColor: `${colors.gold}40`,
          transform: [{ scale: pressed ? 0.94 : 1 }],
        },
      ]}
    >
      <GradientFill kind="tint" color={colors.accentTint} radius={30} />
      <Ionicons name="add" size={32} color={colors.gold} />
    </Pressable>
  );
}

const fabStyles = StyleSheet.create({
  fab: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
      default: { elevation: 6 },
    }),
  },
});

type MainTabsProps = {
  username: string;
  onLock: () => void;
  onSignOut?: () => void;
  initialOpenBillId?: string;
};
export default function MainTabs({ username, onSignOut, initialOpenBillId }: MainTabsProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarBottom = Math.max(insets.bottom, 12);
  // Set before the first draw so the + button knows the starting tab.
  const startTab = initialOpenBillId ? 'To-Pay' : 'Home';
  const startedRef = React.useRef(false);
  if (!startedRef.current) {
    startedRef.current = true;
    currentTab = startTab;
  }
  const screenListeners = React.useCallback(
    ({ route }: { route: { name: string } }) => ({ focus: () => setCurrentTab(route.name) }),
    []
  );
  // Built once (until the theme or screen size changes), so switching tabs doesn't hand
  // the navigator a brand-new set of options and redraw every tab.
  const screenOptions = React.useMemo<BottomTabNavigationOptions>(() => ({
        sceneStyle: { backgroundColor: 'transparent' },
        ...getSharedHeaderOptions(colors),
        // The tab's large title is drawn by TabPage (so it fades with its page); the
        // navigator's own header slot stays empty.
        header: () => null,
        // Redesign: a rounded bar that floats a little above the bottom edge, like the
        // Finance Flow mockups. It stays part of the layout (not drawn over the screen),
        // so no screen's content ends up hidden behind it.
        tabBarStyle: {
          backgroundColor: colors.navy3,
          borderTopWidth: isDark ? 1 : 0,
          marginHorizontal: 10,
          marginBottom: tabBarBottom,
          height: TAB_BAR_HEIGHT,
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
        tabBarBackground: () => <GradientFill kind="surface" color={colors.navy3} radius={34} />,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.inkDim,
  }), [colors, isDark, tabBarBottom]);
  return (
    <View style={{ flex: 1 }}>
    <Tab.Navigator
      id={undefined}
      // B.14 fix: force the whole tab navigator to remount — and therefore
      // pick up initialRouteName fresh — every time a subscription reminder
      // hands us a new openBillId. Without this, tapping a reminder while
      // sitting on a different tab left the bottom tab bar stuck on
      // whatever tab was already showing.
      key={initialOpenBillId ? `open-bill-${initialOpenBillId}` : 'default'}
      initialRouteName={initialOpenBillId ? 'To-Pay' : undefined}
      screenListeners={screenListeners}
      // Every visited tab stays drawn; TabPage keeps the hidden ones just off screen and
      // fades them in and out.
      detachInactiveScreens={false}
      screenLayout={({ children, route, options, navigation }) => (
        <TabPage
          routeName={route.name}
          routeIndex={TAB_ORDER.indexOf(route.name)}
          route={route}
          options={options}
          navigation={navigation}
          showHeader={options.headerShown !== false}
        >
          {children}
        </TabPage>
      )}
      screenOptions={screenOptions}
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
    <AddFab bottom={tabBarBottom + TAB_BAR_HEIGHT + 14} />
    </View>
  );
}