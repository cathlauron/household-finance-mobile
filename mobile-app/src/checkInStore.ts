import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import type { ClockTime } from './checkIn';

// Cath, 2026-11-24: the daily check-in's time is per phone (like the payday nudge), 8:00 PM
// unless picked otherwise. "Nothing today" is remembered on this phone for that day only.
export const DEFAULT_CHECK_IN_TIME: ClockTime = { hour: 20, minute: 0 };
const TIME_KEY = 'checkInTimeV1';
const QUIET_KEY = 'checkInQuietV1';
const listeners = new Set<(t: ClockTime) => void>();

export async function getCheckInTime(): Promise<ClockTime> {
  try {
    const raw = await AsyncStorage.getItem(TIME_KEY);
    const t = raw ? JSON.parse(raw) : null;
    if (t && Number.isInteger(t.hour) && Number.isInteger(t.minute) && t.hour >= 0 && t.hour < 24 && t.minute >= 0 && t.minute < 60) return t;
  } catch {}
  return DEFAULT_CHECK_IN_TIME;
}

export async function setCheckInTime(t: ClockTime): Promise<void> {
  await AsyncStorage.setItem(TIME_KEY, JSON.stringify(t)).catch(() => {});
  listeners.forEach((l) => l(t));
}

export function useCheckInTime(): ClockTime {
  const [t, setT] = useState<ClockTime>(DEFAULT_CHECK_IN_TIME);
  useEffect(() => {
    getCheckInTime().then(setT);
    listeners.add(setT);
    return () => {
      listeners.delete(setT);
    };
  }, []);
  return t;
}

export async function getQuietDay(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(QUIET_KEY);
  } catch {
    return null;
  }
}

export async function setQuietDay(dayISO: string): Promise<void> {
  await AsyncStorage.setItem(QUIET_KEY, dayISO).catch(() => {});
}
