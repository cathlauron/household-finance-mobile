import { useEffect, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

// The sky on Home (Settings › Appearance › Sky). A soft glow from the top-right corner
// that follows the time of day: morning, afternoon, evening and night.
//
// With "Live weather" on, the phone's approximate location is used to work out the real
// sunrise and sunset for that day (worked out on the phone, no internet needed), so
// morning starts at sunrise and night starts when it is really dark. Weather colours and
// rain come in later steps. Without location the glow uses 6:00 sunrise / 18:00 sunset.
//
// Both switches are saved on this phone only (like Text size): location permission is a
// per-phone thing, and the location itself is never put into the household's synced data.

export type SkyPhase = 'morning' | 'afternoon' | 'evening' | 'night';

type SkyPrefs = { glowOn: boolean; liveWeatherOn: boolean };
type SavedPlace = { lat: number; lon: number; at: number };

const PREFS_KEY = 'skyPrefs';
const PLACE_KEY = 'skyPlace';

let prefs: SkyPrefs = { glowOn: true, liveWeatherOn: false };
let place: SavedPlace | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

AsyncStorage.multiGet([PREFS_KEY, PLACE_KEY])
  .then(([[, savedPrefs], [, savedPlace]]) => {
    if (savedPrefs) prefs = { ...prefs, ...JSON.parse(savedPrefs) };
    if (savedPlace) place = JSON.parse(savedPlace);
    emit();
  })
  .catch(() => {});

function savePrefs(next: SkyPrefs) {
  prefs = next;
  emit();
  AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => {});
}

export function useSkyPrefs(): SkyPrefs {
  return useSyncExternalStore(subscribe, () => prefs, () => prefs);
}

export function setSkyGlowOn(on: boolean) {
  savePrefs({ ...prefs, glowOn: on });
}

// Rounded to 2 decimal places (about 1 km), which is plenty for sunrise and weather.
const round2 = (n: number) => Math.round(n * 100) / 100;

async function refreshPlace(): Promise<boolean> {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== 'granted') return false;
    // A recent last-known position is fast and uses no extra battery; otherwise ask once
    // at low accuracy.
    const last = await Location.getLastKnownPositionAsync({ maxAge: 6 * 60 * 60 * 1000 });
    const pos = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }));
    place = { lat: round2(pos.coords.latitude), lon: round2(pos.coords.longitude), at: Date.now() };
    emit();
    AsyncStorage.setItem(PLACE_KEY, JSON.stringify(place)).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

// Turning Live weather on asks for location permission (approximate only). Returns false
// if the person says no; the switch then stays off and the glow follows the clock.
export async function setLiveWeatherOn(on: boolean): Promise<boolean> {
  if (!on) {
    savePrefs({ ...prefs, liveWeatherOn: false });
    return true;
  }
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return false;
  } catch {
    return false;
  }
  savePrefs({ ...prefs, liveWeatherOn: true });
  refreshPlace();
  return true;
}

// ---- Sunrise and sunset (the standard NOAA sunrise equation) ----
const RAD = Math.PI / 180;
const norm = (v: number, max: number) => ((v % max) + max) % max;

function sunEvent(date: Date, lat: number, lon: number, rising: boolean): Date | null {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() - start.getTime()) / 86400000);
  const lngHour = lon / 15;
  const t = dayOfYear + ((rising ? 6 : 18) - lngHour) / 24;
  const M = 0.9856 * t - 3.289;
  const L = norm(M + 1.916 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 282.634, 360);
  let RA = norm(Math.atan(0.91764 * Math.tan(L * RAD)) / RAD, 360);
  RA = (RA + (Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90)) / 15;
  const sinDec = 0.39782 * Math.sin(L * RAD);
  const cosDec = Math.cos(Math.asin(sinDec));
  const cosH = (Math.cos(90.833 * RAD) - sinDec * Math.sin(lat * RAD)) / (cosDec * Math.cos(lat * RAD));
  if (cosH > 1 || cosH < -1) return null; // the sun doesn't rise or set that day
  const H = (rising ? 360 - Math.acos(cosH) / RAD : Math.acos(cosH) / RAD) / 15;
  const T = H + RA - 0.06571 * t - 6.622;
  const UT = norm(T - lngHour, 24);
  let when = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) + UT * 3600000);
  // Keep it on the same local day (east of Greenwich, sunrise can fall on the previous UTC day).
  const localNoon = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12).getTime();
  if (when.getTime() - localNoon > 12 * 3600000) when = new Date(when.getTime() - 86400000);
  if (when.getTime() - localNoon < -12 * 3600000) when = new Date(when.getTime() + 86400000);
  return when;
}

export function sunTimes(date: Date, lat?: number, lon?: number): { sunrise: Date; sunset: Date; noon: Date } {
  const at = (h: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), h);
  let sunrise = at(6);
  let sunset = at(18);
  if (typeof lat === 'number' && typeof lon === 'number') {
    const r = sunEvent(date, lat, lon, true);
    const s = sunEvent(date, lat, lon, false);
    if (r && s && s > r) {
      sunrise = r;
      sunset = s;
    }
  }
  return { sunrise, sunset, noon: new Date((sunrise.getTime() + sunset.getTime()) / 2) };
}

const MIN = 60000;
export function phaseAt(now: Date, lat?: number, lon?: number): SkyPhase {
  const { sunrise, sunset, noon } = sunTimes(now, lat, lon);
  const t = now.getTime();
  if (t < sunrise.getTime() - 30 * MIN) return 'night';
  if (t < noon.getTime()) return 'morning';
  if (t < sunset.getTime() - 60 * MIN) return 'afternoon';
  if (t < sunset.getTime() + 60 * MIN) return 'evening';
  return 'night';
}

// The current phase, re-checked every minute and whenever the app comes back to the front.
// With Live weather on, the location is refreshed at most every 3 hours.
export function useSkyPhase(): SkyPhase {
  const { liveWeatherOn } = useSkyPrefs();
  const savedPlace = useSyncExternalStore(subscribe, () => place, () => place);
  const usePlace = liveWeatherOn && savedPlace ? savedPlace : null;
  const compute = () => phaseAt(new Date(), usePlace?.lat, usePlace?.lon);
  const [phase, setPhase] = useState<SkyPhase>(compute);

  useEffect(() => {
    setPhase(compute());
    const tick = setInterval(() => setPhase(compute()), MIN);
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') return;
      setPhase(compute());
      if (liveWeatherOn && (!place || Date.now() - place.at > 3 * 60 * MIN)) refreshPlace();
    });
    if (liveWeatherOn && (!place || Date.now() - place.at > 3 * 60 * MIN)) refreshPlace();
    return () => {
      clearInterval(tick);
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveWeatherOn, usePlace?.lat, usePlace?.lon]);

  return phase;
}
