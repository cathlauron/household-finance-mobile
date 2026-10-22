// Claude's background tester (2026-10-22, bug-check work). Builds nothing itself: it opens
// the web build in a hidden browser shaped like a phone, does the steps you list, and saves
// a picture after each one. Guest mode only: it never signs in or creates an account.
//
//   npm run browser:build                 (makes the web build in mobile-app/web-build)
//   npm run browser:walk -- Skip "fill:Name=Cath" Continue ...
//
// Steps: plain text = tap the thing with exactly that text; "~text" = tap text containing
// it; "fill:Placeholder=value" = type into a box; "wait:ms" = wait and take a picture.
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
