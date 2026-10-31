import { sunTimes } from './sunTimes';

// Day & night (Cath, 2026-10-31, mockups D1 + D3): a fourth look next to Light, Dark and
// Match my phone. Light by day, dark from sunset to sunrise, using the same sunrise and
// sunset as Home's sky (6:00 / 18:00 without location). New people start on it.
// Plain logic only (no React Native), so tests/dayNight.test.mjs can check it.

export type ColorMode = 'light' | 'dark' | 'device' | 'auto';

export function isNightAt(now: Date, lat?: number, lon?: number): boolean {
  const { sunrise, sunset } = sunTimes(now, lat, lon);
  const t = now.getTime();
  return t < sunrise.getTime() || t >= sunset.getTime();
}

// When Day & night next switches: the coming sunset by day, the coming sunrise by night.
export function nextThemeChange(now: Date, lat?: number, lon?: number): Date {
  const { sunrise, sunset } = sunTimes(now, lat, lon);
  const t = now.getTime();
  if (t < sunrise.getTime()) return sunrise;
  if (t < sunset.getTime()) return sunset;
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12);
  return sunTimes(tomorrow, lat, lon).sunrise;
}

export function resolveDark(mode: ColorMode, now: Date, phoneDark: boolean, lat?: number, lon?: number): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  if (mode === 'device') return phoneDark;
  return isNightAt(now, lat, lon);
}

// A saved choice is kept; nothing saved yet (a new person) starts on Day & night.
export function startingMode(saved: string | null): ColorMode {
  return saved === 'light' || saved === 'dark' || saved === 'device' || saved === 'auto' ? saved : 'auto';
}

export function clockText(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h % 12 || 12}:${m < 10 ? '0' : ''}${m} ${h >= 12 ? 'PM' : 'AM'}`;
}

export function darkHoursText(now: Date, lat?: number, lon?: number): string {
  const { sunrise, sunset } = sunTimes(now, lat, lon);
  return `Dark ${clockText(sunset)} to ${clockText(sunrise)}`;
}
