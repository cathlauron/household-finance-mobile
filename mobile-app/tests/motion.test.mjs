import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Smoothness check (2026-10-23, Cath: "everything should move the same way, and smoothly").
// Reads the app's source and fails when something moves in a way that breaks the house
// rules in .claude/skills/finance-flow-smoothness-check/SKILL.md.

const here = path.dirname(new URL(import.meta.url).pathname);
const src = path.join(here, '..', 'src');
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return walk(p);
    return /\.(ts|tsx)$/.test(d.name) ? [p] : [];
  });
}
const files = walk(src).map((p) => ({ name: path.relative(src, p).split(path.sep).join('/'), text: fs.readFileSync(p, 'utf8') }));
const code = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const ANIMATES = /Animated\.(timing|spring|loop|decay)|withTiming|withSpring|withRepeat|withDecay|LayoutAnimation\.configureNext/;
const REDUCE = /reduceMotion|useReduceMotion|reduceSV|isReduceMotionEnabled/;

// Moving things that may ignore Reduce Motion, and why. Anything new must check it.
const REDUCE_OK = {
  'components/BusyOverlay.tsx': 'busy indicator: shows the app is working',
  'components/DrawingLogo.tsx': 'busy indicator: shows the app is working',
  'components/SavedToast.tsx': 'fade only, nothing moves across the screen',
  'components/CenteredAmount.tsx': 'the typing cursor blinking, not movement',
  'components/FallingLeaves.tsx': 'LeafBackground only shows it with Reduce Motion off',
  'components/FallingRain.tsx': 'SkyGlow only shows it with Reduce Motion off',
};

// Files that still type their own speeds for their own special motion (logo, leaves, the
// wallet cards...). Everything else uses the shared values in src/motion.ts.
const OWN_TIMING_OK = new Set([
  'components/BusyOverlay.tsx',
  'components/DrawingLogo.tsx',
  'components/FallingLeaves.tsx',
  'components/FallingRain.tsx',
  'components/HomeWallet.tsx',
  'components/LeafTick.tsx',
  'components/Button.tsx',
  'components/ArrivalGlow.tsx',
  'components/SavedToast.tsx',
  'components/CenteredAmount.tsx',
  'components/RowInteractionPreview.tsx',
  'components/OfflineBanner.tsx',
  'components/SwipeableRow.tsx',
  'screens/IntroScreen.tsx',
  'screens/SearchScreen.tsx',
  'useArrival.ts',
]);

test('the shared motion values exist', async () => {
  const m = await import('../src/motion.ts');
  assert.deepEqual([...m.CURVE], [0.32, 0.72, 0, 1]);
  assert.equal(m.TAB_MS, 240);
  assert.equal(m.PAGE_OPEN_MS, 280);
  assert.equal(m.PAGE_BACK_MS, 240);
  assert.equal(m.SHEET_OPEN_MS, 280);
  assert.equal(m.SHEET_CLOSE_MS, 240);
});

test('the house curve is never typed out by hand (it comes from motion.ts)', () => {
  const bad = files.filter((f) => f.name !== 'motion.ts' && /bezier\(\s*0\.32\s*,\s*0\.72\s*,\s*0\s*,\s*1\s*\)/.test(code(f.text)));
  assert.deepEqual(bad.map((f) => f.name), []);
});

test('the tabs, pages and sheets take their speeds from motion.ts', () => {
  for (const name of ['navigation/TabPage.tsx', 'navigation/RootStack.tsx', 'components/BottomSheet.tsx']) {
    const f = files.find((x) => x.name === name);
    assert.ok(f, name);
    assert.match(f.text, /from '\.\.\/motion'/, `${name} should import ../motion`);
  }
});

test('no animation runs on the slow (JavaScript) side', () => {
  const bad = files.filter((f) => /useNativeDriver:\s*false/.test(code(f.text)));
  assert.deepEqual(bad.map((f) => f.name), []);
});

test('everything that moves respects Reduce Motion', () => {
  const bad = files.filter((f) => ANIMATES.test(code(f.text)) && !REDUCE.test(f.text) && !REDUCE_OK[f.name]);
  assert.deepEqual(bad.map((f) => f.name), []);
});

test('no new file types its own animation speed', () => {
  const bad = files.filter(
    (f) => f.name !== 'motion.ts' && !OWN_TIMING_OK.has(f.name) && /duration:\s*[1-9]\d*/.test(code(f.text))
  );
  assert.deepEqual(bad.map((f) => f.name), []);
});

// Cath, 2026-10-23: every page with sub-pages slides the same way (follows your finger),
// through the one shared component. Pages are added here as they move over.
const SLIDING = ['screens/ToPayScreen.tsx'];
test('pages with sub-pages slide through SlidingPages (not their own switch)', () => {
  for (const name of SLIDING) {
    const f = files.find((x) => x.name === name);
    assert.ok(f, name);
    assert.match(f.text, /<SlidingPages</, `${name} should use SlidingPages`);
    assert.doesNotMatch(code(f.text), /<SwipeTabs\s+inner/, `${name} should not keep its own sub-page swipe`);
  }
});

test('swiping past the last sub-page never jumps to another main tab', () => {
  for (const name of SLIDING) {
    const f = files.find((x) => x.name === name);
    assert.doesNotMatch(code(f.text), /navigate\(d > 0 \?/, name);
  }
});
