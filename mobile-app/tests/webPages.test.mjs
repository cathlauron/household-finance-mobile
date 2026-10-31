// Store pages (Cath, 2026-10-29, mockup H1): the support page must say exactly what the
// app's Help & FAQ says, and every store link must point at a page that exists.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { supportPage } from '../tools/build-web-pages.mjs';
import { FAQ, SUPPORT_URL, PRIVACY_URL, DELETE_ACCOUNT_URL, searchFaq, faqMatches } from '../src/helpFaq.ts';

// Line endings ignored: a Windows checkout turns them into CRLF; the words must still match.
const page = (name) => readFileSync(new URL(`../hosting/${name}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('the support web page matches the app Help & FAQ (rebuild it after changing src/helpFaq.ts)', () => {
  assert.equal(page('support.html'), supportPage());
});

test('every question in the app is on the support page', () => {
  const html = page('support.html');
  for (const g of FAQ) for (const i of g.items) assert.ok(html.includes(i.q.replace(/&/g, '&amp;')), i.q);
});

test('the support, privacy and delete-account links point at real pages', () => {
  for (const url of [SUPPORT_URL, PRIVACY_URL, DELETE_ACCOUNT_URL]) {
    const file = new URL(url).pathname.slice(1) + '.html';
    assert.ok(existsSync(new URL(`../hosting/${file}`, import.meta.url)), file);
  }
});

test('every link inside the web pages goes to a page that exists', () => {
  for (const name of ['index.html', 'support.html', 'privacy.html', 'delete-account.html']) {
    for (const [, href] of page(name).matchAll(/href="(\/[^"#]*)"/g)) {
      if (href === '/' || href === '/site.css') continue;
      assert.ok(existsSync(new URL(`../hosting${href}.html`, import.meta.url)), `${name} links to ${href}`);
    }
  }
});

test('no "coming soon" on any store page', () => {
  for (const name of ['support.html', 'privacy.html', 'delete-account.html']) assert.doesNotMatch(page(name), /coming soon/i, name);
});

test('help search finds every word in any order, and nothing for nonsense', () => {
  assert.ok(faqMatches({ q: 'What is the Recovery Key?', a: 'A key' }, 'key recovery'));
  assert.ok(faqMatches({ q: 'x', a: 'y' }, '   '));
  assert.equal(searchFaq(FAQ, 'zzzz').length, 0);
  const r = searchFaq(FAQ, 'undo');
  assert.equal(r.length, 1);
  assert.equal(r[0].items[0].q, 'I made a mistake on a payment. Can I undo it?');
});
