import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { buildPages, monthCells, todayIndex, YEARS_EACH_SIDE, type Page } from '../calendarPages';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { Animated, Easing, View, StyleSheet, Modal, Pressable, ActivityIndicator, ScrollView, FlatList, useWindowDimensions } from 'react-native';
import { CURVE, ROW_MS, SHEET_CLOSE_MS } from '../motion';
import { TouchableOpacity } from '../components/Tap';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../components/AppText';
import { useTheme } from '../ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../DataContext';
import { computeRunningBalances, formatPeso, computeMonthEvents, CalendarEvent } from '../balanceProjection';
import { newEventIndex, withEverythingDated } from '../calendarAll';
import ArrivalGlow from '../components/ArrivalGlow';
import {
  CalendarViewMode,
  CalendarNavMode,
  calendarSettingsNow,
  getCalendarViewMode,
  setCalendarViewMode,
  getCalendarNavMode,
  setCalendarNavMode,
  getCalendarShowBalance,
  setCalendarShowBalance,
} from '../calendarSettings';
import { useNavigation } from '@react-navigation/native';
import GradientFill from '../components/GradientFill';
import BottomSheet, { startSheetHandoff } from '../components/BottomSheet';
import TransactionsScreen from './TransactionsScreen';
import BillsScreen from './BillsScreen';
import DebtsScreen from './DebtsScreen';
import LoansScreen from './LoansScreen';
import EventsScreen from './EventsScreen';
import TravelScreen from './TravelScreen';
import SavingsScreen from './SavingsScreen';
import GoalsScreen from './GoalsScreen';
import SharedExpensesScreen from './SharedExpensesScreen';
import InvestmentsScreen from './InvestmentsScreen';
import GroceriesScreen from './GroceriesScreen';
import { layoutWeek, marksFor, type WeekBand } from '../calendarBands';
import { salaryHandoffPending } from '../salaryHandoff';
import { accountHandoffPending } from '../accountHandoff';
import { noteCalendarLeaving } from '../navigation/calendarLeaving';
import { hapticSelection } from '../haptics';
import { requestToPayAdd } from '../fabActions';
import { afterSlide } from '../afterSlide';
import { reduceMotionNow } from '../reduceMotion';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// One colour per kind of item, used for the small dots under each day and the dot next
// to each row in the day panel. Matches the Finance Flow mockup: bills red, income green,
// loans blue, savings in the saving colour; your own entries follow their direction.
function eventColor(ev: CalendarEvent, colors: any): string {
  if (ev.band?.kind === 'trip') return colors.planned;
  switch (ev.type) {
    case 'bill':
      return colors.negative;
    case 'debt':
      return colors.orange;
    case 'loan':
      return colors.indigo;
    case 'income':
      return colors.positive;
    case 'saving':
      return colors.saving;
    case 'reminder':
      return colors.gold;
    default:
      if (ev.direction === 'in') return colors.positive;
      if (ev.direction === 'saving') return colors.saving;
      return colors.planned;
  }
}

// The small grey second line under each item in the day panel.
function eventKind(ev: CalendarEvent): string {
  if (ev.sub) return ev.sub;
  if (ev.tripId) return `${ev.tripName || 'Trip'} trip · due`;
  switch (ev.type) {
    case 'bill':
      return ev.regular ? 'Regular payment' : 'Bill';
    case 'debt':
      return 'Debt payment';
    case 'loan':
      return 'Loan payment';
    case 'income':
      return 'Income';
    case 'saving':
      return ev.amount < 0 ? 'Moved out of savings' : 'Saving';
    default:
      if (ev.direction === 'in') return 'Money in';
      if (ev.direction === 'saving') return 'Saving';
      return 'Spent';
  }
}

// The amount on the right of each row: + for money in, − for money out, no sign for
// money set aside (shown in the saving colour).
function eventAmount(ev: CalendarEvent, colors: any): { text: string; color: string } {
  // A reminder shows its amount plainly, or nothing when it has none.
  if (ev.type === 'reminder') return { text: ev.amount > 0 ? formatPeso(ev.amount) : '', color: colors.inkDim };
  const abs = formatPeso(Math.abs(ev.amount));
  const isSaving = ev.type === 'saving' || (ev.type === 'manual' && ev.direction === 'saving');
  if (isSaving) return { text: abs, color: colors.saving };
  if (ev.tripId) return { text: '−' + abs, color: colors.planned }; // planned until it's paid
  const isIn = ev.type === 'income' || (ev.type === 'manual' && ev.direction === 'in');
  if (isIn) return { text: '+' + abs, color: colors.positive };
  // 2.2 (approved P2): bills, debts and loans that are only scheduled are calm ink; red
  // stays for money actually spent.
  if (ev.type === 'bill' || ev.type === 'debt' || ev.type === 'loan') return { text: '−' + abs, color: colors.ink };
  return { text: '−' + abs, color: colors.negative };
}


// Version 2.2 (canvas C1-C5, approved, plus Cath's additions): the calendar works like the
// iPhone's. It slides up from the bottom as a full page, and only the months move when you
// scroll or swipe (the page itself can't be dragged closed; Done closes it).
// - Year: 12 small months per year; tap one to open it. Today scrolls to this year (and
//   tapping Today again opens this month).
// - Month: Scroll up and down (months follow each other) or Swipe sideways (one month per
//   page), chosen in the view menu and remembered. List follows the same choice.
// - Compact (dots under each day), Details (names inside each day), or List (one month on
//   top, the chosen day's items underneath). Tapping a day shows its list.
// - Projected balance at the bottom (can be turned off in the view menu).
// Smoothness: each month's items are worked out once per change of data (cached), months
// only redraw when something about them changes, and only the months near the screen are
// drawn.

// Version 2.2 (Cath: the year view started at Oct 2024 with empty months before it, and
// ended at 2028): the calendar covers whole years, 5 before this year to 5 after it, and
// says so at both ends of the year view. The months are worked out in calendarPages.ts.
const TODAY_INDEX = todayIndex();

// Cath, 2026-11-06 (mockup C): what the + sheet can add. Money first, then a second step for Plan.
type PlanForm = 'event' | 'trip' | 'pot' | 'goal' | 'shared' | 'invest' | 'grocery';
type FormKind = 'txn' | 'bills' | 'debts' | 'loans' | PlanForm;
type AddIcon = keyof typeof Ionicons.glyphMap;
type AddChoice = [key: string, form: FormKind, title: string, sub: string, icon: AddIcon];
const ADD_MONEY: AddChoice[] = [
  ['txn', 'txn', 'Transaction', 'Money that moved this day', 'swap-vertical-outline'],
  ['bill', 'bills', 'Bill', 'Comes back every month or year', 'flash-outline'],
  ['debt', 'debts', 'Debt', 'Owed and paid down over time', 'people-outline'],
  ['loan', 'loans', 'Loan', 'Set payments until an end date', 'business-outline'],
];
const ADD_PLAN: AddChoice[] = [
  ['event', 'event', 'Event', 'A birthday or celebration', 'balloon-outline'],
  ['trip', 'trip', 'Trip', 'Starts on this day', 'airplane-outline'],
  ['pot', 'pot', 'Savings pot', 'Saving for this date', 'leaf-outline'],
  ['goal', 'goal', 'Yearly goal', 'Something to reach by this date', 'flag-outline'],
  ['shared', 'shared', 'Shared expense', 'Split with someone', 'people-outline'],
  ['invest', 'invest', 'Investment', 'Money put in on this day', 'trending-up-outline'],
  ['grocery', 'grocery', 'Grocery item', 'To buy by this day', 'cart-outline'],
];
const PLAN_FORMS: Record<PlanForm, React.ComponentType<any>> = {
  event: EventsScreen,
  trip: TravelScreen,
  pot: SavingsScreen,
  goal: GoalsScreen,
  shared: SharedExpensesScreen,
  invest: InvestmentsScreen,
  grocery: GroceriesScreen,
};

function weeksIn(year: number, month: number): number {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  return Math.ceil((first + days) / 7);
}

function isoOf(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// Each month's items, worked out once per version of the household data.
const eventCache = new WeakMap<object, Map<string, Record<number, CalendarEvent[]>>>();
function monthEventsFor(model: any, year: number, month: number): Record<number, CalendarEvent[]> {
  let byMonth = eventCache.get(model);
  if (!byMonth) {
    byMonth = new Map();
    eventCache.set(model, byMonth);
  }
  const key = `${year}-${month}`;
  let ev = byMonth.get(key);
  if (!ev) {
    ev = computeMonthEvents(model, year, month);
    // Cath, 2026-11-06: this is her main calendar, so everything with a date shows (calendarAll.ts).
    ev = withEverythingDated(ev, model, year, month);
    byMonth.set(key, ev);
  }
  return ev;
}

type GridProps = {
  year: number;
  month: number;
  mode: 'compact' | 'details';
  rowHeight: number;
  selectedDay: number | null;
  onDayPress: (y: number, m: number, d: number) => void;
  // Cath, 2026-11-06: a greyed day from the month before or after moves to that month.
  onGreyPress: (y: number, m: number, d: number) => void;
  poppingDay?: number | null; // a day something was just added on
};

// One month as week rows with a line above each, iPhone style: days outside the month are
// left blank, weekends are grey, today is a soft pale-green circle and the chosen day a
// soft pale-grey one (2.2: lighter shades, Cath 2026-10-21).
// See-through levels added to a colour code for the soft day circles (hex alpha).
const TODAY_TINT = '2E'; // about 18%
const SELECTED_TINT = '1A'; // about 10%
const ADD_TAP_GAP = 800; // taps on a + row closer than this count as one
const ARRIVED_MS = 2000; // how long a just-added day stays marked
const GREY_DAY_OPACITY = 0.36; // the days of the month before or after

// Cath, 2026-11-06 (mockup A): a trip's ribbon across its days, an event's on its day. A short
// row (the List view) has a thin line and no name.
const BAND_H = 12;
const BAND_GAP = 1;
const THIN_BAND_H = 4;
const BAND_TOP = 37; // just under the day's number
const THIN_TOP = 41; // behind the dots of a short row
const DOTS_GAP = 3; // the dots' own space above them
const THIN_BELOW = 52; // rows shorter than this draw the thin line
const ONE_LANE_BELOW = 66; // no room for two ribbons on a shorter row
function bandColor(kind: 'trip' | 'event', colors: any): string {
  return kind === 'trip' ? colors.planned : colors.gold;
}
function Band({ band, thin, pop, colors }: { band: WeekBand; thin: boolean; pop: boolean; colors: any }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!pop || reduceMotionNow()) return;
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: ROW_MS, delay: SHEET_CLOSE_MS, easing: Easing.bezier(...CURVE), useNativeDriver: true }).start();
  }, [pop, v]);
  const color = bandColor(band.kind, colors);
  const height = thin ? THIN_BAND_H : BAND_H;
  const step = 100 / 7;
  return (
    <Animated.View
      pointerEvents="none"
      testID={pop ? 'calendar-day-pop' : `calendar-band-${band.key}`}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        position: 'absolute',
        left: `${band.from * step}%`,
        width: `${(band.to - band.from + 1) * step}%`,
        top: thin ? THIN_TOP : BAND_TOP + band.lane * (BAND_H + BAND_GAP),
        height,
        paddingLeft: band.roundStart ? 2 : 0,
        paddingRight: band.roundEnd ? 2 : 0,
        transform: pop ? [{ scale: v.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, band.to === band.from ? 1.3 : 1.05, 1] }) }] : undefined,
      }}
    >
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          paddingHorizontal: band.to === band.from ? 3 : 5,
          backgroundColor: color + '33',
          borderTopLeftRadius: band.roundStart ? 5 : 0,
          borderBottomLeftRadius: band.roundStart ? 5 : 0,
          borderTopRightRadius: band.roundEnd ? 5 : 0,
          borderBottomRightRadius: band.roundEnd ? 5 : 0,
        }}
      >
        {!thin && <Text style={{ fontSize: 10.5, lineHeight: BAND_H, fontWeight: '800', letterSpacing: -0.2, color, includeFontPadding: false }} numberOfLines={1}>{band.label}</Text>}
      </View>
    </Animated.View>
  );
}

// Cath, 2026-11-06 (mockup C): a small pop on a day's marks once the form has gone down.
function DayMarks({ pop, children }: { pop: boolean; children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!pop || reduceMotionNow()) return;
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: ROW_MS, delay: SHEET_CLOSE_MS, easing: Easing.bezier(...CURVE), useNativeDriver: true }).start();
  }, [pop, v]);
  if (!pop) return <>{children}</>;
  return (
    <Animated.View testID="calendar-day-pop" style={{ alignSelf: 'stretch', alignItems: 'center', transform: [{ scale: v.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1.5, 1] }) }] }}>
      {children}
    </Animated.View>
  );
}

const MonthGrid = React.memo(function MonthGrid({ year, month, mode, rowHeight, selectedDay, onDayPress, onGreyPress, poppingDay }: GridProps) {
  const { colors } = useTheme();
  const { model } = useData();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const events = model ? monthEventsFor(model, year, month) : ({} as Record<number, CalendarEvent[]>);
  const now = new Date();
  const rows = monthCells(year, month);
  const thin = rowHeight < THIN_BELOW;
  const maxLanes = rowHeight < ONE_LANE_BELOW ? 1 : undefined;
  return (
    <View>
      {rows.map((row, ri) => {
        const week = layoutWeek(row, events, maxLanes);
        return (
        <View key={ri} style={[s.weekRow, { height: rowHeight }]}>
          {week.bands.map((band) => (
            <Band key={band.key} band={band} thin={thin} colors={colors} pop={poppingDay != null && band.roundStart && row[band.from]?.day === poppingDay} />
          ))}
          {row.map((cell, ci) => {
            if (cell === null) return <View key={ci} style={s.cell} />;
            if (cell.outside) {
              // Greyed, with no dots, like a phone calendar.
              return (
                <Pressable key={ci} style={s.cell} onPress={() => onGreyPress(cell.year, cell.month, cell.day)} accessibilityRole="button" accessibilityLabel={`${MONTHS[cell.month]} ${cell.day}, go to ${MONTHS[cell.month]}`}>
                  <View style={s.num}>
                    <Text style={[s.numText, { color: colors.inkDim, opacity: GREY_DAY_OPACITY, fontWeight: '500' }]}>{cell.day}</Text>
                  </View>
                </Pressable>
              );
            }
            const d = cell.day;
            const isToday = year === now.getFullYear() && month === now.getMonth() && d === now.getDate();
            const isSel = selectedDay === d;
            const all = events[d] || [];
            const evs = marksFor(all, week.hiddenKeys);
            const lanes = week.lanesAt[ci];
            const pillRoom = lanes > 0 ? 1 : 2;
            const weekend = ci === 0 || ci === 6;
            return (
              <Pressable
                key={ci}
                style={s.cell}
                onPress={() => onDayPress(year, month, d)}
                accessibilityLabel={`${MONTHS[month]} ${d}${all.length ? `, ${all.length} item${all.length === 1 ? '' : 's'}` : ''}`}
              >
                {/* Cath: the picked day showed a square on Android. The phone drops the rounded corners
                    when a colour is added to a plain box later, so every day starts with an
                    invisible colour and clips to its circle. */}
                <View style={[s.num, { backgroundColor: isToday ? colors.gold + TODAY_TINT : isSel ? colors.ink + SELECTED_TINT : 'rgba(0,0,0,0)' }]}>
                  <Text style={[s.numText, { color: isToday ? colors.gold : isSel ? colors.ink : weekend ? colors.inkDim : colors.ink }, (isToday || isSel) && { fontWeight: '800' }]}>{d}</Text>
                </View>
                {lanes > 0 && !thin && <View style={{ height: lanes * (BAND_H + BAND_GAP) + BAND_GAP - DOTS_GAP }} />}
                <DayMarks pop={poppingDay === d}>
                {mode === 'details' ? (
                  <View style={s.pills}>
                    {evs.slice(0, pillRoom).map((ev, i) => (
                      <View key={i} style={[s.pill, { backgroundColor: eventColor(ev, colors) + '26' }]}>
                        <Text style={[s.pillText, { color: eventColor(ev, colors) }]} numberOfLines={1}>{ev.label}</Text>
                      </View>
                    ))}
                    {evs.length > pillRoom && <Text style={s.pillMore}>+{evs.length - pillRoom}</Text>}
                  </View>
                ) : (
                  <View style={s.dots}>
                    {evs.slice(0, 3).map((ev, i) => (
                      <View key={i} style={[s.dot, { backgroundColor: eventColor(ev, colors) }]} />
                    ))}
                  </View>
                )}
                </DayMarks>
              </Pressable>
            );
          })}
        </View>
        );
      })}
    </View>
  );
});

// One small month for the year view. Always 6 weeks tall, so every year is the same height.
const MiniMonth = React.memo(function MiniMonth({ year, month, onOpen, width }: { year: number; month: number; onOpen: (y: number, m: number) => void; width: number }) {
  const { colors } = useTheme();
  const now = new Date();
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cell = Math.floor(width / 7);
  const isThisMonth = year === now.getFullYear() && month === now.getMonth();
  const td = now.getDate();
  const todayAt = isThisMonth ? { d: td, w: Math.floor((td + first - 1) / 7), c: (td + first - 1) % 7 } : null;
  // Each weekday column is one plain piece of text ("1\n8\n15..."), so a month is 7
  // pieces instead of 42 boxes (today's number is drawn again on top, in green).
  const cols = useMemo(
    () =>
      Array.from({ length: 7 }, (_, c) =>
        Array.from({ length: 6 }, (__, w) => {
          const d = w * 7 + c - first + 1;
          return d >= 1 && d <= days && !(todayAt && todayAt.d === d) ? String(d) : ' ';
        }).join('\n')
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [year, month, isThisMonth]
  );
  return (
    <Pressable onPress={() => onOpen(year, month)} style={{ width, height: miniHeight(width) }} accessibilityLabel={`${MONTHS[month]} ${year}`}>
      <Text style={{ fontSize: 17, fontWeight: '800', color: isThisMonth ? colors.gold : colors.ink, marginBottom: 4 }}>{MONTHS[month].slice(0, 3)}</Text>
      {/* Speed (Cath: years showed blank while scrolling): each weekday column is one
          piece of text, instead of 42 separate boxes per month, so a whole year draws in a
          fraction of the time. Today's circle sits behind its number. */}
      <View style={{ flexDirection: 'row', height: cell * 6 }}>
        {todayAt && (
          <View
            pointerEvents="none"
            style={{ position: 'absolute', left: todayAt.c * cell, top: todayAt.w * cell, width: cell, height: cell, borderRadius: cell / 2, backgroundColor: colors.gold + TODAY_TINT }}
          />
        )}
        {cols.map((col, c) => (
          <Text key={c} style={{ width: cell, fontSize: 11, lineHeight: cell, letterSpacing: -0.4, textAlign: 'center', fontWeight: '500', color: colors.ink }}>
            {col}
          </Text>
        ))}
        {todayAt && (
          <Text
            pointerEvents="none"
            style={{ position: 'absolute', left: todayAt.c * cell, top: todayAt.w * cell, width: cell, fontSize: 11, lineHeight: cell, letterSpacing: -0.4, textAlign: 'center', fontWeight: '700', color: colors.gold }}
          >
            {todayAt.d}
          </Text>
        )}
      </View>
    </Pressable>
  );
});
function miniHeight(width: number): number {
  return 26 + 6 * Math.floor(width / 7) + 14;
}

const YearBlock = React.memo(function YearBlock({ year, pages, miniW, onOpen }: { year: number; pages: Page[]; miniW: number; onOpen: (y: number, m: number) => void }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const thisYear = new Date().getFullYear();
  return (
    <View style={{ paddingHorizontal: 20 }}>
      <Text style={[s.yearTitle, year === thisYear && { color: colors.gold }]}>{year}</Text>
      <View style={s.yearLine} />
      <View style={s.yearGrid}>
        {Array.from({ length: 12 }).map((_, m) =>
          pages.some((p) => p.year === year && p.month === m) ? (
            <MiniMonth key={m} year={year} month={m} width={miniW} onOpen={onOpen} />
          ) : (
            <View key={m} style={{ width: miniW, height: miniHeight(miniW) }} />
          )
        )}
      </View>
    </View>
  );
});
const YEAR_HEAD = 72; // title + line
const YEAR_NOTE_H = 44; // the note above the first year

export default function CalendarScreen() {
  const { colors } = useTheme();
  const { model, getModel } = useData();
  const navigation = useNavigation<any>();
  // While the calendar slides away, the page behind it stays put (see RootStack).
  useEffect(() => {
    return navigation.addListener('beforeRemove', () => noteCalendarLeaving());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const today = new Date();
  const pages = useMemo(buildPages, []);
  const todayIndex = TODAY_INDEX;

  const [level, setLevel] = useState<'year' | 'month'>('month');
  // Smoothness sweep 2026-10-26: starts with the remembered layout (no redraw while rising).
  const [viewMode, setViewModeState] = useState<CalendarViewMode>(() => {
    const v = calendarSettingsNow().view;
    return v === 'stacked' ? 'details' : v;
  });
  const [navMode, setNavModeState] = useState<CalendarNavMode>(() => calendarSettingsNow().nav);
  const [showBalance, setShowBalanceState] = useState(() => calendarSettingsNow().balance);
  const [menuOpen, setMenuOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  // The month on screen (index into pages) and the chosen day.
  const [index, setIndex] = useState(todayIndex);
  const [selected, setSelected] = useState<{ year: number; month: number; day: number } | null>(null);
  // Tapping a day in Compact or Details shows that day's list (like the iPhone); "‹ Month"
  // goes back to the grid.
  const [dayOpen, setDayOpen] = useState(false);

  useEffect(() => {
    getCalendarViewMode().then((m) => setViewModeState(m === 'stacked' ? 'details' : m));
    getCalendarNavMode().then(setNavModeState);
    getCalendarShowBalance().then(setShowBalanceState);
  }, []);

  const page = pages[index] ?? pages[todayIndex];
  const listLayout = viewMode === 'list' || dayOpen;
  const gridMode: 'compact' | 'details' = viewMode === 'details' ? 'details' : 'compact';

  const selDay =
    selected && selected.year === page.year && selected.month === page.month
      ? selected.day
      : page.year === today.getFullYear() && page.month === today.getMonth()
      ? today.getDate()
      : 1;
  const balances = useMemo(
    () => (model && showBalance ? computeRunningBalances(model, page.year, page.month) : ({} as Record<number, number>)),
    [model, page.year, page.month, showBalance]
  );

  // ---------- the vertical (scroll) list of months ----------
  const ROW_SCROLL = gridMode === 'details' ? 96 : 62;
  const LABEL_H = 46;
  const offsets = useMemo(() => {
    const o: number[] = [];
    let acc = 0;
    for (const p of pages) {
      o.push(acc);
      acc += LABEL_H + weeksIn(p.year, p.month) * ROW_SCROLL;
    }
    o.push(acc);
    return o;
  }, [pages, ROW_SCROLL]);
  const vRef = useRef<FlatList<Page>>(null);
  const hRef = useRef<FlatList<Page>>(null);
  const indexRef = useRef(index);
  indexRef.current = index;
  const onViewable = useRef(({ viewableItems }: any) => {
    const top = viewableItems.find((v: any) => v.isViewable);
    if (top && typeof top.index === 'number' && top.index !== indexRef.current) setIndex(top.index);
  }).current;
  const viewCfg = useRef({ itemVisiblePercentThreshold: 40 }).current;

  // Stable, so the months on screen don't all redraw when one thing changes.
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;
  const onDayPress = useCallback(
    (y: number, m: number, d: number) => {
      hapticSelection();
      setSelected({ year: y, month: m, day: d });
      const i = pages.findIndex((p) => p.year === y && p.month === m);
      if (i >= 0) setIndex(i);
      if (viewModeRef.current !== 'list') setDayOpen(true);
    },
    [pages]
  );

  // Cath, 2026-11-06: a greyed day moves to its month with that day picked (no day list).
  const scrollRef = useRef<(i: number) => void>(() => {});
  const onGreyPress = useCallback(
    (y: number, m: number, d: number) => {
      const i = pages.findIndex((p) => p.year === y && p.month === m);
      if (i < 0) return;
      hapticSelection();
      setSelected({ year: y, month: m, day: d });
      setIndex(i);
      scrollRef.current(i);
    },
    [pages]
  );

  // List view: the month on top changes one at a time (up/down or sideways).
  const LIST_ROW = 46;
  const listPageH = 6 * LIST_ROW;

  function scrollToPage(i: number, animated = !reduceMotionNow()) {
    requestAnimationFrame(() => {
      if (listLayout) {
        if (navMode === 'scroll') hRef.current?.scrollToOffset({ offset: i * listPageH, animated });
        else hRef.current?.scrollToOffset({ offset: i * width, animated });
      } else if (navMode === 'scroll') vRef.current?.scrollToOffset({ offset: offsets[i], animated });
      else hRef.current?.scrollToOffset({ offset: i * width, animated });
    });
  }

  scrollRef.current = scrollToPage;

  // ---------- year view ----------
  const miniW = Math.floor((width - 40 - 20) / 3);
  const yearH = YEAR_HEAD + 4 * miniHeight(miniW);
  const years = useMemo(() => {
    const ys: number[] = [];
    for (let y = pages[0].year; y <= pages[pages.length - 1].year; y++) ys.push(y);
    return ys;
  }, [pages]);
  const yearListRef = useRef<FlatList<number>>(null);
  // Today in the year view: the first tap shows this year; a second tap opens this month.
  const [todayArmed, setTodayArmed] = useState(false);
  const openMonthFromYear = useCallback(
    (y: number, m: number) => {
      hapticSelection();
      const i = pages.findIndex((p) => p.year === y && p.month === m);
      if (i < 0) return;
      setDayOpen(false);
      setIndex(i);
      setLevel('month');
    },
    [pages]
  );

  function goToday() {
    hapticSelection();
    if (level === 'year') {
      const yi = years.indexOf(today.getFullYear());
      if (todayArmed) {
        setTodayArmed(false);
        setSelected({ year: today.getFullYear(), month: today.getMonth(), day: today.getDate() });
        openMonthFromYear(today.getFullYear(), today.getMonth());
        return;
      }
      if (yi >= 0) yearListRef.current?.scrollToOffset({ offset: yi * yearH, animated: true });
      setTodayArmed(true);
      return;
    }
    setSelected({ year: today.getFullYear(), month: today.getMonth(), day: today.getDate() });
    setIndex(todayIndex);
    scrollToPage(todayIndex);
  }

  function chooseView(m: CalendarViewMode) {
    setViewModeState(m);
    setCalendarViewMode(m).catch(() => {});
    setDayOpen(false);
    setMenuOpen(false);
  }
  function chooseNav(m: CalendarNavMode) {
    setNavModeState(m);
    setCalendarNavMode(m).catch(() => {});
    setMenuOpen(false);
  }
  function toggleBalance() {
    const next = !showBalance;
    setShowBalanceState(next);
    setCalendarShowBalance(next).catch(() => {});
  }

  // + adds on the day you're looking at.
  // Version 2.2 (Cath: don't jump to the other screen before I've added it): the form
  // opens right here over the calendar, starting on the picked day. Only after Add does
  // the app go to Transactions or To-Pay, where the new one slides in and glows.
  const dayBefore = useRef<string[]>([]);
  const [arrived, setArrived] = useState<string | null>(null); // the day something was just added on
  const arrivedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [formHosts, setFormHosts] = useState<{ kind: FormKind; date: string; nonce: number }[]>([]);
  // Cath, 2026-11-06 (mockup C): the + sheet's second step.
  const [planOpen, setPlanOpen] = useState(false);
  // (Kept while it's off adding a salary, so it can come back with it - sweep fix.)
  const endFormHost = (nonce: number) =>
    setTimeout(() => {
      if (salaryHandoffPending() || accountHandoffPending()) return;
      setFormHosts((l) => l.filter((h) => h.nonce !== nonce));
    }, 500);
  const lastAdd = useRef(0);
  function add(k: FormKind) {
    // Sweep, 2026-11-06: a second quick tap on the row never opens a second form.
    if (Date.now() - lastAdd.current < ADD_TAP_GAP) return;
    lastAdd.current = Date.now();
    const date = isoOf(page.year, page.month, selDay);
    const m = getModel();
    dayBefore.current = m ? (monthEventsFor(m, page.year, page.month)[selDay] || []).map((e) => e.label) : [];
    // The form takes this sheet's place (no close and reopen).
    startSheetHandoff(() => {
      setAddOpen(false);
      setPlanOpen(false);
    });
    setFormHosts((l) => [...l, { kind: k, date, nonce: Date.now() }]);
  }
  // Cath, 2026-11-06 (mockup C, "a little bit of both"; replaces 2026-10-23 "straight to the
  // right screen"): you stay on the Calendar. Compact and Details show the month and the day
  // gives a small pop; List, or a day's list that is open, glows the new row.
  function afterFormAdded(date: string) {
    const [y, m, d] = date.split('-').map(Number);
    setSelected({ year: y, month: m - 1, day: d });
    // The date may have been changed in the form: only mark a day that really got something new.
    const latest = getModel();
    if (!latest || newEventIndex(dayBefore.current, (monthEventsFor(latest, y, m - 1)[d] || []).map((e) => e.label)) < 0) return;
    setArrived(date);
    if (arrivedTimer.current) clearTimeout(arrivedTimer.current);
    arrivedTimer.current = setTimeout(() => setArrived(null), ARRIVED_MS);
  }

  function openPlanStep() {
    startSheetHandoff(() => setAddOpen(false));
    setPlanOpen(true);
  }
  function backToAdd() {
    startSheetHandoff(() => setPlanOpen(false));
    setAddOpen(true);
  }
  function addRow(key: string, title: string, sub: string, icon: AddIcon, onPress: () => void, first: boolean) {
    return (
      <React.Fragment key={key}>
        {!first && <View style={s.addSep} />}
        <TouchableOpacity onPress={onPress} style={s.addRow} accessibilityRole="button" testID={`calendar-add-${key}`}>
          <View style={[s.addIcon, { backgroundColor: colors.accentTint }]}>
            <Ionicons name={icon} size={20} color={colors.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.addTitle}>{title}</Text>
            <Text style={s.addSub}>{sub}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
        </TouchableOpacity>
      </React.Fragment>
    );
  }
  function addChoices(list: AddChoice[], withPlan: boolean) {
    return (
      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <Text style={s.addSheetSub}>Everything you add starts on this day.</Text>
        {/* Cath: no white box around the choices, just a soft line between them. */}
        <View style={s.addGroup}>
          {list.map(([key, form, title, sub, icon], i) => addRow(key, title, sub, icon, () => add(form), i === 0))}
          {withPlan && addRow('plan', 'From your Plan', 'Events, trips, savings and more', 'list-outline', openPlanStep, false)}
        </View>
      </View>
    );
  }

  const selectedForList = listLayout ? { y: page.year, m: page.month, d: selDay } : null;
  const pickY = selected?.year;
  const pickM = selected?.month;
  const pickD = selected?.day;
  const popFor = useCallback((p: Page) => (arrived && arrived.slice(0, 7) === isoOf(p.year, p.month, 1).slice(0, 7) ? Number(arrived.slice(8, 10)) : null), [arrived]);
  const renderHorizontal = useCallback(
    ({ item }: { item: Page }) => (
      <View style={{ width }}>
        <MonthGrid
          year={item.year}
          month={item.month}
          mode={gridMode}
          rowHeight={gridMode === 'details' ? 96 : 70}
          selectedDay={item.year === pickY && item.month === pickM ? (pickD as number) : null}
          onDayPress={onDayPress}
          onGreyPress={onGreyPress}
          poppingDay={popFor(item)}
        />
      </View>
    ),
    [width, gridMode, onDayPress, onGreyPress, pickY, pickM, pickD, popFor]
  );
  const renderVertical = useCallback(
    ({ item }: { item: Page }) => (
      <View>
        <Text style={s.inlineMonth}>{item.month === 0 ? `${MONTHS[item.month]} ${item.year}` : MONTHS[item.month]}</Text>
        <MonthGrid year={item.year} month={item.month} mode={gridMode} rowHeight={ROW_SCROLL} selectedDay={item.year === pickY && item.month === pickM ? (pickD as number) : null} onDayPress={onDayPress} onGreyPress={onGreyPress} poppingDay={popFor(item)} />
      </View>
    ),
    [gridMode, ROW_SCROLL, onDayPress, onGreyPress, pickY, pickM, pickD, popFor, s]
  );
  const selY = selectedForList?.y;
  const selM = selectedForList?.m;
  const selD = selectedForList?.d;
  const renderListPage = useCallback(
    ({ item }: { item: Page }) => (
      <View style={navMode === 'scroll' ? { height: listPageH } : { width }}>
        <MonthGrid
          year={item.year}
          month={item.month}
          mode="compact"
          rowHeight={LIST_ROW}
          selectedDay={item.year === selY && item.month === selM ? (selD as number) : null}
          onDayPress={onDayPress}
          onGreyPress={onGreyPress}
        />
      </View>
    ),
    [navMode, listPageH, width, selY, selM, selD, onDayPress, onGreyPress]
  );
  const renderYear = useCallback(
    ({ item }: { item: number }) => <YearBlock year={item} pages={pages} miniW={miniW} onOpen={openMonthFromYear} />,
    [pages, miniW, openMonthFromYear]
  );

  if (!model) {
    return (
      <View style={[s.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const balanceDay = showBalance ? balances[selDay] : undefined;
  const bottomRight =
    typeof balanceDay === 'number' ? `${MONTHS[page.month].slice(0, 3)} ${selDay} · ${formatPeso(balanceDay)}` : '';

  const header = (
    <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
      {level === 'year' ? (
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} accessibilityRole="button">
          <Text style={s.link}>Done</Text>
        </TouchableOpacity>
      ) : dayOpen && viewMode !== 'list' ? (
        <TouchableOpacity onPress={() => setDayOpen(false)} hitSlop={10} accessibilityRole="button" style={s.backRow}>
          <Ionicons name="chevron-back" size={22} color={colors.gold} />
          <Text style={s.link}>{MONTHS[page.month]}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={() => {
            setTodayArmed(false);
            setLevel('year');
          }}
          hitSlop={10}
          accessibilityRole="button"
          style={s.backRow}
        >
          <Ionicons name="chevron-back" size={22} color={colors.gold} />
          <Text style={s.link}>{page.year}</Text>
        </TouchableOpacity>
      )}
      <View style={s.topIcons}>
        {level === 'month' && (
          <TouchableOpacity onPress={() => setMenuOpen(true)} hitSlop={8} accessibilityLabel="Calendar view">
            <Ionicons name={viewMode === 'details' ? 'reader-outline' : viewMode === 'list' ? 'list-outline' : 'grid-outline'} size={23} color={colors.gold} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => setAddOpen(true)} hitSlop={8} accessibilityLabel="Add on this day">
          <Ionicons name="add" size={28} color={colors.gold} />
        </TouchableOpacity>
        {level === 'month' && (
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} accessibilityRole="button">
            <Text style={s.link}>Done</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const dow = (
    <View style={s.dowRow}>
      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
        <Text key={i} style={s.dowText}>{d}</Text>
      ))}
    </View>
  );

  let body: React.ReactNode;
  if (level === 'year') {
    const yi = Math.max(0, years.indexOf(page.year));
    body = (
      <FlatList
        ref={yearListRef}
        data={years}
        keyExtractor={(y) => String(y)}
        renderItem={renderYear}
        initialScrollIndex={yi}
        getItemLayout={(_, i) => ({ length: yearH, offset: YEAR_NOTE_H + yearH * i, index: i })}
        // Speed (Cath: years still showed blank while scrolling): every year is drawn
        // ahead of time, a couple at a time just after the year view opens, so nothing is
        // left to draw while you scroll.
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        updateCellsBatchingPeriod={16}
        windowSize={41}
        onScrollBeginDrag={() => setTodayArmed(false)}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListHeaderComponent={
          <View style={{ height: YEAR_NOTE_H, justifyContent: 'center' }}>
            <Text style={s.yearRangeNote} numberOfLines={1}>The calendar starts in January {years[0]}.</Text>
          </View>
        }
        ListFooterComponent={
          <Text style={s.yearRangeNote}>
            It covers {YEARS_EACH_SIDE} years back and {YEARS_EACH_SIDE} years ahead ({years[0]} to {years[years.length - 1]}). Each new year it moves forward a year.
          </Text>
        }
        showsVerticalScrollIndicator={false}
      />
    );
  } else if (listLayout) {
    const evs = monthEventsFor(model, page.year, page.month)[selDay] || [];
    const glowAt = arrived === isoOf(page.year, page.month, selDay) ? newEventIndex(dayBefore.current, evs.map((e) => e.label)) : -1;
    const isToday = page.year === today.getFullYear() && page.month === today.getMonth() && selDay === today.getDate();
    const label = `${isToday ? 'Today · ' : ''}${DOW_LONG[new Date(page.year, page.month, selDay).getDay()]}, ${MONTHS[page.month].slice(0, 3)} ${selDay}`;
    const vertical = navMode === 'scroll';
    body = (
      <View style={{ flex: 1 }}>
        <Text style={s.monthTitle}>{MONTHS[page.month]}</Text>
        {dow}
        <View style={{ height: listPageH }}>
          <FlatList
            key={vertical ? 'list-v' : 'list-h'}
            ref={hRef}
            horizontal={!vertical}
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            data={pages}
            keyExtractor={(p) => `${p.year}-${p.month}`}
            initialScrollIndex={index}
            getItemLayout={(_, i) => {
              const len = vertical ? listPageH : width;
              return { length: len, offset: len * i, index: i };
            }}
            initialNumToRender={1}
            maxToRenderPerBatch={2}
            windowSize={3}
            onMomentumScrollEnd={(e) => {
              const off = vertical ? e.nativeEvent.contentOffset.y : e.nativeEvent.contentOffset.x;
              const i = Math.round(off / (vertical ? listPageH : width));
              if (i !== indexRef.current) setIndex(i);
            }}
            renderItem={renderListPage}
          />
        </View>
        <View style={s.dayHead}>
          <Text style={s.dayTitle} numberOfLines={1}>{label}</Text>
          {showBalance && typeof balances[selDay] === 'number' && <Text style={s.dayBal}>Balance {formatPeso(balances[selDay])}</Text>}
        </View>
        <KeyboardAwareScrollView pageBounce contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}>
          <View style={s.group}>
            <GradientFill match={s.group} />
            {evs.length === 0 ? (
              <Text style={s.empty}>Nothing on this day.</Text>
            ) : (
              evs.map((ev, i) => {
                const amt = eventAmount(ev, colors);
                const target = ev.open;
                const open = target
                  ? () => navigation.navigate(target.page, { ...target.params, backTitle: 'Calendar' })
                  : ev.tripId
                  ? () => navigation.navigate('Travel', { tripId: ev.tripId, backTitle: 'Calendar' })
                  : ev.id && (ev.type === 'bill' || ev.type === 'debt' || ev.type === 'loan')
                    ? () => navigation.navigate('PayDetail', { kind: ev.type, id: ev.id, backTitle: 'Calendar' })
                    : undefined;
                return (
                  <TouchableOpacity key={i} disabled={!open} onPress={open} activeOpacity={0.6} style={[s.row, i > 0 && s.rowTop]}>
                    {i === glowAt && <View testID="calendar-row-glow" style={StyleSheet.absoluteFill} pointerEvents="none"><ArrivalGlow /></View>}
                    <View style={[s.rowDot, { backgroundColor: eventColor(ev, colors) }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.rowTitle} numberOfLines={1}>{ev.label}</Text>
                      <Text style={s.rowSub} numberOfLines={1}>{eventKind(ev)}</Text>
                    </View>
                    <Text style={[s.rowAmt, { color: amt.color }]}>{amt.text}</Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </KeyboardAwareScrollView>
      </View>
    );
  } else if (navMode === 'swipe') {
    body = (
      <View style={{ flex: 1 }}>
        <Text style={s.monthTitle}>{MONTHS[page.month]}</Text>
        {dow}
        <FlatList
          key={`h-${gridMode}`}
          ref={hRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          data={pages}
          keyExtractor={(p) => `${p.year}-${p.month}`}
          initialScrollIndex={index}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          windowSize={3}
          onMomentumScrollEnd={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.x / width);
            if (i !== indexRef.current) setIndex(i);
          }}
          renderItem={renderHorizontal}
        />
      </View>
    );
  } else {
    body = (
      <View style={{ flex: 1 }}>
        <Text style={s.monthTitle}>{MONTHS[page.month]}</Text>
        {dow}
        <FlatList
          key={`v-${gridMode}`}
          ref={vRef}
          data={pages}
          keyExtractor={(p) => `${p.year}-${p.month}`}
          initialScrollIndex={index}
          getItemLayout={(_, i) => ({ length: offsets[i + 1] - offsets[i], offset: offsets[i], index: i })}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          windowSize={5}
          removeClippedSubviews
          onViewableItemsChanged={onViewable}
          viewabilityConfig={viewCfg}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={renderVertical}
        />
      </View>
    );
  }

  return (
    <View style={s.container}>
      {header}
      {body}
      <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity onPress={goToday} hitSlop={10} accessibilityRole="button">
          <Text style={s.link}>Today</Text>
        </TouchableOpacity>
        {!!bottomRight && level === 'month' && <Text style={s.bottomBal} numberOfLines={1}>{bottomRight}</Text>}
      </View>

      {/* C5: the view menu. */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={s.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <View style={[s.menu, { top: insets.top + 50 }]}>
            {(
              [
                ['compact', 'Compact', 'Dots under each day'],
                ['details', 'Details', 'Names inside each day'],
                ['list', 'List', "Month on top, the day's list below"],
              ] as const
            ).map(([id, title, sub], i) => (
              <TouchableOpacity key={id} onPress={() => chooseView(id)} style={[s.menuRow, i > 0 && s.rowTop]}>
                <View style={s.menuCheck}>{viewMode === id && <Ionicons name="checkmark" size={18} color={colors.gold} />}</View>
                <View style={{ flex: 1 }}>
                  <Text style={s.menuTitle}>{title}</Text>
                  <Text style={s.menuSub}>{sub}</Text>
                </View>
              </TouchableOpacity>
            ))}
            <View style={s.menuGap} />
            {(
              [
                ['scroll', 'Scroll up and down', 'Months follow each other'],
                ['swipe', 'Swipe sideways', 'One month at a time'],
              ] as const
            ).map(([id, title, sub], i) => (
              <TouchableOpacity key={id} onPress={() => chooseNav(id)} style={[s.menuRow, i > 0 && s.rowTop]}>
                <View style={s.menuCheck}>{navMode === id && <Ionicons name="checkmark" size={18} color={colors.gold} />}</View>
                <View style={{ flex: 1 }}>
                  <Text style={s.menuTitle}>{title}</Text>
                  <Text style={s.menuSub}>{sub}</Text>
                </View>
              </TouchableOpacity>
            ))}
            <View style={s.menuGap} />
            <TouchableOpacity onPress={toggleBalance} style={s.menuRow}>
              <View style={s.menuCheck}>{showBalance && <Ionicons name="checkmark" size={18} color={colors.gold} />}</View>
              <View style={{ flex: 1 }}>
                <Text style={s.menuTitle}>Projected balance</Text>
                <Text style={s.menuSub}>Show the balance for the day</Text>
              </View>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {formHosts.map((h) => (
        <View key={h.nonce} pointerEvents="box-none" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
          {h.kind === 'txn' ? (
            <TransactionsScreen formOnly addNonceProp={h.nonce} addDateProp={h.date} onFormClosed={() => endFormHost(h.nonce)} onAdded={() => afterFormAdded(h.date)} />
          ) : h.kind === 'bills' ? (
            <BillsScreen formOnly addCarry={{ amount: '', name: '', date: h.date, nonce: h.nonce }} onFormClosed={() => endFormHost(h.nonce)} onAdded={() => afterFormAdded(h.date)} />
          ) : h.kind === 'debts' ? (
            <DebtsScreen formOnly addCarry={{ amount: '', name: '', date: h.date, nonce: h.nonce }} onFormClosed={() => endFormHost(h.nonce)} onAdded={() => afterFormAdded(h.date)} />
          ) : h.kind === 'loans' ? (
            <LoansScreen formOnly addCarry={{ amount: '', name: '', date: h.date, nonce: h.nonce }} onFormClosed={() => endFormHost(h.nonce)} onAdded={() => afterFormAdded(h.date)} />
          ) : (
            (() => {
              const Form = PLAN_FORMS[h.kind as PlanForm];
              return <Form formOnly addDate={h.date} addNonce={h.nonce} onFormClosed={() => endFormHost(h.nonce)} onAdded={() => afterFormAdded(h.date)} />;
            })()
          )}
        </View>
      ))}

      {/* + : add on the day you're looking at. Version 2.2 (Cath picked A): the same
          bottom sheet as the app's forms, a white list with the pale green icon tiles and
          one line under each saying what it is. Everything starts on this day. */}
      <BottomSheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        grouped
        header={
          <View style={s.addSheetHead}>
            <TouchableOpacity onPress={() => setAddOpen(false)} accessibilityRole="button" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={s.addSheetCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={s.addSheetTitle} numberOfLines={1}>
              {`Add on ${DOW_LONG[new Date(page.year, page.month, selDay).getDay()].slice(0, 3)}, ${MONTHS[page.month].slice(0, 3)} ${selDay}`}
            </Text>
            <View style={{ width: 56 }} />
          </View>
        }
      >
        {addChoices(ADD_MONEY, true)}
      </BottomSheet>

      {/* Cath, 2026-11-06 (mockup C): everything in Plan, as a second step. */}
      <BottomSheet
        visible={planOpen}
        onClose={() => setPlanOpen(false)}
        grouped
        header={
          <View style={s.addSheetHead}>
            <TouchableOpacity onPress={backToAdd} accessibilityRole="button" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} testID="calendar-add-back">
              <Text style={s.addSheetCancel}>Back</Text>
            </TouchableOpacity>
            <Text style={s.addSheetTitle} numberOfLines={1}>Add from Plan</Text>
            <View style={{ width: 56 }} />
          </View>
        }
      >
        {addChoices(ADD_PLAN, false)}
      </BottomSheet>
    </View>
  );
}

const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function makeStyles(colors: any) {
  return StyleSheet.create({
    addSheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 4 },
    addSheetCancel: { fontSize: 17, color: colors.gold, width: 56 },
    addSheetTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: colors.ink },
    addSheetSub: { fontSize: 14, color: colors.inkDim, textAlign: 'center', marginTop: 2, marginBottom: 14 },
    addGroup: {},
    addRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 4, paddingVertical: 12, minHeight: 64 },
    // The line starts under the text (not under the icon), and is faint.
    addSep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.inkFaint + '40', marginLeft: 58 },
    addIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    addTitle: { fontSize: 17, fontWeight: '600', color: colors.ink },
    addSub: { fontSize: 14, color: colors.inkDim, marginTop: 1 },
    yearRangeNote: { fontSize: 13, lineHeight: 18, color: colors.inkDim, textAlign: 'center', paddingHorizontal: 32, paddingVertical: 14 },
    container: { flex: 1, backgroundColor: colors.navy2 },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 4 },
    backRow: { flexDirection: 'row', alignItems: 'center', marginLeft: -6 },
    link: { fontSize: 18, fontWeight: '600', color: colors.gold },
    topIcons: { flexDirection: 'row', alignItems: 'center', gap: 20 },
    monthTitle: { fontSize: 30, fontWeight: '600', letterSpacing: -0.2, color: colors.ink, paddingHorizontal: 20, marginBottom: 6 },
    inlineMonth: { fontSize: 20, fontWeight: '600', color: colors.ink, paddingHorizontal: 16, height: 46, lineHeight: 46 },
    dowRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.inkFaint },
    dowText: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: colors.inkDim },
    weekRow: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    cell: { flex: 1, alignItems: 'center', paddingTop: 5, minWidth: 0 },
    num: { width: 32, height: 32, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    numText: { fontSize: 18, fontWeight: '600' },
    dots: { flexDirection: 'row', gap: 3, marginTop: 3, height: 6 },
    dot: { width: 6, height: 6, borderRadius: 3 },
    pills: { alignSelf: 'stretch', paddingHorizontal: 1, marginTop: 2 },
    pill: { borderRadius: 4, paddingHorizontal: 3, paddingVertical: 1, marginTop: 2 },
    pillText: { fontSize: 11, fontWeight: '700', letterSpacing: -0.2 },
    pillMore: { fontSize: 11, color: colors.inkDim, textAlign: 'center' },
    yearTitle: { fontSize: 34, fontWeight: '600', letterSpacing: -0.2, color: colors.ink, marginTop: 10, height: 48 },
    yearLine: { height: StyleSheet.hairlineWidth, backgroundColor: colors.inkFaint, marginTop: 0, marginBottom: 14 },
    yearGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    dayHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10 },
    dayTitle: { fontSize: 17, fontWeight: '600', color: colors.ink + 'D9', flexShrink: 1 },
    dayBal: { fontSize: 14, color: colors.inkDim, marginLeft: 8 },
    group: { backgroundColor: colors.navy3, borderRadius: 18, overflow: 'hidden' },
    empty: { fontSize: 15, color: colors.inkDim, padding: 16 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
    rowTop: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    rowDot: { width: 10, height: 10, borderRadius: 5 },
    rowTitle: { fontSize: 16, fontWeight: '600', color: colors.ink },
    rowSub: { fontSize: 13, color: colors.inkDim },
    rowAmt: { fontSize: 15, fontWeight: '700' },
    bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 14, backgroundColor: colors.navy3, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    bottomBal: { fontSize: 16, fontWeight: '700', color: colors.gold, marginLeft: 12, flexShrink: 1 },
    menuBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.18)' },
    menu: { position: 'absolute', right: 16, width: 280, backgroundColor: colors.navy3, borderRadius: 16, overflow: 'hidden', elevation: 12, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
    menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11 },
    menuCheck: { width: 22, alignItems: 'center' },
    menuTitle: { fontSize: 16, color: colors.ink },
    menuSub: { fontSize: 12, color: colors.inkDim, marginTop: 1 },
    menuGap: { height: 8, backgroundColor: colors.navy2 },
    addHead: { fontSize: 13, fontWeight: '700', color: colors.inkDim, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 },
  });
}
