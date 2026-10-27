// 2026-10-26 (Cath's recording: a still Home with its own tab bar behind every sliding
// page). In this version of the navigation library, "go to Main" from a page on top
// (the Calendar, Search, a card page...) ADDS a second Main on top instead of going back
// to the one underneath. Two full copies of the tabs then sit in the stack, and the old
// one (on Home) shows through the see-through pages while they slide.
// Always go BACK to the existing Main (closing whatever is on top of it), then show the
// tab asked for. Use this everywhere instead of navigate('Main', ...).
export type MainTarget = { screen?: string; params?: object; openBillId?: string };

// Code reviewer, 2026-10-27: Main's other settings (a bill opened from a reminder) are kept
// (`merge`); only which tab to show is replaced. Replacing everything rebuilt all four tabs.
export function goToMain(navigation: { navigate: (...args: any[]) => void }, target?: MainTarget): void {
  navigation.navigate('Main', { screen: undefined, params: undefined, ...target }, { pop: true, merge: true });
}
