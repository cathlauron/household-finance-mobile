import React, { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text, TouchableOpacity, TextInput } from 'react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// Cath, 2026-11-13: every add form keeps what was typed when it is closed by a tap outside it.
// One shared piece (useFormDraft + DraftBanner) does it for all of them.
const settle = () => act(async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); });

function Form({ editing = false }: { editing?: boolean }) {
  const { useFormDraft, DraftBanner } = require('../src/useFormDraft');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState('2026-11-14');
  const draft = useFormDraft('hooktest', { name: [name, setName], amount: [amount, setAmount], date: [date, setDate] }, { editing, typed: name.trim() !== '' || amount !== '' });
  return (
    <>
      <DraftBanner draft={draft} onStartOver={() => { setName(''); setAmount(''); }} />
      <TextInput testID="name" value={name} onChangeText={setName} />
      <Text testID="amount">{String(amount)}</Text>
      <Text testID="date">{date}</Text>
      <TouchableOpacity testID="set-amount" onPress={() => setAmount(450)}><Text>amount</Text></TouchableOpacity>
      <TouchableOpacity testID="restore" onPress={() => draft.restore()}><Text>restore</Text></TouchableOpacity>
      <TouchableOpacity testID="restore-keep-date" onPress={() => draft.restore(['date'])}><Text>restore2</Text></TouchableOpacity>
      <TouchableOpacity testID="keep" onPress={() => draft.keep()}><Text>keep</Text></TouchableOpacity>
      <TouchableOpacity testID="discard" onPress={() => draft.discard()}><Text>discard</Text></TouchableOpacity>
      <TouchableOpacity testID="used" onPress={() => draft.used()}><Text>used</Text></TouchableOpacity>
      <TouchableOpacity testID="other-date" onPress={() => setDate('2026-12-01')}><Text>date</Text></TouchableOpacity>
    </>
  );
}
const press = (id: string) => act(async () => { fireEvent.press(screen.getByTestId(id)); });
const mount = (editing = false) => render(<ThemeProvider><Form editing={editing} /></ThemeProvider>);

beforeEach(async () => { await require('../src/drafts').drafts.clear('hooktest'); });

test('kept on a tap outside, and the next form opens with it and says so', async () => {
  const first = mount();
  await act(async () => { fireEvent.changeText(screen.getByTestId('name'), 'Meralco'); });
  await press('set-amount');
  await press('keep');
  await settle();
  first.unmount();
  mount();
  expect(screen.queryByTestId('draft-banner')).toBeNull();
  await press('restore');
  await settle();
  expect(screen.getByTestId('name').props.value).toBe('Meralco');
  expect(screen.getByTestId('amount').props.children).toBe('450');
  expect(screen.getByTestId('draft-banner')).toBeTruthy();
});

test('Cancel and Add throw it away', async () => {
  for (const end of ['discard', 'used']) {
    const v = mount();
    await act(async () => { fireEvent.changeText(screen.getByTestId('name'), 'Gone'); });
    await press('keep');
    await settle();
    await press(end);
    await settle();
    v.unmount();
    mount();
    await press('restore');
    await settle();
    expect(screen.getByTestId('name').props.value).toBe('');
    expect(screen.queryByTestId('draft-banner')).toBeNull();
    screen.unmount();
  }
});

test('nothing typed: nothing kept. Editing something saved: never kept', async () => {
  const a = mount();
  await press('keep');
  await settle();
  a.unmount();
  const b = mount(true);
  await act(async () => { fireEvent.changeText(screen.getByTestId('name'), 'An edit'); });
  await press('keep');
  await settle();
  b.unmount();
  mount();
  await press('restore');
  await settle();
  expect(screen.getByTestId('name').props.value).toBe('');
});

test('Start over empties the form and forgets it; a day picked on the Calendar is kept', async () => {
  const a = mount();
  await act(async () => { fireEvent.changeText(screen.getByTestId('name'), 'Party'); });
  await press('keep');
  await settle();
  a.unmount();
  mount();
  await press('other-date');
  await press('restore-keep-date');
  await settle();
  expect(screen.getByTestId('name').props.value).toBe('Party');
  expect(screen.getByTestId('date').props.children).toBe('2026-12-01');
  await press('draft-start-over');
  await settle();
  expect(screen.getByTestId('name').props.value).toBe('');
  expect(screen.queryByTestId('draft-banner')).toBeNull();
  screen.unmount();
  mount();
  await press('restore');
  await settle();
  expect(screen.getByTestId('name').props.value).toBe('');
});

// One real form, start to finish: a new event.
let mockModel: any;
const mockProxy = () => new Proxy({}, { get: (_t, k) => (k === '__esModule' ? true : () => ({})) });
jest.mock('firebase/firestore', () => mockProxy());
jest.mock('firebase/auth', () => mockProxy());
jest.mock('firebase/app', () => mockProxy());
jest.mock('../src/firebase', () => ({ db: {}, auth: {} }));
jest.mock('../src/authFirebase', () => ({ getCurrentFirebaseUser: () => null }));
jest.mock('../src/DataContext', () => ({
  QuietWhenHidden: ({ children }: any) => children,
  useData: () => ({ model: mockModel, getModel: () => mockModel, saveModel: async (m: any) => { mockModel = m; }, isLinked: false, username: 'cath', isOnline: true, guest: false, refreshModel: async () => 'up_to_date' }),
  withTimeout: (p: any) => p,
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), setOptions: jest.fn(), addListener: () => () => {}, goBack: jest.fn(), push: jest.fn(), getState: () => ({ routes: [] }) }),
  useRoute: () => ({ name: 'Events', params: {} }),
  useFocusEffect: () => {},
  useIsFocused: () => true,
}));

test.each([
  ['EventsScreen', 'event', /Mama/],
  ['GoalsScreen', 'goal', /credit card/],
  ['TravelScreen', 'trip', /Baguio/],
  ['GroceriesScreen', 'grocery', /Rice/],
])('%s: a tap outside keeps the name, Cancel throws it away', async (file, key, placeholder) => {
  mockModel = defaultModel();
  await require('../src/drafts').drafts.clear(key);
  const Screen = require(`../src/screens/${file}`).default;
  let nonce = 1;
  const el = () => <ThemeProvider><Screen formOnly addDate="2026-11-20" addNonce={++nonce} onFormClosed={() => {}} onAdded={() => {}} /></ThemeProvider>;
  const view = render(el());
  await settle();
  await act(async () => { fireEvent.changeText(screen.getByPlaceholderText(placeholder), 'Kept name'); });
  await act(async () => { fireEvent.press(screen.getAllByLabelText('Close bottom sheet').pop()!); });
  await settle();
  view.rerender(el());
  await settle();
  expect(screen.getByPlaceholderText(placeholder).props.value).toBe('Kept name');
  expect(screen.getByTestId('draft-banner')).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getAllByText('Cancel').pop()!); });
  await settle();
  view.rerender(el());
  await settle();
  expect(screen.getByPlaceholderText(placeholder).props.value).toBe('');
  expect(screen.queryByTestId('draft-banner')).toBeNull();
}, 30000);
