import React from 'react';
import { fireEvent, screen, act } from '@testing-library/react-native';
import { SheetBar } from '../src/components/SimpleForm';
import { renderInApp } from './helpers/render';

// H-10 (2026-10-22): a quick second tap on Save / Add while the form was closing ran the
// save again, which could add the same entry twice (the pay sheet already had a guard for
// this; the other forms share this bar).
describe('Save / Add bar', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('a quick second tap does nothing', () => {
    const onDone = jest.fn();
    renderInApp(<SheetBar title="New bill" onCancel={() => {}} onDone={onDone} doneLabel="Add" />);
    fireEvent.press(screen.getByText('Add'));
    fireEvent.press(screen.getByText('Add'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  test('a tap a moment later works again (e.g. after fixing a mistake the form showed)', () => {
    const onDone = jest.fn();
    renderInApp(<SheetBar title="New bill" onCancel={() => {}} onDone={onDone} doneLabel="Add" />);
    fireEvent.press(screen.getByText('Add'));
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    fireEvent.press(screen.getByText('Add'));
    expect(onDone).toHaveBeenCalledTimes(2);
  });

  test('Cancel always works', () => {
    const onCancel = jest.fn();
    renderInApp(<SheetBar title="New bill" onCancel={onCancel} onDone={() => {}} doneLabel="Add" />);
    fireEvent.press(screen.getByText('Cancel'));
    fireEvent.press(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });
});
