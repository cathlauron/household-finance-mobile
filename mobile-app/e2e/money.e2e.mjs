// Cath, 2026-11-13: click-through tests, like a real person using the app. They run the app in a
// hidden browser (the test household from walkFixture.ts) and tap, type and read the screen.
// They also read the app's own trace logs ("[flow:borrowed] saved") to check each flow's steps.
//
//   npm run browser:build:fixture   (once, after changing app code)
//   npm run test:e2e
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'web-build');
let server;
let browser;
before(async () => {
  assert.ok(fs.existsSync(path.join(root, 'index.html')), 'Run "npm run browser:build:fixture" first.');
  server = http.createServer((req, res) => {
    let p = path.join(root, decodeURI(req.url.split('?')[0]));
    if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(root, 'index.html');
    res.end(fs.readFileSync(p));
  }).listen(0);
  browser = await chromium.launch();
});
after(async () => {
  await browser?.close();
  server?.close();
});

// A new person on a new phone: goes through the welcome, and lands on Home.
async function freshApp() {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const logs = [];
  const errors = [];
  page.on('console', (m) => { if (m.text().startsWith('[flow:')) logs.push(m.text().trim()); });
  page.on('pageerror', (e) => { if (!/getLastNotificationResponse/.test(e.message)) errors.push(e.message); });
  // Today's rate comes from the internet: answered here, so the test never depends on it.
  await page.route('**/open.er-api.com/**', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ result: 'success', rates: { PHP: 1.75 } }) }));
  await page.addInitScript(() => { try { localStorage.setItem('colorModePreference', 'light'); } catch {} });
  await page.goto(`http://localhost:${server.address().port}`);
  const text = (x) => page.getByText(x, { exact: true }).last();
  await text('Get started').click({ timeout: 20000 });
  await page.getByPlaceholder('e.g. Cath').fill('Cath');
  for (let i = 0; i < 3; i++) { await text('Continue').click(); await page.waitForTimeout(500); }
  await text('No, just me').click();
  await text('See my Home').click();
  await page.getByText('Left to Spend').first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(2500);
  const id = (x) => page.getByTestId(x).last();
  const body = async () => (await page.innerText('body')).replace(/\s+/g, ' ');
  const sawLog = (line) => logs.some((l) => l.startsWith(line));
  // Types into an amount box the way a person does: tap it, clear it, type.
  async function typeAmount(box, digits) {
    await box.focus();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type(digits);
    await page.waitForTimeout(400);
  }
  const bigAmount = () => page.locator('input[inputmode="decimal"]').first();
  // Home › the date › the Calendar's + › Transaction: the New transaction form.
  async function openTransactionForm() {
    if (!(await page.getByLabel('Add on this day', { exact: true }).count())) {
      await page.getByText(/^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d+$/).first().click();
      await page.getByLabel('Add on this day', { exact: true }).last().waitFor();
      await page.waitForTimeout(800);
    }
    await page.getByLabel('Add on this day', { exact: true }).last().click();
    await id('calendar-add-txn').click();
    await id('txn-save').waitFor();
    await page.waitForTimeout(900);
  }
  // Home › Wallet › a card › Move money.
  const seen = { card: '' };
  async function openMoveMoney(card, fromId) {
    const face = page.getByLabel(new RegExp(`^${card}, `)).first();
    await page.waitForTimeout(1200);
    // The Wallet's cards overlap: a card behind another comes to the front on the first tap.
    // so tap the strip of it that shows at its top edge.
    await face.click({ timeout: 4000, position: { x: 60, y: 12 } }).catch(() => face.click({ force: true, position: { x: 60, y: 12 } }));
    await page.waitForTimeout(1500);
    seen.card = await body(); // the account's page, read on the way through
    if (process.env.E2E_SHOTS) await page.screenshot({ path: process.env.E2E_SHOTS + '/card-' + Date.now() + '.png', fullPage: true });
    await page.getByText('Move money', { exact: true }).last().click();
    await id('transfer-move').waitFor();
    await page.waitForTimeout(700);
    if (fromId !== null) await id(fromId || 'transfer-from-d1').click(); // From: Maribank, unless told otherwise
  }
  // The foreign wallet's id, read from its From chip on Move money.
  const walletId = async () => (await page.locator('[data-testid^="transfer-from-acct-"]').last().getAttribute('data-testid')).replace('transfer-from-', '');
  return { page, text, id, body, seen, walletId, logs, errors, sawLog, openTransactionForm, openMoveMoney, typeAmount, bigAmount };
}

test('Borrowed: money in, and a loan in To-Pay', async () => {
  const app = await freshApp();
  await app.openTransactionForm();
  await app.id('txn-dir-borrowed').click();
  await app.typeAmount(app.bigAmount(), '5000');
  await app.id('txn-label-input').fill('Ate Joy');
  await app.id('account-row-d1').click();
  await app.id('txn-save').click();
  await app.page.waitForTimeout(2500);
  assert.ok(app.sawLog('[flow:borrowed] picked'), 'trace: picked');
  assert.ok(app.sawLog('[flow:borrowed] saving'), 'trace: saving');
  assert.ok(app.sawLog('[flow:borrowed] saved'), 'trace: saved');
  // And in To-Pay › Loans.
  await app.text('Done').click();
  await app.page.getByRole('tab', { name: 'To-Pay' }).first().click();
  await app.text('Loans').click();
  await app.page.waitForTimeout(1200);
  assert.match(await app.body(), /Ate Joy/);
  assert.deepEqual(app.errors, []);
  await app.page.close();
});

test('A form closed by a tap outside keeps what was typed; Cancel throws it away', async () => {
  const app = await freshApp();
  await app.openTransactionForm();
  await app.typeAmount(app.bigAmount(), '450');
  await app.id('txn-label-input').fill('7-Eleven');
  await app.page.getByLabel('Close bottom sheet', { exact: true }).last().click({ position: { x: 195, y: 20 }, force: true });
  await app.page.waitForTimeout(1500);
  assert.ok(app.sawLog('[flow:draft] kept'), 'trace: kept');
  await app.openTransactionForm();
  await app.id('draft-banner').waitFor();
  assert.equal(await app.id('txn-label-input').inputValue(), '7-Eleven');
  assert.ok(app.sawLog('[flow:draft] restored'), 'trace: restored');
  // Cancel throws it away.
  await app.id('txn-cancel').click();
  await app.page.waitForTimeout(1500);
  await app.openTransactionForm();
  assert.equal(await app.id('draft-banner').count(), 0);
  assert.equal(await app.id('txn-label-input').inputValue(), '');
  assert.deepEqual(app.errors, []);
  await app.page.close();
});

test('Move money shows what is available and what is left after', async () => {
  const app = await freshApp();
  await app.openMoveMoney('Maribank');
  assert.match(await app.body(), /available/);
  await app.typeAmount(app.id('transfer-amount'), '2000');
  await app.id('transfer-after').waitFor();
  assert.match(await app.body(), /Maribank after/);
  await app.id('transfer-move').click();
  await app.page.waitForTimeout(2500);
  assert.ok(app.sawLog('[flow:move] saving'), 'trace: saving');
  assert.ok(app.sawLog('[flow:move] saved'), 'trace: saved');
  assert.deepEqual(app.errors, []);
  await app.page.close();
});

test('Withdraw baht: a rate is suggested, a baht wallet is made, and spending is typed in baht', async () => {
  const app = await freshApp();
  await app.openMoveMoney('Maribank');
  await app.id('transfer-mode-withdraw').click();
  await app.id('withdraw-currency-row').click();
  await app.id('currency-THB').click();
  await app.page.getByText(/Suggested: today's rate/).waitFor({ timeout: 8000 });
  await app.typeAmount(app.id('transfer-amount'), '2000');
  await app.page.waitForTimeout(400);
  assert.equal((await app.id('withdraw-peso').inputValue()).replace(/,/g, ''), '3500'); // 2,000 x 1.75
  // The bank really took 3,480: the rate follows.
  await app.typeAmount(app.id('withdraw-peso'), '3480');
  assert.equal(await app.id('withdraw-rate').inputValue(), '1.74');
  await app.id('transfer-move').click();
  await app.page.waitForTimeout(2500);
  assert.ok(app.sawLog('[flow:withdraw] currency picked'), 'trace: currency');
  assert.ok(app.sawLog('[flow:fx] rate from today'), 'trace: rate');
  assert.ok(app.sawLog('[flow:withdraw] saved'), 'trace: saved');
  // Spend 150 baht from the new wallet.
  await app.page.locator('[aria-label^="Back"]').last().click(); // from the card's page to Home
  await app.page.waitForTimeout(1200);
  await app.openTransactionForm();
  await app.id('txn-label-input').fill('Street food');
  await app.page.getByText('Cash (THB)', { exact: true }).last().click();
  await app.id('txn-foreign-note').waitFor();
  await app.typeAmount(app.bigAmount(), '150');
  assert.match(await app.body(), /About ₱261\.00 at your rate/);
  await app.id('txn-save').click();
  await app.page.waitForTimeout(2500);
  // Tap today on the Calendar: its page lists what was just added.
  const now = new Date();
  const month = now.toLocaleString('en-US', { month: 'long' });
  await app.page.getByLabel(new RegExp('^' + month + ' ' + now.getDate() + ',')).first().click();
  await app.page.waitForTimeout(1200);
  assert.match(await app.body(), /Street food/);
  // Back home with baht left over: change 500 back to pesos.
  await app.page.getByText('November', { exact: true }).first().click();
  await app.text('Done').click();
  await app.page.waitForTimeout(1200);
  await app.openMoveMoney('Cash .THB.', null); // from its own card, so From is already that wallet
  // Cath, 2026-11-14 (Place A): the wallet's page says what it had before and after each row, in baht.
  assert.match(app.seen.card, /Withdrew cash from/);
  assert.match(app.seen.card, /฿0 → ฿2,000/);
  assert.match(app.seen.card, /฿2,000 → ฿1,850/);
  assert.match(await app.body(), /Change back/);
  await app.typeAmount(app.id('transfer-amount'), '500');
  assert.equal((await app.id('withdraw-peso').inputValue()).replace(/,/g, ''), '870'); // 500 x 1.74
  await app.id('transfer-move').click();
  await app.page.waitForTimeout(2500);
  assert.ok(app.sawLog('[flow:move] saving change back'), 'trace: change back');
  // Cath, 2026-11-14 (mockup accounts-foreign): back on the wallet's page, Edit account is in baht.
  await app.text('Edit account').click();
  await app.id('account-balance').waitFor();
  await app.page.waitForTimeout(900);
  assert.equal(await app.id('account-balance').inputValue(), '1,350');
  assert.equal(await app.id('account-rate').inputValue(), '1.74');
  assert.match(await app.body(), /Thai baht \(THB\)/);
  if (process.env.E2E_SHOTS) await app.page.screenshot({ path: process.env.E2E_SHOTS + '/edit-wallet.png' });
  await app.typeAmount(app.id('account-balance'), '1300');
  assert.match(await app.body(), /About ₱2,262\.00/);
  await app.id('account-save').click();
  await app.page.waitForTimeout(2500);
  assert.match(await app.body(), /฿1,350 → ฿1,300/); // its Balance updates, in baht
  if (process.env.E2E_SHOTS) await app.page.screenshot({ path: process.env.E2E_SHOTS + '/wallet-after-edit.png', fullPage: true });
  assert.deepEqual(app.errors, []);
  await app.page.close();
});
