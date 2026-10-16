import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Travel time note: the app always follows the phone's clock. This remembers the
// phone's "home" time zone (the first one it sees) and tells Home when the phone is
// somewhere else, so dates and reminder times abroad aren't a surprise.
// Saved on this phone only (each person's phone travels on its own).

const HOME_KEY = 'travel:home-zone';
const HIDDEN_KEY = 'travel:hidden-for-zone';

type SavedZone = { tz: string; offsetMin: number };

export type ZoneInfo = {
  tz: string;
  city: string;
  offsetMin: number; // minutes ahead of UTC right now
  timeLabel: string; // "3:42 PM"
  dateLabel: string; // "Fri, Oct 16"
};

export type TravelState = {
  ready: boolean;
  away: boolean; // the phone is in a different time zone from home
  hidden: boolean; // "Hide until I'm back home" was chosen for this zone
  here: ZoneInfo | null;
  home: ZoneInfo | null;
  diffMin: number; // here minus home, in minutes (positive = ahead of home)
};

export function phoneTimeZone(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof tz === 'string' && tz.length > 0 ? tz : null;
  } catch {
    return null;
  }
}

// "Asia/Manila" -> "Manila", "America/Los_Angeles" -> "Los Angeles".
export function cityOf(tz: string): string {
  const last = tz.split('/').pop() || tz;
  return last.replace(/_/g, ' ');
}

// Minutes ahead of UTC for a time zone at a given moment (handles summer time).
// Falls back to `fallback` if the phone can't work it out.
function offsetOf(tz: string, at: Date, fallback: number): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).formatToParts(at);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    const asUTC = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'));
    const diff = Math.round((asUTC - Math.floor(at.getTime() / 60000) * 60000) / 60000);
    return Number.isFinite(diff) ? diff : fallback;
  } catch {
    return fallback;
  }
}

function zoneInfo(tz: string, offsetMin: number, now: Date): ZoneInfo {
  // The wall-clock time in that zone, built from the offset so it works everywhere.
  const local = new Date(now.getTime() + offsetMin * 60000);
  const h = local.getUTCHours();
  const m = String(local.getUTCMinutes()).padStart(2, '0');
  const timeLabel = `${h % 12 === 0 ? 12 : h % 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateLabel = `${DAYS[local.getUTCDay()]}, ${MONTHS[local.getUTCMonth()]} ${local.getUTCDate()}`;
  return { tz, city: cityOf(tz), offsetMin, timeLabel, dateLabel };
}

// "GMT+8", "GMT-7", "GMT+5:30"
export function gmtLabel(offsetMin: number): string {
  const sign = offsetMin < 0 ? '-' : '+';
  const abs = Math.abs(offsetMin);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `GMT${sign}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`;
}

// "1 hour ahead of Manila", "15 hours behind Manila", "5 hr 30 min ahead of Manila"
export function differenceText(diffMin: number, homeCity: string): string {
  const abs = Math.abs(diffMin);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const amount = m === 0 ? `${h} ${h === 1 ? 'hour' : 'hours'}` : h === 0 ? `${m} minutes` : `${h} hr ${m} min`;
  return `${amount} ${diffMin > 0 ? 'ahead of' : 'behind'} ${homeCity}`;
}

async function loadHome(): Promise<SavedZone | null> {
  try {
    const raw = await AsyncStorage.getItem(HOME_KEY);
    const v = raw ? JSON.parse(raw) : null;
    return v && typeof v.tz === 'string' ? { tz: v.tz, offsetMin: Number(v.offsetMin) || 0 } : null;
  } catch {
    return null;
  }
}

async function saveHome(tz: string, offsetMin: number) {
  try {
    await AsyncStorage.setItem(HOME_KEY, JSON.stringify({ tz, offsetMin }));
  } catch {}
}

async function compute(): Promise<TravelState> {
  const none: TravelState = { ready: true, away: false, hidden: false, here: null, home: null, diffMin: 0 };
  const tz = phoneTimeZone();
  if (!tz) return none;
  const now = new Date();
  const hereOffset = -now.getTimezoneOffset();
  let home = await loadHome();
  if (!home) {
    await saveHome(tz, hereOffset);
    home = { tz, offsetMin: hereOffset };
  }
  const here = zoneInfo(tz, hereOffset, now);
  const homeOffset = home.tz === tz ? hereOffset : offsetOf(home.tz, now, home.offsetMin);
  const homeInfo = zoneInfo(home.tz, homeOffset, now);
  // Only "away" when the clocks really differ (a different zone name with the same time,
  // e.g. Manila vs Singapore, doesn't change anything for the app).
  const away = home.tz !== tz && hereOffset !== homeOffset;
  let hidden = false;
  try {
    hidden = (await AsyncStorage.getItem(HIDDEN_KEY)) === tz;
    // Back home (or somewhere new): the "hide" choice no longer applies.
    if (!away || !hidden) await AsyncStorage.removeItem(HIDDEN_KEY);
  } catch {}
  return { ready: true, away, hidden: away && hidden, here, home: homeInfo, diffMin: hereOffset - homeOffset };
}

// Checks again whenever the app comes back to the front (the phone may have changed
// time zone while the app was in the background).
export function useTravelTime() {
  const [state, setState] = useState<TravelState>({ ready: false, away: false, hidden: false, here: null, home: null, diffMin: 0 });

  const refresh = useCallback(() => {
    compute().then(setState).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    // Keep the clocks in the sheet roughly current while Home is open.
    const timer = setInterval(refresh, 60000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [refresh]);

  const hideUntilHome = useCallback(async () => {
    const tz = phoneTimeZone();
    if (tz) {
      try {
        await AsyncStorage.setItem(HIDDEN_KEY, tz);
      } catch {}
    }
    refresh();
  }, [refresh]);

  const makeThisHome = useCallback(async () => {
    const tz = phoneTimeZone();
    if (tz) await saveHome(tz, -new Date().getTimezoneOffset());
    try {
      await AsyncStorage.removeItem(HIDDEN_KEY);
    } catch {}
    refresh();
  }, [refresh]);

  return { ...state, refresh, hideUntilHome, makeThisHome };
}

// For Settings › Appearance: the saved home zone, and changing it to this phone's.
export async function getHomeZoneCity(): Promise<string | null> {
  const home = await loadHome();
  return home ? cityOf(home.tz) : null;
}
export async function setHomeZoneToPhone(): Promise<string | null> {
  const tz = phoneTimeZone();
  if (!tz) return null;
  await saveHome(tz, -new Date().getTimezoneOffset());
  try {
    await AsyncStorage.removeItem(HIDDEN_KEY);
  } catch {}
  return cityOf(tz);
}
