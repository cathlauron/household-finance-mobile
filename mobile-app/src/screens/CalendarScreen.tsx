import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, SafeAreaView, Modal, Pressable, ActivityIndicator, ScrollView, FlatList, useWindowDimensions } from 'react-native';
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
} from '../calendarSettings';
import { useNavigation } from '@react-navigation/native';
import GradientFill from '../components/GradientFill';
import { hapticSelection } from '../haptics';

const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOW_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
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

const VIEW_MODE_ICONS: Record<'compact' | 'stacked' | 'details', keyof typeof Ionicons.glyphMap> = {
  compact: 'grid-outline',
  stacked: 'layers-outline',
  details: 'reader-outline',
};

const NAV_MODE_ICONS: Record<CalendarNavMode, keyof typeof Ionicons.glyphMap> = {
  swipe: 'swap-horizontal-outline',
  scroll: 'swap-vertical-outline',
};

// Swipe mode lets you page 24 months back and 24 months forward from today.
const PAGES_EACH_SIDE = 24;

function buildMonthPages() {
  const now = new Date();
  const pages: { year: number; month: number }[] = [];
  for (let i = -PAGES_EACH_SIDE; i <= PAGES_EACH_SIDE; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    pages.push({ year: d.getFullYear(), month: d.getMonth() });
  }
  return pages;
}

type MonthViewProps = {
  year: number;
  month: number;
  viewMode: CalendarViewMode;
  selectedDay: number | null;
  onDayPress: (day: number, year: number, month: number) => void;
};

// Draws one month's grid of week rows and day cells. Pulled out of
// CalendarScreen so Swipe and Scroll modes can reuse it for many months.
const MonthView = React.memo(function MonthView({
  year,
  month,
  viewMode,
  selectedDay,
  onDayPress,
}: MonthViewProps) {
  const { colors } = useTheme();
  const { model } = useData();
  const today = new Date();
  const styles = makeStyles(colors);

  const monthEvents = useMemo(() => {
    if (!model) return {} as Record<number, CalendarEvent[]>;
    return computeMonthEvents(model, year, month);
  }, [model, year, month]);

  type GridCell = { day: number; month: number; year: number; isCurrentMonth: boolean };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday
  const isCurrentYearMonth = year === today.getFullYear() && month === today.getMonth();

  const prevYear = month === 0 ? year - 1 : year;
  const prevMonth = month === 0 ? 11 : month - 1;
  const nextYear = month === 11 ? year + 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;

  const cells: GridCell[] = [];
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, month: prevMonth, year: prevYear, isCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month, year, isCurrentMonth: true });
  }
  const remainder = cells.length % 7;
  if (remainder > 0) {
    for (let d = 1; d <= 7 - remainder; d++) {
      cells.push({ day: d, month: nextMonth, year: nextYear, isCurrentMonth: false });
    }
  }

  const rows: GridCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  return (
    <View>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.weekRow}>
          {row.map((cell, colIndex) => {
            const isToday = isCurrentYearMonth && cell.isCurrentMonth && cell.day === today.getDate();
            const isSelected = cell.isCurrentMonth && cell.day === selectedDay;
            const evs = cell.isCurrentMonth ? monthEvents[cell.day] : undefined;
            const hasEvs = !!evs && evs.length > 0;
            return (
              <TouchableOpacity
                key={colIndex}
                disabled={!cell.isCurrentMonth}
                onPress={() => onDayPress(cell.day, cell.year, cell.month)}
                activeOpacity={0.6}
                accessibilityLabel={`${MONTHS[cell.month]} ${cell.day}`}
                style={[
                  styles.dayCell,
                  viewMode === 'details' && styles.dayCellDetails,
                  !cell.isCurrentMonth && styles.dayCellOutOfMonth,
                ]}
              >
                <View
                  style={[
                    styles.numCircle,
                    isSelected && styles.numCircleSelected,
                    isSelected && isToday && styles.numCircleTodaySelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.numText,
                      !cell.isCurrentMonth && styles.numTextOutOfMonth,
                      isToday && styles.numTextToday,
                      isSelected && styles.numTextSelected,
                      isSelected && isToday && styles.numTextTodaySelected,
                    ]}
                  >
                    {cell.day}
                  </Text>
                </View>
                {viewMode === 'stacked' ? (
                  <View style={styles.stackWrap}>
                    {hasEvs &&
                      evs!.slice(0, 3).map((ev, i) => (
                        <View key={i} style={[styles.stackBar, { backgroundColor: eventColor(ev, colors) }]} />
                      ))}
                  </View>
                ) : viewMode === 'details' ? (
                  <View style={styles.pillWrap}>
                    {hasEvs &&
                      evs!.slice(0, 2).map((ev, i) => (
                        <View key={i} style={[styles.pill, { backgroundColor: eventColor(ev, colors) + '26' }]}>
                          <Text style={styles.pillText} numberOfLines={1}>
                            {ev.label}
                          </Text>
                        </View>
                      ))}
                    {hasEvs && evs!.length > 2 && (
                      <Text style={styles.pillMore} numberOfLines={1}>
                        +{evs!.length - 2}
                      </Text>
                    )}
                  </View>
                ) : (
                  <View style={styles.dotRow}>
                    {hasEvs &&
                      evs!.slice(0, 3).map((ev, i) => (
                        <View key={i} style={[styles.dot, { backgroundColor: eventColor(ev, colors) }]} />
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

export default function CalendarScreen() {
  const { colors } = useTheme();
  const { model } = useData();
  const navigation = useNavigation();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  // The day showing in the panel under the grid. Remembers its own month and year;
  // when another month is on screen the panel falls back to today (this month) or the 1st.
  const [selectedDate, setSelectedDate] = useState<{ year: number; month: number; day: number } | null>(null);

  // View style (Compact / Stacked / Details) and how months move (Scroll / Swipe),
  // both remembered between app launches. An old saved 'list' choice shows as Compact,
  // because the day panel is now always visible.
  const [savedViewMode, setSavedViewMode] = useState<CalendarViewMode>(DEFAULT_VIEW_MODE);
  const viewMode: CalendarViewMode = savedViewMode === 'list' ? 'compact' : savedViewMode;
  const [navMode, setNavMode] = useState<CalendarNavMode>(DEFAULT_NAV_MODE);
  const [menuOpen, setMenuOpen] = useState(false);
  // Month & year picker, opened by tapping the month title. pickerYear is the year the
  // picker is showing (it can differ from the year on screen until a month is chosen).
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(today.getFullYear());

  // Swipe mode: one page per month, sized to the screen minus the 10pt side padding.
  const { width: screenWidth } = useWindowDimensions();
  const pageWidth = screenWidth - 20;
  const monthPages = useMemo(() => buildMonthPages(), []);
  const swipeListRef = useRef<FlatList<{ year: number; month: number }>>(null);
  const nowForIndex = new Date();
  const pageIndex =
    (year - nowForIndex.getFullYear()) * 12 + (month - nowForIndex.getMonth()) + PAGES_EACH_SIDE;

  // Whenever the month changes (chevrons, Today, or a swipe), make sure the
  // swiping list is showing that month's page.
  useEffect(() => {
    if (navMode !== 'swipe') return;
    if (pageIndex < 0 || pageIndex >= monthPages.length) return;
    swipeListRef.current?.scrollToIndex({ index: pageIndex, animated: true });
  }, [pageIndex, navMode]);

  // Scroll mode: a tall vertical list of months, reusing the same page list as Swipe.
  const verticalListRef = useRef<FlatList<{ year: number; month: number }>>(null);
  const skipNextScrollSync = useRef(false);
  const viewabilityConfigRef = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const top = viewableItems[0].item;
      skipNextScrollSync.current = true;
      setYear(top.year);
      setMonth(top.month);
    }
  }).current;

  function handleScrollToIndexFailed(info: any) {
    setTimeout(() => {
      verticalListRef.current?.scrollToIndex({ index: info.index, animated: true });
    }, 100);
  }

  // Whenever the month changes from the chevrons or Today, jump the scrolling
  // list to match. Skipped once right after a scroll itself changed the month,
  // so scrolling doesn't fight the gesture that's already in progress.
  useEffect(() => {
    if (navMode !== 'scroll') return;
    if (pageIndex < 0 || pageIndex >= monthPages.length) return;
    if (skipNextScrollSync.current) {
      skipNextScrollSync.current = false;
      return;
    }
    verticalListRef.current?.scrollToIndex({ index: pageIndex, animated: true });
  }, [pageIndex, navMode]);

  useEffect(() => {
    getCalendarViewMode().then(setSavedViewMode);
    getCalendarNavMode().then(setNavMode);
  }, []);

  // Every bill/debt/loan/income/manual-transaction/savings item in the month on
  // screen, keyed by day number, for the day panel.
  const monthEvents = useMemo(() => {
    if (!model) return {} as Record<number, CalendarEvent[]>;
    return computeMonthEvents(model, year, month);
  }, [model, year, month]);

  const projectedBalances = useMemo(() => {
    if (!model) return {} as Record<number, number>;
    return computeRunningBalances(model, year, month);
  }, [model, year, month]);

  const styles = makeStyles(colors);

  // Data hasn't finished loading into memory yet (this is usually near-instant, right
  // after signing in or unlocking) — show a spinner instead of a blank/broken calendar.
  if (!model) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  function goPrevMonth() {
    if (pageIndex <= 0) return;
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  }

  function goNextMonth() {
    if (pageIndex >= monthPages.length - 1) return;
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  }

  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDate({ year: today.getFullYear(), month: today.getMonth(), day: today.getDate() });
  }

  function handleSwipeEnd(e: any) {
    const index = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    const page = monthPages[index];
    if (page && (page.year !== year || page.month !== month)) {
      setYear(page.year);
      setMonth(page.month);
    }
  }

  function handleDayPress(day: number, dayYear: number, dayMonth: number) {
    hapticSelection();
    setSelectedDate({ year: dayYear, month: dayMonth, day });
  }

  // Month & year picker. Only months inside the calendar's range (24 months either
  // side of today) can be picked, so the grid always has a page to show.
  const firstPage = monthPages[0];
  const lastPage = monthPages[monthPages.length - 1];
  const pageKey = (y: number, m: number) => y * 12 + m;
  const firstKey = pageKey(firstPage.year, firstPage.month);
  const lastKey = pageKey(lastPage.year, lastPage.month);

  function openPicker() {
    setPickerYear(year);
    setPickerOpen(true);
  }

  function pickMonth(m: number) {
    const key = pageKey(pickerYear, m);
    if (key < firstKey || key > lastKey) return;
    hapticSelection();
    setYear(pickerYear);
    setMonth(m);
    setPickerOpen(false);
  }

  function chooseViewMode(mode: CalendarViewMode) {
    setSavedViewMode(mode);
    setCalendarViewMode(mode);
    setMenuOpen(false);
  }

  function chooseNavMode(mode: CalendarNavMode) {
    setNavMode(mode);
    setCalendarNavMode(mode);
    setMenuOpen(false);
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  // The day in the panel: the tapped day if it is in the month on screen, otherwise
  // today (on this month) or the 1st.
  const selDay = Math.min(
    selectedDate && selectedDate.year === year && selectedDate.month === month
      ? selectedDate.day
      : isCurrentMonth
        ? today.getDate()
        : 1,
    daysInMonth
  );
  const selIsToday = isCurrentMonth && selDay === today.getDate();
  const selEvents = monthEvents[selDay] || [];
  const selBalance = projectedBalances[selDay] ?? null;
  const selWeekday = DOW_SHORT[new Date(year, month, selDay).getDay()];
  const selLabel = `${selIsToday ? 'Today · ' : ''}${selWeekday}, ${MONTHS[month].slice(0, 3)} ${selDay}`;

  const atStart = pageIndex <= 0;
  const atEnd = pageIndex >= monthPages.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={openPicker}
          style={styles.monthTitleBtn}
          activeOpacity={0.6}
          accessibilityLabel={`${MONTHS[month]} ${year}. Choose a month`}
        >
          <Text style={styles.monthTitle} numberOfLines={1}>
            {MONTHS[month]} {year}
          </Text>
          <Ionicons
            name={pickerOpen ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.accent}
            style={styles.monthTitleChevron}
          />
        </TouchableOpacity>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={goPrevMonth}
            style={[styles.iconBtn, atStart && { opacity: 0.35 }]}
            accessibilityLabel="Previous month"
          >
            <Ionicons name="chevron-back" size={18} color={colors.ink} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={goNextMonth}
            style={[styles.iconBtn, atEnd && { opacity: 0.35 }]}
            accessibilityLabel="Next month"
          >
            <Ionicons name="chevron-forward" size={18} color={colors.ink} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMenuOpen(true)} style={styles.iconBtn} accessibilityLabel="View options">
            <Ionicons name="filter-outline" size={18} color={colors.ink} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} accessibilityLabel="Close calendar">
            <Ionicons name="close" size={18} color={colors.ink} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.subRow}>
        <Text style={styles.subLabel}>Projected balance</Text>
        <TouchableOpacity onPress={goToday} style={styles.todayChip} accessibilityLabel="Go to today">
          <Text style={styles.todayChipText}>Today</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.gridWrap}>
        <View style={styles.dowRow}>
          {DOW_LETTERS.map((d, i) => (
            <View key={i} style={styles.dowCell}>
              <Text style={styles.dowText}>{d}</Text>
            </View>
          ))}
        </View>
      </View>

      {navMode === 'swipe' ? (
        <FlatList
          key="swipe-list"
          ref={swipeListRef}
          style={styles.swipeList}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          data={monthPages}
          keyExtractor={(item) => `${item.year}-${item.month}`}
          initialScrollIndex={pageIndex}
          initialNumToRender={3}
          windowSize={3}
          getItemLayout={(_, index) => ({ length: pageWidth, offset: pageWidth * index, index })}
          onMomentumScrollEnd={handleSwipeEnd}
          renderItem={({ item }) => (
            <View style={{ width: pageWidth }}>
              <MonthView
                year={item.year}
                month={item.month}
                viewMode={viewMode}
                selectedDay={item.year === year && item.month === month ? selDay : null}
                onDayPress={handleDayPress}
              />
            </View>
          )}
        />
      ) : (
        <FlatList
          key="scroll-list"
          ref={verticalListRef}
          style={styles.scrollList}
          data={monthPages}
          keyExtractor={(item) => `${item.year}-${item.month}`}
          initialScrollIndex={pageIndex}
          onScrollToIndexFailed={handleScrollToIndexFailed}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfigRef}
          initialNumToRender={3}
          windowSize={5}
          maxToRenderPerBatch={3}
          renderItem={({ item }) => (
            <View>
              <Text style={styles.inlineMonthTitle}>
                {MONTHS[item.month]} {item.year}
              </Text>
              <MonthView
                year={item.year}
                month={item.month}
                viewMode={viewMode}
                selectedDay={item.year === year && item.month === month ? selDay : null}
                onDayPress={handleDayPress}
              />
            </View>
          )}
        />
      )}

      <View style={[styles.dayPanel, navMode === 'scroll' && styles.dayPanelScrollMode]}>
        <View style={styles.dayPanelHeader}>
          <Text style={styles.dayPanelTitle} numberOfLines={1}>
            {selLabel}
          </Text>
          {selBalance !== null && <Text style={styles.dayPanelBalance}>Balance {formatPeso(selBalance)}</Text>}
        </View>
        <ScrollView style={styles.dayPanelScroll} contentContainerStyle={styles.dayPanelScrollContent}>
          {selEvents.length > 0 ? (
            <View style={styles.group}>
              <GradientFill match={styles.group} />
              {selEvents.map((ev, i) => {
                const amt = eventAmount(ev, colors);
                return (
                  <View key={i} style={[styles.groupRow, i > 0 && styles.groupRowDivider]}>
                    <View style={[styles.groupDot, { backgroundColor: eventColor(ev, colors) }]} />
                    <View style={styles.groupText}>
                      <Text style={styles.groupTitle} numberOfLines={1}>
                        {ev.label}
                      </Text>
                      <Text style={styles.groupSub} numberOfLines={1}>
                        {eventKind(ev)}
                      </Text>
                    </View>
                    <Text style={[styles.groupAmount, { color: amt.color }]}>{amt.text}</Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={[styles.group, styles.groupEmpty]}>
              <GradientFill match={[styles.group, styles.groupEmpty]} />
              <Text style={styles.groupEmptyText}>Nothing planned for this day.</Text>
            </View>
          )}
        </ScrollView>
      </View>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={styles.pickerOverlay} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.pickerCard} onPress={() => {}}>
            <GradientFill match={styles.pickerCard} />
            <View style={styles.pickerYearRow}>
              <TouchableOpacity
                onPress={() => setPickerYear(pickerYear - 1)}
                disabled={pickerYear <= firstPage.year}
                style={[styles.iconBtn, pickerYear <= firstPage.year && { opacity: 0.35 }]}
                accessibilityLabel="Previous year"
              >
                <Ionicons name="chevron-back" size={18} color={colors.ink} />
              </TouchableOpacity>
              <Text style={styles.pickerYearText}>{pickerYear}</Text>
              <TouchableOpacity
                onPress={() => setPickerYear(pickerYear + 1)}
                disabled={pickerYear >= lastPage.year}
                style={[styles.iconBtn, pickerYear >= lastPage.year && { opacity: 0.35 }]}
                accessibilityLabel="Next year"
              >
                <Ionicons name="chevron-forward" size={18} color={colors.ink} />
              </TouchableOpacity>
            </View>
            <View style={styles.pickerGrid}>
              {MONTHS.map((name, m) => {
                const key = pageKey(pickerYear, m);
                const outOfRange = key < firstKey || key > lastKey;
                const isShown = pickerYear === year && m === month;
                const isThisMonth = pickerYear === today.getFullYear() && m === today.getMonth();
                return (
                  <TouchableOpacity
                    key={name}
                    disabled={outOfRange}
                    onPress={() => pickMonth(m)}
                    style={[
                      styles.pickerMonth,
                      isShown && styles.pickerMonthShown,
                      outOfRange && { opacity: 0.3 },
                    ]}
                    accessibilityLabel={`${name} ${pickerYear}`}
                  >
                    <Text
                      style={[
                        styles.pickerMonthText,
                        isThisMonth && styles.pickerMonthTextThisMonth,
                        isShown && styles.pickerMonthTextShown,
                      ]}
                    >
                      {name.slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              onPress={() => {
                goToday();
                setPickerOpen(false);
              }}
              style={styles.pickerTodayBtn}
              accessibilityLabel="Go to today"
            >
              <Text style={styles.pickerTodayText}>Go to today</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setMenuOpen(false)}>
          <Pressable style={styles.menuCard} onPress={() => {}}>
            <GradientFill match={styles.menuCard} />
            {(['compact', 'stacked', 'details'] as const).map((m) => (
              <TouchableOpacity key={m} style={styles.menuRow} onPress={() => chooseViewMode(m)}>
                <Ionicons name={VIEW_MODE_ICONS[m]} size={18} color={colors.inkDim} style={styles.menuItemIcon} />
                <Text style={styles.menuRowText}>{m.charAt(0).toUpperCase() + m.slice(1)}</Text>
                <View style={styles.menuCheckSlot}>
                  {viewMode === m && <Ionicons name="checkmark" size={18} color={colors.accent} />}
                </View>
              </TouchableOpacity>
            ))}
            <View style={styles.menuDivider} />
            {(['swipe', 'scroll'] as CalendarNavMode[]).map((n) => (
              <TouchableOpacity key={n} style={styles.menuRow} onPress={() => chooseNavMode(n)}>
                <Ionicons name={NAV_MODE_ICONS[n]} size={18} color={colors.inkDim} style={styles.menuItemIcon} />
                <Text style={styles.menuRowText}>{n === 'swipe' ? 'Swipe months' : 'Scroll months'}</Text>
                <View style={styles.menuCheckSlot}>
                  {navMode === n && <Ionicons name="checkmark" size={18} color={colors.accent} />}
                </View>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    // The sheet itself: plain white surface, like the mockup.
    container: {
      flex: 1,
      backgroundColor: colors.navy3,
      paddingTop: 8,
    },
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 4,
    },
    monthTitleBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 8,
      minHeight: 44,
    },
    monthTitle: {
      flexShrink: 1,
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '700',
      color: colors.ink,
    },
    monthTitleChevron: {
      marginLeft: 4,
      marginTop: 2,
    },
    pickerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.3)',
      justifyContent: 'flex-start',
      paddingTop: 70,
      paddingHorizontal: 16,
    },
    pickerCard: {
      backgroundColor: colors.navy3,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.navy4,
      padding: 16,
      overflow: 'hidden',
    },
    pickerYearRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    pickerYearText: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.ink,
    },
    pickerGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: 8,
    },
    pickerMonth: {
      width: '31%',
      minHeight: 44,
      borderRadius: 999,
      backgroundColor: colors.navy1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pickerMonthShown: {
      backgroundColor: colors.accent,
    },
    pickerMonthText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.ink,
    },
    pickerMonthTextThisMonth: {
      color: colors.accent,
      fontWeight: '700',
    },
    pickerMonthTextShown: {
      color: colors.onAccent,
    },
    pickerTodayBtn: {
      alignSelf: 'center',
      marginTop: 14,
      minHeight: 36,
      paddingHorizontal: 14,
      justifyContent: 'center',
    },
    pickerTodayText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.accent,
    },
    headerButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.navy1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    subRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    subLabel: {
      fontSize: 15,
      lineHeight: 20,
      color: colors.inkFaint,
    },
    todayChip: {
      minHeight: 30,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: colors.navy1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    todayChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.ink,
    },
    gridWrap: {
      paddingHorizontal: 10,
    },
    dowRow: {
      flexDirection: 'row',
    },
    dowCell: {
      flex: 1,
      alignItems: 'center',
      paddingBottom: 6,
    },
    dowText: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '600',
      color: colors.inkFaint,
    },
    swipeList: {
      flexGrow: 0,
      marginHorizontal: 10,
    },
    scrollList: {
      flex: 1,
      marginHorizontal: 10,
    },
    inlineMonthTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.ink,
      marginTop: 10,
      marginBottom: 4,
      paddingHorizontal: 6,
    },
    weekRow: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    // No box, border or background: just the number with dots under it.
    dayCell: {
      flex: 1,
      height: 50,
      alignItems: 'center',
      paddingTop: 4,
      gap: 3,
    },
    dayCellDetails: {
      height: undefined,
      minHeight: 84,
      paddingHorizontal: 1,
    },
    dayCellOutOfMonth: {
      opacity: 0.6,
    },
    numCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    numCircleSelected: {
      backgroundColor: colors.ink,
    },
    numCircleTodaySelected: {
      backgroundColor: colors.accent,
    },
    numText: {
      fontSize: 17,
      fontWeight: '500',
      color: colors.ink,
    },
    numTextOutOfMonth: {
      color: colors.inkFaint,
    },
    numTextToday: {
      color: colors.accent,
      fontWeight: '700',
    },
    numTextSelected: {
      color: colors.navy3,
      fontWeight: '600',
    },
    numTextTodaySelected: {
      color: colors.onAccent,
      fontWeight: '700',
    },
    dotRow: {
      flexDirection: 'row',
      gap: 3,
      height: 6,
      alignItems: 'center',
    },
    dot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
    },
    stackWrap: {
      width: '70%',
      gap: 2,
    },
    stackBar: {
      height: 3,
      borderRadius: 1.5,
    },
    pillWrap: {
      width: '100%',
      gap: 2,
    },
    pill: {
      borderRadius: 4,
      paddingHorizontal: 3,
      paddingVertical: 1,
    },
    pillText: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.ink,
    },
    pillMore: {
      fontSize: 11,
      color: colors.inkDim,
      paddingLeft: 2,
    },
    // The always-visible day panel under the grid: grey grouped background with a line on top.
    dayPanel: {
      flex: 1,
      marginTop: 8,
      backgroundColor: colors.navy2,
      borderTopWidth: 1,
      borderTopColor: colors.navy4,
      paddingTop: 16,
      paddingHorizontal: 16,
    },
    dayPanelScrollMode: {
      flex: 0,
      height: 230,
    },
    dayPanelHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
    },
    dayPanelTitle: {
      flexShrink: 1,
      fontSize: 17,
      lineHeight: 22,
      fontWeight: '600',
      color: colors.ink,
      marginRight: 8,
    },
    dayPanelBalance: {
      fontSize: 15,
      lineHeight: 20,
      color: colors.inkFaint,
    },
    dayPanelScroll: {
      flex: 1,
      marginTop: 12,
    },
    dayPanelScrollContent: {
      paddingBottom: 24,
    },
    group: {
      backgroundColor: colors.navy3,
      borderRadius: 12,
      overflow: 'hidden',
    },
    groupRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 11,
      paddingHorizontal: 16,
      gap: 12,
    },
    groupRowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.navy4,
    },
    groupDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    groupText: {
      flex: 1,
    },
    groupTitle: {
      fontSize: 17,
      lineHeight: 22,
      color: colors.ink,
    },
    groupSub: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.inkFaint,
    },
    groupAmount: {
      fontSize: 17,
      fontWeight: '600',
    },
    groupEmpty: {
      paddingVertical: 20,
      paddingHorizontal: 16,
      alignItems: 'center',
    },
    groupEmptyText: {
      fontSize: 15,
      lineHeight: 20,
      color: colors.inkFaint,
    },
    menuOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.3)',
      alignItems: 'flex-end',
      paddingTop: 70,
      paddingRight: 16,
    },
    menuCard: {
      width: 230,
      backgroundColor: colors.navy3,
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.navy4,
    },
    menuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    menuItemIcon: {
      marginRight: 12,
    },
    menuRowText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: colors.ink,
    },
    menuCheckSlot: {
      width: 22,
      alignItems: 'flex-end',
    },
    menuDivider: {
      height: 1,
      backgroundColor: colors.navy4,
      marginHorizontal: 10,
    },
  });
}
