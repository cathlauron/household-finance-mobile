// Claude's background tester (2026-10-22, bug-check work). Builds nothing itself: it opens
// the web build in a hidden browser shaped like a phone, does the steps you list, and saves
// a picture after each one. Guest mode only: it never signs in or creates an account.
//
//   npm run browser:build                 (makes the web build in mobile-app/web-build)
//   npm run browser:walk -- Skip "fill:Name=Cath" Continue ...
//
// Steps: plain text = tap the thing with exactly that text; "~text" = tap text containing
// it; "fill:Placeholder=value" = type into a box; "wait:ms" = wait and take a picture;
// "later:2026-10-23T08:00" = put the app away, move the clock to that local time, bring
// it back (needs WALK_START_TIME, e.g. WALK_START_TIME=2026-10-22T23:50, so the page
// starts on a fake clock); "expect:text" = fail if that text isn't on screen;
// "scroll:600" = scroll down that many pixels (negative = up); "drag:-200" = swipe the
// page 200 px left with a picture mid-swipe (positive = right).
// Pictures and a log go to mobile-app/web-shots (not saved to git).
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.join(here, '..', 'web-build');
const out = path.join(here, '..', 'web-shots');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
if (!fs.existsSync(path.join(root, 'index.html'))) {
  console.error('No web build yet. Run: npm run browser:build');
  process.exit(1);
}
const server = http
  .createServer((req, res) => {
    let p = path.join(root, decodeURI(req.url.split('?')[0]));
    if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(root, 'index.html');
    res.end(fs.readFileSync(p));
  })
  .listen(0);
const url = `http://localhost:${server.address().port}`;

const browser = await chromium.launch();
// A phone: touch screen, so swipes are real finger touches (2026-10-23).
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
const touch = await page.context().newCDPSession(page);
const finger = (type, x, y) =>
  touch.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
const problems = [];
page.on('pageerror', (e) => problems.push('CRASH: ' + e.message));
page.on('console', (m) => m.type() === 'error' && problems.push('ERROR: ' + m.text()));

let n = 0;
const log = [];
async function picture(label) {
  n += 1;
  const file = path.join(out, `${String(n).padStart(2, '0')}.png`);
  await page.screenshot({ path: file });
  const text = (await page.innerText('body')).replace(/\s+/g, ' ').slice(0, 300);
  log.push(`${n}. ${label}\n   ${text}`);
  console.log(`${n}. ${label}`);
}

if (process.env.WALK_START_TIME) await page.clock.install({ time: new Date(process.env.WALK_START_TIME) });
await page.goto(url);
await page.waitForTimeout(6000);
await picture('app opened');
// Smoothness 2026-10-23: "rec:<step>" records every frame while that step happens (from
// just before it to 1.5 s after) into web-shots/rec-NN/, for tools/flicker-check.py.
let recN = 0;
async function recorded(inner) {
  recN += 1;
  const dir = path.join(out, `rec-${String(recN).padStart(2, '0')}`);
  fs.mkdirSync(dir, { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  let f = 0;
  const times = [];
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    f += 1;
    fs.writeFileSync(path.join(dir, `f${String(f).padStart(3, '0')}.png`), Buffer.from(data, 'base64'));
    times.push(metadata.timestamp);
    await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1, maxWidth: 390, maxHeight: 844 });
  await page.waitForTimeout(250);
  await runStep(inner, true);
  await page.waitForTimeout(1500);
  await cdp.send('Page.stopScreencast');
  await page.waitForTimeout(200);
  fs.writeFileSync(path.join(dir, 'times.json'), JSON.stringify({ step: inner, times }));
  console.log(`   recorded ${f} frames of "${inner}" -> ${path.basename(dir)}`);
}

async function runStep(step, quiet = false) {
  if (step.startsWith('fill:')) {
    const [box, value] = step.slice(5).split('=');
    // The box's placeholder, else its label, else the only box on the page ("fill:=value").
    const tries = [page.getByPlaceholder(box, { exact: true }), page.getByLabel(box, { exact: true }), page.locator('input:visible')];
    let done = false;
    for (const t of box ? tries : tries.slice(2)) {
      if (done) break;
      done = await t.first().fill(value, { timeout: 2000 }).then(() => true, () => false);
    }
    if (!done) problems.push(`STEP FAILED: no box "${box}"`);
    await page.waitForTimeout(600);
    return;
  }
  if (step.startsWith('later:')) {
    const setVisibility = (state) =>
      page.evaluate((st) => {
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => st });
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => st === 'hidden' });
        document.dispatchEvent(new Event('visibilitychange'));
      }, state);
    await setVisibility('hidden');
    await page.clock.setSystemTime(new Date(step.slice(6)));
    await setVisibility('visible');
    await page.clock.runFor(1500);
    await page.waitForTimeout(1500);
    await picture(`app put away and brought back at ${step.slice(6)}`);
    return;
  }
  if (step.startsWith('expect:')) {
    const want = step.slice(7);
    const seen = await page.getByText(want, { exact: false }).first().isVisible().catch(() => false);
    if (!seen) problems.push(`EXPECTED BUT MISSING: "${want}"`);
    console.log(seen ? `ok: sees "${want}"` : `MISSING: "${want}"`);
    return;
  }
  if (step.startsWith('scroll:')) {
    await page.mouse.move(195, 420);
    await page.mouse.wheel(0, Number(step.slice(7)));
    await page.waitForTimeout(1200);
    await picture(`scrolled ${step.slice(7)}`);
    return;
  }
  if (step.startsWith('drag:')) {
    // "drag:-200" = put a finger down mid-page, slide it 200 px left (positive = right),
    // take a picture with the finger still down, then let go and take another.
    // "drag:-200@250" = the same, 250 px from the top instead of mid-page.
    const [dxText, yText] = step.slice(5).split('@');
    const dx = Number(dxText);
    const y = yText ? Number(yText) : 520;
    const x0 = dx < 0 ? 300 : 90;
    await finger('touchStart', x0, y);
    for (let i = 1; i <= 10; i++) {
      await finger('touchMove', x0 + (dx * i) / 10, y);
      await page.waitForTimeout(16);
    }
    if (!quiet) {
      await page.waitForTimeout(150);
      await picture(`finger down, moved ${dx}`);
    }
    await finger('touchEnd', x0 + dx, y);
    if (quiet) return;
    await page.waitForTimeout(700);
    await picture(`let go after ${dx}`);
    return;
  }
  if (step.startsWith('wait:')) {
    await page.waitForTimeout(Number(step.slice(5)));
    await picture('waited');
    return;
  }
  if (step.startsWith('at:')) {
    // "at:195,150" = tap that spot (e.g. outside a pop-up to close it).
    const [x, y] = step.slice(3).split(',').map(Number);
    await page.mouse.click(x, y);
    await page.waitForTimeout(quiet ? 0 : 1500);
    if (!quiet) await picture(`tapped at ${x},${y}`);
    return;
  }
  if (step.startsWith('id:') || step.startsWith('label:')) {
    // "id:home-tab" = tap the thing with that test id; "label:Open calendar" = by its label.
    const byId = step.startsWith('id:');
    const key = step.slice(byId ? 3 : 6);
    const target = (byId ? page.getByTestId(key) : page.getByLabel(key, { exact: false })).filter({ visible: true });
    await target.last().click({ timeout: 8000 }).catch(() => problems.push(`STEP FAILED: nothing to tap with ${byId ? 'id' : 'label'} "${key}"`));
    await page.waitForTimeout(quiet ? 0 : 2000);
    if (!quiet) await picture(`tapped ${step}`);
    return;
  }
  const loose = step.startsWith('~');
  const text = loose ? step.slice(1) : step;
  await page
    .getByText(text, { exact: !loose })
    .filter({ visible: true })
    .last()
    .click({ timeout: 8000 })
    .catch(() => problems.push(`STEP FAILED: nothing to tap called "${text}"`));
  await page.waitForTimeout(quiet ? 0 : 2000);
  if (!quiet) await picture(`tapped "${text}"`);
}

for (const step of process.argv.slice(2)) {
  if (step.startsWith('rec:')) await recorded(step.slice(4));
  else await runStep(step);
}
fs.writeFileSync(path.join(out, 'log.txt'), log.join('\n') + '\n\nPROBLEMS:\n' + (problems.join('\n') || 'none') + '\n');
console.log('\nPROBLEMS:\n' + (problems.join('\n') || 'none'));
await browser.close();
server.close();
