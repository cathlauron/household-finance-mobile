// Shared type scale, built from the font sizes the app really uses
// (counts from an audit of src/: 11 x117, 13 x110, 12 x83, 14 x71, 15 x49,
// 17 x19, 22 x14, 18 x13, 16 x6). Use these for NEW code. Old screens are
// not migrated on purpose.
export const MIN_READABLE_FONT_SIZE = 11;

export const typography = {
  caption: 11,
  captionLarge: 12,
  bodySmall: 13,
  body: 14,
  bodyLarge: 15,
  subhead: 17,
  title: 18,
  display: 22,
} as const;
