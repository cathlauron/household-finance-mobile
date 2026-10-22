import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { todayISO } from './dateUtils';

// H-09 (2026-10-22): Home's numbers (Left to Spend, days to payday, due soon) and the
// bell's overdue list were worked out once and only again when the household data
// changed. Left open in the background overnight, the app still showed yesterday's view
// in the morning. useToday() gives today's local date ("YYYY-MM-DD") and changes when the
// date does: when the app comes back to the front, and at midnight while it's open.
// Anything worked out from "today" lists it as a dependency.

export function msUntilNextMidnight(now = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
  return Math.max(1000, next.getTime() - now.getTime());
}

export function useToday(): string {
  const [today, setToday] = useState(todayISO);
  useEffect(() => {
    const check = () => setToday((prev) => (todayISO() === prev ? prev : todayISO()));
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        check();
        arm();
      }, msUntilNextMidnight());
    };
    arm();
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') {
        check();
        arm();
      }
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, []);
  return today;
}
