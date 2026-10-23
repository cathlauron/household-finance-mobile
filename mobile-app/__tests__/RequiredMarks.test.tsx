import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, screen } from '@testing-library/react-native';
import { MarkedLabel } from '../src/components/MarkedLabel';
import { ThemeProvider } from '../src/ThemeContext';

// Cath, 2026-10-23 ("i want both 1 and 3"): every field in every form says whether it is
// needed. Red * = required, grey "(optional)" = can stay empty. On/off switches get neither.

test('a required field shows a red * and reads "required" to a screen reader', () => {
  render(<ThemeProvider><MarkedLabel text="Name" mark="required" /></ThemeProvider>);
  expect(screen.getByText(' *')).toBeTruthy();
  expect(screen.getByLabelText('Name, required')).toBeTruthy();
  expect(screen.queryByText(' (optional)')).toBeNull();
});

test('an optional field shows a grey "(optional)"', () => {
  render(<ThemeProvider><MarkedLabel text="Note" mark="optional" /></ThemeProvider>);
  expect(screen.getByText(' (optional)')).toBeTruthy();
  expect(screen.getByLabelText('Note, optional')).toBeTruthy();
  expect(screen.queryByText(' *')).toBeNull();
});

// Every shared form row in the app's screens carries a mark. A new field without one
// fails here, so the marks can't quietly go missing again.
const ROWS = ['InputRow', 'AmountRow', 'BigAmount', 'InlineField', 'InlineAmount', 'AccountPicker'];
// Rows that are settings or buttons, not form fields (they never block a Save), and
// boxes inside a row that already carries the mark ("Or type your own", custom split
// amounts): they are the same field typed another way.
const NOT_FIELDS = [
  /label="\+ Add item"/, /label="Watch a category"/, /label="Monthly budget"/,
  /<InlineField label=\{label\} value=\{text\}/, /label="Or type a name"/, /value=\{custom\[p\.id\]/,
];

function screenFiles(dir: string): string[] {
  return fs.readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) return screenFiles(p);
    return /\.tsx$/.test(f) ? [p] : [];
  });
}

test('every form field in every screen is marked required or optional', () => {
  const missing: string[] = [];
  const dirs = [path.join(__dirname, '../src/screens'), path.join(__dirname, '../src/components')];
  for (const file of dirs.flatMap(screenFiles)) {
    const src = fs.readFileSync(file, 'utf8');
    for (const row of ROWS) {
      const re = new RegExp(`<${row}\\b`, 'g');
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) {
        // The opening tag runs to the first "/>" or ">" that ends it at depth 0 of braces.
        let depth = 0;
        let i = m.index + 1;
        for (; i < src.length; i++) {
          const c = src[i];
          if (c === '{') depth++;
          else if (c === '}') depth--;
          else if (c === '>' && depth === 0 && src[i - 1] !== '=') break;
        }
        const tag = src.slice(m.index, i + 1);
        if (/\bmark=/.test(tag)) continue;
        if (NOT_FIELDS.some((n) => n.test(tag))) continue;
        const line = src.slice(0, m.index).split('\n').length;
        missing.push(`${path.relative(path.join(__dirname, '..'), file)}:${line} <${row}>`);
      }
    }
  }
  expect(missing).toEqual([]);
});
