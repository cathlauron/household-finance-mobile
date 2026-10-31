// Pretend versions of phone-only parts, so screens can be checked on a computer.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
require('react-native-gesture-handler/jestSetup');

// Day & night (2026-10-31) makes a new person's app dark in the evening. Screen checks run at
// whatever time the computer says, so they start Light; the Day & night checks clear this to
// act as a new person. (Not storage: some checks bring their own pretend storage.)
process.env.FF_CHECK_START_LOOK = 'light';

// Icons: drawn as an empty box with the icon's name (the real ones need the phone's fonts).
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Icon = ({ name, testID }) => React.createElement(View, { testID: testID ?? `icon-${name}` });
  return new Proxy({}, { get: (_t, key) => (key === '__esModule' ? true : Icon) });
});

// Screen edges (notch, navigation bar): a standard phone shape.
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
