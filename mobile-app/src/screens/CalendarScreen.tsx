import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { View, StyleSheet, Modal, Pressable, ActivityIndicator, ScrollView, FlatList, useWindowDimensions } from 'react-native';
import { TouchableOpacity } from '../components/Tap';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../components/AppText';
import { useTheme } from '../ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../DataContext';
import { computeRunningBalances, formatPeso, computeMonthEvents, CalendarEvent } from '../balanceProjection';
import {
  CalendarViewMode,
  CalendarNavMode,
  DEFAULT_VIEW_MODE,
  DEFAULT_NAV_MODE,
  getCalendarViewMode,
  setCalendarViewMode,
  getCalendarNavMode,
  setCalendarNavMode,
  getCalendarShowBalance,
  setCalendarShowBalance,
} from '../calendarSettings';
import { useNavigation } from '@react-navigation/native';
import GradientFill from '../components/GradientFill';
import { hapticSelection } from '../haptics';
import { requestToPayTab } from '../openToPayTabRequest';
import { requestToPayAdd } from '../fabActions';
import { afterSlide } from '../afterSlide';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// One colour per kind of item, used for the small dots under each day and the dot next
// to each row in the day panel. Matches the Finance Flow mockup: bills red, income green,
// loans blue, savings in the saving colour; your own entries follow their direction.
function eventColor(ev: CalendarEvent, colors: any): string {
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
    default:
      if (ev.direction === 'in') return colors.positive;
      if (ev.direction === 'saving') return colors.saving;
      return colors.planned;
  }
}

// The small grey second line under each item in the day panel.
function eventKind(ev: CalendarEvent): string {
  switch (ev.type) {
    case 'bill':
      return 'Bill';
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
  const abs = formatPeso(Math.abs(ev.amount));
  const isSaving = ev.type === 'saving' || (ev.type === 'manual' && ev.direction === 'saving');
  if (isSaving) return { text: abs, color: colors.saving };
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

type Page = { year: number; month: number };
// Version 2.2 (Cath: the year view started at Oct 2024 with empty months before it, and
// ended at 2028): the calendar covers whole years, from 2 years before this year to 2
// years after it (2024 to 2028 in 2026), and says so at both ends of the year view.
const YEARS_EACH_SIDE = 2;

function buildPages(): Page[] {
  const now = new Date();
  const pages: Page[] = [];
  for (let y = now.getFullYear() - YEARS_EACH_SIDE; y <= now.getFullYear() + YEARS_EACH_SIDE; y++) {
    for (let m = 0; m < 12; m++) pages.push({ year: y, month: m });
  }
  return pages;
}
const TODAY_INDEX = YEARS_EACH_SIDE * 12 + new Date().getMonth();

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
};

// One month as week rows with a line above each, iPhone style: days outside the month are
// left blank, weekends are grey, today is a soft pale-green circle and the chosen day a
// soft pale-grey one (2.2: lighter shades, Cath 2026-10-21).
// See-through levels added to a colour code for the soft day circles (hex alpha).
const TODAY_TINT = '2E'; // about 18%
const SELECTED_TINT = '1A'; // about 10%

const MonthGrid = React.memo(function MonthGrid({ year, month, mode, rowHeight, selectedDay, onDayPress }: GridProps) {
  const { colors } = useTheme();
  const { model } = useData();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const events = model ? monthEventsFor(model, year, month) : ({} as Record<number, CalendarEvent[]>);
  const now = new Date();
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const weeks = weeksIn(year, month);
  const rows: (number | null)[][] = [];
  for (let w = 0; w < weeks; w++) {
    const row: (number | null)[] = [];
    for (let c = 0; c < 7; c++) {
      const d = w * 7 + c - first + 1;
      row.push(d >= 1 && d <= days ? d : null);
    }
    rows.push(row);
  }
  return (
    <View>
      {rows.map((row, ri) => (
        <View key={ri} style={[s.weekRow, { height: rowHeight }]}>
          {row.map((d, ci) => {
            if (d === null) return <View key={ci} style={s.cell} />;
            const isToday = year === now.getFullYear() && month === now.getMonth() && d === now.getDate();
            const isSel = selectedDay === d;
            const evs = events[d] || [];
            const weekend = ci === 0 || ci === 6;
            return (
              <Pressable
                key={ci}
                style={s.cell}
                onPress={() => onDayPress(year, month, d)}
                accessibilityLabel={`${MONTHS[month]} ${d}${evs.length ? `, ${evs.length} item${evs.length === 1 ? '' : 's'}` : ''}`}
              >
                <View style={[s.num, isToday && { backgroundColor: colors.gold + TODAY_TINT }, isSel && !isToday && { backgroundColor: colors.ink + SELECTED_TINT }]}>
                  <Text style={[s.numText, { color: isToday ? colors.gold : isSel ? colors.ink : weekend ? colors.inkDim : colors.ink }, (isToday || isSel) && { fontWeight: '800' }]}>{d}</Text>
                </View>
                {mode === 'details' ? (
                  <View style={s.pills}>
                    {evs.slice(0, 2).map((ev, i) => (
                      <View key={i} style={[s.pill, { backgroundColor: eventColor(ev, colors) + '26' }]}>
                        <Text style={[s.pillText, { color: eventColor(ev, colors) }]} numberOfLines={1}>{ev.label}</Text>
                      </View>
                    ))}
                    {evs.length > 2 && <Text style={s.pillMore}>+{evs.length - 2}</Text>}
                  </View>
                ) : (
                  <View style={s.dots}>
                    {evs.slice(0, 3).map((ev, i) => (
                      <View key={i} style={[s.dot, { backgroundColor: eventColor(ev, colors) }]} />
                    ))}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
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
        {Array.from({ length: 7 }).map((_, c) => (
          <Text key={c} style={{ width: cell, fontSize: 11, lineHeight: cell, letterSpacing: -0.4, textAlign: 'center', fontWeight: '500', color: colors.ink }}>
            {Array.from({ length: 6 }).map((__, w) => {
              const d = w * 7 + c - first + 1;
              const show = d >= 1 && d <= days;
              const isToday = show && todayAt && todayAt.d === d;
              return (
                <Text key={w} style={isToday ? { color: colors.gold, fontWeight: '700' } : undefined}>
                  {(show ? String(d) : ' ') + (w < 5 ? '\n' : '')}
                </Text>
              );
            })}
          </Text>
        ))}
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
  const { model } = useData();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const today = new Date();
  const pages = useMemo(buildPages, []);
  const todayIndex = TODAY_INDEX;

  const [level, setLevel] = useState<'year' | 'month'>('month');
  const [viewMode, setViewModeState] = useState<CalendarViewMode>(DEFAULT_VIEW_MODE);
  const [navMode, setNavModeState] = useState<CalendarNavMode>(DEFAULT_NAV_MODE);
  const [showBalance, setShowBalanceState] = useState(true);
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

  // List view: the month on top changes one at a time (up/down or sideways).
  const LIST_ROW = 46;
  const listPageH = 6 * LIST_ROW;

  function scrollToPage(i: number, animated = true) {
    requestAnimationFrame(() => {
      if (listLayout) {
        if (navMode === 'scroll') hRef.current?.scrollToOffset({ offset: i * listPageH, animated });
        else hRef.current?.scrollToOffset({ offset: i * width, animated });
      } else if (navMode === 'scroll') vRef.current?.scrollToOffset({ offset: offsets[i], animated });
      else hRef.current?.scrollToOffset({ offset: i * width, animated });
    });
  }

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
  function add(kind: 'txn' | 'bill' | 'debt' | 'loan') {
    setAddOpen(false);
    const date = isoOf(page.year, page.month, selDay);
    navigation.goBack();
    if (kind === 'txn') {
      navigation.navigate('Main', { screen: 'Transactions', params: { addNonce: Date.now(), addDate: date } });
      return;
    }
    const tab = kind === 'bill' ? 'bills' : kind === 'debt' ? 'debts' : 'loans';
    requestToPayTab(tab);
    navigation.navigate('Main', { screen: 'To-Pay' });
    afterSlide(() => requestToPayAdd());
  }

  const selectedForList = listLayout ? { y: page.year, m: page.month, d: selDay } : null;
  const renderHorizontal = useCallback(
    ({ item }: { item: Page }) => (
      <View style={{ width }}>
        <MonthGrid
          year={item.year}
          month={item.month}
          mode={gridMode}
          rowHeight={gridMode === 'details' ? 96 : 70}
          selectedDay={null}
          onDayPress={onDayPress}
        />
      </View>
    ),
    [width, gridMode, onDayPress]
  );
  const renderVertical = useCallback(
    ({ item }: { item: Page }) => (
      <View>
        <Text style={s.inlineMonth}>{item.month === 0 ? `${MONTHS[item.month]} ${item.year}` : MONTHS[item.month]}</Text>
        <MonthGrid year={item.year} month={item.month} mode={gridMode} rowHeight={ROW_SCROLL} selectedDay={null} onDayPress={onDayPress} />
      </View>
    ),
    [gridMode, ROW_SCROLL, onDayPress, s]
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
        />
      </View>
    ),
    [navMode, listPageH, width, selY, selM, selD, onDayPress]
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
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={7}
        onScrollBeginDrag={() => setTodayArmed(false)}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListHeaderComponent={
          <View style={{ height: YEAR_NOTE_H, justifyContent: 'center' }}>
            <Text style={s.yearRangeNote} numberOfLines={1}>The calendar starts in January {years[0]}.</Text>
          </View>
        }
        ListFooterComponent={
          <Text style={s.yearRangeNote}>
            It covers 2 years back and 2 years ahead ({years[0]} to {years[years.length - 1]}). Next year it moves forward a year.
          </Text>
        }
        showsVerticalScrollIndicator={false}
      />
    );
  } else if (listLayout) {
    const evs = monthEventsFor(model, page.year, page.month)[selDay] || [];
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
                const open =
                  ev.id && (ev.type === 'bill' || ev.type === 'debt' || ev.type === 'loan')
                    ? () => navigation.navigate('PayDetail', { kind: ev.type, id: ev.id, backTitle: 'Calendar' })
                    : undefined;
                return (
                  <TouchableOpacity key={i} disabled={!open} onPress={open} activeOpacity={0.6} style={[s.row, i > 0 && s.rowTop]}>
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

      {/* + : add on the day you're looking at. */}
      <Modal visible={addOpen} transparent animationType="fade" onRequestClose={() => setAddOpen(false)}>
        <Pressable style={s.menuBackdrop} onPress={() => setAddOpen(false)}>
          <View style={[s.menu, { top: insets.top + 50 }]}>
            <Text style={s.addHead}>{`Add on ${MONTHS[page.month].slice(0, 3)} ${selDay}`}</Text>
            {(
              [
                ['txn', 'Transaction', 'swap-vertical-outline'],
                ['bill', 'Bill', 'receipt-outline'],
                ['debt', 'Debt', 'card-outline'],
                ['loan', 'Loan', 'business-outline'],
              ] as const
            ).map(([id, title, icon]) => (
              <TouchableOpacity key={id} onPress={() => add(id)} style={[s.menuRow, s.rowTop]}>
                <Ionicons name={icon} size={18} color={colors.gold} style={{ width: 26 }} />
                <Text style={[s.menuTitle, { flex: 1 }]}>{title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function makeStyles(colors: any) {
  return StyleSheet.create({
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
    num: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
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
