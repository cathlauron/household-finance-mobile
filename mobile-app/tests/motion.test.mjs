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

test('Search drops down with the house curve and speeds (Cath, 2026-10-23)', () => {
  const f = files.find((x) => x.name === 'screens/SearchScreen.tsx');
  assert.doesNotMatch(code(f.text), /bezier\(\s*0\.2[23]/);
  assert.match(f.text, /SHEET_OPEN_MS/);
  assert.match(f.text, /SHEET_CLOSE_MS/);
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
const SLIDING = [
  'screens/ToPayScreen.tsx',
  'screens/SavingsScreen.tsx',
  'screens/GroceriesScreen.tsx',
  'screens/EventsScreen.tsx',
  'screens/TravelScreen.tsx',
];
test('pages with sub-pages slide through SlidingPages (not their own switch)', () => {
  for (const name of SLIDING) {
    const f = files.find((x) => x.name === name);
    assert.ok(f, name);
    assert.match(f.text, /<SlidingPages</, `${name} should use SlidingPages`);
    // Travel keeps a page-wide swipe for touches outside the Budget / To-do area.
    if (name !== 'screens/TravelScreen.tsx') assert.doesNotMatch(code(f.text), /<SwipeTabs[\s>]/, `${name} should not keep its own sub-page swipe`);
  }
});

// Cath, 2026-10-23 morning: past the ends, a soft bounce. Afternoon, for To-Pay (a main
// tab): past Loans / before Bills the next main tab follows your finger instead. Pages
// that aren't main tabs keep the bounce.
test('past the last sub-page: To-Pay hands over to the main tabs, other pages bounce', () => {
  for (const name of SLIDING) {
    const f = files.find((x) => x.name === name);
    assert.doesNotMatch(code(f.text), /navigate\(d > 0 \?/, name);
    if (name === 'screens/ToPayScreen.tsx') assert.match(code(f.text), /edgeToTabs=/, name);
    else assert.doesNotMatch(code(f.text), /edgeToTabs=/, name);
  }
});

// 2026-10-23 (frame recorder): a finger swipe between main tabs brought in an empty page
// (the next tab wasn't built yet) and, at let-go, pages overlapped for a frame (positions
// were set after drawing). Keep both fixes.
test('main tabs: the other tabs are always built (with a time limit), positions set before drawing', () => {
  const tabs = files.find((f) => f.name === 'navigation/MainTabs.tsx');
  const page = files.find((f) => f.name === 'navigation/TabPage.tsx');
  assert.match(code(tabs.text), /preload/);
  assert.match(code(tabs.text), /setTimeout\(build, \d+\)/, 'preload needs a time-limit fallback');
  assert.match(code(page.text), /useLayoutEffect\(\(\) => \{\s*const before = lastPlace\.current/, 'TabPage must place pages in a layout effect');
});

test('sub-pages beside the one showing are built with a time limit too', () => {
  const f = files.find((x) => x.name === 'components/SlidingPages.tsx');
  assert.match(code(f.text), /setTimeout\(\(\) => setWarm\(true\), \d+\)/);
});

// 2026-10-23: whole screens dip in ONE animation (two in a row left the screen empty for
// 130-150 ms while other work squeezed in between).
test('whole-screen changes: one animation for the whole dip', () => {
  const f = files.find((x) => x.name === 'components/ScreenSwap.tsx');
  assert.match(f.text, /duration: DIP_MS \+ FADE_IN_MS/);
  // 2026-10-26: and the old screen is removed by the clock too (never two apps at once).
  assert.match(f.text, /setTimeout\([\s\S]*finish\(\)[\s\S]*DIP_MS \+ FADE_IN_MS/);
});

// Cath, 2026-10-23: calendar + > add > straight to the right screen, smoothly. The form
// and the Calendar leave together (no wait in between), and the tab / sub-page switch
// underneath happens at once, out of sight.
test('calendar add: leaves at once, the switch underneath is quiet', () => {
  const cal = files.find((f) => f.name === 'screens/CalendarScreen.tsx');
  const body = code(cal.text).split('function afterFormAdded')[1].split('function goToList')[0];
  assert.doesNotMatch(body, /setTimeout/, 'no wait before going to the list');
  assert.match(body, /quietMovesFor\(/);
  for (const name of ['navigation/TabPage.tsx', 'components/SlidingPages.tsx']) {
    assert.match(code(files.find((f) => f.name === name).text), /movesQuiet\(\)/, name);
  }
});

test('a sheet taking another sheet\'s place grows from its height (no jump)', () => {
  const f = files.find((x) => x.name === 'components/BottomSheet.tsx');
  assert.match(code(f.text), /handoffFromHeight = lastShownHeight/);
  assert.match(code(f.text), /y\.setValue\(ownH - fromH\)/);
});

// 2026-10-26 (Cath's phone, red error "Interpolation property 'easing' is not supported by
// native animated module"): Android's native animation engine can't bend an interpolate.
// Curves inside interpolate are written out as points (curvedRange in motion.ts).
test('no interpolate() carries an easing (the phone refuses it)', () => {
  const app = fs.readFileSync(path.join(here, '..', 'App.tsx'), 'utf8');
  const all = [...files, { name: 'App.tsx', text: app }];
  const bad = [];
  for (const f of all) {
    const t = code(f.text);
    const re = /\.interpolate\(\s*\{/g;
    let m;
    while ((m = re.exec(t))) {
      let depth = 1;
      let i = m.index + m[0].length;
      for (; i < t.length && depth > 0; i++) {
        if (t[i] === '{') depth++;
        else if (t[i] === '}') depth--;
      }
      if (/\beasing\s*:/.test(t.slice(m.index, i))) bad.push(`${f.name}:${t.slice(0, m.index).split('\n').length}`);
    }
  }
  assert.deepEqual(bad, []);
});

test('curvedRange: same start and end, follows the curve, never goes backwards', async () => {
  const { curvedRange, cubicBezierAt, CURVE } = await import('../src/motion.ts');
  const r = curvedRange(0.2, 1, 0, 1, CURVE);
  assert.equal(r.inputRange[0], 0.2);
  assert.equal(r.inputRange.at(-1), 1);
  assert.ok(Math.abs(r.outputRange[0]) < 1e-6 && Math.abs(r.outputRange.at(-1) - 1) < 1e-6);
  for (let i = 1; i < r.outputRange.length; i++) assert.ok(r.outputRange[i] >= r.outputRange[i - 1] - 1e-9);
  // The house curve leaps at once: halfway through time it is well past halfway.
  assert.ok(cubicBezierAt(CURVE, 0.5) > 0.8);
});

// 2026-10-26 (Cath's phone screenshot): every Bills / Debts / Loans label had its own
// shadowed box, because Android draws a shadow around anything given `elevation`. The
// switcher's look is the approved mockup: one white piece with a soft drawn shadow behind
// plain labels. No elevation anywhere in it.
test('switchers: no Android elevation (it boxed every label)', () => {
  const f = files.find((x) => x.name === 'components/SegmentedControl.tsx');
  assert.doesNotMatch(code(f.text), /elevation\s*:/);
  assert.match(f.text, /boxShadow/);
});

// Smoothness sweep 2026-10-26: the main tabs follow the finger on the animation thread.
// Through the app's JavaScript side they fell behind the finger whenever the app was busy.
test('main-tab swipe: moves on the animation thread, not through JavaScript', () => {
  const sw = code(files.find((x) => x.name === 'navigation/swipeTabs.tsx').text);
  const follow = sw.slice(sw.indexOf("withTestId('tab-swipe')"), sw.indexOf("withTestId('swipe-tabs')"));
  assert.ok(follow.length > 0);
  assert.doesNotMatch(follow, /runOnJS\(true\)/);
  assert.match(follow, /setTabDrag\(/);
  const tp = code(files.find((x) => x.name === 'navigation/TabPage.tsx').text);
  assert.match(tp, /useAnimatedStyle/);
  assert.doesNotMatch(tp, /Animated\.(timing|add)\(/);
  const td = code(files.find((x) => x.name === 'navigation/tabDrag.ts').text);
  assert.match(td, /makeMutable/);
});

// Smoothness sweep 2026-10-26 (jank reviewer's findings, each fixed):
test('sweep 10-26: no redraw storms, no work landing mid-slide', () => {
  const get = (n) => code(files.find((x) => x.name === n).text);
  // Pages in the stack and the main tabs are drawn by functions made once (else every
  // save redrew everything; proven in __tests__/NoRedrawOnSave).
  const rs = get('navigation/RootStack.tsx');
  assert.doesNotMatch(rs, /\{\s*\(\{\s*route\s*\}\)\s*=>\s*\(/);
  assert.doesNotMatch(rs, /\{\(\) => <(Profile|Settings)Screen/);
  const mt = get('navigation/MainTabs.tsx');
  assert.doesNotMatch(mt, /\{\(\) => <(Home|ToPay)Screen/);
  // Tabs are built one at a time after opening, not all at once.
  assert.match(mt, /PRELOAD_GAP_MS/);
  // The rain stops when its tab isn't showing.
  assert.match(get('components/SkyGlow.tsx'), /pageActive && <FallingRain/);
  // The calendar opens with the remembered layout.
  assert.match(get('screens/CalendarScreen.tsx'), /calendarSettingsNow\(\)/);
  // A save waits until the form has closed and the next slide is done.
  assert.match(get('DataContext.tsx'), /setTimeout\(resolve, SAVE_AFTER_MOVES_MS\)/);
});

// 2026-10-27 (Cath's screenshots): a trip with an empty checklist was cut off (a page's
// height read back from an animation value was stale on the phone), and "Dates (optional)"
// was squeezed to one letter per line by a long value.
test('heights are never read back from an animation value; row labels keep their width', () => {
  const sp = code(files.find((x) => x.name === 'components/SlidingPages.tsx').text);
  assert.doesNotMatch(sp, /heights\.value\.slice\(\)/);
  const sf = code(files.find((x) => x.name === 'components/SimpleForm.tsx').text);
  assert.match(sf, /pickLabel: \{ flexShrink: 0, maxWidth: '60%' \}/); assert.match(sf, /valueBox: \{ flex: 1/);
  assert.doesNotMatch(sf, /style=\{\[s\.label, \{ flex: 1 \}, invalid/);
});

// Cath, 2026-10-27: swiping sideways on a Plan page never goes back to Plan.
test('Plan pages: no swipe-back (back arrow / phone back only)', () => {
  const rs = code(files.find((x) => x.name === 'navigation/RootStack.tsx').text);
  for (const name of ['Savings', 'Groceries', 'Travel', 'Events', 'YearlyGoals', 'SharedExpenses', 'Investments']) {
    const at = rs.indexOf(`name="${name}"`);
    assert.ok(at >= 0, name);
    assert.match(rs.slice(at, at + 260), /NO_SWIPE_BACK/, name);
  }
  assert.match(rs, /NO_SWIPE_BACK = \{ gestureEnabled: false \}/);
});
