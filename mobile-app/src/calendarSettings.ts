import AsyncStorage from '@react-native-async-storage/async-storage';

export type CalendarViewMode = 'compact' | 'stacked' | 'details' | 'list';
export type CalendarNavMode = 'scroll' | 'swipe';

export const DEFAULT_VIEW_MODE: CalendarViewMode = 'compact';
export const DEFAULT_NAV_MODE: CalendarNavMode = 'swipe';

const VIEW_MODE_KEY = 'calendar:viewMode';
const NAV_MODE_KEY = 'calendar:navMode';

export async function getCalendarViewMode(): Promise<CalendarViewMode> {
  try {
    const val = await AsyncStorage.getItem(VIEW_MODE_KEY);
    if (val === 'compact' || val === 'stacked' || val === 'details' || val === 'list') {
      return val;
    }
    return DEFAULT_VIEW_MODE;
  } catch {
    return DEFAULT_VIEW_MODE;
  }
}

export async function setCalendarViewMode(mode: CalendarViewMode): Promise<void> {
  await AsyncStorage.setItem(VIEW_MODE_KEY, mode);
}

export async function getCalendarNavMode(): Promise<CalendarNavMode> {
  try {
    const val = await AsyncStorage.getItem(NAV_MODE_KEY);
    if (val === 'scroll' || val === 'swipe') {
      return val;
    }
    return DEFAULT_NAV_MODE;
  } catch {
    return DEFAULT_NAV_MODE;
  }
}

export async function setCalendarNavMode(mode: CalendarNavMode): Promise<void> {
  await AsyncStorage.setItem(NAV_MODE_KEY, mode);
}
