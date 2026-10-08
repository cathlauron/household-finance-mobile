import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Modal, Pressable, ActivityIndicator, ScrollView, FlatList, useWindowDimensions, Platform } from 'react-native';
import { useTheme } from '../ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../DataContext';
import { computeRunningBalances, totalLiquidBalance, formatPeso, computeMonthEvents, CalendarEvent } from '../balanceProjection';
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
import Card from '../components/Card';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// One color per kind of item, used for the small dots on each day and the
// dot next to each row in the day popup.
function getEventDotColors(colors: any): Record<CalendarEvent['type'], string> {
  return {
    bill: colors.error,
    debt: colors.orange,
    loan: colors.indigo,
    income: colors.ok,
    saving: colors.gold,
    manual: colors.decor,
  };
}

const VIEW_MODE_ICONS: Record<CalendarViewMode, keyof typeof Ionicons.glyphMap> = {
  compact: 'grid-outline',
  stacked: 'layers-outline',
  details: 'reader-outline',
  list: 'list-outline',
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
  effectivePreviewDay: number | null;
  onDayPress: (day: number, year: number, month: number) => void;
};

// Draws one month's grid of week rows and day cells. Pulled out of
// CalendarScreen so Swipe and Scroll modes can reuse it for many months.
const MonthView = React.memo(function MonthView({
  year,
  month,
  viewMode,
  effectivePreviewDay,
  onDayPress,
}: MonthViewProps) {
  const { colors } = useTheme();
  const { model } = useData();
  const today = new Date();
  const styles = makeStyles(colors);
  const EVENT_DOT_COLORS = getEventDotColors(colors);

  const monthEvents = useMemo(() => {
    if (!model) return {} as Record<number, CalendarEvent[]>;
    return computeMonthEvents(model, year, month);
  }, [model, year, month]);

  const projectedBalances = useMemo(() => {
    if (!model) return {} as Record<number, number>;
    return computeRunningBalances(model, year, month);
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
            const isSelected =
              viewMode === 'list' && cell.isCurrentMonth && cell.day === effectivePreviewDay && !isToday;
            const evs = cell.isCurrentMonth ? monthEvents[cell.day] : undefined;
            const hasEvs = !!evs && evs.length > 0;
            return (
              <TouchableOpacity
                key={colIndex}
                disabled={!cell.isCurrentMonth}
                onPress={() => onDayPress(cell.day, cell.year, cell.month)}
                activeOpacity={0.6}
                style={[
                  styles.dayCell,
                  viewMode === 'details' ? styles.dayCellDetails : viewMode === 'list' ? styles.dayCellList : styles.dayCellSquare,
                  !cell.isCurrentMonth && styles.dayCellOutOfMonth,
                  isToday && styles.dayCellToday,
                  isSelected && styles.dayCellSelected,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    !cell.isCurrentMonth && styles.dayTextOutOfMonth,
                    isToday && styles.dayTextToday,
                  ]}
                >
                  {cell.day}
                </Text>
                {hasEvs && viewMode === 'stacked' && (
                  <View style={styles.stackWrap}>
                    {evs!.slice(0, 3).map((ev, i) => (
                      <View
                        key={i}
                        style={[styles.stackBar, { backgroundColor: isToday ? '#FFFFFF' : EVENT_DOT_COLORS[ev.type] }]}
                      />
                    ))}
                  </View>
                )}
                {hasEvs && viewMode === 'details' && (
                  <View style={styles.pillWrap}>
                    {evs!.slice(0, 2).map((ev, i) => (
                      <View
                        key={i}
                        style={[
                          styles.pill,
                          { backgroundColor: isToday ? 'rgba(255,255,255,0.25)' : EVENT_DOT_COLORS[ev.type] + '26' },
                        ]}
                      >
                        <Text style={[styles.pillText, isToday && { color: '#FFFFFF' }]} numberOfLines={1}>
                          {ev.label}
                        </Text>
                      </View>
                    ))}
                    {evs!.length > 2 && (
                      <Text style={[styles.pillMore, isToday && { color: 'rgba(255,255,255,0.8)' }]} numberOfLines={1}>
                        +{evs!.length - 2}
                      </Text>
                    )}
                  </View>
                )}
                {hasEvs && viewMode !== 'stacked' && viewMode !== 'details' && (
                  <View style={styles.dotRow}>
                    {evs!.slice(0, 4).map((ev, i) => (
                      <View
                        key={i}
                        style={[styles.dot, { backgroundColor: isToday ? '#FFFFFF' : EVENT_DOT_COLORS[ev.type] }]}
                      />
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
  // The day the popup is open for. Remembers its own month and year so this
  // keeps working once several months can be on screen at the same time.
  const [selectedDate, setSelectedDate] = useState<{ year: number; month: number; day: number } | null>(null);
  
  // View style (Compact / Stacked / Details / List) and how months move
  // (Scroll / Swipe) — both remembered between app launches.
  const [viewMode, setViewMode] = useState<CalendarViewMode>(DEFAULT_VIEW_MODE);
  const [navMode, setNavMode] = useState<CalendarNavMode>(DEFAULT_NAV_MODE);
  const [menuOpen, setMenuOpen] = useState(false);
  // Which day is showing in the List-mode preview panel under the grid.
  // null = default (today if we're on the current month, otherwise the 1st).
  const [previewDate, setPreviewDate] = useState<{ year: number; month: number; day: number } | null>(null);

    // Swipe mode: one page per month, sized to the screen minus the 12pt side padding.
  const { width: screenWidth } = useWindowDimensions();
  const pageWidth = screenWidth - 24;
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
    getCalendarViewMode().then(setViewMode);
    getCalendarNavMode().then(setNavMode);
  }, []);

  // Every bill/debt/loan/income/manual-transaction/savings item due in the
  // currently-viewed month, keyed by day number — used for both the small
  // dot indicators on each day and the full list in the day popup.
  const monthEvents = useMemo(() => {
    if (!model) return {};
    return computeMonthEvents(model, year, month);
  }, [model, year, month]);
  
  // Events and projected balances for the month of whichever day the popup is open for.
  const selectedMonthEvents = useMemo(() => {
    if (!model || !selectedDate) return {} as Record<number, CalendarEvent[]>;
    return computeMonthEvents(model, selectedDate.year, selectedDate.month);
  }, [model, selectedDate]);

  const selectedMonthBalances = useMemo(() => {
    if (!model || !selectedDate) return {} as Record<number, number>;
    return computeRunningBalances(model, selectedDate.year, selectedDate.month);
  }, [model, selectedDate]);

  const styles = makeStyles(colors);
  const EVENT_DOT_COLORS = getEventDotColors(colors);

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
    const picked = { year: dayYear, month: dayMonth, day };
    if (viewMode === 'list') {
      setPreviewDate(picked);
    } else {
      setSelectedDate(picked);
    }
  }

  function closeDayModal() {
    setSelectedDate(null);
  }
  
  function chooseViewMode(mode: CalendarViewMode) {
    setViewMode(mode);
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

  // The actual balance math — see src/balanceProjection.ts for how this is calculated.
  const totalBalance = totalLiquidBalance(model);
  const projectedBalances = computeRunningBalances(model, year, month);

  // Full, friendly label for whichever day is currently selected, e.g.
  // "Friday, August 22, 2026" — used in the popup title.
  const selectedDateLabel = selectedDate
    ? new Date(selectedDate.year, selectedDate.month, selectedDate.day).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const selectedDayBalance = selectedDate ? selectedMonthBalances[selectedDate.day] ?? null : null;
  const selectedDayEvents = selectedDate ? selectedMonthEvents[selectedDate.day] || [] : [];
  
  // List-mode preview panel values
  const effectivePreviewDay = Math.min(
    previewDate && previewDate.year === year && previewDate.month === month
      ? previewDate.day
      : (isCurrentMonth ? today.getDate() : 1),
    daysInMonth
  );
  const previewEvents = monthEvents[effectivePreviewDay] || [];
  const previewBalance = projectedBalances[effectivePreviewDay] ?? null;
  const previewDateLabel = new Date(year, month, effectivePreviewDay).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.sheetHeader}>
        <View style={styles.sheetHeaderSide} />
        <Text style={styles.sheetTitle}>Calendar</Text>
        <View style={[styles.sheetHeaderSide, { alignItems: 'flex-end' }]}>
          {Platform.OS === 'android' && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.closeBtnCircle}
              accessibilityLabel="Close calendar"
            >
              <Ionicons name="close" size={18} color={colors.ink} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <Card variant="banner" style={{ marginBottom: 14 }}>
        <Text style={styles.balanceBannerLabel}>TOTAL BALANCE</Text>
        <Text style={styles.balanceBannerAmount}>{formatPeso(totalBalance)}</Text>
      </Card>

      <View style={styles.toolbarRow}>
        <TouchableOpacity onPress={() => setMenuOpen(true)} style={styles.menuButton}>
          <Ionicons name="ellipsis-horizontal-circle-outline" size={26} color={colors.gold} />
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <TouchableOpacity onPress={goPrevMonth} style={[styles.navButton, pageIndex <= 0 && { opacity: 0.35 }]}>
          <Ionicons name="chevron-back" size={20} color={colors.ink} />
        </TouchableOpacity>

        <Text style={styles.monthLabel}>
          {MONTHS[month]} {year}
        </Text>

        <TouchableOpacity onPress={goNextMonth} style={[styles.navButton, pageIndex >= monthPages.length - 1 && { opacity: 0.35 }]}>
          <Ionicons name="chevron-forward" size={20} color={colors.ink} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={goToday} style={styles.todayButton}>
        <Text style={styles.todayButtonText}>Today</Text>
      </TouchableOpacity>

      <View style={styles.dowRow}>
        {DOW.map((d) => (
          <View key={d} style={styles.dowCell}>
            <Text style={styles.dowText}>{d}</Text>
          </View>
        ))}
      </View>

      {navMode === 'swipe' ? (
        <FlatList
          key="swipe-list"
          ref={swipeListRef}
          style={{ flexGrow: 0 }}
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
                effectivePreviewDay={item.year === year && item.month === month ? effectivePreviewDay : null}
                onDayPress={handleDayPress}
              />
            </View>
          )}
        />
      ) : (
        <FlatList
          key="scroll-list"
          ref={verticalListRef}
          style={{ flex: 1 }}
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
                effectivePreviewDay={item.year === year && item.month === month ? effectivePreviewDay : null}
                onDayPress={handleDayPress}
              />
            </View>
          )}
        />
      )}

      {viewMode === 'list' && (
        <View style={styles.previewPanel}>
          <Text style={styles.previewTitle}>{previewDateLabel}</Text>
          {previewBalance !== null && (
            <Text style={styles.previewBalance}>
              Projected balance: {formatPeso(previewBalance)}
            </Text>
          )}
          {previewEvents.length > 0 ? (
            <ScrollView>
              {previewEvents.map((ev, i) => (
                <View key={i} style={styles.modalEventRow}>
                  <View
                    style={[styles.modalEventDot, { backgroundColor: EVENT_DOT_COLORS[ev.type] }]}
                  />
                  <Text style={styles.modalEventLabel} numberOfLines={1}>
                    {ev.label}
                  </Text>
                  <Text style={styles.modalEventAmount}>{formatPeso(ev.amount)}</Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.previewEmpty}>Nothing due on this date.</Text>
          )}
        </View>
      )}

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setMenuOpen(false)}>
          <Pressable style={styles.menuCard} onPress={() => {}}>
            {(['compact', 'stacked', 'details'] as CalendarViewMode[]).map((m) => (
              <TouchableOpacity key={m} style={styles.menuRow} onPress={() => chooseViewMode(m)}>
                <Ionicons name={VIEW_MODE_ICONS[m]} size={18} color={colors.inkDim} style={styles.menuItemIcon} />
                <Text style={styles.menuRowText}>{m.charAt(0).toUpperCase() + m.slice(1)}</Text>
                <View style={styles.menuCheckSlot}>
                  {viewMode === m && <Ionicons name="checkmark" size={18} color={colors.gold} />}
                </View>
              </TouchableOpacity>
            ))}
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuRow} onPress={() => chooseViewMode('list')}>
              <Ionicons name={VIEW_MODE_ICONS.list} size={18} color={colors.inkDim} style={styles.menuItemIcon} />
              <Text style={styles.menuRowText}>List</Text>
              <View style={styles.menuCheckSlot}>
                {viewMode === 'list' && <Ionicons name="checkmark" size={18} color={colors.gold} />}
              </View>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            {(['swipe', 'scroll'] as CalendarNavMode[]).map((n) => (
              <TouchableOpacity key={n} style={styles.menuRow} onPress={() => chooseNavMode(n)}>
                <Ionicons name={NAV_MODE_ICONS[n]} size={18} color={colors.inkDim} style={styles.menuItemIcon} />
                <Text style={styles.menuRowText}>{n === 'swipe' ? 'Swipe months' : 'Scroll months'}</Text>
                <View style={styles.menuCheckSlot}>
                  {navMode === n && <Ionicons name="checkmark" size={18} color={colors.gold} />}
                </View>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={selectedDate !== null}
        transparent
        animationType="fade"
        onRequestClose={closeDayModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeDayModal}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{selectedDateLabel}</Text>
            {selectedDayBalance !== null && (
              <Text style={styles.modalBalanceLine}>
                Projected balance: {formatPeso(selectedDayBalance)}
              </Text>
            )}
            {selectedDayEvents.length > 0 ? (
              <ScrollView style={styles.modalEventList}>
                {selectedDayEvents.map((ev, i) => (
                  <View key={i} style={styles.modalEventRow}>
                    <View
                      style={[styles.modalEventDot, { backgroundColor: EVENT_DOT_COLORS[ev.type] }]}
                    />
                    <Text style={styles.modalEventLabel} numberOfLines={1}>
                      {ev.label}
                    </Text>
                    <Text style={styles.modalEventAmount}>{formatPeso(ev.amount)}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.modalSubtitle}>Nothing due on this date.</Text>
            )}
            <TouchableOpacity onPress={closeDayModal} style={styles.modalCloseButton}>
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.navy2,
      paddingHorizontal: 12,
      paddingTop: 16,
    },
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    sheetHeaderSide: {
      width: 44,
    },
    sheetTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.ink,
    },
    closeBtnCircle: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.navy3,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.navy4,
    },
    balanceBannerLabel: {
      fontSize: 11,
      letterSpacing: 1,
      color: colors.inkDim,
      marginBottom: 4,
    },
    balanceBannerAmount: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.ink,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    navButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.navy3,
      borderWidth: 1,
      borderColor: colors.navy4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    monthLabel: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.ink,
    },
    inlineMonthTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.ink,
      marginTop: 10,
      marginBottom: 4,
    },
    todayButton: {
      alignSelf: 'center',
      backgroundColor: colors.navy3,
      borderWidth: 1,
      borderColor: colors.navy4,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 999,
      marginBottom: 14,
    },
    todayButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.inkDim,
    },
    toolbarRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginBottom: 4,
    },
    menuButton: {
      padding: 4,
    },
    menuOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.3)',
      alignItems: 'flex-end',
      paddingTop: 110,
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
    dowRow: {
      flexDirection: 'row',
      marginBottom: 6,
    },
    dowCell: {
      flex: 1,
      alignItems: 'center',
      paddingBottom: 4,
    },
    dowText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.inkFaint,
      textTransform: 'uppercase',
    },
    weekRow: {
      flexDirection: 'row',
      marginBottom: 5,
    },
    dayCell: {
      flex: 1,
      margin: 2,
      borderRadius: 10,
      backgroundColor: colors.navy3,
      borderWidth: 1,
      borderColor: colors.navy4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayCellOutOfMonth: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      opacity: 0.35,
    },
    dayCellSquare: {
      aspectRatio: 1,
    },
    dayCellList: {
      height: 44,
    },
    dayCellToday: {
      backgroundColor: colors.gold,
      borderColor: colors.gold,
    },
    dayCellSelected: {
      borderWidth: 2,
      borderColor: colors.gold,
    },
    dayText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.ink,
    },
    dayTextOutOfMonth: {
      color: colors.inkFaint,
    },
    dayTextToday: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    previewPanel: {
      flex: 1,
      marginTop: 10,
      marginBottom: 8,
      backgroundColor: colors.navy3,
      borderWidth: 1,
      borderColor: colors.navy4,
      borderRadius: 14,
      padding: 14,
    },
    previewTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.ink,
      marginBottom: 4,
    },
    previewBalance: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.gold,
      marginBottom: 8,
    },
    previewEmpty: {
      fontSize: 13,
      color: colors.inkDim,
      marginTop: 6,
    },
    dayCellDetails: {
      minHeight: 78,
      justifyContent: 'flex-start',
      paddingTop: 4,
      paddingHorizontal: 2,
    },
    stackWrap: {
      width: '85%',
      marginTop: 3,
      gap: 2,
    },
    stackBar: {
      height: 3,
      borderRadius: 1.5,
    },
    pillWrap: {
      width: '100%',
      marginTop: 3,
      gap: 2,
    },
    pill: {
      borderRadius: 4,
      paddingHorizontal: 3,
      paddingVertical: 1,
    },
    pillText: {
      fontSize: 10.5,
      fontWeight: '500',
      color: colors.ink,
    },
    pillMore: {
      fontSize: 10.5,
      color: colors.inkDim,
      paddingLeft: 2,
    },
    dotRow: {
      flexDirection: 'row',
      gap: 3,
      marginTop: 2,
      height: 5,
      alignItems: 'center',
    },
    dot: {
      width: 4,
      height: 4,
      borderRadius: 2,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    modalCard: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: colors.navy3,
      borderWidth: 1,
      borderColor: colors.navy4,
      borderRadius: 14,
      padding: 20,
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.ink,
      marginBottom: 8,
    },
    modalBalanceLine: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.gold,
      marginBottom: 10,
    },
    modalSubtitle: {
      fontSize: 13,
      color: colors.inkDim,
      lineHeight: 19,
      marginBottom: 18,
    },
    modalEventList: {
      maxHeight: 220,
      marginBottom: 14,
    },
    modalEventRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 7,
      borderBottomWidth: 1,
      borderBottomColor: colors.navy4,
    },
    modalEventDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
      marginRight: 8,
    },
    modalEventLabel: {
      flex: 1,
      fontSize: 13,
      color: colors.ink,
    },
    modalEventAmount: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.inkDim,
    },
    modalCloseButton: {
      alignSelf: 'flex-end',
      backgroundColor: colors.gold,
      paddingHorizontal: 18,
      paddingVertical: 9,
      borderRadius: 999,
    },
    modalCloseButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
}