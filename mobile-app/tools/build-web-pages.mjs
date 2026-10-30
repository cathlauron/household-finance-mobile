// Makes hosting/support.html from the app's own Help & FAQ list (src/helpFaq.ts), so the
// support page the app stores link to always says exactly what the app says.
// Run inside mobile-app: node --experimental-strip-types tools/build-web-pages.mjs
// tests/webPages.test.mjs fails if hosting/support.html is out of date.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { FAQ, PRIVACY_URL, DELETE_ACCOUNT_URL } from '../src/helpFaq.ts';
import { SUPPORT_EMAIL } from '../src/support.ts';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function supportPage() {
  const groups = FAQ.map((g) => `    <h2>${esc(g.title)}</h2>
${g.items.map((i) => `    <details>
      <summary>${esc(i.q)}</summary>
      <p>${esc(i.a)}</p>
    </details>`).join('\n')}`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Finance Flow support</title>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/site.css">
</head>
<body>
<main>
  <a class="brand" href="/">Finance Flow</a>
  <h1>Finance Flow support</h1>
  <p class="lead">Household budgeting for you and the people you share a home with.</p>
  <nav class="links">
    <a href="mailto:${SUPPORT_EMAIL}">Email support</a>
    <a href="${new URL(PRIVACY_URL).pathname}">Privacy policy</a>
    <a href="${new URL(DELETE_ACCOUNT_URL).pathname}">Delete your account</a>
  </nav>
  <section class="faq" aria-label="Frequently asked questions">
${groups}
  </section>
  <h2>Still stuck?</h2>
  <p>Write to <b>${SUPPORT_EMAIL}</b>. We usually reply within 2 days. Never send your password or your Recovery Key, not even to us.</p>
</main>
</body>
</html>
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(new URL('../hosting/support.html', import.meta.url), supportPage());
  console.log('hosting/support.html written');
}
