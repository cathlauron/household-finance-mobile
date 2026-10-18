import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

// Version 2.1 (Cath, canvas S5): what time the payday nudge comes, per phone, so changing
// yours doesn't change your partner's. 6:00 PM unless picked otherwise.
export type ClockTime = { hour: number; minute: number };
export const DEFAULT_PAYDAY_TIME: ClockTime = { hour: 18, minute: 0 };
const KEY = 'paydayNudgeTimeV1';
const listeners = new Set<(t: ClockTime) => void>();

export async function getPaydayNudgeTime(): Promise<ClockTime> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const t = raw ? JSON.parse(raw) : null;
    if (t && Number.isInteger(t.hour) && Number.isInteger(t.minute) && t.hour >= 0 && t.hour < 24 && t.minute >= 0 && t.minute < 60) return t;
  } catch {}
  return DEFAULT_PAYDAY_TIME;
}

export async function setPaydayNudgeTime(t: ClockTime): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(t)).catch(() => {});
  listeners.forEach((l) => l(t));
}

export function usePaydayNudgeTime(): ClockTime {
  const [t, setT] = useState<ClockTime>(DEFAULT_PAYDAY_TIME);
  useEffect(() => {
    getPaydayNudgeTime().then(setT);
    listeners.add(setT);
    return () => {
      listeners.delete(setT);
    };
  }, []);
  return t;
}

export function formatClock(t: ClockTime): string {
  const h = t.hour % 12 === 0 ? 12 : t.hour % 12;
  return `${h}:${String(t.minute).padStart(2, '0')} ${t.hour < 12 ? 'AM' : 'PM'}`;
}
