import { act, renderHook } from '@testing-library/react-native';
jest.mock('../src/navigation/LargeHeader', () => () => null);
jest.mock('../src/DataContext', () => ({ QuietWhenHidden: ({ children }: any) => children }));
import { useMainOnTop } from '../src/navigation/TabPage';

// Cath, 2026-11-06 (navigation map): a save froze the app while it redrew the tab hidden behind
// the Calendar. A tab under another page counts as hidden, so it updates as background work.
function parent(top: string) {
  let listener: () => void = () => {};
  let current = top;
  return {
    addListener: (_: string, l: () => void) => { listener = l; return () => {}; },
    getState: () => ({ index: 0, routes: [{ name: current }] }),
    go(name: string) { current = name; listener(); },
  };
}

test('the tabs are on top until a page opens over them, and again after it closes', () => {
  const p = parent('Main');
  const { result } = renderHook(() => useMainOnTop({ getParent: () => p }));
  expect(result.current).toBe(true);
  act(() => p.go('Calendar'));
  expect(result.current).toBe(false);
  act(() => p.go('Main'));
  expect(result.current).toBe(true);
});

test('with no parent (a check or a preview) the tab counts as on top', () => {
  const { result } = renderHook(() => useMainOnTop({}));
  expect(result.current).toBe(true);
});
