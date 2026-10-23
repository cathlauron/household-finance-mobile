import React from 'react';
import { Text } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import FormSwapFade, { dipFormFields, formSwitching } from '../src/components/FormSwapFade';
import StepSlide from '../src/components/StepSlide';

// Smoothness 2026-10-23 (Cath): form switches fade their fields; set-up steps slide like
// pages; with the phone set to remove animations everything changes at once.
let mockReduce = false;
jest.mock('../src/reduceMotion', () => ({ useReduceMotion: () => mockReduce, reduceMotionNow: () => mockReduce }));

beforeEach(() => {
  jest.useFakeTimers();
  mockReduce = false;
});
afterEach(() => jest.useRealTimers());

test('a form switch changes the form only once its fields have faded out', () => {
  const change = jest.fn();
  render(
    <FormSwapFade channels={['kind']} swapKey="bills">
      <Text>fields</Text>
    </FormSwapFade>,
  );
  act(() => dipFormFields('kind', change));
  expect(change).not.toHaveBeenCalled();
  act(() => jest.advanceTimersByTime(400));
  expect(change).toHaveBeenCalledTimes(1);
  // While the new form arrives, the pop-up knows a switch is happening (its height glides).
  expect(formSwitching()).toBe(true);
});

test('with Remove animations on, the form changes straight away', () => {
  mockReduce = true;
  const change = jest.fn();
  act(() => dipFormFields('kind', change));
  expect(change).toHaveBeenCalledTimes(1);
});

test('the set-up steps: the new step shows, the old one slides away and is then gone', () => {
  const r = render(
    <StepSlide stepKey="1" order={1}>
      <Text>step one</Text>
    </StepSlide>,
  );
  r.rerender(
    <StepSlide stepKey="2" order={2}>
      <Text>step two</Text>
    </StepSlide>,
  );
  expect(screen.getByText('step two')).toBeTruthy();
  // Mid-slide both are drawn side by side.
  expect(screen.queryByText('step one')).toBeTruthy();
  act(() => jest.advanceTimersByTime(600));
  expect(screen.queryByText('step one')).toBeNull();
});

test('set-up steps with Remove animations on: the old step goes at once', () => {
  mockReduce = true;
  const r = render(
    <StepSlide stepKey="1" order={1}>
      <Text>step one</Text>
    </StepSlide>,
  );
  r.rerender(
    <StepSlide stepKey="2" order={2}>
      <Text>step two</Text>
    </StepSlide>,
  );
  expect(screen.queryByText('step one')).toBeNull();
});
