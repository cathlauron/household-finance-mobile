import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// B-068 (Cath's phone video, 2026-10-30): at rest the Dark mode sticker was drawn half peeled
// ("☀ Lark": Light on the left, Dark showing through on the right). Its finger point came from
// values made when the app loaded (starting at -1, -1) and on the phone it never got its real
// starting corner. Check: from the very first drawing, every sticker lies flat (its "still
// stuck down" shape is the whole sticker).
let mockModel: any;
jest.mock('../src/DataContext', () => ({
  QuietWhenHidden: ({ children }: any) => children,
  useData: () => ({ model: mockModel, getModel: () => mockModel, saveModel: async () => {}, isLinked: false, username: 'cath' }),
  withTimeout: (p: any) => p,
}));

function keepShapes(): string[] {
  // The "still stuck down" shape of each sticker: the path inside its clip named k…
  const clips = screen.UNSAFE_root.findAll((n: any) => typeof n.type !== 'string' && n.props?.id && /^k/.test(String(n.props.id)) && n.props.children);
  return clips.map((clip: any) => {
    const path = clip.findAll((n: any) => n.props && (n.props.d !== undefined || n.props.animatedProps))[0];
    const ap: any = path?.props?.animatedProps;
    return String(path?.props?.d ?? ap?.initial?.value?.d ?? JSON.stringify(Object.keys(ap ?? {})));
  });
}

test('every Appearance sticker lies flat when the page opens (the Dark mode one too)', () => {
  mockModel = defaultModel();
  const AppearancePage = require('../src/screens/AppearancePage').default;
  render(<ThemeProvider><AppearancePage /></ThemeProvider>);
  // 2026-10-30 (Cath's video, "cropped"): at rest no sticker is drawn through the animated
  // "still stuck down" clip at all (it could stay cut to an old shape on Android); each face
  // is drawn whole, clipped only to its own rounded rectangle.
  expect(keepShapes().length).toBe(0);
  const whole = screen.UNSAFE_root.findAll((n: any) => typeof n.props?.clipPath === 'string' && /^url\(#s[op]/.test(n.props.clipPath) && typeof n.type !== 'string');
  expect(whole.length).toBe(14);
});
