import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import AmountInput from '../src/components/AmountInput';

// Cath, 2026-10-27 (2.2 build): "allow copy and paste in the amount section". The big
// amount at the top of the forms hid the copy/paste menu. Both amount boxes now allow it,
// and a pasted amount like "₱1,500.50" is read as 1500.50.
for (const centered of [true, false]) {
  test(`${centered ? 'big' : 'small'} amount box: the copy/paste menu is allowed and a pasted "₱1,500.50" works`, () => {
    const change = jest.fn();
    render(
      <ThemeProvider>
        <AmountInput centered={centered} value="" onChangeAmount={change} />
      </ThemeProvider>,
    );
    const box = screen.UNSAFE_getAllByType(require('react-native').TextInput)[0];
    expect(box.props.contextMenuHidden).toBeFalsy();
    fireEvent.changeText(box, '₱1,500.50');
    expect(change).toHaveBeenLastCalledWith(1500.5);
  });
}
