// H-49 (Cath, 2026-10-29): "for anything that would be deleted, or a similar action, make sure
// to ask for a confirmation first." Every button that removes or clears something must ask
// first: its onPress calls askToRemove(...) / Alert.alert(...), directly or in the function it
// calls. A new Remove / Delete / Clear button that doesn't ask makes this check fail.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const dirs = ['../src/screens/', '../src/components/'];
// A real question: askToRemove(...), or an Alert with a red (destructive) choice. An error
// message (Alert.alert(...alertDidntWork(...))) is not a confirmation.
const ASKS = /askToRemove\(|style: 'destructive'|setMemberToRemove|setOpen\(true\)/;
// Not removing anything the person saved: clearing a search box or a filter chip.
const NOT_DATA = /Clear search|Clear filter|Show all|clear the date|Dismiss/i;
// Buttons that only call the onDelete they were given: checked by the swipe test below.
const PASSES_ON = /^onDelete$|swipeableRef\.current\?\.close\(\)[\s\S]*onDelete\(\)/;

function handlerBody(src, name) {
  const m = new RegExp(`(function ${name}\\b|const ${name} = )`).exec(src);
  if (!m) return '';
  const body = src.slice(m.index, m.index + 2500);
  const next = /\n  (async )?function \w+|\n  const \w+ = \(/.exec(body.slice(20));
  return next ? body.slice(0, 20 + next.index) : body;
}

test('H-49: every Remove / Delete / Clear button asks first', () => {
  const missing = [];
  for (const d of dirs) {
    const dir = new URL(d, import.meta.url);
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.tsx'))) {
      const src = readFileSync(new URL(f, dir), 'utf8');
      // Each touchable: its onPress and its label / visible words.
      // A TouchableOpacity runs to its closing tag (icons inside close with "/>" too).
      const re = /<TouchableOpacity\b[\s\S]*?<\/TouchableOpacity>|<(Button|DeleteRow|PlainRow)\b[\s\S]*?\/>/g;
      let m;
      while ((m = re.exec(src))) {
        const block = m[0];
        // An icon-only remove button (close / trash icon) counts too, label or not.
        const iconOnly = /<Ionicons name="(close|close-circle|close-circle-outline|trash|trash-outline)"/.test(block) && !/<Text/.test(block);
        if (iconOnly && !/accessibilityLabel/.test(block)) missing.push(`${f}: an icon-only remove button with no label: ${block.slice(0, 90)}`);
        const label = (/accessibilityLabel=\{?[`'"]([^`'"]*)/.exec(block) || [])[1] || '';
        const words = (/label=["']([^"']*)/.exec(block) || [])[1] || (/<Text[^>]*>([^<{]*)/.exec(block) || [])[1] || '';
        const what = `${label} ${words}`.trim();
        if (!/^(Remove|Delete|Clear)\b/.test(label) && !/^(Remove|Delete|Clear)\b/.test(words.trim())) continue;
        if (NOT_DATA.test(what)) continue;
        const onPress = (/onPress=\{([\s\S]*?)\}\s*(accessibility|style|hitSlop|testID|>|variant|label|\/)/.exec(block) || [])[1] || '';
        if (ASKS.test(onPress) || PASSES_ON.test(onPress.trim())) continue;
        const called = /^\(\) => (?:\w+\.)?(\w+)\(|^(\w+)$/.exec(onPress.trim());
        const name = called && (called[1] || called[2]);
        if (name && ASKS.test(handlerBody(src, name))) continue;
        missing.push(`${f}: "${what}" -> ${onPress.trim().slice(0, 80)}`);
      }
    }
  }
  assert.deepEqual(missing, []);
});

// The swipe's red Delete only calls the row's onDelete: every screen's onDelete must ask.
test('H-49: every swipe-to-delete asks first', () => {
  const missing = [];
  const dir = new URL('../src/screens/', import.meta.url);
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.tsx'))) {
    const src = readFileSync(new URL(f, dir), 'utf8');
    for (const m of src.matchAll(/onDelete=\{(?:\(\) => )?([\w.]+)/g)) {
      const name = m[1] === 'swipeDeleteRef.current' ? 'handleSwipeDelete' : m[1].split('.').pop();
      if (!ASKS.test(handlerBody(src, name))) missing.push(`${f}: ${name}`);
    }
  }
  assert.deepEqual(missing, []);
});
