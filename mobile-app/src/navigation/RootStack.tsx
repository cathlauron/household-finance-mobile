import { Easing } from 'react-native';
import React from 'react';
import { reduceMotionNow } from '../reduceMotion';
import { CURVE, PAGE_BACK_MS, PAGE_OPEN_MS } from '../motion';
import { calendarLeaving } from './calendarLeaving';
import { createStackNavigator, type StackCardStyleInterpolator } from '@react-navigation/stack';
import MainTabs from './MainTabs';
import DeferredContent from './DeferredContent';
import ProfileScreen from '../screens/ProfileScreen';
import CalendarScreen from '../screens/CalendarScreen';
import AccountsScreen from '../screens/AccountsScreen';
import IncomeScreen from '../screens/IncomeScreen';
import SavingsScreen from '../screens/SavingsScreen';
import InsightsScreen from '../screens/InsightsScreen';
import ReportDetailScreen, { MoreReportsScreen } from '../screens/ReportDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PremiumScreen from '../screens/PremiumScreen';
import TransactionDetailScreen from '../screens/TransactionDetailScreen';
import SearchScreen from '../screens/SearchScreen';
import SharedExpensesScreen from '../screens/SharedExpensesScreen';
import InvestmentsScreen from '../screens/InvestmentsScreen';
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
import TransferDetailScreen from '../screens/TransferDetailScreen';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { GuestGate } from '../components/GuestSaveSheet';
import { getSharedHeaderOptions } from './headerOptions';

export type RootStackParamList = {
  Main: { openBillId?: string } | undefined;
  Profile: undefined;
  Calendar: undefined;
  // Version 2.1: the card page's "Edit card" opens this card's edit sheet here.
  Accounts: { editGroup?: 'cash' | 'debit' | 'credit'; editId?: string; nonce?: number } | undefined;
  Income: { openIncomeId?: string; openIncomeNonce?: number; openAddNonce?: number } | undefined;
  IncomePerson: { personId: string };
  Savings: { openSavingsId?: string; openSavingsNonce?: number } | undefined;
  Reports: undefined;
  Report: { id: string; backTitle?: string };
  MoreReports: undefined;
  Settings: { page?: string } | undefined;
  SettingsPage: { subPage: string };
  Premium: undefined;
  TransactionDetail: { id: string };
  Search: undefined;
  Review: undefined;
  Recurring: undefined;
  Envelopes: undefined;
  Subscriptions: undefined;
  CardDetail: { group: 'cash' | 'debit' | 'credit'; id: string; backTitle?: string };
  Transfer: { fromGroup?: 'cash' | 'debit' | 'credit'; fromId?: string } | undefined;
  TransferDetail: { id: string };
  PayDetail: { kind: 'bill' | 'debt' | 'loan'; id: string; backTitle?: string };
  PotDetail: { id: string; open?: 'out' };
  Groceries: undefined;
  Travel: undefined;
  Events: undefined;
  YearlyGoals: undefined;
  SharedExpenses: { fromTransactionId?: string; editExpenseId?: string; nonce?: number } | undefined;
  Investments: { openId?: string } | undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

// Cath, 2026-10-27: on the Plan pages, swiping sideways must not go back to Plan (they
// have their own sideways pages: Pots / Emergency / FI, List / Calculator...). The back
// arrow and the phone's back button still go back.
const NO_SWIPE_BACK = { gestureEnabled: false } as const;

// Version 2.1 (Cath's pick, "Paper slide"): the new page slides in from the right over the
// old one, which fades back as it's covered. Pages stay see-through so the leaves keep
// showing behind them (that's why there's no drop shadow: a see-through page can't cast
// one). Going back runs the same in reverse.
//
// Version 2.2 sweep (Cath: going BACK from Accounts > Income > a person "looks buggy"): the
// page underneath used to be fully invisible until the very end of going back, so the
// top page slid away over an empty background and the old page then popped in. Now the
// two pages move side by side, like the tabs: the new page pushes the old one out to the
// left, and going back the old page comes back in from the left as the top one leaves to
// the right (also when you swipe back with your finger). They never overlap, so the
// see-through pages never show through each other, and there's never an empty moment.
const paperSlide: StackCardStyleInterpolator = ({ current, next, layouts }) => {
  const w = layouts.screen.width;
  if (reduceMotionNow()) {
    // Phone set to remove animations: a short fade, no sliding; the covered page fades out.
    return {
      cardStyle: {
        opacity: next
          ? next.progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })
          : current.progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
      },
    };
  }
  return {
    cardStyle: {
      transform: [
        {
          translateX: next
            ? next.progress.interpolate({ inputRange: [0, 1], outputRange: [0, -w] })
            : current.progress.interpolate({ inputRange: [0, 1], outputRange: [w, 0] }),
        },
      ],
    },
  };
};
const stayBehindSheet: StackCardStyleInterpolator = () => ({ cardStyle: {} });
// The Calendar sheet is on top (or just sliding away): the page behind it stays put.
function topRouteName(navigation: any): string | undefined {
  const st = navigation?.getState?.();
  const top = st?.routes?.[st.routes.length - 1]?.name;
  return calendarLeaving() ? 'Calendar' : top;
}

// The same curve as the pop-up sheets; going back is a little quicker than going in.
const paperTiming = {
  animation: 'timing' as const,
  config: { duration: PAGE_OPEN_MS, easing: Easing.bezier(...CURVE) },
};
const paperTimingBack = {
  animation: 'timing' as const,
  config: { duration: PAGE_BACK_MS, easing: Easing.bezier(...CURVE) },
};
// The Calendar opens as a sheet from the bottom with rounded corners over a dimmed page.
const sheetUp: StackCardStyleInterpolator = ({ current, layouts }) => ({
  cardStyle: {
    transform: [
      { translateY: current.progress.interpolate({ inputRange: [0, 1], outputRange: [layouts.screen.height, 0] }) },
    ],
  },
  overlayStyle: { opacity: current.progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }) },
});

type RootStackProps = {
  username: string;
  onLock: () => void;
  onSignOut: () => void;
  onSwitchAccount: () => void;
  // Version 3: no account yet (guest). Settings and Profile ask to save Finance Flow first.
  onGuestSave?: () => void;
};

// Smoothness sweep 2026-10-26 (jank reviewer, proven in __tests__/NoRedrawOnSave): pages
// drawn by a function made fresh on every redraw can't be skipped by the navigation
// library, so every save redrew the main tabs and every open page. These page-drawing
// functions are made once; pages that only need their route are plain functions here.
function IncomeRoute({ route }: any) {
  return <IncomeScreen openAddNonce={route.params?.openAddNonce} openIncomeId={route.params?.openIncomeId} openIncomeNonce={route.params?.openIncomeNonce} />;
}
function IncomePersonRoute({ route }: any) {
  return <IncomeScreen personId={route.params.personId} />;
}
function SavingsRoute({ route }: any) {
  return <SavingsScreen openSavingsId={route.params?.openSavingsId} openSavingsNonce={route.params?.openSavingsNonce} />;
}

export default function RootStack({ username, onLock, onSignOut, onSwitchAccount, onGuestSave }: RootStackProps) {
  const { colors } = useTheme();
  const { guest } = useData();
  // The app hands over new lock / sign-out actions each time it redraws; the pages get
  // steady ones that always call the newest.
  const latest = React.useRef({ onLock, onSignOut, onSwitchAccount });
  latest.current = { onLock, onSignOut, onSwitchAccount };
  const actions = React.useMemo(
    () => ({
      onLock: () => latest.current.onLock(),
      onSignOut: () => latest.current.onSignOut(),
      onSwitchAccount: () => latest.current.onSwitchAccount(),
    }),
    []
  );
  const renderMain = React.useCallback(
    ({ route }: any) => (
      <MainTabs username={username} onLock={actions.onLock} onSignOut={actions.onSignOut} initialOpenBillId={route.params?.openBillId} />
    ),
    [username, actions]
  );
  const renderProfile = React.useCallback(
    () => <ProfileScreen onLock={actions.onLock} onSignOut={actions.onSignOut} onSwitchAccount={actions.onSwitchAccount} />,
    [actions]
  );
  const renderSettings = React.useCallback(
    () => <SettingsScreen onSignOut={actions.onSignOut} onSwitchAccount={actions.onSwitchAccount} onLock={actions.onLock} />,
    [actions]
  );

  return (
    <Stack.Navigator
      id={undefined}
      // Pages build their contents a frame after the fade starts, so opening one feels
      // instant (the tabs page is left alone).
      screenLayout={({ children, route }) =>
        route.name === 'Main' ? (
          children
        ) : guest && (route.name === 'Settings' || route.name === 'Profile' || route.name === 'SettingsPage') ? (
          <GuestGate onContinue={() => onGuestSave?.()} />
        ) : (
          <DeferredContent>{children}</DeferredContent>
        )
      }
      screenOptions={({ navigation }) => ({
        cardStyle: { backgroundColor: 'transparent' },
        headerMode: 'screen',
        // Phones animate pages anyway; saying so also turns the slides on in the web copy
        // Claude records frame by frame (smoothness checks, 2026-10-23).
        animation: 'default',
        // The Calendar rises as a sheet over a dimmed page: the page behind it stays put.
        cardStyleInterpolator: topRouteName(navigation) === 'Calendar' ? stayBehindSheet : paperSlide,
        transitionSpec: { open: paperTiming, close: paperTimingBack },
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        ...getSharedHeaderOptions(colors),
      })}
    >
      <Stack.Screen
        name="Main"
        options={{ headerShown: false }}
      >
        {renderMain}
      </Stack.Screen>
      <Stack.Screen
        name="Profile"
        options={{
          headerShown: true,
          title: 'Profile',
          headerBackTitle: 'Settings',
        }}
      >
        {renderProfile}
      </Stack.Screen>
      <Stack.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          // Version 2.2 (Cath: after using + in the calendar, going back and opening it
          // again, the calendar showed behind Home): it's a full, solid page, so it no longer
          // uses the "see-through modal" mode (which keeps special layers around behind
          // other pages). It looks the same: it rises from the bottom over a dimmed page.
          presentation: 'card',
          headerShown: false,
          cardOverlayEnabled: true,
          cardStyleInterpolator: sheetUp,
          gestureDirection: 'vertical',
          // Version 2.2 (Cath: scrolling the months closed the calendar): it still slides up
          // from the bottom, but as a full page that can't be dragged down; Done closes it.
          gestureEnabled: false,
          cardStyle: { backgroundColor: colors.navy2 },
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
        {IncomeRoute}
      </Stack.Screen>
      {/* One person's income: their paydays this month and their sources. */}
      <Stack.Screen name="IncomePerson" options={{ title: ' ', headerBackTitle: 'Income' }}>
        {IncomePersonRoute}
      </Stack.Screen>
      <Stack.Screen
        name="Savings"
        options={{ title: 'Savings', headerBackTitle: 'Plan', ...NO_SWIPE_BACK }}
      >
        {SavingsRoute}
      </Stack.Screen>
      <Stack.Screen
        name="Reports"
        component={InsightsScreen}
        options={{ title: 'Insights', headerBackTitle: 'Home' }}
      />
      <Stack.Screen
        name="Settings"
        options={{ title: 'Settings', headerBackTitle: 'Home' }}
      >
        {renderSettings}
      </Stack.Screen>
      {/* A Settings sub-page (Account & Security, Appearance, ...), pushed so it fades in like other pages. */}
      <Stack.Screen name="SettingsPage" options={{ title: ' ', headerBackTitle: 'Settings' }}>
        {renderSettings}
      </Stack.Screen>
      <Stack.Screen name="CardDetail" component={CardDetailScreen} options={{ title: '', headerBackTitle: 'Home' }} />
      <Stack.Screen name="Transfer" component={TransferScreen} options={{ headerShown: false }} />
      <Stack.Screen name="TransferDetail" component={TransferDetailScreen} options={{ title: '', headerBackTitle: 'Transactions' }} />
      <Stack.Screen name="Subscriptions" component={SubscriptionsScreen} options={{ title: 'Subscriptions', headerBackTitle: 'To-Pay' }} />
      <Stack.Screen name="PayDetail" component={PayDetailScreen} options={{ title: '', headerBackTitle: 'To-Pay' }} />
      <Stack.Screen name="Report" component={ReportDetailScreen} options={{ title: ' ', headerBackTitle: 'Insights' }} />
      <Stack.Screen name="MoreReports" component={MoreReportsScreen} options={{ title: 'More reports', headerBackTitle: 'Insights' }} />
      <Stack.Screen name="PotDetail" component={PotDetailScreen} options={{ title: ' ', headerBackTitle: 'Savings' }} />
      {/* Redesign: each Plan section is its own page, as in the mockup. */}
      <Stack.Screen name="Groceries" component={GroceriesScreen} options={{ title: 'Groceries', headerBackTitle: 'Plan', ...NO_SWIPE_BACK }} />
      <Stack.Screen name="Travel" component={TravelScreen} options={{ title: 'Travel', headerBackTitle: 'Plan', ...NO_SWIPE_BACK }} />
      <Stack.Screen name="Events" component={EventsScreen} options={{ title: 'Events', headerBackTitle: 'Plan', ...NO_SWIPE_BACK }} />
      <Stack.Screen name="YearlyGoals" component={GoalsScreen} options={{ title: 'Yearly Goals', headerBackTitle: 'Plan', ...NO_SWIPE_BACK }} />
      <Stack.Screen name="SharedExpenses" component={SharedExpensesScreen} options={{ title: 'Shared Expenses', headerBackTitle: 'Plan', ...NO_SWIPE_BACK }} />
      <Stack.Screen name="Investments" component={InvestmentsScreen} options={{ title: 'Investments', headerBackTitle: 'Plan', ...NO_SWIPE_BACK }} />
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
        options={{ title: 'Premium', headerBackTitle: 'Settings' }}
      />
    </Stack.Navigator>
  );
}
