// Crash reports (Cath, 2026-11-28): no amount, name, email or typed text ever reaches Sentry.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scrubEvent, scrubText, scrubUrl } from '../src/sentryScrub.ts';

const event = {
  message: 'Save failed for ₱12,345.67 at 45%',
  user: { id: 'uid', username: 'cath' },
  request: { url: 'x' },
  extra: { model: { balance: 5000 } },
  server_name: 'Cath phone',
  tags: { screen: 'Bills', amount: '2500' },
  exception: { values: [{ type: 'TypeError', value: "Cannot read 'amount' of undefined (250.5) cath@example.com",
    stacktrace: { frames: [{ filename: 'app:///index.bundle', function: 'payBill', lineno: 10, colno: 3, in_app: true, vars: { amount: 250.5 }, context_line: 'pay(250.5, "Meralco")', pre_context: ['x'] }] } }] },
  breadcrumbs: [
    { category: 'console', message: 'balance 30000 for cath' },
    { category: 'touch', message: 'Pressed "Pay ₱2,350"' },
    { category: 'navigation', data: { from: 'Home', to: 'PayDetail?id=123&amount=500' } },
    { category: 'app.lifecycle', data: { state: 'background', secret: 'x' } },
    { category: 'http', data: { url: 'https://firestore.googleapis.com/v1/projects/p/documents/householdKeys/cath' } },
  ],
  contexts: { device: { model: 'Pixel 8', name: "Cath's Pixel" }, os: { name: 'Android' }, state: { model: { amount: 1 } } },
  spans: [{ op: 'http.client', description: 'GET https://firestore.googleapis.com/v1/projects/p/documents/householdKeys/cath', data: { url: 'u' } }],
  transaction: 'PayDetail 123',
};

test('nothing personal is left in a crash report', () => {
  const out = scrubEvent(structuredClone(event));
  const text = JSON.stringify(out);
  for (const bad of ['12,345', '45%', 'cath', 'Meralco', '250.5', '30000', '2,350', '2500', 'Cath', '"x"', 'householdKeys', '123', 'balance']) {
    assert.ok(!text.includes(bad), `left in: ${bad}`);
  }
});

test('what broke and where is kept', () => {
  const out = scrubEvent(structuredClone(event));
  assert.equal(out.exception.values[0].type, 'TypeError');
  assert.equal(out.exception.values[0].value, "Cannot read 'amount' of undefined (#) [email]");
  assert.deepEqual(Object.keys(out.exception.values[0].stacktrace.frames[0]).filter((k) => out.exception.values[0].stacktrace.frames[0][k] !== undefined), ['filename', 'function', 'lineno', 'colno', 'in_app']);
  assert.deepEqual(out.breadcrumbs.map((b) => b.category), ['navigation', 'app.lifecycle']);
  assert.deepEqual(out.breadcrumbs[0].data, { from: 'Home', to: 'PayDetail' });
  assert.equal(out.contexts.device.model, 'Pixel 8');
  assert.equal(out.contexts.state, undefined);
  assert.equal(out.spans[0].description, 'https://firestore.googleapis.com');
});

test('text and address helpers', () => {
  assert.equal(scrubText('Paid PHP 1,000 and $5.25'), 'Paid # and #');
  assert.equal(scrubUrl('https://a.b/c?d=1'), 'https://a.b');
  assert.equal(scrubUrl('/relative/cath'), '[url]');
});
