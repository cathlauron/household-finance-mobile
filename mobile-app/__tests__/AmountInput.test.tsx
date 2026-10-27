import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import AmountInput from '../src/components/AmountInput';
import { renderInApp } from './helpers/render';

// The small amount box (plain, not the big centred one).
describe('AmountInput (plain box)', () => {
  test('typing an amount with commas gives the plain number', () => {
    const onChange = jest.fn();
    renderInApp(<AmountInput value="" onChangeAmount={onChange} placeholder="Amount" />);
    fireEvent.changeText(screen.getByPlaceholderText('Amount'), '1,234.5');
    expect(onChange).toHaveBeenLastCalledWith(1234.5);
  });

  test('only two decimal places are kept', () => {
    const onChange = jest.fn();
    renderInApp(<AmountInput value="" onChangeAmount={onChange} placeholder="Amount" />);
    fireEvent.changeText(screen.getByPlaceholderText('Amount'), '10.999');
    expect(onChange).toHaveBeenLastCalledWith(10.99);
  });

  test('clearing the box gives an empty amount, not zero', () => {
    const onChange = jest.fn();
    renderInApp(<AmountInput value={50} onChangeAmount={onChange} placeholder="Amount" />);
    fireEvent.changeText(screen.getByPlaceholderText('Amount'), '');
    expect(onChange).toHaveBeenLastCalledWith('');
  });

  test('the ± button turns the amount negative when allowed', () => {
    const onChange = jest.fn();
    renderInApp(<AmountInput value="" onChangeAmount={onChange} placeholder="Amount" allowNegative />);
    fireEvent.changeText(screen.getByPlaceholderText('Amount'), '300');
    fireEvent.press(screen.getByLabelText('Switch between positive and negative'));
    expect(onChange).toHaveBeenLastCalledWith(-300);
  });

  test('shows a saved amount with commas', () => {
    renderInApp(<AmountInput value={1500000} onChangeAmount={() => {}} placeholder="Amount" />);
    expect(screen.getByDisplayValue('1,500,000')).toBeTruthy();
  });
});
