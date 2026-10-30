import React from 'react';
import { Text } from 'react-native';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { renderInApp } from './helpers/render';

// Cath, 2026-10-27 (BKK trip screenshot): a trip with an empty checklist showed no
// Checklist at all; the Budget page was cut off at To-do's (shorter) height. Both pages
// report their height in the same moment; on a phone a write to an animation value lands
// a moment later while a read sees the old value, so the second report wiped the first.
// This mock behaves like the phone: writes are applied a tick later.
jest.mock('react-native-reanimated', () => {
  const real = jest.requireActual('react-native-reanimated/mock');
  const React = require('react');
  return {
    ...real,
    interpolate: (x: number, i: number[], o: number[]) => o[0] + ((x - i[0]) / (i[1] - i[0])) * (o[1] - o[0]),
    useSharedValue: (init: any) =>
      React.useRef(
        (() => {
          let committed = init;
          return {
            get value() {
              return committed;
            },
            set value(v: any) {
              Promise.resolve().then(() => {
                committed = v;
              });
            },
          };
        })()
      ).current,
  };
});
jest.mock('../src/DataContext', () => {
  const React = require('react');
  return { QuietWhenHidden: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children) };
});

test('two pages reporting their height at once: neither height is lost', async () => {
  const SlidingPages = require('../src/components/SlidingPages').default;
  renderInApp(
    <SlidingPages
      inline
      testID="trip"
      options={[{ id: 'budget', label: 'Budget' }, { id: 'todo', label: 'To-do' }]}
      value="budget"
      onChange={() => {}}
      renderPage={(id: string) => <Text>{id}</Text>}
    />
  );
  fireEvent(screen.getByTestId('trip-viewport'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 100 } } });
  await act(async () => {});
  // Both pages report in the same moment: Budget 460 tall, To-do 210 tall.
  fireEvent(screen.getByTestId('trip-page-budget'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 460 } } });
  fireEvent(screen.getByTestId('trip-page-todo', { includeHiddenElements: true }), 'layout', { nativeEvent: { layout: { x: 390, y: 0, width: 390, height: 210 } } });
  await act(async () => {});
  // Redraw so the viewport's height is worked out again from what was stored.
  await act(async () => {
    fireEvent(screen.getByTestId('trip-viewport'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 391, height: 100 } } });
  });
  const style = [].concat(screen.getByTestId('trip-viewport').props.style).reduce((a: any, s: any) => ({ ...a, ...(s || {}) }), {});
  expect(style.height).toBe(460);
}, 20000);
