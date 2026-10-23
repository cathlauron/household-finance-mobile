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
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
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
for (const step of process.argv.slice(2)) {
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
    continue;
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
    continue;
  }
  if (step.startsWith('expect:')) {
    const want = step.slice(7);
    const seen = await page.getByText(want, { exact: false }).first().isVisible().catch(() => false);
    if (!seen) problems.push(`EXPECTED BUT MISSING: "${want}"`);
    console.log(seen ? `ok: sees "${want}"` : `MISSING: "${want}"`);
    continue;
  }
  if (step.startsWith('scroll:')) {
    await page.mouse.move(195, 420);
    await page.mouse.wheel(0, Number(step.slice(7)));
    await page.waitForTimeout(1200);
    await picture(`scrolled ${step.slice(7)}`);
    continue;
  }
  if (step.startsWith('drag:')) {
    // "drag:-200" = put a finger down mid-page, slide it 200 px left (positive = right),
    // take a picture with the finger still down, then let go and take another.
    const dx = Number(step.slice(5));
    const x0 = dx < 0 ? 300 : 90;
    await page.mouse.move(x0, 520);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(x0 + (dx * i) / 10, 520);
      await page.waitForTimeout(16);
    }
    await page.waitForTimeout(150);
    await picture(`finger down, moved ${dx}`);
    await page.mouse.up();
    await page.waitForTimeout(700);
    await picture(`let go after ${dx}`);
    continue;
  }
  if (step.startsWith('wait:')) {
    await page.waitForTimeout(Number(step.slice(5)));
    await picture('waited');
    continue;
  }
  const loose = step.startsWith('~');
  const text = loose ? step.slice(1) : step;
  await page
    .getByText(text, { exact: !loose })
    .last()
    .click({ timeout: 8000 })
    .catch(() => problems.push(`STEP FAILED: nothing to tap called "${text}"`));
  await page.waitForTimeout(2000);
  await picture(`tapped "${text}"`);
}
fs.writeFileSync(path.join(out, 'log.txt'), log.join('\n') + '\n\nPROBLEMS:\n' + (problems.join('\n') || 'none') + '\n');
console.log('\nPROBLEMS:\n' + (problems.join('\n') || 'none'));
await browser.close();
server.close();
