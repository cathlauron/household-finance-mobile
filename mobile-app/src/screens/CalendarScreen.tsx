import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Modal, Pressable, ActivityIndicator, ScrollView, FlatList, useWindowDimensions } from 'react-native';
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
  return { text: '−' + abs, color: colors.negative };
}


// Version 2.2 (canvas C1-C5, approved, plus Cath's additions): the calendar works like the
// iPhone's. It slides up from the bottom as a full page, and only the months move when you
// scroll or swipe (the page itself can't be dragged closed; Done closes it).
// - Year: 12 small months per year; tap one to open it.
// - Month: Scroll up and down (months follow each other) or Swipe sideways (one month per
//   page), chosen in the view menu and remembered.
// - Compact (dots under each day), Details (names inside each day), or List (one month on
//   top, the chosen day's items underneath). Tapping a day shows its list.
// - Projected balance at the bottom (can be turned off in the view menu).

type Page = { year: number; month: number };
const PAGES_EACH_SIDE = 24;

function buildPages(): Page[] {
  const now = new Date();
  const pages: Page[] = [];
  for (let i = -PAGES_EACH_SIDE; i <= PAGES_EACH_SIDE; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    pages.push({ year: d.getFullYear(), month: d.getMonth() });
  }
  return pages;
}

function weeksIn(year: number, month: number): number {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  return Math.ceil((first + days) / 7);
}

function isoOf(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
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
// left blank, weekends are grey, today is a green circle and the chosen day a dark one.
const MonthGrid = React.memo(function MonthGrid({ year, month, mode, rowHeight, selectedDay, onDayPress }: GridProps) {
  const { colors } = useTheme();
  const { model } = useData();
  const s = makeStyles(colors);
  const events = useMemo(() => (model ? computeMonthEvents(model, year, month) : ({} as Record<number, CalendarEvent[]>)), [model, year, month]);
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
              <TouchableOpacity
                key={ci}
                style={s.cell}
                activeOpacity={0.6}
                onPress={() => onDayPress(year, month, d)}
                accessibilityLabel={`${MONTHS[month]} ${d}${evs.length ? `, ${evs.length} item${evs.length === 1 ? '' : 's'}` : ''}`}
              >
                <View style={[s.num, isToday && { backgroundColor: colors.gold }, isSel && !isToday && { backgroundColor: colors.ink }]}>
                  <Text style={[s.numText, { color: isToday || isSel ? colors.navy2 : weekend ? colors.inkDim : colors.ink }, (isToday || isSel) && { fontWeight: '800' }]}>{d}</Text>
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
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
});

// One small month for the year view.
const MiniMonth = React.memo(function MiniMonth({ year, month, onPress, width }: { year: number; month: number; onPress: () => void; width: number }) {
  const { colors } = useTheme();
  const now = new Date();
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const weeks = weeksIn(year, month);
  const cell = Math.floor(width / 7);
  const isThisMonth = year === now.getFullYear() && month === now.getMonth();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.6} style={{ width, marginBottom: 18 }} accessibilityLabel={`${MONTHS[month]} ${year}`}>
      <Text style={{ fontSize: 17, fontWeight: '800', color: isThisMonth ? colors.gold : colors.ink, marginBottom: 4 }}>{MONTHS[month].slice(0, 3)}</Text>
      {Array.from({ length: weeks }).map((_, w) => (
        <View key={w} style={{ flexDirection: 'row' }}>
          {Array.from({ length: 7 }).map((__, c) => {
            const d = w * 7 + c - first + 1;
            const show = d >= 1 && d <= days;
            const today = show && isThisMonth && d === now.getDate();
            return (
              <View key={c} style={{ width: cell, height: cell, alignItems: 'center', justifyContent: 'center', borderRadius: cell / 2, backgroundColor: today ? colors.gold : 'transparent' }}>
                {show && <Text style={{ fontSize: 9.5, fontWeight: today ? '800' : '500', color: today ? colors.navy2 : colors.ink }}>{d}</Text>}
              </View>
            );
          })}
        </View>
      ))}
    </TouchableOpacity>
  );
});

export default function CalendarScreen() {
  const { colors } = useTheme();
  const { model } = useData();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const s = makeStyles(colors);
  const today = new Date();
  const pages = useMemo(buildPages, []);
  const todayIndex = PAGES_EACH_SIDE;

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
  const gridModeRef = useRef(gridMode);
  gridModeRef.current = gridMode;

  const selDay =
    selected && selected.year === page.year && selected.month === page.month
      ? selected.day
      : page.year === today.getFullYear() && page.month === today.getMonth()
      ? today.getDate()
      : 1;
  const monthEvents = useMemo(() => (model ? computeMonthEvents(model, page.year, page.month) : ({} as Record<number, CalendarEvent[]>)), [model, page.year, page.month]);
  const balances = useMemo(() => (model ? computeRunningBalances(model, page.year, page.month) : ({} as Record<number, number>)), [model, page.year, page.month]);

  // ---------- the vertical (scroll) list ----------
  const ROW_SCROLL = 62;
  const LABEL_H = 46;
  const heights = useMemo(() => pages.map((p) => LABEL_H + weeksIn(p.year, p.month) * ROW_SCROLL), [pages]);
  const offsets = useMemo(() => {
    const o: number[] = [];
    let acc = 0;
    for (const h of heights) {
      o.push(acc);
      acc += h;
    }
    return o;
  }, [heights]);
  const offsetFor = (i: number) => offsets[i] + (gridModeRef.current === 'details' ? detailsExtra(pages, i) : 0);
  const vRef = useRef<FlatList<Page>>(null);
  const hRef = useRef<FlatList<Page>>(null);
  const onViewable = useRef(({ viewableItems }: any) => {
    const top = viewableItems.find((v: any) => v.isViewable);
    if (top && typeof top.index === 'number') setIndex(top.index);
  }).current;
  const viewCfg = useRef({ itemVisiblePercentThreshold: 40 }).current;

  function jumpTo(i: number, animated = true) {
    const clamped = Math.max(0, Math.min(pages.length - 1, i));
    setIndex(clamped);
    requestAnimationFrame(() => {
      if (!listLayout && navMode === 'scroll') vRef.current?.scrollToOffset({ offset: offsetFor(clamped), animated });
      else hRef.current?.scrollToOffset({ offset: clamped * width, animated });
    });
  }

  function onDayPress(y: number, m: number, d: number) {
    hapticSelection();
    setSelected({ year: y, month: m, day: d });
    const i = pages.findIndex((p) => p.year === y && p.month === m);
    if (i >= 0) setIndex(i);
    if (viewMode !== 'list') setDayOpen(true);
  }

  function goToday() {
    hapticSelection();
    setSelected({ year: today.getFullYear(), month: today.getMonth(), day: today.getDate() });
    if (level === 'year') setLevel('month');
    jumpTo(todayIndex);
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

  const visibleYears = useMemo(() => {
    const ys: number[] = [];
    for (let y = pages[0].year; y <= pages[pages.length - 1].year; y++) ys.push(y);
    return ys;
  }, [pages]);
  const yearRef = useRef<ScrollView>(null);
  const yearOffsets = useRef<Record<number, number>>({});

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
  const miniW = Math.floor((width - 40 - 20) / 3);

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
        <TouchableOpacity onPress={() => setLevel('year')} hitSlop={10} accessibilityRole="button" style={s.backRow}>
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

  const pager = (rowHeight: number, mode: 'compact' | 'details') => (
    <FlatList
      key={`h-${rowHeight}-${mode}`}
      ref={hRef}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      data={pages}
      keyExtractor={(p) => `${p.year}-${p.month}`}
      initialScrollIndex={index}
      getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
      initialNumToRender={1}
      windowSize={3}
      onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
      renderItem={({ item }) => (
        <View style={{ width }}>
          <MonthGrid
            year={item.year}
            month={item.month}
            mode={mode}
            rowHeight={rowHeight}
            selectedDay={listLayout && item.year === page.year && item.month === page.month ? selDay : null}
            onDayPress={onDayPress}
          />
        </View>
      )}
    />
  );

  let body: React.ReactNode;
  if (level === 'year') {
    body = (
      <ScrollView
        ref={yearRef}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {visibleYears.map((y) => (
          <View
            key={y}
            onLayout={(e) => {
              yearOffsets.current[y] = e.nativeEvent.layout.y;
              if (y === page.year) yearRef.current?.scrollTo({ y: e.nativeEvent.layout.y, animated: false });
            }}
          >
            <Text style={[s.yearTitle, y === today.getFullYear() && { color: colors.gold }]}>{y}</Text>
            <View style={s.yearLine} />
            <View style={s.yearGrid}>
              {Array.from({ length: 12 }).map((_, m) => {
                const i = pages.findIndex((p) => p.year === y && p.month === m);
                if (i < 0) return <View key={m} style={{ width: miniW }} />;
                return (
                  <MiniMonth
                    key={m}
                    year={y}
                    month={m}
                    width={miniW}
                    onPress={() => {
                      hapticSelection();
                      setLevel('month');
                      setDayOpen(false);
                      setIndex(i);
                    }}
                  />
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    );
  } else if (listLayout) {
    const evs = monthEvents[selDay] || [];
    const isToday = page.year === today.getFullYear() && page.month === today.getMonth() && selDay === today.getDate();
    const label = `${isToday ? 'Today · ' : ''}${DOW_LONG[new Date(page.year, page.month, selDay).getDay()]}, ${MONTHS[page.month].slice(0, 3)} ${selDay}`;
    body = (
      <View style={{ flex: 1 }}>
        <Text style={s.monthTitle}>{MONTHS[page.month]}</Text>
        {dow}
        <View>{pager(50, 'compact')}</View>
        <View style={s.dayHead}>
          <Text style={s.dayTitle} numberOfLines={1}>{label}</Text>
          {showBalance && typeof balances[selDay] === 'number' && <Text style={s.dayBal}>Balance {formatPeso(balances[selDay])}</Text>}
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}>
          <View style={s.group}>
            <GradientFill match={s.group} />
            {evs.length === 0 ? (
              <Text style={s.empty}>Nothing on this day.</Text>
            ) : (
              evs.map((ev, i) => {
                const amt = eventAmount(ev, colors);
                const open =
                  ev.id && (ev.type === 'bill' || ev.type === 'debt' || ev.type === 'loan')
                    ? () => {
                        navigation.navigate('PayDetail', { kind: ev.type, id: ev.id, backTitle: 'Calendar' });
                      }
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
        </ScrollView>
      </View>
    );
  } else if (navMode === 'swipe') {
    body = (
      <View style={{ flex: 1 }}>
        <Text style={s.monthTitle}>{MONTHS[page.month]}</Text>
        {dow}
        {pager(gridMode === 'details' ? 96 : 70, gridMode)}
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
          getItemLayout={(_, i) => ({ length: heights[i] + (gridMode === 'details' ? weeksIn(pages[i].year, pages[i].month) * 34 : 0), offset: offsetFor(i), index: i })}
          initialNumToRender={2}
          windowSize={5}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={viewCfg}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item }) => (
            <View>
              <Text style={s.inlineMonth}>{item.month === 0 ? `${MONTHS[item.month]} ${item.year}` : MONTHS[item.month]}</Text>
              <MonthGrid year={item.year} month={item.month} mode={gridMode} rowHeight={gridMode === 'details' ? ROW_SCROLL + 34 : ROW_SCROLL} selectedDay={null} onDayPress={onDayPress} />
            </View>
          )}
        />
      </View>
    );
  }

  return (
    <View style={s.container}>
      {header}
      {body}
      <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <GradientFill match={s.bottomBar} />
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
                <Text style={s.menuCheck}>{viewMode === id ? '✓' : ''}</Text>
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
                <Text style={s.menuCheck}>{navMode === id ? '✓' : ''}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.menuTitle}>{title}</Text>
                  <Text style={s.menuSub}>{sub}</Text>
                </View>
              </TouchableOpacity>
            ))}
            <View style={s.menuGap} />
            <TouchableOpacity onPress={toggleBalance} style={s.menuRow}>
              <Text style={s.menuCheck}>{showBalance ? '✓' : ''}</Text>
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

// Extra height above month i in Details (each week row is 34 taller there).
function detailsExtra(pages: Page[], i: number): number {
  let extra = 0;
  for (let k = 0; k < i; k++) extra += weeksIn(pages[k].year, pages[k].month) * 34;
  return extra;
}

const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.navy2 },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 4 },
    backRow: { flexDirection: 'row', alignItems: 'center', marginLeft: -6 },
    link: { fontSize: 18, fontWeight: '600', color: colors.gold },
    topIcons: { flexDirection: 'row', alignItems: 'center', gap: 20 },
    monthTitle: { fontSize: 34, fontWeight: '800', color: colors.ink, paddingHorizontal: 20, marginBottom: 6 },
    inlineMonth: { fontSize: 20, fontWeight: '800', color: colors.ink, paddingHorizontal: 16, height: 46, lineHeight: 46 },
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
    pillText: { fontSize: 10, fontWeight: '700' },
    pillMore: { fontSize: 10, color: colors.inkDim, textAlign: 'center' },
    yearTitle: { fontSize: 38, fontWeight: '800', color: colors.ink, marginTop: 10 },
    yearLine: { height: StyleSheet.hairlineWidth, backgroundColor: colors.inkFaint, marginTop: 6, marginBottom: 14 },
    yearGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    dayHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10 },
    dayTitle: { fontSize: 18, fontWeight: '800', color: colors.ink, flexShrink: 1 },
    dayBal: { fontSize: 14, color: colors.inkDim, marginLeft: 8 },
    group: { backgroundColor: colors.navy3, borderRadius: 18, overflow: 'hidden' },
    empty: { fontSize: 15, color: colors.inkDim, padding: 16 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
    rowTop: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    rowDot: { width: 10, height: 10, borderRadius: 5 },
    rowTitle: { fontSize: 16, fontWeight: '600', color: colors.ink },
    rowSub: { fontSize: 13, color: colors.inkDim },
    rowAmt: { fontSize: 15, fontWeight: '700' },
    bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 14, backgroundColor: colors.navy3, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4, overflow: 'hidden' },
    bottomBal: { fontSize: 16, fontWeight: '700', color: colors.gold, marginLeft: 12, flexShrink: 1 },
    menuBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.18)' },
    menu: { position: 'absolute', right: 16, width: 280, backgroundColor: colors.navy3, borderRadius: 16, overflow: 'hidden', elevation: 12, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
    menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11 },
    menuCheck: { width: 22, fontSize: 16, fontWeight: '800', color: colors.gold },
    menuTitle: { fontSize: 16, color: colors.ink },
    menuSub: { fontSize: 12, color: colors.inkDim, marginTop: 1 },
    menuGap: { height: 8, backgroundColor: colors.navy2 },
    addHead: { fontSize: 13, fontWeight: '700', color: colors.inkDim, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 },
  });
}
