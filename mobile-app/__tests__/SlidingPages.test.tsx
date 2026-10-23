import React, { useState } from 'react';
import { Text } from 'react-native';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { State } from 'react-native-gesture-handler';
import SlidingPages from '../src/components/SlidingPages';
import { useArrival } from '../src/useArrival';
import { renderInApp } from './helpers/render';

jest.mock('../src/DataContext', () => {
  const React = require('react');
  return { QuietWhenHidden: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children) };
});

// Smoothness 2026-10-23 (Cath picked "follows your finger" for every page with sub-pages).

type Id = 'bills' | 'debts' | 'loans';
const OPTIONS: { id: Id; label: string; testID: string }[] = [
  { id: 'bills', label: 'Bills', testID: 'tab-bills' },
  { id: 'debts', label: 'Debts', testID: 'tab-debts' },
  { id: 'loans', label: 'Loans', testID: 'tab-loans' },
];

function List({ ids }: { ids: string[] }) {
  const glow = useArrival(ids);
  return <Text testID="glow">{glow ?? 'none'}</Text>;
}

let changes: Id[] = [];
let setDebtIds: (ids: string[]) => void = () => {};
function Harness({ start = 'bills' as Id }) {
  const [value, setValue] = useState<Id>(start);
  const [debtIds, setIds] = useState<string[]>(['d1']);
  setDebtIds = setIds;
  return (
    <SlidingPages<Id>
      testID="pages"
      options={OPTIONS}
      value={value}
      onChange={(id) => {
        changes.push(id);
        setValue(id);
      }}
      renderPage={(id) => (id === 'debts' ? <List ids={debtIds} /> : <Text>{id} page</Text>)}
    />
  );
}

function measure() {
  fireEvent(screen.getByTestId('pages-viewport'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 700 } } });
}
function swipe(dx: number, vx = 0) {
  fireGestureHandler(getByGestureTestId('pages-pan'), [
    { state: State.BEGAN, translationX: 0 },
    { state: State.ACTIVE, translationX: dx / 2 },
    { state: State.ACTIVE, translationX: dx },
    { state: State.END, translationX: dx, velocityX: vx },
  ]);
}
const shown = (id: Id) => screen.getByTestId(`pages-page-${id}`, { includeHiddenElements: true }).props.accessibilityElementsHidden === false;
// What a swipe decides reaches the screen a moment later (from the animation thread).
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

beforeEach(() => {
  changes = [];
});

test('tapping a choice shows that page', () => {
  renderInApp(<Harness />);
  measure();
  fireEvent.press(screen.getByTestId('tab-debts'));
  expect(changes).toEqual(['debts']);
  expect(shown('debts')).toBe(true);
  expect(shown('bills')).toBe(false);
});

test('swiping left a good way turns to the next page', async () => {
  renderInApp(<Harness />);
  measure();
  swipe(-200);
  await settle();
  expect(changes).toEqual(['debts']);
});

test('a short slow swipe stays on the same page', async () => {
  renderInApp(<Harness />);
  measure();
  swipe(-50, -100);
  await settle();
  expect(changes).toEqual([]);
});

test('swiping past the last page bounces back and changes nothing', async () => {
  renderInApp(<Harness start="loans" />);
  measure();
  swipe(-300, -2000);
  await settle();
  expect(changes).toEqual([]);
  expect(shown('loans')).toBe(true);
});

test('a new row on a page you cannot see only lights up once that page is showing', async () => {
  renderInApp(<Harness />);
  measure();
  fireEvent.press(screen.getByTestId('tab-debts'));
  fireEvent.press(screen.getByTestId('tab-bills'));
  act(() => setDebtIds(['d1', 'd2']));
  expect(screen.getByTestId('glow', { includeHiddenElements: true }).props.children).toBe('none');
  fireEvent.press(screen.getByTestId('tab-debts'));
  expect(screen.getByTestId('glow').props.children).toBe('d2');
});

// Cath, 2026-10-23 afternoon: on To-Pay, past Loans (or before Bills) the next main tab
// comes in with your finger, and letting go far enough goes there.
describe('To-Pay: past the ends, the main tabs take over', () => {
  const { tabDrag } = require('../src/navigation/tabDrag');
  let went: number[] = [];
  function TabsHarness({ start = 'loans' as Id }) {
    const [value, setValue] = useState<Id>(start);
    return (
      <SlidingPages<Id>
        testID="pages"
        options={OPTIONS}
        value={value}
        onChange={(id) => {
          changes.push(id);
          setValue(id);
        }}
        edgeToTabs={{ index: 2, count: 4, go: (d) => went.push(d) }}
        renderPage={(id) => <Text>{id} page</Text>}
      />
    );
  }
  function dragOnly(dx: number) {
    fireGestureHandler(getByGestureTestId('pages-pan'), [
      { state: State.BEGAN, translationX: 0 },
      { state: State.ACTIVE, translationX: dx / 2 },
      { state: State.ACTIVE, translationX: dx },
    ]);
  }
  beforeEach(() => {
    went = [];
    tabDrag.setValue(0);
  });

  test('past Loans the drag moves the tabs (Plan comes in with the finger)', async () => {
    const tabs = require('../src/navigation/tabDrag');
    const spy = jest.spyOn(tabs, 'setTabDrag');
    renderInApp(<TabsHarness />);
    measure();
    dragOnly(-150);
    await settle();
    // While the finger was down, the tabs were moved by the drag past Loans.
    expect(Math.min(...spy.mock.calls.map((c: any[]) => c[0]))).toBeLessThan(-100);
    spy.mockRestore();
  });

  test('let go past Loans far enough: goes to the next tab; the sub-page stays Loans', async () => {
    renderInApp(<TabsHarness />);
    measure();
    swipe(-200);
    await settle();
    expect(went).toEqual([1]);
    expect(changes).toEqual([]);
  });

  test('before Bills: goes to the previous tab', async () => {
    renderInApp(<TabsHarness start="bills" />);
    measure();
    swipe(200);
    await settle();
    expect(went).toEqual([-1]);
  });

  test('a short drag past Loans goes nowhere', async () => {
    renderInApp(<TabsHarness />);
    measure();
    swipe(-40, -100);
    await settle();
    expect(went).toEqual([]);
  });

  test('in the middle, swipes still turn the sub-page (tabs untouched)', async () => {
    renderInApp(<TabsHarness start="debts" />);
    measure();
    swipe(-200);
    await settle();
    expect(changes).toEqual(['loans']);
    expect(went).toEqual([]);
  });
});
