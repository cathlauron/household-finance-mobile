import { useEffect, useRef } from 'react';
import { useData } from '../DataContext';
import { useHideAmounts } from '../hideAmounts';
import { widgetsAvailable } from './available';
import { makeWidgetSnapshot } from './widgetData';
import { saveWidgetSnapshot } from './snapshotStore';

// Keeps the home screen widgets up to date: a moment after the household changes (or Hide
// amounts is switched), the summary is worked out again and every placed widget redraws.
const SETTLE_MS = 1500; // not a motion: waits for a burst of saves to finish
export default function WidgetSync() {
  const { model } = useData();
  const { hidden } = useHideAmounts();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!widgetsAvailable()) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const snap = model ? makeWidgetSnapshot(model, { hidden }) : null;
      saveWidgetSnapshot(snap)
        .then(() => {
          const { requestWidgetUpdate } = require('react-native-android-widget');
          const { WIDGET_NAMES, widgetFor } = require('./FFWidgets');
          for (const name of WIDGET_NAMES) {
            requestWidgetUpdate({ widgetName: name, renderWidget: () => widgetFor(name, snap), widgetNotFound: () => {} }).catch?.(() => {});
          }
        })
        .catch(() => {});
    }, SETTLE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [model, hidden]);
  return null;
}

// Sign out / switch account: the widgets forget the numbers ("Open the app once").
export function clearWidgets() {
  if (!widgetsAvailable()) return;
  saveWidgetSnapshot(null)
    .then(() => {
      const { requestWidgetUpdate } = require('react-native-android-widget');
      const { WIDGET_NAMES, widgetFor } = require('./FFWidgets');
      for (const name of WIDGET_NAMES) requestWidgetUpdate({ widgetName: name, renderWidget: () => widgetFor(name, null), widgetNotFound: () => {} });
    })
    .catch(() => {});
}
