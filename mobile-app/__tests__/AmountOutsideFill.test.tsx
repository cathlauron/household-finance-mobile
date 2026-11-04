import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';

// B-085 (Cath's video 2026-10-30): an amount filled in from outside (then by voice) didn't show
// while the amount box had the keyboard. Voice entry is gone (2026-11-04), but the amount box
// still has to show an amount set from outside (e.g. a category's usual amount), so this stays.
test('a focused amount box shows an amount filled in from outside', async () => {
  const AmountInput = require('../src/components/AmountInput').default;
  function Box() {
    const [v, setV] = React.useState<number | ''>('');
    return (
      <>
        <AmountInput testID="amt" value={v} onChangeAmount={setV} />
        <SetButton onPress={() => setV(250)} />
      </>
    );
  }
  const { Pressable, Text } = require('react-native');
  function SetButton({ onPress }: any) { return <Pressable testID="fill" onPress={onPress}><Text>fill</Text></Pressable>; }
  render(<ThemeProvider><Box /></ThemeProvider>);
  const input = screen.UNSAFE_root.findAll((n: any) => n.props?.onFocus && n.props?.onChangeText)[0];
  await act(async () => { input.props.onFocus(); });
  await act(async () => { fireEvent.press(screen.getByTestId('fill')); });
  const after = screen.UNSAFE_root.findAll((n: any) => n.props?.onFocus && n.props?.onChangeText)[0];
  expect(String(after.props.value)).toMatch(/250/);
});
