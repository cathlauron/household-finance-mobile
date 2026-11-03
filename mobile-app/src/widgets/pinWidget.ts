import { widgetsAvailable } from './available';
import type { WidgetName } from './FFWidgets';

// Cath, 2026-11-03 (mockup W1): add a widget from inside the app. Android shows its own
// "Add to home screen?" box; the library's answer only says that box was shown, so the page
// checks which widgets are really on the home screen instead of trusting it.
// The widget library is loaded only when its phone-side part exists (never in Expo Go).

function lib(): any | null {
  if (!widgetsAvailable()) return null;
  try {
    return require('react-native-android-widget');
  } catch {
    return null;
  }
}

export function canPinWidgets(): boolean {
  return !!lib();
}

// true: the phone showed its "Add to home screen?" box; false: this phone or launcher can't.
export async function pinWidget(name: WidgetName): Promise<boolean> {
  const l = lib();
  if (!l?.requestPinWidget) return false;
  try {
    return !!(await l.requestPinWidget({ widgetName: name }));
  } catch {
    return false;
  }
}

// Which of these widgets are on the home screen right now.
export async function widgetsOnHomeScreen(names: readonly WidgetName[]): Promise<Set<WidgetName>> {
  const l = lib();
  const out = new Set<WidgetName>();
  if (!l?.getWidgetInfo) return out;
  await Promise.all(
    names.map(async (n) => {
      try {
        const list = await l.getWidgetInfo(n);
        if (Array.isArray(list) && list.length > 0) out.add(n);
      } catch {}
    }),
  );
  return out;
}
