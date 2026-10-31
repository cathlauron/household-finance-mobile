import { Platform } from 'react-native';

// Cath's phone test 2026-10-30 (TEST-3 s19): typing a code in small letters added extra
// letters ("aah" became "AAHAA-AAHA"). Android keyboards (SwiftKey, Gboard) keep a word
// "being typed" and send it again when the app changes the text (to capitals, adding the
// dash). Every code box uses these: the keyboard types plain letters with no suggestions,
// so the code can be typed in small or capital letters and comes out right either way.
export const CODE_INPUT = {
  autoCapitalize: 'characters' as const,
  autoCorrect: false,
  autoComplete: 'off' as const,
  spellCheck: false,
  importantForAutofill: 'no' as const,
  keyboardType: (Platform.OS === 'android' ? 'visible-password' : 'default') as 'visible-password' | 'default',
};
