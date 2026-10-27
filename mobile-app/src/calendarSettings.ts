import AsyncStorage from '@react-native-async-storage/async-storage';

export type CalendarViewMode = 'compact' | 'stacked' | 'details' | 'list';
export type CalendarNavMode = 'scroll' | 'swipe';

export const DEFAULT_VIEW_MODE: CalendarViewMode = 'compact';
export const DEFAULT_NAV_MODE: CalendarNavMode = 'swipe';

const VIEW_MODE_KEY = 'calendar:viewMode';

// Smoothness sweep 2026-10-26 (jank reviewer): the calendar opened with the default layout
// and then redrew with the saved one while it was still rising (a flicker, double work).
// The saved choices are remembered here once read (read early, when the app starts), so
// the calendar opens with the right layout straight away.
const known: { view?: CalendarViewMode; nav?: CalendarNavMode; balance?: boolean } = {};
export function calendarSettingsNow() {
  return {
    view: known.view ?? DEFAULT_VIEW_MODE,
    nav: known.nav ?? DEFAULT_NAV_MODE,
    balance: known.balance ?? true,
  };
}
const NAV_MODE_KEY = 'calendar:navMode';

export async function getCalendarViewMode(): Promise<CalendarViewMode> {
  try {
    const val = await AsyncStorage.getItem(VIEW_MODE_KEY);
    if (val === 'compact' || val === 'stacked' || val === 'details' || val === 'list') {
      known.view = val;
      return val;
    }
    known.view = DEFAULT_VIEW_MODE;
    return DEFAULT_VIEW_MODE;
  } catch {
    return DEFAULT_VIEW_MODE;
  }
}

export async function setCalendarViewMode(mode: CalendarViewMode): Promise<void> {
  known.view = mode;
  await AsyncStorage.setItem(VIEW_MODE_KEY, mode);
}

export async function getCalendarNavMode(): Promise<CalendarNavMode> {
  try {
    const val = await AsyncStorage.getItem(NAV_MODE_KEY);
    if (val === 'scroll' || val === 'swipe') {
      known.nav = val;
      return val;
    }
    known.nav = DEFAULT_NAV_MODE;
    return DEFAULT_NAV_MODE;
  } catch {
    return DEFAULT_NAV_MODE;
  }
}

export async function setCalendarNavMode(mode: CalendarNavMode): Promise<void> {
  known.nav = mode;
  await AsyncStorage.setItem(NAV_MODE_KEY, mode);
}

// Version 2.2 (canvas C5): the projected balance at the bottom of the calendar can be hidden.
const SHOW_BALANCE_KEY = 'calendar:showBalance';
export async function getCalendarShowBalance(): Promise<boolean> {
  try {
    known.balance = (await AsyncStorage.getItem(SHOW_BALANCE_KEY)) !== 'off';
    return known.balance;
  } catch {
    return true;
  }
}
export async function setCalendarShowBalance(on: boolean): Promise<void> {
  known.balance = on;
  await AsyncStorage.setItem(SHOW_BALANCE_KEY, on ? 'on' : 'off');
}

// Read them once early (when the app starts), so the calendar never has to wait.
export function warmCalendarSettings(): void {
  getCalendarViewMode().catch(() => {});
  getCalendarNavMode().catch(() => {});
  getCalendarShowBalance().catch(() => {});
}
