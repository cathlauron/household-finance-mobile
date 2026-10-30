import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderInApp } from './helpers/render';
import Button from '../src/components/Button';

// B-058 (2026-10-29): a quick double tap on a Save button saves once (Transactions saved twice).
test('two quick taps on a Button run it once; a later tap works again', () => {
  const onPress = jest.fn();
  renderInApp(<Button label="Save" onPress={onPress} testID="b" />);
  fireEvent.press(screen.getByTestId('b'));
  fireEvent.press(screen.getByTestId('b'));
  expect(onPress).toHaveBeenCalledTimes(1);
  const real = Date.now;
  Date.now = () => real() + 1000;
  fireEvent.press(screen.getByTestId('b'));
  Date.now = real;
  expect(onPress).toHaveBeenCalledTimes(2);
});
