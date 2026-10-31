import { useEffect, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { sunTimes } from './sunTimes';

export { sunTimes };

// The sky on Home (Settings › Appearance › Sky). A soft glow from the top-right corner
// that follows the time of day: morning, afternoon, evening and night.
//
// With "Live weather" on, the phone's approximate location is used to work out the real
// sunrise and sunset for that day (worked out on the phone, no internet needed), so
// morning starts at sunrise and night starts when it is really dark, and the current
// weather (clear, cloudy or rain) is checked about once an hour.
// Without location the glow uses 6:00 sunrise / 18:00 sunset.
//
// Both switches are saved on this phone only (like Text size): location permission is a
// per-phone thing, and the location itself is never put into the household's synced data.

export type SkyPhase = 'morning' | 'afternoon' | 'evening' | 'night';

type SkyPrefs = { glowOn: boolean; liveWeatherOn: boolean; rainAnimOn: boolean };
type SavedPlace = { lat: number; lon: number; at: number };

const PREFS_KEY = 'skyPrefs';
const PLACE_KEY = 'skyPlace';
const WEATHER_KEY = 'skyWeather';

// Live weather, simplified to the three looks the sky has.
export type SkyWeather = 'clear' | 'cloudy' | 'rain';
type SavedWeather = { kind: SkyWeather; at: number };
let weather: SavedWeather | null = null;
let weatherBusy = false;

let prefs: SkyPrefs = { glowOn: true, liveWeatherOn: false, rainAnimOn: true };
let place: SavedPlace | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

// (Promise first: a storage without multiGet, like one screen check's stand-in, just keeps the defaults.)
Promise.resolve()
  .then(() => AsyncStorage.multiGet([PREFS_KEY, PLACE_KEY, WEATHER_KEY]))
  .then(([[, savedPrefs], [, savedPlace], [, savedWeather]]) => {
    if (savedPrefs) prefs = { ...prefs, ...JSON.parse(savedPrefs) };
    if (savedPlace) place = JSON.parse(savedPlace);
    if (savedWeather) weather = JSON.parse(savedWeather);
    emit();
  })
  .catch(() => {});

function savePrefs(next: SkyPrefs) {
  prefs = next;
  emit();
  AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => {});
}

// The place to use for sunrise and sunset right now (only with Live weather on, like the sky),
// for code outside React such as Day & night.
export function skyPlaceNow(): { lat: number; lon: number } | null {
  return prefs.liveWeatherOn && place ? { lat: place.lat, lon: place.lon } : null;
}

export function useSkyPrefs(): SkyPrefs {
  return useSyncExternalStore(subscribe, () => prefs, () => prefs);
}

export function setSkyGlowOn(on: boolean) {
  savePrefs({ ...prefs, glowOn: on });
}

// Rain animation: when it rains, the drops fall gently (on) or stay still (off).
export function setRainAnimOn(on: boolean) {
  savePrefs({ ...prefs, rainAnimOn: on });
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
    refreshWeather(true);
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

// ---- Weather (Open-Meteo: free, no account or key; only the rounded location is sent) ----
// WMO weather codes: 0-1 clear, 2 partly cloudy (still shown as clear), 3 overcast and
// 45/48 fog = cloudy, drizzle/rain/showers/thunderstorms = rain. Snow shows as cloudy.
export function weatherFromCode(code: number): SkyWeather {
  if (code <= 2) return 'clear';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return 'rain';
  return 'cloudy';
}

const HOUR = 60 * 60 * 1000;
async function refreshWeather(force = false): Promise<void> {
  if (!prefs.liveWeatherOn || !place || weatherBusy) return;
  if (!force && weather && Date.now() - weather.at < HOUR) return;
  weatherBusy = true;
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}&current=weather_code&timezone=auto&forecast_days=1`;
    const res = await fetch(url);
    if (!res.ok) return;
    const json = await res.json();
    const code = json?.current?.weather_code;
    if (typeof code !== 'number') return;
    weather = { kind: weatherFromCode(code), at: Date.now() };
    emit();
    AsyncStorage.setItem(WEATHER_KEY, JSON.stringify(weather)).catch(() => {});
  } catch {
    // Offline or the service is down: keep the last weather we saw.
  } finally {
    weatherBusy = false;
  }
}

// The weather look to draw. Clear unless Live weather is on and we have a reading from
// the last 6 hours (an old reading is not worth showing).
// Testing only (development builds, e.g. Expo Go): force a weather look from Settings to
// check how it draws. Not saved; never shown in a release build.
let previewWeather: SkyWeather | null = null;
export function setPreviewWeather(w: SkyWeather | null) {
  previewWeather = w;
  emit();
}
export function usePreviewWeather(): SkyWeather | null {
  return useSyncExternalStore(subscribe, () => previewWeather, () => previewWeather);
}

export function useSkyWeather(): SkyWeather {
  const { liveWeatherOn } = useSkyPrefs();
  const w = useSyncExternalStore(subscribe, () => weather, () => weather);
  const preview = usePreviewWeather();
  if (__DEV__ && preview) return preview;
  if (!liveWeatherOn || !w || Date.now() - w.at > 6 * HOUR) return 'clear';
  return w.kind;
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
    const tick = setInterval(() => {
      setPhase(compute());
      if (liveWeatherOn) refreshWeather();
    }, MIN);
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') return;
      setPhase(compute());
      if (liveWeatherOn && (!place || Date.now() - place.at > 3 * 60 * MIN)) refreshPlace();
      else if (liveWeatherOn) refreshWeather();
    });
    if (liveWeatherOn && (!place || Date.now() - place.at > 3 * 60 * MIN)) refreshPlace();
    else if (liveWeatherOn) refreshWeather();
    return () => {
      clearInterval(tick);
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveWeatherOn, usePlace?.lat, usePlace?.lon]);

  return phase;
}
