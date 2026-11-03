import React from 'react';
import { act, render } from '@testing-library/react-native';
import { Dimensions, Keyboard, Platform, ScrollView, TextInput, View } from 'react-native';

// Cath's video 2026-11-03 (trip to-do list, SwiftKey): tapping "Add to the list" opened the
// keyboard over the box; she had to scroll to see what she typed. Android's reported keyboard
// height leaves out keyboard toolbars and suggestion strips, and the box was only scrolled to
// 24 points above the reported top, so it sat behind the strip. Check: on Android the box ends
// up clear of a toolbar-and-suggestions-sized gap above the reported keyboard top.

test('Android: the box being typed in is scrolled well clear of the keyboard and its toolbar', async () => {
  Object.defineProperty(Platform, 'OS', { get: () => 'android', configurable: true });
  jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 360, height: 800, scale: 2, fontScale: 1 } as any);
  const handlers: Record<string, (e: any) => void> = {};
  jest.spyOn(Keyboard, 'addListener').mockImplementation(((ev: string, fn: any) => {
    handlers[ev] = fn;
    return { remove() {} };
  }) as any);
  const scrollTo = jest.spyOn(ScrollView.prototype as any, 'scrollTo').mockImplementation(() => {});
  // The box sits at 400-444 on screen; the scroll area fills the screen.
  (TextInput as any).State = { currentlyFocusedInput: () => ({ measureInWindow: (cb: any) => cb(0, 400, 300, 44) }) };
  jest.spyOn(ScrollView.prototype as any, 'measureInWindow').mockImplementation(function (cb: any) { cb(0, 0, 360, 800); });
  const { KeyboardAwareScrollView } = require('../src/components/KeyboardAwareScrollView');
  render(
    <KeyboardAwareScrollView>
      <View style={{ height: 1200 }} />
    </KeyboardAwareScrollView>,
  );
  jest.useFakeTimers();
  // Reported keyboard: 330 tall (top at 800 - 330 - 0 = 470).
  await act(async () => {
    handlers.keyboardDidShow({ endCoordinates: { screenY: 470, height: 330 } });
  });
  await act(async () => {
    jest.advanceTimersByTime(200);
  });
  const y = (scrollTo.mock.calls.at(-1)?.[0] as any)?.y ?? 0;
  // Box bottom 444 must move up to at least 470 - 96 = 374, so a scroll of 70 or more.
  expect(y).toBeGreaterThanOrEqual(70);
  jest.useRealTimers();
});
