// Version 2.2 (approved P4): the phone's "Remove animations" / "Reduce motion" setting.
// Some people turn animations off because movement makes them dizzy; everything the app
// animates checks this and appears instantly instead.
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

let current = false;
const listeners = new Set<(v: boolean) => void>();
let started = false;

function start() {
  if (started) return;
  started = true;
  AccessibilityInfo.isReduceMotionEnabled()
    .then((v) => {
      current = !!v;
      listeners.forEach((fn) => fn(current));
    })
    .catch(() => {});
  AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
    current = !!v;
    listeners.forEach((fn) => fn(current));
  });
}

// For code outside React components (animations started from plain functions).
export function reduceMotionNow(): boolean {
  start();
  return current;
}

export function useReduceMotion(): boolean {
  start();
  const [v, setV] = useState(current);
  useEffect(() => {
    listeners.add(setV);
    setV(current);
    return () => {
      listeners.delete(setV);
    };
  }, []);
  return v;
}
